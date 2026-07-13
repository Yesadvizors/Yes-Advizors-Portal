/**
 * Compliance generation — truthful outcomes (R2).
 *
 * Before this module, both call sites lied:
 *
 *   Clients.jsx      `await supabase.rpc('generate_client_compliance', {...})`
 *                    — the result was not even destructured. Any error was invisible,
 *                      and the button then showed "✅ Synced!" regardless.
 *
 *   OnboardingWizard the whole block sat in `try { ... } catch { console.warn(...) }`,
 *                    and the success screen printed a HARD-CODED ✅ against "GST
 *                    returns tracker", "Income Tax tracker", "Accounting tracker" and
 *                    "Compliance calendar" — whatever actually happened.
 *
 * A Manager could be told compliance was generated when it was not, and nobody would
 * find out until a filing was missed.
 *
 * Everything here is pure — no React, no Supabase — so the outcome logic is directly
 * testable. The components own the I/O; this module owns the truth.
 *
 * ── IDEMPOTENCY (read before changing retry behaviour) ────────────────────────
 *
 *   generate_client_compliance   IDEMPOTENT at the database.
 *                                Every INSERT carries ON CONFLICT ... DO NOTHING
 *                                (0008_functions_rpc.sql:151, 178, 187-211, 216,
 *                                231, 239, 249). Re-running creates only what is
 *                                missing; existing records are retained, never
 *                                deleted or overwritten.
 *
 *   activate_accounting_service  IDEMPOTENT at the database.
 *                                ON CONFLICT (client_id, fy_label, month) DO NOTHING
 *                                (0008_functions_rpc.sql:151).
 *
 *   compliance_calendar          *** NOT IDEMPOTENT AT THE DATABASE. ***
 *                                0004_tables_compliance_trackers.sql:23 declares only
 *                                PRIMARY KEY (id) — there is NO unique constraint on
 *                                (client_id, compliance_tracker_id). A plain .insert()
 *                                therefore DUPLICATES calendar rows on every retry.
 *
 *                                Until a unique constraint exists, idempotency here is
 *                                enforced in the FRONTEND: read the tracker ids already
 *                                present and insert only the missing ones
 *                                (calendarRowsToInsert below).
 *
 *                                DEPENDENCY, STATED PLAINLY: this is a read-then-write
 *                                check, so it is not race-proof. Two simultaneous
 *                                retries could still both insert. Closing that properly
 *                                needs a unique constraint + upsert — a MIGRATION, which
 *                                is deliberately out of scope for R2.
 */

import { MIN_FY, currentFy, nextFy, startFyFromDate } from './financialYear.js'

/** Stage keys -> the wording shown to the user. */
export const COMPLIANCE_STAGES = {
  check:      'compliance status check',
  generate:   'compliance generation',
  accounting: 'accounting activation',
  calendar:   'calendar population',
}

/**
 * Client type -> the RPC's p_client_type domain.
 * Single owner: both call sites previously kept their own copy of this map, and nothing
 * kept them in step. A divergence would silently generate the WRONG compliance schedule.
 */
export const CLIENT_TYPE_RPC_MAP = {
  'Private Limited Company': 'Private Limited Company',
  'Public Limited Company':  'Limited Company',
  'LLP':                     'LLP',
  'Partnership Firm':        'Partnership Firm',
  'Proprietor':              'Proprietor',
  'Proprietorship':          'Proprietor',
  'Individual':              'Individual',
  'HUF':                     'HUF',
  'Section 8 Company':       'Section 8 Company',
  'Trust':                   'Trust',
  'Society':                 'Society',
}

/**
 * The FY the accounting service is activated from.  (R4)
 *
 * BEFORE:  a frozen literal, `ACCOUNTING_START_FY = '2024-25'`, passed for every client
 *          regardless of who they were or what year it was. It had to be edited by hand
 *          each April and never was.
 *
 * AFTER:   derived from the client's incorporation date, floored at MIN_FY — which is
 *          precisely what the database's own get_client_start_fy() does for the compliance
 *          trackers (0007_dependency_closure.sql:261). Accounting and compliance therefore
 *          now cover the SAME span, instead of quietly disagreeing about when the client
 *          began to exist.
 *
 * A missing incorporation date yields MIN_FY ('2020-21') — the database's documented rule
 * for a NULL — not "this year". See buildGenerateComplianceArgs below for why "this year"
 * was a genuinely destructive default.
 */
export function accountingStartFy(client) {
  return startFyFromDate(client && client.date_of_incorporation, MIN_FY)
}

/**
 * Arguments for generate_client_compliance. One builder, both call sites.
 *
 * ⚠️ R4 — THE `|| today` FALLBACK IS GONE, AND IT MATTERED.
 *
 * It used to read:
 *
 *     p_incorporation_date: client.date_of_incorporation || new Date().toISOString()...
 *
 * For a client with no incorporation date that passed TODAY. The database then computed
 * get_client_start_fy(today) = the CURRENT financial year, and looped
 *
 *     WHERE fy_label >= <current FY> AND fy_label <= '2025-26'      -- the SQL ceiling
 *
 * Today the current FY is past 2025-26, so that range is EMPTY: the client received no
 * compliance records at all — no GST, no ITR, nothing — and the RPC returned success.
 * The frontend's own "helpful" default was silently destroying the thing it was helping
 * with.
 *
 * Passing null instead lets the database apply its documented NULL rule (start at
 * '2020-21'), which generates records rather than none. We do not invent a date the user
 * never gave us.
 */
export function buildGenerateComplianceArgs(client) {
  return {
    p_client_id:          client.id,
    p_client_type:        CLIENT_TYPE_RPC_MAP[client.client_type] || 'Private Limited Company',
    p_incorporation_date: client.date_of_incorporation || null,
    p_has_gstin:          !!client.gstin,
    p_gst_frequency:      'Monthly',
    p_has_tan:            !!client.tan,
    p_has_cin:            !!client.cin,
    p_has_llpin:          false,
    p_gstin:              client.gstin || null,
    p_tan:                client.tan || null,
    p_cin:                client.cin || null,
    p_llpin:              null,
  }
}

/**
 * The FY window the calendar is populated for: this FY and the next.
 * Now delegates to the shared FY utility instead of doing its own month arithmetic.
 */
export function calendarFyWindow(now = new Date()) {
  const currentFY = currentFy(now)
  return { currentFY, nextFY: nextFy(currentFY) }
}

/**
 * Calendar rows that still need inserting.
 *
 * This IS the idempotency guard for compliance_calendar. Any gst_tracker row whose id
 * already appears as a compliance_tracker_id is skipped — retrying does not duplicate,
 * and nothing existing is deleted or modified.
 */
export function calendarRowsToInsert(gstRows, existingTrackerIds, todayISO) {
  const have = new Set((existingTrackerIds || []).filter(Boolean))
  const soon = new Date(Date.parse(todayISO) + 7 * 864e5).toISOString().split('T')[0]

  return (gstRows || [])
    .filter(g => g && g.id && !have.has(g.id))
    .map(g => ({
      client_id: g.client_id,
      compliance_type: 'GST',
      compliance_name: `${g.return_type} — ${g.period}`,
      compliance_tracker_id: g.id,
      fy_label: g.fy_label,
      period: g.period,
      due_date: g.standard_due_date,
      status: g.status,
      is_overdue: g.standard_due_date < todayISO && g.status !== 'Filed',
      is_due_soon: g.standard_due_date >= todayISO && g.standard_due_date <= soon,
    }))
}

/**
 * Roll the per-stage results up into one verdict.
 * A stage is only counted if it was actually attempted.
 */
export function complianceOutcome(stages = {}) {
  const attempted = Object.keys(COMPLIANCE_STAGES).filter(k => stages[k])
  const failedKeys = attempted.filter(k => stages[k].ok !== true)

  return {
    attempted,
    failedKeys,
    failedStages: failedKeys.map(k => COMPLIANCE_STAGES[k]),
    errors: failedKeys.map(k => ({ stage: COMPLIANCE_STAGES[k], error: stages[k].error })),
    ok: attempted.length > 0 && failedKeys.length === 0,
    anyFailed: failedKeys.length > 0,
    allFailed: attempted.length > 0 && failedKeys.length === attempted.length,
  }
}

/**
 * Should this save warn that the CURRENT financial year is not covered?   (R4 Rev 1.1)
 *
 * Rev 1.0 asked this only when the runner had actually executed:
 *
 *     const coverageGap = comp.complianceRun && !coverage.ok        // WRONG
 *
 * which quietly excused the one case where the gap is most invisible: an existing client
 * whose compliance was found and RETAINED. There `complianceRun` is false, so the screen
 * went green — even though those retained records were themselves generated under the very
 * same SQL ceiling, and are therefore exactly the records that are missing the current
 * year. "Existing compliance retained" reassured the user about records that do not cover
 * the year they are filing for.
 *
 * The flags are no longer consulted at all. A completed, non-draft save is a save for which
 * current-FY compliance is EXPECTED — whether the runner generated it, retained it, or
 * failed at it. The only two exemptions are the ones where compliance genuinely is not
 * expected:
 *
 *   - nothing was saved      -> there is no client to have compliance
 *   - it was a draft         -> drafts deliberately do not generate compliance
 *
 * Not consulting the flags is also what makes this safe against future call paths: a new
 * branch that sets neither flag now warns by default instead of silently going green.
 */
export function coverageGap(compliance, coverage) {
  if (!compliance || compliance.clientSaved === false) return false
  if (compliance.isDraft) return false
  return !(coverage && coverage.ok === true)
}

/**
 * Did this save FULLY succeed — every stage green AND the current year actually covered?
 *
 * This is what decides the green tick, the celebratory heading and the green panel. It is
 * a single gate so that no future edit can turn one of them green while leaving the others
 * amber. A known-missing current financial year can never produce a full-success screen.
 */
export function saveFullySucceeded(compliance, coverage) {
  if (!compliance || compliance.clientSaved === false) return false
  if (complianceOutcome(compliance.stages).anyFailed) return false
  return !coverageGap(compliance, coverage)
}

/**
 * The single sentence the user is shown. Covers required outcomes A–E.
 *
 *   A  everything succeeded
 *   B  client saved, compliance wholly failed
 *   C  compliance already existed -> retained, no duplicates
 *   D  nothing saved
 *   E  partial failure -> name the stages that failed
 */
export function complianceMessage({ clientSaved, complianceRun, existingRetained, stages } = {}) {
  // D — nothing saved.
  if (!clientSaved) {
    return 'No change was completed. The client was not saved and no compliance records were created.'
  }

  // C — compliance already existed.
  if (existingRetained) {
    return 'Client saved. Existing compliance records were found and retained — no duplicates were created.'
  }

  // Compliance was not attempted (e.g. a draft). Say only what is true.
  if (!complianceRun) {
    return 'Client saved.'
  }

  const outcome = complianceOutcome(stages)

  // A — everything succeeded.
  if (outcome.ok) {
    return 'Client saved and compliance records generated successfully.'
  }

  // B — every attempted stage failed.
  if (outcome.allFailed) {
    return 'Client saved, but compliance setup failed. Retry is required.'
  }

  // E — partial: name the stages that failed, and do NOT claim overall success.
  return `Client saved, but part of compliance setup failed: ${outcome.failedStages.join(', ')}. Retry is required.`
}

/**
 * The message for a Re-sync, derived ENTIRELY from what the stages actually reported.
 *
 * The button may only look successful when complianceOutcome(stages).ok is true — i.e.
 * every attempted stage returned ok === true. Before Rev 1.1, Re-sync ran only
 * generate_client_compliance, so a client whose accounting or calendar had failed could
 * be "re-synced" back to a green tick with those stages still broken.
 */
export function resyncMessage(stages) {
  const outcome = complianceOutcome(stages)

  // Nothing ran. That is not success — it is a failure to even start.
  if (outcome.attempted.length === 0) return 'Compliance setup failed. Retry is required.'

  if (outcome.ok) return 'Compliance setup completed.'
  if (outcome.allFailed) return 'Compliance setup failed. Retry is required.'

  return `Compliance partially completed — ${outcome.failedStages.join(', ')}. Retry is required.`
}

/** Icon + text for one line of the wizard's success checklist. Never unconditional. */
export function checklistItem(stage, okText, failText) {
  if (!stage)          return { icon: '⚠️', text: `${failText} (not attempted)` }
  if (stage.ok === true) return { icon: '✅', text: okText }
  return { icon: '⚠️', text: `${failText}${stage.error ? ` — ${stage.error}` : ''}` }
}
