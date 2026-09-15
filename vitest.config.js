import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Pure-logic tests (dates, derivations) need no DOM, but the hook tests do.
    // jsdom for everything is simpler than splitting the suite in two.
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{js,jsx}'],
  },
})
