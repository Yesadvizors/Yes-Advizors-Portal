/**
 * Standalone DEV-ONLY preview entry for the approved Bento dashboard.
 * Served by `vite dev` at /approved-bento.html so the flagged design can be
 * viewed and screenshotted WITHOUT Supabase credentials or a live session.
 * Mounts BentoApp with the presentational adapter; no auth, no network, no writes.
 * NOT part of the production build (only index.html is a build input).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css' // legacy modules rendered inside the shell rely on these global tokens
import BentoApp from './BentoApp'
import { MOCK_DASHBOARD } from './mock/bentoMock' // design-only demo data for the preview

// DEV-ONLY: allow ?tab=<id>&drawer=1 so each module view can be previewed/screenshotted
// directly (query string only — never the URL hash, which Supabase auth uses).
const params = new URLSearchParams(window.location.search)
const initialTab = params.get('tab') || undefined
const initialDrawerOpen = params.get('drawer') === '1'
// ?live=1 exercises the REAL read path (no demo data). Without an authenticated
// session it shows the fail-closed empty/error states; default is the mock design demo.
const live = params.get('live') === '1'

createRoot(document.getElementById('root')).render(
  <StrictMode><BentoApp initialTab={initialTab} initialDrawerOpen={initialDrawerOpen} demoData={live ? null : MOCK_DASHBOARD} /></StrictMode>
)
