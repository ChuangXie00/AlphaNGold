import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { ApiClientError } from '../services/apiClient'
import { getMyProjExpList } from '../services/myProjExpService'

vi.mock('../services/myProjExpService', () => ({
  getMyProjExpList: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getMyProjExpList).mockResolvedValue([])
})

describe('App', () => {
  it('renders the home page and an empty project list', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'AlphaNGold',
        level: 1,
      }),
    ).toBeInTheDocument()

    expect(await screen.findByText('No projects to display yet.')).toBeInTheDocument()
  })

  it('keeps the page and navigation usable when projects fail to load', async () => {
    const user = userEvent.setup()
    vi.mocked(getMyProjExpList).mockRejectedValue(new ApiClientError('NETWORK', 'Offline'))
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load projects')
    expect(screen.getByRole('heading', { name: 'AlphaNGold', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gold Dashboard' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'AI Assistant' }))
    expect(
      await screen.findByRole('heading', { name: 'AI Assistant — Coming in Phase 2' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(vi.mocked(getMyProjExpList).mock.calls[0][0]?.signal?.aborted).toBe(true)
  })
})
