import { render, screen } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { describe, expect, it } from 'vitest'

import ActionButton from './action-button.svelte'

const child = createRawSnippet(() => ({
  render: () => '<span>Click</span>',
}))

describe('ActionButton', () => {
  it('renders label', () => {
    render(ActionButton, { props: { children: child } })
    expect(screen.getByRole('button', { name: 'Click' })).toBeTruthy()
  })

  it('applies variant classes for primary', () => {
    render(ActionButton, {
      props: { variant: 'primary', children: child },
    })
    const btn = screen.getByRole('button', { name: 'Click' })
    expect(btn.className).toContain('bg-emerald-600')
  })
})
