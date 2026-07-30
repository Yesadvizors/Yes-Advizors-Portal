# YAV2 Portal V2 — 0021–0024 Expected-vs-Live Reconciliation Matrix

**Governing baseline:** `sync/integration` @ `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`
**SQL kit:** `supabase/verification/YAV2_V2_0021_0024_FULL_SELECT_ONLY_RECONCILIATION.sql` (SHA-256 `368e22d7…`)

## How to read this matrix

Five separated lenses (never conflated — mirrors the T3 reconciliation discipline):

- **INTENDED (repo)** — what the governing migration source authors.
- **CLAIMED (register)** — what `docs/YAV2_Master_Completion_Register.md` records as executed/closed.
- **PRIOR-PROVEN (T3)** — what earlier SELECT-only V2 evidence already established.
- **LIVE (this run)** — filled from PJ's fresh SELECT-only execution. **Blank until executed.**
- **VERDICT** — PASS / FAIL / UNKNOWN / NOT VISIBLE, decided against the expected column.

> **Cardinal rule:** *a migration file in Git ≠ executed; a register "CLOSED PASS" ≠ live-verified;
> object existence ≠ definition equality.* No LIVE cell may be marked PASS from repo or register
> evidence alone — only from the fresh block result.

---

## 0. Migration-object provenance (the crux of this package)

| ID | Object set | INTENDED (repo path) | CLAIMED (register) | Live block | Expected | Acceptable variance | Decision consequence |
|---|---|---|---|---|---|---|---|
| 0021 | P5 service applicability (2 tables, 3 RPCs, RLS, policies, grants, 4 audit events) | `supabase/migrations/0021_service_applicability.sql` (header: *DRAFT — NOT EXECUTED*) | EXECUTED / CLOSED PASS 2026-07-19 (`:293`) | C1–C8, D1–D5, E1–E3 | All 0021 objects PRESENT with matching definitions | None on existence; comment text may differ | If any object MISSING → 0021 **not fully applied**; register claim challenged |
| 0022 | P5 PG-1 OTHER-notes (1 CHECK + 2 RPC guards) | `supabase/migrations/0022_p5_pg1_other_notes_enforcement.sql` (header: *DRAFT — NOT EXECUTED*) | EXECUTED / CLOSED PASS 2026-07-21 (`:294`) | C3, D2 | `csa_other_notes_required_chk` present; RPC bodies contain `OTHER_NOTES_REQUIRED` | None | If guard absent → 0022 not applied; enforcement weaker than claimed |
| 0023 | T4 grants hardening (Group A 6 audit helpers owner-only; Group B 11 fns authenticated-only) | `supabase/verification/remediation-t4/0023_grants_hardening.PROPOSED.sql` (**PROPOSED — not in `migrations/`**) | G-05/V-5 CLOSED PASS (self-reported, **no ledger**) | D4, D5, L2 | 17 target fns carry **no** PUBLIC/anon EXECUTE; Group B `authenticated` only | None | If PUBLIC/anon EXECUTE still present → 0023 **not applied** (contradicts closeout; matches T3 pre-state) |
| 0024 | T4 search_path hardening (3 helpers → `pg_catalog, public, pg_temp`) | `supabase/verification/remediation-t4/0024_search_path_hardening.PROPOSED.sql` (**PROPOSED**) | V-4 CLOSED PASS 2026-07-26 (self-reported, **no ledger**) | D6, L3 | `get_portal_role`, `is_active_user`, `is_admin_or_manager` search_path = `pg_catalog, public, pg_temp` | None | If bare `public` → 0024 not applied (V-4 remains open) |
| LEDGER | Migration ledger visibility | n/a (Supabase-managed) | `schema_migrations` documented **absent** live | B1–B3 | Likely NOT VISIBLE | Absence expected | If NOT VISIBLE → applied-status of ALL of 0021–0024 stays **UNKNOWN from ledger**; rely on object/definition evidence |

> **Reconciliation note:** the register claims all four applied; the migration *files* for 0021/0022
> still say "DRAFT — NOT EXECUTED" and 0023/0024 exist only as PROPOSED files under `verification/`.
> Prior T3 evidence *did* observe 0021/0022 objects live (constraints `client_registrations_id_client_uq`
> and `csa_other_notes_required_chk` present), **but also** observed the exact PUBLIC/anon EXECUTE
> exposure that 0023 was designed to remove and the bare-`public` search_path 0024 targets. So the
> live state of **0023/0024 is genuinely in question** and is the primary thing this run must settle.

---

## A. Environment fingerprint

| ID | Assertion | Source | Live block | Expected | Acceptable variance | Consequence |
|---|---|---|---|---|---|---|
| A-1 | DB / user / IST clock captured | kit `[A1]` | A1 | `db_name=postgres`; IST date present | run_as role varies | Provides execution date for FY assertions |
| A-2 | Server version captured | kit `[A2]` | A2 | PG 15.x (Supabase) | patch level varies | Fingerprint only |
| A-3 | Project identity confirmed | operator eyeball + `[A5]` | A5 | `ogjrwemjefvccpyjwxuo` confirmed | none | If not confirmed → **STOP** (HOLD) |

## B. Migration-ledger visibility

| ID | Assertion | Source | Live block | Expected | Variance | Consequence |
|---|---|---|---|---|---|---|
| B-1 | `supabase_migrations` schema present? | T3 (absent) | B1 | Likely 0 rows (absent) | present is fine too | If absent → NOT VISIBLE |
| B-2 | `schema_migrations` columns | — | B2 | absent | — | drives B-3 |
| B-3 | Ledger entries for 0021–0024 | — | B3 | UNKNOWN | — | Presence = positive ledger proof; absence ≠ non-application |

> **Dependency gate:** run `[B3]` **only if** `[B2]` confirms `schema_migrations` exists **and** exposes
> `version` + `name` columns. Otherwise label `[B3]` **SKIPPED — PREREQUISITE NOT MET** (ledger NOT VISIBLE).

## C. Object inventory 0021 / 0022

| ID | Assertion | Repo source | Live block | Expected | Variance | Consequence |
|---|---|---|---|---|---|---|
| C-1 | `public.service_catalogue` table exists (owner postgres) | 0021 §tables | C1 | PRESENT | none | MISSING → 0021 FAIL |
| C-2 | `public.client_service_applicability` table exists | 0021 §tables | C1 | PRESENT | none | MISSING → 0021 FAIL |
| C-3 | CSA columns match (id, client_id, service_code, status, row_version, …) | 0021 lines 146–166 | C2 | 18 columns as authored | default text may format differently | Column drift → DIFFERENT |
| C-4 | Constraint `client_registrations_id_client_uq` (UNIQUE id,client_id) | 0021 | C3 | present, UNIQUE | none | MISSING → composite FK unsupported |
| C-5 | CSA check constraints (`csa_dates_chk`, `csa_effective_from_gate_chk`, `csa_effective_to_null_when_approved_chk`, `csa_approval_actor_chk`) | 0021 | C3 | all 4 present | none | MISSING → integrity weaker |
| C-6 | FK `csa_registration_same_client_fk` ON DELETE RESTRICT (`confdeltype='r'`) | 0021 | C3 | present, RESTRICT | none | MISSING → cross-client link risk |
| C-7 | `csa_other_notes_required_chk` (0022) | 0022 | C3 | present | none | MISSING → 0022 FAIL |
| C-8 | Indexes `idx_csa_client`, `idx_csa_service`, `client_service_applicability_live_uq` (partial UNIQUE) | 0021 | C4 | all present; live_uq partial `WHERE status<>'Inactive'` | none | MISSING → dup-risk |
| C-9 | No triggers on P5 tables | 0021/0022 (none authored) | C5 | 0 rows | none | Any trigger → DIVERGENCE |
| C-10 | `service_catalogue` = 11 reference codes | 0021 seed | C7 | 11 codes exactly | none | Count off → seed drift |
| C-11 | 4 applicability audit-event-contract rows | 0021 §F | C8 | 4 present | none | Missing → audit contract incomplete |

## D. Functions (P5 / P6 / T4)

| ID | Assertion | Repo source | Live block | Expected | Variance | Consequence |
|---|---|---|---|---|---|---|
| D-1 | 3 P5 RPCs exist, SECURITY DEFINER, owner postgres, search_path `pg_catalog, public, pg_temp` | 0021/0022 | D1 | as authored | none | Divergence → FAIL |
| D-2 | P5 create/update bodies contain `OTHER_NOTES_REQUIRED` (0022 guard) | 0022 | D2 | TRUE for create & update | none | FALSE → 0022 not applied |
| D-3 | `get_current_fy()` STABLE, DEFINER, owner postgres, search_path `public, pg_temp`, IST-derived, fail-loud | 0014 lines 422–460 | D1, D3 | as authored | none | Divergence → FY logic risk |
| D-4 | FY generators (`generate_client_compliance`, `_core`, `activate_accounting_service`) SECURITY DEFINER, ceiling via `get_current_fy()` | 0014 | D1, D3, I1 | as authored | none | Divergence → generation risk |
| D-5 | **0023 Group A** (`_record_audit_failure`, `_write_read_audit`, `audit_contains_secret`, `audit_field_format_ok`, `audit_is_uuid`, `audit_validate_event`) — **no** anon/authenticated/service_role EXECUTE | 0023 PROPOSED | D4, D5 | all FALSE for the 3 web roles; no PUBLIC | none | Any TRUE → 0023 **not applied** |
| D-6 | **0023 Group B** (`get_app_role`, `get_app_role_for_user`, `get_my_role`, `get_my_team_id`, `get_portal_role`, `is_active_user`, `is_admin`, `is_admin_or_manager`, `calc_gst_due_date`, `get_client_start_fy`, `get_sensitive_audit_logs`) — `authenticated` only | 0023 PROPOSED | D4, D5 | authenticated TRUE; anon/service_role FALSE; no PUBLIC | `get_app_role_for_user` service_role optional (§B2 note) | PUBLIC/anon present → 0023 not applied |
| D-7 | **0024** `get_portal_role`, `is_active_user`, `is_admin_or_manager` search_path = `pg_catalog, public, pg_temp` | 0024 PROPOSED | D6, L3 | TRUE (hardened) | none | bare `public` → 0024 not applied |

## E. RLS / FORCE RLS

| ID | Assertion | Repo source | Live block | Expected | Variance | Consequence |
|---|---|---|---|---|---|---|
| E-1 | FORCE RLS on both P5 tables | 0021 lines 199–207 | E1 | `rls_forced=true` for `service_catalogue`, `client_service_applicability` | none | false → FAIL (L1 flags) |
| E-2 | FORCE RLS on audit_* (3) + M1-A masters (8) + entity_type_catalogue | 0005/0015 | E1 | forced=true (14-table FORCE set per T3) | none | false → FAIL |
| E-3 | Operational/tracker tables ENABLE-only (not FORCE) | 0006/0010 (by design) | E1 | forced=false | this asymmetry is intended | Do not flag as failure |
| E-4 | P5 policies `client_service_applicability_select`, `service_catalogue_select` (SELECT, no write policy) | 0021 | E2 | present; SELECT only | none | write policy present → DIVERGENCE |
| E-5 | CSA grants: `authenticated,service_role` SELECT; no INSERT/UPDATE/DELETE to authenticated | 0021 | E3 | SELECT only; no write grants | none | write grant → FAIL (RPC-only broken) |

## F. Compliance Tracker grants & posture

| ID | Assertion | Repo source | Live block | Expected | Variance | Consequence |
|---|---|---|---|---|---|---|
| F-1 | Trackers writable only via policy for admin/manager/executive roles; no anon writes | 0010 | F1, F2 | admin/manager ALL; exec SELECT/UPDATE; anon none | none | anon write → FAIL |
| F-2 | No `anon` privilege on any public table | 0006/0010/0015/0021 | F3 | 0 rows | none | any anon grant → FAIL |
| F-3 | Direct table mutation blocked; writes via RPC only for RPC-managed tables | 0017/0018/0021 | E3, F1 | no INSERT/UPDATE/DELETE to authenticated on RPC-only tables | none | grant present → posture breach |

## G. Financial years

| ID | Assertion | Repo source | Live block | Expected | Variance | Consequence |
|---|---|---|---|---|---|---|
| G-1 | `financial_years` rows present, contiguous | 0002/0014 seed | G1, G4 | FY 2022-23…2030-31 (live prior) / seed 2020-21…2030-31 | earliest FY may differ; contiguity required | gap/overlap → FAIL |
| G-2 | Exactly one current FY (flag and date-derived agree) | get_current_fy logic | G2, G3, G5 | 1 row; as of 2026-27 exec → `2026-27` | current FY depends on exec date | 0 or >1 → FAIL (get_current_fy would raise) |
| G-3 | No malformed / duplicate FY labels | 0014 constraints | G3 | 0 malformed, 0 duplicate | none | any → FAIL |
| G-4 | Current FY consistency with IST execution date | 0014 IST logic | G2, G5 | derived from `(now() AT IST)::date` | must show exec date + IST assumption | mismatch → DIFFERENT |

> Current-FY expectation is **not hard-coded**: block `[G2]` derives it from `financial_years`
> using the IST execution date shown in `[A1]`. As of a 2026-27 run it is `2026-27`.

## H. P5 Service Applicability data consistency

> **Dependency gate:** run `[H1]`–`[H5]` **only if** `[C1]` shows **both** `public.service_catalogue`
> and `public.client_service_applicability` PRESENT. If either is MISSING, mark `[H1]`–`[H5]`
> **SKIPPED — PREREQUISITE NOT MET** and record the missing P5 table as a **FAIL** in `[C1]`
> (0021 objects are governed, never optional). `[H3]`/`[H4]` also read `public.clients` /
> `public.client_registrations` (governed, expected present).

| ID | Assertion | Repo source | Live block | Expected | Variance | Consequence |
|---|---|---|---|---|---|---|
| H-1 | CSA total rows | T3 (=4) | H1 | 4 (guard) | grows with real use | large delta → investigate |
| H-2 | No orphan service_code / client_id | FK 0021 | H3 | 0 / 0 | none | >0 → integrity FAIL |
| H-3 | Approved rows have approver + effective_from | `csa_approval_actor_chk`, `csa_effective_from_gate_chk` | H3 | 0 violations | none | >0 → constraint not enforced |
| H-4 | OTHER rows have non-blank notes | `csa_other_notes_required_chk` (0022) | H3 | 0 blank | none | >0 → 0022 not enforced |
| H-5 | Linked registration same client | `csa_registration_same_client_fk` | H4 | 0 | none | >0 → FK not enforced |
| H-6 | No duplicate live (client, service) grain | `client_service_applicability_live_uq` | H5 | 0 | none | >0 → partial-unique not enforced |

## I. P6 generators

| ID | Assertion | Repo source | Live block | Expected | Variance | Consequence |
|---|---|---|---|---|---|---|
| I-1 | Active generators derive ceiling from `get_current_fy()` | 0014 lines 664, 774 | I1 | TRUE for `_core` & `activate_accounting_service` | wrapper delegates | FALSE → capped/regressed |
| I-2 | **No** active generator hard-caps at FY 2025-26 (upper bound) | 0014 (removed 0008 cap) | I2, J1 | `has_upper_ceiling_2025_26_literal=false` for all | none | TRUE → **regression to stale cap** |
| I-3 | Generators fail-loud on empty FY range (`no_data_found`) | 0014 lines 707–712, 973–978 | I3 | TRUE for both | none | FALSE → silent-success bug |
| I-4 | Unknown-incorporation start anchor distinct (floor `2025-26`, not a ceiling) | 0014 lines 495–500 | I4 | present; start-side literal | none | absent → start policy missing |
| I-5 | Generation reached current FY (not frozen at 2025-26) | 0014 backfill | I5 | max fy_label ≥ current FY | depends on data | max < current FY → generation lag |

## J. P6A dependency (backend evidence only)

| ID | Assertion | Repo/commit | Live block | Expected | Variance | Consequence |
|---|---|---|---|---|---|---|
| J-1 | Live current FY derived (not fixed at 2025-26) | 0014; P6A PR #35 @ `43aecec` | J1 | live_current_fy = current FY | exec-date dependent | fixed 2025-26 → P6A premise invalid |
| J-2 | Active FY beyond 2025-26 exists | 0014 seed | J1 | `has_active_fy_beyond_2025_26=true` | none | false → P6A premise invalid |
| J-3 | No generator capped at 2025-26 | 0014 | J1, I2 | `any_generator_capped_2025_26=false` | none | true → P6A invalid; frontend fix would mismatch backend |
| J-4 | Deployed generator definitions are get_current_fy-driven | 0014 | J2 | `ceiling_from_get_current_fy=true`; md5 recorded | none | false → backend not the repaired body |

> **P6A / PR #35 is validated only at the backend level here.** No frontend runtime is exercised.
> PR #35 (`p6/frontend-fy-warning-correction` @ `43aecec4007a36abf79d3408c5fdd698c3089859`) and its
> branch are **not touched** by this package.

## K. G-11 non-impact & protected counts

> **Guard baselines, not mechanical equality.** The counts below are register guard baselines, **not**
> automatically permanent exact expectations. Decide PASS/FAIL by **expected business movement + governing
> evidence**: a **higher** count may be legitimate growth (not a failure by itself); a **lower** count needs
> **investigation** (deletion/loss/scope change); **exact equality** is required **only** for the
> **frozen** rows flagged below. "Frozen" rows are the separately governed frozen-count condition.

| ID | Assertion | Source (register `:26`) | Live block | Expected | Movement rule | Consequence |
|---|---|---|---|---|---|---|
| K-1 | clients | register | K1 | ~**13** (guard) | growth OK | drop → investigate; not auto-FAIL |
| K-2 | team | T3 | K1 | ~**8** (guard) | growth OK | drop → investigate |
| K-3 | service_catalogue | 0021 | K1 | **11** (FROZEN seed) | exact | ≠11 → seed drift FAIL |
| K-4 | client_service_applicability | T3 | K1 | ~**4** (guard) | growth OK | large delta → investigate |
| K-5 | client_persons | register | K1 | **0** (FROZEN) | exact | >0 → investigate/FAIL |
| K-6 | client_remediation_flags | register | K1 | **0** (FROZEN) | exact | >0 → investigate/FAIL |
| K-1b | client_directors (legacy, **optional/not-governed**) | 0002 legacy | **K1b** | present or **NOT PRESENT** | n/a | absent → **NOT PRESENT** (never FAIL; never blocks K1) |
| K-7 | accounting_tracker | register | K2 | **312** (FROZEN) | exact | ≠312 → G-11/other impact suspected |
| K-8 | financials_tracker | register | K2 | **120** (FROZEN) | exact | ≠120 → investigate |
| K-9 | income_tax_tracker | register | K2 | **26** (FROZEN) | exact | ≠26 → investigate |
| K-10 | compliance_calendar | register | K2 | **0** (FROZEN) | exact | >0 → investigate |
| K-11 | audit_event_contract | T3 | K3 | ~**24** (guard) | grows if contract extended | drop → investigate |
| K-12 | audit_log | T3 | K3 | ~**33** (guard) | append-only, **growth EXPECTED** | a LOWER value is the concern |
| K-13 | `v_team_workload` absent (G-11 Option A frontend-only) | G-11 design | K4 | `false` (absent) | none | present → G-11 was NOT frontend-only |
| K-14 | 3 authored views present (`v_firm_dashboard`, `v_client_compliance_summary`, `v_overdue_ageing`) | 0009 | K4 | all true | none | absent → view regression |

> Protected counts are the **non-impact guard**: G-11 (and 0023/0024 grant/search_path changes)
> must not have moved them beyond expected movement. A moved count is not automatically a failure, but
> any drop or any change to a FROZEN row demands an explanation in the Discrepancy Register.

## L. Integrity & anomaly sweep

| ID | Assertion | Source | Live block | Expected | Consequence |
|---|---|---|---|---|---|
| L-1 | No protected table missing FORCE RLS | 0005/0015/0021 | L1 | 0 rows | any row → FORCE-RLS gap |
| L-2 | No unexpected PUBLIC EXECUTE on public functions | 0023 intent | L2 | 17 T4 helpers absent from result | any T4 helper present → 0023 gap |
| L-3 | No DEFINER function with unpinned/bare search_path (0024 targets) | 0024 intent | L3 | 3 helpers absent from result | present → 0024 gap |
| L-4 | Exactly 1 of each P5 RPC (no rogue overloads) | 0021/0022 | L4 | count=1 each | >1 → overload/divergence |
| L-5 | Object counts near prior evidence (39 tables / 51 functions / 3 views) | T3 | L5 | ≈ those figures | large drift → investigate |
| L-6 | No applicability row referencing an inactive service code | 0021 | L6 | 0 rows | >0 → reference integrity issue |

---

## Prior-proven facts to carry forward (already established by T3 SELECT-only evidence)

These are **already proved** against V2 and need only re-confirmation, not fresh proof:

- 14 contract tables MATCH; 224 columns; 59 constraints; 32 indexes; 19 enums / 149 labels MATCH.
- 51 functions live = 51 source; all search_path pinned; 48 DEFINER / 3 INVOKER.
- FORCE RLS on 14 tables; 3 authored views present; `v_team_workload` confirmed ABSENT.
- Data counts: clients 13, team 8, service_catalogue 11, CSA 4, M1-A person tables 0,
  audit_event_contract 24, audit_log 33.

## Facts that STILL require fresh V2 execution (UNKNOWN until this run)

1. Whether **0023** grants hardening is live (17 helpers no longer PUBLIC/anon EXECUTE) — T3 proved the
   *opposite* pre-state, so this is genuinely open. → blocks D4, D5, L2.
2. Whether **0024** search_path hardening is live (3 helpers pinned with leading `pg_catalog`). → D6, L3.
3. Live `get_current_fy()`-equivalent current FY and financial_years integrity **as of the execution date**. → G1–G5.
4. That **no** active generator carries a 2025-26 upper ceiling live. → I2, J1.
5. Protected counts unchanged since the register baseline (G-11 non-impact). → K1–K3.
6. Migration-ledger visibility (expected NOT VISIBLE). → B1–B3.

## Assertions that must remain UNKNOWN until execution

- Any "applied" status for 0021/0022/0023/0024 **from the ledger** (ledger expected absent).
- Any live count, ACL, search_path, or definition — **none** may be asserted from repo/register alone.
