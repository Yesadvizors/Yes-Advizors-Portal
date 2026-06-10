import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

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
  const [search, setSearch] = useState('')
  const [showDD, setShowDD] = useState(false)
  const [selected, setSelected] = useState(null)

  const [task, setTask] = useState(''); const [assign, setAssign] = useState('Pankaj')
  const [due, setDue] = useState(new Date().toISOString().split('T')[0])
  const [priority, setPriority] = useState('Normal')
  const [notes, setNotes] = useState('')
  const [workType, setWorkType] = useState('')

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    const { data } = await supabase.from('clients').select('client_id,name,client_type,mobile').order('name')
    setClients(data || [])
    setShowDD(true)
  }

  const team = ['Pankaj', 'Shivam', 'Prashant', 'Ankit', 'Vega', 'Sejal', 'Simmi', 'Ayush']
  const types = ['Individual', 'Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited Company', 'Public Limited Company', 'Section 8 Company', 'HUF']
  const matches = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  function pick(c) { setSelected(c); setSearch(c.name); setShowDD(false) }


  async function saveTask() {
    if (!selected) { alert('Please select a client first'); return }
    if (!task.trim()) { alert('Task name required'); return }
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

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', background: '#fff' }
  const lbl = { fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Add New Task</div>
            <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>Assign work to your team</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray)' }}>✕</button>
        </div>

        {/* Client search */}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Client *</label>
          <div style={{ position: 'relative', marginTop: 4 }}>
            <input value={search}
              onChange={e => { setSearch(e.target.value); setShowDD(true); setSelected(null) }}
              onFocus={() => setShowDD(true)}
              placeholder="🔍 Type client name..."
              style={{ ...inp, marginTop: 0 }} />
            {showDD && !selected && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {matches.slice(0, 8).map(c => (
                  <div key={c.id} onClick={() => pick(c)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border2)', fontSize: 13 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    {(c.client_type || c.mobile) && <div style={{ fontSize: 11, color: 'var(--gray)' }}>{[c.client_type, c.mobile && '+91 ' + c.mobile].filter(Boolean).join(' · ')}</div>}
                  </div>
                ))}

              </div>
            )}
          </div>

          {selected && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--ltgreen)', border: '1px solid var(--green2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dkgreen)' }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>{selected.client_type}</div>
              </div>
              <button onClick={() => { setSelected(null); setSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', fontSize: 16 }}>✕</button>
            </div>
          )}
        </div>


        {selected && (
          <div>
            {/* Work Type */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Work Type</label>
              <select value={workType} onChange={e => setWorkType(e.target.value)} style={inp}>
                <option value="">— Select work type —</option>
                {WORK_TYPES.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map(item => <option key={item} value={item}>{item}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Task Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Task Description *</label>
              <input value={task} onChange={e => setTask(e.target.value)}
                placeholder={workType ? `e.g. ${workType} for ${selected.name}` : 'Describe the task...'}
                style={inp} />
            </div>

            {/* Assign + Due */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Assigned To</label>
                <select value={assign} onChange={e => setAssign(e.target.value)} style={inp}>
                  {team.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Due Date</label>
                <input type="date" value={due} onChange={e => setDue(e.target.value)} style={inp} />
              </div>
            </div>

            {/* Priority + Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} style={inp}>
                  <option>Normal</option><option>High</option><option>Urgent</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={inp} />
              </div>
            </div>

            {/* Checklist preview */}
            <div style={{ background: '#F8FAF9', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Progress Checklist</div>
              {['Documents / data received from client', 'Work completed internally', 'Delivered / filed / sent to client'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, color: '#6B7280' }}>
                  <div style={{ width: 14, height: 14, border: '1.5px solid #D1D5DB', borderRadius: 3, flexShrink: 0 }} />
                  {item}
                </div>
              ))}
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>Team will tick these off as work progresses</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={onClose} style={{ padding: '9px 20px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveTask} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, background: 'var(--dkgreen)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Save Task</button>
            </div>
          </div>
        )}

        {!selected && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={onClose} style={{ padding: '9px 20px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}
