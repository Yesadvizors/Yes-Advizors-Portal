/**
 * Package 2 — Documents × Compliance operating model. node:test.
 * Unit tests for pure helpers + static source guards (OD-5 style) proving the operating
 * flow is wired to the ONE canonical model (secure-docs + documents + document_requirements
 * + governed RPCs) with no competing repository. RLS/storage remain authoritative.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { suggestDocType, summariseReadiness, sha256Hex, REQUIREMENT_TYPES } from '../src/lib/documentReadiness.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const BULK   = strip(read('src/components/BulkUploadModal.jsx'))
const DRAWER = strip(read('src/components/ManageDocumentsDrawer.jsx'))
const HUB    = strip(read('src/components/DocumentsHub.jsx'))
const MISSING = strip(read('src/components/MissingDocumentsPanel.jsx'))
const COMP   = read('src/components/Compliance.jsx')          // raw (image/* comment breaks strip)
const MFM    = strip(read('src/components/MarkFiledModal.jsx'))
const C360   = strip(read('src/components/client360/Client360Workspace.jsx'))
const READS  = strip(read('src/services/client360Reads.js'))
const APP    = strip(read('src/App.jsx'))
const BENTO  = strip(read('src/bento/BentoApp.jsx'))
const CHAT   = read('src/components/ChatAgent.jsx')
const MIG    = read('supabase/migrations/0032_pkg2_requirement_document_readiness_view.sql')

// ── Pure helpers ─────────────────────────────────────────────────────────────
test('PKG2-classify: filename → doc_type SUGGESTIONS (never authoritative)', () => {
  assert.equal(suggestDocType('Audited Balance Sheet FY26.pdf'), 'Audited Balance Sheet')
  assert.equal(suggestDocType('ITR-V acknowledgement.pdf'), 'ITR Acknowledgement')
  assert.equal(suggestDocType('Tax Audit 3CD.pdf'), 'Tax Audit Report (TAR)')
  assert.equal(suggestDocType('random-scan-8842.pdf'), null) // unknown → no false authority
})
test('PKG2-readiness-summary: available/missing counts', () => {
  const r = summariseReadiness([{ is_available: true }, { is_available: false }, { is_available: false }])
  assert.deepEqual(r, { total: 3, available: 1, missing: 2 })
  assert.deepEqual(summariseReadiness([]), { total: 0, available: 0, missing: 0 })
})
test('PKG2-hash: SHA-256 content hash for dedup (browser crypto.subtle)', async () => {
  const hash = await sha256Hex(new Blob(['hello world']))
  assert.equal(hash, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
  assert.equal(await sha256Hex(null), null)
})
test('PKG2-reftypes: linkable set excludes llp/payroll', () => {
  assert.ok(REQUIREMENT_TYPES.includes('financials') && REQUIREMENT_TYPES.includes('gst'))
  assert.ok(!REQUIREMENT_TYPES.includes('llp') && !REQUIREMENT_TYPES.includes('payroll'))
})

// ── Multi-file bulk upload (Parts 2/3/4) ─────────────────────────────────────
test('PKG2-1..5,10: bulk uploader — multi-select, queue, batch FY, classify, retry, dedup', () => {
  assert.match(BULK, /type="file" multiple/)                 // 1: multi-select
  assert.match(BULK, /onDrop=/)                              // drag & drop
  assert.match(BULK, /const \[items, setItems\]/)           // 2: per-file queue
  assert.match(BULK, /fy_label: fyLabel \|\| null/)         // 3: batch FY applies to all files
  assert.match(BULK, /suggestDocType\(file\.name\)/)        // 4: classification suggestion
  assert.match(BULK, /Retry failed/)                        // 5: retry
  assert.match(BULK, /it\.status !== 'done'/)               // 5: retry re-runs only unsent files
  assert.match(BULK, /findByContentHash/)                   // 10: duplicate awareness
  assert.match(BULK, /Upload as New|Use Existing/)          // 10: dedup choices
  assert.match(BULK, /content_hash: it\.hash/)              // hash persisted
  assert.match(BULK, /canUploadDocument/)                   // gated
})

// ── Manage Documents drawer + governed actions (Parts 7/8/9/20/21) ───────────
test('PKG2-19..21: Manage Documents uses governed link/replace/archive; read-only branch', () => {
  assert.match(DRAWER, /Previous versions/)                            // 9: version history
  assert.match(DRAWER, /useExisting/)                                  // 8/20: use existing
  assert.match(DRAWER, /linkDocument\(\{ refType/)                     // 20: Use Existing → link
  assert.match(DRAWER, /replaceDocument\(\{ refType/)                  // 21: Replace → replace
  assert.match(DRAWER, /archiveDocument\(current\.id\)/)              // archive current
  assert.match(DRAWER, /read-only access/)                            // read roles: no mutation
  assert.match(DRAWER, /canManageDocument/)
})

// ── Compliance readiness (Parts 6/15/16/22/23) ───────────────────────────────
test('PKG2-16..18,22,23: Compliance readiness is canonical + separate from status', () => {
  assert.match(COMP, /fetchReadiness\(\{ clientId, fyLabel: fy, refType: 'financials' \}\)/)
  assert.match(COMP, /Document Readiness/)                            // readiness column added
  assert.match(COMP, /readyMap\[r\.id\]\?\.is_available/)             // 16/17: available vs missing from current links
  assert.match(COMP, /Manage Documents/)                             // 7/15: Manage Documents action
  // 22: no competing repository — Compliance still uses secure-docs + documents only
  assert.doesNotMatch(COMP, /completed-work|completed_documents/)
  // 23: compliance-truth helpers untouched
  assert.match(COMP, /isComplianceOverdue, isComplianceClosed, isComplianceCompleted/)
  // readiness must not gate the tab (error handled, not thrown)
  assert.match(COMP, /readiness stays unknown/)
})
test('PKG2-24: MarkFiled links the filed document to its exact requirement (proven only)', () => {
  assert.match(MFM, /LINKABLE_REFTYPES = \['gst', 'income_tax', 'tds', 'roc', 'audit'\]/)
  assert.match(MFM, /linkDocument\(\{ refType: trackerType, refId: record\.id/)
  assert.match(MFM, /LINKABLE_REFTYPES\.includes\(trackerType\)/)     // never fabricates llp/trust links
})

// ── Missing view + Task (Parts 11/12) ────────────────────────────────────────
test('PKG2-11,12: Missing view is requirement-specific; Create Task uses existing fields', () => {
  assert.match(MISSING, /fetchReadiness\(\{ missingOnly: true \}\)/)  // 11: requirement-specific, not zero-docs
  assert.match(MISSING, /from\('tasks'\)\.insert/)                    // 12: create task
  assert.match(MISSING, /work_type: 'Document Collection'/)
  assert.match(HUB, /Missing Documents/)                             // entry point in Documents hub
  assert.match(HUB, /<MissingDocumentsPanel/)
})

// ── Archived / history (Part 10) ─────────────────────────────────────────────
test('PKG2-6,7: archived hidden by default; visible via Show archived', () => {
  assert.match(HUB, /showArchived \? docs : docs\.filter\(d => d\.is_current !== false\)/)
  assert.match(HUB, /Show archived/)
  assert.match(HUB, /Archived<\/span>/)                              // archived badge
  assert.match(HUB, /<BulkUploadModal/)                             // bulk uploader wired
})

// ── Permissions (Parts #11-15 already in documentAccessPkg01; spot-check gating here) ──
test('PKG2-perm: bulk upload + manage gated by role helpers', () => {
  assert.match(BULK, /if \(!canUpload\)/)
  assert.match(DRAWER, /canManage &&/)
})

// ── Client 360 readiness (Part 13/26) ────────────────────────────────────────
test('PKG2-26: Client 360 readiness card uses canonical requirement data (not zero-docs)', () => {
  assert.match(C360, /readiness: \(\(\) => \{/)                       // readiness summary computed
  assert.match(C360, /summaries\.readiness\.missing/)                // Missing card = requirement-based
  assert.doesNotMatch(C360, /documents\.hasNone \? 'Yes'/)           // old zero-docs definition removed
  assert.match(READS, /v_requirement_document_readiness/)            // read-only view read added
  assert.match(READS, /readClientReadinessWith/)
})

// ── AI honesty (Part 20/27) ──────────────────────────────────────────────────
test('PKG2-27: AI assistant is gated + makes no false "online/powered" claim', () => {
  assert.match(APP, /aiAssistantEnabled\(import\.meta\.env\.VITE_AI_ENABLED\) && <ChatAgent/)
  assert.match(BENTO, /aiAssistantEnabled\(import\.meta\.env\.VITE_AI_ENABLED\)/)
  assert.doesNotMatch(CHAT, /Online · Live data access/)
  assert.doesNotMatch(CHAT, /Powered by Claude AI · Live/)
})

// ── Readiness contract (Part 1) — current links only ─────────────────────────
test('PKG2-1backend: readiness view counts only CURRENT links + CURRENT documents', () => {
  assert.match(MIG, /security_invoker = on/)
  assert.match(MIG, /dr\.is_current = true/)                         // link must be current
  assert.match(MIG, /d\.id = dr\.document_id and d\.is_current = true/) // document must be current
  assert.match(MIG, /case when d\.id is not null then 'Available' else 'Missing'/)
})

// ── No competing repository across the new surfaces ──────────────────────────
test('PKG2-nodup: new document surfaces use ONLY secure-docs + documents', () => {
  for (const [name, src] of [['bulk', BULK], ['drawer', DRAWER], ['missing', MISSING]]) {
    assert.doesNotMatch(src, /completed-work|completed_documents/, `${name} must not use a competing repository`)
  }
  assert.match(BULK, /const BUCKET = 'secure-docs'/)
  assert.match(DRAWER, /const BUCKET = 'secure-docs'/)
})
