/**
 * R1 — Aadhaar minimisation. Focused tests.
 *
 * Uses node:test (built in — no new dependency, no lockfile change).
 *   npm test
 *
 * The load-bearing assertion is "no full Aadhaar in the payload". Everything else
 * exists so that fixing that one cannot quietly break something adjacent.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  aadhaarLast4,
  aadhaarMasked,
  maskFromLast4,
  normaliseMask,
  normaliseLast4,
  hydratedAadhaar,
  persistedAadhaar,
  directorForPersist,
  clearRawAadhaar,
  displayAadhaar,
} from '../src/lib/aadhaar.js'

const RAW = '123456789012'
const LAST4 = '9012'
const MASKED = 'XXXX-XXXX-9012'

/** Fails if a 12-digit run appears anywhere in the serialised value. */
function assertNoFullAadhaar(value, what) {
  const json = JSON.stringify(value ?? null)
  assert.ok(
    !/\d{12}/.test(json),
    `${what} must not contain a 12-digit Aadhaar. Got: ${json}`
  )
  assert.ok(
    !json.includes(RAW),
    `${what} must not contain the raw Aadhaar. Got: ${json}`
  )
}

/* ── 1. valid Aadhaar derives the correct last four digits ─────────────────── */

test('valid Aadhaar derives the correct last four digits', () => {
  assert.equal(aadhaarLast4(RAW), LAST4)
  assert.equal(aadhaarLast4('9999 8888 7777'), '7777')   // spaces tolerated
  assert.equal(aadhaarLast4('1234-5678-9012'), LAST4)    // hyphens tolerated
})

test('invalid or partial Aadhaar yields no last four', () => {
  assert.equal(aadhaarLast4('12345'), null)              // too short
  assert.equal(aadhaarLast4('1234567890123'), null)      // too long
  assert.equal(aadhaarLast4('abcdefghijkl'), null)       // not digits
  assert.equal(aadhaarLast4(''), null)
  assert.equal(aadhaarLast4(null), null)
  assert.equal(aadhaarLast4(undefined), null)
})

/* ── 2. valid Aadhaar derives the correct masked value ─────────────────────── */

test('valid Aadhaar derives the correct masked value', () => {
  assert.equal(aadhaarMasked(RAW), MASKED)
  assert.equal(maskFromLast4(LAST4), MASKED)
})

test('masked value exposes only the last four digits', () => {
  const masked = aadhaarMasked(RAW)
  assert.ok(!masked.includes('12345678'), 'masked must not contain leading digits')
  assert.equal(masked.replace(/\D/g, ''), LAST4)
})

test('invalid Aadhaar yields no masked value', () => {
  assert.equal(aadhaarMasked('12345'), null)
  assert.equal(aadhaarMasked(''), null)
  assert.equal(maskFromLast4('12'), null)
})

/* ── 3. Supabase payload contains no full Aadhaar ──────────────────────────── */

test('persisted director carries NO full Aadhaar and NO `aadhaar` key at all', () => {
  const director = { name: 'A Director', din: '12345678', email: 'a@b.com',
                     mobile: '9876543210', pan: 'ABCDE1234F', aadhaar: RAW }

  const persisted = directorForPersist(director, 'Director')

  assertNoFullAadhaar(persisted, 'persisted director')
  assert.ok(!('aadhaar' in persisted), 'the `aadhaar` key must not exist, not even empty')
  assert.equal(persisted.aadhaar_last4, LAST4)
  assert.equal(persisted.aadhaar_masked, MASKED)
  // the rest of the director survives untouched
  assert.equal(persisted.name, 'A Director')
  assert.equal(persisted.pan, 'ABCDE1234F')
  assert.equal(persisted.role, 'Director')
})

test('a whole directors[] payload contains no full Aadhaar', () => {
  const directors = [
    { name: 'One', aadhaar: RAW },
    { name: 'Two', aadhaar: '999988887777' },
    { name: 'Three', aadhaar: '' },
  ]
  const payload = { directors: directors.map(d => directorForPersist(d, 'Director')) }
  assertNoFullAadhaar(payload, 'clients.directors payload')
  assert.equal(payload.directors[1].aadhaar_masked, 'XXXX-XXXX-7777')
})

/* ── 4. resaving an existing masked record preserves the masked value ──────── */

test('re-saving without re-entering preserves the stored masked value', () => {
  // Loaded from the database, then saved again with nothing typed.
  const hydrated = { name: 'A', aadhaar: '', aadhaarLast4: LAST4, aadhaarMasked: MASKED }

  const persisted = directorForPersist(hydrated, 'Director')

  assert.equal(persisted.aadhaar_last4, LAST4, 'must NOT be nulled out')
  assert.equal(persisted.aadhaar_masked, MASKED, 'must NOT be nulled out')
  assertNoFullAadhaar(persisted, 'resaved director')
})

test('a newly typed Aadhaar overrides the previously stored one', () => {
  const d = { name: 'A', aadhaar: '111122223333', aadhaarLast4: LAST4, aadhaarMasked: MASKED }
  const persisted = directorForPersist(d, 'Director')
  assert.equal(persisted.aadhaar_last4, '3333')
  assert.equal(persisted.aadhaar_masked, 'XXXX-XXXX-3333')
  assertNoFullAadhaar(persisted, 'updated director')
})

test('a partially typed Aadhaar does not destroy the stored value', () => {
  // User started typing, then saved. The half-entered value is not valid, so the
  // stored one must survive rather than being overwritten with null.
  const d = { name: 'A', aadhaar: '12345', aadhaarLast4: LAST4, aadhaarMasked: MASKED }
  const persisted = directorForPersist(d, 'Director')
  assert.equal(persisted.aadhaar_last4, LAST4)
  assert.equal(persisted.aadhaar_masked, MASKED)
})

/* ── 5. legacy raw record is masked in memory and never written back raw ───── */

test('legacy stored raw Aadhaar is masked on hydrate and never retained', () => {
  const legacyStored = { name: 'Legacy', aadhaar: RAW }   // pre-R1 shape

  const { aadhaarLast4: l4, aadhaarMasked: m } = hydratedAadhaar(legacyStored)

  assert.equal(l4, LAST4)
  assert.equal(m, MASKED)
  assertNoFullAadhaar({ l4, m }, 'hydrated state')
})

test('legacy raw Aadhaar is never written back raw', () => {
  const legacyStored = { name: 'Legacy', aadhaar: RAW }
  const hydratedState = { name: 'Legacy', aadhaar: '', ...hydratedAadhaar(legacyStored) }

  const persisted = directorForPersist(hydratedState, 'Director')

  assertNoFullAadhaar(persisted, 'director persisted from a legacy record')
  assert.ok(!('aadhaar' in persisted))
  assert.equal(persisted.aadhaar_masked, MASKED)
})

test('legacy raw Aadhaar is never displayed', () => {
  assert.equal(displayAadhaar({ aadhaar: RAW }), MASKED)
  assert.equal(displayAadhaar({ aadhaar_masked: MASKED }), MASKED)
  assert.equal(displayAadhaar({ aadhaar_last4: LAST4 }), MASKED)
  assertNoFullAadhaar(displayAadhaar({ aadhaar: RAW }), 'displayed Aadhaar')
})

/* ── 6. blank Aadhaar remains blank ────────────────────────────────────────── */

test('blank Aadhaar stays blank — no empty strings, no phantom masks', () => {
  const d = { name: 'No Aadhaar', aadhaar: '' }
  const persisted = directorForPersist(d, 'Director')

  assert.equal(persisted.aadhaar_last4, null, 'null, not ""')
  assert.equal(persisted.aadhaar_masked, null, 'null, not "XXXX-XXXX-"')
  assert.ok(!('aadhaar' in persisted))
})

test('blank Aadhaar hydrates to nulls', () => {
  assert.deepEqual(hydratedAadhaar({ name: 'x' }), { aadhaarLast4: null, aadhaarMasked: null })
  assert.deepEqual(hydratedAadhaar(undefined),     { aadhaarLast4: null, aadhaarMasked: null })
  assert.equal(displayAadhaar({ name: 'x' }), '—')
})

/* ── 7. the raw value is cleared from state after a save ───────────────────── */

test('clearRawAadhaar scrubs the raw value but keeps the derived ones', () => {
  const afterTyping = { name: 'A', pan: 'ABCDE1234F', aadhaar: RAW, panUploadedPath: 'p/1' }

  const scrubbed = clearRawAadhaar(afterTyping)

  assert.equal(scrubbed.aadhaar, '', 'raw must be gone from state')
  assert.equal(scrubbed.aadhaarLast4, LAST4)
  assert.equal(scrubbed.aadhaarMasked, MASKED)
  assert.equal(scrubbed.panUploadedPath, 'p/1', 'unrelated fields must survive')
  assertNoFullAadhaar(scrubbed, 'director state after save')
})

test('clearRawAadhaar is idempotent', () => {
  const once = clearRawAadhaar({ name: 'A', aadhaar: RAW })
  const twice = clearRawAadhaar(once)
  assert.deepEqual(twice, once)
  assertNoFullAadhaar(twice, 'twice-scrubbed state')
})

/* ── 8. validation errors never reveal the entered Aadhaar ─────────────────── */

test('validation errors never echo the entered Aadhaar', async () => {
  const { VALIDATORS } = await import('../src/helpers.js')

  // Inputs of >= 4 characters only. A 1-char input like "1" would trivially "appear"
  // in the message "Aadhaar must be 12 digits" — that is the assertion being naive,
  // not the message leaking. The real property to assert is that no run of user
  // digits survives into the message.
  const badInputs = ['12345', '1234567890', RAW.slice(0, 11), 'abcdefghijkl', RAW]

  for (const bad of badInputs) {
    const result = VALIDATORS.aadhaar(bad)
    if (result === true) continue        // a valid Aadhaar produces no message

    assert.equal(typeof result, 'string')
    assert.ok(!result.includes(bad), `error message must not echo the input: "${result}"`)
    assert.ok(
      !/\d{4,}/.test(result),
      `error message must not contain a 4+ digit run (it could leak entered digits): "${result}"`
    )
    assertNoFullAadhaar(result, 'validation error message')
  }
})

test('persistedAadhaar never returns the raw value under any input', () => {
  const inputs = [
    { aadhaar: RAW },
    { aadhaar: RAW, aadhaarLast4: LAST4, aadhaarMasked: MASKED },
    { aadhaar: '', aadhaarLast4: LAST4 },
    { aadhaar: '1234' },
    {},
  ]
  for (const d of inputs) assertNoFullAadhaar(persistedAadhaar(d), 'persistedAadhaar output')
})

/* ══════════════════════════════════════════════════════════════════════════════
   REVIEW CORRECTION 2 — a stored "masked" value must be VALIDATED, not trusted.

   The field being NAMED aadhaar_masked does not make its contents masked. A raw
   12-digit number could land there via a legacy write, a bad import, or a bug —
   and if we trusted the field name we would display it and write it straight back.
   ══════════════════════════════════════════════════════════════════════════════ */

test('normaliseMask accepts ONLY the exact canonical form', () => {
  assert.equal(normaliseMask(MASKED), MASKED)
  assert.equal(normaliseMask('  XXXX-XXXX-9012  '), MASKED)   // trimmed

  // Everything else is fail-closed.
  assert.equal(normaliseMask(RAW), null, 'raw digits are NOT a mask')
  assert.equal(normaliseMask('XXXX-XXXX-'), null)             // no last four
  assert.equal(normaliseMask('XXXX-XXXX-90'), null)           // too few
  assert.equal(normaliseMask('XXXX-XXXX-90123'), null)        // too many
  assert.equal(normaliseMask('xxxx-xxxx-9012'), null)         // wrong case
  assert.equal(normaliseMask('XXXXXXXX9012'), null)           // no separators
  assert.equal(normaliseMask('****-****-9012'), null)         // wrong mask char
  assert.equal(normaliseMask(''), null)
  assert.equal(normaliseMask(null), null)
})

/* 1. raw 12 digits placed in aadhaar_masked are never DISPLAYED */
test('raw 12 digits sitting in aadhaar_masked are never displayed', () => {
  const poisoned = { name: 'X', aadhaar_masked: RAW, aadhaar_last4: LAST4 }

  const shown = displayAadhaar(poisoned)

  assert.equal(shown, MASKED, 'must be rebuilt from the valid last-four')
  assertNoFullAadhaar(shown, 'displayed value')
})

/* 2. raw 12 digits placed in aadhaar_masked are never PERSISTED */
test('raw 12 digits sitting in aadhaar_masked are never persisted', () => {
  // The poisoned value is hydrated into state, then saved again.
  const hydrated = { name: 'X', aadhaar: '', ...hydratedAadhaar({ aadhaar_masked: RAW, aadhaar_last4: LAST4 }) }

  assertNoFullAadhaar(hydrated, 'hydrated state')

  const persisted = directorForPersist(hydrated, 'Director')

  assertNoFullAadhaar(persisted, 'persisted director')
  assert.equal(persisted.aadhaar_masked, MASKED, 'rebuilt from the valid last-four')
  assert.equal(persisted.aadhaar_last4, LAST4)
})

test('raw digits in aadhaar_masked are rejected even when persisting directly', () => {
  const d = { name: 'X', aadhaar: '', aadhaarLast4: LAST4, aadhaarMasked: RAW }
  const persisted = persistedAadhaar(d)
  assertNoFullAadhaar(persisted, 'persistedAadhaar output')
  assert.equal(persisted.aadhaar_masked, MASKED)
})

/* 3. malformed mask is rebuilt from a valid aadhaar_last4 */
test('a malformed mask is rebuilt from a valid aadhaar_last4', () => {
  for (const junk of ['XXXX-XXXX-', 'xxxx-xxxx-9012', '****-****-9012', 'not a mask', '']) {
    const { aadhaarMasked: m, aadhaarLast4: l4 } =
      hydratedAadhaar({ aadhaar_masked: junk, aadhaar_last4: LAST4 })
    assert.equal(m, MASKED, `malformed mask "${junk}" must be rebuilt`)
    assert.equal(l4, LAST4)
  }
})

/* 4. malformed mask WITHOUT a valid last4 becomes null */
test('a malformed mask with no valid last-four becomes null', () => {
  const cases = [
    { aadhaar_masked: 'XXXX-XXXX-' },                       // no digits to recover
    { aadhaar_masked: 'garbage' },
    { aadhaar_masked: RAW },                                // raw digits, nothing else
    { aadhaar_masked: '****-****-9012', aadhaar_last4: 'ab' },
    { aadhaar_masked: 'XXXX-XXXX-90', aadhaar_last4: '' },
  ]
  for (const stored of cases) {
    const { aadhaarMasked: m, aadhaarLast4: l4 } = hydratedAadhaar(stored)
    assert.equal(m, null, `must be null for ${JSON.stringify(stored)}`)
    assert.equal(l4, null)
    assert.equal(displayAadhaar(stored), '—')
    assertNoFullAadhaar(hydratedAadhaar(stored), 'hydrated from a malformed row')
  }
})

test('digits are NOT scavenged out of a malformed mask', () => {
  // A raw value in aadhaar_masked must NOT be rescued for its last four. It is
  // untrustworthy data; fail closed rather than guess.
  const { aadhaarLast4: l4, aadhaarMasked: m } = hydratedAadhaar({ aadhaar_masked: RAW })
  assert.equal(l4, null)
  assert.equal(m, null)
})

/* 5. a valid canonical mask is preserved */
test('a valid canonical mask is preserved exactly', () => {
  const stored = { aadhaar_masked: MASKED, aadhaar_last4: LAST4 }
  assert.deepEqual(hydratedAadhaar(stored), { aadhaarLast4: LAST4, aadhaarMasked: MASKED })
  assert.equal(displayAadhaar(stored), MASKED)

  const persisted = persistedAadhaar({ aadhaar: '', aadhaarLast4: LAST4, aadhaarMasked: MASKED })
  assert.deepEqual(persisted, { aadhaar_last4: LAST4, aadhaar_masked: MASKED })
})

test('a valid mask alone recovers the last-four', () => {
  // aadhaar_last4 missing, but the mask is canonical and therefore trustworthy.
  assert.deepEqual(
    hydratedAadhaar({ aadhaar_masked: MASKED }),
    { aadhaarLast4: LAST4, aadhaarMasked: MASKED }
  )
})

/* ══════════════════════════════════════════════════════════════════════════════
   REVIEW CORRECTION 4 — blank / valid / incomplete replacement matrix
   ══════════════════════════════════════════════════════════════════════════════ */

test('replacement matrix: blank preserves, valid replaces, incomplete is never dropped silently', () => {
  const stored = { aadhaarLast4: LAST4, aadhaarMasked: MASKED }

  // blank -> the existing mask survives
  const blank = persistedAadhaar({ ...stored, aadhaar: '' })
  assert.equal(blank.aadhaar_masked, MASKED)

  // valid 12 digits -> replaces
  const replaced = persistedAadhaar({ ...stored, aadhaar: '111122223333' })
  assert.equal(replaced.aadhaar_masked, 'XXXX-XXXX-3333')
  assertNoFullAadhaar(replaced, 'replaced director')

  // incomplete -> persistedAadhaar keeps the OLD value (it cannot invent a new one).
  // That is exactly why the wizard must BLOCK the save: otherwise the user believes
  // they changed the Aadhaar while the stored value quietly stayed the same.
  const incomplete = persistedAadhaar({ ...stored, aadhaar: '12345' })
  assert.equal(incomplete.aadhaar_masked, MASKED,
    'the old value survives — hence the save must be blocked upstream')
})

test('the incomplete-Aadhaar guard message never contains digits from the input', async () => {
  const { VALIDATORS } = await import('../src/helpers.js')
  const msg = VALIDATORS.aadhaar('12345')          // what the wizard shows
  assert.equal(typeof msg, 'string')
  assert.ok(!msg.includes('12345'))
  assert.ok(!/\d{4,}/.test(msg), `must not contain a 4+ digit run: "${msg}"`)
})

/* ══════════════════════════════════════════════════════════════════════════════
   REV 1.2 — the display bypass, and last-four hardening.

   `value={d.aadhaar_masked || displayAadhaar(d)}` short-circuits BEFORE the helper
   can validate: a raw or malformed value in that field would be rendered verbatim.
   And digit-stripping validation would silently promote corrupt stored values
   ("90-12" -> "9012") into valid-looking ones.
   ══════════════════════════════════════════════════════════════════════════════ */

/* 1. raw 12 digits in aadhaar_masked, in the exact shape directorsMap produces */
test('directorsMap-shaped row with raw 12 digits in aadhaar_masked is never displayed', () => {
  // This is precisely what Clients.jsx renders: rows from the client_directors
  // table (or the jsonb map), which carry aadhaar_masked / aadhaar_last4.
  const directorsMapRow = {
    name: 'A Director', role: 'Director', din: '12345678', pan: 'ABCDE1234F',
    mobile: '9876543210',
    aadhaar_masked: RAW,               // POISONED: raw digits in the "masked" field
    aadhaar_last4: LAST4,
    email: 'a@b.com', dsc_status: null, is_primary_contact: false,
  }

  const shown = displayAadhaar(directorsMapRow)

  assert.equal(shown, MASKED, 'must be rebuilt from the valid last-four, not rendered raw')
  assertNoFullAadhaar(shown, 'displayed value')
})

test('directorsMap-shaped row with raw digits and NO valid last4 displays nothing', () => {
  const poisoned = {
    name: 'A Director', role: 'Director',
    aadhaar_masked: RAW,               // raw digits, nothing trustworthy to fall back on
    aadhaar_last4: null,
    dsc_status: null, is_primary_contact: false,
  }
  const shown = displayAadhaar(poisoned)
  assert.equal(shown, '—')
  assertNoFullAadhaar(shown, 'displayed value')
})

test('the old bypass pattern would have leaked — the helper does not', () => {
  const poisoned = { aadhaar_masked: RAW, aadhaar_last4: LAST4 }

  // What the OLD code did: `d.aadhaar_masked || displayAadhaar(d)`.
  const oldBypass = poisoned.aadhaar_masked || displayAadhaar(poisoned)
  assert.equal(oldBypass, RAW, 'demonstrates the bypass: it short-circuits to the raw value')

  // What the code does now.
  assert.equal(displayAadhaar(poisoned), MASKED)
  assertNoFullAadhaar(displayAadhaar(poisoned), 'current display path')
})

/* 2 + 3. stored last-four: exact /^\d{4}$/, no digit-stripping repair */
test('malformed stored aadhaar_last4 is rejected, not repaired', () => {
  // Every one of these would have become "9012" under digit-stripping validation.
  for (const junk of ['90-12', 'ab9012', '90123', '901', ' 9012x', '9 012', '', null, undefined]) {
    assert.equal(normaliseLast4(junk), null, `"${junk}" must be rejected, not repaired`)
  }
})

test('malformed stored aadhaar_last4 cannot resurrect a mask', () => {
  for (const junk of ['90-12', 'ab9012', '90123']) {
    const { aadhaarLast4: l4, aadhaarMasked: m } = hydratedAadhaar({ aadhaar_last4: junk })
    assert.equal(l4, null, `"${junk}" must not become a last-four`)
    assert.equal(m, null, `"${junk}" must not produce a mask`)
    assert.equal(displayAadhaar({ aadhaar_last4: junk }), '—')
  }
})

test('valid exact four digits remain accepted', () => {
  assert.equal(normaliseLast4('9012'), '9012')
  assert.equal(normaliseLast4('0000'), '0000')
  assert.equal(normaliseLast4(' 9012 '), '9012', 'surrounding whitespace is trimmed')
  assert.equal(normaliseLast4(9012), '9012', 'a numeric 4-digit value is accepted')

  const { aadhaarMasked: m } = hydratedAadhaar({ aadhaar_last4: '9012' })
  assert.equal(m, MASKED)
})

test('a raw 12-digit value in aadhaar_last4 is rejected (not truncated)', () => {
  assert.equal(normaliseLast4(RAW), null, 'must NOT be silently truncated to its last four')
  assert.equal(displayAadhaar({ aadhaar_last4: RAW }), '—')
  assertNoFullAadhaar(hydratedAadhaar({ aadhaar_last4: RAW }), 'hydrated from a poisoned last4')
})

/* 4. static repository check — Clients.jsx must not render d.aadhaar_masked directly */
test('STATIC: Clients.jsx never reads d.aadhaar* directly — all display goes via the helper', () => {
  const src = readFileSync(
    fileURLToPath(new URL('../src/components/Clients.jsx', import.meta.url)),
    'utf8'
  )

  // Strip comments, so the explanatory note that *mentions* the old pattern does not
  // trip the scan. Only executable code is examined.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')     // /* ... */ and JSX {/* ... */}
    .replace(/^\s*\/\/.*$/gm, '')         // // ...

  assert.ok(
    code.includes('value={displayAadhaar(d)}'),
    'Clients.jsx must render Aadhaar via displayAadhaar(d)'
  )
  assert.ok(
    !/d\.aadhaar_masked/.test(code),
    'Clients.jsx must NOT read d.aadhaar_masked directly — `||` short-circuits before validation'
  )
  assert.ok(
    !/d\.aadhaar\b/.test(code),
    'Clients.jsx must NOT read the raw d.aadhaar at all'
  )
})

test('STATIC: OnboardingWizard renders no stored mask without validating it', () => {
  const src = readFileSync(
    fileURLToPath(new URL('../src/components/OnboardingWizard.jsx', import.meta.url)),
    'utf8'
  )
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  // Every read of d.aadhaarMasked in executable code must be wrapped in normaliseMask().
  const unguarded = [...code.matchAll(/d\.aadhaarMasked/g)].filter(m => {
    const before = code.slice(Math.max(0, m.index - 20), m.index)
    return !before.includes('normaliseMask(')
  })
  assert.equal(
    unguarded.length, 0,
    'every d.aadhaarMasked render must pass through normaliseMask()'
  )
})
