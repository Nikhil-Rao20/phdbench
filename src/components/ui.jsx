// src/components/ui.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives. The charter rules live here rather than in each page, so a
// button cannot quietly ship without a disabled state and a progress bar cannot
// quietly start at zero.
// ─────────────────────────────────────────────────────────────────────────────

import { forwardRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Check, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { safeUrl } from '../lib/safety'

export const cn = (...inputs) => twMerge(clsx(inputs))

// ─── Tone → colour, in exactly one place ─────────────────────────────────────
// Charter #10: a colour never appears without meaning it, and a given meaning
// always looks the same. Every badge, dot, bar and chip reads from this map.

export const TONE = {
  ink:     { soft: 'bg-ink-100 text-ink-600',      solid: 'bg-ink-500',    text: 'text-ink-600',    ring: 'ring-ink-200',    border: 'border-ink-200' },
  sage:    { soft: 'bg-sage-100 text-sage-700',    solid: 'bg-sage-500',   text: 'text-sage-700',   ring: 'ring-sage-200',   border: 'border-sage-200' },
  success: { soft: 'bg-green-100 text-green-700',  solid: 'bg-green-500',  text: 'text-green-700',  ring: 'ring-green-200',  border: 'border-green-200' },
  amber:   { soft: 'bg-amber-100 text-amber-800',  solid: 'bg-amber-400',  text: 'text-amber-700',  ring: 'ring-amber-200',  border: 'border-amber-200' },
  rose:    { soft: 'bg-rose-100 text-rose-700',    solid: 'bg-rose-500',   text: 'text-rose-700',   ring: 'ring-rose-200',   border: 'border-rose-200' },
  sky:     { soft: 'bg-sky-100 text-sky-700',      solid: 'bg-sky-400',    text: 'text-sky-700',    ring: 'ring-sky-200',    border: 'border-sky-200' },
}

export const toneOf = (name) => TONE[name] || TONE.ink

// ─── Button ──────────────────────────────────────────────────────────────────

const VARIANTS = {
  primary:   'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950 shadow-surface hover:shadow-raised',
  secondary: 'bg-white text-ink-700 border border-ink-200 hover:bg-ink-50 hover:border-ink-300 active:bg-ink-100',
  ghost:     'text-ink-500 hover:bg-ink-100 hover:text-ink-800 active:bg-ink-200',
  danger:    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-surface',
  quiet:     'bg-ink-50 text-ink-600 hover:bg-ink-100 active:bg-ink-200',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-5 py-3 text-sm gap-2 rounded-xl',
  icon: 'p-2 rounded-lg',
}

/**
 * Every state the charter demands (#12): default, hover, active, focus-visible,
 * disabled *with a stated reason*, and loading.
 *
 * `disabledReason` is not optional decoration — a control that is dead with no
 * explanation is the most common affordance failure there is. It becomes the
 * tooltip, so hovering a greyed-out button tells you what to do about it.
 */
export const Button = forwardRef(function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  disabledReason,
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...props
}, ref) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      title={isDisabled && disabledReason ? disabledReason : props.title}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        'inline-flex items-center justify-center font-medium select-none',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-ink-400',
        !isDisabled && 'active:scale-[0.97]',
        isDisabled && 'opacity-45 cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading
        ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin shrink-0" aria-hidden="true" />
        : Icon && <Icon size={size === 'sm' ? 13 : 15} className="shrink-0" aria-hidden="true" />}
      {children}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 13 : 15} className="shrink-0" aria-hidden="true" />}
    </button>
  )
})

// ─── Badge ───────────────────────────────────────────────────────────────────

export function Badge({ tone = 'ink', icon: Icon, children, className, title }) {
  const t = toneOf(tone)
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap',
        t.soft, className,
      )}
    >
      {/* Charter #10: never colour alone — an icon or text always carries the
          same meaning, so the badge survives colour blindness and greyscale. */}
      {Icon && <Icon size={11} className="shrink-0" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** A coloured dot always paired with a text label elsewhere, never used alone. */
export function Dot({ tone = 'ink', pulse = false, className }) {
  return (
    <span
      className={cn('w-2 h-2 rounded-full shrink-0', toneOf(tone).solid, pulse && 'animate-pulse-soft', className)}
      aria-hidden="true"
    />
  )
}

// ─── Progress ────────────────────────────────────────────────────────────────

/**
 * Charter #5: a progress bar never starts at zero.
 *
 * The honest version of that rule matters — we do not fake 20%. Instead the
 * floor exists so a genuinely-started thing never renders as an empty trough,
 * which reads as failure. When value is truly 0, the bar shows a small "started"
 * nub rather than nothing at all, and the label still says 0 of N so the number
 * never lies.
 */
export function Progress({ value, max, tone = 'sage', label, showFraction = true, className }) {
  const safeMax = Math.max(1, max || 0)
  const pct = Math.min(100, Math.round((value / safeMax) * 100))
  const complete = value >= safeMax && safeMax > 0
  const displayTone = complete ? 'sage' : pct === 0 ? 'ink' : tone
  const t = toneOf(displayTone)

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden shadow-inset">
        <motion.div
          className={cn('h-full rounded-full', t.solid)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 4)}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {showFraction && (
        <span className={cn('text-xs shrink-0 tabular-nums', complete ? 'text-sage-600 font-medium' : 'text-ink-400')}>
          {label ?? `${value}/${safeMax}`}
        </span>
      )}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

/**
 * Charter #12 and #3: an empty screen states what it is for and offers the next
 * action. "No data" alone tells the user nothing and gives them nowhere to go.
 */
export function EmptyState({ icon: Icon, title, description, action, secondaryAction, className }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-ink-100 shadow-surface px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-ink-50 flex items-center justify-center mx-auto mb-5">
          <Icon size={22} className="text-ink-300" aria-hidden="true" />
        </div>
      )}
      <h3 className="font-display text-xl text-ink-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-ink-500 max-w-prose mx-auto leading-relaxed">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

// ─── Error state ─────────────────────────────────────────────────────────────

export function ErrorState({ title = 'Could not load this', description, onRetry, className }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-rose-200 shadow-surface px-6 py-12 text-center', className)}>
      <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-5">
        <Info size={22} className="text-rose-500" aria-hidden="true" />
      </div>
      <h3 className="font-display text-xl text-ink-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-ink-500 max-w-prose mx-auto leading-relaxed">{description}</p>}
      {onRetry && (
        <div className="mt-6">
          <Button variant="secondary" onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

/**
 * Charter #6: every icon-only control needs a name.
 * Deliberately CSS-only — no portal, no positioning library, no dependency.
 */
/**
 * A tooltip that exists only while it is being shown.
 *
 * The previous version kept the bubble in the DOM permanently and revealed it
 * with opacity. That is the usual CSS-only approach and it was wrong here: an
 * absolutely positioned element still expands an ancestor's *scrollable* area
 * even at `opacity: 0`, so a 585px `whitespace-nowrap` label sitting inside a
 * 390px phone screen made the page scroll sideways into empty space. It was
 * invisible in every screenshot, because the thing causing it was invisible.
 *
 * Mounting on demand also means a touch device — where there is no hover and a
 * tooltip can never be read anyway — renders nothing at all.
 */
export function Tooltip({ label, children, side = 'top', className }) {
  const [open, setOpen] = useState(false)

  const position = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side]

  if (!label) return children

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 rounded-lg px-2.5 py-1.5',
            'bg-ink-900 text-white text-xs shadow-float',
            // Wraps instead of running off the screen. A long explanation is
            // still readable on two lines; it is not readable off-screen.
            'w-max max-w-[min(16rem,calc(100vw-2rem))] text-left',
            'animate-fade-in',
            position,
          )}
        >
          {label}
        </span>
      )}
    </span>
  )
}

// ─── Section heading ─────────────────────────────────────────────────────────

export function SectionTitle({ children, action, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 mb-4 pb-2 border-b border-ink-100', className)}>
      <h2 className="text-xs font-semibold text-ink-400 uppercase tracking-widest">{children}</h2>
      {action}
    </div>
  )
}

// ─── Copy confirmation ───────────────────────────────────────────────────────

/** Charter #13: copying without confirmation leaves you wondering if it worked. */
export function CopiedPill({ show }) {
  return (
    <motion.span
      initial={false}
      animate={show ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 4, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="inline-flex items-center gap-1 text-xs text-sage-600 font-medium pointer-events-none"
      aria-live="polite"
    >
      <Check size={12} aria-hidden="true" /> Copied
    </motion.span>
  )
}

/**
 * An external link that refuses to be a weapon.
 *
 * Every URL in this app is typed by a person, and once leads are shared, by a
 * *different* person than the one clicking. `safeUrl` rejects anything that is
 * not http/https, so a `javascript:` URL saved into a shared lead cannot run in
 * a teammate's authenticated session. An unsafe or empty value renders nothing
 * at all rather than a dead link.
 *
 * `rel="noopener noreferrer"` is not optional on a target=_blank link: without
 * noopener the opened page gets a handle on this one via window.opener and can
 * navigate it somewhere convincing.
 */
export function SafeLink({ href, children, className, title, ...rest }) {
  const safe = safeUrl(href)
  if (!safe) return null

  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      title={title || safe}
      className={className}
      {...rest}
    >
      {children}
    </a>
  )
}
