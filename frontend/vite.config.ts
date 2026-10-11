import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:3000', // Đổi thành backend vì chạy trong mạng lưới của Docker
        changeOrigin: true,
      },
    }
  }
})
