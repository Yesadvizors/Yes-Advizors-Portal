/**
 * YAV2 Financial & ITR Contextual Upload & Document-Linkage — regression tests.
 * node:test. Convention OD-5: static source guards + pure checks (no jsdom/RTL).
 *
 * Proves the Compliance → Activity-wise → Financial & ITR row drives the EXISTING
 * canonical document flow (secure-docs + documents + document_requirements RPCs), with
 * context pre-filled, correct client key, requirement linkage, and rich Manage Documents
 * actions — no duplicate storage system.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const COMP = read('src/components/Compliance.jsx')          // raw (image/* comment breaks strip)
const BULK = strip(read('src/components/BulkUploadModal.jsx'))
const DRAWER = strip(read('src/components/ManageDocumentsDrawer.jsx'))

// The 5 Financial & ITR requirement types (from financials_tracker.doc_type on dev).
const FINANCIAL_ITR_TYPES = [
  'Audited Balance Sheet', 'Computation of Income', 'ITR Acknowledgement', 'ITR Form', 'Tax Audit Report (TAR)',
]

// ── 4/7. Canonical document-type mapping (identity — no duplicate labels) ──────
test('FI-1: every Financial & ITR requirement type IS a canonical document type (identity mapping)', () => {
  for (const t of FINANCIAL_ITR_TYPES) {
    assert.ok(BULK.includes(`'${t}'`), `${t} must exist verbatim in the canonical BulkUploadModal DOC_TYPES`)
  }
})

// ── 1-3,5,6. Contextual Upload / Manage carry client + FY + exact requirement ──
test('FI-2: Activity-wise Financial & ITR — no document → contextual Upload; linked → Manage Documents', () => {
  // linked row opens the rich Manage Documents drawer (View/Replace/History/Use-Existing/Archive)
  assert.match(COMP, /r\.document_id[\s\S]*?setManageReq\(\{ refType:'financials', refId:r\.id/)
  // no-document row opens the contextual FinancialUploadModal (pre-filled), gated by canUpload
  assert.match(COMP, /: \(canUpload \? <button onClick=\{\(\) => setFinUpload\(\{ row: r, client: cl \}\)/)
  assert.match(COMP, /<ManageDocumentsDrawer\s+requirement=\{manageReq\} user=\{user\}/)
})
test('FI-3: requirement context is pre-filled — client, FY, doc type, requirement ref, source', () => {
  // refType/refId (exact requirement), fyLabel, docType are taken from the row — user re-selects nothing
  assert.match(COMP, /refType:'financials', refId:r\.id, clientId:r\.client_id, clientName:cl\?\.name, fyLabel:fy, docType:r\[act\.nameCol\], requirementLabel:r\[act\.nameCol\]/)
  // FinancialUploadModal is opened with the row + client + fy context (no manual client/fy/type entry)
  assert.match(COMP, /<FinancialUploadModal\s+row=\{finUpload\.row\}\s+client=\{finUpload\.client\}\s+fy=\{fy\}/)
})
test('FI-4: correct client key discipline — financials uses the TEXT client_id (not the UUID)', () => {
  // financials_tracker.client_id and documents.client_id are BOTH text — pass r.client_id (text).
  assert.match(COMP, /clientId:r\.client_id/)
  // ACTIVITY_TYPES marks financials textClient:true
  assert.match(COMP, /id:'financials', label:'Financial & ITR'[\s\S]*?textClient:true/)
})

// ── 6,10,15. Canonical Documents source of truth — NO duplicate storage ───────
test('FI-5: upload writes the canonical documents record + governed link RPCs (no new storage)', () => {
  // FinancialUploadModal inserts into the documents table (canonical) on the secure-docs bucket
  assert.match(COMP, /storage\.from\('secure-docs'\)\.upload/)
  assert.match(COMP, /from\('documents'\)\.insert\(/)
  // and links the requirement via the governed RPCs (document_link / document_replace)
  assert.match(COMP, /supabase\.rpc\('document_link', \{/)
  assert.match(COMP, /supabase\.rpc\('document_replace', \{/)
  // no competing repository (completed-work / completed_documents) anywhere in Compliance
  assert.doesNotMatch(COMP, /completed-work|completed_documents/)
})

// ── 8,9. Status derivation + actions when a document exists ────────────────────
test('FI-6: row status derives from real financials_tracker state; Manage exposes View/Replace/History', () => {
  // status badge maps the real tracker status (Not Uploaded / Uploaded / Reviewed) — not "file exists = Filed"
  assert.match(COMP, /status==='Not Uploaded'\?'Not Started':r\.status==='Uploaded'\?'Filed':r\.status==='Reviewed'\?'Filed'/)
  // the drawer (reused) provides the supported actions via governed RPCs
  assert.match(DRAWER, /document_link|linkDocument/)
  assert.match(DRAWER, /replaceDocument|document_replace/)
  assert.match(DRAWER, /archiveDocument|document_archive/)
  assert.match(DRAWER, /Previous versions/)   // History
})

// ── 13,14. Readiness clears / failure never falsely completes ─────────────────
test('FI-7: replace keeps financials_tracker in sync (readiness clears for the exact requirement)', () => {
  assert.match(COMP, /p_sync_financials: true/)
  assert.match(COMP, /p_requirement_ref_type: 'financials', p_requirement_ref_id: row\.id/)
})
test('FI-8: an upload / record / link failure does not falsely complete the requirement', () => {
  // each step checks its error and bails (setErr + return) before the tracker is marked uploaded
  assert.match(COMP, /if \(upErr\) \{[\s\S]*?setErr\([\s\S]*?setUploading\(false\); return \}/)
  assert.match(COMP, /if \(docErr\) \{[\s\S]*?remove\(\[path\]\)[\s\S]*?setUploading\(false\); return \}/)
  assert.match(COMP, /if \(repErr\) \{[\s\S]*?setErr\([\s\S]*?setUploading\(false\); return \}/)
})

// ── 15. Permission gates preserved (not widened) ──────────────────────────────
test('FI-9: upload is gated by the existing canUploadDocument role helper (not widened)', () => {
  assert.match(COMP, /const canUpload = canUploadDocument\(documentRole\(user\)\)/)
  assert.match(COMP, /canUpload \? <button onClick=\{\(\) => setFinUpload/)
  // Manage (view/replace) is available whenever a document exists; the drawer itself gates mutations
  assert.match(DRAWER, /canManageDocument/)
})
