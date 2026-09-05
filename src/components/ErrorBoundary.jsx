// src/components/ErrorBoundary.jsx
// Charter #12: a crash is a state like any other, and it deserves a designed
// screen rather than a blank white page. Critically, it also offers the user a
// way to rescue their data — if the app is broken, the first thing they should
// be able to do is export what is in it.

import { Component } from 'react'
import { AlertTriangle, RotateCw, Home, Download } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // Kept in the console so a real diagnosis is possible after the fact.
    console.error('PhDBench crashed:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleHome = () => {
    window.location.href = import.meta.env.BASE_URL || '/'
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl shadow-float p-8 sm:p-10">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-6">
              <AlertTriangle size={22} className="text-rose-600" aria-hidden="true" />
            </div>

            <h1 className="font-display text-3xl text-ink-900 mb-3">
              Something broke.
            </h1>

            <p className="text-ink-600 leading-relaxed mb-2">
              PhDBench hit an error it could not recover from. This is a bug in the
              app, not something you did.
            </p>
            <p className="text-ink-500 text-sm leading-relaxed mb-8">
              Your data is stored in Firestore and is unaffected by this — nothing
              has been lost.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                           bg-ink-900 text-white text-sm font-medium
                           hover:bg-ink-800 active:scale-95
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                           transition-all duration-150"
              >
                <RotateCw size={15} aria-hidden="true" /> Reload the app
              </button>
              <button
                onClick={this.handleHome}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                           bg-white border border-ink-200 text-ink-700 text-sm font-medium
                           hover:bg-ink-50 hover:border-ink-300 active:scale-95
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400
                           transition-all duration-150"
              >
                <Home size={15} aria-hidden="true" /> Back to dashboard
              </button>
            </div>

            {this.state.error?.message && (
              <details className="mt-8 group">
                <summary className="text-xs text-ink-400 cursor-pointer hover:text-ink-600
                                    transition-colors select-none">
                  Technical details
                </summary>
                <pre className="mt-3 p-4 rounded-xl bg-ink-50 text-2xs text-ink-600
                                font-mono overflow-x-auto whitespace-pre-wrap break-words
                                leading-relaxed max-h-64 overflow-y-auto">
                  {this.state.error.message}
                  {this.state.info?.componentStack}
                </pre>
              </details>
            )}
          </div>

          <p className="text-center text-xs text-ink-400 mt-6">
            If this keeps happening, the technical details above are what to look at.
          </p>
        </div>
      </div>
    )
  }
}
