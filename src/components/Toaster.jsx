// src/components/Toaster.jsx
// The visible half of the feedback system. Charter #10 (colour with a job),
// #11 (layered depth), #13 (microinteractions confirm reality).

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, Undo2, X, RotateCw, Loader2 } from 'lucide-react'
import { useToast } from '../hooks/useToast'

const TONES = {
  success: {
    icon: CheckCircle2,
    // Sage = good/done, consistently, everywhere it appears.
    ring: 'ring-sage-200',
    iconClass: 'text-sage-600',
    bar: 'bg-sage-500',
  },
  error: {
    icon: AlertTriangle,
    ring: 'ring-rose-200',
    iconClass: 'text-rose-600',
    bar: 'bg-rose-500',
  },
  info: {
    icon: Info,
    ring: 'ring-sky-200',
    iconClass: 'text-sky-600',
    bar: 'bg-sky-500',
  },
  undo: {
    icon: Undo2,
    ring: 'ring-ink-200',
    iconClass: 'text-ink-600',
    bar: 'bg-ink-500',
  },
}

function Toast({ toast, onDismiss }) {
  const tone = TONES[toast.tone] || TONES.info
  const Icon = toast.spinner ? Loader2 : tone.icon
  const timed = toast.duration !== Infinity && toast.tone !== 'error'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      // Nested elevation: this sits above everything, so it gets the strongest
      // shadow in the system (charter #11).
      className={`relative overflow-hidden pointer-events-auto w-full sm:w-[380px]
                  rounded-2xl bg-white ring-1 ${tone.ring} shadow-float`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon
          size={18}
          className={`${tone.iconClass} shrink-0 mt-0.5 ${toast.spinner ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-800 leading-relaxed">{toast.message}</p>

          {/* The raw error, available but not shouted. */}
          {toast.detail && toast.detail !== toast.message && (
            <p className="mt-1 text-xs text-ink-400 font-mono break-words leading-relaxed">
              {toast.detail}
            </p>
          )}

          {(toast.onUndo || toast.onRetry) && (
            <div className="mt-3 flex items-center gap-2">
              {toast.onUndo && (
                <button
                  onClick={() => { toast.onUndo(); onDismiss(toast.id) }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-ink-900 text-white text-xs font-medium
                             hover:bg-ink-800 active:scale-95
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                             transition-all duration-150"
                >
                  <Undo2 size={13} aria-hidden="true" /> Undo
                </button>
              )}
              {toast.onRetry && (
                <button
                  onClick={() => { toast.onRetry(); onDismiss(toast.id) }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-white border border-ink-200 text-ink-700 text-xs font-medium
                             hover:bg-ink-50 active:scale-95
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                             transition-all duration-150"
                >
                  <RotateCw size={13} aria-hidden="true" /> Try again
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss"
          title="Dismiss"
          className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-ink-300
                     hover:text-ink-700 hover:bg-ink-100 active:scale-90
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                     transition-all duration-150"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* A visible countdown, so a disappearing toast is expected rather than
          startling — and so an undo window has an obvious length. */}
      {timed && (
        <motion.div
          className={`absolute bottom-0 left-0 h-0.5 ${tone.bar}`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}

export default function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      // Sits clear of the mobile dock so it never covers navigation.
      className="fixed z-[90] inset-x-0 bottom-0 sm:inset-x-auto sm:right-6 sm:bottom-6
                 flex flex-col-reverse items-center sm:items-end gap-3
                 p-4 pb-24 sm:pb-6 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}
