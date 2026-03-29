import { describe, expect, it } from 'vitest'

import { renderMarkdownToHtml } from './render-markdown'

describe('renderMarkdownToHtml', () => {
  it('renders headings and lists', async () => {
    const html = await renderMarkdownToHtml('# Title\n\n- a\n- b\n')
    expect(html).toContain('<h1')
    expect(html).toContain('Title')
    expect(html).toContain('<ul')
    expect(html).toContain('<li')
  })

  it('renders GFM table syntax', async () => {
    const md = '| a | b |\n| - | - |\n| 1 | 2 |\n'
    const html = await renderMarkdownToHtml(md)
    expect(html).toContain('<table')
    expect(html).toContain('<th')
  })

  it('syntax-highlights a fenced TypeScript block', async () => {
    const md = '```typescript\nconst x: number = 1\n```\n'
    const html = await renderMarkdownToHtml(md)
    expect(html).toContain('<pre')
    expect(html).toContain('<code')
    expect(html).toMatch(/style=/u)
  })

  it('does not preserve script tags from raw HTML', async () => {
    const md = '<script>alert(1)</script>\n\nHello'
    const html = await renderMarkdownToHtml(md)
    expect(html.toLowerCase()).not.toContain('<script')
    expect(html).toContain('Hello')
  })
})
