import fs from 'node:fs'
import path from 'node:path'

const captureDir = path.join(process.cwd(), 'docs', 'pr-assets', 'tauri-desktop')

function shot(name) {
  const file = path.join(captureDir, name)
  fs.mkdirSync(captureDir, { recursive: true })
  return file
}

/** Must match `e2eLongDocBefore()` in `src/lib/e2e-long-doc-fixture.ts`. */
function e2eLongDocBefore() {
  const lines = []
  for (let i = 1; i <= 100; i++) {
    lines.push(
      `Line ${i}: Lorem ipsum dolor sit amet, placeholder content for capture demo.`,
    )
  }
  return lines.join('\n')
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
  it('captures AI agent proposal flow, shell smoke, markdown preview, and settings', async () => {
    const root = await browser.$('[data-testid="lote-app"]')
    await root.waitForDisplayed({ timeout: 30_000 })
    await browser.pause(800)

    await browser.saveScreenshot(shot('01-app-ready.png'))

    await browser.execute(async () => {
      await globalThis.__loteSeedAgentDemo?.('create')
    })
    await browser.pause(400)
    await browser.saveScreenshot(shot('02-ai-propose-create.png'))

    const confirmCreate = await browser.$('[data-testid="chat-proposal-approve"]')
    await confirmCreate.waitForClickable({ timeout: 15_000 })
    await confirmCreate.click()
    await browser.pause(800)
    await browser.saveScreenshot(shot('03-ai-after-create-page-exists.png'))

    const editorBody = await browser.$('[data-testid="editor-body"]')
    await editorBody.waitForDisplayed({ timeout: 15_000 })
    await editorBody.setValue(e2eLongDocBefore())
    await browser.pause(200)
    const editorSave = await browser.$('[data-testid="editor-save"]')
    await editorSave.waitForClickable({ timeout: 15_000 })
    await editorSave.click()
    await browser.pause(800)

    await browser.execute(async () => {
      await globalThis.__loteSeedAgentDemo?.('save')
    })
    await browser.pause(400)
    const collapsedRow = await browser.$('[data-testid="chat-proposal-body-collapsed"]')
    await collapsedRow.waitForDisplayed({ timeout: 15_000 })
    await collapsedRow.scrollIntoView({ block: 'center' })
    await browser.pause(200)
    await browser.saveScreenshot(shot('04-ai-propose-edit.png'))

    const confirmSave = await browser.$('[data-testid="chat-proposal-approve"]')
    await confirmSave.waitForClickable({ timeout: 15_000 })
    await confirmSave.click()
    await browser.pause(800)
    await browser.saveScreenshot(shot('05-ai-after-edit.png'))

    await browser.execute(async () => {
      await globalThis.__loteSeedAgentDemo?.('delete')
    })
    await browser.pause(400)
    await browser.saveScreenshot(shot('06-ai-propose-delete.png'))

    const confirmDel = await browser.$('[data-testid="chat-proposal-approve"]')
    await confirmDel.waitForClickable({ timeout: 15_000 })
    await confirmDel.click()
    await browser.pause(800)
    await browser.saveScreenshot(shot('07-ai-after-delete.png'))

    const newPageBtn = await browser.$('[data-testid="btn-new-root-page"]')
    await newPageBtn.waitForClickable({ timeout: 15_000 })
    await newPageBtn.click()
    await browser.pause(600)

    await browser.saveScreenshot(shot('08-shell-new-page-smoke.png'))

    const titleInput = await browser.$('[data-testid="editor-title"]')
    await titleInput.waitForDisplayed({ timeout: 15_000 })
    await titleInput.setValue('E2E snapshot title')
    await browser.pause(400)

    await browser.saveScreenshot(shot('09-shell-title-edited.png'))

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

    await browser.saveScreenshot(shot('10-markdown-preview.png'))

    const settingsBtn = await browser.$('[data-testid="sidebar-settings"]')
    await settingsBtn.waitForClickable({ timeout: 15_000 })
    await settingsBtn.click()
    await browser.pause(400)

    const settingsView = await browser.$('[data-testid="settings-view"]')
    await settingsView.waitForDisplayed({ timeout: 15_000 })
    await browser.saveScreenshot(shot('11-settings.png'))
  })
})
