"""Moderation pipeline orchestration.

ingest -> sample frames (ffmpeg) -> classify each (NudeNet) -> select
violations -> crop + upload flagged frames -> write report JSON -> append
aggregated manifest. Also: set-decision / re-run / delete.

Persistence + read-side queries live in `moderation_store`. B2 object layout:
  uploads/raw/<video_id>/<filename>            raw ingested video
  moderation/flagged/<video_id>/frames/*.jpg   flagged frame crops
  moderation/reports/<video_id>.json           per-video report
  moderation/manifest.jsonl                     aggregated index
"""

import logging
import re
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.config import settings
from app.repo import delete_file, get_object_bytes, list_keys, upload_file
from app.service import classifier, frames
from app.service.moderation_store import (
    FLAGGED_PREFIX,
    RAW_PREFIX,
    ModerationError,
    append_manifest,
    get_activity,
    get_report,
    get_stats,
    list_reports,
    validate_video_id,
    write_report,
)
from app.types import (
    FrameDetection,
    FrameResult,
    ModerationReport,
    ReviewDecision,
    ReviewUpdate,
)

logger = logging.getLogger(__name__)

# Re-exported so the runtime layer imports everything moderation-related from
# this module (the public service surface).
__all__ = [
    "ModerationError",
    "delete_report",
    "get_activity",
    "get_report",
    "get_stats",
    "ingest_and_run",
    "list_reports",
    "rerun",
    "run_pipeline",
    "set_review_decision",
]

ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
    "video/mpeg",
    "video/x-msvideo",
}


def _sanitize_filename(filename: str) -> str:
    name = filename.replace("\\", "/").split("/")[-1].replace("\x00", "")
    name = re.sub(r"[^\w\-.]", "_", name)
    name = re.sub(r"_{2,}", "_", name)
    return name.lstrip("._").strip() or "video.mp4"


# Internal alias kept for tests that reference the older private name.
_validate_video_id = validate_video_id


# --- pipeline ---------------------------------------------------------------


def run_pipeline(
    *,
    file_data: bytes,
    filename: str,
    threshold: float,
    sample_mode: str,
    sample_fps: float,
    violation_labels: set[str],
    video_id: str | None = None,
    source_key: str | None = None,
) -> ModerationReport:
    """Run the full moderation pipeline on a video and persist the report."""
    if sample_mode not in ("fps", "keyframes"):
        raise ModerationError("sample_mode must be 'fps' or 'keyframes'")

    safe_name = _sanitize_filename(filename)
    vid = video_id or uuid.uuid4().hex[:16]
    src_key = source_key or f"{RAW_PREFIX}{vid}/{safe_name}"

    now = datetime.now(UTC)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        video_path = tmp_dir / safe_name
        video_path.write_bytes(file_data)

        sampled = frames.extract_frames(
            video_path,
            tmp_dir / "frames",
            sample_mode=sample_mode,
            sample_fps=sample_fps,
        )

        frame_results, flagged_count = _classify_frames(
            sampled, threshold, violation_labels, vid
        )

    report = ModerationReport(
        video_id=vid,
        filename=safe_name,
        source_key=src_key,
        verdict="flagged" if flagged_count else "clean",
        frames_analyzed=len(sampled),
        flagged_frame_count=flagged_count,
        threshold=threshold,
        sample_mode=sample_mode,
        sample_fps=sample_fps,
        violation_labels=sorted(violation_labels),
        frames=frame_results,
        review_decision=ReviewDecision.pending,
        review_notes="",
        created_at=now,
        updated_at=now,
    )
    write_report(report)
    append_manifest(report)
    return report


def _classify_frames(
    sampled, threshold: float, violation_labels: set[str], vid: str
) -> tuple[list[FrameResult], int]:
    frame_results: list[FrameResult] = []
    flagged_count = 0
    for sf in sampled:
        detections = classifier.classify_frame(sf.path, threshold)
        det_models: list[FrameDetection] = []
        frame_violation = False
        for d in detections:
            is_violation = d.label.upper() in violation_labels
            frame_violation = frame_violation or is_violation
            det_models.append(
                FrameDetection(
                    label=d.label,
                    score=round(d.score, 4),
                    box=d.box,
                    is_violation=is_violation,
                )
            )

        flagged_key = None
        if frame_violation:
            flagged_count += 1
            # Persist the full flagged frame so the reviewer sees context.
            flagged_key = f"{FLAGGED_PREFIX}{vid}/frames/frame_{sf.index:06d}.jpg"
            upload_file(sf.path.read_bytes(), flagged_key, "image/jpeg")

        frame_results.append(
            FrameResult(
                index=sf.index,
                timestamp_seconds=round(sf.timestamp_seconds, 3),
                detections=det_models,
                flagged_key=flagged_key,
                flagged=frame_violation,
            )
        )
    return frame_results, flagged_count


def ingest_and_run(
    *,
    file_data: bytes,
    filename: str,
    content_type: str,
    threshold: float | None = None,
    sample_mode: str | None = None,
    sample_fps: float | None = None,
    violation_labels: set[str] | None = None,
) -> ModerationReport:
    """Validate + store the raw video, then run the pipeline."""
    if content_type not in ALLOWED_VIDEO_TYPES:
        raise ModerationError(
            f"Unsupported video type '{content_type}'", status_code=415
        )
    if len(file_data) == 0:
        raise ModerationError("Empty file", status_code=400)
    if len(file_data) > settings.max_video_size:
        raise ModerationError("Video too large", status_code=413)

    safe_name = _sanitize_filename(filename)
    vid = uuid.uuid4().hex[:16]
    src_key = f"{RAW_PREFIX}{vid}/{safe_name}"
    upload_file(file_data, src_key, content_type)

    return run_pipeline(
        file_data=file_data,
        filename=safe_name,
        threshold=threshold if threshold is not None else settings.moderation_threshold,
        sample_mode=sample_mode or settings.sample_mode,
        sample_fps=sample_fps if sample_fps is not None else settings.sample_fps,
        violation_labels=violation_labels or settings.violation_label_set,
        video_id=vid,
        source_key=src_key,
    )


def rerun(video_id: str, *, threshold: float | None = None) -> ModerationReport:
    """Re-extract + re-classify an existing report's source video."""
    validate_video_id(video_id)
    existing = get_report(video_id)
    if existing is None:
        raise ModerationError("Report not found", status_code=404)
    raw = get_object_bytes(existing.source_key)
    if raw is None:
        raise ModerationError("Source video no longer available in B2", status_code=410)
    _delete_flagged_artifacts(video_id)
    report = run_pipeline(
        file_data=raw,
        filename=existing.filename,
        threshold=threshold if threshold is not None else existing.threshold,
        sample_mode=existing.sample_mode,
        sample_fps=existing.sample_fps,
        violation_labels=set(existing.violation_labels) or settings.violation_label_set,
        video_id=video_id,
        source_key=existing.source_key,
    )
    # Preserve the human decision across a re-run.
    report.review_decision = existing.review_decision
    report.review_notes = existing.review_notes
    write_report(report)
    append_manifest(report)
    return report


def set_review_decision(video_id: str, update: ReviewUpdate) -> ModerationReport:
    """Set the human review decision; optionally re-evaluate the threshold
    against the report's cached detections (no re-classification)."""
    validate_video_id(video_id)
    report = get_report(video_id)
    if report is None:
        raise ModerationError("Report not found", status_code=404)

    report.review_decision = update.review_decision
    report.review_notes = update.review_notes
    if update.threshold is not None:
        report = _reevaluate_threshold(report, update.threshold)
    report.updated_at = datetime.now(UTC)
    write_report(report)
    append_manifest(report)
    return report


def _reevaluate_threshold(report: ModerationReport, threshold: float) -> ModerationReport:
    """Recompute violations from cached detections at a new threshold without
    re-running the model. Crops are not regenerated (detections are unchanged)."""
    violation_set = set(report.violation_labels)
    flagged = 0
    for fr in report.frames:
        frame_violation = False
        for d in fr.detections:
            d.is_violation = d.label.upper() in violation_set and d.score >= threshold
            frame_violation = frame_violation or d.is_violation
        fr.flagged = frame_violation
        if frame_violation:
            flagged += 1
    report.threshold = threshold
    report.flagged_frame_count = flagged
    report.verdict = "flagged" if flagged else "clean"
    return report


# --- delete -----------------------------------------------------------------


def delete_report(video_id: str) -> None:
    """Delete the report + its flagged-frame artifacts + raw source, scoped to
    the video_id prefix."""
    validate_video_id(video_id)
    delete_file(f"moderation/reports/{video_id}.json")
    _delete_flagged_artifacts(video_id)
    for key in list_keys(f"{RAW_PREFIX}{video_id}/"):
        delete_file(key)


def _delete_flagged_artifacts(video_id: str) -> None:
    for key in list_keys(f"{FLAGGED_PREFIX}{video_id}/"):
        delete_file(key)
