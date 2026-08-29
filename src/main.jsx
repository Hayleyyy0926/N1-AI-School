import { createRoot } from 'react-dom/client'
import { useEffect, useMemo, useRef, useState } from 'react'
import CoverPage from './CoverPage.jsx'
import {
  AI_OPTIONS,
  EMPTY_FORM,
  FIELD_LABELS,
  FORM_VERSION,
  STATUS_OPTIONS,
  TEXT_LIMITS,
  countAnswer,
  hasMeaningfulAnswer,
  validateAnswers,
} from './formSchema.js'
import './styles.css'

const sections = [
  { id: 'instructions', no: '00', zh: '填写说明', en: 'Before You Begin' },
  { id: 'basics', no: '一', zh: '基本信息', en: 'Basic Information' },
  { id: 'core-one', no: '二', zh: '核心问题 3–6', en: 'Core Questions 3–6' },
  { id: 'core-two', no: '二', zh: '核心问题 7–10', en: 'Core Questions 7–10' },
  { id: 'video', no: '三', zh: '视频', en: 'Video' },
  { id: 'confirmation', no: '—', zh: 'AI 使用与确认', en: 'AI Use & Confirmation' },
]

const localDraftKey = 'n1-application-draft-v2'
const submissionKey = 'n1-submission-v2'

const readStoredJson = key => {
  try { return JSON.parse(window.localStorage.getItem(key) || 'null') } catch { return null }
}

const storeJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const loadLocalDraft = () => {
  const draft = readStoredJson(localDraftKey)
  if (!draft || draft.version !== FORM_VERSION || typeof draft.form !== 'object') return null
  return {
    form: {
      ...EMPTY_FORM,
      ...draft.form,
      ai: Array.isArray(draft.form.ai) ? draft.form.ai : [],
      confirmed: Boolean(draft.form.confirmed),
      processFile: draft.form.processFile && typeof draft.form.processFile === 'object' ? draft.form.processFile : null,
      videoFile: draft.form.videoFile && typeof draft.form.videoFile === 'object' ? draft.form.videoFile : null,
    },
    language: draft.language === 'en' ? 'en' : 'zh',
    activeSection: sections.some(section => section.id === draft.activeSection) ? draft.activeSection : 'instructions',
  }
}

function Field({ label, hint, children, required = true, error, className = '' }) {
  return <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
    <span className="field-label">{label}{required && <b className="required">*</b>}</span>
    {hint && <span className="field-hint">{hint}</span>}
    {children}
    {error && <span className="field-error" role="alert">{error}</span>}
  </div>
}

function TextArea({ value, onChange, label, limit, language }) {
  const count = limit ? countAnswer(value, language) : 0
  return <div className={`textarea-wrap ${limit && count > limit ? 'over-limit' : ''}`}>
    <textarea aria-label={label} value={value} onChange={onChange} />
    {limit && <span className="count">{count} / {limit} {language === 'zh' ? '字' : 'words'}</span>}
  </div>
}

function OptionList({ options, values, onToggle, language }) {
  return <div className="check-list">
    {options.map(option => <label className="check-row" key={option.value}>
      <input type="checkbox" checked={values.includes(option.value)} onChange={() => onToggle(option.value)} />
      <span className="fake-check" aria-hidden="true">✓</span>
      <span>{option[language]}</span>
    </label>)}
  </div>
}

function Question({ no, title, children }) {
  return <div className="question-block">
    <div className="question-label">
      <span className="q-no">{no}</span>
      <div><h3>{title}</h3><div className="question-copy">{children}</div></div>
    </div>
  </div>
}

function SectionIntro({ no, title }) {
  return <div className="section-intro"><span className="section-no">{no}</span><div><h2>{title}</h2></div></div>
}

function UploadBox({ id, attachment, accept, onUpload, uploading, error, language, kind = 'file' }) {
  const isZh = language === 'zh'
  const defaultTitle = kind === 'video'
    ? (isZh ? '拖入视频或点击上传' : 'Drop a video or click to upload')
    : (isZh ? '拖入附件或点击上传' : 'Drop an attachment or click to upload')
  return <>
    <div className={`upload-box ${error ? 'upload-invalid' : ''}`}>
      <span className="upload-icon">{kind === 'video' ? '◉' : '↑'}</span>
      <div>
        <strong>{uploading ? (isZh ? '上传中…' : 'Uploading…') : attachment?.name || defaultTitle}</strong>
        <small>{attachment?.fileToken ? (isZh ? '已上传，可随申请一起提交' : 'Uploaded and ready to submit') : (isZh ? '最大 4 MB' : 'Up to 4 MB')}</small>
      </div>
      <label className="upload-button" htmlFor={id}>{kind === 'video' ? (isZh ? '选择视频' : 'Choose video') : (isZh ? '选择附件' : 'Choose attachment')}</label>
      <input id={id} className="file-input" type="file" accept={accept} onChange={event => onUpload(event.target.files?.[0])} />
    </div>
    {error && <span className="field-error upload-error" role="alert">{error}</span>}
  </>
}

function App() {
  const [initialDraft] = useState(loadLocalDraft)
  const [initialSubmission] = useState(() => readStoredJson(submissionKey))
  const [lang, setLang] = useState(initialDraft?.language || 'zh')
  const [active, setActive] = useState(initialDraft?.activeSection || 'instructions')
  const [form, setForm] = useState(initialDraft?.form || { ...EMPTY_FORM })
  const [submitted, setSubmitted] = useState(initialSubmission?.status === 'submitted')
  const [submission, setSubmission] = useState(initialSubmission)
  const [storageError, setStorageError] = useState(false)
  const [uploading, setUploading] = useState({})
  const [uploadError, setUploadError] = useState({})
  const [errors, setErrors] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [autoSaveState, setAutoSaveState] = useState('local')
  const [page, setPage] = useState(() => window.location.hash === '#apply' ? 'application' : 'cover')
  const submissionRef = useRef(initialSubmission)
  const saveQueueRef = useRef(Promise.resolve())
  const isZh = lang === 'zh'
  const index = sections.findIndex(section => section.id === active)
  const current = sections[index]
  const progress = Math.round(((index + 1) / sections.length) * 100)

  const copy = useMemo(() => ({
    eyebrow: 'N1 AI SCHOOL / APPLICATION',
    title: isZh ? 'N1 AI School 申请表' : 'N1 AI School Application',
    intro: isZh ? '具体的东西比宏大的目标更有用。' : 'Concrete evidence matters more than ambitious claims.',
    save: isZh ? '立即保存' : 'Save now',
    saving: isZh ? '正在自动保存' : 'Auto-saving',
    saved: isZh ? '已自动保存' : 'Auto-saved',
    local: isZh ? '本地自动保存已开启' : 'Local auto-save is on',
    saveError: isZh ? '自动保存失败' : 'Auto-save failed',
    submitted: isZh ? '已提交' : 'Submitted',
    next: isZh ? '下一部分' : 'Next section',
    submit: isZh ? '提交申请' : 'Submit application',
    back: isZh ? '上一部分' : 'Previous section',
    required: isZh ? '除标注选填外，其他问题均为必填' : 'All questions are required unless marked optional',
  }), [isZh])

  const clearFieldError = key => {
    const related = key === 'process' || key === 'processFile' ? 'processEvidence' : key === 'video' || key === 'videoFile' ? 'videoEvidence' : key
    setErrors(previous => {
      if (!previous[related]) return previous
      const next = { ...previous }
      delete next[related]
      return next
    })
  }

  const set = (key, value) => {
    setForm(previous => ({ ...previous, [key]: value }))
    clearFieldError(key)
  }

  const toggle = (key, value) => {
    setForm(previous => ({ ...previous, [key]: previous[key].includes(value) ? previous[key].filter(item => item !== value) : [...previous[key], value] }))
    clearFieldError(key)
  }

  const persistNow = async (status = 'draft') => {
    const currentSubmission = submissionRef.current
    if (currentSubmission?.status === 'submitted' && status !== 'submitted') throw new Error('Submitted applications must remain submitted')
    const payload = { formVersion: FORM_VERSION, language: lang, answers: form, status }
    const response = currentSubmission
      ? await fetch(`/api/submissions/${currentSubmission.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-edit-token': currentSubmission.editToken }, body: JSON.stringify(payload) })
      : await fetch('/api/submissions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(result.error || 'Unable to save application')
      error.details = result
      throw error
    }
    const nextSubmission = currentSubmission
      ? { ...currentSubmission, status: result.status, formVersion: FORM_VERSION }
      : { id: result.id, editToken: result.editToken, status: result.status, formVersion: FORM_VERSION }
    submissionRef.current = nextSubmission
    setSubmission(nextSubmission)
    if (!storeJson(submissionKey, nextSubmission)) setStorageError(true)
    return result
  }

  const persist = (status = 'draft') => {
    const task = saveQueueRef.current.catch(() => {}).then(() => persistNow(status))
    saveQueueRef.current = task
    return task
  }

  useEffect(() => {
    const stored = storeJson(localDraftKey, {
      version: FORM_VERSION,
      language: lang,
      activeSection: active,
      form,
      savedAt: new Date().toISOString(),
    })
    setStorageError(!stored)
  }, [active, form, lang])

  useEffect(() => {
    if (page !== 'application' || submission?.status === 'submitted' || !hasMeaningfulAnswer(form)) return undefined
    setAutoSaveState('saving')
    const timer = window.setTimeout(async () => {
      try {
        await persist('draft')
        setAutoSaveState('saved')
      } catch (error) {
        console.error(error)
        setAutoSaveState(import.meta.env.DEV ? 'local' : 'error')
      }
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [form, lang, page, submission?.status])

  useEffect(() => {
    const syncPage = () => {
      setPage(window.location.hash === '#apply' ? 'application' : 'cover')
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  const openApplication = () => {
    if (window.location.hash !== '#apply') window.location.hash = 'apply'
    else setPage('application')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openCover = () => {
    window.location.hash = ''
    setPage('cover')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const uploadFile = async (key, file) => {
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setUploadError(previous => ({ ...previous, [key]: isZh ? '文件不能超过 4 MB。' : 'Files must be 4 MB or smaller.' }))
      return
    }
    setUploadError(previous => ({ ...previous, [key]: '' }))
    setUploading(previous => ({ ...previous, [key]: true }))
    try {
      let auth = submissionRef.current
      if (!auth) {
        const result = await persist('draft')
        auth = { id: result.id, editToken: result.editToken }
      }
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'x-submission-id': auth.id, 'x-edit-token': auth.editToken },
        body,
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.fileToken) throw new Error(result.error || 'Upload failed')
      set(key, { fileToken: result.fileToken, name: result.name, size: result.size, type: result.type })
    } catch (error) {
      console.error(error)
      setUploadError(previous => ({ ...previous, [key]: isZh ? '上传失败，请稍后重试。' : 'Upload failed. Please try again.' }))
    } finally {
      setUploading(previous => ({ ...previous, [key]: false }))
    }
  }

  const goNext = async () => {
    if (index < sections.length - 1) {
      setActive(sections[index + 1].id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const validation = validateAnswers(form, lang)
    if (!validation.valid) {
      setErrors(validation.errors)
      setSubmitAttempted(true)
      if (validation.firstSection) setActive(validation.firstSection)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (Object.values(uploading).some(Boolean)) {
      setSubmitAttempted(true)
      return
    }
    try {
      setSubmitAttempted(false)
      setAutoSaveState('saving')
      await persist('submitted')
      setAutoSaveState('saved')
      setSubmitted(true)
    } catch (error) {
      console.error(error)
      if (error.details?.errors) {
        setErrors(error.details.errors)
        setSubmitAttempted(true)
        if (error.details.firstSection) setActive(error.details.firstSection)
      } else {
        alert(isZh ? '提交失败，请稍后再试。' : 'Submission failed. Please try again.')
      }
    }
  }

  const goBack = () => {
    if (index > 0) setActive(sections[index - 1].id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const autoSaveLabel = submission?.status === 'submitted' ? copy.submitted : copy[autoSaveState]
  const missingLabels = Object.keys(errors).map(key => FIELD_LABELS[lang][key]).filter(Boolean)

  if (page === 'cover') return <CoverPage lang={lang} setLang={setLang} onApply={openApplication} />

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand brand-button" onClick={openCover} aria-label={isZh ? '返回首页' : 'Back to cover'}><span className="brand-mark">N1</span><span className="brand-divider" /><span className="brand-type">AI SCHOOL</span></button>
      <div className="top-actions">
        <button className="save-btn" disabled={submission?.status === 'submitted'} onClick={async () => { try { setAutoSaveState('saving'); await persist('draft'); setAutoSaveState('saved') } catch (error) { console.error(error); setAutoSaveState('error') } }} aria-label={copy.save}>
          <span className={`save-dot ${autoSaveState}`} />{autoSaveLabel}
        </button>
        <div className="language-toggle" role="group" aria-label="Language">
          <button className={isZh ? 'active' : ''} onClick={() => setLang('zh')}>中</button><span>/</span><button className={!isZh ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
      </div>
    </header>

    <div className="progress-line"><span style={{ width: `${progress}%` }} /></div>
    {storageError && <div className="storage-warning" role="alert">{isZh ? '此浏览器无法自动保存本地草稿，请检查隐私或存储设置。' : 'This browser cannot auto-save a local draft. Check its privacy or storage settings.'}</div>}

    <div className="layout">
      <aside className="side-nav">
        <div className="side-intro"><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.intro}</p></div>
        <nav aria-label="Form sections">
          {sections.map(section => <button key={section.id} className={`nav-item ${section.id === active ? 'current' : ''}`} onClick={() => setActive(section.id)}>
            <span className="nav-no">{section.no}</span><span className="nav-name"><span>{isZh ? section.zh : section.en}</span><small>{isZh ? section.en : section.zh}</small></span><span className="nav-arrow">↗</span>
          </button>)}
        </nav>
        <div className="side-foot"><span>{String(index + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}</span><span>{progress}%</span></div>
      </aside>

      <main className="form-main">
        {submitted ? <div className="success-panel"><span className="success-mark">✓</span><span className="eyebrow">APPLICATION RECEIVED</span><h2>{isZh ? '申请已提交' : 'Application submitted'}</h2><p>{isZh ? '感谢你认真完成这份申请。我们会在下一轮联系你。' : 'Thank you for taking the time to apply. We will be in touch about the next stage.'}</p><button className="next-btn" onClick={() => setSubmitted(false)}>{isZh ? '返回查看申请' : 'Review application'} <span className="next-icon">→</span></button></div> : <>
          <div className="mobile-heading"><span className="eyebrow">{current.no} / {isZh ? current.zh : current.en}</span><h2>{isZh ? current.zh : current.en}</h2></div>
          {submitAttempted && missingLabels.length > 0 && <div className="validation-summary" role="alert"><strong>{isZh ? '请完成所有必填问题后再提交。' : 'Complete every required question before submitting.'}</strong><p>{missingLabels.join(isZh ? '、' : ', ')}</p></div>}
          {active === 'instructions' && <Instructions isZh={isZh} />}
          {active === 'basics' && <Basics language={lang} form={form} set={set} errors={errors} />}
          {active === 'core-one' && <CoreOne language={lang} form={form} set={set} errors={errors} />}
          {active === 'core-two' && <CoreTwo language={lang} form={form} set={set} errors={errors} onUpload={file => uploadFile('processFile', file)} uploading={uploading.processFile} uploadError={uploadError.processFile} />}
          {active === 'video' && <Video language={lang} form={form} set={set} errors={errors} onUpload={file => uploadFile('videoFile', file)} uploading={uploading.videoFile} uploadError={uploadError.videoFile} />}
          {active === 'confirmation' && <Confirmation language={lang} form={form} set={set} toggle={toggle} errors={errors} />}
          <div className="form-footer"><span className="required-note">{copy.required}</span><div className="footer-actions">{index > 0 && <button className="back-btn" onClick={goBack}>← <span>{copy.back}</span></button>}<button className="next-btn" onClick={goNext}><span>{index === sections.length - 1 ? copy.submit : copy.next}</span><span className="next-icon">→</span></button></div></div>
        </>}
      </main>
    </div>
  </div>
}

function Instructions({ isZh }) {
  return <div className="section-body instruction-body">
    <SectionIntro no="00" title="填写说明｜Before You Begin" />
    {isZh ? <>
      <p>我们不要求你已经很厉害，也不在意你的回答写得是否漂亮。</p>
      <p>我们想知道三件事：</p>
      <ul><li>你真的做过什么？</li><li>什么东西会让你忍不住一直追下去？</li><li>没人告诉你下一步的时候，你会怎么办？</li></ul>
      <p>代码、产品、论文、实验、机器人、游戏、公司，甚至一次失败都可以。具体的东西比宏大的目标更有用。</p>
      <p>你可以使用 AI 翻译、整理或讨论，但请保留自己的判断。我们可能会在下一轮随便挑一个回答继续追问。</p>
      <p>不要猜我们想听什么。</p>
    </> : <>
      <p>We don’t expect you to be accomplished, and we don’t care whether your answers sound impressive.</p>
      <p>We want to understand three things:</p>
      <ul><li>What have you actually done?</li><li>What do you keep pursuing without being asked?</li><li>What do you do when nobody tells you what to do next?</li></ul>
      <p>Code, products, papers, experiments, robots, games, companies, or even a failed attempt are all useful. Concrete evidence matters more than ambitious claims.</p>
      <p>You may use AI to translate, organize, or discuss your answers, but keep your own judgment. We may ask you about anything you submit.</p>
      <p>Don’t try to guess what we want to hear.</p>
    </>}
  </div>
}

function Basics({ language, form, set, errors }) {
  const isZh = language === 'zh'
  return <div className="section-body"><SectionIntro no="一" title={isZh ? '基本信息｜Basic Information' : 'Basic Information｜基本信息'} />
    <Question no="01" title={isZh ? '个人信息｜Personal Information' : 'Personal Information｜个人信息'}><p>{isZh ? '姓名、出生日期、国籍、常住城市、邮箱、手机号、微信或其他联系方式。' : 'Full name, date of birth, nationality, current city, email, phone number, WeChat, or another contact method.'}</p></Question>
    <div className="field-grid two"><Field label={isZh ? '姓名' : 'Full name'} error={errors.name}><input aria-label={isZh ? '姓名' : 'Full name'} value={form.name} onChange={event => set('name', event.target.value)} /></Field><Field label={isZh ? '出生日期' : 'Date of birth'} error={errors.birthday}><input aria-label={isZh ? '出生日期' : 'Date of birth'} type="date" value={form.birthday} onChange={event => set('birthday', event.target.value)} /></Field></div>
    <div className="field-grid three"><Field label={isZh ? '国籍' : 'Nationality'} error={errors.nationality}><input aria-label={isZh ? '国籍' : 'Nationality'} value={form.nationality} onChange={event => set('nationality', event.target.value)} /></Field><Field label={isZh ? '常住城市' : 'Current city'} error={errors.city}><input aria-label={isZh ? '常住城市' : 'Current city'} value={form.city} onChange={event => set('city', event.target.value)} /></Field><Field label={isZh ? '邮箱' : 'Email'} error={errors.email}><input aria-label={isZh ? '邮箱' : 'Email'} type="email" value={form.email} onChange={event => set('email', event.target.value)} /></Field></div>
    <div className="field-grid two"><Field label={isZh ? '手机号' : 'Phone number'} error={errors.phone}><input aria-label={isZh ? '手机号' : 'Phone number'} value={form.phone} onChange={event => set('phone', event.target.value)} /></Field><Field label={isZh ? '微信或其他联系方式' : 'WeChat or another contact method'} error={errors.contact}><input aria-label={isZh ? '微信或其他联系方式' : 'WeChat or another contact method'} value={form.contact} onChange={event => set('contact', event.target.value)} /></Field></div>
    <div className="rule" />
    <Question no="02" title={isZh ? '目前状态｜Current Status' : 'Current Status｜目前状态'}>
      <p>{isZh ? '请选择最符合你当前情况的一项：' : 'Choose the option that best describes your current status:'}</p>
      <ul>{STATUS_OPTIONS.map(option => <li key={option.value}>{option[language]}</li>)}</ul>
      <p>{isZh ? '请具体填写学校、专业、年级或当前正在做的事情。' : 'Please include your school, major, year, or what you are currently working on.'}</p>
    </Question>
    <Field label={isZh ? '目前状态' : 'Current status'} error={errors.status}><div className="pill-grid">{STATUS_OPTIONS.map(option => <button type="button" key={option.value} className={form.status === option.value ? 'selected' : ''} onClick={() => set('status', option.value)}>{option[language]}</button>)}</div></Field>
    <Field label={isZh ? '学校、专业、年级或当前正在做的事情' : 'School, major, year, or what you are currently working on'} error={errors.school}><input aria-label={isZh ? '学校、专业、年级或当前正在做的事情' : 'School, major, year, or current work'} value={form.school} onChange={event => set('school', event.target.value)} /></Field>
  </div>
}

function CoreOne({ language, form, set, errors }) {
  const isZh = language === 'zh'
  return <div className="section-body"><SectionIntro no="二" title={isZh ? '核心问题｜Core Questions' : 'Core Questions｜核心问题'} />
    <Question no="03" title={isZh ? '请告诉我们你做过最重要的一件事｜Tell us about the most important thing you have done' : 'Tell us about the most important thing you have done｜请告诉我们你做过最重要的一件事'}>
      {isZh ? <><p>不一定是最成功的。</p><p>可以是代码、产品、论文、实验、机器人、硬件、游戏、公司、内容、社区，或者任何你认真做过的东西。</p><p>请告诉我们：</p><ul><li>你为什么开始做它</li><li>你具体做了什么</li><li>哪些部分不是你做的</li><li>最难的地方是什么</li><li>最后发生了什么</li><li>如果有，请提供代码、数据、用户、实验结果、版本记录或其他证据</li></ul><p>我们不在意它看起来有多厉害，更想知道你到底做了什么。</p><p>最多 300 字。</p></> : <><p>It does not have to be your most successful work.</p><p>It can be code, a product, paper, experiment, robot, hardware project, game, company, content, community, or anything you seriously worked on.</p><p>Please tell us:</p><ul><li>Why you started it</li><li>What you specifically did</li><li>Which parts were not done by you</li><li>What was the hardest part</li><li>What happened in the end</li><li>If available, provide code, data, users, experiment results, version history, or other evidence</li></ul><p>We care less about how impressive it looks than about what you actually did.</p><p>Maximum 300 words.</p></>}
    </Question>
    <Field label={isZh ? '回答' : 'Answer'} error={errors.mostImportantWork}><TextArea label={isZh ? '第 3 题回答' : 'Question 3 answer'} value={form.mostImportantWork} onChange={event => set('mostImportantWork', event.target.value)} limit={TEXT_LIMITS.mostImportantWork} language={language} /></Field>
    <div className="rule" />
    <Question no="04" title={isZh ? '【选填】如果还有一件完全不同的作品能帮助我们理解你，可以提交｜Optional: Share another substantially different piece of work' : 'Optional: Share another substantially different piece of work｜【选填】如果还有一件完全不同的作品能帮助我们理解你，可以提交'}><p>{isZh ? '最多 200 字，可附链接或证据。' : 'Maximum 200 words. Links or evidence may be included.'}</p></Question>
    <Field label={isZh ? '回答' : 'Answer'} required={false} error={errors.optionalDifferentWork}><TextArea label={isZh ? '第 4 题回答' : 'Question 4 answer'} value={form.optionalDifferentWork} onChange={event => set('optionalDifferentWork', event.target.value)} limit={TEXT_LIMITS.optionalDifferentWork} language={language} /></Field>
    <div className="rule" />
    <Question no="05" title={isZh ? '过去一年，你靠自己学会的最难的一件事是什么？｜What is the hardest thing you taught yourself in the past year?' : 'What is the hardest thing you taught yourself in the past year?｜过去一年，你靠自己学会的最难的一件事是什么？'}>
      {isZh ? <><p>告诉我们你一开始不会什么，在哪里卡了最久，以及最后是怎么弄明白的。</p><p>如果你用过 AI、老师、朋友、论文、课程或开源项目，也请告诉我们它们分别帮了你什么。</p><p>不超过 250 字。</p></> : <><p>Tell us what you did not know at the beginning, where you were stuck the longest, and how you eventually figured it out.</p><p>If you used AI, teachers, friends, papers, courses, or open-source projects, tell us what each of them helped you with.</p><p>Maximum 250 words.</p></>}
    </Question>
    <Field label={isZh ? '回答' : 'Answer'} error={errors.selfTaughtChallenge}><TextArea label={isZh ? '第 5 题回答' : 'Question 5 answer'} value={form.selfTaughtChallenge} onChange={event => set('selfTaughtChallenge', event.target.value)} limit={TEXT_LIMITS.selfTaughtChallenge} language={language} /></Field>
    <div className="rule" />
    <Question no="06" title={isZh ? '什么事情会让你忘记时间？｜What makes you lose track of time?' : 'What makes you lose track of time?｜什么事情会让你忘记时间？'}>
      {isZh ? <><p>过去半年，有没有一件事情，你会自己一直做下去，即使没有作业、比赛、老师、老板或截止日期？</p><p>你在做什么？最近一次是什么时候？你连续做了多久？</p><p>不超过 150 字。</p></> : <><p>In the past six months, is there something you kept doing on your own even without homework, competitions, teachers, bosses, or deadlines?</p><p>What were you doing? When was the most recent time? How long did you keep doing it continuously?</p><p>Maximum 150 words.</p></>}
    </Question>
    <Field label={isZh ? '回答' : 'Answer'} error={errors.loseTrackOfTime}><TextArea label={isZh ? '第 6 题回答' : 'Question 6 answer'} value={form.loseTrackOfTime} onChange={event => set('loseTrackOfTime', event.target.value)} limit={TEXT_LIMITS.loseTrackOfTime} language={language} /></Field>
  </div>
}

function CoreTwo({ language, form, set, errors, onUpload, uploading, uploadError }) {
  const isZh = language === 'zh'
  return <div className="section-body"><SectionIntro no="二" title={isZh ? '核心问题｜Core Questions' : 'Core Questions｜核心问题'} />
    <Question no="07" title={isZh ? '有什么事情是你相信的，但身边很多聪明的人不同意？｜What is something you believe that many smart people around you disagree with?' : 'What is something you believe that many smart people around you disagree with?｜有什么事情是你相信的，但身边很多聪明的人不同意？'}>
      {isZh ? <><p>为什么你仍然这么认为？</p><p>什么证据会让你改变想法？</p><p>不超过 200 字。</p></> : <><p>Why do you still believe it?</p><p>What evidence would change your mind?</p><p>Maximum 200 words.</p></>}
    </Question>
    <Field label={isZh ? '回答' : 'Answer'} error={errors.disagreement}><TextArea label={isZh ? '第 7 题回答' : 'Question 7 answer'} value={form.disagreement} onChange={event => set('disagreement', event.target.value)} limit={TEXT_LIMITS.disagreement} language={language} /></Field>
    <div className="rule" />
    <Question no="08" title={isZh ? '如果接下来一个月完全由你自己决定，你最想把什么做出来或弄明白？｜If you could decide everything for the next month, what would you most want to build or figure out?' : 'If you could decide everything for the next month, what would you most want to build or figure out?｜如果接下来一个月完全由你自己决定，你最想把什么做出来或弄明白？'}>
      {isZh ? <><p>为什么是它？</p><p>你已经开始了吗？如果开始了，做到了哪里？</p><p>明天你会做的第一件事是什么？</p><p>不超过 250 字。</p></> : <><p>Why this?</p><p>Have you already started? If so, how far have you gotten?</p><p>What is the first thing you will do tomorrow?</p><p>Maximum 250 words.</p></>}
    </Question>
    <Field label={isZh ? '回答' : 'Answer'} error={errors.nextMonth}><TextArea label={isZh ? '第 8 题回答' : 'Question 8 answer'} value={form.nextMonth} onChange={event => set('nextMonth', event.target.value)} limit={TEXT_LIMITS.nextMonth} language={language} /></Field>
    <div className="rule" />
    <Question no="09" title={isZh ? '给我们看一点你做事的过程｜Show us a little of your process' : 'Show us a little of your process｜给我们看一点你做事的过程'}>
      {isZh ? <><p>Git history、实验记录、版本历史、学习笔记、失败记录、草稿、用户聊天、项目复盘都可以。</p><p>不需要整理，也不需要漂亮。原始材料更好。</p><p>附件或链接。</p></> : <><p>Git history, experiment records, version history, learning notes, failure records, drafts, user conversations, or project retrospectives are all acceptable.</p><p>You do not need to organize or polish it. Raw material is better.</p><p>Attachment or link.</p></>}
    </Question>
    <UploadBox id="process-file" attachment={form.processFile} accept=".pdf,.txt,.md,.doc,.docx,image/*" onUpload={onUpload} uploading={uploading} error={uploadError || errors.processEvidence} language={language} />
    <Field label={isZh ? '链接' : 'Link'} error={errors.processEvidence && !form.processFile?.fileToken ? errors.processEvidence : ''}><input aria-label={isZh ? '第 9 题链接' : 'Question 9 link'} type="url" value={form.process} onChange={event => set('process', event.target.value)} placeholder="https://" /></Field>
    <div className="rule" />
    <Question no="10" title={isZh ? '参与安排｜Participation' : 'Participation｜参与安排'}>
      {isZh ? <><p>如果加入：</p><ul><li>最早什么时候可以开始？</li><li>每周真实能来几天？</li><li>预计持续多久？</li><li>是否需要住宿？</li><li>目前有哪些无法放下的学校、工作或项目安排？</li></ul></> : <><p>If you join:</p><ul><li>When can you start at the earliest?</li><li>How many days per week can you realistically participate?</li><li>How long do you expect to participate?</li><li>Do you need housing?</li><li>What school, work, or project commitments do you currently need to maintain?</li></ul></>}
    </Question>
    <div className="field-grid four"><Field label={isZh ? '最早开始时间' : 'Earliest start date'} error={errors.start}><input aria-label={isZh ? '最早开始时间' : 'Earliest start date'} type="date" value={form.start} onChange={event => set('start', event.target.value)} /></Field><Field label={isZh ? '每周真实能来几天' : 'Days per week'} error={errors.days}><input aria-label={isZh ? '每周真实能来几天' : 'Days per week'} value={form.days} onChange={event => set('days', event.target.value)} /></Field><Field label={isZh ? '预计持续多久' : 'Expected duration'} error={errors.duration}><input aria-label={isZh ? '预计持续多久' : 'Expected duration'} value={form.duration} onChange={event => set('duration', event.target.value)} /></Field><Field label={isZh ? '是否需要住宿' : 'Do you need housing?'} error={errors.housing}><div className="radio-row"><label><input type="radio" name="housing" checked={form.housing === 'yes'} onChange={() => set('housing', 'yes')} /> {isZh ? '是' : 'Yes'}</label><label><input type="radio" name="housing" checked={form.housing === 'no'} onChange={() => set('housing', 'no')} /> {isZh ? '否' : 'No'}</label></div></Field></div>
    <Field label={isZh ? '目前有哪些无法放下的学校、工作或项目安排？' : 'What school, work, or project commitments do you currently need to maintain?'} error={errors.existingCommitments}><TextArea label={isZh ? '目前无法放下的安排' : 'Current commitments'} value={form.existingCommitments} onChange={event => set('existingCommitments', event.target.value)} language={language} /></Field>
  </div>
}

function Video({ language, form, set, errors, onUpload, uploading, uploadError }) {
  const isZh = language === 'zh'
  return <div className="section-body"><SectionIntro no="三" title={isZh ? '视频｜Video' : 'Video｜视频'} />
    <Question no="11" title={isZh ? '两分钟，不剪辑，不念稿｜Two minutes, unedited, no script' : 'Two minutes, unedited, no script｜两分钟，不剪辑，不念稿'}>
      {isZh ? <><p>告诉我们：</p><ul><li>你最近最着迷的一件事是什么？</li><li>然后，拿一个你最近真的做过的东西给我们看，并讲讲你现在最不满意它的地方。</li></ul><p>中文或英文均可。</p></> : <><p>Tell us:</p><ul><li>What is something you have been most fascinated by recently?</li><li>Then show us something you have actually made or worked on recently, and tell us what you are currently least satisfied with about it.</li></ul><p>Chinese or English is acceptable.</p></>}
    </Question>
    <UploadBox id="video-file" attachment={form.videoFile} accept="video/mp4,video/quicktime,video/webm" onUpload={onUpload} uploading={uploading} error={uploadError || errors.videoEvidence} language={language} kind="video" />
    <Field label={isZh ? '视频链接' : 'Video link'} error={errors.videoEvidence && !form.videoFile?.fileToken ? errors.videoEvidence : ''}><input aria-label={isZh ? '第 11 题视频链接' : 'Question 11 video link'} type="url" value={form.video} onChange={event => set('video', event.target.value)} placeholder="https://" /></Field>
  </div>
}

function Confirmation({ language, form, set, toggle, errors }) {
  const isZh = language === 'zh'
  return <div className="section-body"><SectionIntro no="—" title={isZh ? 'AI 使用说明｜AI Use' : 'AI Use｜AI 使用说明'} />
    <Question no="AI" title={isZh ? '你在完成申请时如何使用了 AI？｜How did you use AI while completing this application?' : 'How did you use AI while completing this application?｜你在完成申请时如何使用了 AI？'}>
      <p>{isZh ? '可多选：' : 'Select all that apply:'}</p><ul>{AI_OPTIONS.map(option => <li key={option.value}>{option[language]}</li>)}</ul><p>{isZh ? '请简要说明。' : 'Please explain briefly.'}</p>
    </Question>
    <Field label={isZh ? 'AI 使用方式' : 'AI use'} error={errors.ai}><OptionList options={AI_OPTIONS} values={form.ai} onToggle={value => toggle('ai', value)} language={language} /></Field>
    <Field label={isZh ? '请简要说明' : 'Please explain briefly'} error={errors.aiNote}><textarea aria-label={isZh ? 'AI 使用说明' : 'AI use explanation'} value={form.aiNote} onChange={event => set('aiNote', event.target.value)} /></Field>
    <div className="rule" />
    <SectionIntro no="—" title={isZh ? '申请人确认｜Applicant Confirmation' : 'Applicant Confirmation｜申请人确认'} />
    <div className={`confirm-block ${errors.confirmed ? 'field-invalid' : ''}`}>
      <label className="confirm-row"><input type="checkbox" checked={form.confirmed} onChange={event => set('confirmed', event.target.checked)} /><span className="fake-check">✓</span><span>{isZh ? '我确认申请中的经历、作品和结果真实，已经清楚说明个人贡献，并如实披露 AI 的使用方式。我愿意在下一轮解释任何回答和提交材料。' : 'I confirm that the experiences, work, and results in this application are truthful, that I have clearly described my personal contribution, and that I have disclosed how I used AI. I am willing to explain any answer or submitted material in the next stage.'}</span></label>
      {errors.confirmed && <span className="field-error" role="alert">{errors.confirmed}</span>}
      <div className="field-grid two"><Field label={isZh ? '姓名｜Name' : 'Name｜姓名'} error={errors.confirmName}><input aria-label={isZh ? '确认姓名' : 'Confirmation name'} value={form.confirmName} onChange={event => set('confirmName', event.target.value)} /></Field><Field label={isZh ? '日期｜Date' : 'Date｜日期'} error={errors.confirmDate}><input aria-label={isZh ? '确认日期' : 'Confirmation date'} type="date" value={form.confirmDate} onChange={event => set('confirmDate', event.target.value)} /></Field></div>
    </div>
  </div>
}

export default App

createRoot(document.getElementById('root')).render(<App />)
