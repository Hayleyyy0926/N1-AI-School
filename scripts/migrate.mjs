import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured')
}

const sql = neon(process.env.DATABASE_URL)
const migrationsDir = resolve('migrations')
const files = (await readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort()

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`

for (const file of files) {
  const source = await readFile(resolve(migrationsDir, file), 'utf8')
  const checksum = createHash('sha256').update(source).digest('hex')
  const applied = await sql`SELECT checksum FROM schema_migrations WHERE name = ${file}`

  if (applied.length) {
    if (applied[0].checksum !== checksum) throw new Error(`Migration ${file} changed after it was applied`)
    console.log(`skip ${file}`)
    continue
  }

  const statements = source.split('-- statement-breakpoint').map(value => value.trim()).filter(Boolean)
  for (const statement of statements) await sql.query(statement)
  await sql`INSERT INTO schema_migrations (name, checksum) VALUES (${file}, ${checksum})`
  console.log(`applied ${file}`)
}

console.log('database is up to date')
