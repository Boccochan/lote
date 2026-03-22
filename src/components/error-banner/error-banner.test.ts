import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ErrorBanner from './error-banner.svelte'

describe('ErrorBanner', () => {
  it('shows message when non-empty', () => {
    render(ErrorBanner, { props: { message: 'E1' } })
    expect(screen.getByText('E1')).toBeTruthy()
  })

  it('renders nothing when message is empty', () => {
    const { container } = render(ErrorBanner, { props: { message: '' } })
    expect(container.querySelector('div')).toBeNull()
  })
})
