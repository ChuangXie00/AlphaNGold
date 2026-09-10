import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  | { status: 'success'; data: MyProjExp[]}
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


function getProjectUrl(value: string | null) : string | null {
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
    status: 'loading'
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
          signal: controller.signal
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
            data: projects
          })
        }
      } catch (error: unknown) {
        if (!active || controller.signal.aborted) {
          return
        }

        if  (
          error instanceof ApiClientError &&
          error.kind === 'ABORTED'
        ) {
          return
        }
        setState({
          status: 'error',
          messageKey: getErrorMessageKey(error)
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
    setState({ status: 'loading'})
    setRequestVersion((current) => current + 1)
  }

  return (
    <div className="main-page">
      <header className="main-page__header">
        <h1>{t('main.title')}</h1>
        <p>{t('main.intro')}</p>
      </header>

      <section
        className="projects-section"
        aria-labelledby="projects-heading"
      >
        <h2 id="projects-heading">{t('projects.title')}</h2>

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

            <button
              className="projects-retry"
              type="button"
              onClick={handleRetry}
            >
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

                    <p className="project-card__summary">
                      {summary}
                    </p>

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
    </div>
  )
}
