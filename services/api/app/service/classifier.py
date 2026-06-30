"""NudeNet wrapper.

NudeNet is a LOCAL ONNX detector — no external API, no second key. The ONNX
model ships inside the `nudenet` wheel, so the first inference works fully
offline. All heavy imports (nudenet / onnxruntime) are deferred to inside the
functions so that structure / no-network tests can import this module without
loading the model.

Execution provider: NudeNet runs on onnxruntime, not torch. The CUDA -> MPS ->
CPU device rule maps to ONNX execution providers; onnxruntime has no
first-class MPS provider, so the local fallback chain is CUDA -> CPU. CPU is the
shipped default and is plenty fast for the handful of sampled frames per video.
"""

import logging
import threading
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

_detector = None
_detector_lock = threading.Lock()


@dataclass
class Detection:
    label: str
    score: float
    box: list[int]


def _available_providers() -> list[str]:
    """Pick ONNX execution providers, preferring CUDA when present, else CPU.

    Never hard-requires a GPU: CPUExecutionProvider is always appended so a
    machine with no GPU still runs. (onnxruntime exposes no MPS provider, so
    Apple silicon falls through to CPU, which is the documented local default.)
    """
    import onnxruntime as ort

    available = set(ort.get_available_providers())
    chosen: list[str] = []
    if "CUDAExecutionProvider" in available:
        chosen.append("CUDAExecutionProvider")
    chosen.append("CPUExecutionProvider")
    return chosen


def _get_detector():
    """Lazily construct a process-wide NudeDetector singleton."""
    global _detector
    if _detector is not None:
        return _detector
    with _detector_lock:
        if _detector is not None:
            return _detector
        from nudenet import NudeDetector

        providers = _available_providers()
        logger.info("Loading NudeNet detector with providers=%s", providers)
        try:
            _detector = NudeDetector(providers=providers)
        except TypeError:
            # Older/newer NudeNet signatures may not accept `providers`.
            _detector = NudeDetector()
        return _detector


def classify_frame(frame_path: Path, threshold: float) -> list[Detection]:
    """Run NudeNet on one frame and return detections scoring >= threshold.

    Returns ALL detections above the score floor (not just violations) so the
    report can show the full detection table, including non-explicit classes
    (FACE, FEET, BELLY) that demonstrate the detect-but-don't-flag policy.
    """
    detector = _get_detector()
    raw = detector.detect(str(frame_path))
    detections: list[Detection] = []
    for d in raw:
        score = float(d.get("score", 0.0))
        if score < threshold:
            continue
        label = str(d.get("class", "UNKNOWN"))
        box = [int(v) for v in d.get("box", [0, 0, 0, 0])]
        detections.append(Detection(label=label, score=score, box=box))
    return detections


def crop_detection(frame_path: Path, box: list[int]) -> bytes:
    """Crop the detection region from a frame and return JPEG bytes.

    Used to persist flagged-frame extracts to B2. cv2 import is deferred.
    """
    import cv2

    img = cv2.imread(str(frame_path))
    if img is None:
        raise RuntimeError(f"Could not read frame: {frame_path}")
    h, w = img.shape[:2]
    x, y, bw, bh = box
    x0 = max(0, x)
    y0 = max(0, y)
    x1 = min(w, x + bw)
    y1 = min(h, y + bh)
    crop = img if x1 <= x0 or y1 <= y0 else img[y0:y1, x0:x1]
    ok, buf = cv2.imencode(".jpg", crop)
    if not ok:
        raise RuntimeError("Failed to encode flagged crop")
    return buf.tobytes()
