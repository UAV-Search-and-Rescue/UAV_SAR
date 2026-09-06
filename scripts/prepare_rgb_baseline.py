"""Prepare a deterministic RGB-only index from the frozen context split.

The original ZIP is inspected in place with zipfile.ZipFile. Image members are
never opened or decoded; only annotation members are read as UTF-8 text.
"""

from __future__ import annotations

import csv
import math
import os
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SPLIT_MANIFEST = PROJECT_ROOT / "results" / "dataset_split" / "recording_split_manifest.csv"
OUTPUT_DIR = PROJECT_ROOT / "results" / "rgb_baseline"
DEFAULT_ZIP_PATH = Path("/content/drive/MyDrive/WiSARD/WiSARDv1.zip")
LOCAL_ZIP_PATH = PROJECT_ROOT / "data" / "raw" / "WiSARD" / "WiSARDv1.zip"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
ANNOTATION_EXTENSIONS = {".txt", ".ann", ".label", ".labels"}
REQUIRED_SPLIT_COLUMNS = {
    "recording_name", "recording_path", "collection_context", "modality", "partition",
}


def resolve_zip_path() -> Path:
    configured = os.environ.get("WISAR_ZIP_PATH")
    if configured:
        return Path(configured)
    if "google.colab" in sys.modules or "COLAB_RELEASE_TAG" in os.environ:
        return DEFAULT_ZIP_PATH
    return LOCAL_ZIP_PATH


def read_frozen_vis_rows() -> list[dict[str, str]]:
    if not SPLIT_MANIFEST.is_file():
        raise FileNotFoundError(f"Frozen split manifest not found: {SPLIT_MANIFEST}")
    with SPLIT_MANIFEST.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        missing = REQUIRED_SPLIT_COLUMNS - set(reader.fieldnames or ())
        if missing:
            raise ValueError(f"Frozen split manifest is missing columns: {sorted(missing)}")
        rows = [row for row in reader if row["modality"] == "VIS"]
    if not rows:
        raise ValueError("Frozen split manifest contains no VIS/RGB recordings.")
    return sorted(rows, key=lambda row: (row["recording_path"], row["recording_name"]))


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def annotation_result(archive: zipfile.ZipFile, member: str) -> tuple[list[int], list[str], list[str], list[str]]:
    class_ids: list[int] = []
    malformed: list[str] = []
    invalid_boxes: list[str] = []
    errors: list[str] = []
    try:
        with archive.open(member, "r") as handle:
            text = handle.read().decode("utf-8", errors="replace")
    except (OSError, KeyError, RuntimeError) as error:
        errors.append(f"{member}: {type(error).__name__}: {error}")
        return class_ids, malformed, invalid_boxes, errors

    for line_number, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        fields = line.split()
        if len(fields) != 5:
            malformed.append(f"{member}:{line_number}")
            continue
        try:
            class_id = int(fields[0])
            values = [float(value) for value in fields[1:]]
        except ValueError:
            malformed.append(f"{member}:{line_number}")
            continue
        if class_id < 0 or not all(math.isfinite(value) for value in values):
            invalid_boxes.append(f"{member}:{line_number}")
            continue
        if not all(0.0 <= value <= 1.0 for value in values):
            invalid_boxes.append(f"{member}:{line_number}")
            continue
        class_ids.append(class_id)
    return class_ids, malformed, invalid_boxes, errors


def main() -> None:
    rows = read_frozen_vis_rows()
    zip_path = resolve_zip_path()
    if not zip_path.is_file():
        raise FileNotFoundError(
            f"WiSARDv1.zip not found at {zip_path}. "
            "Mount Google Drive in Colab or set WISAR_ZIP_PATH."
        )

    manifest_rows: list[dict[str, object]] = []
    missing_images: list[str] = []
    missing_annotations: list[str] = []
    malformed_annotations: list[str] = []
    invalid_boxes: list[str] = []
    annotation_read_errors: list[str] = []
    class_ids = Counter()
    recording_counts = Counter()
    partition_counts = Counter()
    partition_images = Counter()
    partition_annotations = Counter()

    with zipfile.ZipFile(zip_path, "r") as archive:
        members = sorted(info.filename.replace("\\", "/") for info in archive.infolist())
        member_set = set(members)
        members_by_recording: dict[str, list[str]] = defaultdict(list)
        for member in members:
            recording_component = Path(member).parts[0] if Path(member).parts else ""
            members_by_recording[recording_component].append(member)

        for row in rows:
            recording_name = row["recording_name"]
            recording_members = members_by_recording.get(recording_name, [])
            images = {
                Path(member).stem: member
                for member in recording_members
                if Path(member).suffix.lower() in IMAGE_EXTENSIONS
            }
            annotations = {
                Path(member).stem: member
                for member in recording_members
                if Path(member).suffix.lower() in ANNOTATION_EXTENSIONS
            }
            recording_counts[row["partition"]] += 1
            for stem in sorted(set(images) | set(annotations)):
                image_member = images.get(stem, "")
                annotation_member = annotations.get(stem, "")
                if not image_member:
                    missing_images.append(f"{recording_name}:{stem}")
                    continue
                if not annotation_member:
                    missing_annotations.append(f"{recording_name}:{stem}")
                    continue
                ids, malformed, invalid, errors = annotation_result(archive, annotation_member)
                class_ids.update(ids)
                malformed_annotations.extend(malformed)
                invalid_boxes.extend(invalid)
                annotation_read_errors.extend(errors)
                manifest_rows.append({
                    "image_member_path": image_member,
                    "annotation_member_path": annotation_member,
                    "recording_name": recording_name,
                    "recording_path": row["recording_path"],
                    "collection_context": row["collection_context"],
                    "partition": row["partition"],
                    "modality": row["modality"],
                })
                partition_images[row["partition"]] += 1
                partition_annotations[row["partition"]] += 1

        expected_recordings = {row["recording_name"] for row in rows}
        absent_recordings = sorted(expected_recordings - set(members_by_recording))
        for recording_name in absent_recordings:
            missing_images.append(f"{recording_name}:recording_folder")

    manifest_rows.sort(key=lambda row: (str(row["partition"]), str(row["recording_path"]), str(row["image_member_path"])))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    fields = [
        "image_member_path", "annotation_member_path", "recording_name", "recording_path",
        "collection_context", "partition", "modality",
    ]
    write_csv(OUTPUT_DIR / "rgb_dataset_manifest.csv", fields, manifest_rows)

    ready = not any((missing_images, missing_annotations, malformed_annotations, invalid_boxes, annotation_read_errors))
    report = [
        "WiSARD RGB-only E0 dataset preparation",
        "========================================",
        f"Frozen split manifest: {SPLIT_MANIFEST}",
        f"ZIP inspected read-only: {zip_path}",
        f"VIS recordings: {sum(recording_counts.values())}",
        f"Matched image/annotation pairs: {len(manifest_rows)}",
        f"Missing images: {len(missing_images)}",
        f"Missing annotations: {len(missing_annotations)}",
        f"Malformed annotations: {len(malformed_annotations)}",
        f"Invalid bounding boxes: {len(invalid_boxes)}",
        f"Annotation read errors: {len(annotation_read_errors)}",
        f"Class ID distribution: {dict(sorted(class_ids.items()))}",
        "",
        "Counts by partition",
        "-------------------",
    ]
    for partition in ("development", "test"):
        report.append(
            f"{partition}: recordings={recording_counts[partition]}, "
            f"images={partition_images[partition]}, annotations={partition_annotations[partition]}"
        )
    report.extend([
        "",
        f"RGB dataset READY FOR E0 TRAINING: {'YES' if ready else 'NO'}",
        "No model was trained. The frozen split assignment was not changed.",
        "Images were not opened or decoded; only ZIP paths and annotation text were inspected.",
    ])
    if not ready:
        report.extend([
            "",
            "First issues:",
            *(missing_images[:10] + missing_annotations[:10] + malformed_annotations[:10] + invalid_boxes[:10]),
        ])
    (OUTPUT_DIR / "rgb_dataset_validation_report.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()