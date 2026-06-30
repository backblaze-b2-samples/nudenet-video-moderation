"""Frame sampling from a video using the imageio-ffmpeg bundled static binary.

The ffmpeg binary ships inside the `imageio-ffmpeg` wheel, so frame extraction
works from a fresh clone with no system ffmpeg installed. Heavy imports are kept
inside the functions so that structure / no-network tests import this module
without pulling ffmpeg.
"""

import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class SampledFrame:
    index: int
    path: Path
    timestamp_seconds: float


def _ffmpeg_exe() -> str:
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def _probe_duration(video_path: Path) -> float:
    """Best-effort video duration in seconds via ffmpeg stderr parsing.

    ffmpeg prints `Duration: HH:MM:SS.xx` on stderr. We don't ship ffprobe, so
    parse it from ffmpeg's banner. Returns 0.0 if it can't be determined.
    """
    try:
        proc = subprocess.run(
            [_ffmpeg_exe(), "-i", str(video_path)],
            capture_output=True,
            text=True,
            check=False,
        )
    except Exception:
        logger.warning("ffmpeg duration probe failed", exc_info=True)
        return 0.0
    for line in proc.stderr.splitlines():
        line = line.strip()
        if line.startswith("Duration:"):
            try:
                stamp = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = stamp.split(":")
                return int(h) * 3600 + int(m) * 60 + float(s)
            except (ValueError, IndexError):
                return 0.0
    return 0.0


def extract_frames(
    video_path: Path,
    out_dir: Path,
    *,
    sample_mode: str = "fps",
    sample_fps: float = 1.0,
) -> list[SampledFrame]:
    """Extract frames to `out_dir` as JPEGs. Returns the sampled frames.

    sample_mode:
      - "fps": uniform sampling at `sample_fps` frames per second.
      - "keyframes": keyframes only (`-skip_frame nokey`), much sparser.

    Raises RuntimeError if ffmpeg fails or produces no frames.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    pattern = str(out_dir / "frame_%06d.jpg")
    ffmpeg = _ffmpeg_exe()

    if sample_mode == "keyframes":
        cmd = [
            ffmpeg, "-hide_banner", "-loglevel", "error",
            "-skip_frame", "nokey",
            "-i", str(video_path),
            "-vsync", "0",
            "-q:v", "3",
            pattern,
        ]
        # Keyframe spacing varies; we don't know exact timestamps without a
        # frame-accurate probe, so approximate them after the fact.
        effective_fps = max(sample_fps, 0.001)
    else:
        effective_fps = max(sample_fps, 0.001)
        cmd = [
            ffmpeg, "-hide_banner", "-loglevel", "error",
            "-i", str(video_path),
            "-vf", f"fps={effective_fps}",
            "-q:v", "3",
            pattern,
        ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    except FileNotFoundError as e:
        raise RuntimeError("Bundled ffmpeg binary not found") from e
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg frame extraction failed: {proc.stderr.strip()}")

    frame_files = sorted(out_dir.glob("frame_*.jpg"))
    if not frame_files:
        raise RuntimeError(
            "No frames extracted — the file may not be a decodable video"
        )

    duration = _probe_duration(video_path)
    frames: list[SampledFrame] = []
    for i, fpath in enumerate(frame_files):
        if sample_mode == "keyframes" and duration > 0:
            ts = duration * i / max(len(frame_files) - 1, 1)
        else:
            ts = i / effective_fps
        frames.append(SampledFrame(index=i, path=fpath, timestamp_seconds=ts))
    return frames
