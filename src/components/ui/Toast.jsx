import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

/*
 * Yes Advizors — lightweight Toast (success/error feedback).
 * A tiny context so any screen can surface a transient, business-safe confirmation
 * ("Client deactivated", "Saved") without prop-drilling. Messages are caller-supplied
 * and must be business-safe — never a raw error.message. Auto-dismisses; polite for
 * success, assertive for errors (screen-reader appropriate).
 */

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id] }
  }, [])

  const push = useCallback((message, tone = 'success', ttl = 4000) => {
    idRef.current += 1
    const id = idRef.current
    setToasts((list) => [...list, { id, message, tone }])
    timers.current[id] = setTimeout(() => dismiss(id), ttl)
    return id
  }, [dismiss])

  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout) }, [])

  const api = {
    success: (m, ttl) => push(m, 'success', ttl),
    error: (m, ttl) => push(m, 'error', ttl),
    push,
    dismiss,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ds-toast-region">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`ds-toast is-${t.tone}`}
            role={t.tone === 'error' ? 'alert' : 'status'}
            aria-live={t.tone === 'error' ? 'assertive' : 'polite'}
          >
            <span className="ds-toast-ico" aria-hidden="true">{t.tone === 'error' ? '⚠️' : '✅'}</span>
            <span>{t.message}</span>
            <button className="ds-toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* Safe to call outside a provider (returns no-op) so components stay decoupled. */
export function useToast() {
  const ctx = useContext(ToastContext)
  return ctx || { success: () => {}, error: () => {}, push: () => {}, dismiss: () => {} }
}
