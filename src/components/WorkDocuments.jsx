import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { fmtDate } from '../helpers'

// ─── constants ───────────────────────────────────────────────────────────────
const BUCKET = 'completed-work'
const FY_OPTIONS = ['2025-26','2024-25','2023-24','2022-23','2021-22']
const MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March']
const QUARTERS = ['Q1 (Apr-Jun)','Q2 (Jul-Sep)','Q3 (Oct-Dec)','Q4 (Jan-Mar)']
const STATUS_OPTIONS = ['Final Uploaded','Filed','Signed','Approved','Replaced / Revised']
const CATEGORIES = {
  'GST': ['GSTR-1 Filed Return','GSTR-3B Filed Return','GST Challan','GSTR-2B','GSTR-2B Reconciliation Final','GSTR-9','GSTR-9C','GST Notice Reply','Other GST Document'],
  'Income Tax': ['ITR Form','ITR Acknowledgement','Computation of Income','Form 26AS','AIS / TIS','Tax Challan','Assessment Order','Notice Reply'],
  'ROC / MCA': ['AOC-4','MGT-7','MGT-7A','ADT-1','DPT-3','MSME-1','DIR-3 KYC','MCA Challan','MCA Acknowledgement','Other ROC Document'],
  'Audit & Balance Sheet': ['Final Balance Sheet','Profit & Loss Account','Notes to Accounts','Cash Flow Statement','Audit Report','Tax Audit Report','CARO Report','Signed Financial Statements','Management Representation Letter'],
  'TDS': ['TDS Return Acknowledgement','Form 24Q','Form 26Q','Form 27Q','Form 16','Form 16A','TDS Challan','TRACES Report'],
  'Payroll': ['Salary Sheet','PF Challan','ESI Challan','Payslips','Bonus Working','Full and Final Statement'],
  'Minutes & Resolutions': ['Board Meeting Minutes','AGM Minutes','EGM Minutes','Board Resolution','Shareholder Resolution','Attendance Register','MBP-1','DIR-8','Statutory Register'],
  'Agreements': ['Engagement Letter','Service Agreement','Retainer Agreement','Renewal Agreement','Termination Letter','Proposal','Other Agreement'],
  'Other Documents': ['Other Document']
}
const CAT_ICONS = { 'GST':'📊', 'Income Tax':'📋', 'ROC / MCA':'🏢', 'Audit & Balance Sheet':'📈', 'TDS':'💼', 'Payroll':'👥', 'Minutes & Resolutions':'📝', 'Agreements':'🤝', 'Other Documents':'📁' }

function fmtSize(b) { if (!b) return ''; if (b<1024) return b+'B'; if (b<1024*1024) return (b/1024).toFixed(0)+'KB'; return (b/1024/1024).toFixed(1)+'MB' }

export default function WorkDocuments({ user }) {
  const [view, setView] = useState('dashboard')
  const [clients, setClients] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewer, setViewer] = useState(null)

  useEffect(() => { loadAll() }, [])
  async function loadAll() {
    setLoading(true)
    const [{ data: cl }, { data: dc }] = await Promise.all([
      supabase.from('clients').select('client_id,name,client_type,pan,gstin,tan,status').order('name'),
      supabase.from('completed_documents').select('*').order('created_at', { ascending: false })
    ])
    setClients(cl || [])
    setDocs(dc || [])
    setLoading(false)
  }

  async function viewDoc(d) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 600)
    if (!error && data) setViewer({ url: data.signedUrl, doc: d, isImage: d.mime_type?.startsWith('image/') })
  }

  const navItems = [
    { id:'dashboard', label:'Dashboard', icon:'📊' },
    { id:'upload', label:'Upload Document', icon:'⬆️' },
    { id:'library', label:'Client Library', icon:'📚' },
    { id:'gst', label:'GST Returns', icon:'📋' },
    { id:'roc', label:'ROC / MCA', icon:'🏢' },
    { id:'audit', label:'Audit & Balance Sheet', icon:'📈' },
    { id:'it', label:'Income Tax', icon:'💰' },
    { id:'tds', label:'TDS', icon:'💼' },
    { id:'payroll', label:'Payroll', icon:'👥' },
    { id:'minutes', label:'Minutes & Resolutions', icon:'📝' },
    { id:'search', label:'Search', icon:'🔍' },
  ]

  const catFilter = { gst:'GST', roc:'ROC / MCA', audit:'Audit & Balance Sheet', it:'Income Tax', tds:'TDS', payroll:'Payroll', minutes:'Minutes & Resolutions' }

  return (
    <div style={{ display:'flex', gap:0, minHeight:'80vh' }}>
      {/* Sidebar */}
      <div style={{ width:210, flexShrink:0, background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'8px 0', marginRight:20, alignSelf:'flex-start', position:'sticky', top:0 }}>
        <div style={{ padding:'10px 14px 6px', fontSize:10, fontWeight:700, color:'var(--gray2)', textTransform:'uppercase', letterSpacing:1.5 }}>Work Documents</div>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setView(n.id)}
            style={{ width:'100%', textAlign:'left', padding:'9px 14px', fontSize:12.5, fontWeight: view===n.id ? 700 : 500, background: view===n.id ? 'var(--ltgreen)' : 'none', color: view===n.id ? 'var(--dkgreen)' : 'var(--navy)', border:'none', cursor:'pointer', borderLeft: view===n.id ? '3px solid var(--dkgreen)' : '3px solid transparent' }}>
            {n.icon} {n.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex:1, minWidth:0 }}>
        {view === 'dashboard' && <Dashboard docs={docs} clients={clients} onView={viewDoc} setView={setView} />}
        {view === 'upload' && <UploadForm clients={clients} user={user} onSaved={loadAll} />}
        {view === 'library' && <ClientLibrary clients={clients} docs={docs} onView={viewDoc} user={user} onSaved={loadAll} />}
        {(catFilter[view]) && <CategoryView docs={docs} clients={clients} category={catFilter[view]} onView={viewDoc} user={user} onSaved={loadAll} />}
        {view === 'search' && <SearchView docs={docs} clients={clients} onView={viewDoc} />}
      </div>

      {/* Slide-in viewer */}
      {viewer && (
        <>
          <style>{`.dv-panel{position:fixed;right:0;top:0;bottom:0;width:52%;min-width:340px;background:#FDFDFB;border-left:1.5px solid #D6DBD6;box-shadow:-10px 0 50px rgba(4,28,20,.18);z-index:4500;display:flex;flex-direction:column;animation:dvSlide .32s cubic-bezier(.4,0,.2,1)}@keyframes dvSlide{from{transform:translateX(100%)}to{transform:none}}`}</style>
          <div className="dv-panel">
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid #ECEEE9', background:'#FBFBF8', flexShrink:0 }}>
              <span style={{ fontSize:18 }}>{viewer.isImage?'🖼️':'📄'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#13241D', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{viewer.doc.doc_name}</div>
                <div style={{ fontSize:11, color:'#8A9189' }}>{viewer.doc.category} · {viewer.doc.doc_type} · {viewer.doc.financial_year}</div>
              </div>
              <a href={viewer.url} target="_blank" rel="noreferrer" style={{ fontSize:11.5, fontWeight:600, color:'var(--dkgreen)', textDecoration:'none', border:'1px solid var(--green2)', padding:'5px 11px', borderRadius:8 }}>↗ New tab</a>
              <button onClick={() => setViewer(null)} style={{ width:30, height:30, borderRadius:8, border:'1px solid #D6DBD6', background:'#fff', cursor:'pointer', fontSize:14 }}>✕</button>
            </div>
            <div style={{ flex:1, overflow:'hidden', background:'#F3F4F0' }}>
              {viewer.isImage ? <img src={viewer.url} alt={viewer.doc.doc_name} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', padding:16, display:'block', margin:'auto' }} />
              : <iframe src={viewer.url} title={viewer.doc.doc_name} style={{ width:'100%', height:'100%', border:'none' }} />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ docs, clients, onView, setView }) {
  const thisMonth = new Date().toISOString().slice(0,7)
  const clientDocs = docs.filter(d=>d.visibility==='client')
  const thisMonthDocs = docs.filter(d=>d.created_at?.slice(0,7)===thisMonth)
  const stats = [
    { label:'Total Clients', value: clients.length, color:'#3B82F6', icon:'👥' },
    { label:'Total Documents', value: docs.length, color:'#0D7A53', icon:'📁' },
    { label:'Uploaded This Month', value: thisMonthDocs.length, color:'#8B5CF6', icon:'⬆️' },
    { label:'Client Visible', value: clientDocs.length, color:'#F59E0B', icon:'👁' },
    { label:'GST Documents', value: docs.filter(d=>d.category==='GST').length, color:'#EF4444', icon:'📊' },
    { label:'Audit & Accounts', value: docs.filter(d=>d.category==='Audit & Balance Sheet').length, color:'#10B981', icon:'📈' },
    { label:'Income Tax', value: docs.filter(d=>d.category==='Income Tax').length, color:'#F97316', icon:'💰' },
    { label:'ROC / MCA', value: docs.filter(d=>d.category==='ROC / MCA').length, color:'#6366F1', icon:'🏢' },
  ]
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div><h2 style={{ fontSize:22, fontWeight:700, margin:0 }}>Work Documents Dashboard</h2><p style={{ color:'var(--gray)', fontSize:13, margin:'4px 0 0' }}>Completed work and filed documents across all clients</p></div>
        <button onClick={() => setView('upload')} style={{ background:'var(--dkgreen)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>⬆️ Upload Document</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11.5, color:'var(--gray)', fontWeight:500 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border2)', fontWeight:700, fontSize:14 }}>Recent Uploads</div>
        {docs.length === 0 ? <div style={{ padding:32, textAlign:'center', color:'var(--gray2)', fontSize:13 }}>No documents uploaded yet.</div>
        : <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead><tr style={{ background:'var(--ltgray)' }}>
                {['Client','FY','Category','Document Type','Uploaded By','Date','Visibility','Action'].map(h => <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontWeight:600, color:'var(--gray)', borderBottom:'1px solid var(--border)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {docs.slice(0,10).map(d => (
                  <tr key={d.id} style={{ borderBottom:'1px solid var(--border2)' }}>
                    <td style={{ padding:'9px 12px' }}><div style={{ fontWeight:500 }}>{d.client_name}</div><div style={{ fontSize:10.5, color:'var(--gray)' }}>{d.client_id}</div></td>
                    <td style={{ padding:'9px 12px', color:'var(--gray)' }}>{d.financial_year}</td>
                    <td style={{ padding:'9px 12px' }}><span style={{ background:'#EEF2FF', color:'#4338CA', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600 }}>{d.category}</span></td>
                    <td style={{ padding:'9px 12px', color:'var(--gray)' }}>{d.doc_type}</td>
                    <td style={{ padding:'9px 12px', color:'var(--gray)' }}>{d.uploaded_by}</td>
                    <td style={{ padding:'9px 12px', color:'var(--gray)' }}>{fmtDate(d.created_at)}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{ background: d.visibility==='client' ? 'var(--ltgreen)' : '#F3F4F6', color: d.visibility==='client' ? 'var(--dkgreen)' : 'var(--gray)', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600 }}>{d.visibility==='client' ? '👁 Client' : '🔒 Internal'}</span>
                    </td>
                    <td style={{ padding:'9px 12px' }}><button onClick={() => onView(d)} style={{ background:'none', border:'none', color:'var(--blue)', fontWeight:600, cursor:'pointer', fontSize:12 }}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  )
}

// ─── UPLOAD FORM ──────────────────────────────────────────────────────────────
function UploadForm({ clients, user, onSaved }) {
  const INIT = { client_id:'', financial_year:'2024-25', category:'', doc_type:'', doc_name:'', month:'', quarter:'', status:'Final Uploaded', visibility:'internal', remarks:'' }
  const [f, setF] = useState(INIT)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState(false)

  const selectedClient = clients.find(c => c.client_id === f.client_id)
  const docTypes = CATEGORIES[f.category] || []
  const needsMonth = f.category === 'GST'
  const needsQuarter = f.category === 'TDS'

  function set(k, v) { setF(p => ({ ...p, [k]: v })); setErr('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!f.client_id) { setErr('Please select a client'); return }
    if (!f.financial_year) { setErr('Financial Year is required'); return }
    if (!f.category) { setErr('Document Category is required'); return }
    if (!f.doc_type) { setErr('Document Type is required'); return }
    if (!f.doc_name.trim()) { setErr('Document Name is required'); return }
    if (!file) { setErr('Please select a file to upload'); return }
    if (needsMonth && !f.month) { setErr('Month is required for GST documents'); return }
    if (needsQuarter && !f.quarter) { setErr('Quarter is required for TDS documents'); return }
    if (file.size > 50 * 1024 * 1024) { setErr('File must be under 50 MB'); return }

    // Duplicate check
    const { data: existing } = await supabase.from('completed_documents').select('id').eq('client_id', f.client_id).eq('financial_year', f.financial_year).eq('category', f.category).eq('doc_type', f.doc_type).eq('month', f.month || '').eq('quarter', f.quarter || '').maybeSingle()
    if (existing) {
      const go = confirm('A document with the same Client, FY, Category, Type' + (f.month ? ', and Month' : '') + ' already exists. Upload anyway as a new version?')
      if (!go) return
    }

    setUploading(true)
    const safe = file.name.replace(/[^\w.\-]+/g,'_')
    const path = `${f.client_id}/${f.financial_year}/${f.category.replace(/[^a-zA-Z0-9]/g,'_')}/${Date.now()}_${safe}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (upErr) { setErr('Upload failed: ' + upErr.message); setUploading(false); return }

    const { error: insErr } = await supabase.from('completed_documents').insert({
      client_id: f.client_id, client_name: selectedClient?.name, client_type: selectedClient?.client_type,
      pan: selectedClient?.pan, gstin: selectedClient?.gstin,
      financial_year: f.financial_year, month: f.month || null, quarter: f.quarter || null,
      category: f.category, doc_type: f.doc_type, doc_name: f.doc_name.trim(),
      file_path: path, file_name: file.name, file_size: file.size, mime_type: file.type,
      uploaded_by: user.name, visibility: f.visibility, status: f.status, remarks: f.remarks || null
    })
    setUploading(false)
    if (insErr) { setErr('Could not save record: ' + insErr.message); return }
    setSuccess(true); onSaved()
    setTimeout(() => { setSuccess(false); setF(INIT); setFile(null) }, 3000)
  }

  return (
    <div className="card" style={{ padding:24 }}>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>⬆️ Upload Completed Document</h2>
      <p style={{ color:'var(--gray)', fontSize:13, marginBottom:20 }}>Upload final/filed documents for onboarded clients only.</p>

      {success && <div style={{ padding:'12px 16px', background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:10, color:'#065F46', fontWeight:600, marginBottom:16 }}>✓ Document uploaded successfully!</div>}
      {err && <div style={{ padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, color:'#B91C1C', marginBottom:16, fontSize:13 }}>{err}</div>}

      <form onSubmit={handleSubmit}>
        <Sec title="Client Details">
          <Grid>
            <Fld label="Select Client *">
              <select className="fi" value={f.client_id} onChange={e => set('client_id', e.target.value)} required>
                <option value="">Select onboarded client...</option>
                {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.name} ({c.client_id})</option>)}
              </select>
              {!f.client_id && <div style={{ fontSize:11, color:'var(--gray2)', marginTop:4 }}>Only clients from the onboarding database can be selected.</div>}
            </Fld>
            {selectedClient && <>
              <Fld label="Client ID"><input className="fi" readOnly value={selectedClient.client_id} /></Fld>
              <Fld label="PAN"><input className="fi" readOnly value={selectedClient.pan || '—'} /></Fld>
              <Fld label="GSTIN"><input className="fi" readOnly value={selectedClient.gstin || '—'} /></Fld>
              <Fld label="Client Type"><input className="fi" readOnly value={selectedClient.client_type || '—'} /></Fld>
              <Fld label="Status"><span style={{ padding:'4px 10px', borderRadius:99, fontSize:12, fontWeight:600, background: selectedClient.status==='Active'?'var(--ltgreen)':'#FEF3C7', color: selectedClient.status==='Active'?'var(--dkgreen)':'#B45309' }}>{selectedClient.status || 'Active'}</span></Fld>
            </>}
          </Grid>
          {selectedClient && (selectedClient.status === 'Inactive' || selectedClient.status === 'Closed') &&
            <div style={{ padding:'10px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:9, color:'#B45309', fontSize:13, marginTop:8 }}>⚠️ This client is {selectedClient.status}. You can still upload, but please confirm this is intentional.</div>}
        </Sec>

        <Sec title="Document Details">
          <Grid>
            <Fld label="Financial Year *">
              <select className="fi" value={f.financial_year} onChange={e => set('financial_year', e.target.value)} required>
                {FY_OPTIONS.map(y => <option key={y}>{y}</option>)}
              </select>
            </Fld>
            <Fld label="Document Category *">
              <select className="fi" value={f.category} onChange={e => { set('category', e.target.value); setF(p => ({ ...p, doc_type:'', month:'', quarter:'' })) }} required>
                <option value="">Select category...</option>
                {Object.keys(CATEGORIES).map(c => <option key={c}>{c}</option>)}
              </select>
            </Fld>
            {needsMonth && <Fld label="Month *"><select className="fi" value={f.month} onChange={e => set('month', e.target.value)} required><option value="">Select month...</option>{MONTHS.map(m => <option key={m}>{m}</option>)}</select></Fld>}
            {needsQuarter && <Fld label="Quarter *"><select className="fi" value={f.quarter} onChange={e => set('quarter', e.target.value)} required><option value="">Select quarter...</option>{QUARTERS.map(q => <option key={q}>{q}</option>)}</select></Fld>}
            <Fld label="Document Type *">
              <select className="fi" value={f.doc_type} onChange={e => set('doc_type', e.target.value)} required disabled={!f.category}>
                <option value="">Select type...</option>
                {docTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </Fld>
            <Fld label="Document Name *"><input className="fi" value={f.doc_name} onChange={e => set('doc_name', e.target.value)} placeholder="e.g. GSTR-1 April 2026 - Filed" required /></Fld>
            <Fld label="Status">
              <select className="fi" value={f.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Fld>
            <Fld label="Visibility">
              <select className="fi" value={f.visibility} onChange={e => set('visibility', e.target.value)}>
                <option value="internal">🔒 Internal Only</option>
                <option value="client">👁 Client Visible</option>
              </select>
            </Fld>
          </Grid>
          <Fld label="Remarks"><textarea className="fi" value={f.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Internal notes (not visible to client)" rows={2} style={{ resize:'vertical' }} /></Fld>
        </Sec>

        <Sec title="File Upload">
          <div style={{ border:'2px dashed var(--border)', borderRadius:12, padding:24, textAlign:'center', background:'var(--ltgray)' }}>
            {file ? (
              <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'center' }}>
                <span style={{ fontSize:28 }}>📄</span>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:600 }}>{file.name}</div>
                  <div style={{ fontSize:12, color:'var(--gray)' }}>{fmtSize(file.size)}</div>
                </div>
                <button type="button" onClick={() => setFile(null)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'4px 10px', cursor:'pointer', color:'var(--gray)', fontSize:12 }}>Change</button>
              </div>
            ) : (
              <label style={{ cursor:'pointer' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📤</div>
                <div style={{ fontWeight:600, color:'var(--navy)' }}>Click to select file</div>
                <div style={{ fontSize:12, color:'var(--gray)', marginTop:4 }}>PDF, Excel, Word, ZIP, Images · Max 50 MB</div>
                <input type="file" accept=".pdf,.xlsx,.xls,.doc,.docx,.zip,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} style={{ display:'none' }} />
              </label>
            )}
          </div>
        </Sec>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
          <button type="button" onClick={() => { setF(INIT); setFile(null); setErr('') }} style={{ padding:'10px 20px', border:'1px solid var(--border)', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13 }}>Reset</button>
          <button type="submit" disabled={uploading || !f.client_id} style={{ padding:'10px 24px', background:'var(--dkgreen)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', opacity: (!f.client_id || uploading) ? 0.6 : 1 }}>
            {uploading ? 'Uploading…' : '⬆️ Upload Document'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── CLIENT LIBRARY ───────────────────────────────────────────────────────────
function ClientLibrary({ clients, docs, onView, user, onSaved }) {
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedFY, setSelectedFY] = useState('2024-25')
  const [selectedCat, setSelectedCat] = useState('')

  const cl = clients.find(c => c.client_id === selectedClient)
  const filtered = docs.filter(d => d.client_id===selectedClient && d.financial_year===selectedFY && (!selectedCat || d.category===selectedCat))
  const catGroups = Object.keys(CATEGORIES).map(cat => ({ cat, items: filtered.filter(d => d.category===cat) })).filter(g => g.items.length > 0)

  async function toggleVisibility(d) {
    const newVis = d.visibility === 'client' ? 'internal' : 'client'
    await supabase.from('completed_documents').update({ visibility: newVis }).eq('id', d.id)
    onSaved()
  }
  async function deleteDoc(d) {
    if (!confirm('Delete this document?')) return
    await supabase.storage.from(BUCKET).remove([d.file_path])
    await supabase.from('completed_documents').delete().eq('id', d.id)
    onSaved()
  }

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:16 }}>📚 Client Document Library</h2>
      <div className="card" style={{ padding:16, marginBottom:16, display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div><label style={lbl}>Select Client</label>
          <select style={sel} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
            <option value="">All clients / choose one...</option>
            {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.name} ({c.client_id})</option>)}
          </select>
        </div>
        <div><label style={lbl}>Financial Year</label>
          <select style={sel} value={selectedFY} onChange={e => setSelectedFY(e.target.value)}>
            {FY_OPTIONS.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Category</label>
          <select style={sel} value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
            <option value="">All categories</option>
            {Object.keys(CATEGORIES).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {!selectedClient && <div style={{ padding:40, textAlign:'center', color:'var(--gray2)', background:'#fff', borderRadius:12, border:'1px solid var(--border)' }}><div style={{ fontSize:36, marginBottom:8 }}>📚</div>Select a client above to view their document library.</div>}

      {selectedClient && cl && (
        <>
          <div className="card" style={{ padding:'12px 18px', marginBottom:16, display:'flex', gap:20, flexWrap:'wrap' }}>
            <div><span style={{ fontSize:11, color:'var(--gray)', fontWeight:600, display:'block' }}>CLIENT</span><span style={{ fontWeight:700 }}>{cl.name}</span></div>
            <div><span style={{ fontSize:11, color:'var(--gray)', fontWeight:600, display:'block' }}>ID</span><span>{cl.client_id}</span></div>
            <div><span style={{ fontSize:11, color:'var(--gray)', fontWeight:600, display:'block' }}>PAN</span><span>{cl.pan || '—'}</span></div>
            <div><span style={{ fontSize:11, color:'var(--gray)', fontWeight:600, display:'block' }}>TYPE</span><span>{cl.client_type}</span></div>
            <div><span style={{ fontSize:11, color:'var(--gray)', fontWeight:600, display:'block' }}>FY</span><span style={{ fontWeight:700, color:'var(--dkgreen)' }}>{selectedFY}</span></div>
            <div><span style={{ fontSize:11, color:'var(--gray)', fontWeight:600, display:'block' }}>DOCS</span><span style={{ fontWeight:700 }}>{filtered.length}</span></div>
          </div>

          {catGroups.length === 0
            ? <div style={{ padding:32, textAlign:'center', color:'var(--gray2)', background:'#fff', borderRadius:12, border:'1px dashed var(--border)' }}>No documents found for {cl.name} · FY {selectedFY}{selectedCat ? ' · ' + selectedCat : ''}.</div>
            : catGroups.map(({ cat, items }) => (
                <div key={cat} className="card" style={{ marginBottom:14, overflow:'hidden' }}>
                  <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border2)', background:'var(--ltgray)', display:'flex', alignItems:'center', gap:8 }}>
                    <span>{CAT_ICONS[cat]}</span><span style={{ fontWeight:700, fontSize:14 }}>{cat}</span>
                    <span style={{ marginLeft:4, fontSize:11, color:'var(--gray)' }}>{items.length} file{items.length!==1?'s':''}</span>
                  </div>
                  <DocTable docs={items} onView={onView} onToggleVisibility={toggleVisibility} onDelete={deleteDoc} />
                </div>
              ))
          }
        </>
      )}
    </div>
  )
}

// ─── CATEGORY VIEW ────────────────────────────────────────────────────────────
function CategoryView({ docs, clients, category, onView, user, onSaved }) {
  const [search, setSearch] = useState('')
  const [fyFilter, setFyFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const filtered = docs.filter(d => d.category===category && (!fyFilter||d.financial_year===fyFilter) && (!clientFilter||d.client_id===clientFilter) && (!search || d.client_name?.toLowerCase().includes(search.toLowerCase()) || d.doc_name?.toLowerCase().includes(search.toLowerCase()) || d.doc_type?.toLowerCase().includes(search.toLowerCase())))

  async function toggleVisibility(d) {
    await supabase.from('completed_documents').update({ visibility: d.visibility==='client'?'internal':'client' }).eq('id', d.id)
    onSaved()
  }
  async function deleteDoc(d) {
    if (!confirm('Delete?')) return
    await supabase.storage.from(BUCKET).remove([d.file_path])
    await supabase.from('completed_documents').delete().eq('id', d.id)
    onSaved()
  }

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:16 }}>{CAT_ICONS[category]} {category}</h2>
      <div className="card" style={{ padding:14, marginBottom:16, display:'flex', gap:10, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client, doc name, type..." style={{ ...sel, flex:'1 1 180px' }} />
        <select style={sel} value={fyFilter} onChange={e => setFyFilter(e.target.value)}>
          <option value="">All financial years</option>{FY_OPTIONS.map(y => <option key={y}>{y}</option>)}
        </select>
        <select style={sel} value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
          <option value="">All clients</option>{clients.map(c => <option key={c.client_id} value={c.client_id}>{c.name}</option>)}
        </select>
      </div>
      <div className="card" style={{ overflow:'hidden' }}>
        {filtered.length === 0 ? <div style={{ padding:32, textAlign:'center', color:'var(--gray2)' }}>No {category} documents found.</div>
        : <DocTable docs={filtered} onView={onView} onToggleVisibility={toggleVisibility} onDelete={deleteDoc} />}
      </div>
    </div>
  )
}

// ─── SEARCH VIEW ──────────────────────────────────────────────────────────────
function SearchView({ docs, clients, onView }) {
  const [q, setQ] = useState('')
  const [fyF, setFyF] = useState('')
  const [catF, setCatF] = useState('')
  const [visF, setVisF] = useState('')
  const filtered = docs.filter(d => {
    const s = q.toLowerCase()
    if (q && !([d.client_name,d.client_id,d.pan,d.doc_name,d.doc_type,d.category,d.financial_year,d.uploaded_by].join(' ').toLowerCase().includes(s))) return false
    if (fyF && d.financial_year!==fyF) return false
    if (catF && d.category!==catF) return false
    if (visF && d.visibility!==visF) return false
    return true
  })
  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, marginBottom:16 }}>🔍 Search Documents</h2>
      <div className="card" style={{ padding:16, marginBottom:16, display:'flex', gap:10, flexWrap:'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by client, PAN, document name, type, category..." style={{ ...sel, flex:'1 1 260px' }} />
        <select style={sel} value={fyF} onChange={e => setFyF(e.target.value)}><option value="">All FY</option>{FY_OPTIONS.map(y => <option key={y}>{y}</option>)}</select>
        <select style={sel} value={catF} onChange={e => setCatF(e.target.value)}><option value="">All categories</option>{Object.keys(CATEGORIES).map(c => <option key={c}>{c}</option>)}</select>
        <select style={sel} value={visF} onChange={e => setVisF(e.target.value)}><option value="">All visibility</option><option value="internal">Internal Only</option><option value="client">Client Visible</option></select>
      </div>
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border2)', fontSize:12.5, color:'var(--gray)' }}>{filtered.length} document{filtered.length!==1?'s':''} found</div>
        {filtered.length === 0 ? <div style={{ padding:32, textAlign:'center', color:'var(--gray2)' }}>{q||fyF||catF||visF ? 'No documents match your search.' : 'Enter a search term above.'}</div>
        : <DocTable docs={filtered} onView={onView} onToggleVisibility={async()=>{}} onDelete={async()=>{}} readOnly />}
      </div>
    </div>
  )
}

// ─── DOC TABLE ────────────────────────────────────────────────────────────────
function DocTable({ docs, onView, onToggleVisibility, onDelete, readOnly }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
        <thead><tr style={{ background:'var(--ltgray)' }}>
          {['Client','FY','Category / Type','Document Name','Month/Quarter','By','Date','Visibility','Actions'].map(h => <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:600, color:'var(--gray)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {docs.map(d => (
            <tr key={d.id} style={{ borderBottom:'1px solid var(--border2)' }} onMouseEnter={e=>e.currentTarget.style.background='#F9FAF8'} onMouseLeave={e=>e.currentTarget.style.background=''}>
              <td style={{ padding:'8px 12px' }}><div style={{ fontWeight:500 }}>{d.client_name}</div><div style={{ fontSize:10.5, color:'var(--gray)' }}>{d.client_id}</div></td>
              <td style={{ padding:'8px 12px', color:'var(--gray)', whiteSpace:'nowrap' }}>{d.financial_year}</td>
              <td style={{ padding:'8px 12px' }}><div style={{ fontSize:11, fontWeight:700, color:'#4338CA', background:'#EEF2FF', padding:'1px 7px', borderRadius:99, display:'inline-block', marginBottom:2 }}>{d.category}</div><div style={{ fontSize:11, color:'var(--gray)' }}>{d.doc_type}</div></td>
              <td style={{ padding:'8px 12px' }}><div style={{ fontWeight:500, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.doc_name}</div>{d.remarks && <div style={{ fontSize:10.5, color:'var(--gray)', fontStyle:'italic', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.remarks}</div>}</td>
              <td style={{ padding:'8px 12px', color:'var(--gray)', fontSize:11.5 }}>{d.month || d.quarter || '—'}</td>
              <td style={{ padding:'8px 12px', color:'var(--gray)' }}>{d.uploaded_by}</td>
              <td style={{ padding:'8px 12px', color:'var(--gray)', whiteSpace:'nowrap' }}>{fmtDate(d.created_at)}</td>
              <td style={{ padding:'8px 12px' }}>
                <span style={{ background: d.visibility==='client'?'var(--ltgreen)':'#F3F4F6', color: d.visibility==='client'?'var(--dkgreen)':'var(--gray)', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600 }}>{d.visibility==='client'?'👁 Client':'🔒 Internal'}</span>
              </td>
              <td style={{ padding:'8px 12px', whiteSpace:'nowrap', display:'flex', gap:6 }}>
                <button onClick={() => onView(d)} style={{ background:'none', border:'none', color:'var(--blue)', fontWeight:600, cursor:'pointer', fontSize:11.5 }}>View</button>
                {!readOnly && <>
                  <button onClick={() => onToggleVisibility(d)} style={{ background:'none', border:'none', color:'var(--gray)', cursor:'pointer', fontSize:11 }} title="Toggle visibility">{d.visibility==='client'?'🔒':'👁'}</button>
                  <button onClick={() => onDelete(d)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:11 }} title="Delete">🗑</button>
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const lbl = { display:'block', fontSize:11, fontWeight:600, color:'var(--gray)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }
const sel = { padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8, fontSize:12.5, background:'#fff', minWidth:140 }
function Sec({ title, children }) { return <div style={{ marginBottom:20 }}><div style={{ fontSize:11, fontWeight:700, color:'var(--gray2)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12, borderBottom:'1px solid var(--border2)', paddingBottom:6 }}>{title}</div>{children}</div> }
function Grid({ children }) { return <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'12px 16px', marginBottom:12 }}>{children}</div> }
function Fld({ label, children }) { return <div><label style={lbl}>{label}</label>{children}</div> }
// Inject .fi (form input) as global style
const fiStyle = document.createElement('style')
fiStyle.textContent = '.fi{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;background:#fff}.fi:focus{border-color:var(--dkgreen);box-shadow:0 0 0 3px rgba(13,122,83,.1)}.fi:read-only{background:#F9FAF8;color:var(--gray)}'
if (!document.getElementById('fi-style')) { fiStyle.id='fi-style'; document.head.appendChild(fiStyle) }
