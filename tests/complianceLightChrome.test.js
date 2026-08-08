/**
 * Compliance — Phase 1 light-chrome guard. node:test.
 *
 * PJ decision: DEFER the deep re-skin; apply light, additive, logic-free chrome only.
 * These guards assert the change is purely presentational and cannot alter behaviour:
 *   CL-1  `bento` prop is optional and additive (defaults off → legacy behaviour).
 *   CL-2  chrome only re-colours the header/tab via shell tokens.
 *   CL-3  compliance-truth is untouched — trackers/views + extraction path still present,
 *         no new writes/RPCs introduced by the chrome.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const SRC = read('src/components/Compliance.jsx')

test('CL-1: bento prop is optional/additive on the top-level component', () => {
  assert.match(SRC, /export default function Compliance\(\{ user, bento \}\)/)
})

test('CL-2: chrome only re-colours header + active tab via shell tokens', () => {
  assert.match(SRC, /bento \? \{ fontSize:24, fontWeight:700, color:'var\(--b-text\)' \}/)
  assert.match(SRC, /bento \? \{ fontSize:14, color:'var\(--b-text-subtle\)' \}/)
  assert.match(SRC, /const tabActiveBg = bento \? 'var\(--b-green\)' : 'var\(--dkgreen\)'/)
})

test('CL-3: compliance truth untouched — views/trackers + extraction path still present', () => {
  for (const v of ['v_client_compliance_summary', 'v_firm_dashboard', 'v_overdue_ageing']) {
    assert.ok(SRC.includes(v), `authoritative view missing: ${v}`)
  }
  assert.ok(SRC.includes('extract-financial'), 'financial extraction path must remain')
  // Package 0/1: the ONLY rpc calls in Compliance are the governed document source-of-truth
  // RPCs (document_link / document_replace) used by the financial upload/replace path. No
  // compliance-truth RPC (status/due/runner/generate) is introduced by the chrome or by Pkg0/1.
  const rpcNames = [...new Set([...SRC.matchAll(/\.rpc\('([a-z_]+)'/g)].map(m => m[1]))].sort()
  assert.deepEqual(rpcNames, ['document_link', 'document_replace'])
})
