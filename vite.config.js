import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/phdbench/',
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
