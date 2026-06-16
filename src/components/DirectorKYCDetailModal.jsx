// Package D — DirectorKYCDetailModal.jsx (REVIEW ARTIFACT, complete — no placeholders)
// Per-DIN detail with: filing form, interpretation acceptance, and the document
// prepare -> upload -> verify/finalise flow. All writes go through Admin/Manager-gated RPCs;
// finalise is performed by the trusted Edge Function (service role), NOT called directly here.
// Frontend renders server status only and surfaces stable error codes with retry.
import React, { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { DirectorKYCStatusBadge, InternalControlChip } from './DirectorKYCStatusBadge';

const RESULT_OPTIONS = [
  'NOT_SUBMITTED','SUBMITTED','TAKEN_ON_FILE','CONFIRMATION_PENDING',
  'REJECTED','RESUBMISSION_REQUIRED','WITHDRAWN','UNKNOWN',
];
const DOC_CATEGORIES = [
  'KYC_FORM','SRN_ACKNOWLEDGEMENT','CHALLAN','FILING_CONFIRMATION',
  'CHANGE_SUPPORTING_DOCUMENT','REACTIVATION_DOCUMENT','REJECTION_NOTICE','RESUBMISSION_DOCUMENT','OTHER',
];
const ALLOWED_MIME = ['application/pdf','image/jpeg','image/png'];
const MAX_BYTES = 5 * 1024 * 1024;
const VERIFY_UPLOAD_URL = '/functions/v1/dkyc-verify-upload';

const ERROR_TEXT = {
  FORBIDDEN_ROLE: 'You do not have permission for this action.',
  NO_ACTOR_IDENTITY: 'Your team identity could not be resolved. Please re-login.',
  RECORD_NOT_FOUND: 'This KYC record no longer exists.',
  RESULT_REQUIRES_SRN: 'An SRN/acknowledgement is required for this filing result.',
  INVALID_STATUS: 'That status change is not allowed for this record.',
  ALREADY_VERIFIED: 'This filing is already verified.',
  INTERPRETATION_REASON_REQUIRED: 'A reason is required to accept the interpreted calculation.',
  UPLOAD_PATH_INVALID: 'The file failed validation (type/size).',
  INTENT_EXPIRED: 'The upload session expired — please retry.',
  CLIENT_FORBIDDEN: 'You are not authorised for this company.',
};
const friendly = (e) => ERROR_TEXT[(e && e.message) || ''] || (e && e.message) || 'Something went wrong.';

export default function DirectorKYCDetailModal({ record, canWrite, onClose, onSaved }) {
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [filing, setFiling] = useState({
    kyc_fy: record.kyc_fy || '', srn: record.srn_or_ack || '',
    registry_date: '', result: record.filing_result_status || 'SUBMITTED', remarks: '',
  });
  const [interpReason, setInterpReason] = useState('');
  const [docCategory, setDocCategory] = useState('KYC_FORM');
  const [file, setFile] = useState(null);

  const run = useCallback(async (key, fn) => {
    setBusy(key); setMsg(null);
    try { const r = await fn(); setMsg({ kind: 'ok', text: r || 'Done.' }); onSaved && onSaved(); }
    catch (e) { setMsg({ kind: 'err', text: friendly(e), retry: key }); }
    finally { setBusy(null); }
  }, [onSaved]);

  const submitFiling = () => run('filing', async () => {
    if (['SUBMITTED','TAKEN_ON_FILE','CONFIRMATION_PENDING'].includes(filing.result) && !filing.srn.trim())
      throw new Error('RESULT_REQUIRES_SRN');
    const { error } = await supabase.rpc('dkyc_record_filing', {
      p_record_id: record.record_id, p_kyc_fy: filing.kyc_fy || null,
      p_srn_or_ack: filing.srn || null, p_registry_filing_date: filing.registry_date || null,
      p_filing_result_status: filing.result, p_remarks: filing.remarks || null,
    });
    if (error) throw error;
    return 'Filing recorded.';
  });

  const verify = () => run('verify', async () => {
    const { error } = await supabase.rpc('dkyc_verify_filing', { p_record_id: record.record_id, p_remarks: null });
    if (error) throw error;
    return 'Filing verified.';
  });

  const acceptInterpretation = () => run('interp', async () => {
    if (!interpReason.trim()) throw new Error('INTERPRETATION_REASON_REQUIRED');
    const { error } = await supabase.rpc('dkyc_accept_interpretation',
      { p_record_id: record.record_id, p_reason: interpReason.trim() });
    if (error) throw error;
    return 'Interpretation accepted.';
  });

  const uploadDocument = () => run('doc', async () => {
    if (!file) throw new Error('UPLOAD_PATH_INVALID');
    if (!ALLOWED_MIME.includes(file.type) || file.size <= 0 || file.size > MAX_BYTES)
      throw new Error('UPLOAD_PATH_INVALID');
    const { data: prep, error: prepErr } = await supabase.rpc('dkyc_prepare_document_upload', {
      p_record_id: record.record_id, p_doc_category: docCategory,
      p_doc_name: file.name, p_mime_type: file.type, p_file_size: file.size,
    });
    if (prepErr) throw prepErr;
    const up = await supabase.storage.from(prep.bucket).upload(prep.approved_storage_path, file, {
      contentType: file.type, upsert: false,
    });
    if (up.error) throw up.error;
    const { data: sess } = await supabase.auth.getSession();
    const resp = await fetch(VERIFY_UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 Authorization: `Bearer ${sess?.session?.access_token || ''}` },
      body: JSON.stringify({ intent_id: prep.intent_id, doc_name: file.name }),
    });
    if (!resp.ok) {
      let code = 'UPLOAD_PATH_INVALID';
      try { code = (await resp.json()).error || code; } catch (_) {}
      throw new Error(code);
    }
    setFile(null);
    return 'Document attached.';
  });

  const Spinner = ({ k }) => busy === k ? <span style={{ marginLeft: 8, fontSize: 12 }}>working…</span> : null;
  const lbl = { fontSize: 12, color: 'var(--gray,#6B7280)', display: 'block', marginBottom: 2 };
  const inp = { width: '100%', padding: '6px 8px', border: '1px solid var(--border,#CBD5E1)', borderRadius: 6, marginBottom: 8 };

  return (
    <div style={{ position: 'relative', background: '#fff', borderRadius: 12, padding: 20, maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><strong>{record.director_name}</strong> · DIN {record.din}</div>
        <DirectorKYCStatusBadge status={record.compliance_status} interpretation_applied={record.interpretation_applied} />
      </div>
      <div style={{ marginTop: 6 }}>
        <InternalControlChip internal_control_status={record.internal_control_status}
           internal_control_message={record.internal_control_message} />
      </div>
      {record.interpretation_applied &&
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--amber,#B45309)' }}>
          Rule interpretation applied — review recommended
        </div>}

      {!canWrite && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gray,#6B7280)' }}>
          You have read-only access to this record.
        </div>
      )}

      {canWrite && (
        <>
          <fieldset style={{ marginTop: 16, border: '1px solid var(--border,#E5E7EB)', borderRadius: 8, padding: 12 }}>
            <legend style={{ fontSize: 13, fontWeight: 600 }}>Record filing</legend>
            <label style={lbl}>KYC FY (YYYY-YY)</label>
            <input style={inp} value={filing.kyc_fy} onChange={e => setFiling({ ...filing, kyc_fy: e.target.value })} placeholder="2029-30" />
            <label style={lbl}>SRN / acknowledgement</label>
            <input style={inp} value={filing.srn} onChange={e => setFiling({ ...filing, srn: e.target.value })} />
            <label style={lbl}>Registry filing date (MCA)</label>
            <input style={inp} type="date" value={filing.registry_date} onChange={e => setFiling({ ...filing, registry_date: e.target.value })} />
            <label style={lbl}>Filing result</label>
            <select style={inp} value={filing.result} onChange={e => setFiling({ ...filing, result: e.target.value })}>
              {RESULT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <label style={lbl}>Remarks</label>
            <input style={inp} value={filing.remarks} onChange={e => setFiling({ ...filing, remarks: e.target.value })} />
            <button disabled={busy === 'filing'} onClick={submitFiling}>Save filing</button><Spinner k="filing" />
            <button disabled={busy === 'verify'} onClick={verify} style={{ marginLeft: 8 }}>Verify filing</button><Spinner k="verify" />
          </fieldset>

          {record.interpretation_applied && (
            <fieldset style={{ marginTop: 12, border: '1px solid var(--border,#E5E7EB)', borderRadius: 8, padding: 12 }}>
              <legend style={{ fontSize: 13, fontWeight: 600 }}>Accept interpreted calculation</legend>
              <label style={lbl}>Reason (required)</label>
              <input style={inp} value={interpReason} onChange={e => setInterpReason(e.target.value)} />
              <button disabled={busy === 'interp'} onClick={acceptInterpretation}>Accept interpretation</button><Spinner k="interp" />
            </fieldset>
          )}

          <fieldset style={{ marginTop: 12, border: '1px solid var(--border,#E5E7EB)', borderRadius: 8, padding: 12 }}>
            <legend style={{ fontSize: 13, fontWeight: 600 }}>Attach document</legend>
            <label style={lbl}>Category</label>
            <select style={inp} value={docCategory} onChange={e => setDocCategory(e.target.value)}>
              {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label style={lbl}>File (PDF/JPEG/PNG, &le; 5 MB)</label>
            <input style={inp} type="file" accept=".pdf,.jpg,.jpeg,.png"
                   onChange={e => setFile(e.target.files?.[0] || null)} />
            <button disabled={busy === 'doc' || !file} onClick={uploadDocument}>Upload &amp; attach</button><Spinner k="doc" />
            <div style={{ fontSize: 11, color: 'var(--gray,#6B7280)', marginTop: 6 }}>
              Verification and finalisation are performed by the secure verifier service.
            </div>
          </fieldset>
        </>
      )}

      {msg && (
        <div style={{ marginTop: 12, fontSize: 13, color: msg.kind === 'err' ? 'var(--red,#DC2626)' : 'var(--dkgreen,#0D7A53)' }}>
          {msg.text}
          {msg.kind === 'err' && msg.retry && (
            <button style={{ marginLeft: 8, fontSize: 12 }} onClick={() => {
              if (msg.retry === 'filing') submitFiling();
              else if (msg.retry === 'verify') verify();
              else if (msg.retry === 'interp') acceptInterpretation();
              else if (msg.retry === 'doc') uploadDocument();
            }}>Retry</button>
          )}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
