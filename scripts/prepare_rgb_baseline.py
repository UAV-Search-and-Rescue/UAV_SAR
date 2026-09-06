"""Prepare a supervised RGB index from the frozen context split.

The ZIP is inspected read-only. Image members are never opened or decoded;
only matched annotation members are read as text.
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
DEFAULT_ZIP_PATH = Path("/content/drive/MyDrive/WiSARD") / "WiSARDv1.zip"
LOCAL_ZIP_PATH = PROJECT_ROOT / "data" / "raw" / "WiSARD" / "WiSARDv1.zip"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
ANNOTATION_EXTENSIONS = {".txt", ".ann", ".label", ".labels"}
REQUIRED_SPLIT_COLUMNS = {"recording_name", "recording_path", "collection_context", "modality", "partition"}


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


def validate_annotation(archive: zipfile.ZipFile, member: str) -> tuple[list[int], list[str], list[str], list[str]]:
    class_ids: list[int] = []
    malformed: list[str] = []
    invalid_boxes: list[str] = []
    excluded_invalid_box_images: list[str] = []
    errors: list[str] = []
    try:
        with archive.open(member, "r") as handle:
            text = handle.read().decode("utf-8", errors="replace")
    except (OSError, KeyError, RuntimeError) as error:
        errors.append(f"{member}: {type(error).__name__}: {error}")
        return class_ids, malformed, invalid_boxes, errors

    for line_number, raw_line in enumerate(text.splitlines(), start=1):
        fields = raw_line.strip().split()
        if not fields:
            continue
        if len(fields) != 5:
            malformed.append(f"{member}:{line_number}")
            continue
        try:
            class_id = int(fields[0])
            values = [float(value) for value in fields[1:]]
        except ValueError:
            malformed.append(f"{member}:{line_number}")
            continue
        if class_id < 0 or not all(math.isfinite(value) for value in values) or not all(0.0 <= value <= 1.0 for value in values):
            invalid_boxes.append(f"{member}:{line_number}")
            continue
        class_ids.append(class_id)
    return class_ids, malformed, invalid_boxes, errors


def main() -> None:
    rows = read_frozen_vis_rows()
    zip_path = resolve_zip_path()
    if not zip_path.is_file():
        raise FileNotFoundError(f"WiSARDv1.zip not found at {zip_path}. Mount Google Drive in Colab or set WISAR_ZIP_PATH.")

    manifest_rows: list[dict[str, object]] = []
    malformed_annotations: list[str] = []
    invalid_boxes: list[str] = []
    annotation_read_errors: list[str] = []
    excluded_unannotated_images: list[str] = []
    excluded_invalid_box_images: list[str] = []
    class_ids = Counter()
    recording_counts = Counter()
    partition_images = Counter()
    partition_annotations = Counter()
    fully_annotated_recordings: list[str] = []
    partially_annotated_recordings: list[str] = []
    unannotated_recordings: list[str] = []

    with zipfile.ZipFile(zip_path, "r") as archive:
        members = sorted(info.filename.replace("\\", "/") for info in archive.infolist())
        members_by_recording: dict[str, list[str]] = defaultdict(list)
        for member in members:
            parts = Path(member).parts
            if parts:
                members_by_recording[parts[0]].append(member)

        for row in rows:
            recording_name = row["recording_name"]
            partition = row["partition"]
            recording_members = members_by_recording.get(recording_name, [])
            images = {Path(member).stem: member for member in recording_members if Path(member).suffix.lower() in IMAGE_EXTENSIONS}
            annotations = {
                Path(member).stem: member
                for member in recording_members
                if Path(member).suffix.lower() in ANNOTATION_EXTENSIONS
                and Path(member).name.lower() != "count.txt"
                and Path(member).stem in images
            }
            recording_counts[partition] += 1
            annotated_stems = set(images) & set(annotations)
            missing_stems = sorted(set(images) - annotated_stems)
            excluded_unannotated_images.extend(f"{recording_name}:{images[stem]}" for stem in missing_stems)
            if not annotated_stems:
                unannotated_recordings.append(recording_name)
            elif len(annotated_stems) == len(images):
                fully_annotated_recordings.append(recording_name)
            else:
                partially_annotated_recordings.append(recording_name)

            for stem in sorted(annotated_stems):
                image_member = images[stem]
                annotation_member = annotations[stem]
                ids, malformed, invalid, errors = validate_annotation(archive, annotation_member)
                class_ids.update(ids)
                malformed_annotations.extend(malformed)
                invalid_boxes.extend(invalid)
                annotation_read_errors.extend(errors)
                if invalid:
                    excluded_invalid_box_images.append(
                        f"{recording_name}:{image_member}:{annotation_member}"
                    )
                    continue
                manifest_rows.append({
                    "image_member_path": image_member,
                    "annotation_member_path": annotation_member,
                    "recording_name": recording_name,
                    "recording_path": row["recording_path"],
                    "collection_context": row["collection_context"],
                    "partition": partition,
                    "modality": row["modality"],
                })
                partition_images[partition] += 1
                partition_annotations[partition] += 1

    manifest_rows.sort(key=lambda row: (str(row["partition"]), str(row["recording_path"]), str(row["image_member_path"])))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    fields = ["image_member_path", "annotation_member_path", "recording_name", "recording_path", "collection_context", "partition", "modality"]
    write_csv(OUTPUT_DIR / "rgb_dataset_manifest.csv", fields, manifest_rows)

    ready = (
        bool(manifest_rows)
        and all(recording_counts[partition] > 0 and partition_images[partition] > 0 for partition in ("development", "test"))
        and not malformed_annotations
        and not annotation_read_errors
        and len(invalid_boxes) == len(excluded_invalid_box_images)
    )
    report = [
        "WiSARD RGB-only E0 dataset preparation",
        "========================================",
        f"Frozen split manifest: {SPLIT_MANIFEST}",
        f"ZIP inspected read-only: {zip_path}",
        f"VIS recordings: {sum(recording_counts.values())}",
        f"Fully annotated recordings: {len(fully_annotated_recordings)}",
        f"Partially annotated recordings: {len(partially_annotated_recordings)}",
        f"Unannotated recordings: {len(unannotated_recordings)}",
        f"Matched image/annotation pairs: {len(manifest_rows)}",
        f"Excluded unannotated images: {len(excluded_unannotated_images)}",
        f"Invalid bounding boxes excluded: {len(invalid_boxes)}",
        f"Images excluded because annotations contain invalid boxes: {len(excluded_invalid_box_images)}",
        f"Malformed annotations: {len(malformed_annotations)}",
        f"Invalid bounding boxes: {len(invalid_boxes)}",
        f"Annotation read errors: {len(annotation_read_errors)}",
        f"Class ID distribution: {dict(sorted(class_ids.items()))}",
        "",
        "Counts by partition",
        "-------------------",
    ]
    for partition in ("development", "test"):
        report.append(f"{partition}: recordings={recording_counts[partition]}, images={partition_images[partition]}, annotations={partition_annotations[partition]}")
    report.extend([
        "",
        f"RGB dataset READY FOR E0 TRAINING: {'YES' if ready else 'NO'}",
        "No model was trained. The frozen split assignment was not changed.",
        "Images were not opened or decoded; only ZIP paths and annotation text were inspected.",
        "Unannotated recordings remain in their frozen partitions but are excluded from the supervised RGB manifest.",
        "Invalid bounding-box coordinates were not clipped, repaired, or modified; their image/annotation pairs were excluded.",
    ])
    (OUTPUT_DIR / "rgb_dataset_validation_report.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
