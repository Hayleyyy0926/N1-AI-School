import { createHash } from 'node:crypto'
import { db } from '../_db.js'
import { syncSubmissionToFeishu } from '../_feishu.js'
import { FORM_VERSION, validateAnswers } from '../../src/formSchema.js'

const hash = value => createHash('sha256').update(value).digest('hex')

export default async function handler(req, res) {
  try {
    const sql = db()
    const id = req.query?.id || req.url?.split('/').pop()?.split('?')[0]
    const token = req.headers?.['x-edit-token']
    if (!id || !token) return res.status(401).json({ error: 'Missing submission credentials' })
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const status = body.status === 'submitted' ? 'submitted' : 'draft'
      const answers = body.answers || {}
      const language = body.language === 'en' ? 'en' : 'zh'
      if (status === 'submitted') {
        const validation = validateAnswers(answers, language)
        if (!validation.valid) return res.status(422).json({ error: 'Required answers are incomplete', errors: validation.errors, firstField: validation.firstField, firstSection: validation.firstSection })
      }
      const tokenHash = hash(token)
      const current = await sql`SELECT status FROM submissions WHERE id = ${id} AND edit_token_hash = ${tokenHash}`
      if (!current.length) return res.status(404).json({ error: 'Submission not found' })
      if (current[0].status === 'submitted' && status !== 'submitted') {
        return res.status(409).json({ error: 'Submitted applications must remain submitted' })
      }
      const rows = await sql`UPDATE submissions SET form_version = ${FORM_VERSION}, language = ${language}, answers = ${JSON.stringify(answers)}::jsonb, applicant_name = ${answers.name || null}, contact_email = ${answers.email || null}, status = ${status}, updated_at = now(), submitted_at = CASE WHEN ${status} = 'submitted' THEN now() ELSE submitted_at END WHERE id = ${id} AND edit_token_hash = ${tokenHash} RETURNING id, form_version, status, language, answers, created_at, updated_at, submitted_at, feishu_record_id`
      if (!rows.length) {
        return res.status(404).json({ error: 'Submission not found' })
      }
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
          console.error('Feishu sync failed for submitted application', rows[0].id, message)
          feishuSync = 'pending'
        }
      }
      return res.status(200).json({ id: rows[0].id, formVersion: rows[0].form_version, status: rows[0].status, updated_at: rows[0].updated_at, submitted_at: rows[0].submitted_at, feishuSync })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Unable to update submission' })
  }
}
