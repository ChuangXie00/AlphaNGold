import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { platformTechnologies, profile } from '../config/profile'
import { ApiClientError } from '../services/apiClient'
import { getMyProjExpList } from '../services/myProjExpService'
import type { MyProjExp } from '../services/types'
import '../styles/main-page.css'

type ErrorMessageKey =
  | 'projects.errors.network'
  | 'projects.errors.timeout'
  | 'projects.errors.unavailable'
  | 'projects.errors.invalidResponse'
  | 'projects.errors.unknown'

type ProjectsState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; data: MyProjExp[] }
  | { status: 'error'; messageKey: ErrorMessageKey }

// save key for i18n translation
function getErrorMessageKey(error: unknown): ErrorMessageKey {
  if (!(error instanceof ApiClientError)) {
    return 'projects.errors.unknown'
  }
  switch (error.kind) {
    case 'NETWORK':
      return 'projects.errors.network'

    case 'TIMEOUT':
      return 'projects.errors.timeout'

    case 'CONFIG':
    case 'HTTP':
    case 'BUSINESS':
      return 'projects.errors.unavailable'

    case 'INVALID_RESPONSE':
      return 'projects.errors.invalidResponse'

    default:
      return 'projects.errors.unknown'
  }
}

function getProjectUrl(value: string | null): string | null {
  if (!value?.trim()) {
    return null
  }

  try {
    const url = new URL(value.trim())

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

export default function MainPage() {
  const { t, i18n } = useTranslation()

  const [state, setState] = useState<ProjectsState>({
    status: 'loading',
  })

  // Every time retry increases, trigger effect to fetch again
  const [requestVersion, setRequestVersion] = useState(0)

  const language = i18n.resolvedLanguage ?? i18n.language
  const useChinese = language.toLowerCase().startsWith('zh')

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadProjects() {
      try {
        const projects = await getMyProjExpList({
          signal: controller.signal,
        })

        // when the request was suc, do not update the page
        if (!active || controller.signal.aborted) {
          return
        }

        if (projects.length === 0) {
          setState({ status: 'empty' })
        } else {
          setState({
            status: 'success',
            data: projects,
          })
        }
      } catch (error: unknown) {
        if (!active || controller.signal.aborted) {
          return
        }

        if (error instanceof ApiClientError && error.kind === 'ABORTED') {
          return
        }
        setState({
          status: 'error',
          messageKey: getErrorMessageKey(error),
        })
      }
    }

    void loadProjects()

    return () => {
      active = false
      controller.abort()
    }
  }, [requestVersion])

  function handleRetry() {
    setState({ status: 'loading' })
    setRequestVersion((current) => current + 1)
  }

  return (
    <div className="main-page">
      <header className="main-page__header">
        <div className="hero-copy">
          <p className="eyebrow">{t('main.eyebrow')}</p>
          <h1>{t('main.name')}</h1>
          <p className="hero-role">{t('main.role')}</p>
          <p className="hero-intro">{t('main.intro')}</p>
          <div className="hero-actions">
            <a className="button button--primary" href="#projects">
              {t('main.viewProjects')}
            </a>
            <a className="button button--secondary" href="#contact">
              {t('main.getInTouch')}
            </a>
          </div>
          <p className="demo-note">{t('main.demoNote')}</p>
        </div>
        <div className="profile-card">
          {profile.avatarUrl ? (
            <img
              className="profile-avatar"
              src={profile.avatarUrl}
              alt={t('main.avatarAlt')}
              width="160"
              height="160"
            />
          ) : (
            <div
              className="profile-avatar profile-avatar--initials"
              role="img"
              aria-label={t('main.avatarPlaceholder')}
            >
              <span aria-hidden="true">{profile.initials}</span>
            </div>
          )}
          <p className="profile-card__location">{t('main.location')}</p>
          <p className="profile-card__tagline">{t('main.tagline')}</p>
          <span className="profile-card__badge">{t('main.badge')}</span>
        </div>
      </header>

      <div className="background-grid">
        <section className="content-section" aria-labelledby="background-heading">
          <p className="eyebrow">{t('main.background.eyebrow')}</p>
          <h2 id="background-heading">{t('main.background.title')}</h2>
          <p>{t('main.background.intro')}</p>
          <dl className="experience-list">
            <div>
              <dt>{t('main.background.educationTitle')}</dt>
              <dd>{t('main.background.education')}</dd>
            </div>
            <div>
              <dt>{t('main.background.workTitle')}</dt>
              <dd>{t('main.background.work')}</dd>
            </div>
          </dl>
        </section>
        <section className="content-section" aria-labelledby="skills-heading">
          <p className="eyebrow">{t('main.skills.eyebrow')}</p>
          <h2 id="skills-heading">{t('main.skills.title')}</h2>
          <p>{t('main.skills.intro')}</p>
          <ul className="skill-list">
            {['frontend', 'backend', 'data'].map((skill) => (
              <li key={skill}>{t(`main.skills.${skill}`)}</li>
            ))}
          </ul>
          <p className="tech-caption">{t('main.skills.platformStack')}</p>
          <ul className="tech-tags" aria-label={t('main.skills.platformStack')}>
            {platformTechnologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="projects-section" id="projects" aria-labelledby="projects-heading">
        <p className="eyebrow">{t('projects.eyebrow')}</p>
        <h2 id="projects-heading">{t('projects.title')}</h2>
        <p className="section-intro">{t('projects.intro')}</p>

        {state.status === 'loading' && (
          <p className="projects-status" role="status">
            {t('projects.loading')}
          </p>
        )}

        {state.status === 'empty' && (
          <p className="projects-status" role="status">
            {t('projects.empty')}
          </p>
        )}

        {state.status === 'error' && (
          <div className="projects-status projects-status--error">
            <div role="alert">
              <h3>{t('projects.errorTitle')}</h3>
              <p>{t(state.messageKey)}</p>
            </div>

            <button className="projects-retry" type="button" onClick={handleRetry}>
              {t('projects.retry')}
            </button>
          </div>
        )}

        {state.status === 'success' && (
          <ul className="project-list">
            {state.data.map((project) => {
              const title = useChinese
                ? project.titleZh.trim() || project.titleEn
                : project.titleEn.trim() || project.titleZh

              const summary = useChinese
                ? project.summaryZh.trim() || project.summaryEn
                : project.summaryEn.trim() || project.summaryZh

              const projectUrl = getProjectUrl(project.projectUrl)

              return (
                <li key={project.id} className="project-list__item">
                  <article className="project-card">
                    <h3>{title}</h3>

                    <p className="project-card__summary">{summary}</p>

                    <p className="project-card__tech">
                      <strong>{t('projects.techStack')}: </strong>
                      {project.techStack}
                    </p>

                    {projectUrl && (
                      <a
                        className="project-card__link"
                        href={projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t('projects.openProject')}: ${title}`}
                      >
                        {t('projects.openProject')}
                      </a>
                    )}
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="platform-section" aria-labelledby="platform-heading">
        <div>
          <p className="eyebrow">{t('main.platform.eyebrow')}</p>
          <h2 id="platform-heading">{t('main.platform.title')}</h2>
        </div>
        <div>
          <p>{t('main.platform.description')}</p>
          <p className="platform-section__next">{t('main.platform.next')}</p>
        </div>
      </section>

      <section className="contact-section" id="contact" aria-labelledby="contact-heading">
        <p className="eyebrow">{t('main.contact.eyebrow')}</p>
        <h2 id="contact-heading">{t('main.contact.title')}</h2>
        <p>{t('main.contact.description')}</p>
        <div className="contact-links">
          {profile.githubUrl && (
            <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer">
              {t('main.contact.github')}
            </a>
          )}
          {profile.linkedinUrl && (
            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer">
              {t('main.contact.linkedin')}
            </a>
          )}
          {profile.email && <a href={`mailto:${profile.email}`}>{t('main.contact.email')}</a>}
        </div>
        <p className="demo-note">{t('main.contact.demoNote')}</p>
      </section>
    </div>
  )
}
