<!-- last_verified: 2026-06-30 -->
# Feature: Moderation Overview (Dashboard)

## Purpose
Give a T&S operator an at-a-glance view of moderation activity: how many videos
were scanned, how many were flagged, how many await review, and the daily scan
trend.

## Used By
- UI: `/` (Dashboard)
- API: `GET /moderation/stats`, `GET /moderation/stats/activity?days=`

## Core Functions
- `app/service/moderation_store.py::get_stats`
- `app/service/moderation_store.py::get_activity`

## Canonical Files
- Stats cards: `apps/web/src/components/dashboard/stats-cards.tsx`
- Activity chart: `apps/web/src/components/dashboard/scan-activity-chart.tsx`
- Recent scans: `apps/web/src/components/dashboard/recent-scans-table.tsx`

## Inputs
- days: int (query, default 7) for the activity chart

## Outputs
- `ModerationStats` (total/flagged/clean/pending/total flagged frames/scans today)
- `DailyScanCount[]` for the chart

## Flow
- Read the aggregated manifest (one GET) → derive counts.
- Cards + chart + recent table all render from manifest entries.

## Edge Cases
- Empty manifest → all zeros, empty states shown (not an error).
- Manifest read fails → inline error state with retry.

## UX States
- Empty: "No scans yet" with a link to New Scan.
- Loading: skeletons.
- Error: inline ErrorState with retry.

## Verification
- Test files: `services/api/tests/test_moderation.py`
- Quick verify command: `pnpm test:api`
- Pass criteria: stats derive correctly from a deduped manifest.

## Related Docs
- [README.md](../../README.md)
- [docs/features/review-queue.md](review-queue.md)
