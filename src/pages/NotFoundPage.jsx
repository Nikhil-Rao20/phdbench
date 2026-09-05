// src/pages/NotFoundPage.jsx
// Charter #12. The previous router sent every unknown path to the dashboard with
// `<Navigate to="/" replace />`, which silently swallows typos and stale links —
// you end up on the dashboard with no idea your URL was wrong.

import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Compass, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-prose">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-6"
        >
          <Compass size={26} className="text-ink-400" aria-hidden="true" />
        </motion.div>

        <h1 className="font-display text-5xl text-ink-900 mb-3">
          Nothing here
        </h1>

        <p className="text-ink-500 leading-relaxed mb-2">
          There is no page at this address.
        </p>
        <p className="text-sm text-ink-400 font-mono mb-8 break-all">
          {pathname}
        </p>

        <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/')}>
          Back to the dashboard
        </Button>
      </div>
    </div>
  )
}
