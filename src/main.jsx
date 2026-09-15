import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { AccessProvider } from './hooks/useAccess'
import { ToastProvider } from './hooks/useToast'
import Toaster from './components/Toaster'
import ConnectionStatus from './components/ConnectionStatus'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// The GitHub Pages deep-link handshake.
//
// `public/404.html` catches a direct hit on /phdbench/applications (GitHub Pages
// has no server-side routing) and redirects to /phdbench/?/applications. Nothing
// ever decoded that back, so every refresh and every shared link silently landed
// on the dashboard instead. This restores the real path before React Router
// reads the URL.
;(function restoreDeepLink() {
  const { search, hash, pathname } = window.location
  if (!search.startsWith('?/')) return
  const decoded = search
    .slice(2)
    .split('&')
    .map(part => part.replace(/~and~/g, '&'))
    .join('?')
  window.history.replaceState(null, '', pathname.replace(/\/$/, '') + '/' + decoded + hash)
})()

// Clickjacking defence (frame-buster).
//
// GitHub Pages sets no headers, so X-Frame-Options is unavailable and CSP's
// frame-ancestors cannot be set from a meta tag. If this page is ever framed by
// another site — to overlay invisible buttons on top of real ones — break out of
// the frame rather than render inside it.
try {
  if (window.top !== window.self) {
    window.top.location = window.self.location
  }
} catch {
  // Cross-origin access to window.top throws, which itself proves we are framed
  // by a foreign site. Refuse to render at all.
  document.documentElement.innerHTML =
    '<p style="font:16px system-ui;padding:2rem">PhDBench cannot be displayed inside another site.</p>'
  throw new Error('Refusing to render inside a cross-origin frame')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename="/phdbench">
        <ToastProvider>
          <AuthProvider>
            <AccessProvider>
              <App />
            </AccessProvider>
            <Toaster />
            <ConnectionStatus />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
