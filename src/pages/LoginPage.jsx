import { useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { motion } from 'framer-motion'

const STAT_PILLS = [
  { label: 'Leads tracked', value: '94' },
  { label: 'Deadlines mapped', value: '27' },
  { label: 'Zero misses', value: '0' },
]

function MoleculeField({ className }) {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const pointerRef = useRef({ x: 0, y: 0, active: false })
  const animationRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const state = { width: 0, height: 0, dpr: Math.min(window.devicePixelRatio || 1, 2) }

    const createParticles = () => {
      const area = state.width * state.height
      const count = Math.min(200, Math.max(90, Math.floor(area / 8000)))
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: 1.4 + Math.random() * 2.6,
        drift: 0.2 + Math.random() * 0.8,
      }))
    }

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      state.width = Math.max(1, width)
      state.height = Math.max(1, height)
      canvas.width = Math.floor(state.width * state.dpr)
      canvas.height = Math.floor(state.height * state.dpr)
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0)
      createParticles()
    }

    const drawFrame = () => {
      ctx.clearRect(0, 0, state.width, state.height)

      const pointer = pointerRef.current
      const lineDistance = Math.min(140, Math.max(90, state.width / 8))
      const repelDistance = Math.min(180, Math.max(120, state.width / 6))

      particlesRef.current.forEach((particle, index) => {
        const dx = particle.x - pointer.x
        const dy = particle.y - pointer.y
        const dist = Math.hypot(dx, dy)

        if (pointer.active && dist < repelDistance) {
          const force = (1 - dist / repelDistance) * 0.8
          particle.vx += (dx / (dist || 1)) * force
          particle.vy += (dy / (dist || 1)) * force
        }

        particle.vx += (Math.random() - 0.5) * 0.02 * particle.drift
        particle.vy += (Math.random() - 0.5) * 0.02 * particle.drift
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < -10 || particle.x > state.width + 10) particle.vx *= -1
        if (particle.y < -10 || particle.y > state.height + 10) particle.vy *= -1

        const speed = Math.hypot(particle.vx, particle.vy)
        if (speed > 1) {
          particle.vx *= 0.92
          particle.vy *= 0.92
        }

        for (let j = index + 1; j < particlesRef.current.length; j += 1) {
          const other = particlesRef.current[j]
          const lx = particle.x - other.x
          const ly = particle.y - other.y
          const ldist = Math.hypot(lx, ly)
          if (ldist < lineDistance) {
            const alpha = 0.1 + (1 - ldist / lineDistance) * 0.28
            ctx.strokeStyle = `rgba(68, 141, 101, ${alpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        }

        ctx.fillStyle = 'rgba(26, 25, 20, 0.55)'
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const animate = () => {
      drawFrame()
      animationRef.current = requestAnimationFrame(animate)
    }

    const handlePointer = event => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      pointerRef.current.x = x
      pointerRef.current.y = y
      pointerRef.current.active = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handlePointer, { passive: true })
    window.addEventListener('pointerdown', handlePointer, { passive: true })
    window.addEventListener('pointerup', handlePointer, { passive: true })

    if (!prefersReducedMotion) animationRef.current = requestAnimationFrame(animate)
    if (prefersReducedMotion) drawFrame()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointer)
      window.removeEventListener('pointerdown', handlePointer)
      window.removeEventListener('pointerup', handlePointer)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}

export default function LoginPage() {
  const { login, error } = useAuth()

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-50">
      <MoleculeField className="pointer-events-none absolute inset-0 z-0 h-full w-full" />

      <div className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-sage-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-amber-200/50 blur-[90px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/80 to-transparent" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 pt-6 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-ink-900 text-white flex items-center justify-center">
              <span className="font-display text-base">P</span>
            </div>
            <div>
              <div className="font-display text-lg text-ink-900">PhDBench</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-ink-500">Research tracker</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs text-ink-500">
            <span>Secure, private, and built for PhD life</span>
            <span className="h-1 w-1 rounded-full bg-ink-300" />
            <span>May 5, 2026</span>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-12 lg:px-12 lg:py-14">
          <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center lg:-translate-y-4">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/70 px-4 py-1 text-xs uppercase tracking-[0.3em] text-ink-500">
                  Application Command Center
                </div>
                <h1 className="mt-6 font-display text-4xl leading-tight text-ink-900 sm:text-5xl lg:text-6xl">
                  Map every lab, every deadline, every yes.
                </h1>
                <p className="mt-5 text-base text-ink-600 max-w-xl">
                  A living dashboard for your PhD journey. Track leads, draft materials, and keep your entire
                  application story in sync while the molecule field responds to your cursor.
                </p>
              </motion.div>

              <div className="mt-8 flex flex-wrap gap-3">
                {STAT_PILLS.map(item => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm text-ink-700 shadow-sm"
                  >
                    {/* <span className="font-display text-lg text-ink-900">{item.value}</span> */}
                    <span className="text-xs uppercase tracking-[0.25em] text-ink-500">{item.label}</span>
                  </div>
                ))}
              </div>

            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* <div className="absolute -top-6 left-10 h-16 w-16 rounded-2xl bg-white/80 backdrop-blur shadow-[0_18px_40px_rgba(26,25,20,0.15)]" /> */}
              {/* <div className="absolute -bottom-6 right-12 h-20 w-20 rounded-full bg-sage-200/60 blur-xl" /> */}

              <div className="relative rounded-3xl border border-white/70 bg-white/80 backdrop-blur-xl p-8 shadow-[0_30px_70px_rgba(26,25,20,0.18)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-3xl text-ink-900">Welcome back</h2>
                    <p className="text-sm text-ink-500 mt-2">Sign in to keep your PhD plan moving.</p>
                  </div>
                  <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full border border-ink-200 bg-ink-50 text-ink-700">
                    <span className="font-display text-lg">P</span>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={login}
                  className="mt-6 w-full flex items-center justify-center gap-3 rounded-2xl border border-ink-200 bg-ink-900 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-ink-900/20 transition-all duration-150 hover:-translate-y-0.5 hover:bg-ink-800"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>

              

                <p className="mt-6 text-center text-[11px] uppercase tracking-[0.2em] text-ink-400">
                  Built by Nikhil Rao · RGUKT Nuzvid
                </p>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
