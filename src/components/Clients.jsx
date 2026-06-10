import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'
import OnboardingWizard from './OnboardingWizard'
import DocumentManager from './DocumentManager'

const DIR_PALETTE = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#F3E8FF', text: '#7C3AED' }, { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#D1FAE5', text: '#065F46' },
]
function initials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── STATUS CONFIG FOR COMPLIANCE ──────────────────────────────
const STATUS_CFG = {
  'Filed':                    { bg:'#DCFCE7', color:'#166534', dot:'#16A34A' },
  'Completed':                { bg:'#DCFCE7', color:'#166534', dot:'#16A34A' },
  'Overdue':                  { bg:'#FEE2E2', color:'#991B1B', dot:'#DC2626' },
  'Not Started':              { bg:'#F3F4F6', color:'#6B7280', dot:'#9CA3AF' },
  'In Progress':              { bg:'#DBEAFE', color:'#1E40AF', dot:'#3B82F6' },
  'Assigned':                 { bg:'#DBEAFE', color:'#1E40AF', dot:'#3B82F6' },
  'Prepared':                 { bg:'#E0E7FF', color:'#3730A3', dot:'#6366F1' },
  'Reviewed':                 { bg:'#F3E8FF', color:'#6B21A8', dot:'#A855F7' },
  'Partner Approval Pending': { bg:'#EDE9FE', color:'#5B21B6', dot:'#7C3AED' },
  'Filing Pending':           { bg:'#E0E7FF', color:'#3730A3', dot:'#6366F1' },
  'Waiting for Client':       { bg:'#FEF3C7', color:'#92400E', dot:'#F59E0B' },
  'Data Pending':             { bg:'#FEF3C7', color:'#92400E', dot:'#F59E0B' },
  'Documents Pending':        { bg:'#FFEDD5', color:'#9A3412', dot:'#F97316' },
  'Payment Pending':          { bg:'#FCE7F3', color:'#9D174D', dot:'#EC4899' },
  'Not Applicable':           { bg:'#F3F4F6', color:'#9CA3AF', dot:'#D1D5DB' },
  'Closed':                   { bg:'#F3F4F6', color:'#9CA3AF', dot:'#D1D5DB' },
}
const sc = (s) => STATUS_CFG[s] || { bg:'#F3F4F6', color:'#6B7280', dot:'#9CA3AF' }

const SBadge = ({ status }) => {
  const cfg = sc(status)
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:99, fontSize:10.5, fontWeight:700, background:cfg.bg, color:cfg.color, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
      {status || '—'}
    </span>
  )
}
const YN = ({ v, t='Yes', f='No' }) => (
  <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:99, background:v?'#DCFCE7':'#FEE2E2', color:v?'#166534':'#991B1B' }}>{v?t:f}</span>
)
const Spin = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
    <div style={{ width:28, height:28, border:'3px solid #E5E7EB', borderTopColor:'#0A3D2C', borderRadius:'50%', animation:'ctSpin .7s linear infinite' }} />
    <style>{`@keyframes ctSpin{to{transform:rotate(360deg)}}`}</style>
  </div>
)
const Empty = ({ label }) => (
  <div style={{ textAlign:'center', padding:'32px 16px', color:'#9CA3AF' }}>
    <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
    <div style={{ fontSize:13, fontWeight:600, color:'#6B7280' }}>No {label} records yet</div>
    <div style={{ fontSize:11, marginTop:4 }}>Records will appear once added for this client.</div>
  </div>
)
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'
const effDate = (r) => r.individual_due_date || r.extended_due_date || r.standard_due_date || r.response_due_date

// ─── COMPLIANCE TABLE WRAPPER ───────────────────────────────────
function CTTable({ cols, rows, render, empty }) {
  if (!rows.length) return empty || <Empty label="" />
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ background:'#F8FAF9', borderBottom:'2px solid #E5E7EB' }}>
            {cols.map((c,i) => <th key={i} style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#374151', whiteSpace:'nowrap', fontSize:11, letterSpacing:'.4px', textTransform:'uppercase' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom:'1px solid #F3F4F6', background: i%2===0?'#fff':'#FAFCFB' }}>
              {render(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
const TD = ({ children, bold }) => (
  <td style={{ padding:'9px 12px', color: bold?'#111827':'#374151', fontWeight: bold?600:400, whiteSpace:'nowrap' }}>
    {children ?? <span style={{ color:'#D1D5DB' }}>—</span>}
  </td>
)

// ─── INCOME TAX TAB ─────────────────────────────────────────────
function ITTab({ clientId, fy }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    supabase.from('income_tax_tracker')
      .select('*, ct_team_members!income_tax_tracker_assigned_to_fkey(display_name)')
      .eq('client_id', clientId).eq('fy_label', fy)
      .then(({ data }) => { setRows(data||[]); setLoading(false) })
  }, [clientId, fy])
  if (loading) return <Spin />
  return (
    <CTTable
      cols={['FY','AY','ITR Form','Due Date','Data Recvd','Computation','Filed','Ack No.','Status','Assigned']}
      rows={rows}
      empty={<Empty label="Income Tax" />}
      render={r => (<>
        <TD bold>{r.fy_label}</TD>
        <TD>{r.assessment_year}</TD>
        <TD>{r.itr_form}</TD>
        <TD>{fmt(effDate(r))}</TD>
        <TD><YN v={r.data_received} /></TD>
        <TD><YN v={r.computation_prepared} /></TD>
        <TD><YN v={r.return_filed} /></TD>
        <TD>{r.acknowledgement_number}</TD>
        <TD><SBadge status={r.status} /></TD>
        <TD>{r.ct_team_members?.display_name}</TD>
      </>)}
    />
  )
}

// ─── GST TAB ────────────────────────────────────────────────────
function GSTTab({ clientId, fy }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  useEffect(() => {
    setLoading(true)
    supabase.from('gst_tracker')
      .select('*, ct_team_members!gst_tracker_assigned_to_fkey(display_name)')
      .eq('client_id', clientId).eq('fy_label', fy)
      .order('period_month').order('return_type')
      .then(({ data }) => { setRows(data||[]); setLoading(false) })
  }, [clientId, fy])
  const types = ['All', ...new Set((rows||[]).map(r => r.return_type))]
  const filtered = filter==='All' ? rows : rows.filter(r => r.return_type===filter)
  if (loading) return <Spin />
  return (
    <>
      <div style={{ display:'flex', gap:6, padding:'0 0 12px', flexWrap:'wrap' }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding:'4px 12px', borderRadius:99, border:'1px solid', fontSize:11, fontWeight:600, cursor:'pointer',
            borderColor: filter===t ? '#0A3D2C' : '#E5E7EB',
            background: filter===t ? '#0A3D2C' : '#fff',
            color: filter===t ? '#fff' : '#6B7280'
          }}>{t}</button>
        ))}
      </div>
      <CTTable
        cols={['Period','Return','Freq','Due Date','Data','Reconciled','Payment','Filed','ARN','Status','Assigned']}
        rows={filtered}
        empty={<Empty label="GST" />}
        render={r => (<>
          <TD bold>{r.period}</TD>
          <TD>{r.return_type}</TD>
          <TD>{r.filing_frequency?.replace('_',' ')}</TD>
          <TD>{fmt(effDate(r))}</TD>
          <TD><YN v={r.sales_data_received && r.purchase_data_received} /></TD>
          <TD><YN v={r.reconciliation_completed} /></TD>
          <TD><YN v={r.payment_done} /></TD>
          <TD><YN v={r.return_filed} /></TD>
          <TD>{r.arn}</TD>
          <TD><SBadge status={r.status} /></TD>
          <TD>{r.ct_team_members?.display_name}</TD>
        </>)}
      />
    </>
  )
}

// ─── TDS TAB ────────────────────────────────────────────────────
function TDSTab({ clientId, fy }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    supabase.from('tds_tracker')
      .select('*, ct_team_members!tds_tracker_assigned_to_fkey(display_name)')
      .eq('client_id', clientId).eq('fy_label', fy)
      .order('quarter').order('form_type')
      .then(({ data }) => { setRows(data||[]); setLoading(false) })
  }, [clientId, fy])
  if (loading) return <Spin />
  return (
    <CTTable
      cols={['Quarter','Form','TAN','Due Date','Challan','Prepared','Filed','PRN / Token','Status','Assigned']}
      rows={rows}
      empty={<Empty label="TDS" />}
      render={r => (<>
        <TD bold>{r.quarter}</TD>
        <TD>{r.form_type}</TD>
        <TD>{r.tan}</TD>
        <TD>{fmt(effDate(r))}</TD>
        <TD><YN v={r.challan_received} /></TD>
        <TD><YN v={r.return_prepared} /></TD>
        <TD><YN v={r.return_filed} /></TD>
        <TD>{r.token_number}</TD>
        <TD><SBadge status={r.status} /></TD>
        <TD>{r.ct_team_members?.display_name}</TD>
      </>)}
    />
  )
}

// ─── ROC TAB ────────────────────────────────────────────────────
function ROCTab({ clientId, fy }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  useEffect(() => {
    setLoading(true)
    supabase.from('roc_tracker')
      .select('*, ct_team_members!roc_tracker_assigned_to_fkey(display_name)')
      .eq('client_id', clientId).eq('fy_label', fy)
      .order('filing_type').order('form_name')
      .then(({ data }) => { setRows(data||[]); setLoading(false) })
  }, [clientId, fy])
  const filtered = filter==='All' ? rows : rows.filter(r => r.filing_type===filter)
  if (loading) return <Spin />
  return (
    <>
      <div style={{ display:'flex', gap:6, padding:'0 0 12px', flexWrap:'wrap' }}>
        {['All','Annual','Event Based'].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding:'4px 12px', borderRadius:99, border:'1px solid', fontSize:11, fontWeight:600, cursor:'pointer',
            borderColor: filter===t ? '#0A3D2C' : '#E5E7EB',
            background: filter===t ? '#0A3D2C' : '#fff',
            color: filter===t ? '#fff' : '#6B7280'
          }}>{t}</button>
        ))}
      </div>
      <CTTable
        cols={['Form','Type','Event Date','Due Date','Docs','Prepared','Filed','SRN','Status','Assigned']}
        rows={filtered}
        empty={<Empty label="ROC" />}
        render={r => (<>
          <TD bold>{r.form_name}</TD>
          <TD>
            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background: r.filing_type==='Annual'?'#DBEAFE':'#FEF9C3', color: r.filing_type==='Annual'?'#1E40AF':'#854D0E', fontWeight:700 }}>
              {r.filing_type}
            </span>
          </TD>
          <TD>{fmt(r.event_date)}</TD>
          <TD>{fmt(effDate(r))}</TD>
          <TD><YN v={!r.documents_pending} t="Received" f="Pending" /></TD>
          <TD><YN v={r.form_prepared} /></TD>
          <TD><YN v={r.return_filed} /></TD>
          <TD>{r.srn}</TD>
          <TD><SBadge status={r.status} /></TD>
          <TD>{r.ct_team_members?.display_name}</TD>
        </>)}
      />
    </>
  )
}

// ─── AUDIT TAB ──────────────────────────────────────────────────
function AuditTab({ clientId, fy }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    supabase.from('audit_tracker')
      .select('*, ct_team_members!audit_tracker_assigned_auditor_fkey(display_name)')
      .eq('client_id', clientId).eq('fy_label', fy)
      .then(({ data }) => { setRows(data||[]); setLoading(false) })
  }, [clientId, fy])
  if (loading) return <Spin />
  return (
    <CTTable
      cols={['Audit Type','Due Date','Books Recvd','Working','UDIN','Report Signed','Filed','Status','Auditor']}
      rows={rows}
      empty={<Empty label="Audit" />}
      render={r => (<>
        <TD bold>{r.audit_type}</TD>
        <TD>{fmt(effDate(r))}</TD>
        <TD><YN v={r.books_received} /></TD>
        <TD><YN v={r.audit_working_prepared} /></TD>
        <TD>{r.udin_number || <YN v={false} />}</TD>
        <TD><YN v={r.audit_report_signed} /></TD>
        <TD><YN v={r.filing_completed} /></TD>
        <TD><SBadge status={r.status} /></TD>
        <TD>{r.ct_team_members?.display_name}</TD>
      </>)}
    />
  )
}

// ─── ACCOUNTING TAB ─────────────────────────────────────────────
function AccTab({ clientId, fy }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    supabase.from('accounting_tracker')
      .select('*, ct_team_members!accounting_tracker_assigned_to_fkey(display_name)')
      .eq('client_id', clientId).eq('fy_label', fy)
      .then(({ data }) => { setRows(data||[]); setLoading(false) })
  }, [clientId, fy])
  if (loading) return <Spin />
  return (
    <CTTable
      cols={['Month','Sales','Purchase','Bank','GST Recon','TDS Recon','Bank Recon','Closing','MIS Sent','Status','Assigned']}
      rows={rows}
      empty={<Empty label="Accounting" />}
      render={r => (<>
        <TD bold>{r.period_label || r.month}</TD>
        <TD><YN v={r.sales_booked} /></TD>
        <TD><YN v={r.purchase_booked} /></TD>
        <TD><YN v={r.bank_entries_completed} /></TD>
        <TD><YN v={r.gst_reconciliation_done} /></TD>
        <TD><YN v={r.tds_reconciliation_done} /></TD>
        <TD><YN v={r.bank_reconciliation_done} /></TD>
        <TD><YN v={r.month_closing_done} /></TD>
        <TD><YN v={r.mis_sent_to_client} /></TD>
        <TD><SBadge status={r.status} /></TD>
        <TD>{r.ct_team_members?.display_name}</TD>
      </>)}
    />
  )
}

// ─── NOTICES TAB ────────────────────────────────────────────────
function NoticeTab({ clientId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    supabase.from('notice_tracker')
      .select('*, ct_team_members!notice_tracker_assigned_to_fkey(display_name)')
      .eq('client_id', clientId).order('created_at', { ascending:false })
      .then(({ data }) => { setRows(data||[]); setLoading(false) })
  }, [clientId])
  if (loading) return <Spin />
  return (
    <CTTable
      cols={['Authority','Type','Section','Notice Date','Response Due','Linked To','Reply Filed','Demand','Status','Assigned']}
      rows={rows}
      empty={<Empty label="Notices" />}
      render={r => (<>
        <TD bold>{r.authority}</TD>
        <TD>{r.notice_type}</TD>
        <TD>{r.section}</TD>
        <TD>{fmt(r.notice_date)}</TD>
        <td style={{ padding:'9px 12px', whiteSpace:'nowrap', color: effDate(r) && new Date(effDate(r))<new Date() ? '#DC2626' : '#374151', fontWeight: effDate(r) && new Date(effDate(r))<new Date() ? 700 : 400 }}>
          {fmt(effDate(r))}
        </td>
        <TD>{r.linked_compliance_period}</TD>
        <TD><YN v={r.reply_filed} /></TD>
        <TD>{r.demand_raised ? '₹'+Number(r.demand_raised).toLocaleString('en-IN') : null}</TD>
        <TD><SBadge status={r.status} /></TD>
        <TD>{r.ct_team_members?.display_name}</TD>
      </>)}
    />
  )
}

// ─── COMPLIANCE TRACKER TAB (main) ──────────────────────────────
const FY_LIST = ['2025-26','2024-25','2023-24','2022-23','2021-22','2020-21']

const ctCss = `
.ct-tab-btn{border:none;background:none;cursor:pointer;padding:9px 14px;font-size:12px;font-weight:600;color:#6B7280;border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:5px;transition:.15s;font-family:'Plus Jakarta Sans',-apple-system,sans-serif}
.ct-tab-btn:hover:not(.ct-active){color:#111827}
.ct-tab-btn.ct-active{color:#0A3D2C;border-bottom-color:#0A3D2C}
.ct-sum-card{background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;min-width:90px}
`

function ComplianceTracker({ client }) {
  const [fy, setFy] = useState('2024-25')
  const [activeTab, setActiveTab] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loadSum, setLoadSum] = useState(true)

  const tabs = [
    { key:'it',      label:'Income Tax', icon:'🧾', show:true },
    { key:'gst',     label:'GST',        icon:'🏪', show:!!client.gstin },
    { key:'tds',     label:'TDS',        icon:'💰', show:!!client.tan },
    { key:'roc',     label:'ROC / MCA',  icon:'🏢', show:['Private Limited Company','Limited Company','Section 8 Company'].includes(client.client_type) },
    { key:'audit',   label:'Audit',      icon:'🔍', show:true },
    { key:'acc',     label:'Accounting', icon:'📒', show:true },
    { key:'notices', label:'Notices',    icon:'📨', show:true },
  ].filter(t => t.show)

  useEffect(() => {
    if (tabs.length && !activeTab) setActiveTab(tabs[0].key)
  }, [client.id])

  useEffect(() => {
    setLoadSum(true)
    supabase.from('v_client_compliance_summary')
      .select('*').eq('client_id', client.id).eq('fy_label', fy).single()
      .then(({ data }) => { setSummary(data); setLoadSum(false) })
  }, [client.id, fy])

  const sumCards = [
    { label:'Total',           val:summary?.total_compliances,         color:'#6366F1' },
    { label:'Completed',       val:summary?.completed,                 color:'#16A34A' },
    { label:'Overdue',         val:summary?.overdue,                   color:'#DC2626' },
    { label:'Due Soon',        val:summary?.due_soon,                  color:'#D97706' },
    { label:'Pending',         val:summary?.pending,                   color:'#2563EB' },
    { label:'Wait Client',     val:summary?.waiting_client,            color:'#EA580C' },
    { label:'Apprvl Pending',  val:summary?.partner_approval_pending,  color:'#7C3AED' },
    { label:'Filing Pending',  val:summary?.filing_pending,            color:'#0369A1' },
  ]

  const activeLabel = tabs.find(t => t.key === activeTab)

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif" }}>
      <style>{ctCss}</style>

      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#0A3D2C', letterSpacing:'.3px' }}>Compliance Tracker</div>
          <div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>
            {client.gstin && <span style={{ color:'#059669', fontWeight:600 }}>GST ✓&nbsp;&nbsp;</span>}
            {client.tan   && <span style={{ color:'#2563EB', fontWeight:600 }}>TDS ✓&nbsp;&nbsp;</span>}
            {client.cin   && <span style={{ color:'#7C3AED', fontWeight:600 }}>ROC ✓&nbsp;&nbsp;</span>}
            {client.pf_no && <span style={{ color:'#D97706', fontWeight:600 }}>PF ✓&nbsp;&nbsp;</span>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'#6B7280', fontWeight:600 }}>FY</span>
          <select value={fy} onChange={e => setFy(e.target.value)} style={{
            border:'1px solid #D1D5DB', borderRadius:8, padding:'5px 10px',
            fontSize:12, fontWeight:700, color:'#111827', background:'#fff', cursor:'pointer', outline:'none'
          }}>
            {FY_LIST.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
        {sumCards.map((c,i) => (
          <div key={i} className="ct-sum-card">
            <div style={{ width:6, height:28, borderRadius:3, background:c.color, flexShrink:0 }} />
            <div>
              <div style={{ fontSize:20, fontWeight:700, color:c.color, lineHeight:1 }}>
                {loadSum ? '…' : (c.val ?? 0)}
              </div>
              <div style={{ fontSize:10, color:'#6B7280', marginTop:2, fontWeight:600 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'2px solid #E5E7EB', overflowX:'auto', marginBottom:16 }}>
        {tabs.map(tab => (
          <button key={tab.key} className={`ct-tab-btn${activeTab===tab.key?' ct-active':''}`} onClick={() => setActiveTab(tab.key)}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', background:'#F8FAF9', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, fontWeight:700, color:'#0A3D2C' }}>
            {activeLabel?.icon} {activeLabel?.label} — FY {fy}
          </span>
          <span style={{ fontSize:10.5, color:'#9CA3AF' }}>Only records added for this client shown</span>
        </div>
        <div style={{ padding:'14px 16px' }}>
          {activeTab==='it'      && <ITTab     clientId={client.id} fy={fy} />}
          {activeTab==='gst'     && <GSTTab    clientId={client.id} fy={fy} />}
          {activeTab==='tds'     && <TDSTab    clientId={client.id} fy={fy} />}
          {activeTab==='roc'     && <ROCTab    clientId={client.id} fy={fy} />}
          {activeTab==='audit'   && <AuditTab  clientId={client.id} fy={fy} />}
          {activeTab==='acc'     && <AccTab    clientId={client.id} fy={fy} />}
          {activeTab==='notices' && <NoticeTab clientId={client.id} />}
        </div>
      </div>
    </div>
  )
}

// ─── CSS (existing + new modal tab styles) ──────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
.cd-overlay{position:fixed;inset:0;background:rgba(7,24,18,.52);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);z-index:2000;display:flex;align-items:flex-start;justify-content:center;padding:14px 16px;overflow-y:auto;animation:cdFade .22s ease}
.cd-modal{font-family:'Plus Jakarta Sans',-apple-system,sans-serif;background:#FDFDFB;border-radius:22px;width:100%;max-width:960px;margin-top:14px;overflow:hidden;box-shadow:0 28px 80px rgba(4,28,20,.42);animation:cdRise .36s cubic-bezier(.22,1,.36,1)}
@keyframes cdFade{from{opacity:0}to{opacity:1}}
@keyframes cdRise{from{opacity:0;transform:translateY(22px) scale(.987)}to{opacity:1;transform:none}}
.cd-head{position:relative;background:linear-gradient(132deg,#06281D 0%,#0A3D2C 52%,#0D7A53 130%);padding:24px 26px 20px;overflow:hidden}
.cd-head::after{content:'';position:absolute;inset:0;background:radial-gradient(rgba(212,185,120,.13) 1px,transparent 1px);background-size:26px 26px;pointer-events:none}
.cd-head::before{content:'';position:absolute;right:-60px;top:-80px;width:240px;height:240px;border-radius:50%;background:radial-gradient(closest-side,rgba(212,185,120,.18),transparent);pointer-events:none}
.cd-mono{width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(212,185,120,.5);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;letter-spacing:.5px;color:#E8D5A3;flex-shrink:0}
.cd-eyebrow{font-size:9.5px;letter-spacing:3px;text-transform:uppercase;color:#CBB877;font-weight:700;margin-bottom:2px}
.cd-name{font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:600;color:#fff;letter-spacing:.2px;line-height:1.2}
.cd-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:rgba(255,255,255,.85);font-size:14px;cursor:pointer;transition:.2s;z-index:2;display:flex;align-items:center;justify-content:center}
.cd-close:hover{background:rgba(255,255,255,.16);transform:rotate(90deg)}
.cd-pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;position:relative;z-index:1}
.cd-idpill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(212,185,120,.45);color:#E8D5A3;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:1.2px}
.cd-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 11px;border-radius:99px;font-size:10.5px;font-weight:700;letter-spacing:.4px}
.cd-body{padding:0;max-height:72vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#CBD5D1 transparent}
.cd-body::-webkit-scrollbar{width:5px}
.cd-body::-webkit-scrollbar-thumb{background:#CBD5D1;border-radius:99px}
.cd-sec{font-size:10px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;color:#0A3D2C;display:flex;align-items:center;gap:12px;margin:4px 0 14px}
.cd-sec::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,#D4B978,transparent 70%)}
.cd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px 18px;margin-bottom:6px}
.cd-fld .k{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8A9189;margin-bottom:3px}
.cd-fld .v{font-size:13.5px;font-weight:600;color:#13241D}
.cd-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px}
.cd-chip{display:flex;align-items:center;gap:8px;padding:6px 13px 6px 7px;border-radius:99px;border:1px solid #E2E5E1;background:#fff;font-size:12.5px;font-weight:600;color:#13241D}
.cd-chip .av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
.cd-svc{display:inline-flex;align-items:center;padding:4px 11px;background:var(--ltgreen);color:var(--dkgreen);border-radius:99px;font-size:11.5px;font-weight:600;border:1px solid var(--green2)}
.cd-mtab{border:none;background:none;cursor:pointer;padding:11px 18px;font-size:12.5px;font-weight:600;color:#6B7280;border-bottom:2px solid transparent;white-space:nowrap;font-family:'Plus Jakarta Sans',-apple-system,sans-serif;display:flex;align-items:center;gap:5px;transition:.15s}
.cd-mtab:hover:not(.cd-mtab-active){color:#111827;background:#F9FAF8}
.cd-mtab.cd-mtab-active{color:#0A3D2C;border-bottom-color:#D4B978;background:#F8FAF6}
`

// ─── MODAL TABS ─────────────────────────────────────────────────
const MODAL_TABS = [
  { key:'profile',    label:'Profile',            icon:'👤' },
  { key:'compliance', label:'Compliance Tracker', icon:'📋' },
  { key:'documents',  label:'Documents',          icon:'📁' },
]

export default function Clients({ user }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [viewClient, setViewClient] = useState(null)
  const [editClient, setEditClient] = useState(null)
  const [pinResetMsg, setPinResetMsg] = useState(null)
  const [modalTab, setModalTab] = useState('profile')

  async function resetClientPin(clientId, clientName) {
    if (!window.confirm(`Reset WhatsApp PIN for ${clientName}?\n\nThe client will be asked to set a new PIN on their next WhatsApp session.`)) return
    const { error } = await supabase.from('clients').update({ doc_pin: null }).eq('client_id', clientId)
    if (error) { setPinResetMsg({ ok: false, msg: 'Error: ' + error.message }); return }
    setPinResetMsg({ ok: true, msg: `PIN reset for ${clientName}. They will set a new PIN on next WhatsApp login.` })
    setTimeout(() => setPinResetMsg(null), 5000)
    load()
  }
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => { load() }, [])
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setViewClient(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  function openClient(cl) {
    setViewClient(cl)
    setModalTab('profile')
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.client_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile || '').includes(search) ||
    (c.pan || '').toLowerCase().includes(search.toLowerCase())
  )

  const c = viewClient

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Clients</h1>
          <p style={{ fontSize: 14, color: 'var(--gray)' }}>{clients.length} onboarded clients</p>
        </div>
        <button onClick={() => { setEditClient(null); setShowWizard(true) }} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🚀 Start Onboarding</button>
      </div>

      <div className="card" style={{ padding: 16, margin: '20px 0' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="🔍 Search by name, client ID, mobile, or PAN..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading
          ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div>
          : filtered.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No clients found. Click "🚀 Start Onboarding".</div>
            : filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(cl => (
                <div key={cl.id} onClick={() => openClient(cl)}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: '.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
                      {cl.name}
                      {cl.quick_onboarded && <span style={{ fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '1px 7px', borderRadius: 99 }}>Quick</span>}
                      {cl.status === 'Draft' && <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '1px 7px', borderRadius: 99 }}>Draft</span>}
                      {cl.status === 'Draft' && (
                        <button onClick={e => { e.stopPropagation(); setEditClient(cl); setShowWizard(true) }}
                          style={{ fontSize: 10, fontWeight: 700, color: 'var(--dkgreen)', background: 'var(--ltgreen)', border: '1px solid var(--green2)', padding: '1px 8px', borderRadius: 99, cursor: 'pointer' }}>
                          ✏️ Edit Draft
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray)' }}>{[cl.client_type, cl.mobile && '+91 ' + cl.mobile, cl.pan].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span style={{ fontSize: 11, background: 'var(--ltgreen)', color: 'var(--dkgreen)', padding: '3px 10px', borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>{cl.client_id}</span>
                </div>
              ))}
      </div>

      {/* ── PREMIUM CLIENT DETAIL MODAL ── */}
      {c && (
        <div className="cd-overlay" onClick={e => e.target === e.currentTarget && setViewClient(null)}>
          <style>{css}</style>
          <div className="cd-modal">

            {/* Header */}
            <div className="cd-head">
              <div style={{ position:'absolute', top:14, right:52, zIndex:2, display:'flex', gap:8 }}>
                <button onClick={() => { setEditClient(c); setShowWizard(true); setViewClient(null) }}
                  style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(212,185,120,.5)', background:'rgba(255,255,255,.08)', color:'#E8D5A3', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => resetClientPin(c.client_id, c.name)}
                  style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,.4)', background:'rgba(239,68,68,.12)', color:'#FCA5A5', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  🔓 Reset PIN
                </button>
              </div>
              <button className="cd-close" onClick={() => setViewClient(null)}>✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative', zIndex: 1 }}>
                <div className="cd-mono">YA</div>
                <div>
                  <div className="cd-eyebrow">Yes Advizors · Client Record</div>
                  <div className="cd-name">{c.name}</div>
                </div>
              </div>
              <div className="cd-pills">
                <span className="cd-idpill">✦ {c.client_id}</span>
                {c.client_type && <span className="cd-idpill" style={{ letterSpacing: '.4px' }}>{c.client_type}</span>}
                <span className="cd-badge" style={
                  c.status === 'Active' ? { background: 'rgba(16,185,129,.18)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,.3)' }
                  : c.status === 'Draft' ? { background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.15)' }
                  : { background: 'rgba(212,185,120,.15)', color: '#E8D5A3', border: '1px solid rgba(212,185,120,.3)' }
                }>● {c.status || 'Active'}</span>
              </div>

              {/* ── MODAL TAB BAR (inside header) ── */}
              <div style={{ display:'flex', marginTop:16, borderTop:'1px solid rgba(255,255,255,.1)', paddingTop:4, gap:2 }}>
                {MODAL_TABS.map(tab => (
                  <button key={tab.key} className={`cd-mtab${modalTab===tab.key?' cd-mtab-active':''}`}
                    onClick={() => setModalTab(tab.key)}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body — switches by tab */}
            <div className="cd-body">

              {/* ── PROFILE TAB ── */}
              {modalTab === 'profile' && (
                <div style={{ padding:'22px 26px' }}>
                  <div className="cd-sec">Contact Information</div>
                  <div className="cd-grid">
                    <CdFld k="Mobile"       v={c.mobile ? '+91 ' + c.mobile : '—'} />
                    <CdFld k="Email"        v={c.email || '—'} />
                    <CdFld k="Onboarded"    v={fmtDate(c.created_at)} />
                    <CdFld k="Onboarded By" v={c.onboarded_by || '—'} />
                  </div>

                  <div className="cd-sec">Tax Registrations</div>
                  <div className="cd-grid">
                    <CdFld k="PAN"   v={c.pan   || '—'} />
                    <CdFld k="GSTIN" v={c.gstin || '—'} />
                    <CdFld k="TAN"   v={c.tan   || '—'} />
                    {c.udyam_no && <CdFld k="Udyam / MSME No." v={c.udyam_no} />}
                    {c.iec_no   && <CdFld k="IEC No."          v={c.iec_no} />}
                    {c.pf_no    && <CdFld k="PF No."           v={c.pf_no} />}
                    {c.esi_no   && <CdFld k="ESI No."          v={c.esi_no} />}
                  </div>

                  {['Private Limited Company','Public Limited Company','Section 8 Company','LLP'].includes(c.client_type) && (
                    <>
                      <div className="cd-sec">Company Registration</div>
                      <div className="cd-grid">
                        <CdFld k="CIN / LLPIN" v={c.cin || '—'} />
                        <CdFld k="Client Type" v={c.client_type} />
                        <CdFld k="Client Code" v={c.client_id} />
                      </div>
                    </>
                  )}

                  <div className="cd-sec">Registered Address</div>
                  <div style={{ marginBottom: 14 }}>
                    {c.address
                      ? <div style={{ fontSize: 13, color: '#13241D', lineHeight: 1.6, marginBottom: 6 }}>{c.address}</div>
                      : <div style={{ fontSize: 12.5, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 6 }}>No address recorded</div>
                    }
                    {(c.city || c.state || c.pincode) && (
                      <div className="cd-grid">
                        {c.city    && <CdFld k="City"    v={c.city} />}
                        {c.state   && <CdFld k="State"   v={c.state} />}
                        {c.pincode && <CdFld k="Pincode" v={c.pincode} />}
                      </div>
                    )}
                  </div>

                  {c.services && c.services.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div className="cd-sec">Services</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {c.services.map(s => <span key={s} className="cd-svc">{s}</span>)}
                      </div>
                    </div>
                  )}

                  {c.directors && c.directors.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div className="cd-sec">{
                        c.client_type === 'Private Limited Company' || c.client_type === 'Public Limited Company' || c.client_type === 'Section 8 Company' ? 'Directors' :
                        c.client_type === 'LLP' ? 'Designated Partners' :
                        c.client_type === 'Partnership Firm' ? 'Partners' : 'Directors / Partners'
                      } ({c.directors.length})</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
                        {c.directors.map((d, i) => (
                          <div key={i} style={{ border: '1px solid #E2E5E1', borderRadius: 12, padding: '14px 16px', background: '#FAFCFB' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: DIR_PALETTE[i % DIR_PALETTE.length].bg, color: DIR_PALETTE[i % DIR_PALETTE.length].text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                                {initials(d.name)}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#13241D' }}>{d.name || '—'}</div>
                                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{d.role || 'Director'}</div>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
                              <DirFld label="DIN"     value={d.din || '—'} />
                              <DirFld label="PAN"     value={d.pan || '—'} />
                              <DirFld label="Mobile"  value={d.mobile ? '+91 ' + d.mobile : '—'} />
                              <DirFld label="Aadhaar" value={d.aadhaar ? 'XXXX-XXXX-' + String(d.aadhaar).slice(-4) : '—'} />
                              <DirFld label="Email"   value={d.email || '—'} full />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── COMPLIANCE TRACKER TAB ── */}
              {modalTab === 'compliance' && (
                <div style={{ padding:'22px 26px' }}>
                  <ComplianceTracker client={c} />
                </div>
              )}

              {/* ── DOCUMENTS TAB ── */}
              {modalTab === 'documents' && (
                <div style={{ padding:'22px 26px' }}>
                  <DocumentManager client={c} user={user} />
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {pinResetMsg && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background: pinResetMsg.ok ? '#065F46' : '#7F1D1D', color:'#fff', padding:'12px 20px', borderRadius:10, fontSize:13, fontWeight:500, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,.3)', maxWidth:420, textAlign:'center' }}>
          {pinResetMsg.ok ? '✅' : '❌'} {pinResetMsg.msg}
        </div>
      )}
      {showWizard && <OnboardingWizard user={user} editClient={editClient} onClose={() => { setShowWizard(false); setEditClient(null) }} onSaved={() => { setShowWizard(false); setEditClient(null); load() }} />}
    </div>
  )
}

function DirFld({ label, value, full }) {
  return (
    <div style={{ gridColumn: full ? 'span 2' : 'span 1' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#13241D', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

function CdFld({ k, v }) {
  return <div className="cd-fld"><div className="k">{k}</div><div className="v">{v}</div></div>
}
