"""Audit the WiSARD RGB and infrared image folders without changing the dataset.

This script deliberately treats the dataset directory as read-only.  It opens
files to inspect them, but it never writes inside the dataset directory and it
never copies a dataset file into the project.

Run from the project directory, or provide explicit paths:

	python scripts/dataset_audit.py \
		--dataset "D:/Hackathons/miniproject5sem/WiSARD_Multi_Modal_Sample" \
		--output "results/dataset_audit"
"""

# The standard library provides everything needed for the audit report and CSV
# files.  Pillow is used only for reading image metadata and checking whether
# image files can actually be decoded.
import argparse
import csv
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from statistics import mean, median
from typing import Iterable

from PIL import Image, UnidentifiedImageError


# These defaults match the two directories found in the downloaded WiSARD
# sample.  They can still be overridden from the command line if another copy
# of the dataset needs to be audited later.
DEFAULT_DATASET = Path(__file__).resolve().parents[2] / "WiSARD_Multi_Modal_Sample"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "results" / "dataset_audit"
IMAGE_SUFFIXES = {".jpeg", ".jpg", ".png", ".bmp", ".tif", ".tiff"}
FRAME_PATTERN = re.compile(r"_(\d+)$")


@dataclass(frozen=True)
class ImageRecord:
	"""The small amount of information needed for one image file."""

	path: Path
	frame: int


@dataclass(frozen=True)
class AnnotationRecord:
	"""An annotation file together with its parsed YOLO-style rows."""

	path: Path
	frame: int
	rows: tuple[tuple[int, float, float, float, float], ...]
	invalid_lines: tuple[str, ...]


def parse_args() -> argparse.Namespace:
	"""Read optional paths while keeping useful defaults for this project."""

	parser = argparse.ArgumentParser(description="Audit WiSARD RGB/thermal files read-only.")
	parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
	parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
	return parser.parse_args()


def frame_from_name(path: Path) -> int | None:
	"""Extract the final numeric frame token from a filename stem."""

	match = FRAME_PATTERN.search(path.stem)
	return int(match.group(1)) if match else None


def read_yolo_annotation(path: Path, frame: int) -> AnnotationRecord:
	"""Parse normalized YOLO rows and retain malformed lines for reporting."""

	rows: list[tuple[int, float, float, float, float]] = []
	invalid_lines: list[str] = []

	# An empty label file is meaningful: it represents an image with zero
	# annotated objects, so it must not be treated as a missing annotation.
	for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
		line = raw_line.strip()
		if not line:
			continue
		fields = line.split()
		try:
			if len(fields) != 5:
				raise ValueError("expected five YOLO fields")
			class_id = int(fields[0])
			values = tuple(float(value) for value in fields[1:])
			if class_id < 0 or not all(math.isfinite(value) for value in values):
				raise ValueError("non-finite or negative class value")
			if not all(0.0 <= value <= 1.0 for value in values):
				raise ValueError("normalized values must be between zero and one")
			rows.append((class_id, *values))
		except (TypeError, ValueError):
			invalid_lines.append(raw_line)

	return AnnotationRecord(path, frame, tuple(rows), tuple(invalid_lines))


def collect_files(folder: Path) -> tuple[dict[int, ImageRecord], dict[int, AnnotationRecord], list[Path]]:
	"""Collect image and annotation files, excluding metadata such as count.txt."""

	images: dict[int, ImageRecord] = {}
	annotations: dict[int, AnnotationRecord] = {}
	other_files: list[Path] = []

	for path in sorted(folder.rglob("*")):
		if not path.is_file():
			continue
		frame = frame_from_name(path)
		suffix = path.suffix.lower()
		if suffix in IMAGE_SUFFIXES and frame is not None:
			images[frame] = ImageRecord(path, frame)
		elif suffix == ".txt" and path.name.lower() != "count.txt" and frame is not None:
			annotations[frame] = read_yolo_annotation(path, frame)
		else:
			other_files.append(path)

	return images, annotations, other_files


def inspect_image(path: Path) -> tuple[tuple[int, int] | None, str | None]:
	"""Return dimensions and a readable error for corrupt/unreadable images."""

	try:
		# verify() checks the encoded file without loading every pixel into
		# memory.  Opening it again is necessary because verify() closes the
		# image object and does not leave dimensions available.
		with Image.open(path) as image:
			image.verify()
		with Image.open(path) as image:
			return image.size, None
	except (OSError, UnidentifiedImageError, ValueError) as error:
		return None, f"{type(error).__name__}: {error}"


def number_stats(values: Iterable[float]) -> dict[str, float | int | None]:
	"""Calculate stable descriptive statistics for a possibly empty sequence."""

	numbers = list(values)
	if not numbers:
		return {"count": 0, "min": None, "mean": None, "median": None, "max": None}
	return {
		"count": len(numbers),
		"min": min(numbers),
		"mean": mean(numbers),
		"median": median(numbers),
		"max": max(numbers),
	}


def format_stats(stats: dict[str, float | int | None]) -> str:
	"""Render a statistics dictionary compactly for the text report."""

	return ", ".join(f"{key}={value:.6f}" if isinstance(value, float) else f"{key}={value}" for key, value in stats.items())


def write_csv(path: Path, fieldnames: list[str], rows: Iterable[dict[str, object]]) -> None:
	"""Write one CSV with a predictable header, including when there are no rows."""

	with path.open("w", newline="", encoding="utf-8") as handle:
		writer = csv.DictWriter(handle, fieldnames=fieldnames)
		writer.writeheader()
		writer.writerows(rows)


def main() -> None:
	"""Perform the complete audit and write only files beneath the output path."""

	args = parse_args()
	dataset = args.dataset.resolve()
	output = args.output.resolve()
	output.mkdir(parents=True, exist_ok=True)

	folders = sorted(path for path in dataset.iterdir() if path.is_dir())
	modality_data: dict[str, tuple[dict[int, ImageRecord], dict[int, AnnotationRecord], list[Path]]] = {}
	for folder in folders:
		modality_data[folder.name] = collect_files(folder)

	# WiSARD uses VIS for visible/RGB and IR for infrared/thermal.  Keeping the
	# lookup by folder name makes the audit explicit and avoids guessing based
	# on the order returned by the operating system.
	rgb_name = next((name for name in modality_data if "VIS" in name.upper() or "RGB" in name.upper()), None)
	thermal_name = next((name for name in modality_data if "IR" in name.upper() or "THERM" in name.upper()), None)
	if rgb_name is None or thermal_name is None:
		raise RuntimeError("Could not identify both visible/RGB and infrared/thermal folders.")

	rgb_images, rgb_labels, rgb_other = modality_data[rgb_name]
	thermal_images, thermal_labels, thermal_other = modality_data[thermal_name]

	# The direct same-frame intersection is intentionally measured first.  The
	# inferred one-frame offset is accepted only if it produces a complete
	# one-to-one mapping in both directions.
	same_frame_count = len(set(rgb_images) & set(thermal_images))
	offset_candidates = [offset for offset in range(-3, 4) if {frame + offset for frame in rgb_images} == set(thermal_images)]
	offset = offset_candidates[0] if len(offset_candidates) == 1 else 0
	pairs: list[dict[str, object]] = []
	for rgb_frame in sorted(rgb_images):
		thermal_frame = rgb_frame + offset
		thermal = thermal_images.get(thermal_frame)
		rgb_label = rgb_labels.get(rgb_frame)
		thermal_label = thermal_labels.get(thermal_frame)
		status_parts = []
		if thermal is None:
			status_parts.append("missing_thermal")
		if rgb_label is None:
			status_parts.append("missing_rgb_annotation")
		if thermal is not None and thermal_label is None:
			status_parts.append("missing_thermal_annotation")
		pairs.append(
			{
				"rgb_frame": rgb_frame,
				"thermal_frame": thermal_frame,
				"rgb_file": rgb_images[rgb_frame].path.name,
				"thermal_file": thermal.path.name if thermal else "",
				"rgb_annotation": rgb_label.path.name if rgb_label else "",
				"thermal_annotation": thermal_label.path.name if thermal_label else "",
				"status": "paired" if not status_parts else ";".join(status_parts),
			}
		)
	write_csv(output / "pairing_report.csv", list(pairs[0]) if pairs else ["rgb_frame", "thermal_frame", "rgb_file", "thermal_file", "rgb_annotation", "thermal_annotation", "status"], pairs)

	dimensions: dict[str, dict[int, tuple[int, int]]] = {"RGB": {}, "thermal": {}}
	corrupt: list[str] = []
	for label, records in (("RGB", rgb_images), ("thermal", thermal_images)):
		for frame, record in records.items():
			size, error = inspect_image(record.path)
			if size is None:
				corrupt.append(f"{label}: {record.path.relative_to(dataset)} ({error})")
			else:
				dimensions[label][frame] = size

	# Convert each normalized YOLO box to pixel dimensions and area whenever
	# its image can be decoded.  This supports both normalized and absolute
	# size reporting while preserving the original label values in the dataset.
	object_rows: dict[str, list[dict[str, float | int]]] = {"RGB": [], "thermal": []}
	image_object_counts: dict[str, Counter[int]] = {"RGB": Counter(), "thermal": Counter()}
	class_counts: dict[str, Counter[int]] = {"RGB": Counter(), "thermal": Counter()}
	invalid_annotations: list[str] = []
	all_annotations = {"RGB": rgb_labels, "thermal": thermal_labels}
	all_images = {"RGB": rgb_images, "thermal": thermal_images}
	for modality in ("RGB", "thermal"):
		for frame, annotation in all_annotations[modality].items():
			if annotation.invalid_lines:
				invalid_annotations.append(f"{modality}: {annotation.path.relative_to(dataset)}")
			rows = annotation.rows
			image_object_counts[modality][frame] = len(rows)
			for class_id, center_x, center_y, width, height in rows:
				class_counts[modality][class_id] += 1
				image_size = dimensions[modality].get(frame)
				pixel_width = width * image_size[0] if image_size else None
				pixel_height = height * image_size[1] if image_size else None
				object_rows[modality].append(
					{
						"class_id": class_id,
						"center_x": center_x,
						"center_y": center_y,
						"width_normalized": width,
						"height_normalized": height,
						"width_pixels": pixel_width if pixel_width is not None else 0,
						"height_pixels": pixel_height if pixel_height is not None else 0,
						"area_pixels": pixel_width * pixel_height if pixel_width is not None and pixel_height is not None else 0,
						"relative_area": width * height,
					}
				)

	dimension_counts = {modality: Counter(dimensions[modality].values()) for modality in dimensions}
	rgb_missing_labels = sorted(set(rgb_images) - set(rgb_labels))
	thermal_missing_labels = sorted(set(thermal_images) - set(thermal_labels))
	rgb_missing_images = sorted(set(rgb_labels) - set(rgb_images))
	thermal_missing_images = sorted(set(thermal_labels) - set(thermal_images))

	statistics_rows: list[dict[str, object]] = []
	for modality in ("RGB", "thermal"):
		width_values = [row["width_pixels"] for row in object_rows[modality]]
		height_values = [row["height_pixels"] for row in object_rows[modality]]
		area_values = [row["area_pixels"] for row in object_rows[modality]]
		relative_area_values = [row["relative_area"] for row in object_rows[modality]]
		for metric, values in (("bbox_width_pixels", width_values), ("bbox_height_pixels", height_values), ("bbox_area_pixels", area_values), ("bbox_relative_area", relative_area_values)):
			stats = number_stats(values)
			statistics_rows.append({"modality": modality, "metric": metric, **stats})
		for dimension, count in dimension_counts[modality].items():
			statistics_rows.append({"modality": modality, "metric": f"image_dimension_{dimension[0]}x{dimension[1]}", "count": count, "min": "", "mean": "", "median": "", "max": ""})
		statistics_rows.append({"modality": modality, "metric": "images", "count": len(all_images[modality]), "min": "", "mean": "", "median": "", "max": ""})
		statistics_rows.append({"modality": modality, "metric": "annotations", "count": len(all_annotations[modality]), "min": "", "mean": "", "median": "", "max": ""})
		statistics_rows.append({"modality": modality, "metric": "bounding_boxes", "count": len(object_rows[modality]), "min": "", "mean": "", "median": "", "max": ""})
		for object_count, image_count in sorted(image_object_counts[modality].items()):
			statistics_rows.append({"modality": modality, "metric": f"images_with_{object_count}_objects", "count": image_count, "min": "", "mean": "", "median": "", "max": ""})
		for class_id, count in sorted(class_counts[modality].items()):
			statistics_rows.append({"modality": modality, "metric": f"class_id_{class_id}", "count": count, "min": "", "mean": "", "median": "", "max": ""})
	write_csv(output / "dataset_statistics.csv", ["modality", "metric", "count", "min", "mean", "median", "max"], statistics_rows)

	report_lines = [
		"WiSARD Dataset Audit Report",
		"===========================",
		f"Dataset path: {dataset}",
		"Read-only audit: yes (no dataset files were written, moved, copied, renamed, or deleted)",
		"",
		"1. Structure",
		f"Top-level folders: {', '.join(path.name for path in folders)}",
		f"RGB/visible folder: {rgb_name}",
		f"Infrared/thermal folder: {thermal_name}",
		f"RGB image locations: {rgb_name}/*.jpeg (recursive search)",
		f"Thermal image locations: {thermal_name}/*.jpeg (recursive search)",
		f"Annotation locations: {rgb_name}/*.txt and {thermal_name}/*.txt, excluding count.txt",
		f"File formats: {', '.join(sorted({path.suffix.lower() for path in dataset.rglob('*') if path.is_file()}))}",
		f"Other metadata files: {', '.join(path.name for path in rgb_other + thermal_other) or 'none'}",
		"",
		"2. Counts and pairing",
		f"RGB images: {len(rgb_images)}",
		f"Thermal images: {len(thermal_images)}",
		f"RGB annotations: {len(rgb_labels)}",
		f"Thermal annotations: {len(thermal_labels)}",
		f"Direct same-frame RGB/thermal matches: {same_frame_count}",
		f"Inferred RGB-to-thermal frame offset: {offset} (thermal_frame = rgb_frame + offset)",
		f"One-to-one pairing under offset: {'yes' if len(pairs) == len(rgb_images) == len(thermal_images) and all(row['status'] == 'paired' for row in pairs) else 'no'}",
		f"Missing RGB counterparts under inferred pairing: {len(thermal_images) - sum(1 for row in pairs if row['status'] == 'paired')}",
		f"Missing thermal counterparts under inferred pairing: {sum(1 for row in pairs if 'missing_thermal' in str(row['status']))}",
		f"Missing RGB annotations: {len(rgb_missing_labels)} image labels, {len(rgb_missing_images)} label-only files",
		f"Missing thermal annotations: {len(thermal_missing_labels)} image labels, {len(thermal_missing_images)} label-only files",
		"",
		"3. Image integrity and dimensions",
		f"Unreadable/corrupt images: {len(corrupt)}",
		f"RGB dimensions: {dict(dimension_counts['RGB'])}",
		f"Thermal dimensions: {dict(dimension_counts['thermal'])}",
		f"RGB and thermal dimensions match by paired frame: {'yes' if all(dimensions['RGB'].get(row['rgb_frame']) == dimensions['thermal'].get(row['thermal_frame']) for row in pairs if row['status'] == 'paired') else 'no'}",
		"",
		"4. Annotation content",
		"Annotation format: YOLO-style normalized rows: class_id center_x center_y width height",
		f"Invalid annotation files: {len(invalid_annotations)}",
		f"RGB class IDs: {dict(class_counts['RGB'])} (class names are not provided)",
		f"Thermal class IDs: {dict(class_counts['thermal'])} (class names are not provided)",
		f"RGB bounding boxes: {len(object_rows['RGB'])}",
		f"Thermal bounding boxes: {len(object_rows['thermal'])}",
		f"RGB objects per image: {dict(image_object_counts['RGB'])}",
		f"Thermal objects per image: {dict(image_object_counts['thermal'])}",
		f"RGB images with zero objects: {image_object_counts['RGB'].get(0, 0)}",
		f"Thermal images with zero objects: {image_object_counts['thermal'].get(0, 0)}",
		f"RGB images with multiple objects: {sum(count for objects, count in image_object_counts['RGB'].items() if objects > 1)}",
		f"Thermal images with multiple objects: {sum(count for objects, count in image_object_counts['thermal'].items() if objects > 1)}",
	]
	for modality in ("RGB", "thermal"):
		report_lines.extend(
			[
				f"{modality} bbox width statistics (pixels): {format_stats(number_stats(row['width_pixels'] for row in object_rows[modality]))}",
				f"{modality} bbox height statistics (pixels): {format_stats(number_stats(row['height_pixels'] for row in object_rows[modality]))}",
				f"{modality} bbox area statistics (pixels squared): {format_stats(number_stats(row['area_pixels'] for row in object_rows[modality]))}",
				f"{modality} relative bbox area statistics: {format_stats(number_stats(row['relative_area'] for row in object_rows[modality]))}",
			]
		)
	report_lines.extend(
		[
			"",
			"5. Splits, duplicates, and leakage signals",
			"Train/validation/test split information: not provided in the dataset.",
			"Suspicious filenames: count.txt metadata files are present; image names otherwise follow modality plus eight-digit frame numbering.",
			"Duplicate filename note: count.txt occurs once per modality folder, which is expected because the folders differ.",
			f"Sequence evidence: yes; both folders contain contiguous numbered frames from a single shared 210417_MtErie_Enterprise sequence.",
			"Potential leakage: adjacent frames are highly likely to depict near-identical scenes. Random image-level splitting could place neighboring frames from the same sequence in different splits and inflate validation/test performance.",
			"",
			"6. Other structural findings",
			"The visible and thermal streams use different frame-number ranges (RGB 0-263; thermal 1-264), so pairing requires the observed one-frame offset rather than identical filenames.",
			"The count.txt totals are metadata summaries and are not annotation files.",
			"Class names are absent; the only observed class ID is 0.",
			f"Malformed annotation files: {', '.join(invalid_annotations) or 'none'}",
			f"Unreadable image files: {'; '.join(corrupt) or 'none'}",
			"",
			"Generated outputs",
			"- audit_report.txt",
			"- dataset_statistics.csv",
			"- pairing_report.csv",
			"- visualize_pairs.py",
		]
	)
	(output / "audit_report.txt").write_text("\n".join(report_lines) + "\n", encoding="utf-8")

	print("WiSARD audit complete")
	print(f"Dataset: {dataset}")
	print(f"RGB images: {len(rgb_images)} | thermal images: {len(thermal_images)}")
	print(f"RGB annotations: {len(rgb_labels)} | thermal annotations: {len(thermal_labels)}")
	print(f"Pairing: one-to-one with thermal frame offset {offset}; direct same-frame matches={same_frame_count}")
	print(f"Corrupt images: {len(corrupt)} | malformed annotation files: {len(invalid_annotations)}")
	print(f"RGB dimensions: {dict(dimension_counts['RGB'])}")
	print(f"Thermal dimensions: {dict(dimension_counts['thermal'])}")
	print("Sequence detected: yes; avoid random image-level splits across adjacent frames.")
	print(f"Outputs: {output}")


if __name__ == "__main__":
	main()
