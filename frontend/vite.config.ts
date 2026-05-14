import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 12062,
    proxy: {
      '/api': {
        target: 'http://localhost:12063',
        changeOrigin: true,
      },
    },
  },
})
