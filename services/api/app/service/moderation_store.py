"""Persistence + read-side helpers for moderation reports on B2.

Object layout (S3-compatible API only):
  moderation/reports/<video_id>.json   per-video report
  moderation/manifest.jsonl            aggregated index (cheap read source)
"""

import json
import logging
import re
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from app.repo import get_object_bytes, upload_file
from app.types import (
    DailyScanCount,
    ManifestEntry,
    ModerationReport,
    ModerationStats,
    ReviewDecision,
)

logger = logging.getLogger(__name__)

MANIFEST_KEY = "moderation/manifest.jsonl"
REPORTS_PREFIX = "moderation/reports/"
FLAGGED_PREFIX = "moderation/flagged/"
RAW_PREFIX = "uploads/raw/"

_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]+$")


class ModerationError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def validate_video_id(video_id: str) -> None:
    if not video_id or not _VIDEO_ID_RE.match(video_id):
        raise ModerationError("Invalid video id", status_code=400)


# --- report persistence -----------------------------------------------------


def write_report(report: ModerationReport) -> None:
    key = f"{REPORTS_PREFIX}{report.video_id}.json"
    body = report.model_dump_json(indent=2).encode("utf-8")
    upload_file(body, key, "application/json")


def get_report(video_id: str) -> ModerationReport | None:
    validate_video_id(video_id)
    raw = get_object_bytes(f"{REPORTS_PREFIX}{video_id}.json")
    if raw is None:
        return None
    return ModerationReport.model_validate_json(raw)


# --- manifest ---------------------------------------------------------------


def append_manifest(report: ModerationReport) -> None:
    """Append an entry to the manifest. S3 has no append: read-modify-write.

    NOTE (production caveat): not concurrency-safe under parallel jobs. Fine for
    the sample; a real deployment would use a DB or per-shard manifests.
    """
    entry = ManifestEntry(
        video_id=report.video_id,
        filename=report.filename,
        verdict=report.verdict,
        frames_analyzed=report.frames_analyzed,
        flagged_frame_count=report.flagged_frame_count,
        review_decision=report.review_decision,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )
    existing = get_object_bytes(MANIFEST_KEY) or b""
    line = entry.model_dump_json().encode("utf-8")
    upload_file(existing + line + b"\n", MANIFEST_KEY, "application/x-ndjson")


def read_manifest() -> list[ManifestEntry]:
    raw = get_object_bytes(MANIFEST_KEY)
    if not raw:
        return []
    entries: list[ManifestEntry] = []
    for line in raw.decode("utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entries.append(ManifestEntry.model_validate(json.loads(line)))
        except (ValueError, TypeError):
            logger.warning("Skipping malformed manifest line")
    return entries


# --- read-side queries ------------------------------------------------------


def list_reports(limit: int = 100) -> list[ManifestEntry]:
    """List reports from the manifest, newest first. Dedupes by video_id,
    keeping the latest line for each. One GET."""
    by_id: dict[str, ManifestEntry] = {}
    for e in read_manifest():
        by_id[e.video_id] = e
    deduped = sorted(by_id.values(), key=lambda e: e.updated_at, reverse=True)
    return deduped[:limit]


def get_stats() -> ModerationStats:
    entries = list_reports(limit=100000)
    today = datetime.now(UTC).date()
    flagged = sum(1 for e in entries if e.verdict == "flagged")
    pending = sum(1 for e in entries if e.review_decision == ReviewDecision.pending)
    return ModerationStats(
        total_reports=len(entries),
        flagged_reports=flagged,
        clean_reports=len(entries) - flagged,
        pending_review=pending,
        total_flagged_frames=sum(e.flagged_frame_count for e in entries),
        scans_today=sum(1 for e in entries if e.created_at.date() == today),
    )


def get_activity(days: int = 7) -> list[DailyScanCount]:
    entries = list_reports(limit=100000)
    today = datetime.now(UTC).date()
    cutoff = today - timedelta(days=days - 1)
    counts: dict[str, int] = defaultdict(int)
    for e in entries:
        d = e.created_at.date()
        if d >= cutoff:
            counts[d.isoformat()] += 1
    return [
        DailyScanCount(
            date=(cutoff + timedelta(days=i)).isoformat(),
            scans=counts.get((cutoff + timedelta(days=i)).isoformat(), 0),
        )
        for i in range(days)
    ]
