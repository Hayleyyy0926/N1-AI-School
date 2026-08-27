# Database and Migrations

## Connection variables

Runtime functions use the pooled Neon connection:

```text
DATABASE_URL
```

Keep an unpooled connection available for operations that require a direct session:

```text
DATABASE_URL_UNPOOLED
```

Never use a `VITE_` prefix for database variables. Vite exposes such variables to browser bundles.

## Current tables

`submissions` stores:

- Identity: `id`, `applicant_name`, `contact_email`
- Form context: `form_version`, `language`
- Workflow: `status`, `created_at`, `updated_at`, `submitted_at`
- Ownership: `edit_token_hash`
- Feishu sync: `feishu_record_id`, `feishu_synced_at`, `feishu_sync_error`
- Flexible form data: `answers JSONB`

`schema_migrations` records the migration filename, checksum, and application time.

## Why JSONB plus indexed columns

Application questions will change over time, so `answers JSONB` avoids a database migration for every copy change. Frequently filtered fields such as name, email, status, and timestamps remain normal columns for predictable Admin queries.

When a field becomes operationally important, promote it to a typed, indexed column while retaining the full answer snapshot in JSONB.

## Running migrations

```bash
pnpm migrate
```

The command reads local variables from `.env`. It executes unapplied files in `migrations/` in filename order and records their checksums.

Expected output on the first run:

```text
applied 0001_create_submissions.sql
database is up to date
```

Expected output on later runs:

```text
skip 0001_create_submissions.sql
database is up to date
```

## Migration rules

1. Never edit an applied migration.
2. Add a new numbered file, such as `0002_add_admin_notes.sql`.
3. Make schema changes backward-compatible with the currently deployed API.
4. Deploy additive schema changes before code that requires them.
5. Remove old columns only after all production code has stopped using them.
6. Test the migration twice; the second run must be a no-op.
7. Back up or branch production data before destructive migrations.

The current runner separates statements with:

```sql
-- statement-breakpoint
```

Use that marker between independently executed statements.

## Status values

Allowed database statuses:

```text
draft
submitted
under_review
shortlisted
interview
accepted
rejected
withdrawn
```

Only authenticated admin code may move an application into review or decision states.

## Admin querying and exports

Admin listing queries should select indexed summary fields first and load the large `answers` payload only for the detail view.

For stable exports, create a versioned SQL view or export mapping such as `admin_submission_export_v1`. CSV generation must preserve UTF-8 and neutralize values beginning with `=`, `+`, `-`, or `@` to prevent spreadsheet formula injection.

For analysts, create a dedicated read-only Postgres role. Never distribute the owner connection string.
