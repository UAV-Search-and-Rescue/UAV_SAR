"""Display or save random RGB/thermal WiSARD pairs with YOLO boxes.

The dataset remains in its original location.  This utility reads images and
labels, then writes only visualization PNG files under the selected output
directory.  It defaults to 24 pairs, which is inside the requested range of
20 to 30 examples.

Example:

    python results/dataset_audit/visualize_pairs.py \
        --dataset "D:/Hackathons/miniproject5sem/WiSARD_Multi_Modal_Sample" \
        --output "results/dataset_audit/pair_visualizations"
"""

# Imports are kept intentionally small so a beginner can see which library is
# responsible for each job: argparse handles options, random selects examples,
# and Pillow reads/draws the image files.
import argparse
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw


DEFAULT_DATASET = Path(__file__).resolve().parents[3] / "WiSARD_Multi_Modal_Sample"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "pair_visualizations"
FRAME_PATTERN = re.compile(r"_(\d+)$")


def frame_from_name(path: Path) -> int | None:
    """Read the final numeric frame token from a file stem."""

    match = FRAME_PATTERN.search(path.stem)
    return int(match.group(1)) if match else None


def parse_label_file(path: Path) -> list[tuple[int, float, float, float, float]]:
    """Read valid normalized YOLO rows and ignore malformed rows safely."""

    rows = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        fields = line.split()
        if len(fields) != 5:
            continue
        try:
            class_id = int(fields[0])
            values = [float(value) for value in fields[1:]]
        except ValueError:
            continue
        if 0 <= class_id and all(0.0 <= value <= 1.0 for value in values):
            rows.append((class_id, *values))
    return rows


def draw_yolo_boxes(image: Image.Image, labels: list[tuple[int, float, float, float, float]]) -> Image.Image:
    """Return a copy of an image with normalized YOLO boxes drawn on top."""

    annotated = image.convert("RGB").copy()
    draw = ImageDraw.Draw(annotated)
    image_width, image_height = annotated.size
    for class_id, center_x, center_y, width, height in labels:
        left = int((center_x - width / 2) * image_width)
        top = int((center_y - height / 2) * image_height)
        right = int((center_x + width / 2) * image_width)
        bottom = int((center_y + height / 2) * image_height)
        draw.rectangle((left, top, right, bottom), outline="red", width=3)
        draw.text((left + 3, top + 3), f"class {class_id}", fill="red")
    return annotated


def parse_args() -> argparse.Namespace:
    """Provide simple command-line controls for reproducible visual checks."""

    parser = argparse.ArgumentParser(description="Save random annotated WiSARD RGB/thermal pairs.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--count", type=int, default=24, help="Number of pairs to save; must be between 20 and 30.")
    parser.add_argument("--seed", type=int, default=20260905)
    return parser.parse_args()


def main() -> None:
    """Select offset-matched frames and save side-by-side annotated images."""

    args = parse_args()
    if not 20 <= args.count <= 30:
        raise ValueError("--count must be between 20 and 30")

    dataset = args.dataset.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    rgb_folder = next(path for path in dataset.iterdir() if path.is_dir() and ("VIS" in path.name.upper() or "RGB" in path.name.upper()))
    thermal_folder = next(path for path in dataset.iterdir() if path.is_dir() and ("IR" in path.name.upper() or "THERM" in path.name.upper()))

    rgb_images = {frame_from_name(path): path for path in rgb_folder.glob("*.jpeg") if frame_from_name(path) is not None}
    thermal_images = {frame_from_name(path): path for path in thermal_folder.glob("*.jpeg") if frame_from_name(path) is not None}
    rgb_labels = {frame_from_name(path): path for path in rgb_folder.glob("*.txt") if path.name != "count.txt" and frame_from_name(path) is not None}
    thermal_labels = {frame_from_name(path): path for path in thermal_folder.glob("*.txt") if path.name != "count.txt" and frame_from_name(path) is not None}

    # The audit found that the thermal stream starts one frame later than the
    # visible stream.  This is why the matching key is rgb_frame + 1.
    candidate_frames = [frame for frame in rgb_images if frame + 1 in thermal_images]
    random.Random(args.seed).shuffle(candidate_frames)
    selected_frames = sorted(candidate_frames[:args.count])

    for rgb_frame in selected_frames:
        thermal_frame = rgb_frame + 1
        with Image.open(rgb_images[rgb_frame]) as rgb_image, Image.open(thermal_images[thermal_frame]) as thermal_image:
            rgb_panel = draw_yolo_boxes(rgb_image, parse_label_file(rgb_labels[rgb_frame])) if rgb_frame in rgb_labels else rgb_image.convert("RGB")
            thermal_panel = draw_yolo_boxes(thermal_image, parse_label_file(thermal_labels[thermal_frame])) if thermal_frame in thermal_labels else thermal_image.convert("RGB")
            panel_width = rgb_panel.width + thermal_panel.width
            panel_height = max(rgb_panel.height, thermal_panel.height) + 32
            panel = Image.new("RGB", (panel_width, panel_height), "white")
            panel.paste(rgb_panel, (0, 32))
            panel.paste(thermal_panel, (rgb_panel.width, 32))
            draw = ImageDraw.Draw(panel)
            draw.text((8, 8), f"RGB frame {rgb_frame} | Thermal frame {thermal_frame}", fill="black")
            panel.save(output / f"pair_rgb_{rgb_frame:08d}_thermal_{thermal_frame:08d}.png")

    print(f"Saved {len(selected_frames)} side-by-side pair visualizations to {output}")


if __name__ == "__main__":
    main()