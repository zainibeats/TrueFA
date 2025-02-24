import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      external: [
        'electron',
        'electron-is-dev',
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
      'crypto': 'crypto-browserify',
      'stream': 'stream-browserify',
      'buffer': 'buffer',
      'process': 'process/browser'
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'jsqr', 
      'buffer', 
      'process/browser',
      'crypto-browserify', 
      'stream-browserify'
    ],
    exclude: ['electron', 'electron-is-dev']
  },
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      NODE_DEBUG: false
    },
    'global': 'globalThis',
  },
  server: {
    port: 5173,
  },
}) 