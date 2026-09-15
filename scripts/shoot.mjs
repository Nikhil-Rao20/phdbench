// scripts/shoot.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Photograph every screen at desktop and mobile sizes, and fail on what a
// screenshot alone would not reveal.
//
// `networkidle` is not "loaded". It only means requests stopped; React may not
// have rendered, fonts may still be swapping, and skeletons may still be on
// screen. A screenshot taken then is a picture of a half-built page, and worse,
// it looks plausible — so a broken screen passes review. Every shot here waits
// for four separate signals before the shutter opens.
//
// It also checks, on every screen and both sizes:
//   - no horizontal scrolling, and which element caused it if there is
//   - no console errors
//   - no visible skeletons left behind
//   - no element overflowing the viewport width
//
//   node scripts/shoot.mjs             capture everything
//   node scripts/shoot.mjs dashboard   capture one screen
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import path from 'node:path'

const PORT = 4317
const BASE = `http://localhost:${PORT}/phdbench`
const OUT = 'screenshots'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 960, isMobile: false },
  { name: 'mobile',  width: 390,  height: 844, isMobile: true, deviceScaleFactor: 2 },
]

// `ready` is the selector that proves this screen actually rendered its own
// content, rather than a shell or a spinner.
const ROUTES = [
  { name: 'dashboard',    path: '/',                        ready: 'text=/Good to have you back/i' },
  { name: 'leads',        path: '/leads',                   ready: 'h1:has-text("Leads")' },
  { name: 'applications', path: '/applications',            ready: 'h1:has-text("Applications")' },
  { name: 'deadlines',    path: '/deadlines',               ready: 'h1:has-text("Deadlines")' },
  { name: 'stats',        path: '/stats',                   ready: 'h1:has-text("Stats")' },
  { name: 'settings',     path: '/settings',                ready: 'h1:has-text("Settings")' },
  { name: 'groups',       path: '/groups',                  ready: 'h1:has-text("Groups")' },
  { name: 'archive',      path: '/archive',                 ready: 'h1' },
  { name: 'not-found',    path: '/does-not-exist',          ready: 'h1' },
  { name: 'modal-open',   path: '/leads',                   ready: 'h1:has-text("Leads")', openModal: /save new lead/i },
  { name: 'detail-panel', path: '/applications?open=app-mit', ready: '[role="dialog"]' },
  { name: 'admin',        path: '/admin',                    ready: 'h1:has-text("Access")' },
  // Access states, forced via the harness so the front door can be checked
  // without a real refused account.
  { name: 'request-access', path: '/?harness=none',     ready: 'text=/Ask for access/i' },
  { name: 'access-pending', path: '/?harness=pending',  ready: 'text=/Your request is with/i' },
  { name: 'access-refused', path: '/?harness=rejected', ready: 'text=/Not approved/i' },
]

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try { if ((await fetch(url)).ok) return true } catch { /* not up yet */ }
    await sleep(300)
  }
  throw new Error(`Server never became ready at ${url}`)
}

/**
 * Wait until the page is genuinely finished, not merely quiet.
 * Returns a list of reasons it could not settle, empty when all is well.
 */
async function waitUntilSettled(page, route) {
  const problems = []

  // 1. The screen's own content exists.
  if (route.ready) {
    try {
      await page.locator(route.ready).first().waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      problems.push(`content never appeared (${route.ready})`)
    }
  }

  // 2. No loading placeholders remain. A shot with a skeleton in it is a shot
  //    of a page that had not finished.
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('.animate-shimmer').length === 0,
      { timeout: 10000 },
    )
  } catch {
    const n = await page.locator('.animate-shimmer').count()
    problems.push(`${n} skeleton(s) still showing`)
  }

  // 3. Fonts are resolved, so text is not captured mid-swap at the wrong size.
  await page.evaluate(() => document.fonts?.ready).catch(() => {})

  // 4. Images that are going to load have loaded.
  await page.waitForFunction(
    () => Array.from(document.images).every(img => img.complete),
    { timeout: 8000 },
  ).catch(() => {})

  // 5. Entry animations have run their course.
  await page.waitForTimeout(700)

  return problems
}

/** Horizontal overflow, and the element responsible for it. */
async function findOverflow(page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth
    const scrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    )
    if (scrollWidth <= docWidth + 1) return null

    // Name the widest offender, because "the page scrolls sideways" is not
    // actionable on its own.
    let worst = null
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const right = rect.right
      if (right > docWidth + 1 && (!worst || right > worst.right)) {
        worst = {
          right: Math.round(right),
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 80),
          text: (el.textContent || '').trim().slice(0, 40),
        }
      }
    }
    return { docWidth, scrollWidth: Math.round(scrollWidth), worst }
  })
}

async function main() {
  const only = process.argv[2]
  const routes = only ? ROUTES.filter(r => r.name === only) : ROUTES
  if (routes.length === 0) {
    console.error(`No screen named "${only}". Known: ${ROUTES.map(r => r.name).join(', ')}`)
    process.exit(1)
  }

  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  console.log('Building with the UI harness enabled…')
  await new Promise((resolve, reject) => {
    const build = spawn('npx', ['vite', 'build', '--mode', 'harness'], {
      env: { ...process.env, VITE_UI_HARNESS: '1' },
      stdio: 'ignore',
      shell: true,
    })
    build.on('exit', code => code === 0 ? resolve() : reject(new Error(`Build failed (${code})`)))
  })

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore', shell: true,
  })

  const failures = []

  try {
    await waitForServer(`${BASE}/`)
    const browser = await chromium.launch()

    for (const viewport of VIEWPORTS) {
      console.log(`\n${viewport.name} (${viewport.width}×${viewport.height}):`)

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        // Pinned so shots do not drift between runs for reasons unrelated to
        // the code being tested.
        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata',
        colorScheme: 'light',
      })

      const page = await context.newPage()
      const consoleErrors = []
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
      page.on('pageerror', e => consoleErrors.push(String(e)))

      for (const route of routes) {
        const label = `${route.name}-${viewport.name}`
        const issues = []

        try {
          consoleErrors.length = 0
          await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle', timeout: 25000 })

          issues.push(...await waitUntilSettled(page, route))

          if (route.openModal) {
            await page.getByRole('button', { name: route.openModal }).first().click()
            await page.waitForTimeout(800)
          }

          const overflow = await findOverflow(page)
          if (overflow) {
            const w = overflow.worst
            issues.push(
              `scrolls sideways (${overflow.scrollWidth}px in ${overflow.docWidth}px)` +
              (w ? ` — widest: <${w.tag} class="${w.cls}"> "${w.text}"` : ''),
            )
          }

          await page.screenshot({
            path: path.join(OUT, `${label}.png`),
            fullPage: !viewport.isMobile,
          })

          const noisy = consoleErrors.filter(e =>
            !e.includes('favicon') && !e.includes('NikhilRao.png'))
          if (noisy.length) issues.push(`console: ${noisy[0].slice(0, 120)}`)
        } catch (error) {
          issues.push(error.message.split('\n')[0])
        }

        if (issues.length) {
          issues.forEach(i => failures.push(`${label}: ${i}`))
          console.log(`  ✗ ${label}`)
          issues.forEach(i => console.log(`      ${i}`))
        } else {
          console.log(`  ✓ ${label}`)
        }
      }

      await context.close()
    }

    await browser.close()
  } finally {
    server.kill()
  }

  console.log(`\nScreenshots in ./${OUT}`)
  if (failures.length) {
    console.log(`\n${failures.length} problem(s) found.`)
    process.exit(1)
  }
  console.log('All screens rendered cleanly: no console errors, no leftover skeletons, no sideways scrolling.')
}

main().catch(err => { console.error(err); process.exit(1) })
