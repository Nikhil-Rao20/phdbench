// scripts/check-layout.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Sideways-scroll sweep across many widths.
//
// Why this exists as its own check: the screenshot runner measured
// `document.documentElement.scrollWidth`, and that is not where the bug lives.
// The app's scroll container is `<main>`, which has `overflow-y: auto` — and CSS
// resolves the other axis to `auto` too, so `main` scrolled sideways *inside
// itself* while the document never overflowed at all. Every check passed while
// the phone view was visibly broken.
//
// So this walks every scrollable container, not just the document, and does it
// at nine widths rather than two. Two real bugs hid between 390 and 1440:
//   - tooltips mounted permanently with `whitespace-nowrap`, which expand an
//     ancestor's scrollable area even at opacity 0
//   - a truncating span that was itself a flex item, so `min-width: auto` stopped
//     it shrinking and it forced the whole grid track wider than the screen
//
// Widths chosen as real hardware, including the narrowest phone still in use.
// ─────────────────────────────────────────────────────────────────────────────

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4501
const BASE = `http://localhost:${PORT}/phdbench`

const WIDTHS = [
  { w: 320,  h: 568,  label: 'iPhone SE (1st gen) — narrowest in use' },
  { w: 360,  h: 740,  label: 'common Android' },
  { w: 390,  h: 844,  label: 'iPhone 14' },
  { w: 430,  h: 932,  label: 'iPhone Pro Max' },
  { w: 768,  h: 1024, label: 'iPad portrait' },
  { w: 820,  h: 1180, label: 'iPad Air' },
  { w: 1024, h: 768,  label: 'iPad landscape / small laptop' },
  { w: 1280, h: 800,  label: 'laptop' },
  { w: 1440, h: 900,  label: 'desktop' },
]

const ROUTES = [
  '/', '/leads', '/applications', '/deadlines', '/stats',
  '/settings', '/groups', '/archive', '/admin', '/?harness=none',
]

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try { if ((await fetch(url)).ok) return } catch { /* not up */ }
    await sleep(300)
  }
  throw new Error(`Server never became ready at ${url}`)
}

/**
 * Every horizontally-overflowing scroll container on the page, with the widest
 * element responsible for each.
 */
const OVERFLOW_PROBE = () => {
  const results = []
  const candidates = [document.documentElement, document.body, ...document.querySelectorAll('*')]

  for (const el of candidates) {
    const style = getComputedStyle(el)
    const scrolls = ['auto', 'scroll', 'overlay'].includes(style.overflowX)
      || el === document.documentElement
    if (!scrolls) continue

    const over = el.scrollWidth - el.clientWidth
    if (over <= 1) continue

    // Name the widest offender: "the page scrolls sideways" is not actionable.
    const box = el.getBoundingClientRect()
    let worst = null
    for (const child of el.querySelectorAll('*')) {
      const rc = child.getBoundingClientRect()
      if (rc.width === 0 || rc.height === 0) continue
      if (getComputedStyle(child).position === 'fixed') continue
      if (rc.right > box.right + 1 && (!worst || rc.right > worst.right)) {
        worst = {
          right: Math.round(rc.right),
          width: Math.round(rc.width),
          tag: child.tagName.toLowerCase(),
          cls: String(child.className || '').slice(0, 70),
          text: (child.textContent || '').trim().slice(0, 40),
        }
      }
    }

    results.push({
      container: el === document.documentElement ? 'document' : `${el.tagName.toLowerCase()}.${String(el.className || '').slice(0, 40)}`,
      over,
      worst,
    })
  }
  return results
}

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore', shell: true,
  })

  const failures = []
  let checks = 0

  try {
    await waitForServer(`${BASE}/`)
    const browser = await chromium.launch()

    for (const vp of WIDTHS) {
      const isMobile = vp.w < 768
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        isMobile,
        hasTouch: isMobile,
        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata',
      })
      const page = await context.newPage()
      const problems = []

      for (const route of ROUTES) {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 25000 })
        // Let layout and entry animations settle; measuring mid-animation gives
        // false positives from elements still sliding into place.
        await page.waitForTimeout(900)

        const overflows = await page.evaluate(OVERFLOW_PROBE)
        checks++

        for (const o of overflows) {
          const w = o.worst
          problems.push(
            `${route} — ${o.container} overflows by ${o.over}px` +
            (w ? `\n        widest: <${w.tag} class="${w.cls}"> w=${w.width} "${w.text}"` : ''),
          )
        }
      }

      if (problems.length) {
        console.log(`  ✗ ${vp.w}px — ${vp.label}`)
        problems.forEach(p => { console.log(`      ${p}`); failures.push(`${vp.w}px ${p}`) })
      } else {
        console.log(`  ✓ ${vp.w}px — ${vp.label}`)
      }

      await context.close()
    }

    await browser.close()
  } finally {
    server.kill()
  }

  console.log(`\n${checks} screen/width combinations checked.`)
  if (failures.length) {
    console.log(`${failures.length} overflow problem(s). Nothing should scroll sideways at any width.`)
    process.exit(1)
  }
  console.log('Nothing scrolls sideways at any width, in any scroll container.')
}

main().catch(e => { console.error(e); process.exit(1) })
