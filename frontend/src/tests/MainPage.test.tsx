import { StrictMode } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MainPage from '../pages/MainPage'
import i18n from '../i18n'
import { ApiClientError } from '../services/apiClient'
import { getMyProjExpList } from '../services/myProjExpService'
import type { MyProjExp } from '../services/types'
import { deferred, makeProject, pendingUntilAbort } from './helpers'

vi.mock('../services/myProjExpService', () => ({ getMyProjExpList: vi.fn() }))
const getProjectsMock = vi.mocked(getMyProjExpList)

beforeEach(() => {
  getProjectsMock.mockResolvedValue([])
})

describe('MainPage', () => {
  it('shows Loading until the request resolves, then displays project data', async () => {
    const pending = deferred<MyProjExp[]>()
    const project = makeProject()
    getProjectsMock.mockReturnValue(pending.promise)
    render(<MainPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading projects…')
    expect(screen.queryByText('No projects to display yet.')).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Projects' })).queryByRole('list'),
    ).not.toBeInTheDocument()

    await act(async () => pending.resolve([project]))
    expect(screen.getByRole('heading', { name: project.titleEn, level: 3 })).toBeInTheDocument()
    expect(screen.getByText(project.summaryEn)).toBeInTheDocument()
    expect(screen.getByText(project.techStack)).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows Empty after a successful empty response', async () => {
    render(<MainPage />)
    expect(await screen.findByText('No projects to display yet.')).toBeInTheDocument()
    expect(screen.queryByText('Loading projects…')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Projects' })).queryByRole('list'),
    ).not.toBeInTheDocument()
  })

  it('displays projects in the order supplied by the service', async () => {
    const projects = [
      makeProject({ id: 10, titleEn: 'Toxic Sock Alert', displayOrder: 20 }),
      makeProject(),
    ]
    getProjectsMock.mockResolvedValue(projects)
    render(<MainPage />)
    const list = await within(screen.getByRole('region', { name: 'Projects' })).findByRole('list')
    expect(
      within(list)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(projects.map((project) => project.titleEn))
  })

  it.each([
    {
      error: new ApiClientError('NETWORK', 'private database detail'),
      message: 'Unable to connect. Please check your connection and try again.',
    },
    {
      error: new ApiClientError('TIMEOUT', 'private database detail'),
      message: 'The request took too long. Please try again.',
    },
    {
      error: new ApiClientError('CONFIG', 'private database detail'),
      message: 'Projects are temporarily unavailable. Please try again later.',
    },
    {
      error: new ApiClientError('HTTP', 'private database detail', 500),
      message: 'Projects are temporarily unavailable. Please try again later.',
    },
    {
      error: new ApiClientError('BUSINESS', 'private database detail'),
      message: 'Projects are temporarily unavailable. Please try again later.',
    },
    {
      error: new ApiClientError('INVALID_RESPONSE', 'private database detail'),
      message: 'Project data could not be loaded correctly. Please try again later.',
    },
    {
      error: new Error('private database detail'),
      message: 'Something went wrong while loading projects. Please try again.',
    },
  ])('displays a friendly message for $error', async ({ error, message }) => {
    getProjectsMock.mockRejectedValue(error)
    render(<MainPage />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Unable to load projects')
    expect(alert).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText('private database detail')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'SpongeBob SquarePants', level: 1 }),
    ).toBeInTheDocument()
  })

  it('transitions from Error through Loading to Success on retry', async () => {
    const user = userEvent.setup()
    const retry = deferred<MyProjExp[]>()
    const project = makeProject()
    getProjectsMock
      .mockRejectedValueOnce(new ApiClientError('NETWORK', 'Offline'))
      .mockReturnValueOnce(retry.promise)
    render(<MainPage />)
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading projects…')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()

    await act(async () => retry.resolve([project]))
    expect(screen.getByRole('heading', { name: project.titleEn })).toBeInTheDocument()
    expect(getProjectsMock).toHaveBeenCalledTimes(2)
  })

  it('allows another retry after the first retry also fails', async () => {
    const user = userEvent.setup()
    getProjectsMock
      .mockRejectedValueOnce(new ApiClientError('NETWORK', 'Offline'))
      .mockRejectedValueOnce(new ApiClientError('TIMEOUT', 'Slow'))
      .mockResolvedValueOnce([makeProject()])
    render(<MainPage />)
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByText('The request took too long. Please try again.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: makeProject().titleEn })).toBeInTheDocument()
    expect(getProjectsMock).toHaveBeenCalledTimes(3)
  })

  it('changes project fields and labels with language without refetching', async () => {
    const project = makeProject()
    getProjectsMock.mockResolvedValue([project])
    render(<MainPage />)
    await screen.findByRole('heading', { name: project.titleEn })

    await act(async () => {
      await i18n.changeLanguage('zh-CN')
    })
    expect(screen.getByRole('heading', { name: '项目经历' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: project.titleZh })).toBeInTheDocument()
    expect(screen.getByText(project.summaryZh)).toBeInTheDocument()
    expect(screen.getByText('技术栈:')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: `查看项目: ${project.titleZh}` })).toBeInTheDocument()
    expect(screen.queryByText(project.summaryEn)).not.toBeInTheDocument()

    await act(async () => {
      await i18n.changeLanguage('en')
    })
    expect(screen.getByRole('heading', { name: project.titleEn })).toBeInTheDocument()
    expect(screen.getByText(project.summaryEn)).toBeInTheDocument()
    expect(getProjectsMock).toHaveBeenCalledOnce()
  })

  it('translates Loading and Empty while keeping the same pending request', async () => {
    const pending = deferred<MyProjExp[]>()
    getProjectsMock.mockReturnValue(pending.promise)
    render(<MainPage />)
    await act(async () => {
      await i18n.changeLanguage('zh-CN')
    })
    expect(screen.getByRole('status')).toHaveTextContent('正在加载项目…')
    await act(async () => pending.resolve([]))
    expect(screen.getByRole('status')).toHaveTextContent('暂无可展示的项目。')
    expect(getProjectsMock).toHaveBeenCalledOnce()
  })

  it('translates an existing error without resetting the state or refetching', async () => {
    getProjectsMock.mockRejectedValue(new ApiClientError('NETWORK', 'Offline'))
    render(<MainPage />)
    await screen.findByRole('alert')
    await act(async () => {
      await i18n.changeLanguage('zh-CN')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('项目加载失败')
    expect(screen.getByRole('alert')).toHaveTextContent('暂时无法连接，请检查网络后重试。')
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument()
    expect(getProjectsMock).toHaveBeenCalledOnce()
  })

  it.each(['en', 'zh-CN'])(
    'falls back to the other language when %s fields are blank',
    async (language) => {
      await i18n.changeLanguage(language)
      const project =
        language === 'en'
          ? makeProject({ titleEn: ' ', summaryEn: '' })
          : makeProject({ titleZh: '', summaryZh: ' ' })
      getProjectsMock.mockResolvedValue([project])
      render(<MainPage />)
      expect(
        await screen.findByRole('heading', {
          name: language === 'en' ? project.titleZh : project.titleEn,
        }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(language === 'en' ? project.summaryZh : project.summaryEn),
      ).toBeInTheDocument()
    },
  )

  it.each([
    null,
    '',
    '   ',
    'not-a-url',
    'javascript:alert(1)',
    'data:text/html,test',
    'ftp://example.com',
  ])('does not render an unusable project link: %s', async (projectUrl) => {
    const project = makeProject({ projectUrl })
    getProjectsMock.mockResolvedValue([project])
    render(<MainPage />)
    await screen.findByRole('heading', { name: project.titleEn })
    expect(
      within(screen.getByRole('region', { name: 'Projects' })).queryByRole('link'),
    ).not.toBeInTheDocument()
  })

  it.each(['https://example.com/project', 'http://example.com/project'])(
    'renders a valid external link: %s',
    async (projectUrl) => {
      const project = makeProject({ projectUrl: `  ${projectUrl}  ` })
      getProjectsMock.mockResolvedValue([project])
      render(<MainPage />)
      const link = await screen.findByRole('link', { name: `View project: ${project.titleEn}` })
      expect(link).toHaveAttribute('href', projectUrl)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    },
  )

  it('aborts a pending request on unmount without displaying an error', async () => {
    getProjectsMock.mockImplementation((options) => pendingUntilAbort(options?.signal))
    const { unmount, container } = render(<MainPage />)
    const signal = getProjectsMock.mock.calls[0][0]?.signal
    expect(signal?.aborted).toBe(false)
    await act(async () => unmount())
    expect(signal?.aborted).toBe(true)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('recovers from StrictMode cleanup cancellation and displays the active response', async () => {
    getProjectsMock
      .mockImplementationOnce((options) => pendingUntilAbort(options?.signal))
      .mockResolvedValueOnce([makeProject()])
    render(
      <StrictMode>
        <MainPage />
      </StrictMode>,
    )
    expect(await screen.findByRole('heading', { name: makeProject().titleEn })).toBeInTheDocument()
    expect(getProjectsMock.mock.calls[0][0]?.signal?.aborted).toBe(true)
    expect(getProjectsMock.mock.calls[1][0]?.signal?.aborted).toBe(false)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each(['success', 'failure'])(
    'ignores an old request that finishes late with %s',
    async (outcome) => {
      const oldRequest = deferred<MyProjExp[]>()
      const currentRequest = deferred<MyProjExp[]>()
      const currentProject = makeProject({ titleEn: 'Current project' })
      // Deliberately ignore abort in this mock to exercise the stale-result guard.
      getProjectsMock
        .mockReturnValueOnce(oldRequest.promise)
        .mockReturnValueOnce(currentRequest.promise)
      render(
        <StrictMode>
          <MainPage />
        </StrictMode>,
      )
      await act(async () => currentRequest.resolve([currentProject]))
      expect(screen.getByRole('heading', { name: 'Current project' })).toBeInTheDocument()

      await act(async () => {
        if (outcome === 'success') oldRequest.resolve([makeProject({ titleEn: 'Stale project' })])
        else oldRequest.reject(new ApiClientError('NETWORK', 'Old failure'))
      })
      expect(screen.getByRole('heading', { name: 'Current project' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Stale project' })).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    },
  )
})
