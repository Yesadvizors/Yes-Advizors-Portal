/**
 * Aadhaar minimisation (R1).
 *
 * The full 12-digit Aadhaar may exist in React state while the user types it, so
 * that it can be validated. It must NEVER be persisted, displayed, logged, or
 * placed in a Supabase payload.
 *
 * Only two derivations may be stored:
 *   aadhaar_last4   e.g. "9012"
 *   aadhaar_masked  e.g. "XXXX-XXXX-9012"
 *
 * These match the columns the schema already intends for this data
 * (client_directors.aadhaar_last4 / aadhaar_masked, migration 0002:98-99). The
 * clients.directors jsonb path previously bypassed that intent by storing the raw
 * value; this module is the single owner of the rule that it no longer does.
 *
 * Legacy tolerance: some stored director objects may still carry a raw `aadhaar`
 * key (none do today — verified: 0 of 24 entries). If one appears, we derive the
 * masked form from it for display, but we never keep the raw value in state and
 * never write it back.
 *
 * Pure functions only — no React, no Supabase — so they are directly testable.
 */

/** Digits only. `null` for anything that is not a 12-digit Aadhaar. */
export function aadhaarLast4(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length === 12 ? digits.slice(-4) : null
}

/** "9012" -> "XXXX-XXXX-9012". `null` unless given exactly 4 digits. */
export function maskFromLast4(last4) {
  const d = String(last4 ?? '').replace(/\D/g, '')
  return d.length === 4 ? `XXXX-XXXX-${d}` : null
}

/** Full Aadhaar -> "XXXX-XXXX-9012". `null` if not a valid 12-digit value. */
export function aadhaarMasked(value) {
  return maskFromLast4(aadhaarLast4(value))
}

/** The ONE canonical stored form for a last-four. Nothing else is one. */
const CANONICAL_LAST4 = /^\d{4}$/

/**
 * Fail-closed normaliser for a STORED last-four.
 *
 * Deliberately does NOT strip non-digits. Digit-stripping would silently promote
 * corrupt values into valid-looking ones: "90-12" -> "9012", "ab9012" -> "9012".
 * A stored value that is not exactly four digits is not a last-four; it is corrupt,
 * and we refuse it rather than repair it.
 *
 * (Contrast aadhaarLast4() below, which DOES tolerate spaces and hyphens — that one
 *  reads what a human just typed into the input, which is a different trust level.)
 */
export function normaliseLast4(value) {
  const s = String(value ?? '').trim()
  return CANONICAL_LAST4.test(s) ? s : null
}

/** The ONE canonical stored form for a mask. Anything else is not a mask. */
const CANONICAL_MASK = /^XXXX-XXXX-\d{4}$/

/**
 * Fail-closed normaliser for a stored "masked" value.
 *
 * A field being NAMED `aadhaar_masked` does not make its contents masked. A row
 * could carry a raw 12-digit number there — through a legacy write, a bad import,
 * or a bug — and if we trusted the field name we would happily display it and
 * write it straight back. So the value is only accepted in the exact canonical
 * form; anything else (raw digits, partial mask, empty, junk) yields null and the
 * caller rebuilds the mask from a validated last-four instead.
 */
export function normaliseMask(value) {
  const s = String(value ?? '').trim()
  return CANONICAL_MASK.test(s) ? s : null
}

/**
 * The single resolver behind both hydrate and persist, so the two can never
 * disagree about what is trustworthy.
 *
 * Precedence:
 *   1. a freshly typed, VALID 12-digit Aadhaar always wins;
 *   2. otherwise a VALIDATED last-four, or one recovered from a VALIDATED mask;
 *   3. the mask is the validated stored one, else rebuilt from (2);
 *   4. if nothing validates, both are null. A malformed value is never carried
 *      forward, never displayed, never persisted.
 */
function resolveAadhaar({ raw, last4, masked }) {
  const fresh = aadhaarLast4(raw)
  if (fresh) return { last4: fresh, masked: maskFromLast4(fresh) }

  const validMask = normaliseMask(masked)          // fail-closed
  const resolvedLast4 =
    normaliseLast4(last4) ??
    (validMask ? validMask.slice(-4) : null)       // recover ONLY from a valid mask
  const resolvedMask = validMask ?? maskFromLast4(resolvedLast4)

  return { last4: resolvedLast4 ?? null, masked: resolvedMask ?? null }
}

/**
 * What to keep in React state for a director loaded from the database.
 *
 * Never returns the raw value. Tolerates every stored shape:
 *   { aadhaar_masked: "XXXX-XXXX-9012", aadhaar_last4: "9012" }  - current
 *   { aadhaar_last4: "9012" } only                                - mask derived
 *   { aadhaar: "123456789012" }                                   - LEGACY raw
 *   { aadhaar_masked: "123456789012" }                            - MALFORMED
 *
 * The malformed case is the dangerous one: raw digits sitting in the field that is
 * *supposed* to be masked. normaliseMask() rejects it, so it is neither displayed
 * nor written back.
 */
export function hydratedAadhaar(stored) {
  const { last4, masked } = resolveAadhaar({
    raw:    stored?.aadhaar,          // legacy raw -> derive, never retain
    last4:  stored?.aadhaar_last4,
    masked: stored?.aadhaar_masked,
  })
  return { aadhaarLast4: last4, aadhaarMasked: masked }
}

/**
 * The Aadhaar fields to PERSIST for an in-memory director.
 *
 * `d.aadhaar` is what the user typed this session (may be partial or empty).
 * `d.aadhaarLast4` / `d.aadhaarMasked` are what was already stored.
 *
 * A newly typed valid Aadhaar wins. Otherwise the previously stored values are
 * preserved — that is what stops a re-save from erasing a masked value when the
 * user did not re-enter anything — but only if they actually validate.
 */
export function persistedAadhaar(d) {
  const { last4, masked } = resolveAadhaar({
    raw:    d?.aadhaar,
    last4:  d?.aadhaarLast4,
    masked: d?.aadhaarMasked,
  })
  return { aadhaar_last4: last4, aadhaar_masked: masked }
}

/**
 * Build the director object written to clients.directors.
 * There is deliberately NO `aadhaar` key in the result — not even an empty one.
 */
export function directorForPersist(d, role) {
  const { aadhaar_last4, aadhaar_masked } = persistedAadhaar(d)
  return {
    name: d.name,
    din: d.din,
    email: d.email,
    mobile: d.mobile,
    pan: d.pan,
    aadhaar_last4,
    aadhaar_masked,
    role,
  }
}

/**
 * Scrub the raw Aadhaar from an in-memory director after a successful save,
 * keeping the derived values so the UI can still show the masked form and a
 * subsequent re-save does not lose it.
 */
export function clearRawAadhaar(d) {
  const { aadhaar_last4, aadhaar_masked } = persistedAadhaar(d)
  return { ...d, aadhaar: '', aadhaarLast4: aadhaar_last4, aadhaarMasked: aadhaar_masked }
}

/** Masked value for display, from any stored shape. Never reveals a raw value. */
export function displayAadhaar(stored) {
  return hydratedAadhaar(stored).aadhaarMasked ?? '—'
}
