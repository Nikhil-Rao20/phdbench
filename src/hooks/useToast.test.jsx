// Regression tests for the "stuck spinner after every save" bug.
//
// The chain was: ToastProvider rebuilt its context value on every toast →
// DataProvider listed `toast` in its effect dependencies → the effect re-ran,
// tore down all four Firestore subscriptions and set loading back to true →
// the effect that cleared loading watched `ready`, which had not changed, so it
// never fired again. Result: a successful save left the app spinning with the
// data hidden until a manual reload.
//
// The guarantee these tests pin is narrow and load-bearing: the toast API
// object must be referentially stable across toast activity.

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ToastProvider, useToast, useToastList } from './useToast'

const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>

describe('toast API stability', () => {
  it('returns the same object reference after a toast is pushed', () => {
    const { result } = renderHook(() => useToast(), { wrapper })

    const before = result.current
    act(() => { result.current.success('Saved.') })

    // If this fails, every consumer with `toast` in a dependency array re-runs
    // its effect — which is precisely how the app got stuck loading.
    expect(result.current).toBe(before)
  })

  it('stays stable across many toasts and a dismissal', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    const before = result.current

    let id
    act(() => {
      result.current.success('One')
      result.current.error('Two')
      id = result.current.push({ tone: 'info', message: 'Three' })
    })
    act(() => { result.current.dismiss(id) })

    expect(result.current).toBe(before)
  })

  it('still delivers toasts to the list context', () => {
    const { result } = renderHook(
      () => ({ api: useToast(), list: useToastList() }),
      { wrapper },
    )

    expect(result.current.list).toHaveLength(0)
    act(() => { result.current.api.success('Saved.') })

    // Stability must not have been bought by breaking delivery.
    expect(result.current.list).toHaveLength(1)
    expect(result.current.list[0].message).toBe('Saved.')
    expect(result.current.list[0].tone).toBe('success')
  })

  it('replaces a keyed toast rather than stacking duplicates', () => {
    const { result } = renderHook(
      () => ({ api: useToast(), list: useToastList() }),
      { wrapper },
    )

    act(() => {
      result.current.api.error('Could not load your leads.', { key: 'load-leads' })
      result.current.api.error('Could not load your leads.', { key: 'load-leads' })
      result.current.api.error('Could not load your leads.', { key: 'load-leads' })
    })

    expect(result.current.list).toHaveLength(1)
  })
})
