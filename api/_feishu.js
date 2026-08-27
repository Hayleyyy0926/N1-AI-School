const FEISHU_API = 'https://open.feishu.cn/open-apis'

export const FEISHU_FIELDS = [
  { key: 'submissionId', name: 'Submission ID' },
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
  { key: 'contact', name: '其他联系方式 / Other contact' },
  { key: 'currentStatus', name: '目前状态 / Current status' },
  { key: 'school', name: '学校专业或当前工作 / School or current work' },
  { key: 'participation', name: '参与方式 / Participation' },
  { key: 'start', name: '最早开始时间 / Earliest start' },
  { key: 'days', name: '每周投入天数 / Days per week' },
  { key: 'duration', name: '预计持续时间 / Expected duration' },
  { key: 'housing', name: '住宿需求 / Housing needed' },
  { key: 'project1', name: '作品一 / Project 1' },
  { key: 'project2', name: '作品二 / Project 2' },
  { key: 'contribution', name: '个人贡献 / Personal contribution' },
  { key: 'impact', name: '结果与影响 / Result and impact' },
  { key: 'learning', name: '自学挑战 / Self-taught challenge' },
  { key: 'pursuit', name: '正在追的问题 / Problem in pursuit' },
  { key: 'processFile', name: '过程证据文件 / Process evidence file' },
  { key: 'process', name: '过程证据链接 / Process evidence link' },
  { key: 'commitment', name: '时间与承诺 / Commitment' },
  { key: 'videoFile', name: '视频文件 / Video file' },
  { key: 'video', name: '视频链接 / Video link' },
  { key: 'refName', name: '推荐人姓名 / Reference name' },
  { key: 'refContact', name: '推荐人联系方式 / Reference contact' },
  { key: 'refWork', name: '共同工作内容 / Reference work' },
  { key: 'refAllowed', name: '允许联系推荐人 / Contact permission' },
  { key: 'final', name: '补充说明 / Final note' },
  { key: 'ai', name: 'AI 使用方式 / AI use' },
  { key: 'aiNote', name: 'AI 使用说明 / AI use note' },
  { key: 'confirmed', name: '真实性确认 / Confirmed' },
  { key: 'confirmName', name: '确认姓名 / Confirmation name' },
  { key: 'confirmDate', name: '确认日期 / Confirmation date' },
  { key: 'answersJson', name: '完整回答 JSON / Answers JSON' },
]

const answerFor = (answers, key) => {
  const value = answers?.[key]
  if (Array.isArray(value)) return value.filter(Boolean).join('\n')
  if (typeof value === 'boolean') return value ? '是 / Yes' : '否 / No'
  return value == null ? '' : String(value)
}

export function buildFeishuFields(submission) {
  const answers = submission.answers || {}
  const values = {
    submissionId: submission.id,
    status: submission.status,
    language: submission.language,
    createdAt: submission.created_at,
    submittedAt: submission.submitted_at,
    currentStatus: answerFor(answers, 'status'),
    answersJson: JSON.stringify(answers),
  }

  for (const { key } of FEISHU_FIELDS) {
    if (values[key] === undefined) values[key] = answerFor(answers, key)
  }

  return Object.fromEntries(FEISHU_FIELDS.map(({ key, name }) => [name, values[key] ?? '']))
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
    throw new Error(`Feishu API error ${response.status} (${body.code || 'unknown'})`)
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
