// src/hooks/useDirty.js
import { useEffect, useMemo, useRef } from 'react'

/**
 * Report whether a form's values differ from what it opened with.
 *
 * The modal uses this to decide whether closing needs a warning. Without it,
 * every backdrop click prompted "discard your changes?" — including on a form
 * nobody had touched, which is both wrong and the fastest way to teach someone
 * to click through warnings without reading them.
 *
 * Comparison is a canonical JSON stringify: the values here are plain form
 * state (strings, booleans, small arrays and objects), so this is cheap and
 * exact. Key order is normalised because object spread can reorder keys without
 * anything actually changing.
 */
function canonical(value) {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.map(canonical)
  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((out, key) => {
        const v = canonical(value[key])
        // Treat absent and empty-string as the same, so a field that was never
        // filled does not register as an edit merely by being initialised.
        if (v === null || v === '') return out
        out[key] = v
        return out
      }, {})
  }
  return value
}

const fingerprint = (value) => JSON.stringify(canonical(value))

export function useDirty(values, onDirtyChange) {
  // The baseline is captured once, on mount, and deliberately not updated when
  // `values` changes — it is what the form opened with.
  const baseline = useRef(null)
  if (baseline.current === null) baseline.current = fingerprint(values)

  const dirty = useMemo(
    () => fingerprint(values) !== baseline.current,
    [values],
  )

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  return dirty
}
