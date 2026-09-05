// src/components/Modal.jsx
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from './ui'

export default function Modal({
  open, onClose, title, description, children, wide = false,
  /**
   * When true, a backdrop click or Escape asks before discarding.
   * The application form is long; losing a half-filled one to a stray click on
   * the backdrop was a real and expensive accident.
   */
  confirmClose = false,
}) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)

  const attemptClose = () => {
    if (confirmClose && !window.confirm('Discard your changes to this form?')) return
    onClose()
  }

  useEffect(() => {
    if (!open) return undefined

    previouslyFocused.current = document.activeElement
    // Stop the page behind scrolling while a modal is up.
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); attemptClose(); return }

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
  }, [open, confirmClose])

  return (
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
