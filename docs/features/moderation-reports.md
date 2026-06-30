<!-- last_verified: 2026-06-30 -->
# Feature: Moderation Reports + Flagged Extracts

## Purpose
For each scanned video, decide which frames are violations, persist flagged-frame
extracts and a per-video report JSON to B2, and append an entry to the aggregated
manifest. The moderation report is the app's **primary entity**.

## Used By
- UI: `/jobs/[videoId]` (detail), `/jobs` (queue), `/` (dashboard)
- API: `GET /moderation/reports/{video_id}`, `POST /moderation/jobs`,
  `POST /moderation/reports/{video_id}/rerun`, `DELETE /moderation/reports/{video_id}`

## Core Functions
- `app/service/moderation.py::run_pipeline`, `rerun`, `delete_report`
- `app/service/moderation_store.py::write_report`, `append_manifest`, `read_manifest`

## Canonical Files
- `services/api/app/service/moderation.py`
- `services/api/app/service/moderation_store.py`
- `apps/web/src/components/moderation/report-detail.tsx`

## Violation policy
A frame is flagged when a detection scores ≥ threshold AND its class is in
`VIOLATION_LABELS` (env-configurable; default = the genuinely-NSFW exposed
classes). All other detected classes are recorded for transparency but never
flag a frame.

## Outputs (B2 objects)
- `moderation/flagged/<video_id>/frames/frame_NNNNNN.jpg` — flagged-frame JPEGs
- `moderation/reports/<video_id>.json` — full report (frames, detections, decision)
- `moderation/manifest.jsonl` — one line per report (read-modify-write append)

## Lifecycle (primary entity)
- create: `POST /moderation/jobs`
- read: `GET /moderation/reports`, `GET /moderation/reports/{video_id}`
- edit: `PATCH /moderation/reports/{video_id}` (decision + notes, optional
  threshold re-evaluation against cached detections)
- run: `POST /moderation/reports/{video_id}/rerun`
- delete: `DELETE /moderation/reports/{video_id}` (scoped to the video_id prefix)

## Edge Cases
- Re-run when the source video is gone → 410.
- Threshold re-evaluation recomputes verdict from cached detections (no re-classify).
- Delete removes report + flagged crops + raw video under the video's prefix.

## Verification
- Test files: `services/api/tests/test_moderation.py`
- Quick verify command: `pnpm test:api`
- Pass criteria: manifest roundtrip + dedupe; threshold re-eval flips verdict.

## Related Docs
- [docs/features/review-queue.md](review-queue.md)
