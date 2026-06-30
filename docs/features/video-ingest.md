<!-- last_verified: 2026-06-30 -->
# Feature: Video Ingest

## Purpose
Accept a user-generated video, store the raw file on B2, and kick off the
moderation pipeline in one request.

## Used By
- UI: `/jobs/new` (New Scan form)
- API: `POST /moderation/jobs` (multipart)

## Core Functions
- `app/service/moderation.py::ingest_and_run`
- `app/repo/b2_client.py::upload_file`

## Canonical Files
- Form: `apps/web/src/components/moderation/new-scan-form.tsx`
- Dropzone: `apps/web/src/components/moderation/video-dropzone.tsx`

## Inputs
- file: UploadFile (video MIME types only)
- sample_mode: "fps" | "keyframes" (form, optional → server default)
- sample_fps: float (form, optional)
- threshold: float (form, optional)
- violation_labels: comma-separated string (form, optional)

## Outputs
- Raw video written to `uploads/raw/<video_id>/<file>`
- A `ModerationReport` (the pipeline runs synchronously and returns the report)

## Flow
- Validate content type (video only) and size.
- `put_object` the raw video under `uploads/raw/<video_id>/`.
- Run the pipeline (see frame-sampling, nsfw-classification, moderation-reports).

## Edge Cases
- Non-video MIME → 415.
- Empty file → 400.
- Oversized → 413.

## UX States
- Upload progress bar, then "Running NudeNet classification…" while the scan runs.
- On success, redirect to the report detail page.

## Verification
- Test files: `services/api/tests/test_error_handling.py`
- Quick verify command: `pnpm test:api`
- Pass criteria: non-video and empty uploads are rejected before any pipeline work.

## Related Docs
- [docs/features/frame-sampling.md](frame-sampling.md)
- [docs/features/nsfw-classification.md](nsfw-classification.md)
