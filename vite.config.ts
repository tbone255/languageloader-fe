import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    // Dev: the Express server (npm run dev:server) handles /api
    proxy: { '/api': 'http://localhost:3000' },
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LanguageLoader',
        short_name: 'LangLoader',
        description: 'Learn Pashto with science-backed spaced repetition',
        theme_color: '#570df8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache lesson JSON files and app shell for offline use
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        // /api must hit the server: auth redirects (/api/login) break if the
        // service worker serves the app shell instead
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'audio-cache', expiration: { maxEntries: 500 } },
          },
        ],
      },
    }),
  ],
})
