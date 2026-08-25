import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders the AlphaNGold home page', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )

    expect(screen.getByRole('heading', { name: 'AlphaNGold' })).toBeInTheDocument()
  })
})
