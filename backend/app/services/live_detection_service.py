import logging
import math
import shutil
import threading
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from queue import Empty, Queue
from uuid import uuid4

import cv2
import numpy as np

from app.config.settings import BASE_DIR, CONFIDENCE_THRESHOLD
from app.detectors.errors import ModelUnavailableError
from app.detectors.rgbt_fusion import RGBTFusionDetector
from app.models.schemas import DetectionResponse
from app.services.alert_service import evaluate_alerts
from app.storage.result_store import MongoDBResultStore


logger = logging.getLogger(__name__)
result_store = MongoDBResultStore()
SYNC_POLICY = (
    "The first decodable frame of each file is treated as time zero. "
    "For every RGB frame, the nearest thermal frame by media timestamp is used. "
    "Pairs farther apart than half a frame interval from each stream are rejected. "
    "Videos whose durations differ by more than one second are rejected."
)
MAX_ACTIVE_SESSIONS = 3
MAX_SESSION_HISTORY = 250
MAX_LIVE_ALERTS = 200
MAX_DETECTED_FRAMES = 100
SAMPLE_FOOTAGE_DIR = BASE_DIR / "sample_footage"
_SAMPLE_VIDEO_EXTS = (".mp4", ".mov", ".avi", ".mkv", ".webm")


def find_sample_footage_paths() -> tuple[Path | None, Path | None]:
    """Locate bundled sample RGB and optional thermal video files if present."""
    if not SAMPLE_FOOTAGE_DIR.is_dir():
        return None, None

    files = sorted(
        p for p in SAMPLE_FOOTAGE_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in _SAMPLE_VIDEO_EXTS
    )
    rgb_file = next(
        (p for p in files if p.stem.lower() in {"rgb", "sample_rgb"}),
        None,
    ) or next(
        (p for p in files if not p.stem.lower().startswith("thermal")),
        None,
    )
    thermal_file = next(
        (p for p in files if p.stem.lower() in {"thermal", "sample_thermal"}),
        None,
    ) or next(
        (p for p in files if p.stem.lower().startswith("thermal") and p != rgb_file),
        None,
    )
    return rgb_file, thermal_file


def find_dataset_sequence_paths() -> tuple[list[Path], list[Path]]:
    """Locate paired RGB/Thermal dataset images if RGBTDronePerson/val is present."""
    val_dir = Path.home() / "Downloads" / "RGBTDronePerson" / "val"
    vis_dir = val_dir / "visible"
    thr_dir = val_dir / "thermal"
    if not vis_dir.is_dir():
        return [], []
    rgb_imgs = sorted(p for p in vis_dir.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    if not rgb_imgs:
        return [], []
    thr_imgs = (
        sorted(p for p in thr_dir.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"})
        if thr_dir.is_dir()
        else []
    )
    return rgb_imgs, thr_imgs


def get_sample_footage_info() -> dict:
    rgb_file, thermal_file = find_sample_footage_paths()
    if rgb_file is not None:
        return {
            "available": True,
            "rgb_name": rgb_file.name,
            "thermal_name": thermal_file.name if thermal_file else None,
            "message": (
                f"Sample footage ready: {rgb_file.name}"
                + (f" + {thermal_file.name}" if thermal_file else " (auto pseudo-thermal)")
            ),
        }

    rgb_imgs, thr_imgs = find_dataset_sequence_paths()
    if rgb_imgs:
        return {
            "available": True,
            "rgb_name": f"RGBTDronePerson/val/visible ({len(rgb_imgs)} images)",
            "thermal_name": f"RGBTDronePerson/val/thermal ({len(thr_imgs)} images)" if thr_imgs else None,
            "message": f"Dataset sequence ready: {len(rgb_imgs)} paired RGB-Thermal images from RGBTDronePerson/val",
        }

    return {
        "available": False,
        "rgb_name": None,
        "thermal_name": None,
        "message": (
            "No bundled sample footage found. Place rgb.mp4 (and optional thermal.mp4) in backend/sample_footage/."
        ),
    }

_DEFAULT_DRONE_CONFIG = {
    "lat": 0.0,
    "lon": 0.0,
    "alt": 0.0,
    "yaw": 0.0,
    "pitch": -90.0,
    "roll": 0.0,
    "hfov": 69.0,
    "vfov": 42.0,
}

_recent_alerts: deque[dict] = deque()
_alert_crops: dict[str, bytes] = {}
_alerts_lock = threading.RLock()

_detected_frames: deque[dict] = deque()
_detected_frame_images: dict[str, tuple[bytes, bytes]] = {}
_detected_frames_lock = threading.RLock()


def reset_all_history() -> None:
    """Clear all recorded alerts, alert crops, and detected frames across sessions."""
    with _alerts_lock:
        _recent_alerts.clear()
        _alert_crops.clear()
    with _detected_frames_lock:
        _detected_frames.clear()
        _detected_frame_images.clear()
    with _sessions_lock:
        for session in _sessions.values():
            with session._lock:
                session.detection_count = 0
                session.frame_detections = []
                session.history.clear()
                session.alerts.clear()
                session.crops.clear()


def list_detected_frames() -> list[dict]:
    with _detected_frames_lock:
        return list(_detected_frames)


def get_detected_frame_image(frame_id: str, modality: str = "rgb") -> bytes | None:
    with _detected_frames_lock:
        pair = _detected_frame_images.get(frame_id)
    if pair is None:
        return None
    return pair[0] if modality == "rgb" else pair[1]


def _deg2rad(x: float) -> float:
    return x * math.pi / 180.0


def _estimate_target_gps(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    img_w: int,
    img_h: int,
    drone_config: dict[str, float],
) -> tuple[float, float] | None:
    alt = float(drone_config.get("alt", 0.0))
    lat0 = float(drone_config.get("lat", 0.0))
    lon0 = float(drone_config.get("lon", 0.0))
    if alt <= 0 or (lat0 == 0.0 and lon0 == 0.0):
        return None
    hfov = float(drone_config.get("hfov", 69.0))
    vfov = float(drone_config.get("vfov", 42.0))
    fx = (img_w / 2.0) / math.tan(_deg2rad(hfov) / 2.0)
    fy = (img_h / 2.0) / math.tan(_deg2rad(vfov) / 2.0)
    cx, cy = img_w / 2.0, img_h / 2.0
    u = (x1 + x2) / 2.0
    v = float(y2)
    ray = np.array([(u - cx) / fx, (v - cy) / fy, 1.0], dtype=np.float64)
    ray_cam = ray / np.linalg.norm(ray)

    yaw = _deg2rad(float(drone_config.get("yaw", 0.0)))
    pitch = _deg2rad(float(drone_config.get("pitch", -90.0)))
    roll = _deg2rad(float(drone_config.get("roll", 0.0)))
    cy_, sy_ = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    cr, sr = math.cos(roll), math.sin(roll)
    rz = np.array([[cy_, -sy_, 0], [sy_, cy_, 0], [0, 0, 1]], dtype=np.float64)
    ry = np.array([[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]], dtype=np.float64)
    rx = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]], dtype=np.float64)
    ray_world = (rz @ ry @ rx) @ ray_cam
    if abs(ray_world[2]) < 1e-8:
        return None
    t = -alt / ray_world[2]
    if t <= 0:
        return None
    gp = np.array([0.0, 0.0, alt], dtype=np.float64) + t * ray_world
    dx, dy = float(gp[0]), float(gp[1])
    dlat = dy / 111320.0
    dlon = dx / (111320.0 * max(math.cos(math.radians(lat0)), 1e-6))
    return lat0 + dlat, lon0 + dlon


def _compute_gsd(drone_config: dict[str, float]) -> float | None:
    alt = float(drone_config.get("alt", 0.0))
    if alt <= 0:
        return None
    hfov = float(drone_config.get("hfov", 69.0))
    vfov = float(drone_config.get("vfov", 42.0))
    gsd_h = (2.0 * alt * math.tan(_deg2rad(hfov) / 2.0)) / 640.0 * 100.0
    gsd_v = (2.0 * alt * math.tan(_deg2rad(vfov) / 2.0)) / 640.0 * 100.0
    return round(max(gsd_h, gsd_v), 2)


def list_live_alerts() -> list[dict]:
    with _alerts_lock:
        return list(_recent_alerts)


def update_live_alert_state(alert_id: str, state: str) -> dict:
    if state not in {"open", "acknowledged", "resolved"}:
        raise LiveSessionError("Invalid alert state")
    with _alerts_lock:
        for alert in _recent_alerts:
            if alert["alert_id"] == alert_id:
                alert["state"] = state
                return dict(alert)
    raise LiveSessionNotFound("Alert not found")


class LiveSessionError(ValueError):
    pass


class LiveSessionNotFound(LookupError):
    pass


def cleanup_session_files(directory: Path) -> None:
    try:
        shutil.rmtree(directory)
    except FileNotFoundError:
        return
    except OSError:
        logger.exception("Could not remove temporary live-session files")


def inspect_video(path: Path) -> dict[str, float | int]:
    capture = cv2.VideoCapture(str(path))
    try:
        if not capture.isOpened():
            raise LiveSessionError("The uploaded file is not a readable video")
        ok, frame = capture.read()
        fps = float(capture.get(cv2.CAP_PROP_FPS))
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if not ok or frame is None:
            raise LiveSessionError("The uploaded video contains no decodable frames")
        if not math.isfinite(fps) or fps <= 0 or frame_count < 1:
            raise LiveSessionError("The uploaded video has invalid frame timing metadata")
        if width < 1 or height < 1 or width > 4096 or height > 4096:
            raise LiveSessionError("Video dimensions must be between 1 and 4096 pixels")
        capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
        return {
            "fps": fps,
            "frame_count": frame_count,
            "width": width,
            "height": height,
            "duration_seconds": frame_count / fps,
        }
    finally:
        capture.release()


class LiveDetectionSession:
    def __init__(
        self,
        session_id: str,
        directory: Path,
        rgb_path: Path | None,
        thermal_path: Path | None,
        rgb_name: str,
        thermal_name: str,
        rgb_info: dict[str, float | int],
        thermal_info: dict[str, float | int] | None,
        confidence_threshold: float,
        rgb_images: list[Path] | None = None,
        thermal_images: list[Path] | None = None,
    ):
        self.id = session_id
        self.directory = directory
        self.rgb_path = rgb_path
        self.thermal_path = thermal_path
        self.rgb_images = rgb_images or []
        self.thermal_images = thermal_images or []
        self.is_image_sequence = len(self.rgb_images) > 0
        self.thermal_auto = thermal_path is None and len(self.thermal_images) == 0
        self.rgb_name = rgb_name
        self.thermal_name = thermal_name
        self.rgb_fps = float(rgb_info["fps"])
        self.thermal_fps = float(thermal_info["fps"]) if thermal_info else self.rgb_fps
        self.rgb_frame_count = int(rgb_info["frame_count"])
        self.thermal_frame_count = (
            int(thermal_info["frame_count"]) if thermal_info else self.rgb_frame_count
        )
        self.duration_seconds = (
            min(float(rgb_info["duration_seconds"]), float(thermal_info["duration_seconds"]))
            if thermal_info
            else float(rgb_info["duration_seconds"])
        )
        self.confidence_threshold = confidence_threshold
        self.drone_config: dict[str, float] = dict(_DEFAULT_DRONE_CONFIG)
        self.status = "uploaded"
        self.error = ""
        self.frame_number = 0
        self.position_seconds = 0.0
        self.fps = 0.0
        self.detection_count = 0
        self.frame_detections: list[dict] = []
        self.history: deque[dict] = deque(maxlen=MAX_SESSION_HISTORY)
        self.alerts: deque[dict] = deque()
        self.crops: dict[str, bytes] = {}
        self.latest_jpeg: bytes | None = None
        self.latest_thermal_jpeg: bytes | None = None
        self.result_saved = False
        self.storage_error = ""
        self._lock = threading.RLock()
        self._stop = threading.Event()
        self._wake = threading.Event()
        self._seek_to: float | None = None
        self._thread: threading.Thread | None = None
        self._started_at: float | None = None
        self._last_frame_at: float | None = None
        self._last_alert_at: float = 0.0
        self._last_alert_count: int = 0
        self._total_latency_ms = 0.0

    def start(self) -> None:
        with self._lock:
            if self.status == "running":
                return
            if self.status != "uploaded":
                raise LiveSessionError(f"Cannot start a session in {self.status} state")
            self.status = "running"
            self._started_at = time.perf_counter()
            self._thread = threading.Thread(
                target=self._process,
                name=f"live-detection-{self.id[:8]}",
                daemon=True,
            )
            self._thread.start()

    def pause(self) -> None:
        with self._lock:
            if self.status != "running":
                raise LiveSessionError(f"Cannot pause a session in {self.status} state")
            self.status = "paused"
            self._wake.set()

    def resume(self) -> None:
        with self._lock:
            if self.status != "paused":
                raise LiveSessionError(f"Cannot resume a session in {self.status} state")
            self.status = "running"
            self._wake.set()

    def stop(self) -> None:
        with self._lock:
            if self.status in {"stopped", "completed", "error"}:
                return
            self.status = "stopping"
            self._stop.set()
            self._wake.set()
            thread = self._thread
        if thread and thread is not threading.current_thread():
            thread.join(timeout=10)
        with self._lock:
            if self.status == "stopping":
                self.status = "stopped"
        if thread is None or not thread.is_alive():
            cleanup_session_files(self.directory)

    def seek(self, position_seconds: float) -> None:
        if not math.isfinite(position_seconds):
            raise LiveSessionError("Seek position must be a finite number")
        with self._lock:
            if self.status not in {"running", "paused"}:
                raise LiveSessionError(f"Cannot seek a session in {self.status} state")
            self._seek_to = min(max(position_seconds, 0.0), self.duration_seconds)
            self._wake.set()

    def set_confidence_threshold(self, threshold: float) -> None:
        if not math.isfinite(threshold) or not 0 <= threshold <= 1:
            raise LiveSessionError("Confidence threshold must be between 0 and 1")
        with self._lock:
            if self.status in {"stopping", "stopped", "completed", "error"}:
                raise LiveSessionError(f"Cannot update a session in {self.status} state")
            self.confidence_threshold = threshold

    def update_drone_config(self, updates: dict[str, float]) -> dict[str, float]:
        with self._lock:
            for key, value in updates.items():
                if key in self.drone_config and math.isfinite(value):
                    self.drone_config[key] = float(value)
            return dict(self.drone_config)

    def get_frame(self, modality: str = "rgb") -> tuple[bytes | None, int, str]:
        with self._lock:
            frame = self.latest_jpeg if modality == "rgb" else self.latest_thermal_jpeg
            return frame, self.frame_number, self.status

    def get_crop(self, detection_id: str) -> bytes | None:
        with self._lock:
            crop = self.crops.get(detection_id)
        if crop is not None:
            return crop
        with _alerts_lock:
            return _alert_crops.get(detection_id)

    def get_status(self) -> dict:
        with self._lock:
            return {
                "session_id": self.id,
                "status": self.status,
                "rgb_name": self.rgb_name,
                "thermal_name": self.thermal_name,
                "rgb_fps": self.rgb_fps,
                "thermal_fps": self.thermal_fps,
                "duration_seconds": self.duration_seconds,
                "position_seconds": self.position_seconds,
                "frame_number": self.frame_number,
                "total_frames": min(
                    self.rgb_frame_count,
                    math.ceil(self.duration_seconds * self.rgb_fps),
                ),
                "fps": round(self.fps, 2),
                "detection_count": self.detection_count,
                "frame_detections": self.frame_detections,
                "active_alerts": [
                    item
                    for item in self.frame_detections
                    if item["confidence"] >= self.confidence_threshold
                ],
                "detections": list(self.history)[-50:],
                "alerts": list(self.alerts),
                "thermal_auto": self.thermal_auto,
                "drone_config": dict(self.drone_config),
                "gsd": _compute_gsd(self.drone_config),
                "confidence_threshold": self.confidence_threshold,
                "sync_policy": SYNC_POLICY,
                "stream_url": f"/live-sessions/{self.id}/stream",
                "thermal_stream_url": f"/live-sessions/{self.id}/thermal-stream",
                "error": self.error,
                "result_saved": self.result_saved,
                "storage_error": self.storage_error,
            }

    def _process(self) -> None:
        rgb_capture = cv2.VideoCapture(str(self.rgb_path)) if not self.is_image_sequence else None
        thermal_capture = (
            cv2.VideoCapture(str(self.thermal_path))
            if (not self.is_image_sequence and self.thermal_path is not None)
            else None
        )
        detector = RGBTFusionDetector()
        frame_queue: Queue[tuple[int, float, np.ndarray, np.ndarray]] = Queue(maxsize=2)
        capture_done = threading.Event()
        capture_error: list[Exception] = []

        def _capture_loop() -> None:
            rgb_index = 0
            thermal_index = -1
            thermal_frame = None
            target_fps = min(self.rgb_fps, 30.0)
            frame_delay = 1.0 / max(target_fps, 1.0)
            frame_skip = 1 if self.is_image_sequence else max(1, int(round(self.rgb_fps / max(target_fps, 1.0))))

            try:
                while not self._stop.is_set():
                    with self._lock:
                        seek_to = self._seek_to
                        self._seek_to = None
                        status = self.status

                    if seek_to is not None:
                        rgb_index = min(
                            int(seek_to * self.rgb_fps),
                            max(0, self.rgb_frame_count - 1),
                        )
                        if rgb_capture is not None:
                            rgb_capture.set(cv2.CAP_PROP_POS_FRAMES, rgb_index)
                        if thermal_capture is not None:
                            thermal_capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        thermal_index = -1
                        thermal_frame = None

                    if status == "paused" and seek_to is None:
                        self._wake.wait(timeout=0.1)
                        self._wake.clear()
                        continue
                    if status not in {"running", "paused"}:
                        break

                    loop_t0 = time.perf_counter()

                    if self.is_image_sequence:
                        if rgb_index >= len(self.rgb_images):
                            break
                        rgb_time = rgb_index / max(self.rgb_fps, 1.0)
                        rgb_bgr = cv2.imread(str(self.rgb_images[rgb_index]))
                        if rgb_bgr is None:
                            rgb_index += 1
                            continue
                        h, w = rgb_bgr.shape[:2]
                        if w > 1280:
                            rgb_bgr = cv2.resize(rgb_bgr, (1280, int(h * (1280.0 / w))))
                        if rgb_index < len(self.thermal_images):
                            thermal_frame = cv2.imread(str(self.thermal_images[rgb_index]))
                        else:
                            thermal_frame = None
                        if thermal_frame is None:
                            gray = cv2.cvtColor(rgb_bgr, cv2.COLOR_BGR2GRAY)
                            thermal_frame = cv2.applyColorMap(gray, cv2.COLORMAP_HOT)
                    else:
                        assert rgb_capture is not None
                        if frame_skip > 1 and seek_to is None:
                            for _ in range(frame_skip - 1):
                                if not rgb_capture.grab():
                                    break
                                rgb_index += 1

                        rgb_time = rgb_index / self.rgb_fps
                        if rgb_time >= self.duration_seconds:
                            break

                        ok, rgb_bgr = rgb_capture.read()
                        if not ok or rgb_bgr is None:
                            break

                        h, w = rgb_bgr.shape[:2]
                        if w > 1280:
                            scale = 1280.0 / w
                            rgb_bgr = cv2.resize(rgb_bgr, (1280, int(h * scale)))

                        if thermal_capture is not None:
                            target_thermal_index = min(
                                int(round(rgb_time * self.thermal_fps)),
                                self.thermal_frame_count - 1,
                            )
                            while thermal_index < target_thermal_index:
                                ok, thermal_frame = thermal_capture.read()
                                if not ok or thermal_frame is None:
                                    raise LiveSessionError(
                                        "Thermal video ended before a synchronized frame was available"
                                    )
                                thermal_index += 1

                            thermal_time = thermal_index / self.thermal_fps
                            tolerance = (
                                0.5 / self.rgb_fps
                                + 0.5 / self.thermal_fps
                                + 0.02
                            )
                            if abs(rgb_time - thermal_time) > tolerance:
                                raise LiveSessionError(
                                    "RGB and thermal video frames could not be synchronized"
                                )
                        else:
                            gray = cv2.cvtColor(rgb_bgr, cv2.COLOR_BGR2GRAY)
                            thermal_frame = cv2.applyColorMap(gray, cv2.COLORMAP_HOT)

                    pair = (rgb_index, rgb_time, rgb_bgr, thermal_frame)
                    if self.is_image_sequence:
                        # Never drop dataset frames: wait until inference consumes each image one by one
                        while not self._stop.is_set():
                            try:
                                frame_queue.put(pair, timeout=0.2)
                                break
                            except Exception:
                                continue
                    else:
                        if frame_queue.full():
                            try:
                                frame_queue.get_nowait()
                            except Empty:
                                pass
                        frame_queue.put(pair)

                        with self._lock:
                            self.frame_number = rgb_index + 1
                            self.position_seconds = rgb_time

                    rgb_index += 1
                    elapsed = time.perf_counter() - loop_t0
                    wait = frame_delay - elapsed
                    if wait > 0:
                        time.sleep(wait)
            except Exception as exc:
                capture_error.append(exc)
            finally:
                capture_done.set()

        try:
            if not self.is_image_sequence and (
                rgb_capture is None
                or not rgb_capture.isOpened()
                or (thermal_capture is not None and not thermal_capture.isOpened())
            ):
                raise LiveSessionError("Unable to open the uploaded RGB/thermal video pair")

            cap_thread = threading.Thread(
                target=_capture_loop,
                name=f"live-capture-{self.id[:8]}",
                daemon=True,
            )
            cap_thread.start()

            while not self._stop.is_set():
                if capture_error:
                    raise capture_error[0]

                # For video streams, drain queue to always run inference on the latest frame.
                # For dataset image sequences, process every image one by one without skipping.
                pair = None
                if self.is_image_sequence:
                    if capture_done.is_set() and frame_queue.empty():
                        break
                    try:
                        pair = frame_queue.get(timeout=0.2)
                    except Empty:
                        continue
                else:
                    while True:
                        try:
                            pair = frame_queue.get_nowait()
                        except Empty:
                            break
                    if pair is None:
                        if capture_done.is_set():
                            break
                        try:
                            pair = frame_queue.get(timeout=0.2)
                        except Empty:
                            continue

                frame_idx, frame_time_sec, rgb_bgr, thermal_frame = pair

                if thermal_frame.ndim == 3:
                    thermal_gray = cv2.cvtColor(thermal_frame, cv2.COLOR_BGR2GRAY)
                else:
                    thermal_gray = thermal_frame

                with self._lock:
                    threshold = self.confidence_threshold
                inference_start = time.perf_counter()
                detections = detector.predict_arrays(
                    cv2.cvtColor(rgb_bgr, cv2.COLOR_BGR2RGB),
                    thermal_gray,
                    confidence_threshold=threshold,
                    iou_threshold=0.45,
                    max_detections=200,
                )
                inference_elapsed = time.perf_counter() - inference_start
                self._publish_frame(
                    rgb_bgr,
                    thermal_frame,
                    detections,
                    frame_idx,
                    frame_time_sec,
                    inference_elapsed,
                    threshold,
                )

            cap_thread.join(timeout=2)
            if capture_error:
                raise capture_error[0]

            with self._lock:
                if self.status in {"running", "paused"}:
                    self.status = "completed"
        except ModelUnavailableError as exc:
            self._fail(str(exc))
        except LiveSessionError as exc:
            self._fail(str(exc))
        except Exception:
            logger.exception("Live detection session failed", extra={"session_id": self.id})
            self._fail("Live video processing failed")
        finally:
            if rgb_capture is not None:
                rgb_capture.release()
            if thermal_capture is not None:
                thermal_capture.release()
            self._persist_result()
            cleanup_session_files(self.directory)

    def _publish_frame(
        self,
        rgb_bgr: np.ndarray,
        thermal_frame: np.ndarray,
        detections: list[dict],
        frame_number: int,
        position_seconds: float,
        inference_elapsed: float,
        threshold: float,
    ) -> None:
        annotated = rgb_bgr.copy()
        thermal_annotated = (
            cv2.cvtColor(thermal_frame, cv2.COLOR_GRAY2BGR)
            if thermal_frame.ndim == 2
            else thermal_frame.copy()
        )
        records = []
        crops = {}
        frame_time = datetime.now(timezone.utc).isoformat()

        with self._lock:
            drone_cfg = dict(self.drone_config)
            current_fps = self.fps

        for idx, detection in enumerate(detections, start=1):
            box = detection["bbox"]
            x1 = max(0, min(int(box["x1"]), annotated.shape[1] - 1))
            y1 = max(0, min(int(box["y1"]), annotated.shape[0] - 1))
            x2 = max(x1 + 1, min(int(box["x2"]), annotated.shape[1]))
            y2 = max(y1 + 1, min(int(box["y2"]), annotated.shape[0]))
            confidence = float(detection["confidence"])

            gps = _estimate_target_gps(
                x1, y1, x2, y2, annotated.shape[1], annotated.shape[0], drone_cfg
            )
            lat = gps[0] if gps else None
            lon = gps[1] if gps else None

            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.circle(annotated, ((x1 + x2) // 2, y2), 4, (255, 0, 255), -1)
            label = f"#{idx} ({confidence:.2f})"
            (lw, lh), bl = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
            ly = max(lh + 4, y1 - 4)
            cv2.rectangle(annotated, (x1, ly - lh - 4), (x1 + lw + 6, ly + bl), (0, 200, 0), -1)
            cv2.putText(
                annotated,
                label,
                (x1 + 2, ly - 2),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 0, 0),
                2,
                cv2.LINE_AA,
            )
            if lat is not None and lon is not None:
                gps_label = f"#{idx}: {lat:.5f}, {lon:.5f}"
                y_text = min(annotated.shape[0] - 10, y2 + 18)
                cv2.putText(
                    annotated,
                    gps_label,
                    (x1, y_text),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    (0, 255, 255),
                    1,
                    cv2.LINE_AA,
                )

            thermal_x1 = round(x1 * thermal_annotated.shape[1] / annotated.shape[1])
            thermal_y1 = round(y1 * thermal_annotated.shape[0] / annotated.shape[0])
            thermal_x2 = round(x2 * thermal_annotated.shape[1] / annotated.shape[1])
            thermal_y2 = round(y2 * thermal_annotated.shape[0] / annotated.shape[0])
            cv2.rectangle(
                thermal_annotated,
                (thermal_x1, thermal_y1),
                (thermal_x2, thermal_y2),
                (0, 255, 0),
                2,
            )
            detection_id = str(uuid4())
            record = {
                "detection_id": detection_id,
                "class_name": detection["class_name"],
                "confidence": confidence,
                "bbox": box,
                "timestamp": frame_time,
                "session_id": self.id,
                "frame_number": frame_number,
                "video_time_seconds": position_seconds,
                "latitude": lat,
                "longitude": lon,
                "crop_url": f"/live-sessions/{self.id}/detections/{detection_id}/crop",
                "alert": confidence >= threshold,
            }
            records.append(record)
            crop = annotated[y1:y2, x1:x2]
            encoded, buffer = cv2.imencode(".jpg", crop)
            if encoded:
                crops[detection_id] = buffer.tobytes()

        # HUD overlay matching reference demo
        gsd = _compute_gsd(drone_cfg)
        hud = f"FPS: {current_fps:.1f}  |  {len(records)} person(s)"
        if gsd is not None:
            hud += f"  |  GSD: {gsd} cm/px"
        cv2.putText(
            annotated,
            hud,
            (12, 28),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 255, 255),
            2,
            cv2.LINE_AA,
        )

        encoded, jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 82])
        if not encoded:
            raise LiveSessionError("Unable to encode the annotated video frame")
        thermal_encoded, thermal_jpeg = cv2.imencode(
            ".jpg",
            thermal_annotated,
            [cv2.IMWRITE_JPEG_QUALITY, 82],
        )
        if not thermal_encoded:
            raise LiveSessionError("Unable to encode the thermal video frame")

        now = time.perf_counter()
        jpeg_bytes = jpeg.tobytes()
        thermal_bytes = thermal_jpeg.tobytes()

        if records:
            frame_id = str(uuid4())
            frame_record = {
                "frame_id": frame_id,
                "session_id": self.id,
                "frame_number": frame_number,
                "video_time_seconds": position_seconds,
                "timestamp": frame_time,
                "person_count": len(records),
                "top_confidence": max(float(r["confidence"]) for r in records),
                "detections": records,
                "rgb_frame_url": f"/live-sessions/detected-frames/{frame_id}/rgb",
                "thermal_frame_url": f"/live-sessions/detected-frames/{frame_id}/thermal",
                "inference_ms": round(inference_elapsed * 1000, 1),
                "model": "fusion_progressive_finetune.onnx",
            }
            with _detected_frames_lock:
                _detected_frames.appendleft(frame_record)
                _detected_frame_images[frame_id] = (jpeg_bytes, thermal_bytes)

        with self._lock:
            self.latest_jpeg = jpeg_bytes
            self.latest_thermal_jpeg = thermal_bytes
            if self.is_image_sequence:
                self.frame_number = frame_number + 1
                self.position_seconds = position_seconds
            self.frame_detections = records
            self.detection_count += len(records)
            self._total_latency_ms += inference_elapsed * 1000
            self.history.extend(records)
            self.crops.update(crops)
            if len(self.crops) > MAX_SESSION_HISTORY:
                keep_ids = {row["detection_id"] for row in self.history}
                self.crops = {key: value for key, value in self.crops.items() if key in keep_ids}
            if self._last_frame_at is not None:
                instant_fps = 1 / max(now - self._last_frame_at, 0.001)
                self.fps = instant_fps if self.fps == 0 else self.fps * 0.75 + instant_fps * 0.25
            self._last_frame_at = now

            if records and (
                self.is_image_sequence
                or now - self._last_alert_at >= 2.0
                or len(records) > self._last_alert_count
            ):
                self._last_alert_at = now
                best = max(records, key=lambda r: r["confidence"])
                conf = float(best["confidence"])
                priority = "High" if conf >= 0.65 else "Medium" if conf >= 0.35 else "Low"
                gps_text = (
                    f"{best['latitude']:.5f}, {best['longitude']:.5f}"
                    if best["latitude"] is not None and best["longitude"] is not None
                    else "GPS unavailable"
                )
                alt_val = drone_cfg.get("alt", 0.0)
                alert_entry = {
                    "alert_id": str(uuid4()),
                    "session_id": self.id,
                    "detection_id": best["detection_id"],
                    "priority": priority,
                    "state": "open",
                    "headline": f"Person Detected ({len(records)} in frame)",
                    "summary": f"{conf:.0%} confidence at frame #{frame_number} ({position_seconds:.1f}s) · {gps_text}",
                    "detail": (
                        f"RGB-Thermal fusion model (fusion_progressive_finetune.onnx) detected {len(records)} person(s) "
                        f"at frame #{frame_number} ({position_seconds:.1f}s). Top confidence: {conf:.1%}. "
                        f"BBox: ({int(best['bbox']['x1'])}, {int(best['bbox']['y1'])}) to ({int(best['bbox']['x2'])}, {int(best['bbox']['y2'])}). "
                        f"Location: {gps_text}."
                    ),
                    "confidence": conf,
                    "person_count": len(records),
                    "frame_number": frame_number,
                    "video_time_seconds": position_seconds,
                    "bbox": best["bbox"],
                    "latitude": best["latitude"],
                    "longitude": best["longitude"],
                    "altitude": f"{alt_val:.1f} m" if alt_val > 0 else "Unavailable",
                    "crop_url": best["crop_url"],
                    "timestamp": frame_time,
                }
                self.alerts.append(alert_entry)
                with _alerts_lock:
                    _recent_alerts.appendleft(alert_entry)
                    if best["detection_id"] in crops:
                        _alert_crops[best["detection_id"]] = crops[best["detection_id"]]
            self._last_alert_count = len(records)

    def _fail(self, message: str) -> None:
        with self._lock:
            self.status = "error"
            self.error = message

    def _persist_result(self) -> None:
        with self._lock:
            detections = [
                {
                    "class_name": item["class_name"],
                    "confidence": item["confidence"],
                    "bbox": item["bbox"],
                }
                for item in list(self.history)[-100:]
            ]
            latency_ms = self._total_latency_ms

        if not detections or not result_store.enabled:
            return
        try:
            result = DetectionResponse(
                request_id=self.id,
                timestamp=datetime.now(timezone.utc),
                model_version="RGBT",
                used_modalities=["rgb", "thermal"],
                detections=detections,
                alerts=evaluate_alerts(detections),
                latency_ms=latency_ms,
            )
            result_store.save(result)
            with self._lock:
                self.result_saved = True
        except Exception as exc:
            logger.exception(
                "Live inference completed but session result persistence failed",
                extra={"session_id": self.id},
            )
            with self._lock:
                self.storage_error = "Detection history could not be saved"


_sessions: dict[str, LiveDetectionSession] = {}
_sessions_lock = threading.RLock()


def register_session(session: LiveDetectionSession) -> None:
    with _sessions_lock:
        active = sum(
            item.status not in {"stopped", "completed", "error"}
            for item in _sessions.values()
        )
        if active >= MAX_ACTIVE_SESSIONS:
            raise LiveSessionError("The maximum number of active live sessions has been reached")
        _sessions[session.id] = session
        while len(_sessions) > 20:
            oldest_id = next(
                (
                    session_id
                    for session_id, item in _sessions.items()
                    if item.status in {"stopped", "completed", "error"}
                ),
                None,
            )
            if oldest_id is None:
                break
            del _sessions[oldest_id]


def get_session(session_id: str) -> LiveDetectionSession:
    with _sessions_lock:
        session = _sessions.get(session_id)
    if session is None:
        raise LiveSessionNotFound("Live detection session not found")
    return session


def create_session(
    directory: Path,
    rgb_name: str,
    thermal_name: str | None,
    confidence_threshold: float,
) -> LiveDetectionSession:
    rgb_path = directory / "rgb-video"
    rgb_info = inspect_video(rgb_path)
    thermal_path: Path | None = directory / "thermal-video" if thermal_name else None
    thermal_info: dict[str, float | int] | None = None
    if thermal_path is not None:
        thermal_info = inspect_video(thermal_path)
        duration_delta = abs(
            float(rgb_info["duration_seconds"]) - float(thermal_info["duration_seconds"])
        )
        if duration_delta > 1.0:
            raise LiveSessionError(
                "RGB and thermal video durations differ by more than one second; upload a synchronized pair"
            )

    session = LiveDetectionSession(
        session_id=str(uuid4()),
        directory=directory,
        rgb_path=rgb_path,
        thermal_path=thermal_path,
        rgb_name=rgb_name,
        thermal_name=thermal_name or "Auto Pseudo-Thermal",
        rgb_info=rgb_info,
        thermal_info=thermal_info,
        confidence_threshold=confidence_threshold,
    )
    register_session(session)
    return session


def create_image_sequence_session(
    directory: Path,
    rgb_images: list[Path],
    thermal_images: list[Path],
    fps: float,
    confidence_threshold: float,
) -> LiveDetectionSession:
    if not rgb_images:
        raise LiveSessionError("Upload at least one RGB dataset image")
    safe_fps = max(0.5, min(float(fps), 30.0))
    count = len(rgb_images)
    info = {
        "fps": safe_fps,
        "frame_count": count,
        "width": 1280,
        "height": 720,
        "duration_seconds": count / safe_fps,
    }
    session = LiveDetectionSession(
        session_id=str(uuid4()),
        directory=directory,
        rgb_path=None,
        thermal_path=None,
        rgb_name=f"{count} dataset image(s)",
        thermal_name=f"{len(thermal_images)} thermal image(s)" if thermal_images else "Auto Pseudo-Thermal",
        rgb_info=info,
        thermal_info=info if thermal_images else None,
        confidence_threshold=confidence_threshold,
        rgb_images=rgb_images,
        thermal_images=thermal_images,
    )
    register_session(session)
    return session
