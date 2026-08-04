/** Form primitives — presentational. Field wraps label + control + hint/error. */
import { useId } from 'react'

export function Field({ label, required, hint, error, children }) {
  const id = useId()
  const control = children
    ? <children.type {...children.props} id={children.props.id || id} aria-invalid={!!error || undefined} />
    : null
  return (
    <div className={`rd-field${error ? ' has-error' : ''}`}>
      {label && (
        <label className="rd-label" htmlFor={id}>
          {label}{required && <span className="rd-req" aria-hidden="true">*</span>}
        </label>
      )}
      {control}
      {error
        ? <span className="rd-error-text" role="alert">{error}</span>
        : hint ? <span className="rd-hint">{hint}</span> : null}
    </div>
  )
}

export function Input(props) { return <input className="rd-input" {...props} /> }
export function Textarea(props) { return <textarea className="rd-textarea" {...props} /> }
export function Select({ children, ...props }) { return <select className="rd-select" {...props}>{children}</select> }
