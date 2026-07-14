import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// Deploys to https://andi-1302.github.io/Arc/ — base must match the repo name exactly (spec §2).
const base = '/Arc/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // default globPatterns omit fonts — without them the self-hosted Barlow Condensed/Inter
        // faces fall back to system fonts offline, so add them explicitly for full offline use.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}'],
      },
      manifest: {
        name: 'Blocks',
        short_name: 'Blocks',
        description: 'Personal goal & training tracker',
        theme_color: '#1f4fe0',
        background_color: '#f4f5f3',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Log entry', short_name: 'Log', url: base, description: 'Open Today to log a routine or metric' },
          {
            name: 'Review cards',
            short_name: 'Review',
            url: `${base}more/review`,
            description: 'Jump straight into flashcard review',
          },
        ],
      },
    }),
  ],
})
