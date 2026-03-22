import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import Counter from './counter.svelte'

describe('Counter', () => {
  it('increments on click', async () => {
    const user = userEvent.setup()
    render(Counter)
    const btn = screen.getByRole('button', { name: /Count is 0/ })
    await user.click(btn)
    expect(screen.getByRole('button', { name: /Count is 1/ })).toBeTruthy()
  })
})
