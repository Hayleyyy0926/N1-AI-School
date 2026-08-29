import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { db } from '../_db.js'
import { syncSubmissionToFeishu } from '../_feishu.js'
import { FORM_VERSION, validateAnswers } from '../../src/formSchema.js'

const hash = value => createHash('sha256').update(value).digest('hex')

export default async function handler(req, res) {
  try {
    const sql = db()
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const token = randomBytes(32).toString('hex')
      const answers = body.answers || {}
      const status = body.status === 'submitted' ? 'submitted' : 'draft'
      const language = body.language === 'en' ? 'en' : 'zh'
      if (status === 'submitted') {
        const validation = validateAnswers(answers, language)
        if (!validation.valid) return res.status(422).json({ error: 'Required answers are incomplete', errors: validation.errors, firstSection: validation.firstSection })
      }
      const rows = await sql`INSERT INTO submissions (id, form_version, language, edit_token_hash, applicant_name, contact_email, answers, status, submitted_at) VALUES (${randomUUID()}, ${FORM_VERSION}, ${language}, ${hash(token)}, ${answers.name || null}, ${answers.email || null}, ${JSON.stringify(answers)}::jsonb, ${status}, ${status === 'submitted' ? new Date() : null}) RETURNING id, form_version, status, language, answers, created_at, submitted_at`
      let feishuSync = 'not_needed'
      if (status === 'submitted') {
        try {
          const sync = await syncSubmissionToFeishu(rows[0])
          if (!sync.recordId) throw new Error('Feishu API did not return a record id')
          await sql`UPDATE submissions SET feishu_record_id = ${sync.recordId}, feishu_synced_at = now(), feishu_sync_error = NULL WHERE id = ${rows[0].id}`
          feishuSync = 'synced'
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown Feishu sync error'
          await sql`UPDATE submissions SET feishu_sync_error = ${message.slice(0, 500)} WHERE id = ${rows[0].id}`
          console.error('Feishu sync failed for new submission', rows[0].id, message)
          feishuSync = 'pending'
        }
      }
      return res.status(201).json({ id: rows[0].id, formVersion: rows[0].form_version, status: rows[0].status, created_at: rows[0].created_at, submitted_at: rows[0].submitted_at, editToken: token, feishuSync })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Unable to save submission' })
  }
}
