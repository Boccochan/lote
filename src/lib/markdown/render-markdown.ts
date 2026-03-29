import type { Schema } from 'hast-util-sanitize'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

/**
 * `rehype-sanitize` schema extended for Shiki output from `rehype-pretty-code`
 * (classes/styles on `pre`/`code`/`span`) while keeping GitHub-style defaults for GFM.
 */
export function markdownSanitizeSchema(): Schema {
  const base = defaultSchema
  const prev = base.attributes ?? {}
  const code = prev.code
  return {
    ...base,
    attributes: {
      ...prev,
      code: [
        ...(Array.isArray(code) ? code : []),
        ['className', /^(language-|shiki)/u],
      ],
      pre: [...(Array.isArray(prev.pre) ? prev.pre : []), 'className', 'style', 'tabIndex'],
      span: [...(Array.isArray(prev.span) ? prev.span : []), 'className', 'style'],
    },
  }
}

/**
 * Renders Markdown to a sanitized HTML string using remark/rehype, GFM, Shiki
 * highlighting for fenced blocks, and `rehype-sanitize` for XSS safety.
 */
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypePrettyCode, {
      theme: 'github-light',
    })
    .use(rehypeSanitize, markdownSanitizeSchema())
    .use(rehypeStringify)
    .process(markdown)

  return String(file.value)
}
