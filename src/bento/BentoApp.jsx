/**
 * BentoApp — approved "Bento Workspace" shell wired to the REAL YAV2 modules.
 * ----------------------------------------------------------------------------
 * DESIGN/NAVIGATION connection package. Mounted when VITE_APPROVED_BENTO_UI ===
 * 'true' (App.jsx) or from the standalone approved-bento.html preview.
 *
 * - The approved sidebar/header/Dashboard are the approved design.
 * - Sidebar items render the EXISTING module components (reused, not rebuilt),
 *   lazy-loaded so the credential-free preview and the dark-flag bundle never
 *   import Supabase eagerly. Each module keeps its own ErrorBoundary + Suspense,
 *   feature flags, role gates and fail-closed states.
 * - Quick Actions open the existing Add-Client / Add-Task flows or navigate to
 *   the existing module; unavailable actions show an explicit non-success notice.
 * - The Dashboard is driven by the real read-only V2 data hook (useBentoDashboard →
 *   dashboardReads/dashboardModel). Mock dashboard data is confined to the standalone
 *   design preview (previewEntry + bentoMock); the authenticated app never uses it.
 */
import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import '../styles/bento.css'
import ErrorBoundary from '../components/ErrorBoundary'
import BentoShell from './BentoShell'
import Dashboard from './Dashboard'
import ModulePlaceholder from './modules/ModulePlaceholder'
import AiAssistantScaffold from './modules/AiAssistantScaffold' // dev-preview only; never in authed nav
import { useBentoDashboard } from './useBentoDashboard'
import { aiAssistantEnabled } from './flag'
import { NAV, BENTO_USER, BENTO_NOTIFICATIONS } from './mock/bentoMock'

// Existing modules — reused as-is, lazy so Supabase isn't imported until needed.
const Clients      = lazy(() => import('../components/Clients'))
const Tasks        = lazy(() => import('../components/Tasks'))
const DocumentsHub = lazy(() => import('../components/DocumentsHub'))
const Compliance   = lazy(() => import('../components/Compliance'))
const Team         = lazy(() => import('../components/Team'))
const AdminHome    = lazy(() => import('../components/AdminHome')) // Firm Overview → Reports
const AuditLog     = lazy(() => import('../components/AuditLog'))   // admin-only security audit
const OnboardingWizard = lazy(() => import('../components/OnboardingWizard'))
const AddTaskModal     = lazy(() => import('../components/AddTaskModal'))
// Existing AI assistant — REAL, server-side. ChatAgent calls the `ai-agent` Supabase
// edge function (no frontend AI key); it is surfaced here unchanged as a persistent
// "Ask YA Assistant" entry point on every Bento page (reused, not rebuilt).
const ChatAgent        = lazy(() => import('../components/ChatAgent'))

// Sidebar id → existing module. `admin` preserves the legacy Firm-Overview gate.
const MODULES = {
  clients:    { Comp: Clients },
  tasks:      { Comp: Tasks },
  documents:  { Comp: DocumentsHub },
  compliance: { Comp: Compliance },
  team:       { Comp: Team },
  reports:    { Comp: AdminHome, admin: true, wantsGoTo: true }, // mapped to Firm Overview
  auditlog:   { Comp: AuditLog, admin: true }, // admin-only security/access audit
}
// Sidebar ids with no existing module yet — honest, polished Bento placeholders.
const COMING = new Set(['templates', 'knowledge', 'settings'])
const PLACEHOLDER = {
  templates: { title: 'Templates', subtitle: 'Reusable document & task templates', message: 'A library of reusable document and task templates will live here.' },
  knowledge: { title: 'Knowledge Hub', subtitle: 'Guides & resources for your team', message: 'Firm guides, checklists and reference resources will live here.' },
  settings: { title: 'Settings', subtitle: 'Your profile & workspace preferences', message: 'Workspace preferences and configuration options will live here.' },
}
const TITLE = Object.fromEntries(NAV.map(n => [n.id, n.label]))
// AdminHome.goTo uses legacy tab ids; map them onto Bento nav ids.
const LEGACY_TO_BENTO = { dashboard: 'dashboard', tasks: 'tasks', clients: 'clients', compliance: 'compliance', documents: 'documents', team: 'team', home: 'reports' }

const STORAGE_KEY = 'yav2_bento_tab'
const readTab = () => { try { return sessionStorage.getItem(STORAGE_KEY) || 'dashboard' } catch { return 'dashboard' } }

const ACTION_LABEL = {
  'record-time': 'Record Time', note: 'Internal Note', 'request-doc': 'Request Document',
}

function ModuleLoading() {
  return <div className="b-module-loading">Loading…</div>
}
function ComingLater({ label }) {
  return (
    <div className="b-legacy-slot">
      <div className="b-card"><div className="b-card-body" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--b-text)', marginBottom: 6 }}>{label} — coming later</div>
        <div style={{ fontSize: 13.5, color: 'var(--b-text-subtle)', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
          There is no existing {label} module in the portal yet. This entry is a placeholder in the
          approved shell and will be connected in a later phase.
        </div>
      </div></div>
    </div>
  )
}
function Restricted({ label }) {
  return (
    <div className="b-legacy-slot">
      <div className="b-card"><div className="b-card-body" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--b-text)', marginBottom: 6 }}>{label} is restricted</div>
        <div style={{ fontSize: 13.5, color: 'var(--b-text-subtle)', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
          {label} (Firm Overview) is available to administrators. Your role does not have access.
        </div>
      </div></div>
    </div>
  )
}

export default function BentoApp({ user, initialTab, initialDrawerOpen = false, demoData = null }) {
  const activeUser = user || BENTO_USER
  const [tab, setTab] = useState(() => initialTab || readTab())
  const [modal, setModal] = useState(null)      // 'onboarding' | 'addtask' | null
  const [coming, setComing] = useState(null)    // label string | null

  // SINGLE SOURCE OF TRUTH for the Clients search. The lower Clients search input
  // renders and mutates THIS state directly (controlled prop). The global header
  // search is only a temporary input; on submit it writes the term straight into
  // `clientsSearch` and navigates. There is no handoff effect / pending payload /
  // second search state — so deleting text in the lower box recomputes immediately.
  const [headerSearch, setHeaderSearch] = useState('')
  const [clientsSearch, setClientsSearch] = useState('')

  // Real read-only V2 data for the Dashboard. Disabled when demo data is supplied
  // (design-only standalone preview) — the authenticated app never uses demo data.
  const live = useBentoDashboard({ enabled: !demoData })
  const dash = demoData ? { state: 'ready', data: demoData, reload: undefined } : live

  // Notification badge count: the approved design's sample count is shown ONLY in the
  // standalone preview (demo data). Authenticated mode has no safe real notification
  // source yet, so the numeric badge is hidden — the bell icon and header layout are
  // preserved. (No new notification source is wired here.)
  const notifications = demoData ? BENTO_NOTIFICATIONS : null

  const navigate = useCallback((id) => {
    setTab(id)
    try { sessionStorage.setItem(STORAGE_KEY, id) } catch { /* ignore */ }
  }, [])

  // Auto-dismiss the "coming later" notice.
  useEffect(() => {
    if (!coming) return
    const t = setTimeout(() => setComing(null), 4000)
    return () => clearTimeout(t)
  }, [coming])

  const closeModal = useCallback(() => setModal(null), [])

  const onQuickAction = useCallback((key) => {
    switch (key) {
      case 'add-client': setModal('onboarding'); break
      case 'create-task': setModal('addtask'); break
      case 'upload-doc': navigate('documents'); break
      case 'cal': navigate('compliance'); break
      case 'report': navigate('reports'); break
      default: setComing(ACTION_LABEL[key] || 'This action') // record-time, note, request-doc
    }
  }, [navigate])

  const goTo = useCallback((legacyId) => navigate(LEGACY_TO_BENTO[legacyId] || 'dashboard'), [navigate])

  const submitHeaderSearch = useCallback(() => {
    const term = headerSearch.trim()
    if (!term) return // blank input triggers nothing
    setClientsSearch(term) // write straight into the authoritative Clients search
    navigate('clients')
  }, [headerSearch, navigate])

  function renderContent() {
    if (tab === 'dashboard') return <Dashboard data={dash.data} state={dash.state} onQuickAction={onQuickAction} onReload={dash.reload} />
    // DEV-PREVIEW ONLY: the proposed AI-assistant scaffold is unconnected design UI.
    // Gated on demoData so it can NEVER render in the authenticated app (no nav entry
    // reaches it there); viewable at /approved-bento.html?tab=ai-preview.
    if (tab === 'ai-preview') return demoData ? <AiAssistantScaffold /> : <ComingLater label="AI Assistant preview" />
    if (COMING.has(tab)) {
      const p = PLACEHOLDER[tab] || { title: TITLE[tab] || tab, message: 'This module isn’t available yet.' }
      return <div className="b-legacy-slot"><ModulePlaceholder {...p} profile={tab === 'settings' ? activeUser : null} /></div>
    }
    const mod = MODULES[tab]
    if (!mod) return <ComingLater label={TITLE[tab] || tab} />
    if (mod.admin && !activeUser?.is_admin) return <Restricted label={TITLE[tab]} />
    const { Comp } = mod
    // `bento` lets a reused module opt into its approved Bento visual skin while
    // keeping all its logic/flows unchanged (Phase 3: Clients). Unknown to modules
    // that don't use it — harmless.
    const props = {
      user: activeUser,
      bento: true,
      ...(tab === 'clients' ? { search: clientsSearch, onSearchChange: setClientsSearch } : {}),
      ...(mod.wantsGoTo ? { goTo } : {}),
    }
    return (
      <div className="b-legacy-slot">
        <ErrorBoundary>
          <Suspense fallback={<ModuleLoading />}>
            <Comp {...props} />
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  }

  return (
    <>
      <BentoShell active={tab} onNavigate={navigate} user={activeUser} pageTitle={TITLE[tab] || 'Dashboard'} notifications={notifications} headerSearch={headerSearch} onHeaderSearchChange={setHeaderSearch} onHeaderSearchSubmit={submitHeaderSearch} initialDrawerOpen={initialDrawerOpen}>
        {renderContent()}
      </BentoShell>

      {modal === 'onboarding' && (
        <ErrorBoundary><Suspense fallback={null}>
          <OnboardingWizard user={activeUser} onClose={closeModal} onSaved={closeModal} />
        </Suspense></ErrorBoundary>
      )}
      {modal === 'addtask' && (
        <ErrorBoundary><Suspense fallback={null}>
          <AddTaskModal user={activeUser} onClose={closeModal} onSaved={closeModal} />
        </Suspense></ErrorBoundary>
      )}

      {/* Persistent AI assistant (ai-agent-backed ChatAgent). Hidden unless the AI backend is
          actually configured (VITE_AI_ENABLED) — on this env the function is NOT deployed, so
          the assistant must not appear or claim to be online. Scaffold/architecture retained. */}
      {aiAssistantEnabled(import.meta.env.VITE_AI_ENABLED) && (
      <ErrorBoundary><Suspense fallback={null}>
        <ChatAgent />
      </Suspense></ErrorBoundary>
      )}

      {coming && (
        <div className="b-toast" role="status">
          <span>{coming} isn’t available yet — coming in a later phase.</span>
          <button type="button" onClick={() => setComing(null)} aria-label="Dismiss">×</button>
        </div>
      )}
    </>
  )
}
