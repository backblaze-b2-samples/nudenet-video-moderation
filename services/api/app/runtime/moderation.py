import logging

from fastapi import APIRouter, Form, HTTPException, Request, UploadFile

from app.config import settings
from app.service.moderation import (
    ModerationError,
    delete_report,
    get_activity,
    get_report,
    get_stats,
    ingest_and_run,
    list_reports,
    rerun,
    set_review_decision,
)
from app.types import (
    DailyScanCount,
    ManifestEntry,
    ModerationReport,
    ModerationStats,
    ReviewUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/moderation")


def _parse_labels(raw: str | None) -> set[str] | None:
    if raw is None or not raw.strip():
        return None
    return {label.strip().upper() for label in raw.split(",") if label.strip()}


@router.post("/jobs", response_model=ModerationReport)
async def create_job(
    request: Request,
    file: UploadFile,
    sample_mode: str | None = Form(default=None),
    sample_fps: float | None = Form(default=None),
    threshold: float | None = Form(default=None),
    violation_labels: str | None = Form(default=None),
):
    content_type = file.content_type or "application/octet-stream"

    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > settings.max_video_size:
            raise HTTPException(status_code=413, detail="Video too large")
        chunks.append(chunk)
    file_data = b"".join(chunks)

    try:
        report = ingest_and_run(
            file_data=file_data,
            filename=file.filename or "video.mp4",
            content_type=content_type,
            threshold=threshold,
            sample_mode=sample_mode,
            sample_fps=sample_fps,
            violation_labels=_parse_labels(violation_labels),
        )
    except ModerationError as e:
        logger.warning("Moderation job rejected: %s", e.detail)
        raise HTTPException(status_code=e.status_code, detail=e.detail) from None

    logger.info(
        "Moderation job done: video_id=%s verdict=%s flagged=%d frames=%d",
        report.video_id,
        report.verdict,
        report.flagged_frame_count,
        report.frames_analyzed,
    )
    return report


@router.get("/reports", response_model=list[ManifestEntry])
async def list_reports_endpoint(limit: int = 100):
    if limit < 1 or limit > 1000:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
    return list_reports(limit=limit)


@router.get("/stats", response_model=ModerationStats)
async def stats_endpoint():
    return get_stats()


@router.get("/stats/activity", response_model=list[DailyScanCount])
async def activity_endpoint(days: int = 7):
    if days < 1 or days > 90:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 90")
    return get_activity(days=days)


@router.get("/reports/{video_id}", response_model=ModerationReport)
async def get_report_endpoint(video_id: str):
    try:
        report = get_report(video_id)
    except ModerationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from None
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/reports/{video_id}", response_model=ModerationReport)
async def patch_report_endpoint(video_id: str, update: ReviewUpdate):
    try:
        return set_review_decision(video_id, update)
    except ModerationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from None


@router.post("/reports/{video_id}/rerun", response_model=ModerationReport)
async def rerun_endpoint(video_id: str, update: ReviewUpdate | None = None):
    threshold = update.threshold if update else None
    try:
        return rerun(video_id, threshold=threshold)
    except ModerationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from None


@router.delete("/reports/{video_id}")
async def delete_report_endpoint(video_id: str):
    try:
        delete_report(video_id)
    except ModerationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from None
    logger.info("Moderation report deleted: video_id=%s", video_id)
    return {"deleted": True, "video_id": video_id}
