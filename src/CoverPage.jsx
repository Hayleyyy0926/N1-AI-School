import { useEffect, useState } from 'react'

const coverCopy = {
  zh: {
    application: '2026 首期招募',
    heroLine: 'AI 正在让年轻人更早开始做真正重要的事情。',
    scroll: '向下探索',
    applyEyebrow: 'N1 AI SCHOOL / 2026 首期招募',
    applyTitle: '开始申请',
    applyEnglish: 'Apply now',
    applyNote: '面向全球 16–25 岁。首期从 20–30 人开始，欢迎连续投入 6–12 个月。',
    quote: 'School teaches the fundamentals, N1 starts where school ends.',
    storiesTitle: '在真实问题里，成为独立的创造者。',
    stories: [
      ['01 / WHO', '为主动、学得快、持续做东西、对问题真正着迷的年轻人而建。'],
      ['02 / LEARN', '不等你学完所有东西。补基础，也尽早进入真实问题。'],
      ['03 / SUPPORT', '不收学费。工作空间、住宿、餐饮、生活费、算力与反馈，支持你长期投入。'],
      ['04 / PEOPLE', '和同样认真做事的人一起生活，很多原本遥远的事会变得可以开始。'],
      ['05 / PROOF', '少介绍梦想，多展示行动。代码、产品、论文、实验，甚至失败记录都可以。']
    ],
    spaceLabel: '上海 / SHANGHAI',
    spaceText: '上海超过 4,000 平方米的独立空间，含公寓、工作区、图书馆和讨论空间。',
    contactTitle: '联系我们',
    contactEnglish: 'Contact Us',
    email: '邮箱',
    wechat: '公众号',
    red: '小红书',
    footer: 'N1 AI SCHOOL / SHANGHAI / 2026'
  },
  en: {
    application: '2026 FIRST COHORT',
    heroLine: 'AI lets young people start doing important work earlier.',
    scroll: 'SCROLL TO EXPLORE',
    applyEyebrow: 'N1 AI SCHOOL / 2026 FIRST COHORT',
    applyTitle: 'Apply now',
    applyEnglish: '开始申请',
    applyNote: 'Open globally to ages 16–25. We begin with 20–30 people who can commit for 6–12 months.',
    quote: 'School teaches the fundamentals, N1 starts where school ends.',
    storiesTitle: 'Become an independent creator through real problems.',
    stories: [
      ['01 / WHO', 'For young people who learn fast, build often, and stay obsessed with real questions.'],
      ['02 / LEARN', 'You do not wait to finish learning. Build fundamentals while entering real problems early.'],
      ['03 / SUPPORT', 'No tuition. Space, housing, meals, living support, compute, and feedback for sustained work.'],
      ['04 / PEOPLE', 'Live and work alongside people who take their questions seriously. Distant work starts to feel possible.'],
      ['05 / PROOF', 'Show action, not just ambition: code, products, papers, experiments, even failures.']
    ],
    spaceLabel: 'SHANGHAI / 上海',
    spaceText: 'Over 4,000 m² in Shanghai: apartments, studios, a library, and shared spaces for focused work.',
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
