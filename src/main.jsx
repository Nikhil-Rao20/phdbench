import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename="/phdbench">
        <ToastProvider>
          <AuthProvider>
            <App />
            <Toaster />
            <ConnectionStatus />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
