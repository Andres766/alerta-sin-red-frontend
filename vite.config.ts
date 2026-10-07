/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const API_TARGET = process.env.VITE_API_PROXY ?? 'http://localhost:8000'
const proxy = { '/api': { target: API_TARGET, changeOrigin: true } }

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest: el Service Worker es código propio (src/sw.ts); Workbox solo
      // inyecta la lista de archivos del "app shell" a precachear.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] },
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'AlertaSinRed — Alertas de riesgo climático',
        short_name: 'AlertaSinRed',
        description: 'Consulta el riesgo de deslizamiento y creciente de tu zona, incluso sin internet.',
        lang: 'es-CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8fafc',
        theme_color: '#0f172a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
