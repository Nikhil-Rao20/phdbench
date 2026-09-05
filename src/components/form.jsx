// src/components/form.jsx
// Form primitives. Charter #1 (defaults that read as recommendations),
// #6 (affordance), #12 (every input state).

import { useId, useMemo, useRef, useState, useEffect } from 'react'
import { ChevronDown, Check, AlertCircle, Globe2, Info, X } from 'lucide-react'
import { cn, Tooltip } from './ui'
import { COUNTRIES, timezoneForCountry } from '../lib/model'
import { describeDeadline, DEFAULT_DEADLINE_TIME, HOME_TIMEZONE } from '../lib/datetime'

// ─── Field wrapper ───────────────────────────────────────────────────────────

export function Field({ label, hint, error, required, children, className, htmlFor }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-500 uppercase tracking-wider"
        >
          {label}
          {required && <span className="text-rose-500 normal-case" aria-hidden="true">*</span>}
          {hint && (
            <Tooltip label={hint}>
              <Info size={11} className="text-ink-300 hover:text-ink-500 transition-colors" aria-hidden="true" />
            </Tooltip>
          )}
        </label>
      )}
      {children}
      {/* Charter #12: an invalid field states the fix, not just the fault. */}
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-rose-600" role="alert">
          <AlertCircle size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

const CONTROL = `w-full px-3.5 py-2.5 rounded-xl border bg-ink-50 text-ink-800 text-sm
  placeholder-ink-400 transition-all duration-150
  focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent focus:bg-white
  disabled:opacity-50 disabled:cursor-not-allowed`

export function Input({ invalid, className, ...props }) {
  return (
    <input
      className={cn(CONTROL, invalid ? 'border-rose-300' : 'border-ink-200', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export function TextArea({ invalid, className, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cn(CONTROL, 'resize-y min-h-[76px] leading-relaxed', invalid ? 'border-rose-300' : 'border-ink-200', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export function Select({ children, className, invalid, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(CONTROL, 'appearance-none pr-9 cursor-pointer', invalid ? 'border-rose-300' : 'border-ink-200', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  )
}

// ─── Segmented control ───────────────────────────────────────────────────────

/** For small closed sets, where seeing every option beats hiding them in a menu. */
export function Segmented({ value, onChange, options, className }) {
  return (
    <div className={cn('grid gap-2', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.help}
            aria-pressed={active}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-medium',
              'border transition-all duration-150 active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400',
              active
                ? 'bg-ink-900 text-white border-ink-900 shadow-surface'
                : 'bg-white text-ink-700 border-ink-200 hover:border-ink-400 hover:bg-ink-50',
            )}
          >
            {opt.icon && <opt.icon size={14} aria-hidden="true" />}
            <span className="truncate">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

export function Checkbox({ checked, onChange, label, hint, disabled, className }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      title={hint}
      className={cn(
        'group flex items-center gap-2.5 py-2 px-2.5 rounded-xl w-full text-left',
        'hover:bg-ink-50 active:bg-ink-100 transition-colors duration-120',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <span
        className={cn(
          'w-[18px] h-[18px] rounded-[6px] border-2 shrink-0 flex items-center justify-center',
          'transition-all duration-150',
          checked
            ? 'bg-sage-500 border-sage-500'
            : 'bg-white border-ink-300 group-hover:border-ink-400',
        )}
        aria-hidden="true"
      >
        {checked && <Check size={12} className="text-white animate-check-pop" strokeWidth={3} />}
      </span>
      <span className={cn('text-sm', checked ? 'text-ink-800' : 'text-ink-600')}>{label}</span>
    </button>
  )
}

// ─── Combobox ────────────────────────────────────────────────────────────────

/**
 * A text input that suggests what you have typed before, without preventing you
 * typing something new.
 *
 * Charter #1: the suggestions are a recommendation, never a constraint — a
 * closed dropdown of universities would be useless the first time you applied
 * somewhere new.
 */
export function Combobox({ value, onChange, options = [], placeholder, invalid, id, ...props }) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const wrapRef = useRef(null)
  const listId = useId()

  const matches = useMemo(() => {
    const q = (value || '').trim().toLowerCase()
    const pool = options.filter(Boolean)
    if (!q) return pool.slice(0, 8)
    return pool.filter(o => o.toLowerCase().includes(q) && o.toLowerCase() !== q).slice(0, 8)
  }, [value, options])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const choose = (option) => {
    onChange(option)
    setOpen(false)
    setHighlight(-1)
  }

  const onKeyDown = (e) => {
    if (!open || matches.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % matches.length) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => (h - 1 + matches.length) % matches.length) }
    if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); choose(matches[highlight]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        value={value || ''}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        invalid={invalid}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        {...props}
      />

      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 py-1 max-h-56 overflow-y-auto
                     bg-white rounded-xl shadow-float border border-ink-100"
        >
          {matches.map((option, i) => (
            <li key={option} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(option)}
                className={cn(
                  'w-full text-left px-3.5 py-2 text-sm text-ink-700 transition-colors duration-120',
                  i === highlight ? 'bg-ink-100' : 'hover:bg-ink-50',
                )}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Country picker ──────────────────────────────────────────────────────────

export function CountrySelect({ value, onChange, id }) {
  return (
    <Select id={id} value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">— Select —</option>
      {COUNTRIES.map(c => (
        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
      ))}
    </Select>
  )
}

// ─── Deadline input ──────────────────────────────────────────────────────────

/**
 * A deadline is a date, a wall-clock time, and the zone that clock belongs to.
 *
 * Capturing only a date is what made the old app dangerous for international
 * applications: "Dec 15" at a US university is the 16th in India, and the old
 * UI had no way to know or say that. Time defaults to 23:59 and the zone
 * defaults from the university's country, so in the common case there is
 * nothing extra to fill in — the defaults are the recommendation (charter #1).
 */
export function DeadlineInput({ value, onChange, countryCode, label, hint, id }) {
  const generatedId = useId()
  const fieldId = id || generatedId

  // Accept a legacy bare string and upgrade it in place.
  const current = typeof value === 'string'
    ? { date: value, time: DEFAULT_DEADLINE_TIME, tz: '' }
    : (value || { date: '', time: DEFAULT_DEADLINE_TIME, tz: '' })

  const suggestedTz = countryCode ? timezoneForCountry(countryCode) : HOME_TIMEZONE
  const effectiveTz = current.tz || suggestedTz

  const set = (patch) => {
    const next = { ...current, ...patch }
    if (!next.date) { onChange(null); return }
    onChange({
      date: next.date,
      time: next.time || DEFAULT_DEADLINE_TIME,
      tz: next.tz || suggestedTz,
    })
  }

  const preview = current.date
    ? describeDeadline({ date: current.date, time: current.time || DEFAULT_DEADLINE_TIME, tz: effectiveTz })
    : null

  return (
    <Field label={label} hint={hint} htmlFor={fieldId}>
      <div className="grid grid-cols-[1fr,auto] gap-2">
        <Input
          id={fieldId}
          type="date"
          value={current.date || ''}
          onChange={e => set({ date: e.target.value })}
        />
        <Input
          type="time"
          aria-label="Deadline time"
          value={current.time || DEFAULT_DEADLINE_TIME}
          onChange={e => set({ time: e.target.value })}
          disabled={!current.date}
          className="w-[7.5rem]"
        />
      </div>

      {current.date && (
        <div className="space-y-2 pt-1">
          <Select
            aria-label="Deadline timezone"
            value={effectiveTz}
            onChange={e => set({ tz: e.target.value })}
            className="text-xs py-2"
          >
            {/* The university's own zone first, since that is what the portal
                enforces, then the applicant's for the rarer local case. */}
            {[...new Set([suggestedTz, HOME_TIMEZONE, ...COUNTRIES.map(c => c.tz)])].map(tz => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
                {tz === suggestedTz ? ' — university' : tz === HOME_TIMEZONE ? ' — your time' : ''}
              </option>
            ))}
          </Select>

          {/* The line that stops a late submission. */}
          {preview?.crossesDay && (
            <p className="flex items-start gap-1.5 text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2 leading-relaxed">
              <Globe2 size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                That is <strong>{preview.homeDate}, {preview.homeTime}</strong> where you are —
                a day {preview.homeDate > preview.schoolDate ? 'later' : 'earlier'} than the
                university&apos;s date.
              </span>
            </p>
          )}
        </div>
      )}
    </Field>
  )
}

// ─── Modal-safe dismiss guard ────────────────────────────────────────────────

/**
 * Tracks whether a form has unsaved edits.
 *
 * Clicking the backdrop of a half-filled application form used to discard it
 * instantly with no warning — a genuinely costly accident given how long these
 * forms are.
 */
export function useDirtyTracking(initialValue) {
  const initial = useRef(JSON.stringify(initialValue))
  const [dirty, setDirty] = useState(false)

  const check = (current) => {
    setDirty(JSON.stringify(current) !== initial.current)
  }

  const reset = (value) => {
    initial.current = JSON.stringify(value)
    setDirty(false)
  }

  return { dirty, check, reset }
}
