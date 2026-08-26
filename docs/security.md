# Security and Privacy

The form collects personal information, project history, recommendation contacts, and video. Treat all submission data as private.

## Secrets

- `.env` is local-only and ignored by Git.
- Commit `.env.example` with placeholder values only.
- Never expose database variables through `VITE_*` names.
- Never paste production credentials into issues, commits, screenshots, logs, or documentation.
- Rotate a credential immediately after accidental disclosure.
- Use the Neon owner role only for migrations; create narrower roles as the system matures.

## Applicant authorization

The edit token is equivalent to a password for one draft:

- Generate it with a cryptographically secure random source.
- Store only its hash in the database.
- Send it only over HTTPS.
- Never include it in analytics or server logs.
- Expire or revoke it after the editing window closes.

`localStorage` is acceptable for the first prototype but does not support cross-device recovery and is exposed to successful XSS. A production recovery flow should email a short-lived, single-use link.

## Admin authorization

- Do not provide public admin registration.
- Use an identity provider and an explicit allowlist or role table.
- Check the admin role in every `/api/admin/*` function.
- Frontend route hiding is not authorization.
- Require re-authentication or an elevated permission for bulk export.
- Record admin reads, exports, notes, and status changes in `audit_logs`.

## Input and API protection

- Validate request bodies on the server, regardless of frontend validation.
- Enforce maximum lengths and accepted enum values.
- Reject unsupported content types and oversized bodies.
- Rate-limit draft creation and submission endpoints.
- Add bot protection before opening the public form broadly.
- Return generic client errors and keep detailed errors in restricted logs.
- Do not log complete answers, contact details, tokens, or connection strings.

## File security

- Use private object storage.
- Validate MIME type, extension, and size server-side.
- Consider malware scanning before Admin download.
- Generate short-lived signed download URLs.
- Do not trust the original filename as a storage path.
- Store a generated object key and keep the original name as metadata.

## Data lifecycle

Define and publish:

- Who can access applications
- How long rejected and withdrawn applications are retained
- When uploaded video is deleted
- How an applicant requests correction or deletion
- How backups follow the same retention policy

Collect only information the selection process actually needs.
