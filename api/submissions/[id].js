import { createHash } from 'node:crypto'
import { db } from '../_db.js'

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
      const tokenHash = hash(token)
      const rows = await sql`UPDATE submissions SET answers = ${JSON.stringify(answers)}::jsonb, applicant_name = ${answers.name || null}, contact_email = ${answers.email || null}, status = ${status}, updated_at = now(), submitted_at = CASE WHEN ${status} = 'submitted' THEN now() ELSE submitted_at END WHERE id = ${id} AND edit_token_hash = ${tokenHash} AND status <> 'submitted' RETURNING id, status, updated_at, submitted_at`
      if (!rows.length) {
        const existing = await sql`SELECT status FROM submissions WHERE id = ${id} AND edit_token_hash = ${tokenHash}`
        if (existing[0]?.status === 'submitted') return res.status(409).json({ error: 'Submitted applications cannot be edited' })
        return res.status(404).json({ error: 'Submission not found' })
      }
      return res.status(200).json(rows[0])
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Unable to update submission' })
  }
}
