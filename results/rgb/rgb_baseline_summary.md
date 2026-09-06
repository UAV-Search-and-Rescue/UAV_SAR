# RGB Baseline Summary

## Dataset
- Source: `D:\Hackathons\miniproject5sem\WiSARD_Multi_Modal_Sample` (read-only)
- RGB folder: `210417_MtErie_Enterprise_VIS_0003`
- Split: chronological contiguous blocks, approximately 70% train / 15% validation / 15% test
- Train images: 184
- Validation images: 39
- Test images: 41
- Native RGB resolution: 3840 x 2160

## Preprocessing
- Model input: 640 pixels
- Aspect ratio: preserved with detector letterboxing
- Source images copied: no
- Source images modified: no

## Model and training
- Model: yolo11n.pt
- Pretrained: yes
- Epochs: 1
- Batch size: 2
- Device: cpu
- Seed: 20260905
- Confidence threshold: 0.25
- IoU threshold: 0.5

## Test metrics
     model  input_size  train_images  val_images  test_images  precision  recall  f1  map50  map50_95  epochs  batch_size     seed                                       evaluation_note
yolo11n.pt         640           184          39           41        0.0     0.0 0.0    0.0       0.0       1           2 20260905 test metrics are descriptive; tune only on validation

## Qualitative observations
The prediction figures should be inspected for successful detections, missed small targets, and false positives. The four empty RGB images are useful for checking whether the detector invents people in background-only frames.

## Interpretation
A one-epoch CPU smoke run validates the pipeline but should not be presented as a final performance claim. A longer, fixed GPU run is required for the research baseline. Any later thermal or fusion comparison must reuse the split and document changes explicitly.

## Limitations
- The local annotation files provide class ID 0 but no class-name mapping.
- This is one sequential scene, so chronological test performance may not represent a new location.
- Tiny aerial people may be lost during resizing to the model input.
- Test metrics must not be used for hyperparameter tuning.
