import { useAuth } from '../hooks/useAuth'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const { login, error } = useAuth()

  return (
    <div className="min-h-screen flex" style={{ background: '#f6f5f0' }}>
      {/* Left panel — dark */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-950 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sage-500 flex items-center justify-center">
            <span className="font-display text-sm text-white">P</span>
          </div>
          <span className="font-display text-lg tracking-wide">PhDBench</span>
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-ink-400 text-sm uppercase tracking-widest mb-4">Your command center for</p>
            <h1 className="font-display text-5xl leading-tight text-white mb-6">
              PhD<br/>applications.
            </h1>
            <p className="text-ink-400 text-base leading-relaxed max-w-sm">
              Track leads, manage applications, follow up with professors, and
              never miss a deadline — all in one private workspace.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-12 grid grid-cols-3 gap-6"
          >
            {[
              { n: '2',  label: 'App routes' },
              { n: '∞',  label: 'Labs tracked' },
              { n: '0',  label: 'Deadlines missed' },
            ].map(s => (
              <div key={s.label}>
                <div className="font-display text-3xl text-white">{s.n}</div>
                <div className="text-ink-500 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="text-ink-600 text-xs">Built by Nikhil Rao · RGUKT Nuzvid</p>
      </div>

      {/* Right panel — sign in */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-sage-500 flex items-center justify-center">
              <span className="font-display text-sm text-white">P</span>
            </div>
            <span className="font-display text-lg text-ink-900">PhDBench</span>
          </div>

          <h2 className="font-display text-3xl text-ink-900 mb-2">Welcome back</h2>
          <p className="text-ink-500 text-sm mb-8">Sign in with Google to access your bench.</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5
                       bg-white border border-ink-200 rounded-xl shadow-sm
                       text-ink-800 text-sm font-medium
                       hover:bg-ink-50 hover:border-ink-300 hover:shadow
                       active:scale-98 transition-all duration-150"
          >
            {/* Google G */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-ink-400 text-xs mt-6">
            Private to you — data stored in your Firestore.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
