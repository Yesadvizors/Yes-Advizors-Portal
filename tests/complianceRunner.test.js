import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  runComplianceSetup, populateCalendar, countExistingCompliance, resolveClientRow,
} from '../src/lib/complianceRunner.js'
import { complianceOutcome, resyncMessage, complianceMessage } from '../src/lib/compliance.js'

/* ────────────────────────────────────────────────────────────────────────────
   A fake Supabase.

   These tests drive the REAL runner. Nothing here re-implements the sequence —
   if the runner stops calling activate_accounting_service, these tests notice,
   which is the entire point of the Rev 1.1 correction.

   Chain shape mirrored from the real client:
     from(t).select(cols, opts).eq().in().not()        -> awaited  -> { data, error, count }
     from(t).select(...).eq().single()                 -> awaited  -> { data, error }
     from(t).insert(rows)                              -> awaited  -> { error }
     rpc(name, args)                                   -> awaited  -> { error }
   ──────────────────────────────────────────────────────────────────────────── */

const CLIENT = {
  id: 'uuid-1', client_id: 'YA-001', client_type: 'Private Limited Company',
  gstin: '29ABCDE1234F1Z5', tan: 'BLRA12345B', cin: 'U72900KA2020PTC000001',
  date_of_incorporation: '2020-04-01',
}

const err = m => ({ message: m, code: 'XX000' })

function fakeSupabase(cfg = {}) {
  const calls = { rpc: [], inserts: [], selects: [] }

  const result = (table, op) => {
    const f = cfg[`${table}.${op}`]
    return typeof f === 'function' ? f(calls) : (f || { data: null, error: null, count: 0 })
  }

  const sb = {
    calls,
    rpc(name, args) {
      calls.rpc.push({ name, args })
      const f = cfg.rpc && cfg.rpc[name]
      return Promise.resolve(typeof f === 'function' ? f(args) : (f || { data: null, error: null }))
    },
    from(table) {
      const q = {
        _table: table,
        select(cols, opts) { calls.selects.push({ table, cols, opts }); return q },
        eq()  { return q },
        in()  { return q },
        not() { return q },
        single() { return Promise.resolve(result(table, 'single')) },
        insert(rows) {
          calls.inserts.push({ table, rows })
          return Promise.resolve(result(table, 'insert'))
        },
        // Awaiting the builder itself (no .single()) resolves the select.
        then(resolve, reject) {
          return Promise.resolve(result(table, 'select')).then(resolve, reject)
        },
      }
      return q
    },
  }
  return sb
}

/** The happy path every test below deviates from. */
const HAPPY = () => ({
  'clients.single': { data: CLIENT, error: null },
  'gst_tracker.select': {
    data: [{ id: 't1', client_id: 'uuid-1', fy_label: '2026-27', return_type: 'GSTR-3B',
             period: 'April 2026', standard_due_date: '2026-05-20', status: 'Not Started' }],
    error: null,
  },
  'compliance_calendar.select': { data: [], error: null },
  'compliance_calendar.insert': { error: null },
  rpc: { generate_client_compliance: { error: null }, activate_accounting_service: { error: null } },
})

const rpcNames = sb => sb.calls.rpc.map(c => c.name)

/* ── The Rev 1.1 defect itself ──────────────────────────────────────────── */

test('THE FIX: a re-sync runs the COMPLETE sequence, not just generation', () => {
  // Before Rev 1.1 the Re-sync button called generate_client_compliance and nothing else,
  // while onboarding's failure screen told users to click it to repair accounting and the
  // calendar. It could not. This asserts every stage now runs.
  const sb = fakeSupabase(HAPPY())
  return runComplianceSetup(sb, { client: CLIENT }).then(stages => {
    assert.deepEqual(rpcNames(sb), ['generate_client_compliance', 'activate_accounting_service'],
      'the runner must call BOTH rpcs — accounting was the stage re-sync used to skip')
    assert.equal(sb.calls.inserts.filter(i => i.table === 'compliance_calendar').length, 1,
      'the calendar must be populated — the other stage re-sync used to skip')

    assert.deepEqual(Object.keys(stages).sort(), ['accounting', 'calendar', 'check', 'generate'])
    assert.equal(complianceOutcome(stages).ok, true)
    assert.equal(resyncMessage(stages), 'Compliance setup completed.')
  })
})

/* ── Required scenario tests ────────────────────────────────────────────── */

test('generation succeeds, ACCOUNTING fails -> partial, names accounting, no success', async () => {
  const cfg = HAPPY()
  cfg.rpc.activate_accounting_service = { error: err('deadlock detected') }
  const sb = fakeSupabase(cfg)

  const stages = await runComplianceSetup(sb, { client: CLIENT })

  assert.equal(stages.generate.ok, true)
  assert.equal(stages.accounting.ok, false)
  assert.equal(stages.calendar.ok, true, 'the calendar must still run — the stages are independent')

  const outcome = complianceOutcome(stages)
  assert.equal(outcome.ok, false)
  assert.deepEqual(outcome.failedStages, ['accounting activation'])
  assert.equal(resyncMessage(stages),
    'Compliance partially completed — accounting activation. Retry is required.')
})

test('generation succeeds, CALENDAR fails -> partial, names the calendar, no success', async () => {
  const cfg = HAPPY()
  cfg['compliance_calendar.insert'] = { error: err('insert failed') }
  const sb = fakeSupabase(cfg)

  const stages = await runComplianceSetup(sb, { client: CLIENT })

  assert.equal(stages.generate.ok, true)
  assert.equal(stages.accounting.ok, true)
  assert.equal(stages.calendar.ok, false)

  assert.equal(complianceOutcome(stages).ok, false)
  assert.equal(resyncMessage(stages),
    'Compliance partially completed — calendar population. Retry is required.')
})

test('GENERATION fails, accounting succeeds -> partial, names generation, calendar SKIPPED', async () => {
  const cfg = HAPPY()
  cfg.rpc.generate_client_compliance = { error: err('permission denied for function') }
  const sb = fakeSupabase(cfg)

  const stages = await runComplianceSetup(sb, { client: CLIENT })

  assert.equal(stages.generate.ok, false)
  assert.equal(stages.accounting.ok, true, 'accounting must still be attempted — it does not depend on generation')

  // The calendar copies rows that generation creates. Calling it a "calendar failure"
  // would name the wrong cause, so it is skipped, not failed.
  assert.equal(stages.calendar, undefined)
  assert.equal(sb.calls.inserts.length, 0, 'nothing may be written to the calendar')

  assert.equal(complianceOutcome(stages).ok, false)
  assert.equal(resyncMessage(stages),
    'Compliance partially completed — compliance generation. Retry is required.')
})

test('complete re-sync SUCCESS -> "Compliance setup completed."', async () => {
  const sb = fakeSupabase(HAPPY())
  const stages = await runComplianceSetup(sb, { client: CLIENT })

  assert.equal(complianceOutcome(stages).ok, true)
  assert.equal(resyncMessage(stages), 'Compliance setup completed.')
})

test('complete re-sync PARTIAL failure -> both failed stages named', async () => {
  const cfg = HAPPY()
  cfg.rpc.activate_accounting_service = { error: err('a') }
  cfg['compliance_calendar.insert'] = { error: err('b') }
  const sb = fakeSupabase(cfg)

  const stages = await runComplianceSetup(sb, { client: CLIENT })
  const msg = resyncMessage(stages)

  assert.match(msg, /partially completed/)
  assert.match(msg, /accounting activation/)
  assert.match(msg, /calendar population/)
  assert.match(msg, /Retry is required/)
  assert.doesNotMatch(msg, /completed\.$/)
})

test('every attempted stage fails -> "Compliance setup failed. Retry is required."', async () => {
  const cfg = HAPPY()
  cfg['clients.single'] = { data: null, error: err('client not found') }
  const sb = fakeSupabase(cfg)

  const stages = await runComplianceSetup(sb, { clientCode: 'YA-999' })

  assert.equal(stages.check.ok, false)
  assert.equal(complianceOutcome(stages).allFailed, true)
  assert.equal(resyncMessage(stages), 'Compliance setup failed. Retry is required.')
  assert.equal(sb.calls.rpc.length, 0, 'nothing may run without a resolved client')
})

/* ── Requirement 5: the button cannot go green on a broken stage ────────── */

test('Clients.jsx CANNOT show success when accounting or calendar failed', async () => {
  // The button's success branch is gated on complianceOutcome(stages).ok. Prove that gate
  // is closed for exactly the two stages the old re-sync never even ran.
  for (const broken of ['activate_accounting_service', 'calendar']) {
    const cfg = HAPPY()
    if (broken === 'calendar') cfg['compliance_calendar.insert'] = { error: err('boom') }
    else cfg.rpc[broken] = { error: err('boom') }

    const stages = await runComplianceSetup(fakeSupabase(cfg), { client: CLIENT })
    const outcome = complianceOutcome(stages)

    assert.equal(outcome.ok, false, `${broken} failed but the button would have gone green`)
    assert.notEqual(resyncMessage(stages), 'Compliance setup completed.')
    assert.match(resyncMessage(stages), /Retry is required/)
  }
})

test('the success message is unreachable for EVERY combination containing a failure', async () => {
  const flags = ['generate', 'accounting', 'calendar']
  for (let mask = 1; mask < 8; mask++) {
    const cfg = HAPPY()
    if (mask & 1) cfg.rpc.generate_client_compliance   = { error: err('g') }
    if (mask & 2) cfg.rpc.activate_accounting_service  = { error: err('a') }
    if (mask & 4) cfg['compliance_calendar.insert']    = { error: err('c') }

    const stages = await runComplianceSetup(fakeSupabase(cfg), { client: CLIENT })
    const msg = resyncMessage(stages)

    assert.notEqual(msg, 'Compliance setup completed.',
      `mask ${mask} (${flags.filter((_, i) => mask >> i & 1)}) reported success despite a failure`)
    assert.match(msg, /Retry is required/)
  }
})

/* ── Retry safety, exercised through the real runner ────────────────────── */

test('RETRY: a second run does not duplicate calendar rows', async () => {
  // Run 1 — empty calendar, the tracker is inserted.
  const cfg1 = HAPPY()
  const sb1 = fakeSupabase(cfg1)
  await runComplianceSetup(sb1, { client: CLIENT })

  const inserted = sb1.calls.inserts.find(i => i.table === 'compliance_calendar')
  assert.equal(inserted.rows.length, 1)
  assert.equal(inserted.rows[0].compliance_tracker_id, 't1')

  // Run 2 — the calendar now contains that tracker. NOTHING may be inserted again.
  const cfg2 = HAPPY()
  cfg2['compliance_calendar.select'] = { data: [{ compliance_tracker_id: 't1' }], error: null }
  const sb2 = fakeSupabase(cfg2)
  const stages = await runComplianceSetup(sb2, { client: CLIENT })

  assert.equal(sb2.calls.inserts.length, 0, 'the retry duplicated the calendar rows')
  assert.equal(stages.calendar.ok, true)
  assert.equal(stages.calendar.alreadyPresent, true)
  assert.equal(resyncMessage(stages), 'Compliance setup completed.')
})

test('RETRY: only the genuinely missing trackers are added back', async () => {
  const cfg = HAPPY()
  cfg['gst_tracker.select'] = {
    data: ['t1', 't2', 't3'].map(id => ({
      id, client_id: 'uuid-1', fy_label: '2026-27', return_type: 'GSTR-3B',
      period: 'April 2026', standard_due_date: '2026-05-20', status: 'Not Started',
    })),
    error: null,
  }
  cfg['compliance_calendar.select'] = { data: [{ compliance_tracker_id: 't2' }], error: null }
  const sb = fakeSupabase(cfg)

  await runComplianceSetup(sb, { client: CLIENT })

  const rows = sb.calls.inserts.find(i => i.table === 'compliance_calendar').rows
  assert.deepEqual(rows.map(r => r.compliance_tracker_id).sort(), ['t1', 't3'])
})

test('the runner NEVER deletes: no delete/update/upsert is ever issued', async () => {
  // The fake exposes only select/insert. If the runner reached for .delete() or .update()
  // it would throw here — which is exactly the guarantee we want to hold.
  const sb = fakeSupabase(HAPPY())
  await runComplianceSetup(sb, { client: CLIENT })
  assert.ok(sb.calls.inserts.every(i => i.table === 'compliance_calendar'))
})

test('FAIL CLOSED: if the existing-calendar read fails, nothing is inserted', async () => {
  const cfg = HAPPY()
  cfg['compliance_calendar.select'] = { data: null, error: err('rls denied') }
  const sb = fakeSupabase(cfg)

  const stages = await runComplianceSetup(sb, { client: CLIENT })

  assert.equal(sb.calls.inserts.length, 0,
    'inserting without knowing what is already there risks duplicates')
  assert.equal(stages.calendar.ok, false)
  assert.match(stages.calendar.error, /avoiding duplicates/)
})

test('a client with no GST trackers is a success, not a calendar failure', async () => {
  const cfg = HAPPY()
  cfg['gst_tracker.select'] = { data: [], error: null }
  const sb = fakeSupabase(cfg)

  const stages = await runComplianceSetup(sb, { client: CLIENT })

  assert.equal(stages.calendar.ok, true)
  assert.equal(stages.calendar.inserted, 0)
  assert.equal(sb.calls.inserts.length, 0)
  assert.equal(resyncMessage(stages), 'Compliance setup completed.')
})

test('a failed gst_tracker read is reported, not silently treated as "no rows"', async () => {
  const cfg = HAPPY()
  cfg['gst_tracker.select'] = { data: null, error: err('timeout') }
  const sb = fakeSupabase(cfg)

  const stages = await runComplianceSetup(sb, { client: CLIENT })
  assert.equal(stages.calendar.ok, false)
  assert.match(resyncMessage(stages), /calendar population/)
})

/* ── Client resolution ──────────────────────────────────────────────────── */

test('a client row lacking an id is resolved from its code before anything runs', async () => {
  const sb = fakeSupabase(HAPPY())
  const stages = await runComplianceSetup(sb, { client: { client_id: 'YA-001', name: 'X' } })

  assert.equal(stages.check.ok, true)
  assert.equal(sb.calls.rpc[0].args.p_client_id, 'uuid-1', 'the RPC must receive the resolved UUID')
})

test('with neither a row nor a code, nothing is attempted', async () => {
  const sb = fakeSupabase(HAPPY())
  const stages = await runComplianceSetup(sb, {})

  assert.equal(stages.check.ok, false)
  assert.equal(sb.calls.rpc.length, 0)
  assert.equal(resyncMessage(stages), 'Compliance setup failed. Retry is required.')
})

test('resolveClientRow reports its error instead of discarding it', async () => {
  const sb = fakeSupabase({ 'clients.single': { data: null, error: err('no rows') } })
  const out = await resolveClientRow(sb, 'YA-404')
  assert.equal(out.ok, false)
  assert.match(out.error, /no rows/)
})

test('countExistingCompliance probes income_tax_tracker, and reports a failed probe', async () => {
  const ok = fakeSupabase({
    'clients.single': { data: CLIENT, error: null },
    'income_tax_tracker.select': { count: 7, error: null },
  })
  const found = await countExistingCompliance(ok, 'YA-001')
  assert.equal(found.ok, true)
  assert.equal(found.count, 7)
  assert.ok(ok.calls.selects.some(s => s.table === 'income_tax_tracker'),
    'gst_tracker is written only when a GSTIN exists — it cannot detect compliance for everyone')

  const bad = fakeSupabase({
    'clients.single': { data: CLIENT, error: null },
    'income_tax_tracker.select': { count: null, error: err('timeout') },
  })
  const failed = await countExistingCompliance(bad, 'YA-001')
  assert.equal(failed.ok, false, 'a failed probe must NOT read as "no compliance, regenerate"')
})

/* ── Onboarding message wiring, over real runner output ─────────────────── */

test('onboarding outcomes A/B/E are produced from real runner output', async () => {
  const all = await runComplianceSetup(fakeSupabase(HAPPY()), { client: CLIENT })
  assert.equal(complianceMessage({ clientSaved: true, complianceRun: true, stages: all }),
    'Client saved and compliance records generated successfully.')

  const cfgB = HAPPY()
  cfgB['clients.single'] = { data: null, error: err('gone') }
  const noneRan = await runComplianceSetup(fakeSupabase(cfgB), { clientCode: 'YA-9' })
  assert.equal(complianceMessage({ clientSaved: true, complianceRun: true, stages: noneRan }),
    'Client saved, but compliance setup failed. Retry is required.')

  const cfgE = HAPPY()
  cfgE.rpc.activate_accounting_service = { error: err('x') }
  const partial = await runComplianceSetup(fakeSupabase(cfgE), { client: CLIENT })
  assert.equal(complianceMessage({ clientSaved: true, complianceRun: true, stages: partial }),
    'Client saved, but part of compliance setup failed: accounting activation. Retry is required.')
})

/* ── STATIC: one runner, two call sites, no drift ───────────────────────── */

const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const read = p => stripComments(readFileSync(new URL(p, import.meta.url), 'utf8'))

test('STATIC: onboarding and re-sync use the SAME shared runner', () => {
  const clients = read('../src/components/Clients.jsx')
  const wizard  = read('../src/components/OnboardingWizard.jsx')

  for (const [name, src] of [['Clients.jsx', clients], ['OnboardingWizard.jsx', wizard]]) {
    assert.match(src, /import \{[^}]*runComplianceSetup[^}]*\} from '\.\.\/lib\/complianceRunner'/,
      `${name} must call the shared runner`)
    assert.match(src, /runComplianceSetup\(supabase,/, `${name} must invoke the shared runner`)
  }
})

test('STATIC: neither component calls a compliance RPC directly any more', () => {
  // A direct rpc() call in a component is how the two paths drifted apart in the first
  // place. All compliance I/O belongs to the runner.
  for (const file of ['../src/components/Clients.jsx', '../src/components/OnboardingWizard.jsx']) {
    const src = read(file)
    assert.doesNotMatch(src, /supabase\.rpc\(\s*'generate_client_compliance'/,
      `${file}: compliance generation must go through the runner`)
    assert.doesNotMatch(src, /supabase\.rpc\(\s*'activate_accounting_service'/,
      `${file}: accounting activation must go through the runner`)
    assert.doesNotMatch(src, /from\('compliance_calendar'\)\s*\.insert\(/,
      `${file}: the calendar insert must go through the runner's dedupe guard`)
  }
})

test('STATIC: the re-sync button gates success on the full outcome, not one RPC', () => {
  const src = read('../src/components/Clients.jsx')
  assert.match(src, /const outcome = complianceOutcome\(stages\)/)
  assert.match(src, /if \(!outcome\.ok\)/,
    'success must be gated on every attempted stage reporting ok')
  assert.match(src, /resyncMessage\(stages\)/, 'the label must derive from the stage results')
  assert.doesNotMatch(src, /'✅ Synced!'/)
})

test('STATIC: the runner executes all four stages', () => {
  const src = read('../src/lib/complianceRunner.js')
  assert.match(src, /rpc\(\s*\n?\s*'generate_client_compliance'/)
  assert.match(src, /rpc\('activate_accounting_service'/)
  assert.match(src, /populateCalendar\(sb, row\.id\)/)
  assert.match(src, /stages\.check = \{ ok: true \}/)
})
