// Initialize Buffer and process globals
import { Buffer } from 'buffer'
import process from 'process'

if (typeof window !== 'undefined') {
  window.Buffer = Buffer
  window.process = process
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
