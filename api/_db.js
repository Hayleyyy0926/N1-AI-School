import { neon } from '@neondatabase/serverless'

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
  return neon(process.env.DATABASE_URL)
}

export async function ensureSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY,
    language TEXT NOT NULL DEFAULT 'zh',
    status TEXT NOT NULL DEFAULT 'draft',
    edit_token_hash TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ
  )`
  await sql`CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions(status)`
  await sql`CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions(created_at DESC)`
}
