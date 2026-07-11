import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base is set for GitHub Pages deploy in build phase 8 (§2/§13.8) — root for now
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Blocks',
        short_name: 'Blocks',
        description: 'Personal goal & training tracker',
        theme_color: '#1f4fe0',
        background_color: '#f4f5f3',
        display: 'standalone',
        icons: [],
      },
    }),
  ],
})
