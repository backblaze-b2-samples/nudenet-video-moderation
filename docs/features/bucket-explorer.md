<!-- last_verified: 2026-06-30 -->
# Feature: Bucket Explorer

## Purpose
Browse and manage **everything** in the B2 bucket — raw uploads and all
moderation artifacts (flagged-frame JPEGs, report JSON, the manifest) — in one
tree view, with inline preview and delete.

## Used By
- UI: `/files`
- API: `GET /files`, `GET /files-by-key/metadata|preview|download`,
  `DELETE /files-by-key`

## Core Functions
- `app/service/files.py::get_files`, `get_preview_url`, `remove_file`
- `app/repo/b2_client.py::list_files`, `get_presigned_url`, `delete_file`

## Canonical Files
- `apps/web/src/components/files/file-browser.tsx`
- `apps/web/src/components/files/file-preview.tsx`

## Inputs
- prefix: string (optional)
- key: string (for per-object operations; path-traversal rejected)

## Outputs
- `FileMetadata[]` for the tree
- Presigned URLs for inline preview (flagged-frame JPEGs render directly)

## Flow
- List bucket objects (paginated), build a folder tree, render newest-first.
- Preview opens a presigned URL; delete confirms then removes a single object.

## Edge Cases
- Empty bucket → empty state.
- Invalid / traversal key → 400 before any S3 call.

## UX States
- Empty / Loading (skeletons) / Error (inline retry).

## Note vs the Review Queue
`/files` browses the ENTIRE bucket. The Review Queue (`/jobs`) is the
sample-scoped explorer over `moderation/reports/` only. Both are intentional and
distinct.

## Verification
- Test files: `services/api/tests/test_file_key_routes.py`, `test_delete.py`
- Quick verify command: `pnpm test:api`
- Pass criteria: reserved key shapes and traversal keys behave correctly.

## Related Docs
- [docs/features/review-queue.md](review-queue.md)
