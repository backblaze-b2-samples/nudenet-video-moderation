"""No-network moderation tests.

These exercise the pipeline's pure logic (manifest read/write, threshold
re-evaluation, validation, report serialization) WITHOUT loading the NudeNet
model or invoking ffmpeg. The real model-load + ffmpeg path is covered by the
end-to-end verify, not by the unit suite — keeping `test:api` fast and offline.
"""

from datetime import UTC, datetime

import pytest

from app.service import moderation
from app.service import moderation_store as store
from app.types import (
    FrameDetection,
    FrameResult,
    ManifestEntry,
    ModerationReport,
    ReviewDecision,
    ReviewUpdate,
)


def _report(video_id: str = "vid123", **overrides) -> ModerationReport:
    now = datetime.now(UTC)
    base = dict(
        video_id=video_id,
        filename="clip.mp4",
        source_key=f"uploads/raw/{video_id}/clip.mp4",
        verdict="clean",
        frames_analyzed=2,
        flagged_frame_count=0,
        threshold=0.25,
        sample_mode="fps",
        sample_fps=1.0,
        violation_labels=["FEMALE_BREAST_EXPOSED"],
        frames=[
            FrameResult(
                index=0,
                timestamp_seconds=0.0,
                detections=[
                    FrameDetection(
                        label="FACE_FEMALE", score=0.9, box=[1, 2, 3, 4], is_violation=False
                    ),
                    FrameDetection(
                        label="FEMALE_BREAST_EXPOSED",
                        score=0.4,
                        box=[5, 6, 7, 8],
                        is_violation=False,
                    ),
                ],
            ),
        ],
        created_at=now,
        updated_at=now,
    )
    base.update(overrides)
    return ModerationReport(**base)


def test_validate_video_id_rejects_bad_ids():
    for bad in ["", "../etc", "a/b", "has space", "drop;table"]:
        with pytest.raises(moderation.ModerationError):
            moderation._validate_video_id(bad)
    moderation._validate_video_id("abc123DEF_-")


def test_sanitize_filename_strips_paths_and_unsafe_chars():
    assert moderation._sanitize_filename("../../evil clip.mp4") == "evil_clip.mp4"
    assert moderation._sanitize_filename("a/b/c.webm") == "c.webm"
    assert moderation._sanitize_filename("") == "video.mp4"


def test_reevaluate_threshold_flips_verdict():
    report = _report()
    # At 0.25 the 0.4 breast detection becomes a violation -> flagged.
    out = moderation._reevaluate_threshold(report, 0.25)
    assert out.verdict == "flagged"
    assert out.flagged_frame_count == 1
    assert out.frames[0].flagged is True
    # Raising the threshold above 0.4 clears it again.
    out = moderation._reevaluate_threshold(out, 0.5)
    assert out.verdict == "clean"
    assert out.flagged_frame_count == 0


def test_append_and_read_manifest_roundtrip(monkeypatch):
    backing: dict[str, bytes] = {}

    monkeypatch.setattr(store, "get_object_bytes", backing.get)
    monkeypatch.setattr(
        store, "upload_file", lambda data, key, ct: backing.__setitem__(key, data)
    )

    store.append_manifest(_report("vidA"))
    store.append_manifest(_report("vidB"))
    entries = store.read_manifest()
    assert [e.video_id for e in entries] == ["vidA", "vidB"]
    assert all(isinstance(e, ManifestEntry) for e in entries)


def test_list_reports_dedupes_by_video_id(monkeypatch):
    backing: dict[str, bytes] = {}
    monkeypatch.setattr(store, "get_object_bytes", backing.get)
    monkeypatch.setattr(
        store, "upload_file", lambda data, key, ct: backing.__setitem__(key, data)
    )
    store.append_manifest(_report("dup", verdict="clean"))
    store.append_manifest(_report("dup", verdict="flagged", flagged_frame_count=2))
    reports = store.list_reports()
    assert len(reports) == 1
    assert reports[0].verdict == "flagged"


@pytest.mark.asyncio
async def test_set_review_decision_persists(client, monkeypatch):
    report = _report("vidR")
    monkeypatch.setattr(moderation, "get_report", lambda vid: report)
    written: dict[str, ModerationReport] = {}
    monkeypatch.setattr(moderation, "write_report", lambda r: written.update(report=r))
    monkeypatch.setattr(moderation, "append_manifest", lambda r: None)

    out = moderation.set_review_decision(
        "vidR", ReviewUpdate(review_decision=ReviewDecision.approved, review_notes="ok")
    )
    assert out.review_decision == ReviewDecision.approved
    assert out.review_notes == "ok"
    assert written["report"].review_decision == ReviewDecision.approved


@pytest.mark.asyncio
async def test_get_report_endpoint_404(client, monkeypatch):
    from app.runtime import moderation as moderation_routes

    monkeypatch.setattr(moderation_routes, "get_report", lambda vid: None)
    response = await client.get("/moderation/reports/missing")
    assert response.status_code == 404
