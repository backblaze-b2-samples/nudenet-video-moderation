<!-- last_verified: 2026-06-30 -->
# Feature: Review Queue + Human Decision

## Purpose
A reviewer console over `moderation/reports/`: list every report, open one to see
its detections and flagged frames, and persist a human decision (approve /
reject / escalate) into the report.

## Used By
- UI: `/jobs` (queue), `/jobs/[videoId]` (detail + decision controls)
- API: `GET /moderation/reports?limit=`, `PATCH /moderation/reports/{video_id}`

## Core Functions
- `app/service/moderation_store.py::list_reports`
- `app/service/moderation.py::set_review_decision`

## Canonical Files
- Queue: `apps/web/src/components/moderation/review-queue.tsx`
- Decision form: `apps/web/src/components/moderation/report-actions.tsx`

## Sample-scoped asset explorer
The Review Queue is the sample's asset explorer scoped to `moderation/reports/`
only — distinct from the full bucket explorer at `/files`. It is powered by the
manifest (one GET) rather than N report reads.

## Inputs
- review_decision: pending | approved | rejected | escalated (RadioGroup)
- review_notes: string (Textarea)
- threshold: float (optional — re-evaluate verdict against cached detections)

## Outputs
- Updated report JSON + a new manifest line reflecting the decision.

## Edge Cases
- The edit form opens pre-filled with the report's current decision and notes.
- Patching a missing report → 404.

## UX States
- Empty: "No reports yet" with a New Scan link.
- Loading / Error (inline retry).

## Verification
- Test files: `services/api/tests/test_moderation.py`
- Quick verify command: `pnpm test:api`
- Pass criteria: decision persists and the manifest reflects the latest decision.

## Related Docs
- [docs/features/moderation-reports.md](moderation-reports.md)
