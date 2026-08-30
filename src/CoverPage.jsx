import { useEffect, useState } from 'react'

const coverCopy = {
  zh: {
    application: '2026 长期申请',
    heroLine: '你不需要等到准备好了，才开始做真正的事情。',
    scroll: '向下探索',
    applyEyebrow: 'N1 AI SCHOOL / APPLICATIONS OPEN',
    applyTitle: '开始申请',
    applyEnglish: 'Apply now',
    applyNote: '面向全球 16–25 岁年轻人，专业、学校、学历与国籍不限。',
    quote: 'School teaches the fundamentals, N1 starts where school ends.',
    storiesTitle: '在这里，成长发生在真实工作里。',
    stories: [
      ['01 / WHO', '为主动、学得快、持续做东西、对真实问题着迷的年轻人而建。'],
      ['02 / LEARN', '一边补基础，一边进入真实项目。问题越来越难，你越来越不需要别人告诉你下一步。'],
      ['03 / SUPPORT', '免费工作空间、算力、项目和反馈；长期参与者可获得住宿与生活支持。'],
      ['04 / OPEN', '面向全球 16–25 岁开放，专业、学校、学历与国籍不限。'],
      ['05 / PROOF', '少介绍梦想，多展示行动。代码、产品、论文、实验与失败记录，都是证明。']
    ],
    spaceLabel: '上海 / SHANGHAI',
    spaceText: '独立空间、工作区、公寓、图书馆与讨论空间，让生活真正围绕创造重新组织。',
    contactTitle: '联系我们',
    contactEnglish: 'Contact Us',
    email: '邮箱',
    wechat: '公众号',
    red: '小红书',
    footer: 'N1 AI SCHOOL / SHANGHAI / 2026'
  },
  en: {
    application: '2026 OPEN APPLICATION',
    heroLine: 'You do not need to feel ready before starting work that matters.',
    scroll: 'SCROLL TO EXPLORE',
    applyEyebrow: 'N1 AI SCHOOL / APPLICATIONS OPEN',
    applyTitle: 'Apply now',
    applyEnglish: '开始申请',
    applyNote: 'Open globally to ages 16–25, regardless of school, degree, field, or nationality.',
    quote: 'School teaches the fundamentals, N1 starts where school ends.',
    storiesTitle: 'Here, growth happens through real work.',
    stories: [
      ['01 / WHO', 'For young people who learn fast, build often, and chase real problems.'],
      ['02 / LEARN', 'Learn fundamentals through real work. Own harder problems over time.'],
      ['03 / SUPPORT', 'Space, compute, projects, and feedback. Living support for residents.'],
      ['04 / OPEN', 'Open to ages 16–25, across schools, fields, degrees, and borders.'],
      ['05 / PROOF', 'Show action: code, products, research, experiments, even failures.']
    ],
    spaceLabel: 'SHANGHAI / 上海',
    spaceText: 'Studios, homes, a library, and shared spaces built for long, focused work.',
    contactTitle: 'Contact Us',
    contactEnglish: '联系我们',
    email: 'EMAIL',
    wechat: 'WECHAT',
    red: 'REDNOTE',
    footer: 'N1 AI SCHOOL / SHANGHAI / 2026'
  }
}

function LanguageToggle({ lang, setLang }) {
  return <div className="cover-language" role="group" aria-label="Language">
    <button className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>中</button>
    <span>/</span>
    <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
  </div>
}

export default function CoverPage({ lang, setLang, onApply }) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const copy = coverCopy[lang]

  useEffect(() => {
    let frame
    const update = () => {
      const distance = Math.min(window.innerHeight * 0.82, 760)
      setScrollProgress(Math.min(window.scrollY / distance, 1))
      frame = null
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const markStyle = {
    top: `${(window.innerHeight * 0.5) + ((window.innerWidth <= 680 ? 29.5 : 35) - (window.innerHeight * 0.5)) * scrollProgress}px`,
    transform: `translate(-50%, -50%) scale(${1 - (scrollProgress * 0.86)})`
  }

  return <div className="cover-page">
    <header className="cover-nav">
      <span>{copy.application}</span>
      <LanguageToggle lang={lang} setLang={setLang} />
    </header>

    <div className="cover-brand-lockup" style={markStyle} aria-hidden="true">
      <span className="cover-brand-n1">N1</span>
      <span className="cover-brand-school">AI SCHOOL</span>
    </div>

    <main>
      <section className="cover-hero">
        <h1 className="sr-only">N1 AI School</h1>
        <div className="cover-hero-foot" style={{ opacity: Math.max(0, 1 - scrollProgress * 3) }}>
          <span>N1 AI SCHOOL / SHANGHAI</span>
          <p>{copy.heroLine}</p>
          <span className="cover-scroll"><i />{copy.scroll}</span>
        </div>
      </section>

      <section className="cover-apply-section">
        <span className="cover-kicker">{copy.applyEyebrow}</span>
        <div className="cover-apply-copy">
          <h2>{copy.applyTitle}<small>{copy.applyEnglish}</small></h2>
          <p>{copy.applyNote}</p>
        </div>
        <button className="cover-apply-button" onClick={onApply}>
          <span>{copy.applyTitle}</span>
          <span aria-hidden="true">↗</span>
        </button>
      </section>

      <section className="cover-quote">
        <span className="cover-kicker">N1 AI SCHOOL / PRINCIPLE</span>
        <blockquote>{copy.quote}</blockquote>
      </section>

      <section className="cover-stories">
        <header>
          <span className="cover-kicker">N1 AI SCHOOL / 01—05</span>
          <h2>{copy.storiesTitle}</h2>
        </header>
        <div className="cover-story-grid">
          {copy.stories.map(([label, text], index) => <article className={`cover-story cover-story-${index + 1}`} key={label}>
            <span>{label}</span>
            <p>{text}</p>
          </article>)}
        </div>
      </section>

      <section className="cover-space">
        <div>
          <span className="cover-kicker">{copy.spaceLabel}</span>
          <strong>4,000 <small>m²</small></strong>
        </div>
        <p>{copy.spaceText}</p>
      </section>

      <section className="cover-contact">
        <span className="cover-kicker">N1 AI SCHOOL / CONTACT</span>
        <div className="cover-contact-heading">
          <h2>{copy.contactTitle}</h2>
          <span>{copy.contactEnglish}</span>
        </div>
        <div className="cover-contact-list">
          <a href="mailto:neuronone@vip.163.com"><span>{copy.email}</span><strong>neuronone@vip.163.com</strong><i>↗</i></a>
          <div><span>{copy.wechat}</span><strong>董科含</strong></div>
          <a href="https://xhslink.cn/m/8UK5pRNID95" target="_blank" rel="noreferrer"><span>{copy.red}</span><strong>起点计划</strong><i>↗</i></a>
        </div>
        <footer>{copy.footer}</footer>
      </section>
    </main>
  </div>
}
