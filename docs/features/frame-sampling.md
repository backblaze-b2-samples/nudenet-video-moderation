<!-- last_verified: 2026-06-30 -->
# Feature: Frame Sampling (ffmpeg)

## Purpose
Pull a manageable set of still frames from a video for classification, using the
ffmpeg binary bundled in the `imageio-ffmpeg` wheel (no system ffmpeg required).

## Used By
- Service: `app/service/moderation.py` (pipeline step)

## Core Functions
- `app/service/frames.py::extract_frames`
- `app/service/frames.py::_ffmpeg_exe` (`imageio_ffmpeg.get_ffmpeg_exe()`)

## Canonical Files
- `services/api/app/service/frames.py`

## Inputs
- video_path: Path
- sample_mode: "fps" (uniform, default 1 fps) | "keyframes" (`-skip_frame nokey`)
- sample_fps: float

## Outputs
- `SampledFrame[]` (index, JPEG path in a temp dir, approximate timestamp)

## Flow
- Resolve the bundled ffmpeg binary.
- "fps": `-vf fps=<n>`. "keyframes": `-skip_frame nokey`.
- Write `frame_%06d.jpg` to a temp dir; estimate per-frame timestamps.

## Edge Cases
- Undecodable file → RuntimeError ("No frames extracted").
- ffmpeg missing → RuntimeError (should not happen — it ships in the wheel).

## Verification
- Covered by the end-to-end run on a synthetic `testsrc` clip (extract → classify
  → report). Unit suite stays offline and does not invoke ffmpeg.
- Pass criteria: a 3-second testsrc clip yields N frames at the chosen rate.

## Related Docs
- [docs/features/nsfw-classification.md](nsfw-classification.md)
