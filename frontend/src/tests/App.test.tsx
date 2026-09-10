import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import i18n from '../i18n'

vi.mock('../services/myProjExpService', () => ({
  getMyProjExpList: vi.fn().mockResolvedValue([]),
}))

afterEach(() => {
  cleanup()
})

describe('App', () => {
  it('renders the home page and an empty project list', async () => {
    await i18n.changeLanguage('en')

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'AlphaNGold',
        level: 1
      })
    ).toBeInTheDocument()

    expect(
      await screen.findByText('No projects to display yet.'),
    ).toBeInTheDocument()
  })
})
