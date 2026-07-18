import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Cadence',
        short_name: 'Cadence',
        description:
          'Consult-to-home handoff: the conversation becomes the care plan — captured live, handed off visually, kept alive at home.',
        theme_color: '#f7f8fa',
        background_color: '#f7f8fa',
        display: 'standalone',
        start_url: '/patient',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // SPA routes (patient/clinic) resolve to index.html when offline.
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Never serve shared state from cache — both surfaces poll
            // /api/state every ~1s and stale state would break the live
            // handoff moment.
            urlPattern: /\/api\/.*/,
            handler: 'NetworkOnly',
          },
          {
            // Object renders can be cached aggressively.
            urlPattern: /\/objects\/.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'object-renders',
              expiration: { maxEntries: 24 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts' },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/health': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
