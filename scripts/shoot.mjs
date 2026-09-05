// scripts/shoot.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Screenshot every screen at desktop and mobile sizes.
//
// Runs against a production build served locally with VITE_UI_HARNESS=1, which
// swaps auth for a fixture user and Firestore for an in-memory dataset. That
// means every authenticated screen can be photographed without a real Google
// sign-in and without touching live data.
//
//   node scripts/shoot.mjs            capture everything
//   node scripts/shoot.mjs dashboard  capture one route
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

const ROUTES = [
  { name: 'dashboard',    path: '/' },
  { name: 'leads',        path: '/leads' },
  { name: 'applications', path: '/applications' },
  { name: 'deadlines',    path: '/deadlines' },
  { name: 'stats',        path: '/stats' },
  { name: 'settings',     path: '/settings' },
  { name: 'archive',      path: '/archive' },
  { name: 'not-found',    path: '/does-not-exist' },
  // The slide-in detail panel, opened by URL.
  { name: 'detail-panel', path: '/applications?open=app-mit' },
]

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // not up yet
    }
    await sleep(300)
  }
  throw new Error(`Server never became ready at ${url}`)
}

async function main() {
  const only = process.argv[2]
  const routes = only ? ROUTES.filter(r => r.name === only) : ROUTES
  if (routes.length === 0) {
    console.error(`No route named "${only}". Known: ${ROUTES.map(r => r.name).join(', ')}`)
    process.exit(1)
  }

  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  console.log('Building with the UI harness enabled…')
  await new Promise((resolve, reject) => {
    const build = spawn('npx', ['vite', 'build', '--mode', 'harness'], {
      env: { ...process.env, VITE_UI_HARNESS: '1' },
      stdio: 'inherit',
      shell: true,
    })
    build.on('exit', code => code === 0 ? resolve() : reject(new Error(`Build failed (${code})`)))
  })

  console.log('Serving…')
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  })

  const failures = []

  try {
    await waitForServer(`${BASE}/`)
    const browser = await chromium.launch()

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        // Deterministic rendering: a fixed locale and zone stop screenshots
        // drifting between runs for reasons unrelated to the code.
        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata',
        colorScheme: 'light',
      })

      const page = await context.newPage()

      // Surface anything the app logs as an error — a screenshot that looks
      // fine while the console is on fire is not a passing check.
      const consoleErrors = []
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
      page.on('pageerror', err => consoleErrors.push(String(err)))

      for (const route of routes) {
        const label = `${route.name}-${viewport.name}`
        try {
          consoleErrors.length = 0
          await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle', timeout: 20000 })
          // Let entry animations settle so shots are not caught mid-transition.
          await page.waitForTimeout(900)

          await page.screenshot({
            path: path.join(OUT, `${label}.png`),
            fullPage: !viewport.isMobile,
          })

          const noisy = consoleErrors.filter(e =>
            !e.includes('favicon') && !e.includes('NikhilRao.png'))

          if (noisy.length > 0) {
            failures.push(`${label}: ${noisy[0]}`)
            console.log(`  ✗ ${label} — console error: ${noisy[0].slice(0, 120)}`)
          } else {
            console.log(`  ✓ ${label}`)
          }
        } catch (error) {
          failures.push(`${label}: ${error.message}`)
          console.log(`  ✗ ${label} — ${error.message.split('\n')[0]}`)
        }
      }

      await context.close()
    }

    await browser.close()
  } finally {
    server.kill()
  }

  console.log(`\nScreenshots in ./${OUT}`)
  if (failures.length > 0) {
    console.log(`\n${failures.length} problem(s):`)
    failures.forEach(f => console.log(`  - ${f}`))
    process.exit(1)
  }
  console.log('No console errors on any screen.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
