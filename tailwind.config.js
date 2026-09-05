/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // No dark mode, deliberately. See docs/UX_CHARTER.md.
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      // ── Typographic rhythm (charter #9) ────────────────────────────────────
      // Tight, negative tracking on display sizes; open, positive tracking on
      // the small uppercase labels; body set at 1.6 so text can breathe.
      fontSize: {
        '2xs':    ['0.6875rem', { lineHeight: '1rem',     letterSpacing: '0.02em' }],
        xs:       ['0.75rem',   { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
        sm:       ['0.875rem',  { lineHeight: '1.5rem'  }],
        base:     ['1rem',      { lineHeight: '1.6rem'  }],
        lg:       ['1.125rem',  { lineHeight: '1.75rem', letterSpacing: '-0.005em' }],
        xl:       ['1.25rem',   { lineHeight: '1.85rem', letterSpacing: '-0.01em' }],
        '2xl':    ['1.5rem',    { lineHeight: '1.9rem',  letterSpacing: '-0.015em' }],
        '3xl':    ['1.875rem',  { lineHeight: '2.2rem',  letterSpacing: '-0.02em' }],
        '4xl':    ['2.25rem',   { lineHeight: '2.5rem',  letterSpacing: '-0.025em' }],
        '5xl':    ['3rem',      { lineHeight: '3.2rem',  letterSpacing: '-0.03em' }],
      },

      // Prose measure cap (charter #9) — roughly 68 characters.
      maxWidth: {
        prose: '34rem',
      },

      colors: {
        ink: {
          50:  '#f6f5f0',
          100: '#eceade',
          200: '#d8d4c4',
          300: '#b8b19a',
          400: '#978d76',
          500: '#7a705e',
          600: '#5f5749',
          700: '#47412f',
          800: '#2e2b21',
          900: '#1a1914',
          950: '#0e0d0a',
        },
        sage: {
          50:  '#f2f7f4',
          100: '#deeee6',
          200: '#beddcc',
          300: '#93c5a9',
          400: '#65a882',
          500: '#448d65',
          600: '#336f50',
          700: '#295941',
          800: '#214735',
          900: '#1b3b2c',
        },
        amber: {
          50:  '#fdf8ec',
          100: '#faefc9',
          200: '#f5db8f',
          300: '#efc354',
          400: '#e8ad2a',
          500: '#d4911a',
          600: '#b97314',
          700: '#955514',
          800: '#7b4317',
          900: '#683918',
        },
        rose: {
          50:  '#fff1f2',
          100: '#ffe4e7',
          200: '#fecdd4',
          300: '#fda4b0',
          400: '#fb7186',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        sky: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },

      // ── Layered depth (charter #11) ───────────────────────────────────────
      // Elevation is a scale, not a set of unrelated values. A surface sitting
      // on the page gets a soft wide shadow; something nested inside it gets a
      // tighter, stronger one; anything floating above everything gets the
      // strongest. Shadows are warm-tinted to match the paper background rather
      // than the neutral grey of a default shadow.
      boxShadow: {
        surface: '0 1px 2px rgba(26,25,20,0.04), 0 4px 16px rgba(26,25,20,0.03)',
        raised:  '0 2px 4px rgba(26,25,20,0.05), 0 8px 24px rgba(26,25,20,0.06)',
        nested:  '0 1px 3px rgba(26,25,20,0.08), 0 6px 14px rgba(26,25,20,0.07)',
        float:   '0 8px 16px rgba(26,25,20,0.08), 0 24px 48px rgba(26,25,20,0.12)',
        dock:    '0 4px 12px rgba(26,25,20,0.10), 0 16px 40px rgba(26,25,20,0.16)',
        inset:   'inset 0 1px 2px rgba(26,25,20,0.06)',
      },

      // ── Motion (charter #13: short, eased, explains what moved) ───────────
      transitionDuration: {
        120: '120ms',
        250: '250ms',
      },
      animation: {
        'fade-in':       'fadeIn 0.25s ease-out',
        'slide-up':      'slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right':'slideInRight 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-soft':    'pulseSoft 2s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
        'shimmer':       'shimmer 1.6s ease-in-out infinite',
        'check-pop':     'checkPop 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        // Loading skeletons, so a wait shows shape rather than a bare spinner.
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        checkPop: { '0%': { transform: 'scale(0.7)', opacity: 0 }, '60%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
    },
  },
  plugins: [],
}
