# Architecture

## System overview

```text
Applicant browser
  -> Vite/React application on Vercel
  -> /api/submissions Vercel Functions
  -> Neon Postgres

Future:
Admin browser
  -> /admin
  -> authenticated /api/admin/* functions
  -> Neon Postgres and private object storage
```

The project intentionally keeps the current frontend lightweight. Vite builds static assets into `dist/`, while files under `api/` are deployed as Vercel Functions.

## Current request flow

1. The applicant fills fields held in React state.
2. **Save draft** calls `POST /api/submissions` for a new application.
3. The API returns an application ID and an edit token.
4. The browser stores those credentials in `localStorage`.
5. Later saves call `PATCH /api/submissions/:id` with `x-edit-token`.
6. Final submission changes the database status to `submitted` and sets `submitted_at`.

Only a SHA-256 hash of the edit token is stored in Postgres. The raw token is returned once to the applicant browser.

## API boundaries

Public endpoints:

```text
POST  /api/submissions
PATCH /api/submissions/:id
```

Public clients must never be allowed to select arbitrary application statuses. The current API accepts only `draft` and `submitted`; review states will belong to authenticated admin endpoints.

Planned admin endpoints:

```text
GET   /api/admin/submissions
GET   /api/admin/submissions/:id
PATCH /api/admin/submissions/:id/status
POST  /api/admin/submissions/:id/notes
GET   /api/admin/exports/csv
```

## Bilingual form design

Maintain one stable field key per question, for example `project1` or a future `primary_project`. Labels and help text may have `zh` and `en` variants, but both languages write to the same answer key.

Do not create separate Chinese and English database schemas. Separate schemas make review, exports, analytics, and form evolution unnecessarily difficult.

## Form versioning

The current database has `form_version` on each submission. Before introducing a visual form builder, add `forms` and `form_versions` tables. A published version should never be edited in place; create a new version and keep old submissions tied to the version they answered.

## Files and video

The current file controls do not persist files. The production design should use private Vercel Blob, S3, or R2 with direct browser uploads:

1. An API issues a short-lived upload authorization.
2. The browser uploads directly to object storage.
3. The API stores only file metadata and the private object key.
4. Admin downloads use short-lived signed URLs after authorization.

This avoids serverless body-size and timeout limits, especially for the two-minute video.
