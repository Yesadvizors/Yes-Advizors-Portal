import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import AddTaskModal from './AddTaskModal'
import FollowUpModal from './FollowUpModal'
import HistoryModal from './HistoryModal'
import { getDueMeta, priColor, isMyTask, STATUS_OPTIONS } from '../helpers'

const WORK_TYPE_GROUPS = [
  'INCOME TAX', 'GST', 'TDS / TCS', 'COMPANY / LLP INCORPORATION',
  'ROC / MCA EVENT WORK', 'AGREEMENT DRAFTING', 'REGISTRATIONS / LICENSES',
  'ACCOUNTING / BOOKKEEPING', 'PAYROLL', 'AUDIT', 'TRUST / NGO / SECTION 8',
  'UAE / INTERNATIONAL', 'ADVISORY / CONSULTING', 'OTHER'
]

const ALL_WORK_TYPES = [
  'ITR Filing — Individual', 'ITR Filing — Company / LLP', 'Tax Audit (3CA / 3CB / 3CD)',
  'Advance Tax Computation', 'TDS Return (24Q / 26Q)', 'Form 15CA / 15CB',
  'Income Tax Notice Reply', 'Income Tax Assessment', 'Income Tax Appeal', 'Updated Return (ITR-U)',
  'GST Registration — New', 'GST Registration — Amendment', 'GST Cancellation',
  'GST Return Filing (GSTR-1)', 'GST Return Filing (GSTR-3B)', 'GST Annual Return (GSTR-9 / 9C)',
  'GST Refund Application', 'GST Notice Reply', 'GST Appeal', 'LUT Filing', 'E-Way Bill Setup',
  'TAN Application — New', 'TDS Return Filing (24Q)', 'TDS Return Filing (26Q)',
  'TCS Return Filing (27EQ)', 'Form 16 / 16A Generation', 'TDS Default Notice Reply',
  'Company Incorporation — Private Limited', 'Company Incorporation — Public Limited',
  'Company Incorporation — OPC', 'Company Incorporation — Section 8', 'LLP Incorporation',
  'LLP Agreement Drafting', 'Partnership Firm Registration', 'Sole Proprietorship Registration',
  'Director Appointment (DIR-12)', 'Director Resignation (DIR-12)', 'Share Allotment (PAS-3)',
  'Share Transfer', 'Charge Creation (CHG-1)', 'Charge Satisfaction (CHG-4)',
  'Increase in Authorised Capital', 'Change of Registered Office', 'Change of Company Name',
  'Change of Object Clause', 'Auditor Appointment (ADT-1)', 'Strike Off Application',
  'DIN KYC (DIR-3 KYC)', 'MGT-14 Filing', 'INC-20A Filing',
  'SHA — Shareholders Agreement', 'SPA — Share Purchase Agreement', 'Partnership Deed Drafting',
  'Employment Agreement', 'NDA — Non Disclosure Agreement', 'Founders Agreement',
  'MOU Drafting', 'Loan Agreement', 'Lease Agreement',
  'MSME / Udyam Registration', 'IEC — Import Export Code', 'Trademark Registration',
  'Copyright Registration', 'FSSAI License', 'Shops & Establishment Registration',
  'Professional Tax Registration', 'PF Registration', 'ESI Registration', 'Labour License', 'RCMC Registration',
  'Monthly Bookkeeping', 'Finalisation of Accounts', 'MIS Report Preparation',
  'Cash Flow Statement', 'Projections / Budget Preparation',
  'Monthly Payroll Processing', 'PF / ESI Registration', 'PF / ESI Return Filing', 'Full & Final Settlement',
  'Statutory Audit', 'Tax Audit', 'Internal Audit', 'Stock Audit', 'Concurrent Audit',
  'Due Diligence', 'Special Purpose Audit',
  '12A Registration', '80G Registration', 'CSR-1 Filing', 'FCRA Registration', 'FCRA Renewal',
  'Form 10B / 10BB Filing', 'Society Registration', 'Trust Deed Drafting',
  'UAE Company Setup — Mainland', 'UAE Company Setup — Free Zone', 'UAE Corporate Tax Registration',
  'UAE VAT Registration', 'UAE VAT Return Filing', 'UAE ESR Filing', 'UBO Declaration',
  'UAE Bank Account Opening', 'UAE Visa Assistance', 'DIFC / ADGM Setup',
  'Tax Planning — Individual', 'Tax Planning — Business', 'Business Structuring Advisory',
  'Investment Advisory', 'Valuation Report', 'Project Report / CMA Data',
  'Loan Documentation Support', 'Net Worth Certificate',
  'Custom / Ad-hoc Work',
]

const CHECKLIST_LABELS = [
  'Documents / data received from client',
  'Work completed internally',
  'Delivered / filed / sent to client',
]

function ChecklistDots({ t }) {
  const done = [t.checklist_1, t.checklist_2, t.checklist_3].filter(Boolean).length
  const total = 3
  const pct = Math.round((done / total) * 100)
  const color = done === 3 ? '#16A34A' : done >= 1 ? '#D97706' : '#D1D5DB'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[t.checklist_1, t.checklist_2, t.checklist_3].map((v, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: v ? color : '#E5E7EB' }} />
        ))}
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 600 }}>{done}/{total}</span>
    </div>
  )
}

function ChecklistPanel({ task, onUpdate }) {
  const [saving, setSaving] = useState(false)

  async function toggle(field, current) {
    setSaving(true)
    await supabase.from('tasks').update({ [field]: !current }).eq('id', task.id)
    onUpdate()
    setSaving(false)
  }

  return (
    <div style={{ margin: '8px 0 4px', background: '#F8FAF9', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Progress</div>
      {[
        { label: CHECKLIST_LABELS[0], field: 'checklist_1', val: task.checklist_1 },
        { label: CHECKLIST_LABELS[1], field: 'checklist_2', val: task.checklist_2 },
        { label: CHECKLIST_LABELS[2], field: 'checklist_3', val: task.checklist_3 },
      ].map((item, i) => (
        <div key={i} onClick={() => !saving && toggle(item.field, item.val)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', borderBottom: i < 2 ? '1px solid #F3F4F6' : '' }}>
          <div style={{
            width: 16, height: 16, borderRadius: 4, border: item.val ? 'none' : '1.5px solid #D1D5DB',
            background: item.val ? '#16A34A' : '#fff', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s'
          }}>
            {item.val && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ fontSize: 12, color: item.val ? '#6B7280' : '#374151', textDecoration: item.val ? 'line-through' : 'none' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([])
  const [fuCounts, setFuCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('All')
  const [fAssign, setFAssign] = useState('All')
  const [fFollow, setFFollow] = useState('All')
  const [fWorkType, setFWorkType] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [followTask, setFollowTask] = useState(null)
  const [historyTask, setHistoryTask] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [expandedChecklist, setExpandedChecklist] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data }, { data: fu }, { data: tm }] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('follow_ups').select('task_id'),
      supabase.from('team').select('name').eq('is_active', true).order('name')
    ])
    setTasks(data || [])
    const counts = {}
    ;(fu || []).forEach(f => { counts[f.task_id] = (counts[f.task_id] || 0) + 1 })
    setFuCounts(counts)
    setTeamMembers((tm || []).map(m => m.name))
    setLoading(false)
  }

  async function markDone(t) {
    if (!isMyTask(t, user)) { alert('Only ' + t.assigned_to + ' can mark this done'); return }
    await supabase.from('tasks').update({ status: 'Done', completed_on: new Date().toISOString(), completed_by: user.name }).eq('id', t.id)
    load()
  }

  const today = new Date().toISOString().split('T')[0]
  const filtered = tasks.filter(t => {
    if (fStatus !== 'All' && t.status !== fStatus) return false
    if (fAssign !== 'All' && !(t.assigned_to || '').includes(fAssign)) return false
    if (fFollow === 'today' && t.next_followup_date !== today) return false
    if (fFollow === 'overdue' && !(t.next_followup_date && t.next_followup_date < today)) return false
    if (fFollow === 'pending' && !t.next_followup_date) return false
    if (fWorkType !== 'All' && t.work_type !== fWorkType) return false
    if (search) {
      const s = search.toLowerCase()
      const hay = [t.task_name, t.client_name, t.assigned_to, t.notes, t.latest_update, t.next_action, t.task_id, t.work_type].join(' ').toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  function clearFilters() { setSearch(''); setFStatus('All'); setFAssign('All'); setFFollow('All'); setFWorkType('All') }

  const workTypesInUse = ['All', ...new Set(tasks.filter(t => t.work_type).map(t => t.work_type))]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Task Tracker</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>All tasks · {filtered.length} shown</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Add Task</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search task, client, work type..."
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
            <option>All</option>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={fAssign} onChange={e => setFAssign(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
            <option>All</option>{teamMembers.map(m => <option key={m}>{m}</option>)}
          </select>
          <select value={fFollow} onChange={e => setFFollow(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
            <option value="All">All follow-ups</option>
            <option value="today">Follow-up today</option>
            <option value="overdue">Follow-up overdue</option>
            <option value="pending">Has follow-up date</option>
          </select>
          <button onClick={clearFilters} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--gray)', cursor: 'pointer' }}>Clear</button>
        </div>

        {/* Work type filter */}
        {workTypesInUse.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray2)', alignSelf: 'center' }}>WORK TYPE:</span>
            {workTypesInUse.map(wt => (
              <button key={wt} onClick={() => setFWorkType(wt)} style={{
                padding: '4px 11px', fontSize: 11, fontWeight: 600, borderRadius: 99, cursor: 'pointer',
                border: '1px solid', transition: '.15s',
                borderColor: fWorkType === wt ? 'var(--dkgreen)' : 'var(--border)',
                background: fWorkType === wt ? 'var(--dkgreen)' : '#fff',
                color: fWorkType === wt ? '#fff' : 'var(--gray)',
              }}>{wt === 'All' ? '📋 All' : wt}</button>
            ))}
          </div>
        )}

        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px dashed var(--border)', marginTop: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray2)', alignSelf: 'center' }}>QUICK:</span>
          <button onClick={() => { setFFollow('today'); setFStatus('All') }} style={chip('#FFFBEB', '#92400E', '#FDE68A')}>📅 Follow-up Today</button>
          <button onClick={() => { setFFollow('overdue'); setFStatus('All') }} style={chip('#FEF2F2', '#DC2626', '#FECACA')}>⚠ Follow-up Overdue</button>
          <button onClick={() => { setFStatus('Waiting for Client'); setFFollow('All') }} style={chip('#FFFBEB', '#92400E', '#FDE68A')}>⏳ Waiting for Client</button>
          <button onClick={() => { setFStatus('Document Received'); setFFollow('All') }} style={chip('#ECFDF5', '#0D7A53', '#A7F3D0')}>📄 Document Received</button>
        </div>
      </div>

      {/* Task list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading
          ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading tasks...</div>
          : filtered.length === 0
          ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No tasks match your filters.</div>
          : filtered.map(t => {
              const isDone = t.status === 'Done'
              const closed = isDone || t.status === 'Cancelled'
              const mine = isMyTask(t, user)
              const m = getDueMeta(t.due_date, t.status)
              const pc = priColor(t.priority)
              const fc = fuCounts[t.task_id] || 0
              const checklistOpen = expandedChecklist === t.id
              const checkDone = [t.checklist_1, t.checklist_2, t.checklist_3].filter(Boolean).length

              return (
                <div key={t.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border2)', opacity: isDone ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Work type badge */}
                      {t.work_type && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dkgreen)', background: 'var(--ltgreen)', border: '1px solid var(--green2)', padding: '1px 8px', borderRadius: 99, display: 'inline-block', marginBottom: 4 }}>
                          {t.work_type}
                        </div>
                      )}

                      <div style={{ fontSize: 14, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.task_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 1 }}>
                        {t.client_name || '—'} · {t.assigned_to || '—'}
                      </div>
                      {t.latest_update && (
                        <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📝 {t.latest_update}
                        </div>
                      )}
                    </div>

                    {/* Due date */}
                    <div style={{ minWidth: 90, textAlign: 'right' }}>
                      {!closed && m.badge && <div style={{ fontSize: 11, color: m.color, fontWeight: m.daysLeft <= 7 ? 600 : 400 }}>{m.label}</div>}
                      {isDone && <div style={{ fontSize: 11, color: 'var(--gray2)' }}>Closed</div>}
                    </div>

                    {/* Priority */}
                    <div style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: pc.bg, color: pc.c }}>{t.priority}</div>

                    {/* Checklist dots */}
                    <div onClick={() => setExpandedChecklist(checklistOpen ? null : t.id)} style={{ cursor: 'pointer' }}>
                      <ChecklistDots t={t} />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {!closed && mine && (
                        <button onClick={() => setFollowTask(t)} style={btn('var(--ltgreen)', 'var(--dkgreen)', 'var(--green2)')}>
                          {fc > 0 ? '📝 Update' : '+ Follow-up'}
                        </button>
                      )}
                      {fc > 0 && (
                        <button onClick={() => setHistoryTask(t)} style={btn('var(--ltgray)', 'var(--gray)', 'var(--border)')}>
                          🕘 {fc}
                        </button>
                      )}
                      {isDone
                        ? <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Done</span>
                        : t.status === 'Cancelled'
                        ? <span style={{ fontSize: 11, color: '#DC2626' }}>Cancelled</span>
                        : mine
                        ? <button onClick={() => markDone(t)} style={{ ...btn('var(--dkgreen)', '#fff', 'var(--dkgreen)'), fontWeight: 600 }}>✓ Done</button>
                        : <span style={{ fontSize: 10.5, color: 'var(--gray2)', padding: '4px 8px', background: 'var(--ltgray)', borderRadius: 6 }}>👤 {t.assigned_to}</span>
                      }
                    </div>
                  </div>

                  {/* Expandable checklist */}
                  {checklistOpen && (
                    <ChecklistPanel task={t} onUpdate={load} />
                  )}
                </div>
              )
            })
        }
      </div>

      {showAdd && <AddTaskModal user={user} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {followTask && <FollowUpModal task={followTask} user={user} onClose={() => setFollowTask(null)} onSaved={() => { setFollowTask(null); load() }} />}
      {historyTask && <HistoryModal task={historyTask} onClose={() => setHistoryTask(null)} />}
    </div>
  )
}

function chip(bg, c, border) { return { padding: '5px 12px', fontSize: 11, fontWeight: 600, border: `1px solid ${border}`, borderRadius: 99, background: bg, color: c, cursor: 'pointer' } }
function btn(bg, c, border) { return { padding: '5px 10px', fontSize: 11, fontWeight: 500, background: bg, color: c, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' } }
