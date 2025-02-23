import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      external: [
        'electron',
        'electron-is-dev',
        'crypto',
        'fs/promises',
        'path'
      ],
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'buffer': 'buffer/'
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'jsqr', 'buffer'],
    exclude: ['electron', 'electron-is-dev']
  },
  server: {
    port: 5173,
  },
}) 