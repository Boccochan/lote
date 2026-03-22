import { render, screen } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { describe, expect, it } from 'vitest'

import PanelTitle from './panel-title.svelte'

const child = createRawSnippet(() => ({
  render: () => '<span>Heading</span>',
}))

describe('PanelTitle', () => {
  it('renders heading text', () => {
    render(PanelTitle, { props: { children: child } })
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeTruthy()
  })
})
