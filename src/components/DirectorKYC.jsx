import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import DINHolderModal from './DINHolderModal'
import CompanyLinkModal from './CompanyLinkModal'
import KYCRecordModal from './KYCRecordModal'
import KYCRecordDetail from './KYCRecordDetail'

// Director KYC — Phase 2A (Pankaj-only management).
// All reads/writes go through the deployed, approved dkyc_* RPCs.
// No direct access to director_kyc_records / din_holder_companies / ct_team_members.
// Assignment UI is intentionally NOT included in Phase 2A (assignable-members RPC
// and Ayush/Vega mappings are Phase 2B, pending separate review).

const STAGES = ['Assigned', 'In Progress', 'Prepared', 'Reviewed', 'Partner Approved', 'Filed']
const RECORD_TYPES = ['PERIODIC_KYC', 'EVENT_UPDATE', 'REACTIVATION', 'HISTORICAL']

const STAGE_COLOR = {
  'Assigned':         { bg: 'var(--ltgray)',  fg: 'var(--gray)' },
  'In Progress':      { bg: 'var(--ltblue)',  fg: 'var(--blue)' },
  'Prepared':         { bg: '#FEF3C7',        fg: '#92400E' },
  'Reviewed':         { bg: '#EDE9FE',        fg: '#6D28D9' },
  'Partner Approved': { bg: 'var(--ltgreen)', fg: 'var(--dkgreen)' },
  'Filed':            { bg: 'var(--green2)',  fg: 'var(--dkgreen)' },
}

function isManager(user) {
  return user?.is_admin === true || user?.portal_role === 'Manager'
}

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function DirectorKYC({ user }) {
  const manager = isManager(user)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [fStage, setFStage] = useState('All')
  const [fType, setFType] = useState('All')
  const [onlyOpen, setOnlyOpen] = useState(false)

  const [showHolder, setShowHolder] = useState(false)
  const [showRecord, setShowRecord] = useState(false)
  const [linkHolder, setLinkHolder] = useState(null)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => { load() }, [onlyOpen])

  async function load() {
    setLoading(true); setErr('')
    const { data, error } = await supabase.rpc('dkyc_list_records', { p_only_open: onlyOpen })
    if (error) { setErr(readableError(error)); setRows([]); setLoading(false); return }
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function readableError(error) {
    if (!error) return ''
    if (typeof error === 'string') return error
    return error.message || 'Something went wrong. Please try again.'
  }

  const filtered = rows.filter(r => {
    if (fStage !== 'All' && r.workflow_stage !== fStage) return false
    if (fType !== 'All' && r.record_type !== fType) return false
    if (search) {
      const hay = [r.din, r.full_name, r.record_type, r.workflow_stage].join(' ').toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Director KYC</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>
            DIR-3 KYC compliance · {filtered.length} {filtered.length === 1 ? 'record' : 'records'} shown
          </p>
        </div>
        {manager && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setShowHolder(true)} style={btnSecondary}>+ DIN Holder</button>
            <button onClick={() => setShowRecord(true)} style={btnPrimary}>+ KYC Record</button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search DIN, name, type, stage…"
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
          <select value={fStage} onChange={e => setFStage(e.target.value)} style={selectStyle}>
            <option value="All">All stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fType} onChange={e => setFType(e.target.value)} style={selectStyle}>
            <option value="All">All types</option>
            {RECORD_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gray)', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} />
            Open only
          </label>
        </div>
      </div>

      {err && (
        <div className="card" style={{ padding: 16, marginBottom: 16, borderColor: 'var(--red)', color: 'var(--red)', fontSize: 14 }}>
          {err}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
          {rows.length === 0
            ? (manager ? 'No Director KYC records yet. Add a DIN holder, then create a KYC record.' : 'No records assigned to you yet.')
            : 'No records match these filters.'}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--ltgray)', textAlign: 'left', color: 'var(--gray)' }}>
                  <th style={th}>DIN</th><th style={th}>Name</th><th style={th}>Type</th><th style={th}>Cycle / Trigger</th><th style={th}>Stage</th><th style={th}>Due</th><th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const sc = STAGE_COLOR[r.workflow_stage] || { bg: 'var(--ltgray)', fg: 'var(--gray)' }
                  const due = r.effective_due_date
                  const overdue = due && due < today && r.workflow_stage !== 'Filed'
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border2)' }}>
                      <td style={td}><span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.din}</span></td>
                      <td style={td}>{r.full_name}</td>
                      <td style={td}>{r.record_type.replace(/_/g, ' ')}</td>
                      <td style={td}>{r.compliance_cycle || fmtDate(r.trigger_date)}</td>
                      <td style={td}><span style={{ background: sc.bg, color: sc.fg, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.workflow_stage}</span></td>
                      <td style={{ ...td, color: overdue ? 'var(--red)' : 'inherit', fontWeight: overdue ? 700 : 400, whiteSpace: 'nowrap' }}>{fmtDate(due)}{overdue ? ' ⚠' : ''}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <button onClick={() => setDetailId(r.id)} style={btnLink}>Open</button>
                        {manager && <button onClick={() => setLinkHolder({ id: r.din_holder_id, name: r.full_name })} style={btnLink}>Link company</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showHolder && manager && <DINHolderModal onClose={() => setShowHolder(false)} onSaved={() => { setShowHolder(false); load() }} />}
      {showRecord && manager && <KYCRecordModal onClose={() => setShowRecord(false)} onSaved={() => { setShowRecord(false); load() }} />}
      {linkHolder && manager && <CompanyLinkModal holder={linkHolder} onClose={() => setLinkHolder(null)} onSaved={() => setLinkHolder(null)} />}
      {detailId && <KYCRecordDetail recordId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={() => load()} />}
    </div>
  )
}

const btnPrimary = { background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const btnSecondary = { background: '#fff', color: 'var(--dkgreen)', border: '1px solid var(--dkgreen)', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const btnLink = { background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }
const selectStyle = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }
const th = { padding: '12px 14px', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }
const td = { padding: '12px 14px', verticalAlign: 'middle' }
