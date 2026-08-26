# Operations and Troubleshooting

## Standard checks

Before every deployment:

```bash
pnpm install
pnpm migrate
pnpm build
git diff --check
```

Run migrations only after confirming the selected `.env` targets the intended environment.

## Verifying a submission

A healthy final submission has:

- `status = 'submitted'`
- A non-null `submitted_at`
- `applicant_name` and `contact_email` matching the JSONB answers
- No raw edit token in the row

Do not inspect production answers casually. Use a dedicated test application and remove it according to the data-retention procedure.

## Common problems

### `pnpm dev` returns 404 for `/api/*`

Vite does not emulate Vercel Functions. Use `vercel dev` or a Preview deployment.

### `DATABASE_URL is not configured`

Confirm `.env` exists locally or that `DATABASE_URL` is enabled for the correct Vercel environment. Do not print the value to logs.

### Migration checksum mismatch

An applied migration was edited. Restore the original file and create a new migration for the intended change.

### `pnpm` reports an unexpected store location

Use the same pnpm installation and store used for the existing `node_modules`, or reinstall dependencies cleanly. Do not commit `.pnpm-store/` or `node_modules/`.

### GitHub push authentication fails

Use a personal SSH key or a repository deploy key with write access. Keep the private key outside Git and verify `.gitignore` before staging.

## Observability

Track at minimum:

- Function error rate and latency
- Database connection/query failures
- Draft creation and successful submission counts
- Upload failures and rejected file sizes
- Admin exports and status changes

Operational metrics should use submission IDs and status values, not names, emails, answers, or tokens.

## Incident response

For a suspected credential leak:

1. Rotate the credential at the provider.
2. Update Vercel and local secret stores.
3. redeploy functions if required.
4. Review database and deployment logs.
5. Invalidate affected sessions or tokens.
6. Document impact and prevention work without copying the secret.

For accidental data exposure, restrict access first, preserve audit evidence, identify affected records, and follow the applicable notification process.
