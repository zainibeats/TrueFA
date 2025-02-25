import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'public',
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
      'stream-browserify'
    ],
    exclude: ['electron', 'electron-is-dev']
  },
  define: {
    'process.env': process.env,
    'global': 'globalThis',
    'Buffer': ['buffer', 'Buffer'],
    'process.browser': true,
    'process.version': '"v16.0.0"',
    '__dirname': JSON.stringify(__dirname)
  },
  server: {
    port: 5173,
  },
}) 