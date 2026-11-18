import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `base` lets the app live in a sub-folder (e.g. GitHub Pages /lift/).
// Set BASE_PATH when building for a sub-folder; defaults to the site root.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'exercises/**/*'],
      manifest: {
        name: 'Lift',
        short_name: 'Lift',
        description: 'Offline strength log with daily plans from Claude',
        theme_color: '#0F1012',
        background_color: '#0F1012',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: 'index.html',
        // Google Fonts: cache after first load so they work offline too.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ],
  test: { environment: 'node' }
});
