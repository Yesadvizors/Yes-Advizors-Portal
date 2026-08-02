import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Modal, Field, Input, Select } from './ui'

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

export default function AddTaskModal({ user, onClose, onSaved }) {
  const [clients, setClients] = useState([])
  const [team, setTeam] = useState([])
  const [teamStatus, setTeamStatus] = useState('loading') // loading | ready | error | empty
  const [search, setSearch] = useState('')
  const [showDD, setShowDD] = useState(false)
  const [selected, setSelected] = useState(null)

  const [task, setTask] = useState(''); const [assign, setAssign] = useState('')
  const [due, setDue] = useState(new Date().toISOString().split('T')[0])
  const [priority, setPriority] = useState('Normal')
  const [notes, setNotes] = useState('')
  const [workType, setWorkType] = useState('')

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
  const matches = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  function pick(c) { setSelected(c); setSearch(c.name); setShowDD(false) }

  async function saveTask() {
    if (!selected) { alert('Please select a client first'); return }
    if (!task.trim()) { alert('Task name required'); return }
    // Guard: never create a task without a valid assignee from the live roster.
    if (teamStatus !== 'ready' || !assign) { return }
    const taskId = 'YA-TSK-' + Date.now().toString().slice(-6)
    await supabase.from('tasks').insert({
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
    onSaved()
  }

  return (
    <Modal
      title="Add New Task"
      subtitle="Assign work to your team"
      onClose={onClose}
      footer={selected ? (
        <>
          <button className="ds-btn ds-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ds-btn ds-btn-primary" onClick={saveTask} disabled={teamStatus !== 'ready'}
            title={teamStatus !== 'ready' ? 'An active team member is required to assign the task' : undefined}>Save Task</button>
        </>
      ) : (
        <button className="ds-btn ds-btn-ghost" onClick={onClose}>Cancel</button>
      )}
    >
      {/* Client search */}
      <Field label="Client" required>
        <div style={{ position: 'relative' }}>
          <Input value={search}
            onChange={e => { setSearch(e.target.value); setShowDD(true); setSelected(null) }}
            onFocus={() => setShowDD(true)}
            placeholder="🔍 Type client name..." />
          {showDD && !selected && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-r)', boxShadow: 'var(--ds-shadow-md)', zIndex: 100, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
              {matches.slice(0, 8).map(c => (
                <div key={c.id} onClick={() => pick(c)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--ds-border-2)', fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ds-n-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                  {(c.client_type || c.mobile) && <div style={{ fontSize: 11, color: 'var(--ds-text-subtle)' }}>{[c.client_type, c.mobile && '+91 ' + c.mobile].filter(Boolean).join(' · ')}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Field>

      {selected && (
        <div style={{ marginTop: -8, marginBottom: 14, padding: '8px 12px', background: 'var(--ds-brand-50)', border: '1px solid var(--ds-brand-200)', borderRadius: 'var(--ds-r)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-brand-700)' }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ds-text-subtle)' }}>{selected.client_type}</div>
          </div>
          <button onClick={() => { setSelected(null); setSearch('') }} aria-label="Clear selected client" className="ds-btn ds-btn-ghost ds-btn-sm" style={{ padding: '2px 7px' }}>✕</button>
        </div>
      )}

      {selected && (
        <div>
          <Field label="Work type">
            <Select value={workType} onChange={e => setWorkType(e.target.value)}>
              <option value="">— Select work type —</option>
              {WORK_TYPES.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(item => <option key={item} value={item}>{item}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Field label="Task description" required>
            <Input value={task} onChange={e => setTask(e.target.value)}
              placeholder={workType ? `e.g. ${workType} for ${selected.name}` : 'Describe the task...'} />
          </Field>

          <div className="ds-form-grid">
            <Field label="Assigned to" required>
              {teamStatus === 'ready' ? (
                <Select value={assign} onChange={e => setAssign(e.target.value)}>
                  {team.map(m => <option key={m}>{m}</option>)}
                </Select>
              ) : (
                <>
                  <Select disabled>
                    <option>{teamStatus === 'loading' ? 'Loading team…' : teamStatus === 'empty' ? 'No active team members available' : 'Team list unavailable'}</option>
                  </Select>
                  {teamStatus === 'error' && (
                    <div className="ds-error-text" style={{ marginTop: 6 }}>
                      We couldn’t load the team list.{' '}
                      <button onClick={loadTeam} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ds-brand-700)', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--ds-fs-xs)', textDecoration: 'underline' }}>Retry</button>
                    </div>
                  )}
                  {teamStatus === 'empty' && (
                    <div className="ds-hint" style={{ marginTop: 6 }}>Add an active team member before creating tasks.</div>
                  )}
                </>
              )}
            </Field>
            <Field label="Due date">
              <Input type="date" value={due} onChange={e => setDue(e.target.value)} />
            </Field>
          </div>

          <div className="ds-form-grid">
            <Field label="Priority">
              <Select value={priority} onChange={e => setPriority(e.target.value)}>
                <option>Normal</option><option>High</option><option>Urgent</option>
              </Select>
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </Field>
          </div>

          {/* Checklist preview */}
          <div style={{ background: 'var(--ds-n-50)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-r)', padding: '10px 14px', marginTop: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ds-text-subtle)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Progress Checklist</div>
            {['Documents / data received from client', 'Work completed internally', 'Delivered / filed / sent to client'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, color: 'var(--ds-text-muted)' }}>
                <div style={{ width: 14, height: 14, border: '1.5px solid var(--ds-border-strong)', borderRadius: 3, flexShrink: 0 }} />
                {item}
              </div>
            ))}
            <div style={{ fontSize: 10, color: 'var(--ds-text-faint)', marginTop: 6 }}>Team will tick these off as work progresses</div>
          </div>
        </div>
      )}
    </Modal>
  )
}
