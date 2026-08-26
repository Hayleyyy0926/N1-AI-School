import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { db } from '../_db.js'

const hash = value => createHash('sha256').update(value).digest('hex')

export default async function handler(req, res) {
  try {
    const sql = db()
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const token = randomBytes(32).toString('hex')
      const answers = body.answers || {}
      const status = body.status === 'submitted' ? 'submitted' : 'draft'
      const rows = await sql`INSERT INTO submissions (id, language, edit_token_hash, applicant_name, contact_email, answers, status, submitted_at) VALUES (${randomUUID()}, ${body.language || 'zh'}, ${hash(token)}, ${answers.name || null}, ${answers.email || null}, ${JSON.stringify(answers)}::jsonb, ${status}, ${status === 'submitted' ? new Date() : null}) RETURNING id, status, created_at, submitted_at`
      return res.status(201).json({ ...rows[0], editToken: token })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Unable to save submission' })
  }
}
