// src/components/NotAuthorized.jsx
// Shown when someone signs in with an account that is not the owner's.
//
// This screen is also the safety net for a misconfigured OWNER_EMAIL. If the
// address in src/lib/config.js is wrong, the owner lands here — so it names the
// address they actually signed in with, and says exactly which file to change.
// A lockout screen that does not tell you how to get back in is a trap.

import { ShieldX, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { OWNER_EMAIL } from '../lib/config'

export default function NotAuthorized() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-float p-8 sm:p-10">
          <div className="w-12 h-12 rounded-2xl bg-ink-100 flex items-center justify-center mb-6">
            <ShieldX size={22} className="text-ink-600" aria-hidden="true" />
          </div>

          <h1 className="font-display text-3xl text-ink-900 mb-3">
            This one is private.
          </h1>

          <p className="text-ink-600 leading-relaxed mb-6">
            PhDBench is a personal application tracker belonging to a single
            account. Nothing here is available to other sign-ins.
          </p>

          <div className="rounded-2xl bg-ink-50 p-4 mb-8 space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs text-ink-400 uppercase tracking-wider">You signed in as</span>
              <span className="text-sm text-ink-800 font-medium truncate">{user?.email || '—'}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs text-ink-400 uppercase tracking-wider">Owner account</span>
              <span className="text-sm text-ink-500 truncate">
                {OWNER_EMAIL.replace(/^(.{3}).*(@.*)$/, '$1•••$2')}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                       bg-ink-900 text-white text-sm font-medium
                       hover:bg-ink-800 active:scale-[0.98]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                       transition-all duration-150"
          >
            <LogOut size={15} aria-hidden="true" /> Sign in with a different account
          </button>
        </div>

        {/* Only useful to the person who owns the code, and harmless to anyone
            else — the address is already masked above. */}
        <p className="text-center text-xs text-ink-400 mt-6 leading-relaxed">
          If this is your tool and you are seeing this screen, the owner address in{' '}
          <code className="font-mono text-ink-500">src/lib/config.js</code> does not
          match the account above. Update it there and in{' '}
          <code className="font-mono text-ink-500">firestore.rules</code>.
        </p>
      </div>
    </div>
  )
}
