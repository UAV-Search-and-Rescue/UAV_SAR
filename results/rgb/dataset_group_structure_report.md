# WiSARD Dataset Group Structure and Hardware Investigation

**Investigation date:** 2026-09-05  
**Project:** `D:\Hackathons\miniproject5sem\UAV-Search-and-Rescue`  
**Source dataset:** `D:\Hackathons\miniproject5sem\WiSARD_Multi_Modal_Sample`  
**Scope:** read-only investigation only. No source dataset file, notebook, split CSV, model configuration, package, or training run was changed.

## Executive Summary

- **FACT:** The downloaded sample contains exactly two top-level directories: one visible/RGB directory and one infrared/thermal directory.
- **FACT:** The visible stream has one filename prefix, `210417_MtErie_Enterprise_VIS_0003`, and 264 frames numbered `0..263` with no frame-number gaps.
- **FACT:** The thermal stream has one filename prefix, `210417_MtErie_Enterprise_IR_0004`, and 264 frames numbered `1..264` with no frame-number gaps.
- **FACT:** The observed pairing remains `thermal_frame = rgb_frame + 1`.
- **FACT:** Each modality has one `count.txt` metadata file. The metadata reports 1,022 visible humans, 1,006 infrared humans, and 264 images in each folder.
- **FACT:** No separate flight ID, sequence ID, timestamp file, GPS file, scene directory, location directory, or independent group manifest was found in the downloaded sample.
- **INFERENCE:** Based on the available file and directory evidence, this sample is one continuous paired sequence/scene, or at least one undivided recording segment. The files do not support claiming multiple independent flights.
- **UNKNOWN:** The filenames contain the token `MtErie`, but no local metadata proves whether this is a location name, source name, mission name, or another dataset identifier.
- **CONCLUSION:** A flight-level/group-level train/validation/test split is not possible from this sample because only one apparent group is available. A chronological split is the only evidence-supported split family currently available, but its exact percentages should remain a methodological decision rather than an automatic convention.

## Part A: Dataset Structure

### Recursive organization

The source has this structure:

```text
WiSARD_Multi_Modal_Sample/
├── 210417_MtErie_Enterprise_IR_0004/
│   ├── 264 .jpeg infrared images, frames 00000001..00000264
│   ├── 264 per-frame .txt annotation files
│   └── count.txt
└── 210417_MtErie_Enterprise_VIS_0003/
    ├── 264 .jpeg visible/RGB images, frames 00000000..00000263
    ├── 264 per-frame .txt annotation files
    └── count.txt
```

**FACT:** The recursive file inventory contains 1,058 files: 528 JPEG images and 530 text files. Of the 530 text files, 528 are per-frame annotations and two are `count.txt` metadata files.

**FACT:** No nested subdirectories exist below the two modality directories.

**FACT:** All image files observed use `.jpeg`. No additional image extension was found.

### Grouping identifiers found

| Identifier or token | Observed value | Evidence | Interpretation status |
|---|---|---|---|
| Shared filename prefix | `210417_MtErie_Enterprise` | Present in both modality prefixes | FACT; semantic meaning UNKNOWN |
| Visible modality/source token | `VIS_0003` | Visible folder and every visible frame filename | FACT |
| Infrared modality/source token | `IR_0004` | Infrared folder and every infrared frame filename | FACT |
| Location-like token | `MtErie` | Embedded in both prefixes | FACT as a token; whether it is a location is UNKNOWN |
| Date-like leading token | `210417` | Embedded in both prefixes | FACT as a token; whether it is a capture date is UNKNOWN |
| Flight identifier | None found | No separate flight field, folder, or manifest | UNKNOWN, not available locally |
| Sequence identifier | None explicitly labeled | Frame numbering and common prefix indicate one sequence-like block | UNKNOWN as an explicit metadata field |
| Timestamp | None found | No timestamp metadata or timestamp filenames | UNKNOWN, not available locally |
| GPS/location metadata | None found | No GPS or location metadata files | UNKNOWN, not available locally |

The suffixes `0003` and `0004` are **not** treated as separate flights. They identify the two modality/source directory names in this sample, and the paired streams have different frame-number origins.

### Frame continuity and transitions

| Stream | Frame range | Number of frames | Unique gaps |
|---|---:|---:|---|
| RGB / visible | 0..263 | 264 | `[1]` |
| Thermal / infrared | 1..264 | 264 | `[1]` |

**FACT:** Frame numbering is continuous within each modality. There are no missing numeric frame IDs and no detected numbering transitions.

**FACT:** The frame sets become equal after adding 1 to every RGB frame ID: `RGB 0..263 -> thermal 1..264`.

**FACT:** The previous audit found one-to-one pairing for all 264 pairs. No pairing gap was found.

**UNKNOWN:** Continuity of numbering does not prove that the camera was in one uninterrupted flight. It proves only that the downloaded files form one contiguous numbered block.

### Metadata/count files

Visible `count.txt`:

```text
number of humans: 1022
 number of images: 264
```

Thermal `count.txt`:

```text
number of humans: 1006
 number of images: 264
```

**FACT:** These files are folder summaries, not YOLO annotations. They were excluded from annotation analysis.

**FACT:** The count summaries agree with the audited annotation totals.

## Temporal Adjacency Measurement

To quantify continuity without writing derived data, the RGB images were read in frame order and reduced in memory to 160 x 90 grayscale thumbnails. For each pair of adjacent frames, two descriptive quantities were calculated:

1. **Mean absolute pixel difference:** average absolute intensity change between adjacent thumbnails. Lower values generally indicate more similar images, although brightness changes and camera motion also affect this number.
2. **Pearson correlation:** similarity of intensity patterns after accounting for a linear intensity relationship. Values closer to 1 indicate stronger visual similarity.

These are exploratory continuity measurements, not a flight-boundary detector.

**FACT:** All 263 adjacent RGB pairs are frame-adjacent with no numbering gaps.

**FACT:** Adjacent RGB measurements were:

| Measurement | Value |
|---|---:|
| Mean absolute difference, mean | 15.9748 |
| Mean absolute difference, median | 9.2117 |
| Mean absolute difference, 95th percentile | 43.4454 |
| Mean absolute difference, maximum | 56.2318 |
| Correlation, mean | 0.809335 |
| Correlation, median | 0.960819 |
| Correlation, 5th percentile | 0.348563 |
| Correlation, minimum | 0.166606 |

**FACT:** The largest measured adjacent differences were concentrated around transitions into frames 187, 188, 189, 192, 200, 201, 202, 204, 215, and 216. The largest difference was the transition into RGB frame 202, with mean absolute difference 56.232 and correlation 0.2378.

**INFERENCE:** Most neighboring frames are strongly similar, as indicated by the median correlation of approximately 0.961. The lower-correlation region around frames 187..216 may contain camera motion, a view change, lighting change, or another scene transition.

**UNKNOWN:** The measurements do not identify a flight boundary. No independent metadata indicates that this region starts a new flight, location, or sequence. It should not be split into a new group without external evidence.

## Is This One Flight, Multiple Flights, or Multiple Scenes?

### Directly observed

- One visible directory.
- One thermal directory.
- One visible filename prefix.
- One thermal filename prefix.
- One continuous visible frame range.
- One continuous thermal frame range.
- One complete offset-based pairing across all 264 pairs.
- No nested scene/flight directories.
- No flight manifest, timestamp list, GPS file, or sequence-boundary metadata.

### Inference

The strongest local explanation is **one continuous 264-pair sequence or one undivided recording segment**. The common `210417_MtErie_Enterprise` token and synchronized frame ranges support treating the sample as one group for leakage analysis.

This is not a claim that the physical aircraft definitely completed only one flight. The downloaded sample may be a selected excerpt, and the local files do not contain enough provenance to prove the complete mission history.

### Unknown / not available

- Number of physical flights represented.
- Whether the recording was interrupted.
- Whether frame 187..216 contains a physical scene or camera transition.
- Exact capture date represented by `210417`.
- Exact meaning of `MtErie`.
- Camera GPS, flight path, altitude, and mission boundaries.

## Group-Level Split Feasibility

**FACT:** Only one apparent group is available in the sample.

**CONCLUSION:** A group-level or flight-level train/validation/test split cannot be constructed from this sample without inventing groups. There are not multiple independently identified flights, locations, or sequences to assign to separate partitions.

**INFERENCE:** A chronological split is preferable to a random image-level split for this sample because adjacent frames are strongly similar and random splitting could place near-duplicate views in different partitions.

**LIMITATION:** A chronological split still evaluates later frames from the same apparent sequence. It does not measure generalization to a genuinely unseen flight or location. That requires additional independent sequences or external provenance.

No split was changed during this investigation.

## Existing `rgb_sequence_split.csv`

The existing file was inspected but not modified.

**FACT:** It contains one row per RGB frame and stores references to the original image and annotation paths. It does not copy image data.

**FACT:** The exact existing partitions are:

| Split | Frame range | Image count | Ground-truth boxes |
|---|---:|---:|---:|
| Train | 0..183 | 184 | 717 |
| Validation | 184..222 | 39 | 141 |
| Test | 223..263 | 41 | 164 |
| **Total** | **0..263** | **264** | **1,022** |

**FACT:** The partitions are contiguous, non-overlapping, and cover every RGB frame exactly once.

**FACT:** The existing proportions are 184/264 = 69.70%, 39/264 = 14.77%, and 41/264 = 15.53%. This is approximately 70/15/15, but the exact counts result from integer frame boundaries.

**FACT:** The validation block contains frames with 0 to 4 objects. The test block contains 4 objects in every frame in the existing manifest, while the train block contains 1 to 4 objects according to the manifest.

**INTERPRETATION:** The chronological split is internally reproducible and avoids random frame-level mixing. However, its test block is not object-count-balanced: it is a later portion of the sequence with four annotated objects per frame.

**UNKNOWN:** Whether the later frames are harder or easier for the detector because of scene content, camera motion, person scale, or other changes. This cannot be decided from the split CSV alone.

**RECOMMENDATION STATUS:** No decision is made here to retain, modify, or discard the split. The evidence shows that it is a valid chronological reference split, but its representativeness should be reviewed before final benchmarking.

## Part B: Actual Hardware and Python Environments

No packages were installed, upgraded, or reinstalled for this investigation.

### Environment inventory

| Candidate environment | Python executable | Python version | PyTorch | torchvision | Ultralytics |
|---|---|---|---|---|---|
| Activated `.venv-1` | `D:\Hackathons\miniproject5sem\.venv-1\Scripts\python.exe` | 3.12.8 | not installed | not installed | not installed |
| Project `.venv` | `D:\Hackathons\miniproject5sem\.venv\Scripts\python.exe` | 3.12.8 | not installed | not installed | not installed |
| Training-capable global Python | `C:\Program Files\Python312\python.exe` | 3.12.8 | 2.13.0+cpu | 0.28.0+cpu | 8.4.140 |

The previously executed RGB baseline used the global Python stack containing CPU PyTorch and Ultralytics, not the activated `.venv-1` environment.

### NVIDIA driver / Windows visibility

**FACT:** `nvidia-smi` is available at `C:\WINDOWS\system32\nvidia-smi.exe`.

**FACT:** `nvidia-smi` reports:

- GPU: `NVIDIA GeForce RTX 3050 6GB Laptop GPU`
- Driver version: `581.95`
- NVIDIA-reported CUDA version: `13.0`
- Total GPU memory: `6144 MiB`
- Used memory at probe time: `0 MiB`
- Free memory at probe time: `6002 MiB`

**CONCLUSION:** Windows/NVIDIA driver visibility is **YES**. The physical RTX 3050 is visible to the operating system and driver tooling.

### PyTorch visibility

Probe used:

```text
C:\Program Files\Python312\python.exe
```

Observed values:

- `torch.__version__`: `2.13.0+cpu`
- `torch.cuda.is_available()`: `False`
- `torch.version.cuda`: `None`
- `torch.cuda.device_count()`: `0`
- Device name: unavailable because PyTorch reports no CUDA devices
- Device capability: unavailable because PyTorch reports no CUDA devices
- GPU memory via PyTorch: unavailable because PyTorch reports no CUDA devices

**CONCLUSION:** PyTorch visibility is **NO**. This is a CPU-only PyTorch installation/environment issue, not evidence that the machine lacks a GPU.

### Ultralytics visibility

**FACT:** Ultralytics version `8.4.140` imports successfully in the global Python environment.

**FACT:** Ultralytics depends on the PyTorch runtime selected by that Python process. The probe found no CUDA device through PyTorch.

**CONCLUSION:** Ultralytics package visibility is **YES**, but Ultralytics CUDA acceleration visibility is **NO** in the current training environment. It can run through the CPU PyTorch backend; it cannot use the RTX 3050 through this environment.

### Hardware conclusion

| Layer | RTX 3050 visible? | Evidence |
|---|---|---|
| Windows / NVIDIA driver | **YES** | `nvidia-smi` identifies the RTX 3050 6GB and driver 581.95 |
| PyTorch | **NO** | `2.13.0+cpu`, CUDA `None`, device count `0` |
| Ultralytics | **Package YES; CUDA NO** | Ultralytics imports, but it sees the CPU-only PyTorch runtime |

Because `nvidia-smi` sees the GPU while PyTorch does not, the diagnosis is an environment/PyTorch CUDA build issue. No attempt was made to fix it, as requested.

## Part C: Disk and Cache Check

**FACT:** Filesystem free space at investigation time:

| Drive | Free space |
|---|---:|
| `C:` | approximately 9.03 GB |
| `D:` | approximately 78.08 GB |

**FACT:** The pip cache queried through the active `python` command contained approximately 99.1 MB of HTTP cache files and 0 bytes of locally built wheels.

**FACT:** No cache or package cleanup was performed during this investigation.

**INFERENCE:** The limited free space on `C:` is relevant because the active global Python package locations and pip cache are on `C:`. Large CUDA-enabled PyTorch wheels and related packages may require substantial temporary space beyond their final installed size.

## Final Evidence-Based Recommendation

This section intentionally does not make an unrequested methodological decision beyond what the evidence supports.

1. **Split family:** A group/flight-level split is not currently possible because the sample provides one apparent sequence/group and no independently identified flights or locations. A chronological split is therefore the evidence-supported option for this sample if a split must be used now.
2. **Why chronological:** The frame IDs are continuous and adjacent RGB frames are strongly similar overall, with median adjacent correlation approximately 0.961. Random image-level splitting risks temporal leakage through near-duplicate neighboring views.
3. **Existing 70/15/15 split:** It is a deterministic, contiguous, non-overlapping approximately 70/15/15 split: train 0..183, validation 184..222, test 223..263. It was not changed. Whether to retain it, modify its boundaries, or discard it remains a project decision because the test block has a different object-count profile and no independent-flight generalization is available.
4. **RTX 3050 for real RGB baseline:** The physical RTX 3050 is available at the Windows driver level, but the current training Python cannot use it. Real GPU training is therefore not available in the current environment.
5. **Exact issue to fix later:** Use a deliberately selected Python environment containing a CUDA-enabled PyTorch build compatible with the installed driver and the project’s torchvision/Ultralytics versions. The current global Python has CPU-only PyTorch, while the activated `.venv-1` has no PyTorch/torchvision/Ultralytics at all. Fixing this is deferred; no installation or upgrade was attempted here.

## Investigation Boundary

- No thermal notebook was created.
- No training was run.
- No split file was changed.
- No `02_rgb_baseline.ipynb` content was changed.
- No package was installed, upgraded, or reinstalled.
- No source dataset file was modified, moved, copied, renamed, or deleted.
- The only created file is this report.
