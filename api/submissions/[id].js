import { createHash } from 'node:crypto'
import { db, ensureSchema } from '../_db.js'

const hash = value => createHash('sha256').update(value).digest('hex')
const json = (body, status = 200) => ({ status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export default async function handler(req) {
  try {
    const sql = db()
    await ensureSchema(sql)
    const id = req.query?.id || req.url?.split('/').pop()?.split('?')[0]
    const token = req.headers?.['x-edit-token'] || req.headers?.get?.('x-edit-token')
    if (!id || !token) return json({ error: 'Missing submission credentials' }, 401)
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const status = body.status === 'submitted' ? 'submitted' : 'draft'
      const rows = await sql`UPDATE submissions SET answers = ${JSON.stringify(body.answers || {})}::jsonb, status = ${status}, updated_at = now(), submitted_at = CASE WHEN ${status} = 'submitted' THEN now() ELSE submitted_at END WHERE id = ${id} AND edit_token_hash = ${hash(token)} RETURNING id, status, updated_at, submitted_at`
      if (!rows.length) return json({ error: 'Submission not found' }, 404)
      return json(rows[0])
    }
    return json({ error: 'Method not allowed' }, 405)
  } catch (error) {
    console.error(error)
    return json({ error: 'Unable to update submission' }, 500)
  }
}
