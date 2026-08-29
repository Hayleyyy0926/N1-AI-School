import { AI_OPTIONS, STATUS_OPTIONS } from '../src/formSchema.js'

const FEISHU_API = 'https://open.feishu.cn/open-apis'

export const FEISHU_FIELDS = [
  { key: 'submissionId', name: 'Submission ID' },
  { key: 'formVersion', name: '表单版本 / Form version' },
  { key: 'status', name: '状态 / Status' },
  { key: 'language', name: '语言 / Language' },
  { key: 'createdAt', name: '创建时间 / Created at' },
  { key: 'submittedAt', name: '提交时间 / Submitted at' },
  { key: 'name', name: '姓名 / Full name' },
  { key: 'birthday', name: '出生日期 / Date of birth' },
  { key: 'nationality', name: '国籍 / Nationality' },
  { key: 'city', name: '常住城市 / Current city' },
  { key: 'email', name: '邮箱 / Email' },
  { key: 'phone', name: '手机号 / Phone' },
  { key: 'contact', name: '微信或其他联系方式 / WeChat or other contact' },
  { key: 'currentStatus', name: '目前状态 / Current status' },
  { key: 'school', name: '学校专业年级或当前工作 / School major year or current work' },
  { key: 'mostImportantWork', name: '3. 最重要的一件事 / Most important thing' },
  { key: 'optionalDifferentWork', name: '4. 另一件不同作品（选填） / Optional different work' },
  { key: 'selfTaughtChallenge', name: '5. 自学最难的事 / Hardest thing self-taught' },
  { key: 'loseTrackOfTime', name: '6. 忘记时间的事情 / What makes you lose track of time' },
  { key: 'disagreement', name: '7. 与聪明人意见不同的信念 / Disagreed belief' },
  { key: 'nextMonth', name: '8. 下个月最想做或弄明白的事 / Next month goal' },
  { key: 'processFile', name: '过程证据文件 / Process evidence file', type: 17 },
  { key: 'process', name: '过程证据链接 / Process evidence link' },
  { key: 'start', name: '最早开始时间 / Earliest start' },
  { key: 'days', name: '每周真实参与天数 / Realistic days per week' },
  { key: 'duration', name: '预计持续时间 / Expected duration' },
  { key: 'housing', name: '住宿需求 / Housing needed' },
  { key: 'existingCommitments', name: '无法放下的安排 / Current commitments' },
  { key: 'videoFile', name: '视频文件 / Video file', type: 17 },
  { key: 'video', name: '视频链接 / Video link' },
  { key: 'ai', name: 'AI 使用方式 / AI use' },
  { key: 'aiNote', name: 'AI 使用说明 / AI use note' },
  { key: 'confirmed', name: '真实性确认 / Confirmed' },
  { key: 'confirmName', name: '确认姓名 / Confirmation name' },
  { key: 'confirmDate', name: '确认日期 / Confirmation date' },
  { key: 'answersJson', name: '完整回答 JSON / Answers JSON' },
]

const statusLabels = Object.fromEntries(STATUS_OPTIONS.map(option => [option.value, `${option.zh} / ${option.en}`]))
const aiLabels = Object.fromEntries(AI_OPTIONS.map(option => [option.value, `${option.zh} / ${option.en}`]))

const answerFor = (answers, key) => {
  const value = answers?.[key]
  if (Array.isArray(value)) return value.filter(Boolean).join('\n')
  if (typeof value === 'boolean') return value ? '是 / Yes' : '否 / No'
  return value == null ? '' : String(value)
}

const chinaTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function formatChinaTime(value) {
  if (!value) return ''
  const parts = Object.fromEntries(
    chinaTimeFormatter.formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]),
  )
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

function attachmentValue(value) {
  if (!value) return []
  const items = Array.isArray(value) ? value : [value]
  return items
    .map(item => item?.file_token || item?.fileToken || item?.token)
    .filter(Boolean)
    .map(file_token => ({ file_token }))
}

export function buildFeishuFields(submission) {
  const answers = submission.answers || {}
  const values = {
    submissionId: submission.id,
    formVersion: String(submission.form_version || 1),
    status: submission.status,
    language: submission.language,
    createdAt: formatChinaTime(submission.created_at),
    submittedAt: formatChinaTime(submission.submitted_at),
    currentStatus: statusLabels[answers.status] || answerFor(answers, 'status'),
    housing: answers.housing === 'yes' ? '是 / Yes' : answers.housing === 'no' ? '否 / No' : answerFor(answers, 'housing'),
    ai: Array.isArray(answers.ai) ? answers.ai.map(value => aiLabels[value] || value).join('\n') : answerFor(answers, 'ai'),
    answersJson: JSON.stringify(answers),
  }

  for (const { key, type } of FEISHU_FIELDS) {
    if (values[key] === undefined) values[key] = type === 17 ? attachmentValue(answers[key]) : answerFor(answers, key)
  }

  return Object.fromEntries(FEISHU_FIELDS.map(({ key, name, type }) => [name, values[key] ?? (type === 17 ? [] : '')]))
}

function tableId() {
  const value = process.env.FEISHU_TABLE_ID
  if (!value) throw new Error('FEISHU_TABLE_ID is not configured')
  return value.startsWith('tbl') ? value : `tbl${value}`
}

function config() {
  for (const key of ['FEISHU_APP_ID', 'FEISHU_APP_SECRET', 'FEISHU_APP_TOKEN']) {
    if (!process.env[key]) throw new Error(`${key} is not configured`)
  }
  return { appToken: process.env.FEISHU_APP_TOKEN, table: tableId() }
}

async function jsonResponse(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.code) {
    throw new Error(`Feishu API error ${response.status} (${body.code || 'unknown'}): ${body.msg || 'unknown error'}`)
  }
  return body
}

async function tenantAccessToken() {
  const response = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET }),
    signal: AbortSignal.timeout(10000),
  })
  const body = await jsonResponse(response)
  if (!body.tenant_access_token) throw new Error('Feishu API did not return a tenant token')
  return body.tenant_access_token
}

async function resolveBitableAppToken(token, configuredToken) {
  const wikiResponse = await fetch(`${FEISHU_API}/wiki/v2/spaces/get_node?token=${encodeURIComponent(configuredToken)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  })
  const wikiBody = await wikiResponse.json().catch(() => ({}))
  if (wikiResponse.ok && !wikiBody.code && wikiBody.data?.node?.obj_type === 'bitable') {
    return wikiBody.data.node.obj_token
  }
  return configuredToken
}

export async function uploadFeishuMedia({ file, fileName, contentType }) {
  const { appToken: configuredToken } = config()
  const token = await tenantAccessToken()
  const appToken = await resolveBitableAppToken(token, configuredToken)
  const form = new FormData()
  form.append('file_name', fileName)
  form.append('parent_type', 'bitable_file')
  form.append('parent_node', appToken)
  form.append('size', String(file.byteLength))
  form.append('file', new Blob([file], { type: contentType || 'application/octet-stream' }), fileName)
  const response = await fetch(`${FEISHU_API}/drive/v1/medias/upload_all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  })
  const body = await jsonResponse(response)
  const fileToken = body.data?.file_token
  if (!fileToken) throw new Error('Feishu media upload did not return a file token')
  return fileToken
}

async function request(token, path, options = {}) {
  const response = await fetch(`${FEISHU_API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000),
  })
  return jsonResponse(response)
}

async function findRecord(token, appToken, table, submissionId) {
  let pageToken = ''
  do {
    const query = new URLSearchParams({ page_size: '500' })
    if (pageToken) query.set('page_token', pageToken)
    const body = await request(token, `/bitable/v1/apps/${appToken}/tables/${table}/records?${query}`)
    const match = (body.data?.items || []).find(record => record.fields?.['Submission ID'] === submissionId)
    if (match) return match
    pageToken = body.data?.has_more ? body.data?.page_token || '' : ''
  } while (pageToken)
  return null
}

export async function syncSubmissionToFeishu(submission) {
  const { appToken, table } = config()
  const token = await tenantAccessToken()
  const fields = buildFeishuFields(submission)
  const existing = await findRecord(token, appToken, table, submission.id)

  if (existing) {
    const body = await request(token, `/bitable/v1/apps/${appToken}/tables/${table}/records/${existing.record_id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
    return { recordId: body.data?.record?.record_id || existing.record_id, action: 'updated' }
  }

  const body = await request(token, `/bitable/v1/apps/${appToken}/tables/${table}/records`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  return { recordId: body.data?.record?.record_id, action: 'created' }
}
