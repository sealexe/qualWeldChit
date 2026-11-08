import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // На Windows localhost может резолвиться только в IPv6 (::1),
    // и тогда по 127.0.0.1 браузер получает ERR_CONNECTION_REFUSED.
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
