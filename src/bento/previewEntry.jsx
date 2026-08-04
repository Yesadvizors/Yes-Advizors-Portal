/**
 * Standalone DEV-ONLY preview entry for the approved Bento dashboard.
 * Served by `vite dev` at /approved-bento.html so the flagged design can be
 * viewed and screenshotted WITHOUT Supabase credentials or a live session.
 * Mounts BentoApp with the presentational adapter; no auth, no network, no writes.
 * NOT part of the production build (only index.html is a build input).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BentoApp from './BentoApp'

createRoot(document.getElementById('root')).render(
  <StrictMode><BentoApp /></StrictMode>
)
