"""Create the final WiSAR context-level split from frozen audit tables.

This script does not open the dataset ZIP or image files. It consumes the
recording-level CSV produced by 01_dataset_audit.ipynb and writes only split
manifests and validation reports under results/dataset_split.
"""

import csv
from collections import Counter, defaultdict
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
AUDIT_TABLE = PROJECT_ROOT / "results" / "dataset_audit" / "recording_stream_summary.csv"
OUTPUT_DIR = PROJECT_ROOT / "results" / "dataset_split"

TEST_CONTEXTS = {
    "210327_Airfield_FLIR",
    "210812_Hannegan_Enterprise",
}
DEVELOPMENT_CONTEXTS = (
    "210417_MtErie_Enterprise",
    "210529_Carnation_Enterprise",
    "210924_FHL_Enterprise",
    "220109_Baker_Enterprise",
)
EXCLUDED_RECORDINGS = {
    "200321_Baker_Phantom_VIS",
    "200402_Carnation_Inspire_VIS",
    "200402_Karen_Inspire_VIS",
    "200717_Mission_FLIR_VIS",
}
REQUIRED_COLUMNS = {
    "recording_name",
    "recording_path",
    "collection_context",
    "modality",
    "image_count",
    "annotation_count",
}


def read_recordings() -> list[dict[str, str]]:
    if not AUDIT_TABLE.is_file():
        raise FileNotFoundError(
            "The frozen audit table is missing: "
            f"{AUDIT_TABLE}. Run 01_dataset_audit.ipynb against the full ZIP first."
        )
    with AUDIT_TABLE.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or ())
        if missing:
            raise ValueError(f"Audit table is missing required columns: {sorted(missing)}")
        rows = list(reader)
    if not rows:
        raise ValueError("The frozen recording-level audit table contains no recording rows.")
    return rows


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    rows = read_recordings()
    expected_contexts = TEST_CONTEXTS | set(DEVELOPMENT_CONTEXTS)
    observed_contexts = {row["collection_context"] for row in rows if row["collection_context"]}
    missing_contexts = sorted(expected_contexts - observed_contexts)
    if missing_contexts:
        raise ValueError(
            "The audit table does not contain all requested final contexts: "
            f"{missing_contexts}. Refusing to create an incomplete split."
        )

    unexpected_contexts = sorted(observed_contexts - expected_contexts)
    split_rows = []
    excluded_rows = []
    for row in sorted(rows, key=lambda item: (item["collection_context"], item["recording_path"])):
        context = row["collection_context"]
        recording_name = row["recording_name"]
        if recording_name in EXCLUDED_RECORDINGS:
            excluded_rows.append({
                "recording_name": recording_name,
                "recording_path": row["recording_path"],
                "collection_context": context,
                "modality": row["modality"],
                "reason": "explicitly excluded ambiguous recording",
            })
            continue
        if not context or context not in expected_contexts:
            continue
        partition = "test" if context in TEST_CONTEXTS else "development"
        if row["modality"] not in {"VIS", "IR"}:
            raise ValueError(f"Unexpected modality for included recording: {recording_name}")
        split_rows.append({
            "recording_name": recording_name,
            "recording_path": row["recording_path"],
            "collection_context": context,
            "modality": row["modality"],
            "image_count": row["image_count"],
            "partition": partition,
            "cv_fold": "",
        })

    missing_exclusions = sorted(EXCLUDED_RECORDINGS - {row["recording_name"] for row in excluded_rows})
    if missing_exclusions:
        raise ValueError(
            "The recording-level audit table is missing required excluded recordings: "
            f"{missing_exclusions}"
        )

    fold_rows = []
    for fold_number, validation_context in enumerate(DEVELOPMENT_CONTEXTS, start=1):
        for row in split_rows:
            if row["partition"] != "development":
                continue
            fold_rows.append({
                **row,
                "cv_fold": str(fold_number),
                "cv_role": "validation" if row["collection_context"] == validation_context else "training",
                "cv_validation_context": validation_context,
            })

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest_fields = ["recording_name", "recording_path", "collection_context", "modality", "image_count", "partition", "cv_fold"]
    write_csv(OUTPUT_DIR / "recording_split_manifest.csv", manifest_fields, split_rows)
    write_csv(OUTPUT_DIR / "development_grouped_cv_manifest.csv", manifest_fields + ["cv_role", "cv_validation_context"], fold_rows)
    write_csv(OUTPUT_DIR / "excluded_recordings.csv", ["recording_name", "recording_path", "collection_context", "modality", "reason"], excluded_rows)

    context_partitions = defaultdict(set)
    for row in split_rows:
        context_partitions[row["collection_context"]].add(row["partition"])
    overlap = {context: sorted(partitions) for context, partitions in context_partitions.items() if len(partitions) != 1}
    if overlap:
        raise AssertionError(f"Collection-context partition overlap detected: {overlap}")

    report_lines = [
        "WiSARD final collection-context split validation",
        "===============================================",
        f"Audit source: {AUDIT_TABLE}",
        f"Unexpected contexts excluded by policy: {', '.join(unexpected_contexts) or 'none'}",
        f"Excluded ambiguous recordings: {len(excluded_rows)}",
        f"Collection-context overlap: {'zero' if not overlap else overlap}",
        "",
        "Partitions",
        "----------",
    ]
    for partition in ("development", "test"):
        selected = [row for row in split_rows if row["partition"] == partition]
        report_lines.append(
            f"{partition}: recordings={len(selected)}, "
            f"VIS={sum(row['modality'] == 'VIS' for row in selected)}, "
            f"IR={sum(row['modality'] == 'IR' for row in selected)}, "
            f"images={sum(int(row['image_count']) for row in selected)}, "
            f"contexts={';'.join(sorted({row['collection_context'] for row in selected}))}"
        )
    report_lines.extend(["", "Grouped development CV", "----------------------"])
    for fold_number, validation_context in enumerate(DEVELOPMENT_CONTEXTS, start=1):
        train_contexts = [context for context in DEVELOPMENT_CONTEXTS if context != validation_context]
        validation_rows = [
            row for row in split_rows
            if row["collection_context"] == validation_context
        ]
        training_rows = [
            row for row in split_rows
            if row["collection_context"] in train_contexts
        ]
        report_lines.append(
            f"fold {fold_number}: validation={validation_context} "
            f"(recordings={len(validation_rows)}, images={sum(int(row['image_count']) for row in validation_rows)}); "
            f"training={';'.join(train_contexts)} "
            f"(recordings={len(training_rows)}, images={sum(int(row['image_count']) for row in training_rows)}); "
            "test=excluded"
        )
    report_lines.extend([
        "",
        "No individual-image random split was created.",
        "No model was trained.",
        "The original ZIP and dataset files were not opened, extracted, or modified.",
    ])
    (OUTPUT_DIR / "split_validation_report.txt").write_text("\n".join(report_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()