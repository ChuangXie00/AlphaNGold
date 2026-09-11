import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { ApiClientError } from '../services/apiClient'
import { getMyProjExpList } from '../services/myProjExpService'
import type { MyProjExp } from '../services/types'
import { deferred, makeProject } from './helpers'

vi.mock('../services/myProjExpService', () => ({
  getMyProjExpList: vi.fn(),
}))

const getProjectsMock = vi.mocked(getMyProjExpList)

function LocationProbe() {
  const { pathname, search, hash } = useLocation()
  return <span data-testid="current-location">{pathname + search + hash}</span>
}

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  getProjectsMock.mockResolvedValue([])
})

describe('App', () => {
  it('renders the home page, empty projects, and the selected navigation and language', async () => {
    renderApp()

    expect(
      screen.getByRole('heading', { name: 'SpongeBob SquarePants', level: 1 }),
    ).toBeInTheDocument()
    expect(await screen.findByText('No projects to display yet.')).toBeInTheDocument()
    const navigation = within(screen.getByRole('navigation'))
    expect(navigation.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(navigation.getByRole('link', { name: 'AI Assistant' })).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '简体中文' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(document.title).toBe('Home | AlphaNGold')
  })

  it('keeps the page and navigation usable when projects fail to load', async () => {
    const user = userEvent.setup()
    getProjectsMock.mockRejectedValue(new ApiClientError('NETWORK', 'Offline'))
    renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load projects')
    expect(
      screen.getByRole('heading', { name: 'SpongeBob SquarePants', level: 1 }),
    ).toBeInTheDocument()
    const navigation = within(screen.getByRole('navigation'))
    expect(navigation.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(navigation.getByRole('link', { name: 'Gold Dashboard' })).toBeInTheDocument()

    await user.click(navigation.getByRole('link', { name: 'AI Assistant' }))
    expect(
      await screen.findByRole('heading', { name: 'AI Assistant — Coming in Phase 2' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getProjectsMock.mock.calls[0][0]?.signal?.aborted).toBe(true)
    expect(navigation.getByRole('link', { name: 'AI Assistant' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(navigation.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
    expect(document.title).toBe('AI Assistant | AlphaNGold')
  })

  it('switches loaded content and persists the language without refetching or changing the URL', async () => {
    const user = userEvent.setup()
    const project = makeProject()
    getProjectsMock.mockResolvedValue([project])
    renderApp('/?source=portfolio#projects')
    await screen.findByRole('heading', { name: project.titleEn })
    const signal = getProjectsMock.mock.calls[0][0]?.signal

    await user.click(screen.getByRole('button', { name: '简体中文' }))

    expect(screen.getByRole('heading', { name: '海绵宝宝', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: project.titleZh })).toBeInTheDocument()
    expect(screen.getByText(project.summaryZh)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '简体中文' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem('alphangold.language')).toBe('zh-CN')
    expect(document.documentElement).toHaveAttribute('lang', 'zh-CN')
    expect(document.title).toBe('主页 | AlphaNGold')
    expect(screen.getByTestId('current-location')).toHaveTextContent('/?source=portfolio#projects')
    expect(signal?.aborted).toBe(false)
    expect(getProjectsMock).toHaveBeenCalledOnce()

    // Native buttons also support keyboard activation, with the same state preservation.
    screen.getByRole('button', { name: 'English' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: project.titleEn })).toBeInTheDocument()
    expect(localStorage.getItem('alphangold.language')).toBe('en')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(document.title).toBe('Home | AlphaNGold')
    expect(screen.getByTestId('current-location')).toHaveTextContent('/?source=portfolio#projects')
    expect(getProjectsMock).toHaveBeenCalledOnce()
  })

  it('keeps a pending request active when the language button is used', async () => {
    const user = userEvent.setup()
    const pending = deferred<MyProjExp[]>()
    const project = makeProject()
    getProjectsMock.mockReturnValue(pending.promise)
    renderApp()
    const signal = getProjectsMock.mock.calls[0][0]?.signal
    expect(screen.getByRole('status')).toHaveTextContent('Loading projects…')

    await user.click(screen.getByRole('button', { name: '简体中文' }))
    expect(screen.getByRole('status')).toHaveTextContent('正在加载项目…')
    expect(signal?.aborted).toBe(false)
    expect(getProjectsMock).toHaveBeenCalledOnce()

    await act(async () => pending.resolve([project]))
    expect(screen.getByRole('heading', { name: project.titleZh })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(getProjectsMock).toHaveBeenCalledOnce()
  })

  it('translates an existing error and only fetches again when retry is requested', async () => {
    const user = userEvent.setup()
    const project = makeProject()
    getProjectsMock
      .mockRejectedValueOnce(new ApiClientError('NETWORK', 'Offline'))
      .mockResolvedValueOnce([project])
    renderApp()
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: '简体中文' }))
    expect(screen.getByRole('alert')).toHaveTextContent('项目加载失败')
    expect(screen.getByRole('alert')).toHaveTextContent('暂时无法连接，请检查网络后重试。')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(getProjectsMock).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: '重新加载' }))
    expect(await screen.findByRole('heading', { name: project.titleZh })).toBeInTheDocument()
    expect(getProjectsMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    {
      path: '/assistant?source=nav#overview',
      englishHeading: 'AI Assistant — Coming in Phase 2',
      chineseHeading: 'AI 分析助手 — 将在 Phase 2 开放',
      englishTitle: 'AI Assistant | AlphaNGold',
      chineseTitle: 'AI 分析助手 | AlphaNGold',
    },
    {
      path: '/dashboard?source=nav#overview',
      englishHeading: 'Gold Dashboard — Coming in Phase 3',
      chineseHeading: '黄金看板 — 将在 Phase 3 开放',
      englishTitle: 'Gold Dashboard | AlphaNGold',
      chineseTitle: '黄金看板 | AlphaNGold',
    },
    {
      path: '/does-not-exist?source=nav#overview',
      englishHeading: 'Page not found',
      chineseHeading: '页面未找到',
      englishTitle: 'Page not found | AlphaNGold',
      chineseTitle: '页面未找到 | AlphaNGold',
    },
  ])(
    'translates $path and keeps its route, query, and hash',
    async ({ path, englishHeading, chineseHeading, englishTitle, chineseTitle }) => {
      const user = userEvent.setup()
      renderApp(path)
      expect(screen.getByRole('heading', { name: englishHeading, level: 1 })).toBeInTheDocument()
      expect(document.title).toBe(englishTitle)

      await user.click(screen.getByRole('button', { name: '简体中文' }))
      expect(screen.getByRole('heading', { name: chineseHeading, level: 1 })).toBeInTheDocument()
      expect(document.title).toBe(chineseTitle)
      expect(document.documentElement).toHaveAttribute('lang', 'zh-CN')
      expect(screen.getByTestId('current-location')).toHaveTextContent(path)
      expect(getProjectsMock).not.toHaveBeenCalled()
    },
  )

  it.each([
    {
      path: '/%61ssistant',
      heading: 'AI Assistant — Coming in Phase 2',
      title: 'AI Assistant | AlphaNGold',
    },
    {
      path: '//',
      heading: 'SpongeBob SquarePants',
      title: 'Home | AlphaNGold',
    },
    {
      path: '/dashboard/',
      heading: 'Gold Dashboard — Coming in Phase 3',
      title: 'Gold Dashboard | AlphaNGold',
    },
  ])('uses the rendered route for the title at $path', async ({ path, heading, title }) => {
    await act(async () => {
      renderApp(path)
    })

    expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument()
    expect(document.title).toBe(title)
  })

  it('still switches languages when the browser refuses to save the preference', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError')
    })
    renderApp()
    await screen.findByText('No projects to display yet.')

    await user.click(screen.getByRole('button', { name: '简体中文' }))
    expect(screen.getByRole('heading', { name: '海绵宝宝', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('暂无可展示的项目。')
    expect(screen.getByRole('button', { name: '简体中文' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(
      screen.getByRole('heading', { name: 'SpongeBob SquarePants', level: 1 }),
    ).toBeInTheDocument()
    expect(getProjectsMock).toHaveBeenCalledOnce()
  })
})
