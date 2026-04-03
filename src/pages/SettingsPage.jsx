import { useAuth } from '../hooks/useAuth'
import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import DocumentsManager from '../components/DocumentsManager'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="text-ink-500 text-sm mt-0.5">Customize your PhDBench experience.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card p-6"
      >
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-ink-100">
          <Settings size={20} className="text-ink-600" />
          <h2 className="font-display text-lg text-ink-900">Documents</h2>
        </div>
        <DocumentsManager uid={user?.uid} />
      </motion.div>
    </div>
  )
}
