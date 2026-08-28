import Busboy from 'busboy'
import { createHash } from 'node:crypto'
import { db } from './_db.js'
import { uploadFeishuMedia } from './_feishu.js'

const MAX_FILE_SIZE = 4 * 1024 * 1024
const hash = value => createHash('sha256').update(value).digest('hex')

function parseUpload(req) {
  return new Promise((resolve, reject) => {
    let upload
    let fileCount = 0
    let tooLarge = false
    let settled = false
    const chunks = []
    let size = 0
    let fileName = ''
    let contentType = 'application/octet-stream'

    let parser
    try {
      parser = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_FILE_SIZE + 1 } })
    } catch (error) {
      reject(new Error('Invalid multipart upload'))
      return
    }

    const finish = result => {
      if (!settled) { settled = true; resolve(result) }
    }
    parser.on('file', (fieldName, stream, info) => {
      fileCount += 1
      if (fieldName !== 'file' || fileCount > 1) {
        stream.resume()
        return
      }
      fileName = info.filename || 'upload'
      contentType = info.mimeType || contentType
      stream.on('data', chunk => {
        size += chunk.length
        chunks.push(chunk)
      })
      stream.on('limit', () => { tooLarge = true })
    })
    parser.on('error', reject)
    parser.on('finish', () => {
      if (tooLarge) return reject(new Error('File exceeds the 4 MB limit'))
      if (fileCount !== 1 || !size) return reject(new Error('A file is required'))
      finish({ file: Buffer.concat(chunks), fileName, contentType, size })
    })
    req.pipe(parser)
  })
}

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const submissionId = req.headers?.['x-submission-id']
  const editToken = req.headers?.['x-edit-token']
  if (!submissionId || !editToken) return res.status(401).json({ error: 'Missing submission credentials' })

  try {
    const sql = db()
    const authorized = await sql`SELECT id FROM submissions WHERE id = ${submissionId} AND edit_token_hash = ${hash(editToken)}`
    if (!authorized.length) return res.status(404).json({ error: 'Submission not found' })
    const { file, fileName, contentType, size } = await parseUpload(req)
    const fileToken = await uploadFeishuMedia({ file, fileName, contentType })
    return res.status(201).json({ fileToken, name: fileName, size, type: contentType })
  } catch (error) {
    console.error('Attachment upload failed', error)
    const message = error instanceof Error ? error.message : 'Unable to upload file'
    const status = /4 MB|multipart|file is required/i.test(message) ? 400 : 500
    return res.status(status).json({ error: status === 400 ? message : 'Unable to upload file' })
  }
}
