/**
 * Audit Log — Bento shell integration + security preservation. node:test.
 * The existing hardened AuditLog is surfaced (admin-only) in the Bento shell,
 * reusing the EXISTING `get_sensitive_audit_logs` RPC unchanged. No DB change.
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

const MOCK = strip(read('src/bento/mock/bentoMock.js'))
const SHELL = strip(read('src/bento/BentoShell.jsx'))
const APP = strip(read('src/bento/BentoApp.jsx'))
const AUDIT = strip(read('src/components/AuditLog.jsx'))

test('AL-1: Audit Log is registered in the Bento nav under the Admin group', () => {
  assert.match(MOCK, /\{ id: 'auditlog', label: 'Audit Log', adminOnly: true \}/)
  // it lives in the Admin group, not as a loose top-level item
  assert.match(MOCK, /id: 'grp-admin', label: 'Admin'[\s\S]*?auditlog/)
})
test('AL-2/13: Audit Log is admin-only — hidden from the sidebar for non-admins', () => {
  // grouped nav: adminOnly items are filtered out for non-admins, and empty groups dropped
  assert.match(SHELL, /const visibleGroups = \(isAdmin\) =>/)
  assert.match(SHELL, /items: g\.items\.filter\(it => !it\.adminOnly \|\| isAdmin\)/)
  assert.match(SHELL, /\{visibleGroups\(user\?\.is_admin\)\.map/)
})
test('AL-3: BentoApp mounts AuditLog as an admin-gated module', () => {
  assert.match(APP, /const AuditLog\s*=\s*lazy\(\(\) => import\('\.\.\/components\/AuditLog'\)\)/)
  assert.match(APP, /auditlog:\s*\{ Comp: AuditLog, admin: true \}/)
  // the admin gate renders Restricted for non-admins (existing mechanism)
  assert.match(APP, /if \(mod\.admin && !activeUser\?\.is_admin\) return <Restricted/)
})
test('AL-4: uses the EXISTING audit RPC unchanged (no new backend contract)', () => {
  assert.match(AUDIT, /supabase\.rpc\('get_sensitive_audit_logs', \{/)
  assert.match(AUDIT, /p_from,\s*\n\s*p_to,/)
  assert.match(AUDIT, /p_page_number: targetPage/)
  assert.match(AUDIT, /p_page_size:\s*currentPageSize/)
  assert.match(AUDIT, /p_risk_tier:\s*currentRiskTier \|\| null/)
})
test('AL-14: security masking preserved — no full UUIDs / secrets / raw errors', () => {
  assert.match(AUDIT, /function truncUUID\(/)         // UUIDs truncated to 8 chars
  assert.match(AUDIT, /function isSensitiveMetaKey\(/) // sensitive keys masked
  assert.match(AUDIT, /'\[masked\]'/)
  assert.match(AUDIT, /function classifyRpcError\(/)   // no raw postgres messages to DOM
  assert.doesNotMatch(AUDIT, /dangerouslySetInnerHTML/)
  // client_uuid is never rendered; only the snapshot code is shown
  assert.match(AUDIT, /client_code_snapshot/)
})
test('AL-permission: audit view has its own admin UX gate (defence in depth)', () => {
  assert.match(AUDIT, /const isAdmin = user\?\.is_admin === true/)
  assert.match(AUDIT, /if \(!isAdmin\) \{[\s\S]*?Restricted/)
})
