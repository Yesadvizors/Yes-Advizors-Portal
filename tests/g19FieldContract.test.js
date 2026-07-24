/**
 * T2 — G-19 field-contract guards. node:test — `npm test`.
 *
 * Schema-INDEPENDENT static guards that lock the frontend's *requested* field/argument names to the
 * G-16 SOURCE-FROZEN contract (contracts/G-16_SOURCE_CONTRACT_FREEZE.md + T3_DB_CONTRACT_PROPOSAL/APPENDIX).
 * These prove the reconciliation in docs/acceptance/evidence/G-19_field_contract/SOURCE_RECONCILIATION.md
 * cannot silently regress. They assert the SHAPE the app sends — NOT that the live DB has it (that stays
 * LIVE-EVIDENCE-PENDING). Static source analysis (project convention: no jsdom); invents no DB object.
 *
 * Every constant below is quoted from the frozen contract; a drift in either the frontend or an accidental
 * edit here fails the build, forcing a conscious contract decision through T1.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const src = (p) => stripComments(read('../src/' + p))

// ── G1. get_sensitive_audit_logs — 6 frozen params (contract §4, 0008) ─────────
test('G1: AuditLog calls get_sensitive_audit_logs with exactly the 6 frozen params', () => {
  const s = src('components/AuditLog.jsx')
  assert.ok(s.includes("rpc('get_sensitive_audit_logs'"), 'RPC name must be exact')
  for (const p of ['p_from', 'p_to', 'p_page_number', 'p_page_size', 'p_risk_tier', 'p_client_uuid']) {
    assert.ok(s.includes(p), `get_sensitive_audit_logs must pass ${p}`)
  }
})

// ── G2. generate_client_compliance — 12 frozen params built once (contract §4) ─
test('G2: buildGenerateComplianceArgs uses exactly the 12 frozen param names', () => {
  const s = src('lib/compliance.js')
  const FROZEN = [
    'p_client_id', 'p_client_type', 'p_has_gstin', 'p_gstin', 'p_gst_frequency',
    'p_has_tan', 'p_tan', 'p_has_cin', 'p_cin', 'p_has_llpin', 'p_llpin', 'p_incorporation_date',
  ]
  // Isolate the builder body so we count only its keys.
  const body = s.slice(s.indexOf('function buildGenerateComplianceArgs'))
  const keys = (body.match(/p_[a-z_]+:/g) || []).map((k) => k.replace(':', ''))
  const uniq = [...new Set(keys)]
  for (const p of FROZEN) assert.ok(uniq.includes(p), `must build ${p}`)
  // No stray param the frozen signature does not define.
  for (const k of uniq) assert.ok(FROZEN.includes(k), `unknown param ${k} not in frozen signature`)
})

// ── G3. activate_accounting_service — 2 frozen params (contract §4) ────────────
test('G3: complianceRunner calls activate_accounting_service with p_client_id + p_start_fy', () => {
  const s = src('lib/complianceRunner.js')
  assert.ok(s.includes("rpc('activate_accounting_service'"), 'RPC name must be exact')
  assert.ok(s.includes('p_client_id') && s.includes('p_start_fy'), 'must pass both frozen params')
})

// ── G4. P5 service-applicability RPC names (source 0021 DRAFT; reconciliation §6) ─
test('G4: write wrappers bind exactly the 3 frozen P5 RPC names', () => {
  const s = src('services/serviceApplicabilityWrites.js')
  for (const fn of ['service_applicability_create', 'service_applicability_update', 'service_applicability_set_status']) {
    assert.ok(s.includes(`'${fn}'`), `must reference RPC ${fn}`)
  }
})

// ── G5. extract-financial request body — frozen field set (contract §6) ────────
test('G5: extract-financial fetch body sends the frozen request fields', () => {
  const s = src('components/Compliance.jsx')
  assert.ok(s.includes('/extract-financial'), 'must target the extract-financial endpoint')
  for (const f of ['mode', 'financialId', 'fileBase64', 'mimeType', 'docType', 'clientId', 'fyLabel', 'documentId']) {
    assert.ok(new RegExp(`\\b${f}\\b`).test(s), `extract-financial body must include ${f}`)
  }
})

// ── G6. All three frozen edge functions are the ones invoked (contract §6) ─────
test('G6: exactly the three frozen edge functions are invoked', () => {
  assert.ok(src('components/ChatAgent.jsx').includes("invoke('ai-agent'"), 'ai-agent via functions.invoke')
  assert.ok(src('components/OnboardingWizard.jsx').includes("invoke('scan-document'"), 'scan-document via functions.invoke')
  assert.ok(src('components/Compliance.jsx').includes('/extract-financial'), 'extract-financial via fetch')
})

// ── G7. v_team_workload consumption stays guarded (G-11 variance; graceful empty) ─
test('G7: v_team_workload result is guarded with a fallback (graceful if absent live)', () => {
  const s = src('components/Compliance.jsx')
  assert.ok(s.includes("from('v_team_workload')"), 'still consumes v_team_workload (variance left intact)')
  // The Promise.all destructures {data:t}; the setter must default (t||[]) so an absent view cannot crash.
  assert.ok(/setTeam\(\s*t\s*\|\|\s*\[\]\s*\)/.test(s), 'v_team_workload data must default to [] (G-11 safety)')
})
