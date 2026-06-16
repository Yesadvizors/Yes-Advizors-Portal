// Package D — DirectorKYCActivity.jsx (REVIEW ARTIFACT)
// Compliance -> Activity-wise -> ROC/MCA -> Director KYC (beside AOC-4 / MGT-7).
// Calls dkyc_list_activitywise (typed params, server-side status). Renders server values only.
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { DirectorKYCStatusBadge, InternalControlChip } from './DirectorKYCStatusBadge';
import { COMPLIANCE_STATUSES } from './dkycStatusMeta';
import { fmtDateOnly } from './dkycFormat';            // reused statute-neutral helper (PR #9)
import DirectorKYCDetailModal from './DirectorKYCDetailModal';

const PAGE = 100;

export default function DirectorKYCActivity({ canWrite = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [fy, setFy] = useState('');                              // 'YYYY-YY' or ''
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);               // record opened in the detail modal

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase.rpc('dkyc_list_activitywise', {
      p_fy: fy || null, p_status: status || null, p_record_type: null,
      p_assigned_to: null, p_due_from: null, p_due_to: null,
      p_search: search.trim().length >= 2 ? search.trim() : null,
      p_limit: PAGE, p_offset: offset,
      // p_as_of_date omitted -> server binds current_date at the RPC layer
    });
    if (error) setErr(error.message); else setRows(data || []);
    setLoading(false);
  }, [fy, status, search, offset]);

  useEffect(() => { load(); }, [load]);

  const counts = COMPLIANCE_STATUSES.reduce((a, s) => {
    a[s] = rows.filter(r => r.compliance_status === s).length; return a;
  }, {});

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:12 }}>
        <strong style={{ marginRight:8 }}>Director KYC</strong>
        <input placeholder="FY e.g. 2029-30" value={fy} onChange={e=>{setOffset(0);setFy(e.target.value);}}
               style={{ width:120 }} />
        <select value={status} onChange={e=>{setOffset(0);setStatus(e.target.value);}}>
          <option value="">All statuses</option>
          {COMPLIANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="Search director / company" value={search}
               onChange={e=>{setOffset(0);setSearch(e.target.value);}} style={{ width:220 }} />
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        {COMPLIANCE_STATUSES.map(s => (
          <button key={s} onClick={()=>{setOffset(0);setStatus(status===s?'':s);}}
            style={{ fontSize:11, padding:'2px 8px', borderRadius:6,
              border: status===s ? '1px solid var(--dkgreen,#0D7A53)' : '1px solid var(--border,#CBD5E1)',
              background: status===s ? '#ECFDF5' : '#fff' }}>
            {s} · {counts[s] || 0}
          </button>
        ))}
      </div>

      {err && <div style={{ color:'var(--red,#DC2626)', marginBottom:8 }}>Error: {err}</div>}
      {loading ? <div>Loading…</div> : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr style={{ textAlign:'left', color:'var(--gray,#6B7280)' }}>
            <th>Director</th><th>Company</th><th>DIN</th><th>Type</th><th>FY</th>
            <th>Due</th><th>Status</th><th>SRN</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.record_id || r.din_holder_id} onClick={()=>setSelected(r)}
                  style={{ borderTop:'1px solid var(--border,#E5E7EB)', cursor:'pointer' }}>
                <td>{r.director_name}</td>
                <td>{r.company_name}</td>
                <td>{r.din}</td>
                <td>{r.record_type}</td>
                <td>{r.kyc_fy || '—'}</td>
                <td>{r.due_date ? fmtDateOnly(r.due_date) : '—'}</td>
                <td>
                  <DirectorKYCStatusBadge status={r.compliance_status}
                     interpretation_applied={r.interpretation_applied} />
                  {' '}
                  <InternalControlChip internal_control_status={r.internal_control_status}
                     internal_control_message={r.internal_control_message} />
                </td>
                <td>{r.srn_or_ack || '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} style={{ color:'var(--gray,#6B7280)', padding:12 }}>No obligations.</td></tr>}
          </tbody>
        </table>
      )}

      <div style={{ display:'flex', gap:8, marginTop:12 }}>
        <button disabled={offset===0} onClick={()=>setOffset(Math.max(0, offset-PAGE))}>Prev</button>
        <button disabled={rows.length<PAGE} onClick={()=>setOffset(offset+PAGE)}>Next</button>
      </div>

      {selected && (
        <div onClick={()=>setSelected(null)}
             style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)',
                      display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'5vh 16px', zIndex:50 }}>
          <div onClick={e=>e.stopPropagation()}>
            <DirectorKYCDetailModal record={selected} canWrite={canWrite}
              onClose={()=>setSelected(null)} onSaved={()=>{ setSelected(null); load(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
