import { useState, useEffect } from 'react'
import { useEscapeKey } from '../useEscapeKey'
import { supabase } from '../supabase'
import { IconClipboard } from '../bento/icons'

const WORK_TYPES = [
  { group: 'INCOME TAX', items: [
    'ITR Filing — Individual',
    'ITR Filing — Company / LLP',
    'Tax Audit (3CA / 3CB / 3CD)',
    'Advance Tax Computation',
    'TDS Return (24Q / 26Q)',
    'Form 15CA / 15CB',
    'Income Tax Notice Reply',
    'Income Tax Assessment',
    'Income Tax Appeal',
    'Updated Return (ITR-U)',
  ]},
  { group: 'GST', items: [
    'GST Registration — New',
    'GST Registration — Amendment',
    'GST Cancellation',
    'GST Return Filing (GSTR-1)',
    'GST Return Filing (GSTR-3B)',
    'GST Annual Return (GSTR-9 / 9C)',
    'GST Refund Application',
    'GST Notice Reply',
    'GST Appeal',
    'LUT Filing',
    'E-Way Bill Setup',
  ]},
  { group: 'TDS / TCS', items: [
    'TAN Application — New',
    'TDS Return Filing (24Q)',
    'TDS Return Filing (26Q)',
    'TCS Return Filing (27EQ)',
    'Form 16 / 16A Generation',
    'TDS Default Notice Reply',
  ]},
  { group: 'COMPANY / LLP INCORPORATION', items: [
    'Company Incorporation — Private Limited',
    'Company Incorporation — Public Limited',
    'Company Incorporation — OPC',
    'Company Incorporation — Section 8',
    'LLP Incorporation',
    'LLP Agreement Drafting',
    'Partnership Firm Registration',
    'Sole Proprietorship Registration',
  ]},
  { group: 'ROC / MCA EVENT WORK', items: [
    'Director Appointment (DIR-12)',
    'Director Resignation (DIR-12)',
    'Share Allotment (PAS-3)',
    'Share Transfer',
    'Charge Creation (CHG-1)',
    'Charge Satisfaction (CHG-4)',
    'Increase in Authorised Capital',
    'Change of Registered Office',
    'Change of Company Name',
    'Change of Object Clause',
    'Auditor Appointment (ADT-1)',
    'Strike Off Application',
    'DIN KYC (DIR-3 KYC)',
    'MGT-14 Filing',
    'INC-20A Filing',
  ]},
  { group: 'AGREEMENT DRAFTING', items: [
    'SHA — Shareholders Agreement',
    'SPA — Share Purchase Agreement',
    'Partnership Deed Drafting',
    'LLP Agreement Drafting',
    'Employment Agreement',
    'NDA — Non Disclosure Agreement',
    'Founders Agreement',
    'MOU Drafting',
    'Loan Agreement',
    'Lease Agreement',
  ]},
  { group: 'REGISTRATIONS / LICENSES', items: [
    'MSME / Udyam Registration',
    'IEC — Import Export Code',
    'Trademark Registration',
    'Copyright Registration',
    'FSSAI License',
    'Shops & Establishment Registration',
    'Professional Tax Registration',
    'PF Registration',
    'ESI Registration',
    'Labour License',
    'RCMC Registration',
  ]},
  { group: 'ACCOUNTING / BOOKKEEPING', items: [
    'Monthly Bookkeeping',
    'Finalisation of Accounts',
    'MIS Report Preparation',
    'Cash Flow Statement',
    'Projections / Budget Preparation',
  ]},
  { group: 'PAYROLL', items: [
    'Monthly Payroll Processing',
    'PF / ESI Registration',
    'PF / ESI Return Filing',
    'Full & Final Settlement',
  ]},
  { group: 'AUDIT', items: [
    'Statutory Audit',
    'Tax Audit',
    'Internal Audit',
    'Stock Audit',
    'Concurrent Audit',
    'Due Diligence',
    'Special Purpose Audit',
  ]},
  { group: 'TRUST / NGO / SECTION 8', items: [
    '12A Registration',
    '80G Registration',
    'CSR-1 Filing',
    'FCRA Registration',
    'FCRA Renewal',
    'Form 10B / 10BB Filing',
    'Society Registration',
    'Trust Deed Drafting',
  ]},
  { group: 'UAE / INTERNATIONAL', items: [
    'UAE Company Setup — Mainland',
    'UAE Company Setup — Free Zone',
    'UAE Corporate Tax Registration',
    'UAE VAT Registration',
    'UAE VAT Return Filing',
    'UAE ESR Filing',
    'UBO Declaration',
    'UAE Bank Account Opening',
    'UAE Visa Assistance',
    'DIFC / ADGM Setup',
  ]},
  { group: 'ADVISORY / CONSULTING', items: [
    'Tax Planning — Individual',
    'Tax Planning — Business',
    'Business Structuring Advisory',
    'Investment Advisory',
    'Valuation Report',
    'Project Report / CMA Data',
    'Loan Documentation Support',
    'Net Worth Certificate',
  ]},
  { group: 'OTHER', items: [
    'Custom / Ad-hoc Work',
  ]},
]

export default function AddTaskModal({ user, onClose, onSaved, presetClient }) {
  const [clients, setClients] = useState([])
  const [team, setTeam] = useState([])
  const [teamStatus, setTeamStatus] = useState('loading') // loading | ready | error | empty
  useEscapeKey(onClose)
  const [search, setSearch] = useState(presetClient?.name || '')
  const [showDD, setShowDD] = useState(false)
  // Optional preselection: when launched from a client-scoped context (e.g. the
  // Client 360 workspace) the client is fixed up front. Shape matches a picked row
  // ({ client_id, name, client_type }) so the rest of the flow is unchanged.
  const [selected, setSelected] = useState(
    presetClient ? { client_id: presetClient.client_id, name: presetClient.name, client_type: presetClient.client_type } : null,
  )

  const [task, setTask] = useState(''); const [assign, setAssign] = useState('')
  const [due, setDue] = useState(new Date().toISOString().split('T')[0])
  const [priority, setPriority] = useState('Normal')
  const [notes, setNotes] = useState('')
  const [workType, setWorkType] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => { loadClients(); loadTeam() }, [])

  async function loadClients() {
    const { data } = await supabase.from('clients').select('client_id,name,client_type,mobile').order('name')
    setClients(data || [])
    setShowDD(true)
  }

  async function loadTeam() {
    // Assignees come ONLY from active rows in public.team. There is no hardcoded
    // roster: a stale list could assign work to staff who have left. On failure or
    // an empty roster we block task creation rather than fabricate options.
    setTeamStatus('loading')
    const { data, error } = await supabase.from('team').select('name').eq('is_active', true).order('name')
    if (error) {
      console.error('[AddTaskModal] Failed to load team members:', error)
      setTeam([]); setTeamStatus('error'); return
    }
    const names = (data || []).map(m => m.name).filter(Boolean)
    if (!names.length) { setTeam([]); setTeamStatus('empty'); return }
    setTeam(names)
    // Default to the current user only if they are themselves an active team
    // member; otherwise the first active member. Never assign to a non-member.
    setAssign(names.includes(user?.name) ? user.name : names[0])
    setTeamStatus('ready')
  }
  const types = ['Individual', 'Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited Company', 'Public Limited Company', 'Section 8 Company', 'HUF']
  const matches = clients.filter(c => (c.name || '').toLowerCase().includes(search.trim().toLowerCase()))

  function pick(c) { setSelected(c); setSearch(c.name); setShowDD(false) }


  async function saveTask() {
    if (saving) return  // re-entrancy guard: the button disables only after re-render
    if (!selected) { setSaveError('Please select a client first.'); return }
    if (!task.trim()) { setSaveError('Task name is required.'); return }
    // Guard: never create a task without a valid assignee from the live roster.
    if (teamStatus !== 'ready' || !assign) { return }
    setSaving(true); setSaveError('')
    // Externally-visible id format PRESERVED (YA-TSK- + 6 digits) — DB/RPC/automation
    // consumers of this format are unverified here, so it is not changed. Collision
    // safety comes from the re-entrancy guard above and the insert-error check below
    // (a rare collision now surfaces a visible error to retry, not a silent success).
    const taskId = 'YA-TSK-' + Date.now().toString().slice(-6)
    const { error } = await supabase.from('tasks').insert({
      task_id: taskId,
      task_name: task.trim(),
      client_id: selected.client_id,
      client_name: selected.name,
      assigned_to: assign,
      assigned_by: user.name,
      due_date: due,
      priority,
      status: 'Pending',
      notes: notes.trim(),
      work_type: workType || null,
      checklist_1: false,
      checklist_2: false,
      checklist_3: false,
    })
    if (error) {
      console.error('[AddTaskModal] task insert failed:', error)
      setSaving(false)
      setSaveError("Couldn't create the task. Please try again.")
      return
    }
    onSaved()  // only after a confirmed successful insert
  }

  return (
    <div className="atm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{ATM_CSS}</style>
      <div className="atm-modal" role="dialog" aria-modal="true" aria-label="Add new task">

        {/* Sticky header */}
        <div className="atm-head">
          <span className="atm-head-icon"><IconClipboard size={20} /></span>
          <div>
            <div className="atm-head-title">Add New Task</div>
            <div className="atm-head-sub">Assign work to your team</div>
          </div>
          <button className="atm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Single scrollable body */}
        <div className="atm-body">
          <div className="atm-cols">

            {/* LEFT column — client + task */}
            <div className="atm-col">
              <div className="atm-fld">
                <div className="atm-sec">Client</div>
                {!selected ? (
                  <>
                    <input className="atm-inp" value={search}
                      onChange={e => { setSearch(e.target.value); setShowDD(true); setSelected(null) }}
                      onFocus={() => setShowDD(true)}
                      placeholder="Type client name..." aria-label="Search client" autoFocus />
                    <div className="atm-results" role="listbox" aria-label="Client results">
                      {matches.length === 0
                        ? <div className="atm-result-sub" style={{ padding: '12px 14px' }}>No matching clients.</div>
                        : matches.slice(0, 20).map(c => (
                          <button type="button" key={c.client_id} className="atm-result" onClick={() => pick(c)}>
                            <div className="atm-result-nm">{c.name}</div>
                            {(c.client_type || c.mobile || c.client_id) && (
                              <div className="atm-result-sub">{[c.client_type, c.mobile && '+91 ' + c.mobile, c.client_id].filter(Boolean).join(' · ')}</div>
                            )}
                          </button>
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="atm-selected">
                    <div>
                      <div className="atm-selected-nm">{selected.name}</div>
                      <div className="atm-selected-sub">{[selected.client_type, selected.client_id].filter(Boolean).join(' · ')}</div>
                    </div>
                    <button type="button" className="atm-change" onClick={() => { setSelected(null); setSearch('') }}>Change client</button>
                  </div>
                )}
              </div>

              {selected && (
                <>
                  <div className="atm-fld">
                    <label className="atm-lbl">Work Type</label>
                    <select className="atm-inp" value={workType} onChange={e => setWorkType(e.target.value)}>
                      <option value="">— Select work type —</option>
                      {WORK_TYPES.map(g => (
                        <optgroup key={g.group} label={g.group}>
                          {g.items.map(item => <option key={item} value={item}>{item}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="atm-fld">
                    <label className="atm-lbl">Task Description *</label>
                    <input className="atm-inp" value={task} onChange={e => setTask(e.target.value)}
                      placeholder={workType ? `e.g. ${workType} for ${selected.name}` : 'Describe the task...'} />
                  </div>
                  <div className="atm-fld">
                    <label className="atm-lbl">Notes</label>
                    <input className="atm-inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
                  </div>
                </>
              )}
            </div>

            {/* RIGHT column — assignment + schedule + checklist */}
            <div className="atm-col">
              {!selected ? (
                <div className="atm-hint">Select a client to add task details.</div>
              ) : (
                <>
                  <div className="atm-fld">
                    <div className="atm-sec">Assignment</div>
                    <label className="atm-lbl">Assigned To *</label>
                    {teamStatus === 'ready' ? (
                      <select className="atm-inp" value={assign} onChange={e => setAssign(e.target.value)}>
                        {team.map(m => <option key={m}>{m}</option>)}
                      </select>
                    ) : (
                      <>
                        <select className="atm-inp" disabled style={{ background: '#F5F6F9', color: '#8A94A6', cursor: 'not-allowed' }}>
                          <option>{teamStatus === 'loading' ? 'Loading team…' : teamStatus === 'empty' ? 'No active team members available' : 'Team list unavailable'}</option>
                        </select>
                        {teamStatus === 'error' && (
                          <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626' }}>
                            We couldn’t load the team list.{' '}
                            <button onClick={loadTeam} style={{ background: 'none', border: 'none', padding: 0, color: '#157A39', fontWeight: 600, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Retry</button>
                          </div>
                        )}
                        {teamStatus === 'empty' && (
                          <div style={{ marginTop: 6, fontSize: 12, color: '#5A6577' }}>Add an active team member before creating tasks.</div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="atm-fld">
                    <label className="atm-lbl">Priority</label>
                    <select className="atm-inp" value={priority} onChange={e => setPriority(e.target.value)}>
                      <option>Normal</option><option>High</option><option>Urgent</option>
                    </select>
                  </div>
                  <div className="atm-fld">
                    <label className="atm-lbl">Due Date</label>
                    <input className="atm-inp" type="date" value={due} onChange={e => setDue(e.target.value)} />
                  </div>
                  <div className="atm-fld">
                    <label className="atm-lbl">Progress Checklist</label>
                    <div className="atm-checklist">
                      {['Documents / data received from client', 'Work completed internally', 'Delivered / filed / sent to client'].map((item, i) => (
                        <div key={i} className="atm-check-row"><span className="atm-check-box" />{item}</div>
                      ))}
                      <div style={{ fontSize: 10.5, color: '#8A94A6', marginTop: 6 }}>Team will tick these off as work progresses</div>
                    </div>
                  </div>
                  {saveError && <div className="atm-err" role="alert">{saveError}</div>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sticky footer — Create Task always visible */}
        <div className="atm-foot">
          <button className="atm-btn atm-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="atm-btn atm-btn-primary" onClick={saveTask} disabled={!selected || teamStatus !== 'ready' || saving}
            title={!selected ? 'Select a client first' : teamStatus !== 'ready' ? 'An active team member is required to assign the task' : undefined}>
            {saving ? 'Saving…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Self-contained Bento styling — this modal can render OUTSIDE the `.bento` scope
// (BentoApp Quick Action), so it cannot rely on `--b-*` tokens. Colours mirror the
// approved Bento palette. No emoji; SVG icon in the header.
const ATM_CSS = `
.atm-overlay{position:fixed;inset:0;background:rgba(16,24,40,.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px}
.atm-modal{font-family:'Geist','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;border-radius:16px;width:960px;max-width:94vw;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 70px rgba(4,28,20,.28)}
.atm-head{flex-shrink:0;display:flex;align-items:center;gap:14px;padding:18px 24px;border-bottom:1px solid #EEF1F5}
.atm-head-icon{width:40px;height:40px;border-radius:11px;background:#EDF7F0;color:#157A39;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.atm-head-title{font-size:18px;font-weight:700;color:#16213A}
.atm-head-sub{font-size:12.5px;color:#5A6577;margin-top:2px}
.atm-close{margin-left:auto;flex-shrink:0;width:34px;height:34px;border-radius:9px;border:1px solid #E6EAF0;background:#fff;color:#5A6577;font-size:16px;cursor:pointer}
.atm-close:hover{background:#F5F6F9}
.atm-close:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(26,143,67,.24)}
.atm-body{flex:1;overflow-y:auto;padding:22px 24px;min-height:260px}
.atm-foot{flex-shrink:0;display:flex;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid #EEF1F5;background:#fff}
.atm-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.atm-col{display:flex;flex-direction:column;gap:16px}
.atm-sec{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#157A39;margin-bottom:8px}
.atm-lbl{display:block;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#5A6577;margin-bottom:5px}
.atm-inp{width:100%;padding:10px 12px;border:1px solid #E6EAF0;border-radius:9px;font-size:13.5px;font-family:inherit;box-sizing:border-box;outline:none;background:#fff;color:#16213A}
.atm-inp:focus{border-color:#1A8F43;box-shadow:0 0 0 3px rgba(26,143,67,.16)}
.atm-results{margin-top:8px;border:1px solid #E6EAF0;border-radius:10px;max-height:280px;overflow-y:auto;background:#fff}
.atm-result{display:block;width:100%;text-align:left;padding:10px 14px;border:none;border-bottom:1px solid #EEF1F5;background:#fff;cursor:pointer;font-family:inherit}
.atm-result:last-child{border-bottom:none}
.atm-result:hover,.atm-result:focus-visible{background:#EDF7F0;outline:none}
.atm-result-nm{font-size:13.5px;font-weight:600;color:#16213A}
.atm-result-sub{font-size:11.5px;color:#5A6577;margin-top:1px}
.atm-selected{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:#EDF7F0;border:1px solid #CDE9D5;border-radius:10px}
.atm-selected-nm{font-size:14px;font-weight:700;color:#157A39}
.atm-selected-sub{font-size:11.5px;color:#5A6577;margin-top:1px}
.atm-change{font-size:11.5px;font-weight:600;color:#157A39;background:#fff;border:1px solid #CDE9D5;border-radius:7px;padding:6px 11px;cursor:pointer;flex-shrink:0}
.atm-change:hover{background:#fff;border-color:#1A8F43}
.atm-change:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(26,143,67,.24)}
.atm-hint{padding:18px;border:1px dashed #E6EAF0;border-radius:10px;font-size:12.5px;color:#8A94A6;text-align:center}
.atm-checklist{background:#F5F6F9;border:1px solid #EEF1F5;border-radius:10px;padding:12px 14px}
.atm-check-row{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:#5A6577}
.atm-check-box{width:14px;height:14px;border:1.5px solid #D8DEE8;border-radius:3px;flex-shrink:0}
.atm-err{font-size:12px;color:#DC2626;background:#FDECEC;border:1px solid #F7CFCF;border-radius:8px;padding:8px 12px}
.atm-btn{padding:10px 22px;font-size:13.5px;font-weight:600;border-radius:9px;cursor:pointer;font-family:inherit}
.atm-btn-cancel{border:1px solid #E6EAF0;background:#fff;color:#16213A}
.atm-btn-cancel:hover{background:#F5F6F9}
.atm-btn-primary{border:none;background:#1A8F43;color:#fff}
.atm-btn-primary:hover:not(:disabled){background:#157A39}
.atm-btn-primary:disabled,.atm-btn-cancel:disabled{opacity:.55;cursor:not-allowed}
.atm-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(26,143,67,.24)}
@media(max-width:760px){.atm-cols{grid-template-columns:1fr}.atm-modal{max-height:92vh}}
`