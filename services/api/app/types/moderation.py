from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class ReviewDecision(StrEnum):
    """Human-in-the-loop verdict for a moderation report."""

    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    escalated = "escalated"


class FrameDetection(BaseModel):
    """A single NudeNet detection on one sampled frame."""

    label: str
    score: float
    # [x, y, w, h] in pixels, as returned by NudeNet.
    box: list[int]
    # True when this detection's label is in the configured VIOLATION_LABELS
    # AND its score is >= the threshold used for the scan.
    is_violation: bool


class FrameResult(BaseModel):
    """All detections for one sampled frame."""

    index: int
    # Approximate timestamp of the frame within the video, in seconds.
    timestamp_seconds: float
    detections: list[FrameDetection] = Field(default_factory=list)
    # Object key of the flagged crop written to B2, if this frame was flagged.
    flagged_key: str | None = None
    flagged: bool = False


class ModerationReport(BaseModel):
    """The primary entity: one moderation report per ingested video."""

    video_id: str
    filename: str
    # Object key of the raw uploaded video in B2.
    source_key: str
    # "clean" | "flagged" — derived from whether any frame was flagged.
    verdict: str
    frames_analyzed: int
    flagged_frame_count: int
    threshold: float
    sample_mode: str
    sample_fps: float
    violation_labels: list[str]
    frames: list[FrameResult] = Field(default_factory=list)
    review_decision: ReviewDecision = ReviewDecision.pending
    review_notes: str = ""
    created_at: datetime
    updated_at: datetime


class ManifestEntry(BaseModel):
    """One line in moderation/manifest.jsonl — the cheap data source for the
    dashboard and review queue (one GET instead of N report reads)."""

    video_id: str
    filename: str
    verdict: str
    frames_analyzed: int
    flagged_frame_count: int
    review_decision: ReviewDecision
    created_at: datetime
    updated_at: datetime


class ModerationStats(BaseModel):
    total_reports: int
    flagged_reports: int
    clean_reports: int
    pending_review: int
    total_flagged_frames: int
    scans_today: int


class DailyScanCount(BaseModel):
    date: str
    scans: int


class ReviewUpdate(BaseModel):
    """PATCH body for setting the human review decision."""

    review_decision: ReviewDecision
    review_notes: str = ""
    # Optional threshold re-evaluation against cached detections.
    threshold: float | None = None
