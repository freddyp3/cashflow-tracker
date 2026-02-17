/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),       // React Fast Refresh for HMR during development
    tailwindcss(), // Tailwind CSS v4 integration (replaces PostCSS config)
  ],
  server: {
    // Proxy /api/* requests to the Spring Boot backend during development.
    // In production, a reverse proxy (e.g. nginx) would handle this.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
