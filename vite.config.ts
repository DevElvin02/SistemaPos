import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isElectronBuild = process.env.ELECTRON === 'true'

export default defineConfig({
  base: isElectronBuild ? './' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    minify: 'terser',
  },
})
