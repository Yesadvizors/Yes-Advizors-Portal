// Package D — DirectorKYCClientPanel.jsx (REVIEW ARTIFACT)
// Compliance -> Client-wise -> Company -> ROC/MCA -> Director KYC.
// One canonical DIN-level obligation surfaced under the selected company (no duplication).
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { DirectorKYCStatusBadge, InternalControlChip } from './DirectorKYCStatusBadge';
import { fmtDateOnly } from './dkycFormat';

export default function DirectorKYCClientPanel({ clientUuid }) {     // clientUuid = clients.id (uuid)
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [openDin, setOpenDin] = useState(null);

  const load = useCallback(async () => {
    if (!clientUuid) return;
    setLoading(true); setErr(null);
    const { data, error } = await supabase.rpc('dkyc_list_clientwise', {
      p_client_id: clientUuid, p_fy: null, p_status: null, p_record_type: null,
      p_search: null, p_limit: 100, p_offset: 0,
    });
    if (error) setErr(error.message); else setRows(data || []);
    setLoading(false);
  }, [clientUuid]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight:600, marginBottom:8 }}>Director KYC</div>
      {err && <div style={{ color:'var(--red,#DC2626)' }}>Error: {err}</div>}
      {loading ? <div>Loading…</div> : rows.map(r => (
        <div key={r.record_id || r.din_holder_id}
             style={{ border:'1px solid var(--border,#E5E7EB)', borderRadius:8, padding:10, marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div><strong>{r.director_name}</strong> <span style={{ color:'var(--gray,#6B7280)' }}>· DIN {r.din}</span></div>
            <DirectorKYCStatusBadge status={r.compliance_status} interpretation_applied={r.interpretation_applied} />
          </div>
          <div style={{ display:'flex', gap:16, marginTop:6, fontSize:13, color:'var(--navy,#334155)' }}>
            <span>Type: {r.record_type}</span>
            <span>Due: {r.due_date ? fmtDateOnly(r.due_date) : '—'}</span>
            <span>FY: {r.kyc_fy || '—'}</span>
            <span>SRN: {r.srn_or_ack || '—'}</span>
            <InternalControlChip internal_control_status={r.internal_control_status}
               internal_control_message={r.internal_control_message} />
          </div>
          {r.interpretation_applied &&
            <div style={{ marginTop:6, fontSize:12, color:'var(--amber,#B45309)' }}>
              Rule interpretation applied — review recommended
            </div>}
          <button style={{ marginTop:8, fontSize:12 }} onClick={()=>setOpenDin(openDin===r.din_holder_id?null:r.din_holder_id)}>
            {openDin===r.din_holder_id ? 'Hide' : 'Filing & document history'}
          </button>
          {openDin===r.din_holder_id &&
            <DirectorKYCDinHistory dinHolderId={r.din_holder_id} />}
        </div>
      ))}
      {(!loading && rows.length===0) && <div style={{ color:'var(--gray,#6B7280)' }}>No directors linked to this company.</div>}
    </div>
  );
}

// DIN-level filing + document history (canonical set, shared across companies).
function DirectorKYCDinHistory({ dinHolderId }) {
  const [docs, setDocs] = useState([]);
  useEffect(() => {
    (async () => {
      // DIN-level documents via the access-checked read RPC (Package B). Surfaced across companies.
      const { data, error } = await supabase.rpc('dkyc_din_documents', { p_din_holder_id: dinHolderId });
      if (!error) setDocs(data || []);
      else setDocs([]);
    })();
  }, [dinHolderId]);
  return (
    <div style={{ marginTop:8, fontSize:12, background:'var(--ltgray,#F8FAFC)', padding:8, borderRadius:6 }}>
      <div style={{ fontWeight:600, marginBottom:4 }}>Documents (DIN-level, shared across companies)</div>
      {docs.length===0 ? <div style={{ color:'var(--gray,#6B7280)' }}>No documents.</div>
        : docs.map(d => <div key={d.id}>{d.doc_category} · {d.doc_name}</div>)}
      {/* dkyc_din_documents is an access-checked DIN-level read RPC included in Package B. */}
    </div>
  );
}
