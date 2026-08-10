// Package 2 — Document ↔ Compliance readiness data layer + dedup/classification helpers.
//
// Reads the already-live canonical model: v_requirement_document_readiness (readiness),
// document_requirements (version links), documents (files). Mutations go ONLY through the
// governed RPCs document_link / document_replace / document_archive. No competing repository,
// no direct writes to the link table from the client. RLS/storage remain authoritative.

// Lazy client (no import side effects — importing this module evaluates no env and builds no
// client, so it is safe under node:test; mirrors services/client360Reads).
let _clientPromise
async function sb() {
  if (!_clientPromise) _clientPromise = import('../supabase.js').then((m) => m.supabase)
  return _clientPromise
}

// requirement types that are linkable (mirror document_requirements reftype CHECK; llp/payroll excluded)
export const REQUIREMENT_TYPES = ['financials', 'gst', 'income_tax', 'tds', 'roc', 'audit', 'notice', 'accounting', 'other']

// ── Content hashing (duplicate awareness) — browser SHA-256, no server, no secret ──
export async function sha256Hex(file) {
  try {
    if (!file || typeof crypto === 'undefined' || !crypto?.subtle?.digest) return null
    const buf = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch { return null } // hashing is best-effort; never block an upload on it
}

// ── Filename → doc_type SUGGESTION only (never authoritative; user confirms) ──
const TYPE_HINTS = [
  [/tax\s*audit|tar\b|3c[db]\b/i, 'Tax Audit Report (TAR)'],
  [/balance\s*sheet|audited\s*fs|financial\s*statement|\bfs\b/i, 'Audited Balance Sheet'],
  [/computation|\bcoi\b/i, 'Computation of Income'],
  [/itr[\s_-]*v|acknowledg/i, 'ITR Acknowledgement'],
  [/\bitr\b|income\s*tax\s*return/i, 'ITR Form'],
  [/gstr[\s_-]*3b/i, 'GSTR-3B'], [/gstr[\s_-]*1/i, 'GSTR-1'],
  [/aadhaar|aadhar/i, 'Aadhaar Card'], [/\bpan\b/i, 'PAN Card'],
  [/gst.*cert|certificate.*gst/i, 'GST Certificate'],
]
export function suggestDocType(filename) {
  const n = String(filename || '')
  for (const [re, type] of TYPE_HINTS) if (re.test(n)) return type
  return null
}

// ── Readiness reads (from the security-invoker view) ──
export async function fetchReadiness({ clientId, fyLabel, refType, refId, missingOnly } = {}) {
  const supabase = await sb()
  let q = supabase.from('v_requirement_document_readiness').select('*')
  if (clientId) q = q.eq('client_id', clientId)
  if (fyLabel) q = q.eq('fy_label', fyLabel)
  if (refType) q = q.eq('requirement_ref_type', refType)
  if (refId) q = q.eq('requirement_ref_id', refId)
  if (missingOnly) q = q.eq('is_available', false)
  const { data, error } = await q
  return { data: data || [], error }
}

// Summarise readiness rows for a client into card-friendly counts.
export function summariseReadiness(rows) {
  const list = rows || []
  const available = list.filter(r => r.is_available).length
  return { total: list.length, available, missing: list.length - available }
}

// ── Version chain for one requirement (current + superseded), newest link first ──
export async function fetchRequirementVersions(refType, refId) {
  const supabase = await sb()
  const { data: links, error } = await supabase
    .from('document_requirements')
    .select('document_id, is_current, linked_at, linked_by')
    .eq('requirement_ref_type', refType).eq('requirement_ref_id', refId)
    .order('linked_at', { ascending: false })
  if (error) return { data: [], error }
  const ids = [...new Set((links || []).map(l => l.document_id))]
  if (!ids.length) return { data: [], error: null }
  const { data: docs, error: dErr } = await supabase.from('documents').select('*').in('id', ids)
  if (dErr) return { data: [], error: dErr }
  const byId = Object.fromEntries((docs || []).map(d => [d.id, d]))
  return { data: (links || []).map(l => ({ ...l, document: byId[l.document_id] })).filter(r => r.document), error: null }
}

// ── Governed action wrappers (the ONLY mutation path from the UI) ──
export async function linkDocument({ refType, refId, documentId, makeCurrent = true }) {
  return (await sb()).rpc('document_link', {
    p_requirement_ref_type: refType, p_requirement_ref_id: refId,
    p_document_id: documentId, p_make_current: makeCurrent,
  })
}
export async function replaceDocument({ refType, refId, newDocumentId, syncFinancials }) {
  return (await sb()).rpc('document_replace', {
    p_requirement_ref_type: refType, p_requirement_ref_id: refId,
    p_new_document_id: newDocumentId, p_sync_financials: syncFinancials ?? (refType === 'financials'),
  })
}
export async function archiveDocument(documentId) {
  return (await sb()).rpc('document_archive', { p_document_id: documentId })
}

// ── Compatible central documents for "Use Existing" (current docs for the client) ──
// Returns { all, matched } — matched = same FY + doc_type when provided.
export async function fetchCompatibleDocuments({ clientId, fyLabel, docType }) {
  const supabase = await sb()
  let q = supabase.from('documents').select('*').eq('is_current', true)
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) return { all: [], matched: [], error }
  const all = data || []
  const matched = all.filter(d => (!fyLabel || d.fy_label === fyLabel) && (!docType || d.doc_type === docType))
  return { all, matched, error: null }
}

// ── Find an existing current document with the same content hash (dedup) ──
export async function findByContentHash({ clientId, contentHash }) {
  if (!contentHash) return { data: null, error: null }
  const supabase = await sb()
  let q = supabase.from('documents').select('*').eq('content_hash', contentHash).eq('is_current', true)
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q.limit(1)
  return { data: (data && data[0]) || null, error }
}
