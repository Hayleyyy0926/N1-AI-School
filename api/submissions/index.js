import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { db, ensureSchema } from '../_db.js'

const hash = value => createHash('sha256').update(value).digest('hex')
const json = (body, status = 200) => ({ status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export default async function handler(req) {
  try {
    const sql = db()
    await ensureSchema(sql)
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const token = randomBytes(32).toString('hex')
      const rows = await sql`INSERT INTO submissions (id, language, edit_token_hash, answers) VALUES (${randomUUID()}, ${body.language || 'zh'}, ${hash(token)}, ${JSON.stringify(body.answers || {})}::jsonb) RETURNING id, status, created_at`
      return json({ ...rows[0], editToken: token }, 201)
    }
    return json({ error: 'Method not allowed' }, 405)
  } catch (error) {
    console.error(error)
    return json({ error: 'Unable to save submission' }, 500)
  }
}
