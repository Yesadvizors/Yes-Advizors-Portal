import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import MarkFiledModal from './MarkFiledModal'

// ─── STATUS CONFIG ──────────────────────────────────────────────
const SC = {
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
  'Not Applicable':           { bg:'#F3F4F6', color:'#9CA3AF', dot:'#D1D5DB' },
  'Closed':                   { bg:'#F3F4F6', color:'#9CA3AF', dot:'#D1D5DB' },
}
const sc = (s) => SC[s] || { bg:'#F3F4F6', color:'#6B7280', dot:'#9CA3AF' }

const SBadge = ({ status }) => {
  const c = sc(status)
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:99, fontSize:10.5, fontWeight:700, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot, flexShrink:0 }} />
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
    <div style={{ fontSize:13, fontWeight:600, color:'#6B7280' }}>No {label} records</div>
    <div style={{ fontSize:11, marginTop:4 }}>Records will appear once added.</div>
  </div>
)
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'
const eff = (r) => r.individual_due_date || r.extended_due_date || r.standard_due_date || r.response_due_date
const FY_LIST = ['2025-26','2024-25','2023-24','2022-23','2021-22','2020-21']

// ─── FILE BUTTON ────────────────────────────────────────────────
const FileBtn = ({ row, onClick }) => {
  if (row.status === 'Filed' || row.status === 'Completed' || row.return_filed) {
    return (
      <span style={{ fontSize:10.5, fontWeight:700, color:'#166534', background:'#DCFCE7', padding:'2px 9px', borderRadius:99, whiteSpace:'nowrap' }}>
        ✓ Filed {row.filing_date ? fmt(row.filing_date) : ''}
      </span>
    )
  }
  return (
    <button onClick={() => onClick(row)} style={{
      fontSize:11, fontWeight:600, padding:'4px 11px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap',
      background:'#0A3D2C', color:'#fff', border:'none'
    }}>
      ✅ Mark Filed
    </button>
  )
}

// ─── TABLE ──────────────────────────────────────────────────────
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
          {rows.map((row,i) => (
            <tr key={i} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFCFB' }}>
              {render(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
const TD = ({ children, bold, red }) => (
  <td style={{ padding:'9px 12px', color:red?'#DC2626':bold?'#111827':'#374151', fontWeight:bold||red?600:400, whiteSpace:'nowrap' }}>
    {children ?? <span style={{ color:'#D1D5DB' }}>—</span>}
  </td>
)

// ─── GST TAB ────────────────────────────────────────────────────
function GSTTab({ clientId, fy, client, user }) {
  const [rows, setRows] = useState([]); const [load, setLoad] = useState(true)
  const [filter, setFilter] = useState('All')
  const [filing, setFiling] = useState(null) // row being filed

  function reload() {
    setLoad(true)
    supabase.from('gst_tracker')
      .select('*,ct_team_members!gst_tracker_assigned_to_fkey(display_name)')
      .eq('client_id',clientId).eq('fy_label',fy)
      .order('period_month').order('return_type')
      .then(({data})=>{setRows(data||[]);setLoad(false)})
  }
  useEffect(()=>{ reload() },[clientId,fy])

  const types = ['All',...new Set((rows||[]).map(r=>r.return_type))]
  const filtered = filter==='All'?rows:rows.filter(r=>r.return_type===filter)
  if(load) return <Spin />
  return (
    <>
      <div style={{display:'flex',gap:6,padding:'0 0 12px',flexWrap:'wrap'}}>
        {types.map(t=><button key={t} onClick={()=>setFilter(t)} style={{padding:'4px 12px',borderRadius:99,border:'1px solid',fontSize:11,fontWeight:600,cursor:'pointer',borderColor:filter===t?'#0A3D2C':'#E5E7EB',background:filter===t?'#0A3D2C':'#fff',color:filter===t?'#fff':'#6B7280'}}>{t}</button>)}
      </div>
      <CTTable
        cols={['Period','Return','Due Date','Reconciled','Payment','Filed','ARN','Status','Action']}
        rows={filtered}
        empty={<Empty label="GST"/>}
        render={r=>(<>
          <TD bold>{r.period}</TD>
          <TD>{r.return_type}</TD>
          <td style={{padding:'9px 12px',whiteSpace:'nowrap',color:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?'#DC2626':'#374151',fontWeight:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?700:400}}>
            {fmt(eff(r))}
          </td>
          <TD><YN v={r.reconciliation_completed}/></TD>
          <TD><YN v={r.payment_done}/></TD>
          <TD>{r.filing_date ? fmt(r.filing_date) : <YN v={false} f="No"/>}</TD>
          <TD>{r.arn}</TD>
          <TD><SBadge status={r.status}/></TD>
          <td style={{padding:'9px 12px'}}><FileBtn row={r} onClick={setFiling}/></td>
        </>)}
      />
      {filing && (
        <MarkFiledModal
          record={filing} trackerType="gst" client={client} user={user}
          onClose={()=>setFiling(null)}
          onSaved={()=>{ setFiling(null); reload() }}
        />
      )}
    </>
  )
}

// ─── INCOME TAX TAB ─────────────────────────────────────────────
function ITTab({ clientId, fy, client, user }) {
  const [rows, setRows] = useState([]); const [load, setLoad] = useState(true)
  const [filing, setFiling] = useState(null)

  function reload() {
    setLoad(true)
    supabase.from('income_tax_tracker')
      .select('*,ct_team_members!income_tax_tracker_assigned_to_fkey(display_name)')
      .eq('client_id',clientId).eq('fy_label',fy)
      .then(({data})=>{setRows(data||[]);setLoad(false)})
  }
  useEffect(()=>{ reload() },[clientId,fy])
  if(load) return <Spin />
  return (
    <>
      <CTTable
        cols={['FY','AY','ITR Form','Due Date','Data Recvd','Computation','Filed','Ack No.','Status','Action']}
        rows={rows} empty={<Empty label="Income Tax"/>}
        render={r=>(<>
          <TD bold>{r.fy_label}</TD><TD>{r.assessment_year}</TD><TD>{r.itr_form}</TD>
          <td style={{padding:'9px 12px',whiteSpace:'nowrap',color:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?'#DC2626':'#374151',fontWeight:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?700:400}}>{fmt(eff(r))}</td>
          <TD><YN v={r.data_received}/></TD><TD><YN v={r.computation_prepared}/></TD>
          <TD>{r.filing_date?fmt(r.filing_date):<YN v={false} f="No"/>}</TD>
          <TD>{r.acknowledgement_number}</TD>
          <TD><SBadge status={r.status}/></TD>
          <td style={{padding:'9px 12px'}}><FileBtn row={r} onClick={setFiling}/></td>
        </>)}
      />
      {filing && <MarkFiledModal record={filing} trackerType="income_tax" client={client} user={user} onClose={()=>setFiling(null)} onSaved={()=>{setFiling(null);reload()}} />}
    </>
  )
}

// ─── TDS TAB ────────────────────────────────────────────────────
function TDSTab({ clientId, fy, client, user }) {
  const [rows, setRows] = useState([]); const [load, setLoad] = useState(true)
  const [filing, setFiling] = useState(null)

  function reload() {
    setLoad(true)
    supabase.from('tds_tracker').select('*,ct_team_members!tds_tracker_assigned_to_fkey(display_name)')
      .eq('client_id',clientId).eq('fy_label',fy).order('quarter').order('form_type')
      .then(({data})=>{setRows(data||[]);setLoad(false)})
  }
  useEffect(()=>{ reload() },[clientId,fy])
  if(load) return <Spin />
  return (
    <>
      <CTTable
        cols={['Quarter','Form','TAN','Due Date','Challan','Prepared','Filed','PRN','Status','Action']}
        rows={rows} empty={<Empty label="TDS"/>}
        render={r=>(<>
          <TD bold>{r.quarter}</TD><TD>{r.form_type}</TD><TD>{r.tan}</TD>
          <td style={{padding:'9px 12px',whiteSpace:'nowrap',color:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?'#DC2626':'#374151',fontWeight:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?700:400}}>{fmt(eff(r))}</td>
          <TD><YN v={r.challan_received}/></TD><TD><YN v={r.return_prepared}/></TD>
          <TD>{r.filing_date?fmt(r.filing_date):<YN v={false} f="No"/>}</TD>
          <TD>{r.token_number}</TD>
          <TD><SBadge status={r.status}/></TD>
          <td style={{padding:'9px 12px'}}><FileBtn row={r} onClick={setFiling}/></td>
        </>)}
      />
      {filing && <MarkFiledModal record={filing} trackerType="tds" client={client} user={user} onClose={()=>setFiling(null)} onSaved={()=>{setFiling(null);reload()}} />}
    </>
  )
}

// ─── ROC TAB ────────────────────────────────────────────────────
function ROCTab({ clientId, fy, client, user }) {
  const [rows, setRows] = useState([]); const [load, setLoad] = useState(true)
  const [filter, setFilter] = useState('All')
  const [filing, setFiling] = useState(null)

  function reload() {
    setLoad(true)
    supabase.from('roc_tracker').select('*,ct_team_members!roc_tracker_assigned_to_fkey(display_name)')
      .eq('client_id',clientId).eq('fy_label',fy).order('filing_type').order('form_name')
      .then(({data})=>{setRows(data||[]);setLoad(false)})
  }
  useEffect(()=>{ reload() },[clientId,fy])
  const filtered = filter==='All'?rows:rows.filter(r=>r.filing_type===filter)
  if(load) return <Spin />
  return (
    <>
      <div style={{display:'flex',gap:6,padding:'0 0 12px',flexWrap:'wrap'}}>
        {['All','Annual','Event Based'].map(t=><button key={t} onClick={()=>setFilter(t)} style={{padding:'4px 12px',borderRadius:99,border:'1px solid',fontSize:11,fontWeight:600,cursor:'pointer',borderColor:filter===t?'#0A3D2C':'#E5E7EB',background:filter===t?'#0A3D2C':'#fff',color:filter===t?'#fff':'#6B7280'}}>{t}</button>)}
      </div>
      <CTTable
        cols={['Form','Type','Due Date','Docs','Prepared','Filed','SRN','Status','Action']}
        rows={filtered} empty={<Empty label="ROC"/>}
        render={r=>(<>
          <TD bold>{r.form_name}</TD>
          <TD><span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:r.filing_type==='Annual'?'#DBEAFE':'#FEF9C3',color:r.filing_type==='Annual'?'#1E40AF':'#854D0E',fontWeight:700}}>{r.filing_type}</span></TD>
          <td style={{padding:'9px 12px',whiteSpace:'nowrap',color:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?'#DC2626':'#374151',fontWeight:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?700:400}}>{fmt(eff(r))}</td>
          <TD><YN v={!r.documents_pending} t="Received" f="Pending"/></TD>
          <TD><YN v={r.form_prepared}/></TD>
          <TD>{r.filing_date?fmt(r.filing_date):<YN v={false} f="No"/>}</TD>
          <TD>{r.srn}</TD>
          <TD><SBadge status={r.status}/></TD>
          <td style={{padding:'9px 12px'}}><FileBtn row={r} onClick={setFiling}/></td>
        </>)}
      />
      {filing && <MarkFiledModal record={filing} trackerType="roc" client={client} user={user} onClose={()=>setFiling(null)} onSaved={()=>{setFiling(null);reload()}} />}
    </>
  )
}

// ─── AUDIT TAB ──────────────────────────────────────────────────
function AuditTab({ clientId, fy, client, user }) {
  const [rows, setRows] = useState([]); const [load, setLoad] = useState(true)
  const [filing, setFiling] = useState(null)
  function reload() {
    setLoad(true)
    supabase.from('audit_tracker').select('*,ct_team_members!audit_tracker_assigned_auditor_fkey(display_name)')
      .eq('client_id',clientId).eq('fy_label',fy).then(({data})=>{setRows(data||[]);setLoad(false)})
  }
  useEffect(()=>{ reload() },[clientId,fy])
  if(load) return <Spin />
  return (
    <>
      <CTTable cols={['Audit Type','Due Date','Books','Working','UDIN','Signed','Filed','Status','Action']} rows={rows} empty={<Empty label="Audit"/>}
        render={r=>(<>
          <TD bold>{r.audit_type}</TD>
          <td style={{padding:'9px 12px',whiteSpace:'nowrap',color:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?'#DC2626':'#374151',fontWeight:eff(r)&&new Date(eff(r))<new Date()&&r.status!=='Filed'?700:400}}>{fmt(eff(r))}</td>
          <TD><YN v={r.books_received}/></TD><TD><YN v={r.audit_working_prepared}/></TD>
          <TD>{r.udin_number||<YN v={false}/>}</TD><TD><YN v={r.audit_report_signed}/></TD>
          <TD>{r.filing_date?fmt(r.filing_date):<YN v={false} f="No"/>}</TD>
          <TD><SBadge status={r.status}/></TD>
          <td style={{padding:'9px 12px'}}><FileBtn row={r} onClick={setFiling}/></td>
        </>)}
      />
      {filing && <MarkFiledModal record={filing} trackerType="audit" client={client} user={user} onClose={()=>setFiling(null)} onSaved={()=>{setFiling(null);reload()}} />}
    </>
  )
}

// ─── ACCOUNTING TAB ─────────────────────────────────────────────
function AccTab({ clientId, fy }) {
  const [rows, setRows] = useState([]); const [load, setLoad] = useState(true)
  useEffect(() => {
    setLoad(true)
    supabase.from('accounting_tracker').select('*,ct_team_members!accounting_tracker_assigned_to_fkey(display_name)')
      .eq('client_id',clientId).eq('fy_label',fy).then(({data})=>{setRows(data||[]);setLoad(false)})
  },[clientId,fy])
  if(load) return <Spin />
  return <CTTable cols={['Month','Sales','Purchase','Bank','GST Recon','TDS Recon','BRS','Closing','MIS','Status']} rows={rows} empty={<Empty label="Accounting"/>}
    render={r=>(<><TD bold>{r.period_label||r.month}</TD><TD><YN v={r.sales_booked}/></TD><TD><YN v={r.purchase_booked}/></TD><TD><YN v={r.bank_entries_completed}/></TD><TD><YN v={r.gst_reconciliation_done}/></TD><TD><YN v={r.tds_reconciliation_done}/></TD><TD><YN v={r.bank_reconciliation_done}/></TD><TD><YN v={r.month_closing_done}/></TD><TD><YN v={r.mis_sent_to_client}/></TD><TD><SBadge status={r.status}/></TD></>)}
  />
}

// ─── NOTICES TAB ────────────────────────────────────────────────
function NoticeTab({ clientId }) {
  const [rows, setRows] = useState([]); const [load, setLoad] = useState(true)
  useEffect(() => {
    setLoad(true)
    supabase.from('notice_tracker').select('*,ct_team_members!notice_tracker_assigned_to_fkey(display_name)')
      .eq('client_id',clientId).order('created_at',{ascending:false}).then(({data})=>{setRows(data||[]);setLoad(false)})
  },[clientId])
  if(load) return <Spin />
  return <CTTable cols={['Authority','Type','Section','Notice Date','Response Due','Linked To','Reply Filed','Demand','Status']} rows={rows} empty={<Empty label="Notices"/>}
    render={r=>(<><TD bold>{r.authority}</TD><TD>{r.notice_type}</TD><TD>{r.section}</TD><TD>{fmt(r.notice_date)}</TD>
      <td style={{padding:'9px 12px',whiteSpace:'nowrap',color:eff(r)&&new Date(eff(r))<new Date()?'#DC2626':'#374151',fontWeight:eff(r)&&new Date(eff(r))<new Date()?700:400}}>{fmt(eff(r))}</td>
      <TD>{r.linked_compliance_period}</TD><TD><YN v={r.reply_filed}/></TD>
      <TD>{r.demand_raised?'₹'+Number(r.demand_raised).toLocaleString('en-IN'):null}</TD>
      <TD><SBadge status={r.status}/></TD></>)}
  />
}

// ─── CLIENT COMPLIANCE PANEL ────────────────────────────────────
function ClientPanel({ client, user, onClose }) {
  const [fy, setFy] = useState('2024-25')
  const [activeTab, setActiveTab] = useState('gst')
  const [summary, setSummary] = useState(null)
  const [loadSum, setLoadSum] = useState(true)

  const tabs = [
    { key:'gst',     label:'GST',        icon:'🏪', show:!!client.gstin },
    { key:'it',      label:'Income Tax', icon:'🧾', show:true },
    { key:'tds',     label:'TDS',        icon:'💰', show:!!client.tan },
    { key:'roc',     label:'ROC/MCA',    icon:'🏢', show:['Private Limited Company','Limited Company','Section 8 Company'].includes(client.client_type) },
    { key:'audit',   label:'Audit',      icon:'🔍', show:true },
    { key:'acc',     label:'Accounting', icon:'📒', show:true },
    { key:'notices', label:'Notices',    icon:'📨', show:true },
  ].filter(t=>t.show)

  function reloadSummary() {
    setLoadSum(true)
    supabase.from('v_client_compliance_summary').select('*').eq('client_id',client.id).eq('fy_label',fy).single()
      .then(({data})=>{setSummary(data);setLoadSum(false)})
  }
  useEffect(()=>{ reloadSummary() },[client.id,fy])

  const cards = [
    {label:'Total',       val:summary?.total_compliances,        color:'#6366F1'},
    {label:'Completed',   val:summary?.completed,                color:'#16A34A'},
    {label:'Overdue',     val:summary?.overdue,                  color:'#DC2626'},
    {label:'Due Soon',    val:summary?.due_soon,                 color:'#D97706'},
    {label:'Pending',     val:summary?.pending,                  color:'#2563EB'},
    {label:'Wait Client', val:summary?.waiting_client,           color:'#EA580C'},
    {label:'Approval',    val:summary?.partner_approval_pending, color:'#7C3AED'},
    {label:'Filing',      val:summary?.filing_pending,           color:'#0369A1'},
  ]

  const activeLabel = tabs.find(t=>t.key===activeTab)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:3000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'16px', overflowY:'auto' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#FDFDFB', borderRadius:18, width:'100%', maxWidth:1100, marginTop:16, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.3)', fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif" }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(132deg,#06281D 0%,#0A3D2C 52%,#0D7A53 130%)', padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:3, textTransform:'uppercase', color:'#CBB877', fontWeight:700, marginBottom:4 }}>Compliance Tracker</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#fff' }}>{client.name}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:3, display:'flex', gap:12 }}>
              <span>{client.client_type}</span>
              {client.gstin && <span style={{color:'#6EE7B7'}}>GST ✓</span>}
              {client.tan   && <span style={{color:'#93C5FD'}}>TDS ✓</span>}
              {client.cin   && <span style={{color:'#C4B5FD'}}>ROC ✓</span>}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:600 }}>FY</span>
            <select value={fy} onChange={e=>setFy(e.target.value)} style={{ border:'1px solid rgba(212,185,120,.5)', borderRadius:8, padding:'5px 10px', fontSize:12, fontWeight:700, color:'#E8D5A3', background:'rgba(255,255,255,.08)', cursor:'pointer', outline:'none' }}>
              {FY_LIST.map(f=><option key={f} value={f} style={{color:'#111',background:'#fff'}}>{f}</option>)}
            </select>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.8)', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display:'flex', gap:8, padding:'14px 24px', flexWrap:'wrap', background:'#F8FAF9', borderBottom:'1px solid #E5E7EB' }}>
          {cards.map((c,i)=>(
            <div key={i} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'center', gap:8, minWidth:85 }}>
              <div style={{ width:4, height:24, borderRadius:2, background:c.color, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:c.color, lineHeight:1 }}>{loadSum?'…':(c.val??0)}</div>
                <div style={{ fontSize:10, color:'#6B7280', marginTop:1, fontWeight:600 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div style={{ display:'flex', borderBottom:'2px solid #E5E7EB', padding:'0 24px', overflowX:'auto', background:'#fff' }}>
          {tabs.map(tab=>(
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{
              border:'none', background:'none', cursor:'pointer', padding:'10px 14px',
              fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5,
              color:activeTab===tab.key?'#0A3D2C':'#6B7280',
              borderBottom:activeTab===tab.key?'2px solid #D4B978':'2px solid transparent',
              marginBottom:-2, whiteSpace:'nowrap'
            }}>{tab.icon} {tab.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding:'16px 24px', background:'#fff', maxHeight:'55vh', overflowY:'auto' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#0A3D2C', marginBottom:12 }}>
            {activeLabel?.icon} {activeLabel?.label} — FY {fy}
          </div>
          {activeTab==='gst'     && <GSTTab    clientId={client.id} fy={fy} client={client} user={user} />}
          {activeTab==='it'      && <ITTab     clientId={client.id} fy={fy} client={client} user={user} />}
          {activeTab==='tds'     && <TDSTab    clientId={client.id} fy={fy} client={client} user={user} />}
          {activeTab==='roc'     && <ROCTab    clientId={client.id} fy={fy} client={client} user={user} />}
          {activeTab==='audit'   && <AuditTab  clientId={client.id} fy={fy} client={client} user={user} />}
          {activeTab==='acc'     && <AccTab    clientId={client.id} fy={fy} />}
          {activeTab==='notices' && <NoticeTab clientId={client.id} />}
        </div>
      </div>
    </div>
  )
}

// ─── FIRM DASHBOARD ─────────────────────────────────────────────
function FirmDashboard() {
  const [data, setData] = useState([]); const [ageing, setAgeing] = useState([]); const [team, setTeam] = useState([]); const [load, setLoad] = useState(true)
  useEffect(() => {
    setLoad(true)
    Promise.all([
      supabase.from('v_firm_dashboard').select('*'),
      supabase.from('v_overdue_ageing').select('ageing_bucket'),
      supabase.from('v_team_workload').select('*'),
    ]).then(([{data:d},{data:a},{data:t}]) => {
      setData(d||[])
      const bmap = {}
      ;(a||[]).forEach(r => { bmap[r.ageing_bucket] = (bmap[r.ageing_bucket]||0)+1 })
      setAgeing(Object.entries(bmap).map(([k,v])=>({bucket:k,count:v})))
      setTeam(t||[])
      setLoad(false)
    })
  },[])
  if(load) return <Spin/>
  const totals = data.reduce((acc,r)=>({
    total:(acc.total||0)+(Number(r.total)||0),
    completed:(acc.completed||0)+(Number(r.completed)||0),
    overdue:(acc.overdue||0)+(Number(r.overdue)||0),
    pending:(acc.pending||0)+(Number(r.pending)||0),
    due7:(acc.due7||0)+(Number(r.due_in_7_days)||0),
    waitClient:(acc.waitClient||0)+(Number(r.waiting_client)||0),
    approval:(acc.approval||0)+(Number(r.partner_approval_pending)||0),
  }),{})
  const topCards = [
    {label:'Total',         val:totals.total,      color:'#6366F1', icon:'📋'},
    {label:'Completed',     val:totals.completed,  color:'#16A34A', icon:'✅'},
    {label:'Overdue',       val:totals.overdue,    color:'#DC2626', icon:'🔴'},
    {label:'Due in 7 Days', val:totals.due7,       color:'#D97706', icon:'⚡'},
    {label:'Pending',       val:totals.pending,    color:'#2563EB', icon:'⏳'},
    {label:'Wait Client',   val:totals.waitClient, color:'#EA580C', icon:'🕐'},
    {label:'Approval',      val:totals.approval,   color:'#7C3AED', icon:'✍️'},
  ]
  const catIcons = { 'Income Tax':'🧾','GST':'🏪','TDS':'💰','ROC':'🏢','LLP':'🤝','Audit':'🔍','Accounting':'📒','Payroll':'👥','Trust/NGO':'🏛️','Notice':'📨' }
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:24 }}>
        {topCards.map((c,i)=>(
          <div key={i} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{c.icon}</div>
            <div style={{ fontSize:24, fontWeight:700, color:c.color }}>{c.val??0}</div>
            <div style={{ fontSize:11, color:'#6B7280', fontWeight:600, marginTop:2 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'16px 20px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#0A3D2C', marginBottom:14, letterSpacing:'.5px', textTransform:'uppercase' }}>Category Breakdown</div>
          {data.length===0?<Empty label="data"/>:data.map((row,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<data.length-1?'1px solid #F3F4F6':'' }}>
              <span style={{ fontSize:16 }}>{catIcons[row.category]||'📋'}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#111827' }}>{row.category}</span>
              <div style={{ display:'flex', gap:6 }}>
                {Number(row.overdue)>0&&<span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#FEE2E2', color:'#991B1B' }}>🔴 {row.overdue}</span>}
                {Number(row.pending)>0&&<span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#DBEAFE', color:'#1E40AF' }}>⏳ {row.pending}</span>}
                {Number(row.completed)>0&&<span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#DCFCE7', color:'#166534' }}>✅ {row.completed}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'16px 20px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#0A3D2C', marginBottom:14, letterSpacing:'.5px', textTransform:'uppercase' }}>Team Workload</div>
          {team.length===0?<Empty label="team data"/>:team.map((m,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<team.length-1?'1px solid #F3F4F6':'' }}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:'#E0F2FE', color:'#0369A1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                {(m.full_name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
              </div>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#111827' }}>{m.full_name}</span>
              <div style={{ display:'flex', gap:6 }}>
                {Number(m.overdue_tasks)>0&&<span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#FEE2E2', color:'#991B1B' }}>🔴 {m.overdue_tasks}</span>}
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#F3F4F6', color:'#374151' }}>Active: {m.active_tasks||0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {ageing.length>0&&(
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'16px 20px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#0A3D2C', marginBottom:14, letterSpacing:'.5px', textTransform:'uppercase' }}>Overdue Ageing</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[{b:'0-7 Days',c:'#FEE2E2',t:'#991B1B'},{b:'8-15 Days',c:'#FFEDD5',t:'#9A3412'},{b:'16-30 Days',c:'#FEF3C7',t:'#92400E'},{b:'More than 30 Days',c:'#F3E8FF',t:'#6B21A8'}].map(({b,c,t})=>{
              const found = ageing.find(a=>a.bucket===b)
              return (
                <div key={b} style={{ background:c, borderRadius:10, padding:'12px 18px', minWidth:120, textAlign:'center' }}>
                  <div style={{ fontSize:24, fontWeight:700, color:t }}>{found?.count||0}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:t, marginTop:2 }}>{b}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CLIENT LIST ────────────────────────────────────────────────
function ClientComplianceList({ onSelect }) {
  const [clients, setClients] = useState([]); const [search, setSearch] = useState(''); const [load, setLoad] = useState(true)
  useEffect(() => {
    setLoad(true)
    supabase.from('clients').select('id,client_id,name,client_type,gstin,tan,cin,pf_no,esi_no,status')
      .eq('status','Active').neq('is_draft',true).order('name')
      .then(({data})=>{setClients(data||[]);setLoad(false)})
  },[])
  const filtered = clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||(c.client_id||'').toLowerCase().includes(search.toLowerCase()))
  return (
    <div>
      <div style={{ marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search client..."
          style={{ width:'100%', padding:'9px 14px', border:'1px solid var(--border)', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} />
      </div>
      <div className="card" style={{ overflow:'hidden' }}>
        {load?<div style={{padding:32,textAlign:'center',color:'var(--gray2)'}}>Loading clients...</div>
          :filtered.length===0?<div style={{padding:32,textAlign:'center',color:'var(--gray2)'}}>No active clients found.</div>
          :filtered.map(cl=>(
            <div key={cl.id} onClick={()=>onSelect(cl)}
              style={{ padding:'13px 18px', borderBottom:'1px solid var(--border2)', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', transition:'.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#F9FAF8'}
              onMouseLeave={e=>e.currentTarget.style.background=''}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{cl.name}</div>
                <div style={{ fontSize:11, color:'var(--gray)', marginTop:2, display:'flex', gap:8 }}>
                  <span>{cl.client_type}</span>
                  {cl.gstin&&<span style={{color:'#059669',fontWeight:600}}>GST ✓</span>}
                  {cl.tan&&<span style={{color:'#2563EB',fontWeight:600}}>TDS ✓</span>}
                  {cl.cin&&<span style={{color:'#7C3AED',fontWeight:600}}>ROC ✓</span>}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, background:'var(--ltgreen)', color:'var(--dkgreen)', padding:'3px 10px', borderRadius:99, fontWeight:600 }}>{cl.client_id}</span>
                <span style={{ fontSize:18, color:'#9CA3AF' }}>›</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

// ─── MAIN COMPLIANCE MODULE ─────────────────────────────────────
export default function Compliance({ user }) {
  const [mainTab, setMainTab] = useState('dashboard')
  const [selectedClient, setSelectedClient] = useState(null)
  const mainTabs = [
    { id:'dashboard', label:'Firm Dashboard', icon:'📊' },
    { id:'clients',   label:'Client-wise',    icon:'👥' },
  ]
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700 }}>Compliance Tracker</h1>
          <p style={{ fontSize:14, color:'var(--gray)' }}>GST · Income Tax · TDS · ROC · Audit · Accounting · Notices</p>
        </div>
      </div>
      <div style={{ display:'flex', gap:4, background:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {mainTabs.map(t=>(
          <button key={t.id} onClick={()=>setMainTab(t.id)} style={{
            padding:'8px 18px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background:mainTab===t.id?'var(--dkgreen)':'transparent',
            color:mainTab===t.id?'#fff':'var(--gray)', transition:'.15s'
          }}>{t.icon} {t.label}</button>
        ))}
      </div>
      {mainTab==='dashboard' && <FirmDashboard/>}
      {mainTab==='clients'   && <ClientComplianceList onSelect={cl=>setSelectedClient(cl)} />}
      {selectedClient && <ClientPanel client={selectedClient} user={user} onClose={()=>setSelectedClient(null)} />}
    </div>
  )
}
