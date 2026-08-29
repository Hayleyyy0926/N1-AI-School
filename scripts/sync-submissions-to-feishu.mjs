import { neon } from '@neondatabase/serverless'
import { syncSubmissionToFeishu } from '../api/_feishu.js'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
const sql = neon(process.env.DATABASE_URL)
const submissions = await sql`SELECT id, form_version, status, language, answers, created_at, submitted_at FROM submissions WHERE status = 'submitted' ORDER BY created_at ASC`
let synced = 0
let failed = 0

for (const submission of submissions) {
  try {
    const result = await syncSubmissionToFeishu(submission)
    await sql`UPDATE submissions SET feishu_record_id = ${result.recordId || null}, feishu_synced_at = now(), feishu_sync_error = NULL WHERE id = ${submission.id}`
    synced += 1
    console.log(`${result.action} ${submission.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Feishu sync error'
    await sql`UPDATE submissions SET feishu_sync_error = ${message.slice(0, 500)} WHERE id = ${submission.id}`
    failed += 1
    console.error(`failed ${submission.id}: ${message}`)
  }
}

console.log(`Feishu sync complete: ${synced} synced, ${failed} failed`)
if (failed) process.exitCode = 1
