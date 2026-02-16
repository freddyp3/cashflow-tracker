/**
 * Application entry point. Mounts the React app into the #root div
 * defined in index.html. StrictMode enables additional development warnings.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
