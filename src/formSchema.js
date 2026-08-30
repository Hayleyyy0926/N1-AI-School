export const FORM_VERSION = 2

export const STATUS_OPTIONS = [
  { value: 'high_school', zh: '高中', en: 'High school' },
  { value: 'university', zh: '大学', en: 'University' },
  { value: 'gap_year', zh: 'Gap Year', en: 'Gap year' },
  { value: 'leave_or_dropout', zh: '休学或退学', en: 'Leave of absence or dropout' },
  { value: 'working', zh: '工作', en: 'Working' },
  { value: 'research', zh: '研究', en: 'Research' },
  { value: 'startup', zh: '创业', en: 'Startup' },
  { value: 'other', zh: '其他', en: 'Other' },
]

export const AI_OPTIONS = [
  { value: 'none', zh: '未使用', en: 'Did not use AI' },
  { value: 'translation', zh: '翻译', en: 'Translation' },
  { value: 'organizing', zh: '整理', en: 'Organizing' },
  { value: 'discussion', zh: '讨论问题', en: 'Discussing ideas' },
  { value: 'editing', zh: '修改表达', en: 'Editing' },
  { value: 'first_draft', zh: '生成部分初稿', en: 'Generating part of a first draft' },
  { value: 'other', zh: '其他', en: 'Other' },
]

export const TEXT_LIMITS = {
  mostImportantWork: 300,
  optionalDifferentWork: 200,
  selfTaughtChallenge: 250,
  loseTrackOfTime: 150,
  disagreement: 200,
  nextMonth: 250,
}

export const EMPTY_FORM = {
  name: '',
  birthday: '',
  nationality: '',
  city: '',
  email: '',
  phone: '',
  contact: '',
  status: '',
  school: '',
  mostImportantWork: '',
  optionalDifferentWork: '',
  selfTaughtChallenge: '',
  loseTrackOfTime: '',
  disagreement: '',
  nextMonth: '',
  processFile: null,
  process: '',
  start: '',
  days: '',
  duration: '',
  housing: '',
  existingCommitments: '',
  videoFile: null,
  video: '',
  ai: [],
  aiNote: '',
  confirmed: false,
  confirmName: '',
  confirmDate: '',
}

const REQUIRED_FIELDS = [
  'name', 'birthday', 'nationality', 'city', 'email', 'phone', 'contact', 'status', 'school',
  'mostImportantWork', 'selfTaughtChallenge', 'loseTrackOfTime', 'disagreement', 'nextMonth',
  'start', 'days', 'duration', 'housing', 'existingCommitments', 'aiNote', 'confirmName', 'confirmDate',
]

export const FIELD_SECTIONS = {
  name: 'basics', birthday: 'basics', nationality: 'basics', city: 'basics', email: 'basics', phone: 'basics', contact: 'basics', status: 'basics', school: 'basics',
  mostImportantWork: 'core-one', optionalDifferentWork: 'core-one', selfTaughtChallenge: 'core-one', loseTrackOfTime: 'core-one',
  disagreement: 'core-two', nextMonth: 'core-two', processEvidence: 'core-two', start: 'core-two', days: 'core-two', duration: 'core-two', housing: 'core-two', existingCommitments: 'core-two',
  videoEvidence: 'video', ai: 'confirmation', aiNote: 'confirmation', confirmed: 'confirmation', confirmName: 'confirmation', confirmDate: 'confirmation',
}

export const FIELD_LABELS = {
  zh: {
    name: '姓名', birthday: '出生日期', nationality: '国籍', city: '常住城市', email: '邮箱', phone: '手机号', contact: '微信或其他联系方式', status: '目前状态', school: '学校、专业、年级或当前正在做的事情',
    mostImportantWork: '第 3 题', optionalDifferentWork: '第 4 题', selfTaughtChallenge: '第 5 题', loseTrackOfTime: '第 6 题', disagreement: '第 7 题', nextMonth: '第 8 题', processEvidence: '第 9 题的附件或链接', start: '最早开始时间', days: '每周参与天数', duration: '预计持续时间', housing: '住宿需求', existingCommitments: '目前无法放下的安排',
    videoEvidence: '第 11 题的视频附件或链接', ai: 'AI 使用方式', aiNote: 'AI 使用说明', confirmed: '申请人确认', confirmName: '确认姓名', confirmDate: '确认日期',
  },
  en: {
    name: 'Full name', birthday: 'Date of birth', nationality: 'Nationality', city: 'Current city', email: 'Email', phone: 'Phone number', contact: 'WeChat or another contact method', status: 'Current status', school: 'School, major, year, or current work',
    mostImportantWork: 'Question 3', optionalDifferentWork: 'Question 4', selfTaughtChallenge: 'Question 5', loseTrackOfTime: 'Question 6', disagreement: 'Question 7', nextMonth: 'Question 8', processEvidence: 'An attachment or link for Question 9', start: 'Earliest start date', days: 'Days per week', duration: 'Expected duration', housing: 'Housing requirement', existingCommitments: 'Current commitments',
    videoEvidence: 'A video attachment or link for Question 11', ai: 'AI use', aiNote: 'AI use explanation', confirmed: 'Applicant confirmation', confirmName: 'Confirmation name', confirmDate: 'Confirmation date',
  },
}

const hasValue = value => typeof value === 'string' ? Boolean(value.trim()) : Boolean(value)
const hasAttachment = value => Boolean(value && typeof value === 'object' && (value.fileToken || value.file_token))

export function countAnswer(value, language) {
  const text = String(value || '').trim()
  if (!text) return 0
  return language === 'zh' ? text.replace(/\s/g, '').length : text.split(/\s+/).filter(Boolean).length
}

export function hasMeaningfulAnswer(answers) {
  return Object.values(answers || {}).some(value => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object' && value) return hasAttachment(value)
    if (typeof value === 'boolean') return value
    return hasValue(value)
  })
}

export function validateAnswers(answers = {}, language = 'zh') {
  const lang = language === 'en' ? 'en' : 'zh'
  const errors = {}

  for (const key of REQUIRED_FIELDS) {
    if (!hasValue(answers[key])) errors[key] = lang === 'zh' ? '此项为必填。' : 'This field is required.'
  }

  if (!STATUS_OPTIONS.some(option => option.value === answers.status)) {
    errors.status = lang === 'zh' ? '请选择目前状态。' : 'Select your current status.'
  }
  if (answers.email && !/^\S+@\S+\.\S+$/.test(String(answers.email).trim())) {
    errors.email = lang === 'zh' ? '请输入有效的邮箱地址。' : 'Enter a valid email address.'
  }
  if (!hasAttachment(answers.processFile) && !hasValue(answers.process)) {
    errors.processEvidence = lang === 'zh' ? '请上传附件或填写链接。' : 'Upload an attachment or provide a link.'
  }
  if (!hasAttachment(answers.videoFile) && !hasValue(answers.video)) {
    errors.videoEvidence = lang === 'zh' ? '请上传视频或填写视频链接。' : 'Upload a video or provide a video link.'
  }
  if (!Array.isArray(answers.ai) || !answers.ai.length) {
    errors.ai = lang === 'zh' ? '请选择至少一项。' : 'Select at least one option.'
  }
  if (answers.confirmed !== true) {
    errors.confirmed = lang === 'zh' ? '请确认申请人声明。' : 'Confirm the applicant statement.'
  }

  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    if (countAnswer(answers[key], lang) > limit) {
      errors[key] = lang === 'zh' ? `不能超过 ${limit} 字。` : `Maximum ${limit} words.`
    }
  }

  const firstKey = Object.keys(FIELD_SECTIONS).find(key => errors[key])
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstField: firstKey || null,
    firstSection: firstKey ? FIELD_SECTIONS[firstKey] : null,
  }
}
