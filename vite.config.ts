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
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        ecma: 2020,
        passes: 2,
        keep_infinity: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'crypto-utils': ['buffer', 'stream-browserify', 'process'],
          'ui-components': ['lucide-react'],
        },
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
    },
    sourcemap: false,
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