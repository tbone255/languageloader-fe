import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './services/analyticsService.ts'
import { migrateFromLocalStorage } from './services/db.ts'
import { initSync } from './services/syncService.ts'

// Run startup tasks in parallel (order-independent)
Promise.all([
  migrateFromLocalStorage(),
  initAnalytics(),
]).then(() => {
  initSync();
}).catch(() => {
  // Startup failures should never block the app
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
