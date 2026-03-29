import fs from 'node:fs'
import path from 'node:path'

const captureDir = path.join(process.cwd(), 'docs', 'pr-assets', 'tauri-desktop')

function shot(name) {
  const file = path.join(captureDir, name)
  fs.mkdirSync(captureDir, { recursive: true })
  return file
}

/** Rich Markdown used to verify Preview rendering in screenshots (headings, list, table, code). */
const previewSampleMarkdown = `# Markdown preview

Demonstrates **bold**, *italic*, and \`inline code\`.

- Bullet one
- Bullet two

| Col | Val |
| --- | --- |
| A | 1 |

\`\`\`typescript
const msg: string = "Hello";
\`\`\`
`

describe('Lote desktop capture', () => {
  it('loads, creates a page, edits title, saves screenshots (and optional video inputs)', async () => {
    const root = await browser.$('[data-testid="lote-app"]')
    await root.waitForDisplayed({ timeout: 30_000 })
    await browser.pause(800)

    await browser.saveScreenshot(shot('01-initial.png'))

    const newPageBtn = await browser.$('[data-testid="btn-new-root-page"]')
    await newPageBtn.waitForClickable({ timeout: 15_000 })
    await newPageBtn.click()
    await browser.pause(600)

    await browser.saveScreenshot(shot('02-after-new-page.png'))

    const titleInput = await browser.$('[data-testid="editor-title"]')
    await titleInput.waitForDisplayed({ timeout: 15_000 })
    await titleInput.setValue('E2E snapshot title')
    await browser.pause(400)

    await browser.saveScreenshot(shot('03-title-edited.png'))

    const bodyArea = await browser.$('[data-testid="editor-body"]')
    await bodyArea.waitForDisplayed({ timeout: 15_000 })
    await bodyArea.setValue(previewSampleMarkdown)
    await browser.pause(400)

    const previewBtn = await browser.$('[data-testid="editor-mode-preview"]')
    await previewBtn.waitForClickable({ timeout: 15_000 })
    await previewBtn.click()
    await browser.pause(1200)

    const previewRegion = await browser.$('[data-testid="markdown-preview"]')
    await previewRegion.waitForDisplayed({ timeout: 15_000 })
    const previewHeading = await previewRegion.$('h1')
    await previewHeading.waitForDisplayed({ timeout: 15_000 })

    await browser.saveScreenshot(shot('04-markdown-preview.png'))

    const settingsBtn = await browser.$('[data-testid="sidebar-settings"]')
    await settingsBtn.waitForClickable({ timeout: 15_000 })
    await settingsBtn.click()
    await browser.pause(400)

    const settingsView = await browser.$('[data-testid="settings-view"]')
    await settingsView.waitForDisplayed({ timeout: 15_000 })
    await browser.saveScreenshot(shot('05-settings-empty.png'))
  })
})
