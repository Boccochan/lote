import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TextArea from './text-area.svelte'

describe('TextArea', () => {
  it('reflects value', () => {
    render(TextArea, {
      props: { value: 'hello' },
    })
    const el = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(el.value).toBe('hello')
  })
})
