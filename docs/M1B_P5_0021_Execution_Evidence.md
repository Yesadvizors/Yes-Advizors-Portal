# M1-B P5 — Migration 0021 Service Applicability — Execution Evidence

**Status: EXECUTED / CLOSED PASS on V2/yav2-dev.** Documentation-only record. Preparing this file
executed no SQL, opened no Supabase/MCP connection, and made no commit/push. V1/Production untouched.

**Authorised project (execution):** Supabase **V2 / yav2-dev `ogjrwemjefvccpyjwxuo`** ONLY.
**Prohibited project:** V1/Production `zcszesuvjrryxtigjglt` — never connected.
**Executor:** PJ (sole manual executor), in the V2 SQL Editor.
**Migration must NOT be rerun** (SECTION 0 is fail-closed and will abort on a second run).

## Governing repository state

| Item | Value |
|------|-------|
| Repository | `D:\Claude\Claude Code\Yes-Advizors-Portal` |
| Branch | `ui/redesign-v1` |
| Approved HEAD at time of this evidence | `814a52b6956363cb9c911cb4eac0c1babfd856ee` |
| Migration commit (forward SQL) | `05796268c7e0f5d5f597c9796fc32967ad9d237f` |
| Execution-readiness commit | `814a52b6956363cb9c911cb4eac0c1babfd856ee` |
| Forward migration file | `supabase/migrations/0021_service_applicability.sql` |
| Migration file SHA-256 (unchanged) | `f312ae5e2ef57fb7f06ca6df5c06d0f17f7d2adc00a4e4e5fb249b152680f6af` |

---

## 1. Pre-execution verification (read-only) — PASS

Ran `supabase/verification/M1B_P5_0021_pre_execution_verification_readonly.sql` on V2/yav2-dev
(read-only; every statement `SELECT`/`WITH`; no writes).

| Block | Result |
|-------|--------|
| PRE-1 `p5_0021_pre1_base_tables` | **9/9** required base tables present — PASS |
| PRE-2 `p5_0021_pre2_helpers` | all **3** exact helper signatures present (`audit_write_event(text,text,text,text,uuid,jsonb)`, `is_active_user()`, `is_admin_or_manager()`) — PASS |
| PRE-3 `p5_0021_pre3_objects_absent` | all Migration 0021 objects (2 tables + 3 RPCs) **absent** before execution — PASS |
| PRE-4 `p5_0021_pre4_events_absent` | the **4** target audit-event names **absent** — PASS |
| PRE-5 `p5_0021_pre5_unique_absent` | scoped `client_registrations_id_client_uq` (public.client_registrations, contype `u`) **absent** — PASS |
| PRE-7 `p5_0021_pre7_ready` | **`PASS_pre_execution_ready = true`** |

### Protected PRE-6 baseline snapshot (`p5_0021_pre6_protected_snapshot`)

| Metric | Baseline value |
|--------|----------------|
| `clients_rows` | **13** |
| `clients_services_elems` | **3** |
| `client_registrations_rows` | **0** |
| `audit_log_rows` | **20** |
| `audit_event_contract_rows` | **20** |
| `accounting_tracker` | **312** |
| `financials_tracker` | **120** |
| `income_tax_tracker` | **26** |
| `compliance_calendar` | **0** |
| `clients_id_is_uuid` | **true** |

---

## 2. Execution — PASS

- PJ manually executed the entire `supabase/migrations/0021_service_applicability.sql` **once** in the
  V2/yav2-dev (`ogjrwemjefvccpyjwxuo`) SQL Editor.
- The migration ran as a single transaction (`BEGIN … COMMIT`; fail-closed SECTION 0 preconditions +
  SECTION H postconditions).
- The Supabase SQL Editor returned **success with no visible error** (COMMIT).
- **The migration must not be rerun** — a second run is refused fail-closed by SECTION 0.

---

## 3. Post-execution verification (read-only) — PASS

Ran `supabase/verification/M1B_P5_0021_post_execution_verification_readonly.sql` on V2/yav2-dev
(read-only V1–V8).

| Block | Result |
|-------|--------|
| **V1** `p5_0021_v1_objects_and_empty` | `service_catalogue_rows` = **11**; `client_service_applicability_rows` = **0** — PASS |
| **V2** `p5_0021_v2_catalogue_codes` | exact **11** approved catalogue codes (ACCOUNTING, GST, TDS, PAYROLL, INCOME_TAX, ROC, LLP, STATUTORY_AUDIT, TAX_AUDIT, SECRETARIAL, OTHER) — PASS |
| **V3** `p5_0021_v3_constraints` | **`PASS_v3_constraints = true`** — all four named business CHECKs present (`csa_dates_chk`, `csa_effective_from_gate_chk`, `csa_effective_to_null_when_approved_chk`, `csa_approval_actor_chk`); status CHECK present; composite same-client FK present; `ON DELETE RESTRICT` present; `client_registrations_id_client_uq` present; live partial unique index present — PASS |
| **V4** `p5_0021_v4_rls` | RLS **enabled + forced** on both new tables; catalogue authenticated **SELECT only** (INSERT/UPDATE/DELETE denied) — PASS |
| **V5** `p5_0021_v5_privileges` | applicability: authenticated **SELECT only**; no direct INSERT/UPDATE/DELETE; anon SELECT denied — PASS |
| **V6** `p5_0021_v6_rpcs` | all **3** exact RPCs exist; SECURITY DEFINER; EXECUTE to `authenticated`; **denied** to anon, service_role and PUBLIC — PASS |
| **V7** (four-row audit-event query result; returns four rows, no JSON alias) | **4** required audit events present: `service_applicability.added` → CREATE; `.approved` / `.deactivated` / `.updated` → UPDATE; risk **MEDIUM**; sensitivity **S2**; resource type `client_service_applicability` — PASS |
| **V8** `p5_0021_v8_protected_baselines` | manual comparison vs PRE-6 — PASS (below) |

### V8 — protected post-execution counts (manual comparison vs PRE-6) — PASS

| Metric | PRE-6 | V8 (post) | Δ | Verdict |
|--------|-------|-----------|---|---------|
| `service_catalogue_rows` | (absent) | **11** | +11 (reference seed) | expected |
| `audit_event_contract_rows` | 20 | **24** | +4 (the 4 new events) | expected |
| `audit_log_rows` | 20 | **20** | 0 (migration writes no audit_log rows) | unchanged |
| `clients_rows` | 13 | **13** | 0 | unchanged |
| `clients_services_elems` | 3 | **3** | 0 | unchanged |
| `client_registrations_rows` | 0 | **0** | 0 | unchanged |
| `accounting_tracker` | 312 | **312** | 0 | unchanged |
| `financials_tracker` | 120 | **120** | 0 | unchanged |
| `income_tax_tracker` | 26 | **26** | 0 | unchanged |
| `compliance_calendar` | 0 | **0** | 0 | unchanged |
| `client_service_applicability_rows` | (absent) | **0** | 0 rows created | expected |

**Result:** V8 matches PRE-6 exactly except the two approved additive deltas (catalogue +11, audit
contract +4) and the new empty applicability table (0 rows). No protected count changed.

---

## 4. Closure statements

- **Migration 0021 — EXECUTED / CLOSED PASS** on V2/yav2-dev (`ogjrwemjefvccpyjwxuo`).
- **No client applicability rows were populated** — `client_service_applicability_rows = 0` (V1 and V8).
- **No compliance / tracker / calendar rows were generated** — `accounting_tracker` 312,
  `financials_tracker` 120, `income_tax_tracker` 26, `compliance_calendar` 0 all unchanged vs PRE-6.
- **No legacy `clients.services` data was changed** — `clients_rows` 13 and `clients_services_elems`
  3 unchanged vs PRE-6; the migration issues no write against `clients` (static no-write analysis in
  the Implementation Plan §7).
- **Rollback is NOT authorized** — the manual data-safe rollback
  (`supabase/verification/rollback_0021_service_applicability_manual.sql`) requires a separate,
  explicit PJ + ChatGPT decision and was **not** run.
- **Migration 0021 must NOT be rerun** — SECTION 0 is fail-closed and refuses a second run.
- **V1/Production `zcszesuvjrryxtigjglt` remained untouched** — never connected at any point.
- **P5 UI implementation remains a separate, unopened gate** — no P5 UI, P6, P2.2, D4 population,
  Clean-Start Reset, Production merge, or deployment was started by this closure.

---

## 5. Governance boundary of this evidence file

Preparing this document: executed **no** SQL, opened **no** Supabase/MCP connection, made **no** commit
or push, did **not** modify the forward migration SQL, and did **not** run the rollback. All values above
were transcribed from PJ's V2 SQL Editor outputs. This record is held for independent ChatGPT review
before any commit.
