/**
 * Package 0/1 frontend alignment — document permission model + governed actions.
 * Mirrors the already-live backend contract (secure-docs RLS + document_* RPCs).
 *
 * Unit tests exercise the shared permission helper; static source guards (OD-5 style)
 * prove each authorised surface consumes it and routes destructive/replace actions
 * through the governed RPCs. RLS/storage remain the real enforcement boundary.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  canViewDocument, canUploadDocument, canManageDocument, canPhysicallyDeleteDocument,
  documentRole, DOC_VIEW_ROLES, DOC_UPLOAD_ROLES, DOC_DELETE_ROLES,
} from '../src/lib/documentAccess.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const MGR   = strip(read('src/components/DocumentManager.jsx'))
const HUB   = strip(read('src/components/DocumentsHub.jsx'))
const DVIEW = strip(read('src/bento/modules/DocumentsBentoView.jsx'))
const MFM   = strip(read('src/components/MarkFiledModal.jsx'))
const OBW   = strip(read('src/components/OnboardingWizard.jsx'))
// Compliance.jsx contains a legacy comment with "image/*", whose "/*" makes the naive
// strip() swallow a large span. Assert Compliance against RAW source — the patterns below
// are real code (they do not appear verbatim in comments), so raw matching is exact.
const COMP  = read('src/components/Compliance.jsx')

const ROLES = ['Admin', 'Manager', 'Executive', 'Staff', 'Viewer']

// ── Helper: the permission model itself ──────────────────────────────────────
test('PKG01-1: Staff and Viewer cannot upload; the model is exactly A/M/E', () => {
  assert.equal(canUploadDocument('Staff'), false)
  assert.equal(canUploadDocument('Viewer'), false)
  assert.deepEqual(DOC_UPLOAD_ROLES, ['Admin', 'Manager', 'Executive'])
})
test('PKG01-2: Executive CAN upload', () => {
  assert.equal(canUploadDocument('Executive'), true)
  assert.equal(canUploadDocument('Admin'), true)
  assert.equal(canUploadDocument('Manager'), true)
})
test('PKG01-3: Executive CANNOT physically delete', () => {
  assert.equal(canPhysicallyDeleteDocument('Executive'), false)
  assert.equal(canPhysicallyDeleteDocument('Staff'), false)
  assert.equal(canPhysicallyDeleteDocument('Viewer'), false)
})
test('PKG01-4: only Admin and Manager can physically delete', () => {
  assert.equal(canPhysicallyDeleteDocument('Admin'), true)
  assert.equal(canPhysicallyDeleteDocument('Manager'), true)
  assert.deepEqual(DOC_DELETE_ROLES, ['Admin', 'Manager'])
})
test('PKG01-5: archive (manage) available to Admin/Manager/Executive only', () => {
  assert.deepEqual(ROLES.filter(canManageDocument), ['Admin', 'Manager', 'Executive'])
})
test('PKG01-9: every role (incl. Viewer/Staff) can View/Download', () => {
  assert.deepEqual(DOC_VIEW_ROLES, ROLES)
  assert.equal(canViewDocument('Viewer'), true)
  assert.equal(canViewDocument('Staff'), true)
})
test('PKG01: unknown/absent role is default-deny for write actions', () => {
  assert.equal(documentRole({}), null)
  assert.equal(documentRole({ portal_role: 'Executive' }), 'Executive')
  for (const fn of [canUploadDocument, canManageDocument, canPhysicallyDeleteDocument]) {
    assert.equal(fn(null), false)
    assert.equal(fn(undefined), false)
  }
})

// ── DocumentManager (client/director documents) ──────────────────────────────
test('PKG01-DM: upload gated by canUpload; archive→document_archive; physical delete gated', () => {
  assert.match(MGR, /from '\.\.\/lib\/documentAccess'/)
  assert.match(MGR, /const canUpload = canUploadDocument\(role\)/)
  assert.match(MGR, /\{canUpload && \(/)                                   // upload bar hidden for non-uploaders
  assert.match(MGR, /supabase\.rpc\('document_archive', \{ p_document_id: d\.id \}\)/)
  assert.match(MGR, /canManage && <button onClick=\{\(\)=>archiveDoc\(d\)\}/)
  assert.match(MGR, /canDelete && <button onClick=\{\(\)=>deleteDoc\(d\)\}/)
  assert.match(MGR, /if \(delErr\)/)                                        // physical-delete error check preserved
  assert.match(MGR, /cannot be undone/)                                     // destructive confirmation
  assert.match(MGR, /is_current !== false/)                                 // archived hidden from view
})

// ── DocumentsHub (main register) + Bento surface (point 10) ──────────────────
test('PKG01-DH: upload/delete gated, governed archive, caps passed to Bento view', () => {
  assert.match(HUB, /from '\.\.\/lib\/documentAccess'/)
  assert.match(HUB, /\{canUpload && <button className="dh-up"/)
  assert.match(HUB, /supabase\.rpc\('document_archive', \{ p_document_id: d\.id \}\)/)
  assert.match(HUB, /canManage &&[^\n]*<button className="dh-ibtn" title="Archive/)
  assert.match(HUB, /canDelete && <button className="dh-ibtn del"/)
  assert.match(HUB, /onArchive=\{archiveDoc\}/)
  assert.match(HUB, /canUpload=\{canUpload\} canManage=\{canManage\} canDelete=\{canDelete\}/)
  assert.match(HUB, /cannot be undone/)
})
test('PKG01-10: Bento Documents view inherits the same rules', () => {
  assert.match(DVIEW, /canUpload = false, canManage = false, canDelete = false/) // default-deny props
  assert.match(DVIEW, /\{canUpload && <PrimaryButton/)
  assert.match(DVIEW, /canManage && <IconButton label="Archive/)
  assert.match(DVIEW, /canDelete && <IconButton label="Delete/)
  assert.doesNotMatch(DVIEW, /supabase/i)   // still presentational only
})

// ── Compliance financial replace → governed document_replace (point 7) ───────
test('PKG01-7: Compliance financial replace routes through document_link + document_replace', () => {
  assert.match(COMP, /from '\.\.\/lib\/documentAccess'/)
  assert.match(COMP, /supabase\.rpc\('document_replace', \{/)
  assert.match(COMP, /supabase\.rpc\('document_link', \{/)
  assert.match(COMP, /p_sync_financials: true/)
  assert.match(COMP, /p_requirement_ref_type: 'financials'/)
  // upload trigger + replace file input gated for non-uploaders
  assert.match(COMP, /\(canUpload \|\| r\.document_id\)/)
  assert.match(COMP, /const canUpload = canUploadDocument\(documentRole\(user\)\)/)
})
test('PKG01-8: compliance TRUTH logic untouched (status/due/overdue/runner/extraction)', () => {
  // Same compliance-truth helpers still imported and unchanged.
  assert.match(COMP, /import \{ complianceDateMeta, isComplianceOverdue, isComplianceClosed, isComplianceCompleted \} from '\.\.\/lib\/compliance'/)
  // The financial save still writes ONLY the document pointer + existing metadata to the
  // tracker (no new due-date/overdue/status-machine mutation was introduced).
  assert.match(COMP, /from\('financials_tracker'\)\.update\(upd\)\.eq\('id', row\.id\)/)
  assert.doesNotMatch(COMP, /upd\.due_date/)
  assert.doesNotMatch(COMP, /upd\.workflow_stage/)
})

// ── MarkFiledModal + OnboardingWizard upload visibility ──────────────────────
test('PKG01-MFM: mark-filed attachment controls gated by canUpload', () => {
  assert.match(MFM, /from '\.\.\/lib\/documentAccess'/)
  assert.match(MFM, /const canUpload = canUploadDocument\(documentRole\(user\)\)/)
  assert.match(MFM, /\{canUpload && \(/)                       // "Attach Documents" block gated
})
test('PKG01-OBW: onboarding attach controls gated via DocUpload context (OCR left intact)', () => {
  assert.match(OBW, /from '\.\.\/lib\/documentAccess'/)
  assert.match(OBW, /const DocUploadCtx = createContext\(true\)/)
  assert.match(OBW, /<DocUploadCtx\.Provider value=\{canUploadDocs\}>/)
  assert.match(OBW, /const canUpload = useContext\(DocUploadCtx\)/)
  assert.match(OBW, /if \(!canUpload && !file\) return null/)
  assert.match(OBW, /scanDocument/)   // OCR scan path still present (untouched)
})
