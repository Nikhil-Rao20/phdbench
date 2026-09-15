// src/components/Modal.jsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from './ui'

/**
 * The unsaved-changes warning.
 *
 * Rendered inside the app rather than through `window.confirm`. The native
 * dialog is jarring, unstyleable, blocks the whole browser, and reads like the
 * page has gone wrong — and the previous version fired it on *every* backdrop
 * click, including when nothing had been typed at all.
 */
function DiscardPrompt({ open, onKeepEditing, onDiscard }) {
  const discardRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    // Focus the safe option, not the destructive one.
    const timer = setTimeout(() => discardRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-t-3xl sm:rounded-3xl"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            className="relative w-full max-w-sm bg-white rounded-2xl border border-ink-200
                       shadow-float p-5"
          >
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={17} className="text-amber-600" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 id="discard-title" className="font-medium text-ink-900">
                  Discard your changes?
                </h3>
                <p className="text-sm text-ink-500 mt-1 leading-relaxed">
                  You have edits here that have not been saved. Closing now loses them.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                ref={discardRef}
                onClick={onKeepEditing}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                           bg-ink-900 text-white hover:bg-ink-800 active:scale-[0.97]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                           focus-visible:ring-offset-2 transition-all duration-150"
              >
                Keep editing
              </button>
              <button
                onClick={onDiscard}
                className="px-4 py-2.5 rounded-xl text-sm font-medium
                           text-rose-600 hover:bg-rose-50 active:scale-[0.97]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300
                           transition-all duration-150"
              >
                Discard
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default function Modal({
  open, onClose, title, description, children, wide = false,
  /**
   * Whether the form inside has actually been edited.
   *
   * Only when this is true does closing ask for confirmation. An untouched form
   * closes immediately on a backdrop click or Escape, which is what clicking
   * outside a dialog is supposed to do — the previous version prompted every
   * time regardless, which trained you to dismiss the warning without reading
   * it and made the real one worthless.
   */
  isDirty = false,
}) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)
  const [askingToDiscard, setAskingToDiscard] = useState(false)

  // Read through a ref so the key handler below never needs re-binding, and can
  // never capture a stale value of `isDirty`.
  const dirtyRef = useRef(isDirty)
  useEffect(() => { dirtyRef.current = isDirty }, [isDirty])

  // `onClose` is passed as an inline arrow by every caller, so its identity
  // changes on each render. Depending on it directly made the effect below
  // re-run constantly — and its cleanup restores focus to whatever was focused
  // before the modal opened, so focus was being yanked out of the form.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const attemptClose = () => {
    if (dirtyRef.current) {
      setAskingToDiscard(true)
      return
    }
    onCloseRef.current()
  }

  const discardAndClose = () => {
    setAskingToDiscard(false)
    onCloseRef.current()
  }

  useEffect(() => {
    if (!open) { setAskingToDiscard(false); return undefined }

    previouslyFocused.current = document.activeElement
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        // Escape inside the discard prompt backs out of the prompt, not the form.
        setAskingToDiscard(asking => {
          if (asking) return false
          if (dirtyRef.current) return true
          onCloseRef.current()
          return false
        })
        return
      }

      // Keep focus inside the dialog — without this, tabbing walks out into the
      // page behind and the modal stops being a modal.
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKeyDown, true)
    const focusTimer = setTimeout(() => {
      panelRef.current?.querySelector('input, textarea, select, button')?.focus()
    }, 60)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = original
      clearTimeout(focusTimer)
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  // Rendered into document.body, not in place.
  //
  // Layout animates the page with a motion.div, and a CSS transform on an
  // ancestor becomes the containing block for its position:fixed descendants.
  // In place, this "full screen" overlay was confined to the content column —
  // it never covered the sidebar, so the nav stayed lit and clickable behind a
  // supposedly modal dialog, and a backdrop click over it hit the nav instead.
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-[3px]"
            onClick={attemptClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'relative w-full bg-white shadow-float',
              // On a phone the sheet rises from the bottom, which is both the
              // familiar pattern and the reachable one.
              'rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-2xl',
            )}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-ink-100 shrink-0">
              <div className="min-w-0">
                <h2 className="font-display text-xl text-ink-900">{title}</h2>
                {description && (
                  <p className="text-sm text-ink-500 mt-1 leading-relaxed max-w-prose">{description}</p>
                )}
              </div>
              <button
                onClick={attemptClose}
                aria-label="Close"
                className="shrink-0 p-2 -mr-1 -mt-1 rounded-lg text-ink-400
                           hover:bg-ink-100 hover:text-ink-800 active:scale-90
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                           transition-all duration-150"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6 flex-1">
              {children}
            </div>

            <DiscardPrompt
              open={askingToDiscard}
              onKeepEditing={() => setAskingToDiscard(false)}
              onDiscard={discardAndClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
