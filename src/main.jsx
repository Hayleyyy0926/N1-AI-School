import { createRoot } from 'react-dom/client'
import { useEffect, useMemo, useState } from 'react'
import CoverPage from './CoverPage.jsx'
import './styles.css'

const sections = [
  { id: 'basics', no: '01', zh: '基本信息', en: 'Basic information' },
  { id: 'work', no: '02', zh: '你做过什么', en: 'What you have done' },
  { id: 'learning', no: '03', zh: '如何学习与选择', en: 'How you learn & choose' },
  { id: 'commitment', no: '04', zh: '时间与承诺', en: 'Time & commitment' },
  { id: 'video', no: '05', zh: '视频', en: 'Video' },
  { id: 'reference', no: '06', zh: '推荐人与补充', en: 'Reference & final note' },
]

const statusOptionsZh = ['高中', '大学', 'Gap Year', '休学或退学', '工作', '研究', '创业', '其他']
const statusOptionsEn = ['High school', 'University', 'Gap year', 'Leave of absence or dropout', 'Working', 'Research', 'Startup', 'Other']
const participationOptionsZh = ['Gap Year 或休学期间全职参与', '毕业后长期入驻', '江浙沪地区每周稳定参与', '寒暑假集中参与', '围绕具体项目合作', '作为长期社区成员持续回来']
const participationOptionsEn = ['Full-time during a gap year or leave', 'Long-term residency after graduation', 'Regular weekly participation from Shanghai–Jiangsu–Zhejiang', 'Intensive participation during school breaks', 'Project-based collaboration', 'Long-term community membership']
const localDraftKey = 'n1-application-draft-v1'
const submissionKey = 'n1-submission'
const emptyForm = {
  name: '', birthday: '', nationality: '', city: '', email: '', phone: '', contact: '',
  status: '', school: '', participation: [], start: '', days: '', duration: '', housing: '',
  project1: '', project2: '', contribution: '', impact: '', learning: '', pursuit: '', process: '', processFile: null,
  commitment: '', video: '', videoFile: null, refName: '', refContact: '', refWork: '', refAllowed: '', final: '',
  ai: [], aiNote: '', confirmed: false, confirmName: '', confirmDate: ''
}

const readStoredJson = key => {
  try { return JSON.parse(window.localStorage.getItem(key) || 'null') } catch { return null }
}

const loadLocalDraft = () => {
  const draft = readStoredJson(localDraftKey)
  if (!draft || draft.version !== 1 || typeof draft.form !== 'object') return null
  const form = {
    ...emptyForm,
    ...draft.form,
    participation: Array.isArray(draft.form.participation) ? draft.form.participation : [],
    ai: Array.isArray(draft.form.ai) ? draft.form.ai : [],
    confirmed: Boolean(draft.form.confirmed),
    // Browsers do not restore native file inputs, but uploaded attachment metadata is durable.
    processFile: draft.form.processFile && typeof draft.form.processFile === 'object' ? draft.form.processFile : null,
    videoFile: draft.form.videoFile && typeof draft.form.videoFile === 'object' ? draft.form.videoFile : null
  }
  return {
    form,
    language: draft.language === 'en' ? 'en' : 'zh',
    activeSection: sections.some(section => section.id === draft.activeSection) ? draft.activeSection : 'basics',
    projectCount: draft.projectCount === 2 || form.project2 ? 2 : 1
  }
}

const storeJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function Field({ label, hint, children, required = false, className = '' }) {
  return <label className={`field ${className}`}>
    <span className="field-label">{label}{required && <b className="required">*</b>}</span>
    {hint && <span className="field-hint">{hint}</span>}
    {children}
  </label>
}

function TextArea({ value, onChange, placeholder, maxLength }) {
  return <div className="textarea-wrap">
    <textarea value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} />
    {maxLength && <span className="count">{value.length} / {maxLength}</span>}
  </div>
}

function CheckList({ options, values, onToggle }) {
  return <div className="check-list">
    {options.map(option => <label className="check-row" key={option}>
      <input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />
      <span className="fake-check" aria-hidden="true">✓</span>
      <span>{option}</span>
    </label>)}
  </div>
}

function App() {
  const [initialDraft] = useState(loadLocalDraft)
  const [initialSubmission] = useState(() => readStoredJson(submissionKey))
  const [lang, setLang] = useState(initialDraft?.language || 'zh')
  const [active, setActive] = useState(initialDraft?.activeSection || 'basics')
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState(initialDraft?.form || { ...emptyForm })
  const [projectCount, setProjectCount] = useState(initialDraft?.projectCount || 1)
  const [submitted, setSubmitted] = useState(initialSubmission?.status === 'submitted')
  const [submission, setSubmission] = useState(initialSubmission)
  const [storageError, setStorageError] = useState(false)
  const [uploading, setUploading] = useState({})
  const [uploadError, setUploadError] = useState({})
  const [page, setPage] = useState(() => window.location.hash === '#apply' ? 'application' : 'cover')
  const isZh = lang === 'zh'
  const copy = useMemo(() => ({
    eyebrow: isZh ? 'N1 AI SCHOOL / APPLICATION 2026' : 'N1 AI SCHOOL / APPLICATION 2026',
    title: isZh ? '申请表' : 'Application',
    intro: isZh ? '我们更关心你做过什么、正在追什么，以及你能否持续行动。' : 'We care about what you have done, what you are pursuing, and whether you can keep moving.',
    subintro: isZh ? '具体、真实、有证据，比完整和漂亮更重要。' : 'Specific, honest, and verifiable answers matter most.',
    save: isZh ? '保存草稿' : 'Save draft',
    saved: isZh ? '已保存' : 'Saved',
    submitted: isZh ? '已提交' : 'Submitted',
    next: isZh ? '下一部分' : 'Next section',
    submit: isZh ? '提交申请' : 'Submit application',
    back: isZh ? '上一部分' : 'Previous section',
    required: isZh ? '带 * 为必填项' : 'Fields marked * are required',
  }), [isZh])

  useEffect(() => {
    const stored = storeJson(localDraftKey, {
      version: 1,
      language: lang,
      activeSection: active,
      projectCount,
      form,
      savedAt: new Date().toISOString()
    })
    setStorageError(!stored)
  }, [active, form, lang, projectCount])

  useEffect(() => {
    const syncPage = () => {
      setPage(window.location.hash === '#apply' ? 'application' : 'cover')
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const toggle = (key, value) => set(key, form[key].includes(value) ? form[key].filter(v => v !== value) : [...form[key], value])
  const index = sections.findIndex(s => s.id === active)
  const progress = Math.round(((index + 1) / sections.length) * 100)
  const current = sections[index]

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
    const maxBytes = 4 * 1024 * 1024
    if (file.size > maxBytes) {
      setUploadError(prev => ({ ...prev, [key]: isZh ? '文件不能超过 4 MB。' : 'Files must be 4 MB or smaller.' }))
      return
    }
    setUploadError(prev => ({ ...prev, [key]: '' }))
    setUploading(prev => ({ ...prev, [key]: true }))
    try {
      let auth = submission
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
      setUploadError(prev => ({ ...prev, [key]: isZh ? '上传失败，请稍后重试。' : 'Upload failed. Please try again.' }))
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }))
    }
  }

  const persist = async (status = 'draft') => {
    if (submission?.status === 'submitted' && status !== 'submitted') throw new Error('Submitted applications cannot be edited')
    const payload = { language: lang, answers: form, status }
    const response = submission
      ? await fetch(`/api/submissions/${submission.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-edit-token': submission.editToken }, body: JSON.stringify(payload) })
      : await fetch('/api/submissions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    if (!response.ok) throw new Error('Unable to save application')
    const result = await response.json()
    const nextSubmission = submission
      ? { ...submission, status: result.status }
      : { id: result.id, editToken: result.editToken, status: result.status }
    setSubmission(nextSubmission)
    if (!storeJson(submissionKey, nextSubmission)) setStorageError(true)
    return result
  }

  const goNext = async () => {
    if (index === sections.length - 1) {
      try { await persist('submitted'); setSubmitted(true) } catch (error) { console.error(error); alert(isZh ? '提交失败，请稍后再试。' : 'Submission failed. Please try again.') }
      return
    }
    if (index < sections.length - 1) setActive(sections[index + 1].id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goBack = () => {
    if (index > 0) setActive(sections[index - 1].id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (page === 'cover') return <CoverPage lang={lang} setLang={setLang} onApply={openApplication} />

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand brand-button" onClick={openCover} aria-label={isZh ? '返回首页' : 'Back to cover'}><span className="brand-mark">N1</span><span className="brand-divider" /><span className="brand-type">AI SCHOOL</span></button>
      <div className="top-actions">
        <button className="save-btn" disabled={submission?.status === 'submitted'} onClick={async () => { try { await persist('draft'); setSaved(true); setTimeout(() => setSaved(false), 1800) } catch (error) { console.error(error); alert(isZh ? '草稿保存失败，请稍后再试。' : 'Draft save failed. Please try again.') } }} aria-label={copy.save}>
          <span className="save-dot" />{submission?.status === 'submitted' ? copy.submitted : saved ? copy.saved : copy.save}
        </button>
        <div className="language-toggle" role="group" aria-label="Language">
          <button className={isZh ? 'active' : ''} onClick={() => setLang('zh')}>中</button>
          <span>/</span>
          <button className={!isZh ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
      </div>
    </header>

    <div className="progress-line"><span style={{ width: `${progress}%` }} /></div>
    {storageError && <div className="storage-warning" role="alert">{isZh ? '此浏览器无法自动保存本地草稿，请检查隐私或存储设置。' : 'This browser cannot auto-save a local draft. Check its privacy or storage settings.'}</div>}

    <div className="layout">
      <aside className="side-nav">
        <div className="side-intro"><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.intro}</p><p>{copy.subintro}</p></div>
        <nav aria-label="Form sections">
          {sections.map(section => <button key={section.id} className={`nav-item ${section.id === active ? 'current' : ''}`} onClick={() => setActive(section.id)}>
            <span className="nav-no">{section.no}</span><span className="nav-name"><span>{isZh ? section.zh : section.en}</span><small>{isZh ? section.en : section.zh}</small></span><span className="nav-arrow">↗</span>
          </button>)}
        </nav>
        <div className="side-foot"><span>{String(index + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}</span><span>{progress}%</span></div>
      </aside>

      <main className="form-main">
        {submitted ? <div className="success-panel"><span className="success-mark">✓</span><span className="eyebrow">APPLICATION RECEIVED</span><h2>{isZh ? '申请已提交' : 'Application submitted'}</h2><p>{isZh ? '感谢你认真完成这份申请。我们会在下一轮联系你。' : 'Thank you for taking the time to apply. We will be in touch about the next round.'}</p><button className="next-btn" onClick={() => setSubmitted(false)}>{isZh ? '返回查看申请' : 'Review application'} <span className="next-icon">→</span></button></div> : <>
          <div className="mobile-heading"><span className="eyebrow">{current.no} / {isZh ? current.zh : current.en}</span><h2>{isZh ? current.zh : current.en}</h2></div>
          {active === 'basics' && <Basics isZh={isZh} form={form} set={set} toggle={toggle} />}
          {active === 'work' && <Work isZh={isZh} form={form} set={set} projectCount={projectCount} setProjectCount={setProjectCount} />}
          {active === 'learning' && <Learning isZh={isZh} form={form} set={set} onUpload={file => uploadFile('processFile', file)} uploading={uploading.processFile} uploadError={uploadError.processFile} />}
          {active === 'commitment' && <Commitment isZh={isZh} form={form} set={set} />}
          {active === 'video' && <Video isZh={isZh} form={form} set={set} onUpload={file => uploadFile('videoFile', file)} uploading={uploading.videoFile} uploadError={uploadError.videoFile} />}
          {active === 'reference' && <Reference isZh={isZh} form={form} set={set} toggle={toggle} />}
          <div className="form-footer"><span className="required-note">{copy.required}</span><div className="footer-actions">{index > 0 && <button className="back-btn" onClick={goBack}>← <span>{copy.back}</span></button>}<button className="next-btn" onClick={goNext}><span>{index === sections.length - 1 ? copy.submit : copy.next}</span><span className="next-icon">→</span></button></div></div>
        </>}
      </main>
    </div>
  </div>
}

function Basics({ isZh, form, set, toggle }) {
  return <div className="section-body"><SectionIntro no="01" title={isZh ? '基本信息' : 'Basic information'} desc={isZh ? '先从你现在所处的位置开始。' : 'Start with where you are right now.'} />
    <div className="field-grid two"><Field label={isZh ? '姓名' : 'Full name'} required><input value={form.name} onChange={e => set('name', e.target.value)} placeholder={isZh ? '你的姓名' : 'Your name'} /></Field><Field label={isZh ? '出生日期' : 'Date of birth'} required><input type="date" value={form.birthday} onChange={e => set('birthday', e.target.value)} /></Field></div>
    <div className="field-grid three"><Field label={isZh ? '国籍' : 'Nationality'}><input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder={isZh ? '例如：中国' : 'e.g. China'} /></Field><Field label={isZh ? '常住城市' : 'Current city'} required><input value={form.city} onChange={e => set('city', e.target.value)} placeholder={isZh ? '你现在生活的城市' : 'Where you live now'} /></Field><Field label={isZh ? '邮箱' : 'Email'} required><input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" /></Field></div>
    <div className="field-grid two"><Field label={isZh ? '手机号' : 'Phone number'}><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={isZh ? '手机号码' : 'Phone number'} /></Field><Field label={isZh ? '微信或其他联系方式' : 'WeChat or another contact'}><input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder={isZh ? '选填' : 'Optional'} /></Field></div>
    <div className="rule" />
    <QuestionLabel no="02" title={isZh ? '目前状态' : 'Current status'} desc={isZh ? '请选择最符合你当前情况的一项。' : 'Choose the option that best describes you.'} />
    <Field label={isZh ? '状态' : 'Status'} required><div className="pill-grid">{(isZh ? statusOptionsZh : statusOptionsEn).map(option => <button type="button" key={option} className={form.status === option ? 'selected' : ''} onClick={() => set('status', option)}>{option}</button>)}</div></Field>
    <Field label={isZh ? '学校、专业、年级或当前正在做的事情' : 'School, major, year, or what you are currently working on'}><input value={form.school} onChange={e => set('school', e.target.value)} placeholder={isZh ? '用一句话介绍你现在的状态' : 'Describe your current focus in one sentence'} /></Field>
    <div className="rule" />
    <QuestionLabel no="03" title={isZh ? '你希望如何参与 N1 AI School' : 'How would you like to participate?'} desc={isZh ? '可多选，并补充你的时间安排。' : 'Select all that apply, then tell us about your availability.'} />
    <CheckList options={isZh ? participationOptionsZh : participationOptionsEn} values={form.participation} onToggle={v => toggle('participation', v)} />
    <div className="field-grid four"><Field label={isZh ? '最早开始时间' : 'Earliest start date'}><input type="date" value={form.start} onChange={e => set('start', e.target.value)} /></Field><Field label={isZh ? '每周投入天数' : 'Days per week'}><input value={form.days} onChange={e => set('days', e.target.value)} placeholder="0" /></Field><Field label={isZh ? '预计持续多久' : 'Expected duration'}><input value={form.duration} onChange={e => set('duration', e.target.value)} placeholder={isZh ? '例如：6个月' : 'e.g. 6 months'} /></Field><Field label={isZh ? '是否需要住宿' : 'Housing needed?'}><div className="radio-row"><label><input type="radio" name="housing" checked={form.housing === 'yes'} onChange={() => set('housing', 'yes')} /> {isZh ? '是' : 'Yes'}</label><label><input type="radio" name="housing" checked={form.housing === 'no'} onChange={() => set('housing', 'no')} /> {isZh ? '否' : 'No'}</label></div></Field></div>
  </div>
}

function Work({ isZh, form, set, projectCount, setProjectCount }) {
  return <div className="section-body"><SectionIntro no="02" title={isZh ? '你做过什么' : 'What you have done'} desc={isZh ? '具体、真实、有证据。最多提交两个作品。' : 'Specific, honest, and verifiable. Share up to two pieces of work.'} />
    {[...Array(projectCount)].map((_, i) => <Field key={i} label={`${isZh ? '作品' : 'Project'} ${i + 1}`} hint={isZh ? '问题、你的工作、时间、结果、链接或证据。不超过 200 字。' : 'Problem, your role, time, result, and evidence. Max 200 words.'} className="large-field"><TextArea value={form[`project${i + 1}`]} onChange={e => set(`project${i + 1}`, e.target.value)} placeholder={isZh ? '这个作品解决了什么问题？你具体做了什么？' : 'What problem did it solve? What did you personally do?'} maxLength={500} /></Field>)}
    {projectCount < 2 && <button className="text-action" onClick={() => setProjectCount(2)}>＋ {isZh ? '添加第二个作品' : 'Add a second project'}</button>}
    <div className="rule" /><QuestionLabel no="05" title={isZh ? '你真正完成了什么' : 'What did you personally contribute?'} desc={isZh ? '从上面选一个作品，讲清楚你的贡献。' : 'Choose one project and make your contribution clear.'} />
    <Field label={isZh ? '个人贡献' : 'Your contribution'}><TextArea value={form.contribution} onChange={e => set('contribution', e.target.value)} placeholder={isZh ? '哪些部分由你完成？哪些来自队友、导师、开源代码或 AI？如果拿掉你，项目会有什么不同？' : 'What was done by you versus teammates, mentors, open source, or AI? What changes without you?'} maxLength={625} /></Field>
    <div className="rule" /><QuestionLabel no="06" title={isZh ? '哪个结果最能证明你创造了真实价值' : 'Which result best proves you created real value?'} desc={isZh ? '请给出数字，并解释它为什么重要。不超过 150 字。可以是用户、收入、留存、使用频率、Star、引用、实验结果、性能提升、订单、部署效果或节省的时间。' : 'Give numbers and explain why they matter. Max 150 words. This could be users, revenue, retention, usage frequency, stars, citations, experimental results, performance gains, orders, deployment outcomes, or time saved.'} />
    <Field label={isZh ? '结果与影响' : 'Result & impact'}><TextArea value={form.impact} onChange={e => set('impact', e.target.value)} placeholder={isZh ? '例如：上线后有 2,300 名用户，留存率为 42%……' : 'e.g. 2,300 users after launch, with 42% retention...'} maxLength={375} /></Field>
  </div>
}

function Learning({ isZh, form, set, onUpload, uploading, uploadError }) {
  return <div className="section-body"><SectionIntro no="03" title={isZh ? '你如何学习与选择' : 'How you learn & choose'} desc={isZh ? '我们想了解你找到路径、穿过困难的方式。' : 'Show us how you find a path through difficulty.'} />
    <QuestionLabel no="07" title={isZh ? '过去一年，你靠自己学会的最难的一件事是什么' : 'What is the hardest thing you taught yourself?'} desc={isZh ? '为什么学？卡在哪里？如何找到路径？最后做到了什么？' : 'Why learn it? Where were you stuck? How did you find a path? What could you do by the end?'} />
    <Field label={isZh ? '你的回答' : 'Your answer'}><TextArea value={form.learning} onChange={e => set('learning', e.target.value)} placeholder={isZh ? '用一个具体的故事回答。' : 'Answer with one concrete story.'} maxLength={625} /></Field>
    <div className="rule" /><QuestionLabel no="08" title={isZh ? '你现在最认真追什么问题' : 'What problem are you seriously pursuing now?'} desc={isZh ? '问题、已做的事、最难的地方、接下来四周。' : 'The problem, what you have done, what is hardest, and the next four weeks.'} />
    <Field label={isZh ? '正在追的问题' : 'Problem in pursuit'}><TextArea value={form.pursuit} onChange={e => set('pursuit', e.target.value)} placeholder={isZh ? '不要只写方向，写清楚一个你正在验证的问题。' : 'Do not only name a direction; describe a question you are testing.'} maxLength={625} /></Field>
    <div className="rule" /><QuestionLabel no="09" title={isZh ? '请提交一份过程证据' : 'Submit one piece of process evidence'} desc={isZh ? '可以是 Git 记录、实验日志、版本历史、学习笔记、错误记录、草稿或用户反馈。' : 'Git history, experiment logs, version history, notes, error logs, drafts, or user feedback.'} />
    <div className="upload-box"><span className="upload-icon">↑</span><div><strong>{uploading ? (isZh ? '上传中…' : 'Uploading…') : form.processFile?.name || (isZh ? '拖入文件或点击上传' : 'Drop a file or click to upload')}</strong><small>{uploadError || (form.processFile?.fileToken ? (isZh ? '已上传，可随申请一起提交' : 'Uploaded and ready to submit') : isZh ? 'PDF、图片，最大 4 MB' : 'PDF or image, up to 4 MB')}</small></div><label className="upload-button" htmlFor="process-file">{isZh ? '选择文件' : 'Choose file'}</label><input id="process-file" className="file-input" type="file" accept=".pdf,image/*" onChange={e => onUpload(e.target.files?.[0])} /></div>
    <Field label={isZh ? '或者粘贴链接' : 'Or paste a link'}><input value={form.process} onChange={e => set('process', e.target.value)} placeholder="https://" /></Field>
  </div>
}

function Commitment({ isZh, form, set }) {
  return <div className="section-body"><SectionIntro no="04" title={isZh ? '时间与承诺' : 'Time & commitment'} desc={isZh ? '诚实描述你能投入的时间，以及会影响它的安排。' : 'Be honest about the time you can give and what affects it.'} />
    <QuestionLabel no="10" title={isZh ? '如果加入，你愿意投入什么' : 'What are you willing to commit?'} desc={isZh ? '每周真实投入、需要协调的安排、什么情况下会退出。不超过 200 字。' : 'Real weekly time, commitments to coordinate, and when you would leave. Max 200 words.'} />
    <Field label={isZh ? '你的承诺' : 'Your commitment'}><TextArea value={form.commitment} onChange={e => set('commitment', e.target.value)} placeholder={isZh ? '例如：每周投入 4 天；需要协调课程安排；如果……我会退出。' : 'e.g. Four days each week; coordinate coursework; I would leave if...'} maxLength={500} /></Field>
    <div className="commitment-note"><span>↗</span><p>{isZh ? '投入不是承诺的强度，而是你能持续兑现的具体安排。' : 'Commitment is not intensity. It is a concrete arrangement you can keep.'}</p></div>
  </div>
}

function Video({ isZh, form, set, onUpload, uploading, uploadError }) {
  return <div className="section-body"><SectionIntro no="05" title={isZh ? '视频' : 'Video'} desc={isZh ? '不剪辑，最长两分钟。不要念稿。' : 'Unedited, up to two minutes. Do not read from a script.'} />
    <QuestionLabel no="11" title={isZh ? '提交一段视频' : 'Submit a video'} desc={isZh ? '请直接回答：你在做什么、为什么做、过去一个月完成了什么、希望从 N1 获得什么。中文或英文均可。' : 'Answer directly: what you are working on, why, what you completed last month, and what you hope to gain. Chinese or English.'} />
    <div className="upload-box video-upload"><span className="upload-icon">◉</span><div><strong>{uploading ? (isZh ? '上传中…' : 'Uploading…') : form.videoFile?.name || (isZh ? '拖入视频或点击上传' : 'Drop a video or click to upload')}</strong><small>{uploadError || (form.videoFile?.fileToken ? (isZh ? '已上传，可随申请一起提交' : 'Uploaded and ready to submit') : isZh ? 'MP4、MOV，最大 4 MB，最长 2 分钟' : 'MP4, MOV, up to 4 MB and 2 minutes')}</small></div><label className="upload-button" htmlFor="video-file">{isZh ? '选择视频' : 'Choose video'}</label><input id="video-file" className="file-input" type="file" accept="video/mp4,video/quicktime" onChange={e => onUpload(e.target.files?.[0])} /></div>
    <Field label={isZh ? '或者粘贴视频链接' : 'Or paste a video link'}><input value={form.video} onChange={e => set('video', e.target.value)} placeholder="https://" /></Field>
  </div>
}

function Reference({ isZh, form, set, toggle }) {
  const aiOptions = isZh ? ['未使用', '翻译', '修改表达', '整理材料', '讨论问题', '生成部分初稿', '其他'] : ['Did not use AI', 'Translation', 'Editing', 'Organizing material', 'Discussing ideas', 'Generating part of a first draft', 'Other']
  return <div className="section-body"><SectionIntro no="06" title={isZh ? '推荐人与补充' : 'Reference & final note'} desc={isZh ? '请提供真正与你共事过的人。' : 'Share someone who has actually worked with you.'} />
    <QuestionLabel no="12" title={isZh ? '推荐人' : 'Reference'} desc={isZh ? '可以是队友、导师、老师、用户或合作者。' : 'A teammate, mentor, teacher, user, or collaborator.'} />
    <div className="field-grid two"><Field label={isZh ? '姓名' : 'Name'}><input value={form.refName} onChange={e => set('refName', e.target.value)} /></Field><Field label={isZh ? '联系方式' : 'Contact information'}><input value={form.refContact} onChange={e => set('refContact', e.target.value)} /></Field></div>
    <Field label={isZh ? '你们一起做过什么' : 'What did you work on together'}><input value={form.refWork} onChange={e => set('refWork', e.target.value)} /></Field>
    <Field label={isZh ? '是否允许我们联系他' : 'May we contact them?'}><div className="radio-row"><label><input type="radio" name="ref" checked={form.refAllowed === 'yes'} onChange={() => set('refAllowed', 'yes')} /> {isZh ? '可以' : 'Yes'}</label><label><input type="radio" name="ref" checked={form.refAllowed === 'no'} onChange={() => set('refAllowed', 'no')} /> {isZh ? '暂不' : 'Not yet'}</label></div></Field>
    <div className="rule" /><QuestionLabel no="13" title={isZh ? '还有什么是我们必须知道的' : 'What else do we need to know?'} desc={isZh ? '选填，不超过 150 字。' : 'Optional, max 150 words.'} /><Field label={isZh ? '补充说明' : 'Final note'}><TextArea value={form.final} onChange={e => set('final', e.target.value)} placeholder={isZh ? '选填' : 'Optional'} maxLength={375} /></Field>
    <div className="rule" /><QuestionLabel no="AI" title={isZh ? '你如何使用了 AI' : 'How did you use AI?'} desc={isZh ? '可多选，请简要说明。' : 'Select all that apply, then explain briefly.'} /><CheckList options={aiOptions} values={form.ai} onToggle={v => toggle('ai', v)} /><Field label={isZh ? 'AI 使用说明' : 'AI use note'}><input value={form.aiNote} onChange={e => set('aiNote', e.target.value)} placeholder={isZh ? '简要说明你使用 AI 的方式' : 'Briefly explain how you used AI'} /></Field>
    <div className="rule" /><div className="confirm-block"><label className="confirm-row"><input type="checkbox" checked={form.confirmed} onChange={e => set('confirmed', e.target.checked)} /><span className="fake-check">✓</span><span>{isZh ? '我确认申请中的经历、作品和结果真实，已经清楚说明个人贡献，并如实披露 AI 的使用方式。' : 'I confirm that my experiences, work, and results are truthful, that I have clearly described my contribution, and that I have disclosed my AI use.'}</span></label><div className="field-grid two"><Field label={isZh ? '姓名' : 'Name'}><input value={form.confirmName} onChange={e => set('confirmName', e.target.value)} /></Field><Field label={isZh ? '日期' : 'Date'}><input type="date" value={form.confirmDate} onChange={e => set('confirmDate', e.target.value)} /></Field></div></div>
  </div>
}

function SectionIntro({ no, title, desc }) { return <div className="section-intro"><span className="section-no">{no}</span><div><h2>{title}</h2><p>{desc}</p></div></div> }
function QuestionLabel({ no, title, desc }) { return <div className="question-label"><span className="q-no">{no}</span><div><h3>{title}</h3>{desc && <p>{desc}</p>}</div></div> }

export default App

createRoot(document.getElementById('root')).render(<App />)
