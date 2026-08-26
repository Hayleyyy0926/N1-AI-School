# N1 AI School Engineering Docs

This directory records how the application works today, the decisions behind it, and the practices to follow as it grows.

## Current state

Implemented:

- Bilingual Chinese and English application UI
- Vite production build for Vercel
- Neon Postgres persistence for drafts and submissions
- Versioned, repeatable database migrations
- Hashed edit tokens for applicant-owned drafts

Not implemented yet:

- Admin authentication and authorization
- Admin review and export interface
- Persistent file and video uploads
- Email-based draft recovery
- Rate limiting, audit logs, and retention automation

## Guides

- [Architecture](architecture.md)
- [Database and migrations](database.md)
- [Vercel deployment](deployment.md)
- [Security and privacy](security.md)
- [Operations and troubleshooting](operations.md)

## Core principles

1. A published form version is immutable.
2. Chinese and English are two presentations of one form, not separate forms.
3. Database credentials are server-only.
4. Files go directly to private object storage; large files never pass through a serverless function.
5. Every production schema change is a migration.
6. Admin access is deny-by-default and every export is auditable.
