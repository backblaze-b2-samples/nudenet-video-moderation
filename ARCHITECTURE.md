<!-- last_verified: 2026-06-30 -->
# Architecture

## Components

- **apps/web/** — Next.js 16 frontend (App Router, Tailwind v4, shadcn/ui)
  - Moderation dashboard (scan stats, activity chart, recent scans)
  - New Scan: video dropzone + run the pipeline
  - Review Queue: per-video reports (sample-scoped over `moderation/reports/`)
  - Report detail: detection table, flagged-frame grid, decision + re-run + delete
  - Bucket explorer (`/files`): full-bucket browser with preview/download/delete
  - Dark mode via `next-themes`
- **services/api/** — FastAPI backend (layered architecture)
  - Moderation pipeline: frame sampling (ffmpeg) → NudeNet classification →
    flagged-frame extracts + report JSON + manifest, all on B2
  - B2 S3 integration via boto3
  - Health check endpoint with B2 connectivity verification
  - Structured JSON logging with request tracing; Prometheus-format `/metrics`
- **packages/shared/** — TypeScript type definitions mirroring the Pydantic models

## The moderation pipeline

NudeNet is a **local ONNX detector** — no external API, no second key. The model
ships in the `nudenet` wheel and ffmpeg ships in `imageio-ffmpeg`, so the
pipeline runs from a fresh clone, offline, on CPU by default.

```
ingest (POST /moderation/jobs)
  -> put raw video to B2 (uploads/raw/<video_id>/)
  -> sample frames with bundled ffmpeg (fps | keyframes)
  -> classify each frame with NudeNet (lazy process-wide singleton)
  -> select violations (score >= threshold AND class in VIOLATION_LABELS)
  -> upload flagged-frame JPEGs (moderation/flagged/<video_id>/frames/)
  -> write report JSON (moderation/reports/<video_id>.json)
  -> append manifest line (moderation/manifest.jsonl, read-modify-write)
```

Heavy ML imports are **lazy** (inside functions) so structure / no-network tests
import the modules without loading the model.

## Backend Layering

```
types/     Pydantic models — no logic, no imports from other layers
config/    Settings (pydantic-settings)
repo/      Data access (boto3 B2 client) — no business logic
service/   Business logic (frames, classifier, moderation, moderation_store, files)
runtime/   FastAPI routes — calls service, never repo directly
```

### Layering Rules

1. Dependencies flow downward only: `types` → `config` → `repo` → `service` → `runtime`
2. No backward imports
3. `boto3` only allowed in `repo/`
4. All boundary data uses Pydantic models
5. Each file stays under 300 lines (enforced by `tests/test_structure.py`)

### Directory Structure

```
services/api/
  main.py                  App entrypoint, middleware, router registration
  app/
    types/                 Pydantic models (moderation, files, stats, errors, formatting)
    config/                Settings loaded from environment
    repo/                  B2 S3 client (data access layer)
    service/               frames, classifier, moderation, moderation_store, files, metadata
    runtime/               FastAPI route handlers (moderation, files, health, metrics)
  tests/                   pytest tests (structural + integration, offline)
```

## Boundary Invariants

- **No external SDK leakage**: `boto3` only in `app/repo/`. NudeNet / onnxruntime
  / cv2 / imageio-ffmpeg are imported lazily inside `service/` functions.
- **No raw dicts at boundaries**: typed Pydantic models everywhere.
- **Validated inputs**: HTTP inputs validated by FastAPI/Pydantic; object keys
  validated against path-traversal.

## Deployment

- **Local dev** — `pnpm dev` runs both services via `concurrently`
  (web `:3000`, api `:8000`). Default execution provider is CPU.
- **Railway** — two services from the same repo; see `infra/railway/README.md`.

## Data Stores

- **Backblaze B2** — object storage (S3-compatible API). No application database;
  the JSONL manifest on B2 is the index for the dashboard + queue.

## Trust Boundaries

See [docs/SECURITY.md](docs/SECURITY.md).

- **Frontend → API** — CORS-restricted; `CORSMiddleware` is registered LAST in
  `main.py` (outermost) so it wraps every response, including uncaught-exception
  500s.
- **API → B2** — authenticated via application keys, signature v4, region passed
  explicitly. Custom user agent `b2-nudenet-video-moderation`.
- **Client → B2** — presigned URLs for inline preview of flagged frames + report
  JSON, and for downloads.

## Data Flows

- **Scan**: Browser → `POST /moderation/jobs` (multipart) → ingest → pipeline → report
- **Queue**: Browser → `GET /moderation/reports` → read manifest (one GET)
- **Detail**: Browser → `GET /moderation/reports/{video_id}` → full report JSON
- **Decision**: Browser → `PATCH /moderation/reports/{video_id}` → update + manifest
- **Re-run**: Browser → `POST /moderation/reports/{video_id}/rerun`
- **Delete**: Browser → `DELETE /moderation/reports/{video_id}` (scoped to prefix)

## Observability

- Structured JSON logging with `request_id`; request timing middleware (also the
  catch-all converting uncaught exceptions to a typed JSON 500).
- `/metrics` (Prometheus format) and `/health` (B2 connectivity).

## Canonical Files

- Pipeline orchestration: `services/api/app/service/moderation.py`
- B2 read/write for reports + manifest: `services/api/app/service/moderation_store.py`
- Frame sampling: `services/api/app/service/frames.py`
- NudeNet wrapper: `services/api/app/service/classifier.py`
- B2 data access (repo): `services/api/app/repo/b2_client.py`
- Routes: `services/api/app/runtime/moderation.py`
- Config: `services/api/app/config/settings.py`
- Shared TS types: `packages/shared/src/types.ts`

## Core Features

- [Moderation Overview](docs/features/moderation-overview.md)
- [Video Ingest](docs/features/video-ingest.md)
- [Frame Sampling](docs/features/frame-sampling.md)
- [NSFW Classification](docs/features/nsfw-classification.md)
- [Moderation Reports](docs/features/moderation-reports.md)
- [Review Queue](docs/features/review-queue.md)
- [Bucket Explorer](docs/features/bucket-explorer.md)

## References

- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/RELIABILITY.md](docs/RELIABILITY.md)
- [AGENTS.md](AGENTS.md)
