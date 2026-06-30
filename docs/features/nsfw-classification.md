<!-- last_verified: 2026-06-30 -->
# Feature: NSFW Classification (NudeNet)

## Purpose
Classify each sampled frame locally with NudeNet — an ONNX detector — producing
per-frame labels, confidence scores, and bounding boxes. No external API, no
second key.

## Used By
- Service: `app/service/moderation.py` (pipeline step)

## Core Functions
- `app/service/classifier.py::classify_frame`
- `app/service/classifier.py::_get_detector` (lazy process-wide singleton)
- `app/service/classifier.py::crop_detection`

## Canonical Files
- `services/api/app/service/classifier.py`

## Inputs
- frame_path: Path
- threshold: float (detections below this score are dropped)

## Outputs
- `Detection[]` ({label, score, box}) for the frame

## Execution provider
NudeNet runs on `onnxruntime`, not torch. CPU is the shipped default. `_available_providers`
prefers `CUDAExecutionProvider` when present and always appends
`CPUExecutionProvider`, so a machine with no GPU still runs. onnxruntime has no
first-class Apple MPS provider, so on Apple silicon the chain is CUDA → CPU.

## Flow
- Lazily construct one `NudeDetector` (imported inside the function so structure
  / no-network tests don't load the model).
- Run detection; keep detections scoring ≥ threshold (all classes, not just
  violations — non-explicit classes populate the detection table).

## Edge Cases
- A frame with no detections → empty list (frame is clean).
- Detected non-violation class (FACE, FEET) → recorded but does not flag.

## Verification
- Covered by the end-to-end run on a synthetic benign clip (real model load).
  Unit suite is offline by design.
- Pass criteria: benign clip → 0 violations; model loads on CPU offline.

## Related Docs
- [docs/features/moderation-reports.md](moderation-reports.md)
