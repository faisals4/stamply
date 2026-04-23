import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Dedupe React so nested copies (e.g. from cmdk) resolve to the same
    // instance as the app — otherwise you get hook-call errors like
    // "Cannot read properties of null (reading 'useRef')".
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5190,
    strictPort: true,
    // When ngrok forwards `https://stamply.ngrok.app` to this dev server
    // we need to (a) accept the unfamiliar host header and (b) forward
    // every `/api/*` request to the Laravel backend so the React SPA
    // and the API live at the same origin behind a single tunnel. This
    // is the simplest way to give Apple Wallet ONE webServiceURL that
    // returns both the .pkpass HTML page and the JSON web service.
    //
    // `/app/*` is also proxied to Laravel so the exported Expo web
    // build (served by Laravel from `api/public/app/`) lives at the
    // same origin as the merchant SPA and the API. This gives the
    // customer mobile app its public URL at
    // `https://stamply.ngrok.app/app`.
    allowedHosts: ['localhost', '.ngrok.app', '.ngrok-free.dev', '.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
      '/app': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})
