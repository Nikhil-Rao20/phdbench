// scripts/check-modal.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Interaction check for the two reported bugs.
//
//   1. An UNTOUCHED form must close instantly on a backdrop click, with no
//      prompt of any kind — and never a native browser dialog.
//   2. An EDITED form must warn first, using the in-app prompt.
//   3. Saving must not leave the app stuck in its loading state.
//
// Runs against the harness build, same as the screenshot runner.
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4318
const BASE = `http://localhost:${PORT}/phdbench`

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try { if ((await fetch(url)).ok) return } catch { /* not up */ }
    await sleep(300)
  }
  throw new Error(`Server never became ready at ${url}`)
}

const results = []
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail })
  console.log(`  ${passed ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log('Building harness…')
  await new Promise((resolve, reject) => {
    const b = spawn('npx', ['vite', 'build', '--mode', 'harness'], {
      env: { ...process.env, VITE_UI_HARNESS: '1' }, stdio: 'ignore', shell: true,
    })
    b.on('exit', c => c === 0 ? resolve() : reject(new Error(`build failed (${c})`)))
  })

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore', shell: true,
  })

  try {
    await waitForServer(`${BASE}/`)
    const browser = await chromium.launch()

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 960 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      console.log(`\n${viewport.name}:`)
      const context = await browser.newContext({
        viewport, locale: 'en-IN', timezoneId: 'Asia/Kolkata',
      })
      const page = await context.newPage()

      // If any native dialog appears at all, that is a failure by definition.
      let nativeDialog = null
      page.on('dialog', async d => { nativeDialog = d.message(); await d.dismiss() })

      await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)

      // ── 1. Untouched form closes silently ──────────────────────────────────
      await page.getByRole('button', { name: /save new lead/i }).first().click()
      await page.waitForTimeout(500)
      const openedClean = await page.getByRole('dialog').isVisible()

      // Click the backdrop, well away from the panel.
      await page.mouse.click(5, 5)
      await page.waitForTimeout(500)

      const closedClean = (await page.getByRole('dialog').count()) === 0
      check('untouched form opens', openedClean)
      check('untouched form closes on backdrop click', closedClean)
      check('no native dialog on untouched close', nativeDialog === null,
        nativeDialog ? `got: "${nativeDialog}"` : '')

      // ── 2. Edited form warns, in-app ───────────────────────────────────────
      nativeDialog = null
      await page.getByRole('button', { name: /save new lead/i }).first().click()
      await page.waitForTimeout(500)
      await page.getByPlaceholder(/MIT, ETH/i).first().fill('Test University')
      await page.waitForTimeout(400)
      await page.mouse.click(5, 5)
      await page.waitForTimeout(500)

      const stillOpen = (await page.getByRole('dialog').count()) > 0
      const promptShown = await page.getByRole('alertdialog').isVisible().catch(() => false)

      check('edited form does NOT close immediately', stillOpen)
      check('in-app discard prompt appears', promptShown)
      check('no native dialog on edited close', nativeDialog === null,
        nativeDialog ? `got: "${nativeDialog}"` : '')

      // "Keep editing" returns to the form with the typing intact.
      if (promptShown) {
        await page.getByRole('button', { name: /keep editing/i }).click()
        await page.waitForTimeout(400)
        const value = await page.getByPlaceholder(/MIT, ETH/i).first().inputValue()
        check('keep editing preserves what was typed', value === 'Test University',
          `value = "${value}"`)

        await page.mouse.click(5, 5)
        await page.waitForTimeout(400)
        await page.getByRole('button', { name: /^discard$/i }).click()
        await page.waitForTimeout(500)
        check('discard closes the form', (await page.getByRole('dialog').count()) === 0)
      }

      // ── 3. The app is not stuck loading afterwards ──────────────────────────
      // A spinner still on screen with no records is the reported symptom.
      const stuck = await page.locator('.animate-shimmer').count()
      const hasContent = await page.getByText(/ETH Zürich/i).first().isVisible().catch(() => false)
      check('data still visible, not stuck loading', hasContent && stuck === 0,
        `skeletons=${stuck}, content=${hasContent}`)

      await context.close()
    }

    await browser.close()
  } finally {
    server.kill()
  }

  const failed = results.filter(r => !r.passed)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
  if (failed.length) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
