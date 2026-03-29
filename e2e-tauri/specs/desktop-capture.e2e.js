import fs from 'node:fs'
import path from 'node:path'

const captureDir = path.join(process.cwd(), 'docs', 'pr-assets', 'tauri-desktop')

function shot(name) {
  const file = path.join(captureDir, name)
  fs.mkdirSync(captureDir, { recursive: true })
  return file
}

describe('Lote desktop capture', () => {
  it('captures AI agent proposal flow (create → edit → delete) and basic shell', async () => {
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

    await browser.execute(async () => {
      await globalThis.__loteSeedAgentDemo?.('save')
    })
    await browser.pause(400)
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

    const settingsBtn = await browser.$('[data-testid="sidebar-settings"]')
    await settingsBtn.waitForClickable({ timeout: 15_000 })
    await settingsBtn.click()
    await browser.pause(400)

    const settingsView = await browser.$('[data-testid="settings-view"]')
    await settingsView.waitForDisplayed({ timeout: 15_000 })
    await browser.saveScreenshot(shot('10-settings.png'))
  })
})
