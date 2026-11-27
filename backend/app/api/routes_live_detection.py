import asyncio
import logging
import shutil
import tempfile
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from app.detectors.rgbt_fusion import get_rgbt_model_status
from app.services.live_detection_service import (
    LiveSessionError,
    LiveSessionNotFound,
    cleanup_session_files,
    create_image_sequence_session,
    create_session,
    find_dataset_sequence_paths,
    find_sample_footage_paths,
    get_detected_frame_image,
    get_sample_footage_info,
    get_session,
    list_detected_frames,
    list_live_alerts,
    reset_all_history,
    update_live_alert_state,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/live-sessions", tags=["live detection"])
MAX_VIDEO_BYTES = 1000 * 1024 * 1024
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


class SeekRequest(BaseModel):
    position_seconds: float = Field(ge=0)


class ThresholdRequest(BaseModel):
    confidence_threshold: float = Field(ge=0, le=1)


class DroneConfigRequest(BaseModel):
    lat: float | None = None
    lon: float | None = None
    alt: float | None = None
    yaw: float | None = None
    pitch: float | None = None
    roll: float | None = None
    hfov: float | None = None
    vfov: float | None = None


class AlertStateRequest(BaseModel):
    state: str = Field(pattern="^(open|acknowledged|resolved)$")


class SampleSessionRequest(BaseModel):
    confidence_threshold: float = Field(default=0.10, ge=0, le=1)


def _session_or_http_error(session_id: str):
    try:
        return get_session(session_id)
    except LiveSessionNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def _state_change(call, *args):
    try:
        call(*args)
    except LiveSessionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


async def _save_video(upload: UploadFile, destination: Path) -> str:
    filename = Path(upload.filename or "").name
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Use an MP4, MOV, AVI, MKV, or WebM video",
        )
    if upload.content_type and not (
        upload.content_type.startswith("video/")
        or upload.content_type == "application/octet-stream"
    ):
        raise HTTPException(status_code=400, detail="Uploaded file must be a video")

    total_bytes = 0
    try:
        with destination.open("wb") as target:
            while chunk := await upload.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_VIDEO_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="Each video must be 1000 MB or smaller",
                    )
                target.write(chunk)
    finally:
        await upload.close()
    if total_bytes == 0:
        raise HTTPException(status_code=400, detail="Uploaded video is empty")
    return filename


@router.post("", status_code=201)
async def upload_live_videos(
    rgb: Annotated[UploadFile, File(...)],
    thermal: Annotated[UploadFile | None, File()] = None,
    confidence_threshold: Annotated[float, Form(ge=0, le=1)] = 0.10,
):
    available, reason = get_rgbt_model_status()
    if not available:
        raise HTTPException(status_code=503, detail=reason)

    directory = Path(tempfile.mkdtemp(prefix=f"uav-sar-live-{uuid4().hex}-"))
    try:
        rgb_name = await _save_video(rgb, directory / "rgb-video")
        thermal_name: str | None = None
        if thermal is not None and (thermal.filename or "").strip():
            thermal_name = await _save_video(thermal, directory / "thermal-video")
        session = create_session(
            directory,
            rgb_name,
            thermal_name,
            confidence_threshold,
        )
        return session.get_status()
    except LiveSessionError as exc:
        cleanup_session_files(directory)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        cleanup_session_files(directory)
        raise
    except Exception:
        cleanup_session_files(directory)
        logger.exception("Could not create live detection session")
        raise HTTPException(
            status_code=500,
            detail="Could not create live detection session",
        )


@router.post("/images", status_code=201)
async def upload_live_images(
    rgb_images: Annotated[list[UploadFile], File(...)],
    thermal_images: Annotated[list[UploadFile] | None, File()] = None,
    fps: Annotated[float, Form(ge=0.5, le=30.0)] = 2.0,
    confidence_threshold: Annotated[float, Form(ge=0, le=1)] = 0.10,
):
    available, reason = get_rgbt_model_status()
    if not available:
        raise HTTPException(status_code=503, detail=reason)

    directory = Path(tempfile.mkdtemp(prefix=f"uav-sar-imgseq-{uuid4().hex}-"))
    rgb_dir = directory / "rgb"
    thr_dir = directory / "thermal"
    rgb_dir.mkdir(parents=True, exist_ok=True)
    thr_dir.mkdir(parents=True, exist_ok=True)
    try:
        saved_rgb: list[Path] = []
        for idx, upload in enumerate(sorted(rgb_images, key=lambda u: u.filename or str(idx))):
            name = Path(upload.filename or f"frame_{idx:05d}.jpg").name
            ext = Path(name).suffix.lower()
            if ext not in ALLOWED_IMAGE_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f"Unsupported image format: {name}")
            dest = rgb_dir / f"{idx:05d}_{name}"
            dest.write_bytes(await upload.read())
            await upload.close()
            saved_rgb.append(dest)

        saved_thr: list[Path] = []
        if thermal_images:
            for idx, upload in enumerate(sorted(thermal_images, key=lambda u: u.filename or str(idx))):
                if not (upload.filename or "").strip():
                    continue
                name = Path(upload.filename or f"thr_{idx:05d}.jpg").name
                ext = Path(name).suffix.lower()
                if ext not in ALLOWED_IMAGE_EXTENSIONS:
                    raise HTTPException(status_code=400, detail=f"Unsupported thermal image format: {name}")
                dest = thr_dir / f"{idx:05d}_{name}"
                dest.write_bytes(await upload.read())
                await upload.close()
                saved_thr.append(dest)

        session = create_image_sequence_session(
            directory,
            saved_rgb,
            saved_thr,
            fps,
            confidence_threshold,
        )
        return session.get_status()
    except LiveSessionError as exc:
        cleanup_session_files(directory)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        cleanup_session_files(directory)
        raise
    except Exception:
        cleanup_session_files(directory)
        logger.exception("Could not create dataset image sequence session")
        raise HTTPException(status_code=500, detail="Could not create dataset image sequence session")


@router.post("/reset-all")
def reset_all_live_data():
    reset_all_history()
    return {"ok": True}


@router.get("/detected-frames")
def get_detected_frames():
    return {"frames": list_detected_frames()}


@router.get("/detected-frames/{frame_id}/rgb")
def get_detected_frame_rgb(frame_id: str):
    data = get_detected_frame_image(frame_id, "rgb")
    if data is None:
        raise HTTPException(status_code=404, detail="Detected frame not found")
    return Response(content=data, media_type="image/jpeg")


@router.get("/detected-frames/{frame_id}/thermal")
def get_detected_frame_thermal(frame_id: str):
    data = get_detected_frame_image(frame_id, "thermal")
    if data is None:
        raise HTTPException(status_code=404, detail="Detected thermal frame not found")
    return Response(content=data, media_type="image/jpeg")


@router.get("/sample")
def get_sample_footage():
    return get_sample_footage_info()


@router.post("/sample", status_code=201)
def create_sample_session(request: SampleSessionRequest | None = None):
    available, reason = get_rgbt_model_status()
    if not available:
        raise HTTPException(status_code=503, detail=reason)

    rgb_src, thermal_src = find_sample_footage_paths()
    confidence = request.confidence_threshold if request else 0.10
    directory = Path(tempfile.mkdtemp(prefix=f"uav-sar-sample-{uuid4().hex}-"))
    try:
        if rgb_src is not None:
            shutil.copy2(rgb_src, directory / "rgb-video")
            thermal_name: str | None = None
            if thermal_src is not None:
                shutil.copy2(thermal_src, directory / "thermal-video")
                thermal_name = thermal_src.name
            session = create_session(
                directory,
                rgb_src.name,
                thermal_name,
                confidence,
            )
            return session.get_status()

        rgb_imgs, thr_imgs = find_dataset_sequence_paths()
        if rgb_imgs:
            session = create_image_sequence_session(
                directory,
                rgb_imgs,
                thr_imgs,
                fps=2.0,
                confidence_threshold=confidence,
            )
            return session.get_status()

        cleanup_session_files(directory)
        raise HTTPException(
            status_code=404,
            detail=(
                "No bundled sample footage or RGBTDronePerson/val dataset found."
            ),
        )
    except LiveSessionError as exc:
        cleanup_session_files(directory)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        cleanup_session_files(directory)
        logger.exception("Could not create sample live detection session")
        raise HTTPException(
            status_code=500,
            detail="Could not create sample live detection session",
        )


@router.get("/alerts")
def get_live_alerts():
    return {"alerts": list_live_alerts()}


@router.patch("/alerts/{alert_id}")
def patch_live_alert(alert_id: str, request: AlertStateRequest):
    try:
        return update_live_alert_state(alert_id, request.state)
    except LiveSessionNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except LiveSessionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{session_id}")
def get_live_status(session_id: str):
    return _session_or_http_error(session_id).get_status()


@router.post("/{session_id}/start")
def start_live_session(session_id: str):
    session = _session_or_http_error(session_id)
    _state_change(session.start)
    return session.get_status()


@router.post("/{session_id}/pause")
def pause_live_session(session_id: str):
    session = _session_or_http_error(session_id)
    _state_change(session.pause)
    return session.get_status()


@router.post("/{session_id}/resume")
def resume_live_session(session_id: str):
    session = _session_or_http_error(session_id)
    _state_change(session.resume)
    return session.get_status()


@router.post("/{session_id}/stop")
def stop_live_session(session_id: str):
    session = _session_or_http_error(session_id)
    session.stop()
    return session.get_status()


@router.post("/{session_id}/seek")
def seek_live_session(session_id: str, request: SeekRequest):
    session = _session_or_http_error(session_id)
    _state_change(session.seek, request.position_seconds)
    return session.get_status()


@router.patch("/{session_id}/threshold")
def update_live_threshold(session_id: str, request: ThresholdRequest):
    session = _session_or_http_error(session_id)
    _state_change(session.set_confidence_threshold, request.confidence_threshold)
    return session.get_status()


@router.post("/{session_id}/drone-config")
def update_live_drone_config(session_id: str, request: DroneConfigRequest):
    session = _session_or_http_error(session_id)
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    session.update_drone_config(updates)
    return session.get_status()


@router.get("/{session_id}/detections")
def get_live_detections(session_id: str):
    return {
        "session_id": session_id,
        "detections": _session_or_http_error(session_id).get_status()["detections"],
    }


@router.get("/{session_id}/frame")
def get_live_frame(session_id: str):
    frame, _, _ = _session_or_http_error(session_id).get_frame()
    if frame is None:
        raise HTTPException(status_code=404, detail="No annotated frame is available yet")
    return Response(
        content=frame,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store"},
    )


def _stream_frames(session, modality: str):
    async def frames():
        last_frame_number = -1
        while True:
            frame, frame_number, status = session.get_frame(modality)
            if frame is not None and frame_number != last_frame_number:
                last_frame_number = frame_number
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    + f"Content-Length: {len(frame)}\r\n\r\n".encode("ascii")
                    + frame
                    + b"\r\n"
                )
            elif status in {"completed", "stopped", "error", "uploaded"}:
                break
            await asyncio.sleep(0.04)

    return StreamingResponse(
        frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.get("/{session_id}/stream")
async def stream_live_video(session_id: str):
    return _stream_frames(_session_or_http_error(session_id), "rgb")


@router.get("/{session_id}/thermal-stream")
async def stream_live_thermal_video(session_id: str):
    return _stream_frames(_session_or_http_error(session_id), "thermal")


@router.get("/{session_id}/detections/{detection_id}/crop")
def get_detection_crop(session_id: str, detection_id: str):
    crop = _session_or_http_error(session_id).get_crop(detection_id)
    if crop is None:
        raise HTTPException(status_code=404, detail="Detection crop not found")
    return Response(content=crop, media_type="image/jpeg")
