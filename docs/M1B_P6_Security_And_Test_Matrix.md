# YAV2 Portal V2 — Module 1 — P6 Security & Test Matrix

**Status:** DISCOVERY / DESIGN — PROPOSED. No implementation, no tests run, no DB access by Claude.
**Authored:** 2026-07-21 23:10 IST (UTC+05:30) · Author: Claude Code · Reviewer: ChatGPT · Approver: PJ.
**Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53`.

---

## 0. MATERIAL SECURITY SURFACE (from 22-Jul-2026 B7/B8 evidence) — to verify + harden
**Finding (stated precisely):** `authenticated` holds EXECUTE on write-capable functions, and `*_admin_manager_all`
RLS grants Admin/Manager direct **ALL** on the output trackers/calendar. This is a **material surface P6 must
verify and harden before generation is enabled.** **Important caveats (do not overstate):**
- **An EXECUTE grant alone does NOT prove an unaudited bypass.** A SECURITY DEFINER function may enforce strong
  internal gates. The exposure is a **surface to verify** (quantified by B7-S), not proof of a live bypass.
- **The P5 service-applicability RPCs (`service_applicability_create/update/set_status`) are NOT prohibited merely
  because they are write-capable.** They are SECURITY DEFINER with internal `is_active_user()` +
  `is_admin_or_manager()` gates, pinned `search_path`, and audit emission. **Verify those internal authorisation
  gates separately**; do not classify them as a bypass or revoke their EXECUTE as part of T-08.
- The genuinely SUPERSEDED **legacy generators** are a different matter (below).

**Recommended T-08 strategy (REC — ChatGPT review; PJ executes on V2 in a separate migration; nothing changed here):**
1. **P6 generation is performed ONLY by new SECURITY DEFINER RPCs** (`compliance_generation_execute`) owned by
   `postgres`, pinned `search_path`, fail-closed on null `auth.uid()`/inactive/non-Admin-Manager, with audit
   emission — the RPC is the **sole** intended generation writer.
2. **Revoke `authenticated` EXECUTE on the superseded legacy generation functions** —
   `generate_client_compliance`, `generate_client_compliance_core`, `activate_accounting_service` — so they cannot
   be invoked from the app at all. (Leave the functions themselves frozen/unmodified; only the grant is withdrawn.)
3. **Prevent direct `authenticated` INSERT and DELETE** on the generation-target trackers and `compliance_calendar`
   (bypass closure for creation/removal), so rows can only be created by the P6 RPC.
4. **Do NOT broadly revoke UPDATE.** Operational workflow updates (Executive/Manager progressing a tracker row
   through its stages) are legitimately required. **Preserve the narrowly-scoped RLS UPDATE policies**
   (`*_executive_update` / `*_admin_manager_all` UPDATE) **or** route workflow edits through separate,
   purpose-scoped workflow RPCs — but do not remove the ability to update in the name of generation hardening.
5. All privilege changes are **PJ-executed on V2 only**, in a separate authorised migration — **no live privilege
   is changed by this package**; B6-S/B7-S first quantify the exact grants to target.

## 1. Threat & misuse review
| Threat | Control (proposed) |
|---|---|
| Anonymous / unauthenticated execution | RPCs SECURITY DEFINER but **fail-closed on `auth.uid() IS NULL`**; EXECUTE granted to `authenticated` only; anon/service_role/PUBLIC denied |
| Non-Admin/Manager triggering generation | RPC gate `is_active_user() AND is_admin_or_manager()`; UI hides entry (defence-in-depth) |
| Duplicate / double-click / concurrent runs | advisory lock per client/firm + UNIQUE(active) generation-line key + `expected_counts` guard |
| Generation from Client Master edit (unintended side effect) | **no** trigger/auto-path; generation is a separate explicit RPC only |
| Unaudited row creation via direct table DML | route generation through SECURITY DEFINER RPC; **T-08**: revoke `authenticated` **INSERT/DELETE** on generation-target trackers + calendar (**preserve narrowly-scoped UPDATE** for operational workflow), and revoke `authenticated` EXECUTE on the **superseded legacy generators** |
| Stale-data write (applicability changed mid-run) | capture `source_row_version`; drift → `STALE_APPLICABILITY`, re-preview required |
| Partial failure leaving inconsistent state | atomic per client; generation-line ledger records truth; safe idempotent retry; no silent partial |
| Sensitive-data leakage in audit/preview | metadata minimised: ids + counts only; **no Aadhaar/PAN/personal values**; preview selects no personal fields |
| Running against V1/Production | Claude never executes SQL; PJ executes on V2 only; kit has B0 attestation + STOP header |
| Legacy generator reuse | legacy path frozen; P6 uses only its new RPCs |

## 2. RLS / privilege model (proposed)
- New tables `compliance_generation_run` / `_line`: RLS **enabled + forced**; SELECT for `is_active_user() AND is_admin_or_manager()`; **no** direct INSERT/UPDATE/DELETE policy (RPC-only, SECURITY DEFINER owner bypasses RLS).
- Output trackers/calendar: keep existing RLS; **T-08** revokes direct `authenticated` **INSERT/DELETE** so the P6 RPC is the sole row-creator, while **preserving narrowly-scoped UPDATE** (or separate workflow RPCs) for legitimate operational progress edits.
- `service_role` treatment: not used by the app; no P6 grant to `service_role`; anon fully denied.
- Fail-closed everywhere: helpers already return false on null uid / inactive.

## 3. Audit completeness
Every EXECUTE emits `compliance.generation.committed` (HIGH/S2) with `generation_run_id` + counts; PREVIEW emits
`compliance.generation.previewed` (LOW/S1); BLOCKED/CANCELLED emit their events. New `audit_event_contract` rows
are additive; `audit_write_event` remains the sole, contract-validated writer. Post-run verify cross-checks that
committed line count == audit-logged count.

## 4. Test matrices (to author in the implementation package)
**A. Concurrency**
| # | Scenario | Expect |
|---|---|---|
| C1 | two EXECUTE for same client in parallel | one commits, other waits then SKIPs all (0 dup) |
| C2 | preview + execute race with an applicability update | `STALE_APPLICABILITY` on drift |
| C3 | firm-wide run with one client failing | other clients commit; failing client isolated |

**B. Idempotency / duplicate prevention**
| # | Scenario | Expect |
|---|---|---|
| I1 | execute twice, same params | second = all SKIP, 0 new rows |
| I2 | UNIQUE(active) line key under forced double-insert | violation → SKIP, no dup output |
| I3 | calendar dedupe vs `compliance_calendar_client_tracker_key` | no dup calendar rows |

**C. Frequency** (one per frequency): MONTHLY→12, QUARTERLY→4, HALF_YEARLY→2, ANNUAL→1, ONE_TIME→1,
EVENT_BASED→0, AS_REQUIRED→0 obligations for a full eligible FY; plus a late-start FY producing the correct subset.

**D. FY boundary**: obligation never straddles FYs; multi-FY run iterates; back-generation off by default (D-07);
`is_current` FY handled; inactive FY excluded.

**E. Registration**: requires_registration service with/without `linked_registration_id` → BLOCKED vs INSERT;
cross-client registration link rejected (FK).

**F. Inactive / restart**: Inactive applicability generates nothing; deactivation stops future periods; a new
Approved row after Inactive resumes forward; old periods immutable (D-11).

**G. Role**: Admin/Manager can preview+execute; Executive/Staff/Viewer/anon denied (RPC + UI); inactive user denied.

**H. Error & recovery**: partial failure → PARTIAL_FAILURE + safe retry; lock unavailable → RUN_LOCK_UNAVAILABLE;
no-approved-applicability → NO_APPROVED_APPLICABILITY; verify reconciles; cancel marks lineage inactive (no delete).

**I. Frontend** (Node `--test`, static/DOM): RPC-only (no direct DML), capability gating, confirm-count guard,
preview render, error mapping, accessibility, safe-async, no-XSS-sink, no legacy-generator reference.

**J. Security / privilege / RLS (read-only verification + transactional-rollback negative tests)**
| # | Scenario | Expect |
|---|---|---|
| J1 | **anon** calls preview/execute RPC | denied (fail-closed; anon has no EXECUTE) |
| J2 | **authenticated non-authorised** (Executive/Staff/Viewer/inactive) calls execute | denied (`NOT_AUTHORISED`) |
| J3 | **service_role** boundary | no P6 EXECUTE granted to `service_role`; direct service writes blocked/uses `service` audit actor only |
| J4 | direct `INSERT`/`DELETE` into a tracker by `authenticated` after T-08 hardening | denied (row creation/removal is RPC-only) |
| J4b | legitimate workflow `UPDATE` of a tracker row by an authorised role after T-08 | **still permitted** (UPDATE not broadly revoked) |
| J4c | `authenticated` EXECUTE of a **superseded legacy generator** after T-08 | denied (grant revoked) |
| J4d | P5 `service_applicability_*` RPC internal gates (`is_active_user` + `is_admin_or_manager`, audit) | verified present — NOT prohibited by T-08 |
| J5 | RLS **enabled + FORCE** on new `compliance_generation_run`/`_line`; SELECT admin/manager only | verified |
| J6 | new RPCs are **SECURITY DEFINER, owner `postgres`, pinned `search_path`, VOLATILE/STABLE as designed** | verified |
| J7 | **audit-contract** rows for `compliance.generation.*` exist; `audit_write_event` rejects off-contract events | verified |
| J8 | **protected baseline** unchanged by preview and by a rolled-back execute (312/120/26/0) | verified |
| J9 | **no-duplicate**: execute twice → tracker UNIQUE keys + generation-line key yield 0 new rows on 2nd run | verified |
| J10 | **preview↔execute parity**: `expected_counts` mismatch aborts execute before any write | verified |

**K. Approved-decision conformance (D-01 / D-06 / D-12)**
| # | Scenario | Expect |
|---|---|---|
| K1 | **D-01 mapping + calendar cardinality**: each service generates its approved tracker(s), and **exactly one `compliance_calendar` row per distinct compliance obligation `(client_id, service_code, obligation_code, fy_label, period_key)` — NOT one per tracker row** | verified: one calendar row per distinct five-part obligation |
| K1a | **Shared obligation_code** — two tracker rows sharing one `obligation_code` (e.g. STATUTORY_AUDIT's financials_tracker + audit_tracker) → **2 tracker rows but 1 calendar row** | verified |
| K1b | **Distinct obligation_codes** — two **approved** `obligation_code` values under the same service, FY and period → **2 calendar rows** | verified |
| K1c | **expected_counts / preview↔execute parity** — preview and execute counts are **identical**, using the five-part key for calendar and `obligation_type` for tracker rows; a mismatch aborts execute before any write | verified |
| K1d | **Retry idempotency** — a repeated run creates **no duplicate tracker or calendar rows**, and **never merges two separately-approved `obligation_code` obligations** | verified |
| K1e | **Missing/unapproved obligation_code** — an obligation with no approved `obligation_code` in the matrix → **BLOCKED**; **no tracker and no calendar row** created | verified |
| K2 | **D-01/D-17 OTHER** → no automatic generation | OTHER produces 0 rows |
| K3 | **D-06** execute on sample dataset / `is_test_client` client | denied/blocked (dry-run/preview only; no rows committed) |
| K4 | **D-06** execute permitted only after Clean-Start Reset OR PJ production-eligible confirmation | gated |
| K5 | **D-12 no approved due-date rule** for an obligation | classified **BLOCKED**; no tracker or calendar row created |
| K6 | **D-12 standard-only**: generation sets `standard_due_date`, leaves `extended/individual_due_date` NULL | verified |
| K7 | **D-12 extension**: `extended_due_date` recorded separately; `standard_due_date` unchanged | verified |
| K8 | **D-12 non-working-day**: no auto-shift unless the approved rule includes it | verified |
| K9 | **D-12 config-driven**: due-date rules resolved from a single rule table, not hard-coded per function | verified (static) |

## 5. Verification tiers (mirrors prior gates)
1. **Pre-execution verification (read-only SQL):** baseline counts (312/120/26/0), objects/grants/RLS present as designed, `0023` collision-free, no accidental rows.
2. **Transactional functional tests (MUST ROLL BACK):** exercise preview/execute/verify inside a transaction that **always `ROLLBACK`** — proves behaviour with zero net DB change; never committed.
3. **Post-execution verification (read-only SQL):** after a genuine PJ-approved execute, reconcile inserted vs preview, lineage completeness, audit parity, no unintended tables touched, baseline deltas explained.
4. **Runtime verification checklist (PJ, Preview deployment):** UI gating, preview correctness, confirm guard, execute, verify, retry, audit link, non-Admin fail-closed, no console/network errors.

## 6. Evidence templates (to include in the implementation package)
Pre-exec result capture; transactional-test transcript (showing ROLLBACK); post-exec reconciliation table;
runtime step table (PASS/FAIL + notes); SHA-256 manifest; git diff/stat. No secrets; counts/ids only.

## 7. Sensitive-data minimisation
Preview and audit carry **ids, codes, dates, counts** only — no names, no Aadhaar/PAN, no financial values.
The read-only discovery kit selects no personal values. Logs use the existing `errors.js` redactor on the frontend.

## 8. Explicit non-goals / prohibitions (unchanged)
No SQL executed by Claude; no DB writes; no migration execution; no compliance/tracker/calendar generation in this
phase; no V1/Production; no Production merge/deploy; no source implementation; no commit/push.
