import { useState, useCallback } from 'react'
import { supabase } from '../supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]
const DEFAULT_PAGE_SIZE = 50
const MAX_DATE_RANGE_DAYS = 92
const MAX_META_DEPTH = 3
const MAX_META_STRING_LEN = 120
const MAX_META_KEYS = 20

// Substring terms used to detect sensitive metadata keys.
// A key is masked when its lowercased form contains any of these substrings.
// Terms are chosen to catch compound names (e.g. 'password_hash', 'pan_number',
// 'user_email', 'mobile_number') while avoiding overly broad matches.
// 'auth' is deliberately excluded as a bare substring — it would match harmless
// keys like 'author', 'authenticated_at'. 'authorization' is the intended term.
const SENSITIVE_KEY_SUBSTRINGS = [
  'password', 'passwd',
  'secret',
  'token',
  'authorization', 'cookie',
  'api_key', 'apikey',
  'private_key',
  'email',
  'mobile', 'phone',
  'pan', 'gstin',
  'aadhaar', 'aadhar',
  'otp', 'pin', 'cvv',
  'card_number',
  'hmac',
  'signature',
]

// Returns true if the key name (lowercased) contains any sensitive substring.
function isSensitiveMetaKey(keyLower) {
  return SENSITIVE_KEY_SUBSTRINGS.some(term => keyLower.includes(term))
}

const RISK_COLOURS = {
  CRITICAL: { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  HIGH:     { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
  MEDIUM:   { bg: '#FFF7ED', text: '#9A3412', dot: '#EA580C' },
  LOW:      { bg: '#ECFDF5', text: '#065F46', dot: '#059669' },
}

// ── Error code mapping — no raw Postgres messages ever reach the DOM ──────────

function classifyRpcError(error) {
  if (!error) return null
  const msg = (error.message || '').toLowerCase()
  const code = error.code || ''

  // Postgres error codes surfaced by supabase-js
  if (code === 'PGRST301' || msg.includes('jwt') || msg.includes('expired') ||
      msg.includes('not authenticated') || msg.includes('session')) {
    return { type: 'session', text: 'Your session has expired. Please reload the page and sign in again.' }
  }
  if (code === '42501' || msg.includes('not authorised') || msg.includes('not authorized') ||
      msg.includes('42501')) {
    return { type: 'auth', text: 'Access denied. You do not have permission to view audit logs.' }
  }
  if (code === '22023' || msg.includes('22023') || msg.includes('invalid') ||
      msg.includes('date range') || msg.includes('page_size') || msg.includes('page_number') ||
      msg.includes('risk_tier')) {
    return { type: 'filter', text: 'Invalid filter values. Please check the date range and filters, then try again.' }
  }
  // Everything else: generic, no internal detail
  return { type: 'generic', text: 'Failed to load audit events. Please try again.' }
}

// ── IST date/time helpers ─────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // +05:30

function todayISTString() {
  const now = new Date()
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  return ist.toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

function sevenDaysAgoISTString() {
  const now = new Date()
  const ist = new Date(now.getTime() + IST_OFFSET_MS - 7 * 86400000)
  return ist.toISOString().slice(0, 10)
}

// Convert a local date string 'YYYY-MM-DD' to UTC ISO at 00:00:00.000 IST
function dateToISTStartUTC(dateStr) {
  if (!dateStr) return null
  // 00:00:00 IST = previous day 18:30:00 UTC
  return new Date(`${dateStr}T00:00:00.000+05:30`).toISOString()
}

// Convert a local date string 'YYYY-MM-DD' to UTC ISO at 23:59:59.999 IST
function dateToISTEndUTC(dateStr) {
  if (!dateStr) return null
  return new Date(`${dateStr}T23:59:59.999+05:30`).toISOString()
}

function dateDiffDays(fromStr, toStr) {
  if (!fromStr || !toStr) return 0
  const a = new Date(fromStr), b = new Date(toStr)
  return Math.round((b - a) / 86400000)
}

// Format a UTC ISO timestamp for display in IST
function fmtIST(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }) + ' IST'
  } catch {
    return iso
  }
}

// ── UUID helpers — never full UUIDs in the DOM ────────────────────────────────

function truncUUID(uuid) {
  if (!uuid) return '—'
  return uuid.slice(0, 8) + '…'
}

// ── Safe metadata renderer ────────────────────────────────────────────────────
// Renders metadata as plain text only. Never uses dangerouslySetInnerHTML.
// Masks sensitive key names. Limits depth, string length, and key count.

function renderMetaValue(value, depth, path) {
  if (depth > MAX_META_DEPTH) return <span style={{ color: 'var(--gray2)', fontStyle: 'italic' }}>[truncated]</span>

  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--gray2)' }}>null</span>
  }

  if (typeof value === 'boolean') {
    return <span style={{ color: '#7C3AED' }}>{String(value)}</span>
  }

  if (typeof value === 'number') {
    return <span style={{ color: '#1D4ED8' }}>{String(value)}</span>
  }

  if (typeof value === 'string') {
    const display = value.length > MAX_META_STRING_LEN
      ? value.slice(0, MAX_META_STRING_LEN) + '… [truncated]'
      : value
    return <span style={{ color: '#065F46' }}>"{display}"</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: 'var(--gray2)' }}>[]</span>
    return (
      <span>
        {'['}<br />
        {value.slice(0, MAX_META_KEYS).map((item, i) => (
          <span key={i} style={{ display: 'block', paddingLeft: (depth + 1) * 14 }}>
            {renderMetaValue(item, depth + 1, `${path}[${i}]`)}
            {i < value.length - 1 ? ',' : ''}
          </span>
        ))}
        {value.length > MAX_META_KEYS && (
          <span style={{ display: 'block', paddingLeft: (depth + 1) * 14, color: 'var(--gray2)', fontStyle: 'italic' }}>
            …{value.length - MAX_META_KEYS} more items
          </span>
        )}
        <span style={{ paddingLeft: depth * 14 }}>{']'}</span>
      </span>
    )
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return <span style={{ color: 'var(--gray2)' }}>{'{}'}</span>
    const visibleKeys = keys.slice(0, MAX_META_KEYS)
    return (
      <span>
        {'{'}<br />
        {visibleKeys.map((key, i) => {
          const keyLower = key.toLowerCase()
          const isSensitive = isSensitiveMetaKey(keyLower)
          return (
            <span key={key} style={{ display: 'block', paddingLeft: (depth + 1) * 14 }}>
              <span style={{ color: '#9A3412', fontWeight: 600 }}>{key}</span>
              <span style={{ color: 'var(--gray)' }}>: </span>
              {isSensitive
                ? <span style={{ color: 'var(--gray2)', fontStyle: 'italic' }}>{'[masked]'}</span>
                : renderMetaValue(value[key], depth + 1, `${path}.${key}`)
              }
              {i < visibleKeys.length - 1 ? ',' : ''}
            </span>
          )
        })}
        {keys.length > MAX_META_KEYS && (
          <span style={{ display: 'block', paddingLeft: (depth + 1) * 14, color: 'var(--gray2)', fontStyle: 'italic' }}>
            …{keys.length - MAX_META_KEYS} more keys
          </span>
        )}
        <span style={{ paddingLeft: depth * 14 }}>{'}'}</span>
      </span>
    )
  }

  // Fallback: render type name, not value
  return <span style={{ color: 'var(--gray2)', fontStyle: 'italic' }}>[{typeof value}]</span>
}

function MetadataPanel({ metadata }) {
  if (!metadata || (typeof metadata === 'object' && Object.keys(metadata).length === 0)) {
    return <span style={{ color: 'var(--gray2)', fontStyle: 'italic', fontSize: 11 }}>empty</span>
  }
  return (
    <pre style={{
      fontFamily: 'monospace', fontSize: 11.5, background: '#F8FAF9',
      border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px',
      overflowX: 'auto', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      userSelect: 'text', // allow manual copy-select but no copy-all button
    }}>
      {renderMetaValue(metadata, 0, 'root')}
    </pre>
  )
}

// ── Risk badge ────────────────────────────────────────────────────────────────

function RiskBadge({ tier }) {
  const c = RISK_COLOURS[tier] || { bg: 'var(--ltgray)', text: 'var(--gray)', dot: 'var(--gray2)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 700,
      background: c.bg, color: c.text, letterSpacing: 0.3,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {tier || '—'}
    </span>
  )
}

// ── Row detail panel ──────────────────────────────────────────────────────────

function DetailField({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: 'var(--navy2)', wordBreak: 'break-all' }}>{children}</div>
    </div>
  )
}

function RowDetail({ row }) {
  return (
    <div style={{
      background: '#F8FAF9', borderTop: '1px solid var(--border2)',
      padding: '16px 20px', display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 24px'
    }}>
      <DetailField label="Event ID">{truncUUID(row.id)}</DetailField>
      <DetailField label="Timestamp">{fmtIST(row.occurred_at)}</DetailField>
      <DetailField label="Event Name"><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.event_name}</span></DetailField>
      <DetailField label="Category">{row.event_category || '—'}</DetailField>
      <DetailField label="Action">{row.action || '—'}</DetailField>
      <DetailField label="Risk Tier"><RiskBadge tier={row.risk_tier} /></DetailField>
      <DetailField label="Sensitivity">{row.sensitivity_tier || '—'}</DetailField>
      <DetailField label="Actor Type">{row.initiated_by_type || '—'}</DetailField>
      <DetailField label="Actor User ID">
        {/* Show first 8 chars only — never the full UUID */}
        {row.actor_user_id ? truncUUID(row.actor_user_id) : '—'}
      </DetailField>
      <DetailField label="Actor Service">{row.actor_service || '—'}</DetailField>
      <DetailField label="Actor Role">{row.actor_app_role || '—'}</DetailField>
      <DetailField label="Target User ID">
        {/* Show first 8 chars only — never the full UUID */}
        {row.target_user_id ? truncUUID(row.target_user_id) : '—'}
      </DetailField>
      {/* client_uuid is NEVER rendered — use client_code_snapshot only */}
      <DetailField label="Client">{row.client_code_snapshot || '—'}</DetailField>
      <DetailField label="Resource Type">{row.resource_type || '—'}</DetailField>
      <DetailField label="Resource ID">{row.resource_id || '—'}</DetailField>
      <DetailField label="Description">{row.description || '—'}</DetailField>
      <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Metadata</div>
        <MetadataPanel metadata={row.metadata} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AuditLog({ user }) {
  // ── UX-layer admin check (server is the authoritative gate) ──
  const isAdmin = user?.is_admin === true

  // ── Filter state ──
  const [fromDate, setFromDate] = useState(sevenDaysAgoISTString)
  const [toDate,   setToDate]   = useState(todayISTString)
  const [riskTier, setRiskTier] = useState('')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // ── Pagination ──
  const [page, setPage] = useState(1)

  // ── Data / UI state ──
  const [result,  setResult]  = useState(null)   // last successful response
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)   // { type, text }
  const [hasFetched, setHasFetched] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  // ── Out-of-range loop guard ──
  const [outOfRangeResetCount, setOutOfRangeResetCount] = useState(0)
  const MAX_OUT_OF_RANGE_RESETS = 1

  // ── Date range validation (client-side pre-check) ──
  function validateDates() {
    if (!fromDate || !toDate) return 'Please set both start and end dates.'
    if (toDate < fromDate) return 'End date must be on or after start date.'
    if (dateDiffDays(fromDate, toDate) > MAX_DATE_RANGE_DAYS)
      return `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days.`
    return null
  }
  const dateError = validateDates()

  // ── Fetch function — called only on explicit user action ──
  const fetchPage = useCallback(async (targetPage, currentPageSize, currentRiskTier) => {
    // Prevent double-fire while loading
    if (loading) return

    const p_from = dateToISTStartUTC(fromDate)
    const p_to   = dateToISTEndUTC(toDate)
    if (!p_from || !p_to) return

    setLoading(true)
    setError(null)
    setExpandedId(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_sensitive_audit_logs', {
        p_from,
        p_to,
        p_page_number: targetPage,
        p_page_size:   currentPageSize,
        p_risk_tier:   currentRiskTier || null,
        p_client_uuid: null,
      })

      if (rpcError) {
        setError(classifyRpcError(rpcError))
        setResult(null)
        return
      }

      // Out-of-range guard: prevent infinite refetch loops
      if (data?.out_of_range && outOfRangeResetCount < MAX_OUT_OF_RANGE_RESETS) {
        setOutOfRangeResetCount(n => n + 1)
        setPage(1)
        // Re-fetch page 1 immediately
        const { data: data2, error: err2 } = await supabase.rpc('get_sensitive_audit_logs', {
          p_from, p_to,
          p_page_number: 1,
          p_page_size:   currentPageSize,
          p_risk_tier:   currentRiskTier || null,
          p_client_uuid: null,
        })
        if (err2) { setError(classifyRpcError(err2)); setResult(null); return }
        setResult(data2)
      } else if (data?.out_of_range) {
        // Already reset once — do not loop; show empty state at page 1
        setPage(1)
        setResult({ ...data, out_of_range: false, items: [], returned_count: 0 })
      } else {
        setOutOfRangeResetCount(0)
        setResult(data)
      }
    } catch (err) {
      setError({ type: 'generic', text: 'Failed to load audit events. Please try again.' })
      setResult(null)
    } finally {
      setHasFetched(true)
      setLoading(false)
    }
  }, [loading, fromDate, toDate, outOfRangeResetCount])

  // ── Handlers ──

  function handleLoad() {
    if (loading || dateError) return
    setPage(1)
    setOutOfRangeResetCount(0)
    fetchPage(1, pageSize, riskTier)
  }

  function handlePageChange(newPage) {
    if (loading) return
    setPage(newPage)
    fetchPage(newPage, pageSize, riskTier)
  }

  function handlePageSizeChange(newSize) {
    if (loading) return
    setPageSize(newSize)
    setPage(1)
    setOutOfRangeResetCount(0)
    fetchPage(1, newSize, riskTier)
  }

  function handleRetry() {
    if (loading) return
    fetchPage(page, pageSize, riskTier)
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  // ── Derived ──
  const items      = result?.items || []
  const totalCount = result?.total_count || 0
  const totalPages = result?.total_pages || 0

  // ── Access-denied state (UX layer — server is the real gate) ──
  if (!isAdmin) {
    return (
      <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--gray)' }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy2)', marginBottom: 6 }}>Restricted</div>
        <div style={{ fontSize: 13 }}>This section is restricted to administrators.</div>
      </div>
    )
  }

  // ── Render ──
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy2)', marginBottom: 4 }}>
          🔐 Audit Log
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gray)', margin: 0 }}>
          Security and access events — read-only. Each query is itself recorded.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
        padding: '16px 20px', marginBottom: 18,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
      }}>

        {/* Date from */}
        <div>
          <label style={labelStyle}>From (IST)</label>
          <input
            type="date"
            value={fromDate}
            max={toDate || todayISTString()}
            onChange={e => {
              setFromDate(e.target.value)
              setHasFetched(false); setResult(null); setError(null)
              setPage(1); setExpandedId(null); setOutOfRangeResetCount(0)
            }}
            style={inputStyle}
            disabled={loading}
          />
        </div>

        {/* Date to */}
        <div>
          <label style={labelStyle}>To (IST)</label>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            max={todayISTString()}
            onChange={e => {
              setToDate(e.target.value)
              setHasFetched(false); setResult(null); setError(null)
              setPage(1); setExpandedId(null); setOutOfRangeResetCount(0)
            }}
            style={inputStyle}
            disabled={loading}
          />
        </div>

        {/* Risk tier filter */}
        <div>
          <label style={labelStyle}>Risk Tier</label>
          <select
            value={riskTier}
            onChange={e => {
              setRiskTier(e.target.value)
              setHasFetched(false); setResult(null); setError(null)
              setPage(1); setExpandedId(null); setOutOfRangeResetCount(0)
            }}
            style={inputStyle}
            disabled={loading}
          >
            <option value="">All</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        {/* Page size */}
        <div>
          <label style={labelStyle}>Rows / page</label>
          <select
            value={pageSize}
            onChange={e => handlePageSizeChange(Number(e.target.value))}
            style={inputStyle}
            disabled={loading || !hasFetched}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Load button */}
        <button
          onClick={handleLoad}
          disabled={loading || !!dateError}
          style={{
            padding: '9px 22px', background: (loading || dateError) ? 'var(--gray2)' : 'var(--dkgreen)',
            color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700,
            cursor: (loading || dateError) ? 'not-allowed' : 'pointer', alignSelf: 'flex-end',
          }}
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>

      {/* Date range error (client-side) */}
      {dateError && (
        <div style={alertStyle('#FEE2E2', '#DC2626')}>⚠️ {dateError}</div>
      )}

      {/* Server error */}
      {error && (
        <div style={alertStyle(
          error.type === 'auth' || error.type === 'session' ? '#FEE2E2' : '#FEF3C7',
          error.type === 'auth' || error.type === 'session' ? '#DC2626' : '#92400E',
        )}>
          {error.type === 'auth' && '🔒 '}
          {error.type === 'session' && '⏱ '}
          {error.type === 'filter' && '⚠️ '}
          {error.type === 'generic' && '❌ '}
          {error.text}
          {error.type === 'generic' && (
            <button
              onClick={handleRetry}
              disabled={loading}
              style={{ marginLeft: 14, padding: '3px 12px', fontSize: 12, fontWeight: 600,
                background: '#fff', border: '1px solid #D97706', borderRadius: 6, cursor: 'pointer', color: '#92400E' }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 13 }}>Loading audit events…</div>
        </div>
      )}

      {/* Initial prompt — before first load */}
      {!loading && !hasFetched && !error && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔐</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--gray)' }}>
            Select a date range and press Load
          </div>
          <div style={{ fontSize: 12 }}>Audit events for the selected period will appear here.</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && hasFetched && !error && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray)', marginBottom: 4 }}>
            No audit events found
          </div>
          <div style={{ fontSize: 12 }}>
            No events match the selected filters for this date range.
          </div>
        </div>
      )}

      {/* Results table */}
      {!loading && items.length > 0 && (
        <>
          {/* Summary bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 10, fontSize: 12, color: 'var(--gray)',
          }}>
            <span>
              Showing <strong>{items.length}</strong> of <strong>{totalCount}</strong> events
              &nbsp;·&nbsp; Page {page} of {totalPages}
            </span>
            <span style={{ fontSize: 11, color: 'var(--gray2)' }}>
              ℹ️ Each query generates two self-audit records
            </span>
          </div>

          {/* Table */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            {/* Header */}
            <div style={{ ...rowGridStyle, background: '#F4F6F3', padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: 10, fontWeight: 700, color: 'var(--gray2)',
              textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <span>Timestamp (IST)</span>
              <span>Event</span>
              <span>Risk</span>
              <span>Actor</span>
              <span>Role</span>
              <span>Client</span>
              <span>Resource</span>
            </div>

            {/* Rows */}
            {items.map(row => (
              <div key={row.id}>
                <div
                  onClick={() => toggleExpand(row.id)}
                  style={{
                    ...rowGridStyle,
                    padding: '11px 16px',
                    borderBottom: '1px solid var(--border2)',
                    cursor: 'pointer',
                    background: expandedId === row.id ? '#ECFDF5' : '#fff',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (expandedId !== row.id) e.currentTarget.style.background = '#F8FAF9' }}
                  onMouseLeave={e => { if (expandedId !== row.id) e.currentTarget.style.background = '#fff' }}
                >
                  <span style={{ fontSize: 11.5, color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                    {fmtIST(row.occurred_at)}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--navy2)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.event_name}
                  </span>
                  <span><RiskBadge tier={row.risk_tier} /></span>
                  <span style={{ fontSize: 11.5, color: 'var(--gray)', fontFamily: 'monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {/* actor_user_id: first 8 chars only — never full UUID */}
                    {row.initiated_by_type === 'service'
                      ? (row.actor_service || '—')
                      : (row.actor_user_id ? truncUUID(row.actor_user_id) : '—')}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--gray)' }}>
                    {row.actor_app_role || '—'}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--gray)' }}>
                    {/* client_uuid: NEVER shown — always use client_code_snapshot */}
                    {row.client_code_snapshot || '—'}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--gray)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.resource_type || '—'}
                    {row.resource_id ? ` / ${row.resource_id}` : ''}
                  </span>
                </div>

                {/* Expanded detail panel */}
                {expandedId === row.id && <RowDetail row={row} />}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={loading || page <= 1}
              style={paginBtnStyle(loading || page <= 1)}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 13, color: 'var(--gray)', minWidth: 100, textAlign: 'center' }}>
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={loading || page >= totalPages}
              style={paginBtnStyle(loading || page >= totalPages)}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const labelStyle = {
  display: 'block', fontSize: 10.5, fontWeight: 700,
  color: 'var(--gray2)', textTransform: 'uppercase',
  letterSpacing: 0.5, marginBottom: 5,
}

const inputStyle = {
  padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 12.5, background: '#fff', outline: 'none',
  fontFamily: 'inherit', color: 'var(--navy2)',
}

const rowGridStyle = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr 90px 110px 90px 70px 120px',
  gap: '0 12px',
  alignItems: 'center',
}

function alertStyle(bg, color) {
  return {
    background: bg, color, border: `1px solid ${color}33`,
    borderRadius: 9, padding: '10px 16px', fontSize: 13,
    marginBottom: 14, display: 'flex', alignItems: 'center',
  }
}

function paginBtnStyle(disabled) {
  return {
    padding: '8px 18px', fontSize: 13, fontWeight: 600,
    background: disabled ? 'var(--ltgray)' : '#fff',
    color: disabled ? 'var(--gray2)' : 'var(--dkgreen)',
    border: `1px solid ${disabled ? 'var(--border)' : 'var(--green2)'}`,
    borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
  }
}
