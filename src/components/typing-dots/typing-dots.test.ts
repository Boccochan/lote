import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TypingDots from './typing-dots.svelte'

describe('TypingDots', () => {
  it('renders as a pending status with a screen-reader label', () => {
    render(TypingDots, { props: { label: 'Working…' } })
    const status = screen.getByRole('status')
    expect(status).toBeTruthy()
    expect(screen.getByText('Working…')).toBeTruthy()
  })

  it('uses default assistant label', () => {
    render(TypingDots)
    expect(screen.getByText('Assistant is replying')).toBeTruthy()
  })
})
