import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/phdbench/',
  plugins: [
    react(),

    // Installable, and useful without a connection.
    //
    // The realistic case this serves: you spot a position on LinkedIn on your
    // phone, on the metro, with no signal. Firestore's persistent cache already
    // queues the write; this makes the app itself reachable so you can get to
    // the form at all.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'NikhilRao.png', 'robots.txt'],
      manifest: {
        name: 'PhDBench — PhD Application Tracker',
        short_name: 'PhDBench',
        description: 'Track PhD leads, applications, deadlines, documents and follow-ups.',
        start_url: '/phdbench/',
        scope: '/phdbench/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f5f0',
        theme_color: '#1a1914',
        icons: [
          { src: 'NikhilRao.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'NikhilRao.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'NikhilRao.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // A single-page app served from GitHub Pages: anything not cached falls
        // back to the shell, and the router takes it from there.
        navigateFallback: '/phdbench/index.html',
        navigateFallbackDenylist: [/^\/phdbench\/api/],
        // Never cache Firestore or auth traffic — a stale response there would
        // show the user data that is not real.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\//,
            handler: 'NetworkOnly',
          },
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor'
          if (id.includes('firebase')) return 'firebase-vendor'
          if (id.includes('framer-motion')) return 'motion-vendor'
          if (id.includes('react-router')) return 'router-vendor'
          if (id.includes('lucide-react')) return 'icons-vendor'
          if (id.includes('date-fns')) return 'date-vendor'
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
        },
      },
    },
  },
})
