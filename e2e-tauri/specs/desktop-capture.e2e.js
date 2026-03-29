import fs from 'node:fs'
import path from 'node:path'

const captureDir = path.join(process.cwd(), 'docs', 'pr-assets', 'tauri-desktop')

function shot(name) {
  const file = path.join(captureDir, name)
  fs.mkdirSync(captureDir, { recursive: true })
  return file
}

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
  })
})
