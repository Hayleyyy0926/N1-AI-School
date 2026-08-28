import { FEISHU_FIELDS } from '../api/_feishu.js'

const apiBase = 'https://open.feishu.cn/open-apis'
const required = ['FEISHU_APP_ID', 'FEISHU_APP_SECRET', 'FEISHU_APP_TOKEN', 'FEISHU_TABLE_ID']
for (const key of required) if (!process.env[key]) throw new Error(`${key} is not configured`)

const tableId = process.env.FEISHU_TABLE_ID.startsWith('tbl') ? process.env.FEISHU_TABLE_ID : `tbl${process.env.FEISHU_TABLE_ID}`
const tokenResponse = await fetch(`${apiBase}/auth/v3/tenant_access_token/internal`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET }),
})
const tokenBody = await tokenResponse.json()
if (!tokenResponse.ok || tokenBody.code || !tokenBody.tenant_access_token) throw new Error(`Feishu token failed (${tokenResponse.status})`)
const headers = { Authorization: `Bearer ${tokenBody.tenant_access_token}`, 'content-type': 'application/json' }

const fieldsResponse = await fetch(`${apiBase}/bitable/v1/apps/${process.env.FEISHU_APP_TOKEN}/tables/${tableId}/fields?page_size=500`, { headers })
const fieldsBody = await fieldsResponse.json()
if (!fieldsResponse.ok || fieldsBody.code) throw new Error(`Feishu fields read failed (${fieldsResponse.status})`)
const existing = new Map((fieldsBody.data?.items || []).map(field => [field.field_name, field]))

const firstField = [...existing.values()][0]
if (firstField && firstField.field_name !== FEISHU_FIELDS[0].name && existing.size === 1 && firstField.type === 1) {
  const renameResponse = await fetch(`${apiBase}/bitable/v1/apps/${process.env.FEISHU_APP_TOKEN}/tables/${tableId}/fields/${firstField.field_id}`, {
    method: 'PUT', headers, body: JSON.stringify({ field_name: FEISHU_FIELDS[0].name, type: 1 }),
  })
  const renameBody = await renameResponse.json()
  if (!renameResponse.ok || renameBody.code) throw new Error(`Feishu default field rename failed (${renameResponse.status})`)
  existing.delete(firstField.field_name)
  existing.set(FEISHU_FIELDS[0].name, { ...firstField, field_name: FEISHU_FIELDS[0].name })
  console.log(`renamed default field to ${FEISHU_FIELDS[0].name}`)
}

for (const field of FEISHU_FIELDS) {
  const current = existing.get(field.name)
  if (current) {
    const desiredType = field.type || 1
    if (current.type !== desiredType && field.type) {
      const updateResponse = await fetch(`${apiBase}/bitable/v1/apps/${process.env.FEISHU_APP_TOKEN}/tables/${tableId}/fields/${current.field_id}`, {
        method: 'PUT', headers, body: JSON.stringify({ field_name: field.name, type: desiredType }),
      })
      const updateBody = await updateResponse.json()
      if (!updateResponse.ok || updateBody.code) throw new Error(`Feishu field type update failed for ${field.name} (${updateResponse.status}, ${updateBody.code || 'unknown'})`)
      console.log(`updated ${field.name} to type ${desiredType}`)
    }
    continue
  }
  const response = await fetch(`${apiBase}/bitable/v1/apps/${process.env.FEISHU_APP_TOKEN}/tables/${tableId}/fields`, {
    method: 'POST', headers, body: JSON.stringify({ field_name: field.name, type: field.type || 1 }),
  })
  const body = await response.json()
  if (!response.ok || body.code) throw new Error(`Feishu field create failed for ${field.name} (${response.status})`)
  console.log(`created ${field.name}`)
}

console.log(`Feishu table ready: ${FEISHU_FIELDS.length} fields`)
