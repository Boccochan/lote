import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TextField from './text-field.svelte'

describe('TextField', () => {
  it('reflects value', () => {
    render(TextField, {
      props: { value: 'abc' },
    })
    const el = screen.getByRole('textbox') as HTMLInputElement
    expect(el.value).toBe('abc')
  })
})
