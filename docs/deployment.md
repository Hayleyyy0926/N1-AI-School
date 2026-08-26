# Vercel Deployment

## Project settings

Use these Vercel settings:

```text
Framework Preset: Vite
Install Command: pnpm install
Build Command: pnpm build
Output Directory: dist
```

The repository root is the project root.

## Environment variables

Required:

```text
DATABASE_URL
```

Recommended for migration and maintenance tooling:

```text
DATABASE_URL_UNPOOLED
```

Add variables in Vercel Project Settings, not in `vercel.json` or source files. Configure Production, Preview, and Development scopes deliberately.

Best practice is to use separate Neon branches or databases for Preview and Production. Preview deployments must not write test applications into the production database.

## Deployment sequence

1. Rotate any credential that has been pasted into chat, logs, or tickets.
2. Add the new connection variables to Vercel.
3. Run `pnpm migrate` against the intended database.
4. Run `pnpm build` locally.
5. Push the commit to GitHub.
6. Deploy or promote the Vercel build.
7. Submit one test application.
8. Confirm the row and `submitted_at` value in Neon.
9. Check Vercel Function logs for errors without logging answer content.

## Local testing

`pnpm dev` runs the Vite frontend at `http://localhost:3000`, but Vite alone does not emulate files under `api/`.

Use Vercel's local development command when testing the complete frontend-to-function flow:

```bash
vercel dev --listen 3000
```

Alternatively, test the static UI with `pnpm dev` and test serverless endpoints in a Vercel Preview deployment.

## Build-time migrations

Do not silently run production migrations from every Preview build. Run migrations as an explicit release step or a controlled CI job. This keeps schema changes observable and prevents multiple concurrent builds from attempting operational migrations.

## Rollback

Application rollback and database rollback are different operations. Vercel can restore an earlier deployment, but an applied database migration remains applied. Prefer forward-compatible migrations and fix-forward releases. Before a destructive change, create a Neon branch or backup with a documented recovery point.
