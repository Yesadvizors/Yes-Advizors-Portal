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
  if (row.status === 'Not Applicable') {
    return (
      <span style={{ fontSize:10, color:'#D1D5DB', display:'flex', alignItems:'center', gap:4 }}>
        🔒 <span>N/A</span>
      </span>
    )
  }
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
            <tr key={i} style={{
              borderBottom:'1px solid #F3F4F6',
              background: row.status==='Not Applicable' ? '#F9FAFB' : i%2===0?'#fff':'#FAFCFB',
              opacity: row.status==='Not Applicable' ? 0.45 : 1
            }}>
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

// ─── GST SHARED STYLES ──────────────────────────────────────────
const GST_CSS = `
.gst-card{border:0.5px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:14px}
.gst-card-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--ltgray);border-bottom:0.5px solid var(--border)}
.gst-card-name{font-size:12px;font-weight:700;color:var(--navy2)}
.gst-card-meta{font-size:10px;color:var(--gray2);margin-top:1px}
.gst-card-stat{display:flex;gap:8px;align-items:center}
.gst-grid-head{display:grid;grid-template-columns:90px 1fr 1fr;border-bottom:0.5px solid var(--border)}
.gst-gh{padding:7px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--gray)}
.gst-gh-blue{background:#EFF6FF;color:#1D4ED8;border-left:0.5px solid #BFDBFE;border-bottom:1.5px solid #93C5FD}
.gst-gh-green{background:#F0FDF4;color:#166534;border-left:0.5px solid #BBF7D0;border-bottom:1.5px solid #86EFAC}
.gst-row{display:grid;grid-template-columns:90px 1fr 1fr;border-bottom:0.5px solid #F5F5F5}
.gst-row:last-child{border-bottom:none}
.gst-row:hover{background:var(--ltgray)}
.gst-period{padding:10px 12px;font-size:11px;font-weight:500;color:var(--gray);background:var(--ltgray);display:flex;align-items:center;border-right:0.5px solid var(--border2)}
.gst-cell{padding:8px 12px;border-left:0.5px solid #F0F0F0;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px}
.gst-cell-pending{background:#FFFCF5}
.gst-cell-filed{background:#F8FFF9}
.gst-cell-empty{background:#FAFAFA}
.gst-status{display:flex;flex-direction:column;gap:1px}
.gst-badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:3px}
.gst-b-pending{background:#FEF9C3;color:#854D0E}
.gst-b-filed{background:#DCFCE7;color:#166534}
.gst-b-late{background:#FEE2E2;color:#991B1B}
.gst-b-ns{background:#F3F4F6;color:#6B7280}
.gst-date{font-size:10px;color:var(--gray2);margin-top:2px}
.gst-date-late{font-size:10px;color:#DC2626;font-weight:600;margin-top:2px}
.gst-arn{font-size:10px;font-family:monospace;color:#059669;margin-top:2px}
.gst-btn{font-size:10px;font-weight:600;padding:4px 10px;border-radius:5px;border:1px solid #0A3D2C;color:#0A3D2C;background:#fff;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:.15s}
.gst-btn:hover{background:#0A3D2C;color:#fff}
.gst-annual{display:flex;align-items:center;gap:10px;padding:9px 12px;border-top:0.5px solid var(--border2);background:#FFFBEB}
.gst-annual-label{font-size:10px;font-weight:700;color:#92400E;background:#FEF3C7;padding:2px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:.4px}
`

// ── Shared cell renderer ─────────────────────────────────────────
function GSTCell({ row, label, colClass, onFile }) {
  if (!row) return <div className={`gst-cell gst-cell-empty ${colClass}`}><span style={{fontSize:11,color:'#E5E7EB'}}>—</span></div>
  // Locked: before GST registration date
  if (row.status === 'Not Applicable') return (
    <div className={`gst-cell ${colClass}`} style={{background:'#F9FAFB',borderLeft:'1px solid #F0F0F0'}}>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <span style={{fontSize:14,opacity:.3}}>🔒</span>
        <div>
          <div style={{fontSize:11,fontWeight:600,color:'#D1D5DB'}}>Not Applicable</div>
          <div style={{fontSize:10,color:'#E5E7EB'}}>Before registration date</div>
        </div>
      </div>
    </div>
  )
  const today  = new Date().toISOString().split('T')[0]
  const due    = row.individual_due_date || row.extended_due_date || row.standard_due_date
  const filed  = row.status === 'Filed' || row.return_filed
  const over   = due && due < today && !filed
  const soon   = due && due >= today && due <= new Date(Date.now()+7*864e5).toISOString().split('T')[0] && !filed
  const dueStr = due ? new Date(due).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : ''

  if (filed) return (
    <div className={`gst-cell gst-cell-filed ${colClass}`}>
      <div className="gst-status">
        <span className="gst-badge gst-b-filed">Filed</span>
        {row.arn && <span className="gst-arn">{row.arn}</span>}
        {row.filing_date && <span className="gst-date">{new Date(row.filing_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</span>}
      </div>
    </div>
  )

  return (
    <div className={`gst-cell gst-cell-pending ${colClass}`} style={{background: over?'#FFF5F5':'#FFFCF5'}}>
      <div className="gst-status">
        <span className={`gst-badge ${over?'gst-b-late':'gst-b-pending'}`}>
          {over ? 'Overdue' : soon ? 'Due Soon' : row.status === 'Data Pending' ? 'Data Pending' : row.status}
        </span>
        {dueStr && <span className={over?'gst-date-late':'gst-date'}>
          {dueStr}{over && ' · LATE'}
          {soon && <span style={{marginLeft:4,fontSize:9,fontWeight:700,color:'#92400E',background:'#FEF3C7',padding:'0 3px',borderRadius:2}}>SOON</span>}
        </span>}
        {row.late_fee > 0 && <span style={{fontSize:9,color:'#DC2626'}}>Late fee: ₹{row.late_fee.toLocaleString('en-IN')}</span>}
      </div>
      <button className="gst-btn" onClick={() => onFile(row, label)}>Mark Filed</button>
    </div>
  )
}

// ── Client card ─────────────────────────────────────────────────
function GSTClientCard({ clientData, client, onFile }) {
  const MONTH_ORDER = ['April','May','June','July','August','September','October','November','December','January','February','March']
  const rows = Object.values(clientData).sort((a,b) => {
    if (!a.month && !b.month) return 0
    if (!a.month) return 1
    if (!b.month) return -1
    return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
  })
  const monthly = rows.filter(r => r.month)
  const annual  = rows.filter(r => !r.month)

  const totalPending = monthly.filter(r => (r.gstr1 && !r.gstr1?.return_filed) || (r.gstr3b && !r.gstr3b?.return_filed)).length
  const totalFiled   = monthly.filter(r => r.gstr1?.return_filed && r.gstr3b?.return_filed).length

  return (
    <div className="gst-card">
      {/* Card header */}
      <div className="gst-card-head">
        <div>
          <div className="gst-card-name">{client?.name || '—'}</div>
          <div className="gst-card-meta">
            {client?.client_id} &nbsp;·&nbsp; GSTIN: {client?.gstin || '—'}
          </div>
        </div>
        <div className="gst-card-stat">
          {totalFiled > 0 && <span style={{fontSize:10,fontWeight:600,color:'#166534',background:'#DCFCE7',padding:'2px 8px',borderRadius:99}}>{totalFiled} filed</span>}
          {totalPending > 0 && <span style={{fontSize:10,fontWeight:600,color:'#854D0E',background:'#FEF9C3',padding:'2px 8px',borderRadius:99}}>{totalPending} pending</span>}
        </div>
      </div>
      {/* Column headers */}
      <div className="gst-grid-head">
        <div className="gst-gh">Period</div>
        <div className="gst-gh gst-gh-blue">GSTR-1 &nbsp;<span style={{fontSize:9,fontWeight:400,opacity:.7}}>Due 11th</span></div>
        <div className="gst-gh gst-gh-green">GSTR-3B &nbsp;<span style={{fontSize:9,fontWeight:400,opacity:.7}}>Due 20th</span></div>
      </div>
      {/* Monthly rows */}
      {monthly.map(g => (
        <div key={g.period} className="gst-row">
          <div className="gst-period">{(()=>{const p=g.period.split(' ');const mo={January:'Jan',February:'Feb',March:'Mar',April:'Apr',May:'May',June:'Jun',July:'Jul',August:'Aug',September:'Sep',October:'Oct',November:'Nov',December:'Dec'};return (mo[p[0]]||p[0])+(p[1]?'-'+p[1].slice(2):'')})()}</div>
          <GSTCell row={g.gstr1}  label="GSTR-1"  colClass="" onFile={onFile} />
          <GSTCell row={g.gstr3b} label="GSTR-3B" colClass="" onFile={onFile} />
        </div>
      ))}
      {/* Annual GSTR-9 */}
      {annual.map(g => g.gstr9 && (
        <div key="annual" className="gst-annual">
          <span className="gst-annual-label">GSTR-9 Annual</span>
          <span style={{fontSize:10,fontWeight:600,color: g.gstr9.return_filed?'#166534':'#92400E'}}>
            {g.gstr9.return_filed ? 'Filed' : g.gstr9.status}
          </span>
          {g.gstr9.standard_due_date && <span style={{fontSize:10,color:'var(--gray2)'}}>Due {new Date(g.gstr9.standard_due_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>}
          {g.gstr9.arn && <span style={{fontSize:10,fontFamily:'monospace',color:'#059669'}}>{g.gstr9.arn}</span>}
          {!g.gstr9.return_filed && <button className="gst-btn" style={{marginLeft:'auto'}} onClick={() => onFile(g.gstr9,'GSTR-9')}>Mark Filed</button>}
        </div>
      ))}
    </div>
  )
}

// ─── GST ACTIVITY TABLE (Activity-wise tab) ──────────────────────
function GSTActivityTable({ rows, clients, user, onFiled }) {
  const [filing, setFiling] = useState(null)

  const byClient = {}
  rows.forEach(r => {
    if (!byClient[r.client_id]) byClient[r.client_id] = {}
    const key = r.period
    if (!byClient[r.client_id][key]) byClient[r.client_id][key] = { period: r.period, month: r.period_month }
    if (r.return_type === 'GSTR-1')  byClient[r.client_id][key].gstr1  = r
    if (r.return_type === 'GSTR-3B') byClient[r.client_id][key].gstr3b = r
    if (r.return_type === 'GSTR-9')  byClient[r.client_id][key].gstr9  = r
  })

  const clientIds = Object.keys(byClient).sort((a,b) =>
    (clients[a]?.name||'').localeCompare(clients[b]?.name||'')
  )

  function handleFile(row, type) { setFiling({ row, type }) }

  return (
    <>
      <style>{GST_CSS}</style>
      {clientIds.map(cid => (
        <GSTClientCard
          key={cid}
          clientData={byClient[cid]}
          client={clients[cid]}
          onFile={handleFile}
        />
      ))}
      {filing && (
        <MarkFiledModal
          record={filing.row} trackerType="gst"
          client={clients[filing.row?.client_id]} user={user}
          onClose={() => setFiling(null)}
          onSaved={() => { setFiling(null); onFiled() }}
        />
      )}
    </>
  )
}

// ─── GST TAB (Client panel — single client) ──────────────────────
function GSTTab({ clientId, fy, client, user }) {
  const [rows, setRows]   = useState([])
  const [load, setLoad]   = useState(true)
  const [filing, setFiling] = useState(null)

  function reload() {
    setLoad(true)
    supabase.from('gst_tracker')
      .select('*')
      .eq('client_id', clientId)
      .eq('fy_label', fy)
      .order('period_month').order('return_type')
      .then(({ data }) => { setRows(data || []); setLoad(false) })
  }
  useEffect(() => { reload() }, [clientId, fy])

  if (load) return <Spin />

  const MONTH_ORDER = ['April','May','June','July','August','September','October','November','December','January','February','March']
  const grouped = {}
  rows.forEach(r => {
    if (!grouped[r.period]) grouped[r.period] = { period: r.period, month: r.period_month }
    if (r.return_type === 'GSTR-1')  grouped[r.period].gstr1  = r
    if (r.return_type === 'GSTR-3B') grouped[r.period].gstr3b = r
    if (r.return_type === 'GSTR-9')  grouped[r.period].gstr9  = r
  })

  function handleFile(row, type) { setFiling({ row, type }) }

  const clientData = grouped

  return (
    <>
      <style>{GST_CSS}</style>
      <GSTClientCard clientData={clientData} client={client} onFile={handleFile} />
      {filing && (
        <MarkFiledModal
          record={filing.row} trackerType="gst"
          client={client} user={user}
          onClose={() => setFiling(null)}
          onSaved={() => { setFiling(null); reload() }}
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
// FINANCIALS TAB
function FinancialsTab({ clientId, fy, client, user }) {
  const [rows, setRows] = useState([])
  const [fin, setFin] = useState(null)
  const [load, setLoad] = useState(true)
  const [uploadRow, setUploadRow] = useState(null)

  function reload() {
    setLoad(true)
    Promise.all([
      supabase.from('financials_tracker').select('*').eq('client_id', clientId).eq('fy_label', fy).order('doc_type'),
      supabase.from('client_financials').select('*').eq('client_id', clientId).eq('fy_label', fy).maybeSingle()
    ]).then(([trk, cf]) => {
      setRows(trk.data || [])
      setFin(cf.data || null)
      setLoad(false)
    })
  }
  useEffect(() => { reload() }, [clientId, fy])

  if (load) return <Spin />

  const money = v => v == null ? '—' : '₹' + Number(v).toLocaleString('en-IN')

  return (
    <>
      {fin && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
          {[
            { label:'Turnover', val:fin.turnover, c:'#0369A1' },
            { label:'Net Profit (PAT)', val:fin.pat, c:'#16A34A' },
            { label:'Net Worth', val:fin.net_worth, c:'#7C3AED' },
            { label:'Total Assets', val:fin.total_assets, c:'#D97706' },
            { label:'Taxable Income', val:fin.taxable_income, c:'#DC2626' },
            { label:'Tax Paid', val:fin.tax_paid, c:'#2563EB' },
          ].map((x,i)=>(
            <div key={i} style={{ background:'#F8FAF9', border:'1px solid #E5E7EB', borderRadius:10, padding:'10px 14px' }}>
              <div style={{ fontSize:15, fontWeight:700, color:x.c }}>{money(x.val)}</div>
              <div style={{ fontSize:10, color:'#6B7280', marginTop:2, fontWeight:600 }}>{x.label}</div>
            </div>
          ))}
        </div>
      )}

      {fin && fin.overall_confidence && (
        <div style={{ fontSize:11, color:'#6B7280', marginBottom:12 }}>
          Extracted via <strong>{fin.extraction_engine || 'manual'}</strong> · Confidence: <strong style={{ color: fin.overall_confidence==='High'?'#16A34A':fin.overall_confidence==='Medium'?'#D97706':'#DC2626' }}>{fin.overall_confidence}</strong>
          {fin.reviewed && ' · ✓ Reviewed'}
        </div>
      )}

      <CTTable cols={['Document','Due Date','Status','Uploaded','Action']} rows={rows}
        render={r=>(<>
          <TD bold>{r.doc_type}</TD>
          <td style={{padding:'9px 12px',whiteSpace:'nowrap',fontSize:12,color:'#6B7280'}}>{r.due_date?fmt(r.due_date):'—'}</td>
          <TD><SBadge status={r.status==='Not Uploaded'?'Not Started':r.status==='Reviewed'?'Filed':r.status==='Extracted'?'In Progress':'Data Pending'}/></TD>
          <td style={{padding:'9px 12px',fontSize:12,color:'#6B7280'}}>{r.filing_date?fmt(r.filing_date):'—'}</td>
          <td style={{padding:'9px 12px'}}>
            <button onClick={()=>setUploadRow(r)} style={{
              fontSize:11, fontWeight:600, padding:'5px 12px', borderRadius:7,
              border:'1px solid '+(r.document_id?'#16A34A':'#D4B978'),
              background:r.document_id?'#F0FDF4':'#FEFCE8',
              color:r.document_id?'#166534':'#92722A', cursor:'pointer', whiteSpace:'nowrap'
            }}>{r.document_id?'✓ View / Replace':'⬆ Upload'}</button>
          </td>
        </>)}
      />

      {uploadRow && (
        <FinancialUploadModal
          row={uploadRow} client={client} fy={fy} user={user}
          onClose={()=>setUploadRow(null)}
          onDone={()=>{ setUploadRow(null); reload() }}
        />
      )}
    </>
  )
}

// FINANCIAL UPLOAD MODAL
// FINANCIAL UPLOAD MODAL — with CA detail fields
// FINANCIAL UPLOAD MODAL — minimal manual entry (OCR handles the rest)
function FinancialUploadModal({ row, client, fy, user, onClose, onDone }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const [udin, setUdin]                 = useState(row.udin_number || '')
  const [udinDate, setUdinDate]         = useState(row.udin_date || '')
  const [taApplicable, setTaApplicable] = useState(row.tax_audit_applicable ?? null)
  const [remarks, setRemarks]           = useState(row.remarks || '')

  const today = new Date().toISOString().split('T')[0]
  const dt = row.doc_type
  const showUdin = ['Tax Audit','Audit Report','Balance Sheet','Profit & Loss'].includes(dt)
  const showTaApplicable = dt === 'Tax Audit'

  useEffect(() => {
    function onKey(e){ if(e.key==='Escape'){ e.stopImmediatePropagation(); onClose() } }
    window.addEventListener('keydown', onKey, { capture:true })
    return () => window.removeEventListener('keydown', onKey, { capture:true })
  }, [])

  async function handleSave() {
    setErr('')
    setUploading(true)
    let docId = row.document_id

    if (file) {
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) { setErr('Only PDF or image allowed'); setUploading(false); return }
      if (file.size > 15*1024*1024) { setErr('File must be under 15 MB'); setUploading(false); return }
      const safeName = (file.name||'file').replace(/[^\w.\-]+/g,'_')
      const path = client.client_id + '/financials/' + fy + '_' + dt.replace(/[^\w]+/g,'_') + '_' + Date.now() + '_' + safeName
      const { error: upErr } = await supabase.storage.from('secure-docs').upload(path, file, { contentType: file.type })
      if (upErr) { setErr('Upload failed: '+upErr.message); setUploading(false); return }
      const { data: docData, error: docErr } = await supabase.from('documents').insert({
        client_id: client.client_id, client_name: client.name,
        doc_type: dt, doc_name: file.name, file_path: path,
        file_size: file.size, mime_type: file.type, uploaded_by: user?.name||'System',
        scope: 'compliance', compliance_type: 'financials',
        compliance_ref_id: row.id, compliance_period: dt + ' — ' + fy, fy_label: fy
      }).select().single()
      if (docErr) { await supabase.storage.from('secure-docs').remove([path]); setErr('Could not save doc: '+docErr.message); setUploading(false); return }
      docId = docData.id
    }

    const upd = {
      udin_number: udin || null,
      udin_date: udinDate || null,
      tax_audit_applicable: showTaApplicable ? taApplicable : null,
      remarks: remarks || null,
      updated_at: new Date().toISOString()
    }
    if (docId) {
      upd.document_id = docId
      upd.status = 'Uploaded'
      if (!row.filing_date) upd.filing_date = today
      upd.uploaded_by = user?.name || 'System'
    }

    const { error: updErr } = await supabase.from('financials_tracker').update(upd).eq('id', row.id)
    if (updErr) { setErr('Could not save: '+updErr.message); setUploading(false); return }

    setUploading(false)
    onDone()
  }

  const inp = { width:'100%', padding:'9px 11px', border:'1px solid #D6DBD6', borderRadius:8, fontSize:12.5, boxSizing:'border-box', fontFamily:'inherit', outline:'none' }
  const lbl = { fontSize:10.5, fontWeight:600, color:'#6B7280', textTransform:'uppercase', letterSpacing:.4, display:'block', marginBottom:4 }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:4500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:460, padding:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>📊 {dt}</div>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{client.name} · FY {fy}</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid #D6DBD6', background:'#fff', cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={lbl}>{row.document_id ? 'Replace Document (optional)' : 'Upload ' + dt + ' (PDF/Image · max 15 MB)'}</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setFile(e.target.files[0]||null)} style={{ fontSize:12 }} />
          {row.document_id && !file && <div style={{ fontSize:10.5, color:'#16A34A', marginTop:3 }}>✓ Already uploaded — choose a file only to replace</div>}
        </div>

        {showUdin && (
          <>
            <div style={{ borderTop:'1px solid #EEF0ED', margin:'4px 0 12px' }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>UDIN Number</label>
                <input value={udin} onChange={e=>setUdin(e.target.value)} placeholder="e.g. 24XXXXXX..." style={inp} />
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>UDIN Date</label>
                <input type="date" max={today} value={udinDate} onChange={e=>setUdinDate(e.target.value)} style={inp} />
              </div>
            </div>
          </>
        )}

        {showTaApplicable && (
          <div style={{ marginBottom:12 }}>
            <label style={lbl}>Tax Audit Applicable?</label>
            <select value={taApplicable===null?'':String(taApplicable)} onChange={e=>setTaApplicable(e.target.value===''?null:e.target.value==='true')} style={inp}>
              <option value="">— Select —</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Remarks</label>
          <input value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Optional notes" style={inp} />
        </div>

        <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'9px 13px', fontSize:10.5, color:'#1E40AF', marginBottom:14 }}>
          ℹ️ All figures and dates will be read automatically from the document via OCR. Only UDIN is entered manually for your central UDIN register.
        </div>

        {err && <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12 }}>{err}</div>}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 20px', border:'1px solid #D6DBD6', borderRadius:8, background:'#fff', fontSize:13, cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={uploading} style={{ padding:'9px 22px', border:'none', borderRadius:8, background:uploading?'#9CA3AF':'#0A3D2C', color:'#fff', fontSize:13, fontWeight:700, cursor:uploading?'not-allowed':'pointer' }}>
            {uploading ? '⏳ Saving…' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  )
}




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
    { key:'financials', label:'Financials', icon:'📊', show:['Private Limited Company','Public Limited Company','Section 8 Company','LLP','Partnership Firm','Proprietor'].includes(client.client_type) },
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
          {activeTab==='financials' && <FinancialsTab clientId={client.client_id} fy={fy} client={client} user={user} />}
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


// ─── ACTIVITY-WISE VIEW ─────────────────────────────────────────
const ACTIVITY_TYPES = [
  { id:'gst',        label:'GST',         icon:'🏪', table:'gst_tracker',        nameCol:'return_type', periodCol:'period' },
  { id:'tds',        label:'TDS',         icon:'💰', table:'tds_tracker',         nameCol:'form_type',   periodCol:'quarter' },
  { id:'income_tax', label:'Income Tax',  icon:'🧾', table:'income_tax_tracker',  nameCol:'itr_form',    periodCol:'fy_label' },
  { id:'roc',        label:'ROC/MCA',     icon:'🏢', table:'roc_tracker',         nameCol:'form_name',   periodCol:'fy_label' },
  { id:'accounting', label:'Accounting',  icon:'📒', table:'accounting_tracker',  nameCol:'month',       periodCol:'fy_label' },
]

const STATUS_FILTERS = [
  { id:'all',          label:'All'           },
  { id:'Data Pending', label:'Data Pending'  },
  { id:'Not Started',  label:'Not Started'   },
  { id:'In Progress',  label:'In Progress'   },
  { id:'Filed',        label:'Filed'         },
  { id:'Overdue',      label:'Overdue'       },
]

function ActivityView({ user }) {
  const [actType, setActType]     = useState('roc')
  const [fy, setFy]               = useState('2024-25')
  const [statusFilter, setStatus] = useState('all')
  const [rows, setRows]           = useState([])
  const [clients, setClients]     = useState({})
  const [load, setLoad]           = useState(true)
  const [filing, setFiling]       = useState(null)
  const [search, setSearch]       = useState('')

  const act = ACTIVITY_TYPES.find(a => a.id === actType)

  useEffect(() => {
    supabase.from('clients').select('id,client_id,name')
      .then(({ data }) => {
        const map = {}
        ;(data || []).forEach(c => { map[c.id] = c })
        setClients(map)
      })
  }, [])

  useEffect(() => { loadRows() }, [actType, fy, statusFilter])

  async function loadRows() {
    setLoad(true)
    let q = supabase.from(act.table).select('*').eq('fy_label', fy).order('client_id')
    if (statusFilter !== 'all') {
      if (statusFilter === 'Overdue') {
        q = q.lt('standard_due_date', new Date().toISOString().split('T')[0])
              .not('status', 'in', '("Filed","Completed","Closed","Not Applicable")')
      } else {
        q = q.eq('status', statusFilter)
      }
    }
    const { data } = await q
    setRows(data || [])
    setLoad(false)
  }

  const filtered = rows.filter(r => {
    if (!search) return true
    const clientName = clients[r.client_id]?.name || ''
    const formName   = r[act.nameCol] || ''
    const period     = r[act.periodCol] || ''
    return [clientName, formName, period].join(' ').toLowerCase().includes(search.toLowerCase())
  })

  // Stats — based on filtered rows so search affects the counts
  const total     = filtered.length
  const filed     = filtered.filter(r => r.status === 'Filed' || r.status === 'Completed').length
  const overdue   = filtered.filter(r => r.standard_due_date && r.standard_due_date < new Date().toISOString().split('T')[0] && !['Filed','Completed','Closed','Not Applicable'].includes(r.status)).length
  const pending   = filtered.filter(r => ['Data Pending','Not Started','In Progress'].includes(r.status)).length

  const dueSoonCutoff = new Date(Date.now() + 7*864e5).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      {/* Top controls */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16, alignItems:'center' }}>
        {/* Activity type pills */}
        <div style={{ display:'flex', gap:4, background:'#fff', border:'1px solid var(--border)', borderRadius:8, padding:3 }}>
          {ACTIVITY_TYPES.map(a => (
            <button key={a.id} onClick={() => { setActType(a.id); setStatus('all') }} style={{
              padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer',
              fontSize:12, fontWeight:600, transition:'.15s',
              background: actType===a.id ? 'var(--dkgreen)' : 'transparent',
              color: actType===a.id ? '#fff' : 'var(--gray)',
            }}>{a.icon} {a.label}</button>
          ))}
        </div>

        {/* FY selector */}
        <select value={fy} onChange={e => setFy(e.target.value)}
          style={{ padding:'6px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:600 }}>
          {['2025-26','2024-25','2023-24','2022-23','2021-22','2020-21'].map(f =>
            <option key={f}>{f}</option>
          )}
        </select>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search client or form..."
          style={{ flex:1, minWidth:180, padding:'6px 12px', border:'1px solid var(--border)', borderRadius:8, fontSize:12, outline:'none' }} />
      </div>

      {/* Status filter chips */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {STATUS_FILTERS.map(s => (
          <button key={s.id} onClick={() => setStatus(s.id)} style={{
            padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer',
            border:'1px solid',
            borderColor: statusFilter===s.id ? 'var(--dkgreen)' : 'var(--border)',
            background: statusFilter===s.id ? 'var(--dkgreen)' : '#fff',
            color: statusFilter===s.id ? '#fff' : 'var(--gray)',
          }}>{s.label}</button>
        ))}

        {/* Quick action — show only pending */}
        <button onClick={() => setStatus('Data Pending')} style={{
          padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer',
          border:'1px solid #FDE68A', background:'#FFFBEB', color:'#92400E', marginLeft:'auto',
        }}>⚡ Needs Action</button>
      </div>

      {/* Summary strip */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:'Total',    val:total,   color:'#6366F1' },
          { label:'Filed',    val:filed,   color:'#16A34A' },
          { label:'Overdue',  val:overdue, color:'#DC2626' },
          { label:'Pending',  val:pending, color:'#D97706' },
        ].map((c,i) => (
          <div key={i} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:8, padding:'8px 14px', display:'flex', alignItems:'center', gap:8, minWidth:90 }}>
            <div style={{ width:3, height:20, borderRadius:2, background:c.color }} />
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:c.color, lineHeight:1 }}>{load ? '…' : c.val}</div>
              <div style={{ fontSize:10, color:'var(--gray)', marginTop:1, fontWeight:600 }}>{c.label}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize:12, color:'var(--gray)', alignSelf:'center', marginLeft:4 }}>
          {act.icon} <strong>{act.label}</strong> · FY {fy} · {filtered.length} shown
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow:'hidden' }}>
        {load ? <Spin /> : filtered.length === 0 ? <Empty label={act.label} /> : actType === 'gst' ? (
          // ── GST: merged view — one row per client+period ──────────────────
          <GSTActivityTable rows={filtered} clients={clients} user={user} onFiled={loadRows} />
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#F8FAF9', borderBottom:'2px solid #E5E7EB' }}>
                  {['Client','Form / Type','Period','Due Date','Status','Action'].map((h,i) => (
                    <th key={i} style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:11, letterSpacing:'.4px', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const cl       = clients[r.client_id]
                  const dueDate  = r.individual_due_date || r.extended_due_date || r.standard_due_date
                  const isOver   = dueDate && dueDate < today && !['Filed','Completed','Closed','Not Applicable'].includes(r.status)
                  const isDueSoon= dueDate && dueDate >= today && dueDate <= dueSoonCutoff && !['Filed','Completed'].includes(r.status)
                  const formName = r[act.nameCol] || '—'
                  const period   = r[act.periodCol] || r.period || r.quarter || '—'

                  return (
                    <tr key={r.id} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFCFB' }}>
                      <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#111827' }}>{cl?.name || '—'}</div>
                        <div style={{ fontSize:10, color:'var(--gray)' }}>{cl?.client_id}</div>
                      </td>
                      <td style={{ padding:'9px 12px', fontWeight:500, color:'#111827', whiteSpace:'nowrap' }}>{formName}</td>
                      <td style={{ padding:'9px 12px', color:'#374151', whiteSpace:'nowrap', fontSize:11 }}>{period}</td>
                      <td style={{ padding:'9px 12px', whiteSpace:'nowrap',
                        color: isOver ? '#DC2626' : isDueSoon ? '#D97706' : '#374151',
                        fontWeight: isOver || isDueSoon ? 700 : 400 }}>
                        {dueDate ? new Date(dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                        {isOver   && <span style={{ fontSize:9, background:'#FEE2E2', color:'#DC2626', padding:'1px 5px', borderRadius:99, marginLeft:5, fontWeight:700 }}>OVERDUE</span>}
                        {isDueSoon && <span style={{ fontSize:9, background:'#FEF3C7', color:'#D97706', padding:'1px 5px', borderRadius:99, marginLeft:5, fontWeight:700 }}>DUE SOON</span>}
                      </td>
                      <td style={{ padding:'9px 12px' }}><SBadge status={r.status} /></td>
                      <td style={{ padding:'9px 12px' }}><FileBtn row={r} onClick={() => setFiling({ row: r, client: cl })} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filing && (
        <MarkFiledModal
          record={filing.row}
          trackerType={actType}
          client={filing.client}
          user={user}
          onClose={() => setFiling(null)}
          onSaved={() => { setFiling(null); loadRows() }}
        />
      )}
    </div>
  )
}

export default function Compliance({ user }) {
  const [mainTab, setMainTab] = useState('dashboard')
  const [selectedClient, setSelectedClient] = useState(null)
  const mainTabs = [
    { id:'dashboard', label:'Firm Dashboard', icon:'📊' },
    { id:'clients',   label:'Client-wise',    icon:'👥' },
    { id:'activity',  label:'Activity-wise',  icon:'📋' },
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
      {mainTab==='activity'  && <ActivityView user={user} />}
      {selectedClient && <ClientPanel client={selectedClient} user={user} onClose={()=>setSelectedClient(null)} />}
    </div>
  )
}
