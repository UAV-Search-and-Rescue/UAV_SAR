# Thermal Baseline (E1) Implementation Log

## Objective and experiment boundaries

E1 is a thermal/IR-only person-detection baseline. It reads the frozen recording-level split and never uses RGB images as model inputs. RGB-thermal fusion (E2) is explicitly out of scope.

## Current status

**Implementation in progress — static validation complete; data preparation and training pending.** The notebook defaults to `STAGE = "validate"` and does not materialize images or start training when opened or executed. If the ZIP is unavailable, validation reports that preparation is pending rather than failing or writing partial outputs.

## Repository and dataset facts verified

- E0 is in `notebooks/02_rgb_baseline.ipynb` and uses the frozen recording split under `results/dataset_split/`.
- The split generator is `scripts/create_dataset_split.py`.
- The frozen manifest uses `VIS` for visible/RGB and `IR` for infrared/thermal.
- Development contexts are `210417_MtErie_Enterprise`, `210529_Carnation_Enterprise`, `210924_FHL_Enterprise`, and `220109_Baker_Enterprise`.
- Held-out test contexts are `210327_Airfield_FLIR` and `210812_Hannegan_Enterprise`.
- The local requirements file is empty; no thermal training run was started.
- The original dataset ZIP is treated as read-only.

## Implementation decisions and rationale

| Date | Decision | Reasoning/evidence | Alternatives/consequences | Status |
|---|---|---|---|---|
| 2026-10-12 | Implement preparation directly in the thermal notebook | The task requested notebook-local preparation and E0 already establishes the project convention | A reusable script would reduce duplication but would expand scope; no script was added | Verified statically |
| 2026-10-12 | Use `IR` rows from the frozen manifest | This is the repository's actual modality convention | Guessing from folder names could select the wrong recordings | Verified from frozen CSV |
| 2026-10-12 | Default to validation-only | Prevent opening/rerunning a notebook from consuming Drive/GPU or evaluating test data | Explicit stage changes are required for materialization and training | Verified in notebook source |
| 2026-10-12 | Use a 10-epoch chunk and Drive-isolated E1 state | This matches the requested interruption granularity and avoids E0 collisions | Exact mid-epoch recovery remains framework-dependent; the notebook resumes at the last completed chunk | Provisional until a real Ultralytics run |
| 2026-10-12 | Reject incompatible or incomplete checkpoint metadata | A corrupt or mismatched run must not silently restart at epoch zero | User must inspect or choose a new run identifier | Verified statically |
| 2026-10-12 | Validate representative thermal image bytes with Pillow and preserve mode, dimensions, and extrema in the pair manifest | Thermal signal characteristics must be observed rather than inferred from RGB conventions; unreadable images must be excluded with a reason | Skipping decode validation would defer failures until training; arbitrary colorization was rejected | Implemented; real ZIP verification pending |
| 2026-10-12 | Materialize detector-ready partition lists and `data.yaml` only under the E1 data root | Training requires an explicit detector input description while E0 artifacts must remain isolated | Reusing E0 data files would violate experiment isolation | Implemented statically |
| 2026-10-12 | Generate a separate train/validation list and YAML for the selected held-out development context | The grouped CV protocol must be enforced by the data configuration, not only documented in the function signature | A single all-development YAML would leak the validation context into training | Implemented statically |
| 2026-10-12 | Detect deterministic filename collisions and preserve the previous checkpoint before loading a resumable latest checkpoint | A collision or replacement failure must not silently destroy recoverable progress | Relying only on archive paths or framework writes was insufficient | Implemented statically |
| 2026-10-12 | Preserve nested archive paths and derive every image-list entry from the materialized target helper | Flattening archive names made list paths diverge from extracted files and could collide across folders | Renaming or dropping samples was rejected because it changes provenance and split membership | Implemented; synthetic nested-archive test passed |
| 2026-10-12 | Copy `last.pt` to `last.previous.pt` before a training chunk and retain separate latest/backup epoch metadata | Moving `last.pt` left the active resume path invalid; one epoch count could mislabel a backup checkpoint | Loading a checkpoint without `resume=True` was rejected because it does not restore optimizer/scheduler/epoch state | Implemented statically; real Ultralytics interruption behavior pending |
| 2026-10-12 | Handle `pickle.UnpicklingError` and related deserialization failures explicitly and reject unverified checkpoints | File existence is not evidence that a checkpoint is loadable | Treating any nonempty file as valid could silently lose progress | Implemented; corrupt/fallback smoke test passed |
| 2026-10-12 | Derive completed epochs from each checkpoint's saved `epoch` field and repair stale metadata before selecting a resume target | Ultralytics can update `last.pt` during a chunk before the metadata write; trusting the prior chunk count can skip or repeat epochs | Treating `epochs=target` as the checkpoint's actual epoch was rejected; `resume=True` remains responsible for restoring trainer state | Implemented; synthetic interruption/recovery smoke test passed; real Ultralytics checkpoint pending |

## Alternatives considered and why they were rejected

- Reusing the RGB notebook by text substitution was rejected because it retained E0 paths, names, guessed counts, and automatic training behavior.
- Random image-level splitting was rejected because it violates the frozen context-level protocol.
- Automatic held-out test evaluation was rejected because test results must remain gated until development choices are final.
- Arbitrary thermal colorization was not added. The current notebook preserves original thermal bytes during materialization; any detector channel conversion must be documented and tested before training.

## Dataset preparation and validation findings

The notebook creates `results/thermal_baseline/thermal_dataset_manifest.csv`, `thermal_exclusions.json`, and `thermal_manifest_metadata.json` after explicit execution. It validates matching stems, excludes `count.txt`, decodes representative image bytes with Pillow, records image mode/dimensions/intensity extrema, validates YOLO rows and normalized boxes, records exclusions, verifies every row against the frozen split, and reports partition/context counts. Real ZIP inspection and representative thermal image statistics are pending because the ZIP was not available in this implementation pass. Nested archive materialization was verified with a synthetic archive.

## Training configuration

- Model family: Ultralytics YOLO, initialized from `yolov8s.pt` when no compatible E1 checkpoint exists.
- Image size: 640.
- Batch size: 8.
- Total epoch budget: 100.
- Chunk size: 10 epochs.
- Seed: 20260905.
- Device: CUDA when available, otherwise CPU.
- E1 persistent root: `/content/drive/MyDrive/UAV_SAR_E1/`.

These values mirror the inspected E0 intent where comparable, but the actual E1 run configuration must be recorded after the first real training execution.

## Checkpoint/resume design and recovery behavior

Run state is isolated below `UAV_SAR_E1/runs`. Metadata stores the experiment ID, fold, manifest fingerprint, split fingerprint, seed, image size, batch size, and epoch budget. Resume discovery checks metadata before loading `last.pt`; it also checks `last.previous.pt` as a fallback using a separate `previous_completed_epochs` value. Each candidate is deserialized and its saved zero-based `epoch` is converted to completed epochs by adding one. If the value differs from metadata, the metadata is atomically repaired before the checkpoint is returned. Thus an interrupted chunk resumes from the checkpoint's actual saved state, not the last completed chunk recorded before the interruption. Missing or incompatible metadata raises an error instead of starting a fresh run. Checkpoint deserialization is attempted with `torch.load`; known PyTorch/pickle failures and missing epoch state are treated as invalid, and no valid checkpoint causes a clear failure. Before a chunk, `last.pt` is copied to the backup while the active checkpoint path remains unchanged, then `model.train(..., resume=True)` is used. After successful training, metadata is written from the new checkpoint's actual saved epoch rather than the requested `epochs` target. Exact mid-epoch recovery remains dependent on the checkpoint Ultralytics has written at disconnect time; the notebook does not claim recovery of work after the latest saved checkpoint.

## Cross-validation progress

No fold has started. The notebook exposes `train_selected_fold(fold, validation_context)` rather than looping over all folds automatically. A future run must record each fold's validation context, completed epochs, best checkpoint, metrics, duration, and warnings here.

## Validation and test protocol

Grouped development cross-validation must hold out one development collection context per fold. `write_fold_data` creates the selected fold's train/validation lists and excludes test rows. Test contexts remain excluded from training and checkpoint selection. Test metrics and final development metrics are not yet implemented; final development training and held-out test evaluation remain separate explicit stages, and the current test stage raises a gate until development work is complete.

## Commands and cells executed

- Inspected the E0 notebook, frozen split generator, frozen manifests, existing results, project instructions, and Git status.
- Replaced the empty thermal notebook with a four-cell E1 implementation.
- Generated the notebook using a temporary local builder and removed that builder afterward.
- Training and real-data preparation cells were not executed.

## Tests run and actual outcomes

- Notebook JSON parsing with PowerShell `ConvertFrom-Json`: passed after the targeted edits.
- Notebook cell inventory: five cells, including an explicit non-running regression smoke-test cell.
- Python compilation: passed after the targeted path/checkpoint/test edits.
- Validation-only preflight with the local ZIP absent: passed and reported preparation pending without training or writes.
- Focused E1 regression smoke tests: passed for nested archive paths, generated image lists, valid latest selection, corrupt-latest fallback with the backup epoch, no-valid-checkpoint failure, and nonzero next-chunk progression after fallback.
- Checkpoint interruption smoke test: passed using serialized synthetic payloads with a latest checkpoint at saved epoch 14 and stale metadata at 10; recovery selected 15 completed epochs and targeted epoch 25, then corrupt-latest fallback selected the backup's actual 10 completed epochs and targeted epoch 20.
- Missing-metadata and corrupt-checkpoint smoke tests: passed; corrupt checkpoint was rejected rather than treated as a fresh run.
- `git diff --check`: passed.
- ZIP preparation, representative thermal image inspection, and Ultralytics training: pending.

## Known issues, limitations, and unresolved questions

- The local dataset ZIP path and thermal image encoding have not been inspected by this implementation pass.
- `requirements.txt` is empty, so the pinned Ultralytics environment is not declared.
- The notebook now writes detector-ready development/test lists, fold-specific train/validation lists, and `data.yaml` under the E1 materialization root. Final evaluation/reporting cells and real Ultralytics execution remain pending.
- The synthetic checkpoint smoke test does not prove that a real Ultralytics-generated checkpoint contains the expected optimizer/scheduler state; this requires a controlled Colab/Ultralytics run.
- PyTorch is not installed in the local virtual environment, so the focused smoke test used a small pickle-backed serialization shim. The production notebook still uses `torch.load`; real PyTorch deserialization and Ultralytics checkpoint epoch semantics remain pending.
- Atomic protection is implemented for metadata and materialization markers; framework-generated model checkpoint writes still depend on Ultralytics filesystem behavior.

## Next steps

1. Run the notebook through manifest preparation only and inspect representative IR mode, dimensions, and intensity statistics.
2. Add/verify grouped CV fold lists and evaluation/reporting cells after the actual thermal counts are known.
3. Execute one selected fold in 10-epoch chunks, recording checkpoint recovery results after an intentional interruption test.
4. Complete all development folds and final development training before explicitly enabling test evaluation.

## E2 intermediate-fusion compatibility considerations

The E1 manifest retains deterministic archive member paths, recording names, recording paths, collection contexts, partitions, and annotation provenance. Materialization uses deterministic filenames and a manifest fingerprint. E1 weights may be useful as unimodal initialization, but they are not claimed to be directly compatible with an intermediate-fusion architecture until tensor shapes and feature extraction points are verified.
