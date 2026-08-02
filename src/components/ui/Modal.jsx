import { useEffect, useRef, useCallback, useId } from 'react'
import { useEscapeKey } from '../../useEscapeKey'

/*
 * Yes Advizors — accessible Modal + ConfirmDialog (presentational).
 * Implements the WAI-ARIA dialog pattern, mirroring the proven focus management of
 * ServiceApplicabilityModalShell: remembers the trigger, moves initial focus to the
 * panel, traps Tab/Shift+Tab, restores focus on close, backdrop + ESC close (both
 * guarded while `busy`). Styling comes from the design-system CSS classes.
 */

function focusables(panel) {
  if (!panel) return []
  const nodes = panel.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  return Array.prototype.filter.call(nodes, (el) => el && el.getAttribute('aria-hidden') !== 'true')
}

export function Modal({ title, subtitle, onClose, busy = false, size, children, footer }) {
  useEscapeKey(() => { if (!busy) onClose() })
  const panelRef = useRef(null)
  const triggerRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    triggerRef.current = (typeof document !== 'undefined' && document.activeElement) || null
    if (panelRef.current && typeof panelRef.current.focus === 'function') panelRef.current.focus()
    return () => {
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
      className="ds-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`ds-modal ${size === 'lg' ? 'ds-modal-lg' : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ds-modal-header">
          <div>
            <h2 id={titleId} className="ds-modal-title">{title}</h2>
            {subtitle && <div className="ds-modal-sub">{subtitle}</div>}
          </div>
          <button type="button" className="ds-modal-close" onClick={() => { if (!busy) onClose() }} aria-label="Close" disabled={busy}>✕</button>
        </div>
        <div className="ds-modal-body">{children}</div>
        {footer && <div className="ds-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

/*
 * ConfirmDialog — a focused confirmation for a single decision. `tone` ('danger' |
 * 'warning') colours the icon and the confirm button. Prevents accidental action by
 * requiring an explicit click; the cancel path is always the safe default.
 */
export function ConfirmDialog({
  title,
  message,
  icon,
  tone = 'warning',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onClose,
}) {
  const confirmVariant = tone === 'danger' ? 'danger' : 'primary'
  return (
    <Modal
      title={title}
      onClose={onClose}
      busy={busy}
      footer={<>
        <button className="ds-btn ds-btn-ghost" onClick={onClose} disabled={busy}>{cancelLabel}</button>
        <button className={`ds-btn ds-btn-${confirmVariant}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </>}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div className={`ds-confirm-ico is-${tone}`} aria-hidden="true">{icon || (tone === 'danger' ? '⚠' : '?')}</div>
        <div className="ds-state-desc" style={{ margin: 0, textAlign: 'left', maxWidth: 'none' }}>{message}</div>
      </div>
    </Modal>
  )
}
