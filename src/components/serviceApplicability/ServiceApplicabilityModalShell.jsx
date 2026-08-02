import { useEffect, useRef, useCallback } from 'react'
import { useEscapeKey } from '../../useEscapeKey'

/*
 * P5 CP-5/CP-6 — shared write-UI primitives for the two Service Applicability write
 * modals (form + status). Presentational only: fixed overlay + click-outside-to-close
 * + ESC-to-close (via the existing useEscapeKey pattern), an accessible labelled Field
 * wrapper, and the bottom-centre success/error Toast used by the section. No data
 * access, no RPC, no write wrappers, no Supabase — those live only in the modals that
 * consume these primitives.
 */

/** Focusable elements inside the dialog (visible, not disabled, not tabindex=-1). */
function focusables(panel) {
  if (!panel) return []
  const nodes = panel.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  return Array.prototype.filter.call(nodes, (el) => el && el.getAttribute('aria-hidden') !== 'true')
}

/**
 * Accessible modal shell. Focus management (WAI-ARIA dialog pattern):
 *  - on open, remembers the triggering element and moves initial focus to the panel
 *    (panel is tabIndex={-1} so it is programmatically focusable but not tab-stopped);
 *  - traps Tab / Shift+Tab within the dialog (wraps last→first and first/panel→last);
 *  - on close/unmount, restores focus to the triggering control.
 * Click on the backdrop (not the panel) closes it; ESC closes via useEscapeKey. `busy`
 * disables backdrop/ESC close while a write is in flight.
 * @param {{title:string, subtitle?:string, onClose:Function, busy?:boolean,
 *   children:any, footer:any}} props
 */
export function ModalShell({ title, subtitle, onClose, busy = false, children, footer }) {
  useEscapeKey(() => { if (!busy) onClose() })
  const panelRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    // remember the control that opened the dialog, then move initial focus to the panel
    triggerRef.current = (typeof document !== 'undefined' && document.activeElement) || null
    if (panelRef.current && typeof panelRef.current.focus === 'function') panelRef.current.focus()
    return () => {
      // restore focus to the triggering control on close/unmount
      const t = triggerRef.current
      if (t && typeof t.focus === 'function') t.focus()
    }
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    const list = focusables(panel)
    if (list.length === 0) { e.preventDefault(); if (panel) panel.focus(); return }
    const first = list[0]
    const last = list[list.length - 1]
    const active = typeof document !== 'undefined' ? document.activeElement : null
    if (e.shiftKey) {
      if (active === first || active === panel) { e.preventDefault(); last.focus() }
    } else if (active === last) {
      e.preventDefault(); first.focus()
    }
  }, [])

  return (
    <div
      style={W.overlay}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={W.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="p5-sa-modal-title"
      >
        <div style={W.head}>
          <div>
            <div style={W.badge}>SERVICE APPLICABILITY</div>
            <h3 id="p5-sa-modal-title" style={W.title}>{title}</h3>
            {subtitle && <div style={W.subtitle}>{subtitle}</div>}
          </div>
          <button type="button" style={W.close} onClick={() => { if (!busy) onClose() }} aria-label="Close" disabled={busy}>✕</button>
        </div>
        <div style={W.body}>{children}</div>
        <div style={W.footer}>{footer}</div>
      </div>
    </div>
  )
}

/**
 * Labelled field wrapper. Associates the label and an inline error with the control
 * via the caller-supplied `htmlFor`/`id`. `required` shows a marker; `error` renders
 * an alert.
 * @param {{label:string, htmlFor?:string, required?:boolean, error?:string, hint?:string, children:any}} props
 */
export function Field({ label, htmlFor, required = false, error, hint, children }) {
  return (
    <label style={W.field} htmlFor={htmlFor}>
      <span style={W.label}>
        {label}{required && <span style={W.req} aria-hidden="true"> *</span>}
      </span>
      {children}
      {hint && !error && <span style={W.hint}>{hint}</span>}
      {error && <span style={W.fieldErr} role="alert">{error}</span>}
    </label>
  )
}

/** Bottom-centre toast (green = ok, red = error). Renders nothing when toast is null. */
export function Toast({ toast }) {
  if (!toast) return null
  const ok = toast.ok === true
  return (
    <div
      role={ok ? 'status' : 'alert'}
      aria-live={ok ? 'polite' : 'assertive'}
      style={{ ...W.toast, background: ok ? '#065F46' : '#7F1D1D' }}
    >
      {ok ? '✅' : '⚠️'} {toast.msg}
    </div>
  )
}

export const W = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', zIndex: 9999, overflowY: 'auto' },
  panel: { background: '#fff', borderRadius: 14, width: 'min(560px,100%)', boxShadow: '0 20px 60px rgba(0,0,0,.2)' },
  head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface)', borderRadius: '14px 14px 0 0' },
  badge: { fontSize: 10, letterSpacing: '.08em', fontWeight: 700, color: 'var(--ds-primary)' },
  title: { fontSize: 16, fontWeight: 700, color: 'var(--ds-text)', margin: '3px 0 0' },
  subtitle: { fontSize: 12, color: 'var(--ds-text-subtle)', marginTop: 3 },
  close: { background: 'var(--ds-n-100)', color: 'var(--ds-text-subtle)', border: '1px solid var(--ds-border)', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14, flexShrink: 0 },
  body: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  footer: { padding: '12px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--ds-border-2)' },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--ds-text-muted)' },
  req: { color: 'var(--ds-danger)' },
  hint: { fontSize: 11, color: 'var(--ds-text-subtle)' },
  fieldErr: { fontSize: 11, color: 'var(--ds-danger)', fontWeight: 500 },
  input: { fontSize: 13, padding: '7px 10px', border: '1px solid var(--ds-border-strong)', borderRadius: 8, color: 'var(--ds-text)', background: '#fff', width: '100%', boxSizing: 'border-box' },
  textarea: { fontSize: 13, padding: '7px 10px', border: '1px solid var(--ds-border-strong)', borderRadius: 8, color: 'var(--ds-text)', background: '#fff', width: '100%', minHeight: 64, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  fixed: { fontSize: 13, padding: '7px 10px', border: '1px solid var(--ds-border)', borderRadius: 8, color: 'var(--ds-text-muted)', background: 'var(--ds-surface-3)' },
  formErr: { fontSize: 12, color: 'var(--ds-danger)', background: 'var(--ds-danger-bg)', border: '1px solid var(--ds-danger-bd)', borderRadius: 8, padding: '8px 10px' },
  note: { fontSize: 12, color: 'var(--ds-text-muted)', background: 'var(--ds-surface-3)', border: '1px solid var(--ds-border)', borderRadius: 8, padding: '9px 12px' },
  primary: { background: 'var(--ds-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  ghost: { background: 'transparent', color: 'var(--ds-text-muted)', border: '1px solid var(--ds-border-strong)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  danger: { background: 'var(--ds-danger)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  toast: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 10000, boxShadow: '0 4px 20px rgba(0,0,0,.3)', maxWidth: 460, textAlign: 'center' },
  // row-action buttons (used by the live/history tables)
  rowAction: { background: 'var(--ds-primary-light)', color: 'var(--ds-primary)', border: '1px solid var(--ds-primary-border)', borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  rowActionDanger: { background: 'var(--ds-danger-bg)', color: 'var(--ds-danger)', border: '1px solid var(--ds-danger-bd)', borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  actionsCell: { display: 'flex', gap: 6, flexWrap: 'wrap' },
}
