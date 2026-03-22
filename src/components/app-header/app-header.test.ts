import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import AppHeader from './app-header.svelte'

describe('AppHeader', () => {
  it('renders title and subtitle', () => {
    render(AppHeader, {
      props: { title: 'T', subtitle: 'S' },
    })
    expect(screen.getByRole('heading', { name: 'T' })).toBeTruthy()
    expect(screen.getByText('S')).toBeTruthy()
  })
})
