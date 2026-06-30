<!-- last_verified: 2026-06-30 -->
# App Workflows

User journeys inside the application.

## Run a Scan (create)

- User navigates to `/jobs/new`
- Drops or selects a video in the dropzone (video MIME types, up to 500MB)
- Chooses sampling (`Select`: 1 fps / Every 2 seconds / Keyframes only) and a
  detection threshold (number input, suggested default 0.25)
- Optionally overrides the violation labels (advanced multi-select)
- Submits: the video uploads to B2, then the pipeline runs synchronously
- On success: toast + redirect to the report detail at `/jobs/<video_id>`
- See: [Video Ingest](features/video-ingest.md)

## Review Queue (read list)

- User navigates to `/jobs`
- The queue lists every report under `moderation/reports/` (powered by the
  manifest — one GET), newest first
- Each row: video, verdict badge, decision badge, flagged-frame count, frames
  analyzed, scan time
- Click a row to open the report detail
- Empty: "No reports yet" with a New Scan link
- See: [Review Queue](features/review-queue.md)

## Report Detail (read + edit + run + delete)

- User navigates to `/jobs/<video_id>`
- Header shows verdict + decision badges and the video_id
- **Flagged-frame grid**: presigned thumbnails of each flagged crop (empty for a
  clean clip)
- **Detection table**: every detection with frame, timestamp, class, score, and
  whether it flags
- **Raw report JSON**: the full report object
- **Review decision** (edit): a `RadioGroup` pre-filled with the current decision
  (Pending / Approved / Rejected / Escalated) + a notes `Textarea`; Save persists
- **Re-run** (run): re-extract + re-classify the source video
- **Delete**: removes the report, flagged crops, and raw video (scoped to the
  video's prefix)
- See: [Moderation Reports](features/moderation-reports.md)

## View Dashboard

- User navigates to `/`
- Stats cards: videos scanned, flagged videos, pending review, clean videos
- Scan activity chart: last 7 days of scans
- Recent scans table: last 10 reports
- Empty state when no scans exist yet
- See: [Moderation Overview](features/moderation-overview.md)

## Browse the Bucket

- User navigates to `/files`
- Full-bucket tree view across raw uploads and all moderation artifacts
- Hover a row for preview / download / delete; flagged-frame JPEGs render inline
- See: [Bucket Explorer](features/bucket-explorer.md)
