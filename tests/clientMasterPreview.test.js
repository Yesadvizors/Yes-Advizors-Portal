/**
 * P2.1 — READ-ONLY Client Master Preview. Targeted tests.
 *
 *   npm test   (node:test — built in; no new dependency)
 *
 * Unit tests cover the pure logic (masking + role gate + entry visibility). Static
 * source scans prove the read-only / scope guarantees that cannot be unit-rendered
 * without a DOM test runner (none is present in this repo), following the existing
 * "STATIC:" convention in tests/aadhaar.test.js and tests/compliance.test.js.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  maskIdValue,
  isAdminOrManagerRole,
  previewEntryVisible,
} from '../src/lib/clientMaster.js'

// ---- helpers ---------------------------------------------------------------
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const norm = (s) => s.replace(/\s+/g, ' ')

const P21_FILES = [
  '../src/services/clientMasterReads.js',
  '../src/hooks/useClientMasterRole.js',
  '../src/lib/clientMaster.js',
  '../src/components/preview/ClientMasterPreview.jsx',
  '../src/components/preview/sections/PersonsSection.jsx',
  '../src/components/preview/sections/IdentifiersSection.jsx',
  '../src/components/preview/sections/ContactsSection.jsx',
  '../src/components/preview/sections/AddressesSection.jsx',
  '../src/components/preview/sections/RegistrationsGstSection.jsx',
  '../src/components/preview/sections/RelationshipsSection.jsx',
]

// ===========================================================================
// 1. Role gate
// ===========================================================================
test('role gate: Admin and Manager pass', () => {
  assert.equal(isAdminOrManagerRole({ portal_role: 'Admin' }), true)
  assert.equal(isAdminOrManagerRole({ portal_role: 'Manager' }), true)
  assert.equal(isAdminOrManagerRole({ is_admin: true }), true)
  assert.equal(isAdminOrManagerRole({ is_admin: true, portal_role: 'Staff' }), true)
})

test('role gate: Staff / Executive / Viewer fail', () => {
  for (const portal_role of ['Staff', 'Executive', 'Viewer', 'Intern', 'Client']) {
    assert.equal(isAdminOrManagerRole({ portal_role, is_admin: false }), false, portal_role)
  }
  assert.equal(isAdminOrManagerRole(null), false)
  assert.equal(isAdminOrManagerRole(undefined), false)
  assert.equal(isAdminOrManagerRole({}), false)
})

// ===========================================================================
// 2. Feature flag OFF hides the Preview entry
// ===========================================================================
test('entry visibility: flag must be exactly "true" AND Admin/Manager', () => {
  const admin = { portal_role: 'Admin' }
  assert.equal(previewEntryVisible('true', admin), true)
  assert.equal(previewEntryVisible('true', { portal_role: 'Manager' }), true)
  // Flag OFF / unset / other value -> hidden even for Admin.
  assert.equal(previewEntryVisible(undefined, admin), false)
  assert.equal(previewEntryVisible('false', admin), false)
  assert.equal(previewEntryVisible('', admin), false)
  assert.equal(previewEntryVisible('1', admin), false)
  // Flag ON but non-Admin/Manager -> hidden.
  assert.equal(previewEntryVisible('true', { portal_role: 'Staff' }), false)
  assert.equal(previewEntryVisible('true', { portal_role: 'Viewer' }), false)
  assert.equal(previewEntryVisible('true', null), false)
})

test('STATIC: Clients.jsx gates the entry via previewEntryVisible(flag, user) and default is OFF', () => {
  const src = read('../src/components/Clients.jsx')
  assert.match(norm(src), /const previewEnabled = previewEntryVisible\(import\.meta\.env\.VITE_P2_PREVIEW, user\)/)
  // The button and the modal are both gated by previewEnabled.
  assert.match(norm(src), /\{previewEnabled && \(/)
  assert.match(norm(src), /\{previewEnabled && previewClient && \(/)
  // .env.example ships the flag commented/OFF.
  const env = read('../.env.example')
  assert.match(env, /# VITE_P2_PREVIEW=false/)
  assert.ok(!/^\s*VITE_P2_PREVIEW\s*=\s*true/m.test(env), 'flag must not be enabled in .env.example')
})

// ===========================================================================
// 3. clients.id UUID is the only relational key
// ===========================================================================
test('STATIC: reads key on clients.id uuid (eq client_id / in registration_id); never the YA-code', () => {
  const reads = stripComments(read('../src/services/clientMasterReads.js'))
  // Five client-keyed reads use eq('client_id', clientId); GST keys on registration_id.
  assert.equal((reads.match(/\.eq\('client_id',\s*clientId\)/g) || []).length, 5)
  assert.match(reads, /\.in\('registration_id',\s*registrationIds\)/)
  // No read may be keyed on the YA-code (clientCode) or on the text client_id string.
  assert.ok(!/clientCode/.test(reads), 'reads must not reference the YA-code clientCode')
})

test('STATIC: container and Clients.jsx thread the UUID (clients.id) as clientId', () => {
  const prev = norm(read('../src/components/preview/ClientMasterPreview.jsx'))
  for (const S of ['PersonsSection', 'IdentifiersSection', 'ContactsSection', 'AddressesSection', 'RegistrationsGstSection']) {
    assert.match(prev, new RegExp(`<${S} clientId=\\{clientId\\}`), S)
  }
  const clients = norm(read('../src/components/Clients.jsx'))
  assert.match(clients, /clientId=\{previewClient\.id\}/)          // uuid
  assert.match(clients, /clientCode=\{previewClient\.client_id\}/) // YA-code is display-only
})

// ===========================================================================
// 4. Zero insert/update/upsert/delete/rpc calls in P2.1 code
// ===========================================================================
test('STATIC: no insert/update/upsert/delete/rpc call anywhere in P2.1 code', () => {
  const bad = /\.(insert|update|upsert|delete|rpc)\s*\(/
  for (const f of P21_FILES) {
    const code = stripComments(read(f))
    assert.ok(!bad.test(code), `mutation call found in ${f}`)
  }
})

// ===========================================================================
// 5. Identifier values render masked
// ===========================================================================
test('maskIdValue reveals only the last four characters', () => {
  assert.equal(maskIdValue('ABCDE1234F'), '••••••234F')
  assert.equal(maskIdValue('27ABCDE1234F1Z5').slice(-4), 'F1Z5')
  assert.ok(!maskIdValue('27ABCDE1234F1Z5').includes('27ABCDE'))
  assert.ok(!maskIdValue('ABCDE1234F').includes('ABCDE'))
  assert.equal(maskIdValue('AB12'), '••••')     // <=4 chars: fully masked
  assert.equal(maskIdValue('X'), '•')
  assert.equal(maskIdValue(''), null)
  assert.equal(maskIdValue('   '), null)
  assert.equal(maskIdValue(null), null)
  // property: for any longer value, the raw value never appears in the output
  const raw = 'AAAAA0000A'
  assert.ok(!maskIdValue(raw).includes(raw))
})

test('STATIC: IdentifiersSection renders id_value ONLY through maskIdValue (no raw, no copy/tooltip)', () => {
  const src = read('../src/components/preview/sections/IdentifiersSection.jsx')
  assert.match(norm(src), /render: \(r\) => maskIdValue\(r\.id_value\)/)
  // every read of r.id_value must be inside maskIdValue(...)
  const all = (src.match(/r\.id_value/g) || []).length
  const masked = (src.match(/maskIdValue\(r\.id_value\)/g) || []).length
  assert.equal(all, masked, 'r.id_value must never be rendered raw')
  // no copy action / raw tooltip / JSON dump in the preview UI
  const prev = stripComments(read('../src/components/preview/ClientMasterPreview.jsx'))
  assert.ok(!/clipboard|navigator\.clipboard|onCopy|JSON\.stringify|title=\{.*id_value/.test(prev))
})

// ===========================================================================
// 6. No Aadhaar field/type renders
// ===========================================================================
test('STATIC: no Aadhaar reference in P2.1 preview/service code (comments stripped)', () => {
  for (const f of P21_FILES) {
    const code = stripComments(read(f))
    assert.ok(!/aadhaar/i.test(code), `Aadhaar reference in ${f}`)
    assert.ok(!/uidai/i.test(code), `UIDAI reference in ${f}`)
    assert.ok(!/'AADHAAR'/.test(code), `AADHAAR identifier type in ${f}`)
  }
})

// ===========================================================================
// 7. One section failure does not block the others
// ===========================================================================
test('STATIC: sections load independently and errors are isolated per section', () => {
  const prev = read('../src/components/preview/ClientMasterPreview.jsx')
  // The generic ReadSection owns its own loading/error/empty state and CATCHES rejections.
  assert.match(prev, /function ReadSection\(/)
  assert.match(prev, /\.catch\(/)
  assert.match(prev, /error:/)
  // All six sections are rendered as independent siblings in the container.
  const n = norm(prev)
  for (const S of ['PersonsSection', 'IdentifiersSection', 'ContactsSection', 'AddressesSection', 'RegistrationsGstSection', 'RelationshipsSection']) {
    assert.match(n, new RegExp(`<${S} `), S)
  }
  // Registrations/GST tracks its two loads separately (a GST failure keeps registrations).
  const rg = read('../src/components/preview/sections/RegistrationsGstSection.jsx')
  assert.match(rg, /setReg\(/)
  assert.match(rg, /setGst\(/)
  assert.match(rg, /\.catch\(/)
})

// ===========================================================================
// 8. No compliance / tracker / calendar / FY call introduced
// ===========================================================================
test('STATIC: no compliance/tracker/calendar/FY/generation call in P2.1 code', () => {
  const forbidden = /(generate_client_compliance|runComplianceSetup|complianceRunner|_tracker|compliance_calendar|financialYear|fyCoverage|activate_accounting_service)/
  for (const f of P21_FILES) {
    const code = stripComments(read(f))
    assert.ok(!forbidden.test(code), `compliance/tracker/FY reference in ${f}`)
  }
})
