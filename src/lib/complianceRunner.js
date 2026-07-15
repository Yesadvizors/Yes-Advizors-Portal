/**
 * Compliance setup — the ONE place that talks to Supabase about compliance.
 *
 * WHY THIS MODULE EXISTS (R2 Rev 1.1)
 *
 * Rev 1.0 fixed the lying messages but left a hole that made one of those messages
 * itself untrue. The onboarding failure screen says:
 *
 *     "Use Re-sync Compliance on the Clients page to retry."
 *
 * ...but Re-sync only ever called generate_client_compliance. It did NOT run accounting
 * activation and did NOT populate the calendar. So the exact failure the screen told you
 * to repair — accounting or calendar — was the one Re-sync could not repair. Worse, since
 * generate_client_compliance is idempotent it would return success, and the button would
 * report "synced" while the client stayed half-configured. The advice was wrong and the
 * result was still misleading.
 *
 * The cause was structural: two call sites each had their own private copy of the
 * sequence, so they were free to drift, and they did. There is now exactly one runner and
 * both call sites use it. A stage added here is a stage both paths get.
 *
 * Layering:
 *   src/lib/compliance.js        pure — outcomes, messages, dedupe. No I/O. Directly testable.
 *   src/lib/complianceRunner.js  this file — the Supabase calls, in order, each one checked.
 *   components                   render whatever the runner reports. They decide nothing.
 *
 * The Supabase client is passed in rather than imported, so the tests drive the real
 * runner against a fake database instead of testing a re-implementation of it.
 *
 * ── IDEMPOTENCY (unchanged from Rev 1.0; read before touching retry) ──────────
 *
 *   generate_client_compliance   IDEMPOTENT in the database — every INSERT carries
 *                                ON CONFLICT ... DO NOTHING (0008_functions_rpc.sql).
 *   activate_accounting_service  IDEMPOTENT in the database —
 *                                ON CONFLICT (client_id, fy_label, month) DO NOTHING.
 *   compliance_calendar          IDEMPOTENT — now at the database AND here.
 *                                Migration 0014 added UNIQUE (client_id,
 *                                compliance_tracker_id) — constraint
 *                                compliance_calendar_client_tracker_key. populateCalendar()
 *                                still reads the tracker ids already present and only sends
 *                                the missing ones (so the common path ships a small payload),
 *                                but the write itself is now an UPSERT with
 *                                ON CONFLICT (client_id, compliance_tracker_id) DO NOTHING.
 *
 *                                That closes the race the read-then-write check could not:
 *                                two simultaneous saves can both read "absent" and both send
 *                                the same tracker, but the database now silently skips the
 *                                loser instead of writing a duplicate. Existing rows are
 *                                never touched.
 *
 * Nothing in this module ever DELETES or OVERWRITES a compliance record. Retry only adds
 * what is missing.
 */

import {
  accountingStartFy, buildGenerateComplianceArgs,
  calendarFyWindow, calendarRowsToInsert,
} from './compliance.js'
import { safeErrorDetail } from './errors.js'

const CLIENT_COLUMNS = 'id, cin, tan, gstin, client_type, date_of_incorporation'

/**
 * Resolve a client's UUID (and the fields the RPC needs) from its YA-xxx code.
 * Both callers used to do this and both used to throw the error away.
 */
export async function resolveClientRow(sb, clientCode) {
  const { data, error } = await sb
    .from('clients')
    .select(CLIENT_COLUMNS)
    .eq('client_id', clientCode)
    .single()

  if (error) return { ok: false, error: safeErrorDetail(error) }
  if (!data)  return { ok: false, error: 'The client row could not be read back after saving.' }
  return { ok: true, client: data }
}

/**
 * Does this client already have compliance records?
 *
 * Probes income_tax_tracker, which is written for EVERY client and every FY
 * (0008_functions_rpc.sql:175). gst_tracker — which the old code probed — is written only
 * when a GSTIN exists (:180), so for a non-GST client it ALWAYS returned 0 and existing
 * compliance could never be detected.
 *
 * The error is reported, never discarded. The old code read `const { count } = await ...`,
 * so a failed check became "count is falsy", which the code then read as "no compliance
 * exists, generate it". A transient network error triggered regeneration. It looked like
 * a safe default; it was a guess.
 */
export async function countExistingCompliance(sb, clientCode) {
  const found = await resolveClientRow(sb, clientCode)
  if (!found.ok) return { ok: false, error: found.error }

  const { count, error } = await sb
    .from('income_tax_tracker')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', found.client.id)

  if (error) return { ok: false, error: safeErrorDetail(error) }
  return { ok: true, count: count || 0, client: found.client }
}

/**
 * Copy GST trackers onto the compliance calendar WITHOUT duplicating on retry.
 * See the idempotency note at the top of this file.
 */
export async function populateCalendar(sb, clientUuid, now = new Date()) {
  const { currentFY, nextFY } = calendarFyWindow(now)

  const { data: gstRows, error: gstErr } = await sb
    .from('gst_tracker')
    .select('id, client_id, fy_label, return_type, period, standard_due_date, status')
    .eq('client_id', clientUuid)
    .in('fy_label', [currentFY, nextFY])
    .not('standard_due_date', 'is', null)

  if (gstErr) return { ok: false, error: safeErrorDetail(gstErr) }
  // No GST trackers is not a failure — a client with no GSTIN has none by design.
  if (!gstRows || gstRows.length === 0) return { ok: true, inserted: 0 }

  const { data: existing, error: exErr } = await sb
    .from('compliance_calendar')
    .select('compliance_tracker_id')
    .eq('client_id', clientUuid)
    .not('compliance_tracker_id', 'is', null)

  // Fail CLOSED. If we cannot tell what is already on the calendar we do not insert,
  // because duplicate due dates are worse than a reported failure.
  if (exErr) {
    return {
      ok: false,
      error: 'Could not verify existing calendar entries, so none were added (avoiding duplicates). ' + safeErrorDetail(exErr),
    }
  }

  const rows = calendarRowsToInsert(
    gstRows,
    (existing || []).map(r => r.compliance_tracker_id),
    now.toISOString().split('T')[0],
  )
  if (rows.length === 0) return { ok: true, inserted: 0, alreadyPresent: true }

  // Concurrency-safe write. The read-then-write filter above removes rows we can already
  // see, but two simultaneous saves could both pass that check and send the same tracker.
  // compliance_calendar now has UNIQUE (client_id, compliance_tracker_id) (migration 0014),
  // so an UPSERT with ignoreDuplicates -> ON CONFLICT (client_id, compliance_tracker_id)
  // DO NOTHING makes the loser of that race a silent no-op rather than a duplicate row.
  // Existing rows are skipped, never overwritten.
  const { data: written, error: insErr } = await sb
    .from('compliance_calendar')
    .upsert(rows, { onConflict: 'client_id,compliance_tracker_id', ignoreDuplicates: true })
    .select('compliance_tracker_id')
  if (insErr) return { ok: false, error: safeErrorDetail(insErr) }

  // With DO NOTHING the RETURNING clause yields only the rows actually inserted, so the
  // count stays truthful even when a concurrent save inserted some of them first. Fall
  // back to rows.length if the driver returns no data for the write.
  return { ok: true, inserted: Array.isArray(written) ? written.length : rows.length }
}

/**
 * Run the full compliance sequence and report truthfully what each stage did.
 *
 * THE COMPLETE SEQUENCE — this is what both onboarding and Re-sync now execute:
 *
 *   check       resolve the client row
 *   generate    generate_client_compliance     (GST / ITR / TDS / ROC trackers)
 *   accounting  activate_accounting_service    (monthly accounting records)
 *   calendar    compliance_calendar population (deduped)
 *
 * Accounting runs even if generation failed: the two RPCs are independent, and stopping
 * at the first failure would hide the rest. The user gets one complete picture, not the
 * first thing that went wrong.
 *
 * The calendar is SKIPPED — not failed — when generation failed, because it copies rows
 * that generation creates. Reporting "calendar population failed" there would name the
 * wrong cause.
 *
 * @param sb      Supabase client
 * @param target  { client } an already-resolved row (must carry `id`), and/or
 *                { clientCode } a YA-xxx code to resolve. A row without an `id` is
 *                resolved from the code.
 * @returns stages — { check, generate, accounting, calendar? }, each { ok, error? }.
 *                   Feed straight into complianceOutcome()/complianceMessage().
 */
export async function runComplianceSetup(sb, { client = null, clientCode = null } = {}) {
  const stages = {}

  let row = client && client.id ? client : null
  if (!row) {
    const code = clientCode || (client && client.client_id)
    if (!code) {
      stages.check = { ok: false, error: 'No client was identified, so no compliance work was attempted.' }
      return stages
    }
    const found = await resolveClientRow(sb, code)
    if (!found.ok) {
      // Without the UUID nothing downstream can run. Report ONE failed check rather than
      // three phantom stage failures.
      stages.check = { ok: false, error: found.error }
      return stages
    }
    row = found.client
  }
  stages.check = { ok: true }

  // ── generate_client_compliance ── idempotent in the database; safe to retry.
  const { error: genErr } = await sb.rpc(
    'generate_client_compliance', buildGenerateComplianceArgs(row),
  )
  stages.generate = genErr ? { ok: false, error: safeErrorDetail(genErr) } : { ok: true }

  // ── activate_accounting_service ── idempotent in the database; safe to retry.
  // R4: the start FY is now DERIVED from this client's incorporation date (floored at
  // MIN_FY), matching what the database does for the compliance trackers. It used to be
  // the frozen literal '2024-25' for every client in every year.
  const startFy = accountingStartFy(row)
  const { error: accErr } = await sb.rpc('activate_accounting_service', {
    p_client_id: row.id,
    p_start_fy: startFy,
  })
  stages.accounting = accErr
    ? { ok: false, error: safeErrorDetail(accErr) }
    : { ok: true, startFy }

  // ── compliance_calendar ── deduped; skipped if there is nothing to copy.
  if (stages.generate.ok) {
    stages.calendar = await populateCalendar(sb, row.id)
  }

  return stages
}
