// src/components/ConnectionStatus.jsx
// Charter #12: offline is a state, and the user needs to know they are in it.
//
// Firestore's persistent cache means the app keeps working with no connection —
// reads come from cache and writes queue. That is only reassuring if the user is
// told; without a signal, a write that has not reached the server yet looks
// identical to one that has, and the user has no way to know their laptop
// closing might lose it.

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff, Cloud } from 'lucide-react'

export default function ConnectionStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    const goOffline = () => { setOnline(false); setJustReconnected(false) }
    const goOnline = () => {
      setOnline(true)
      setJustReconnected(true)
      setTimeout(() => setJustReconnected(false), 3500)
    }

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  const show = !online || justReconnected

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[75] pointer-events-none"
        >
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full shadow-float text-xs font-medium ${
              online
                ? 'bg-sage-600 text-white'
                : 'bg-ink-900 text-white'
            }`}
          >
            {online
              ? <Cloud size={13} aria-hidden="true" />
              : <CloudOff size={13} aria-hidden="true" />}
            {online
              ? 'Back online — your changes are syncing'
              : 'Offline — changes are saved here and will sync'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
