/**
 * Standalone DEV-ONLY preview entry for the 2026 design prototype.
 * ----------------------------------------------------------------------------
 * Served by `vite dev` at /prototype.html so the flagged redesign can be viewed
 * and screenshotted WITHOUT Supabase credentials or a live session. It mounts
 * RedesignApp with a mock user and touches no auth, no network and no writes.
 * It is NOT part of the production build (only index.html is a build input).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import RedesignApp from './RedesignApp'
import { MOCK_USER } from './mock/mockData'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RedesignApp user={MOCK_USER} onLogout={() => {}} />
  </StrictMode>
)
