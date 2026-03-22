import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import JsonPre from './json-pre.svelte'

describe('JsonPre', () => {
  it('renders text content', () => {
    render(JsonPre, { props: { text: '{"a":1}' } })
    expect(screen.getByText('{"a":1}')).toBeTruthy()
  })

  it('shows em dash when empty', () => {
    render(JsonPre, { props: { text: '' } })
    expect(screen.getByText('—')).toBeTruthy()
  })
})
