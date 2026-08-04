/** Toolbar + SearchInput + FilterChip — presentational filter bar. */
import { IconSearch } from './icons'

export function Toolbar({ children }) {
  return <div className="rd-toolbar">{children}</div>
}

export function SearchInput({ placeholder = 'Search…', value, onChange, ...rest }) {
  return (
    <div className="rd-search">
      <span className="rd-search-ico"><IconSearch size={16} /></span>
      <input className="rd-input" type="search" placeholder={placeholder} value={value} onChange={onChange} aria-label={placeholder} {...rest} />
    </div>
  )
}

export function FilterChip({ active, count, children, onClick }) {
  return (
    <button
      type="button"
      className={`rd-chip-toggle${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
      {count != null && <span className="rd-chip-count">{count}</span>}
    </button>
  )
}
