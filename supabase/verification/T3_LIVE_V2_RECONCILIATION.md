# T3 — Live V2 Evidence Reconciliation (documentation only)

**Owner:** TERMINAL 3 — Supabase & Security · **Branch:** `sync/supabase-security` (aligned to integration HEAD)
**Governing Issue:** #23 · **Integration HEAD:** `0455a3726adf5086f64bb0ffc8aeb6d7d1e02419`
**Authorised environment:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` **ONLY** · **Prohibited:** V1 `zcszesuvjrryxtigjglt`.
**Nature:** reconciliation of **PJ-supplied manual read-only V2 evidence** against the frozen T3 source contract.
**No database was queried by T3.** No SQL, no V1, no mutation, no deployment, no remediation. See constraints at end.

## Environment identity (confirmed by PJ)
Supabase dashboard visually confirmed: project **yav2-dev**, ref **`ogjrwemjefvccpyjwxuo`**, region **ap-south-1**.
All evidence below is attributed to that project only. No evidence indicated `zcszesuvjrryxtigjglt`.

---

## A. Five verification lenses (kept separate)

| Lens | Scope | This reconciliation |
|---|---|---|
| **1. Source-contract** | Frozen authored contract (merged in `sync/integration`) | `T3_DB_CONTRACT_PROPOSAL.md`/`_APPENDIX.md`/`T3_SECURITY_VARIANCE_REPORT.md` — internally consistent |
| **2. Live-state** | V2 catalog: objects, RLS/FORCE, policies, grants, functions, search_path, auth/team, storage, views | Reconciled below from PJ evidence |
| **3. Data-content** | Row counts / population / backfill state | Reconciled (§D) — informational, no schema bearing |
| **4. Runtime** | Per-tab / per-role RBAC behaviour (G-12/G-13) | **NOT performed** here — T2 domain, still EVIDENCE-PENDING |
| **5. Deployment** | Edge Functions, Vercel, alias | Edge = **0 deployed** (§ G-10); Vercel/alias = T1, out of scope |

---

## B. Source ↔ live cross-checks that MATCH exactly (verified against merged migrations)
- **Total public tables:** source authored **39** (4+8+8+3+5+9+2 across 0002–0021) = live **39**. ✔
- **FORCE RLS set:** source authored FORCE on **14** — 3 audit (`0005`), 9 M1-A (`0015`: client_persons, client_registrations, gst_registration_details, client_identifiers, client_contacts, client_addresses, client_relationships, client_remediation_flags, entity_type_catalogue), 2 P5 (`0021`: service_catalogue, client_service_applicability) = live **FORCE on 14, not on 25**. ✔
- **Functions:** source authored **51** distinct functions across all merged migrations (0007/0008/0014/0016/0017/0021) = live **51**. ✔
- **No leftover open policy:** V-2 critical check — no `*_authenticated_all` policy live. ✔ (0010 correctly superseded 0006.)
- **Bare-`'public'` helpers:** source = `get_portal_role`, `is_active_user`, `is_admin_or_manager` = live exactly those 3. ✔
- **`v_firm_dashboard` present** with the authored shape (the `due_in_7_days` view). ✔

---

## C. Governing-item reconciliation (G-02 … G-11)

| Gap | Requirement | Source expectation | Live evidence (V2, PJ) | Class | Sev | Remediation required | Remediation authorised? | Reference |
|---|---|---|---|---|---|---|---|---|
| **G-02** | Migration ledger reconciled | Authored `0001–0022`; gaps `0012/0013/0019/0020`; live ledger should reconcile | `supabase_migrations.schema_migrations` **does not exist**; 32/33 expected objects present (all 29 tables; 3/4 views) | **BLOCKED** (ledger) + **PASS** (object existence) | Low | Ledger absence is a provenance gap. **Object presence provides evidence that equivalent database objects exist live, but does not prove the migration-ledger history or establish which migration files were executed.** Optional CLI-ledger backfill | No (not required) | `T3_DB_CONTRACT_PROPOSAL.md §0`; A4 §9b / Part2 §9 |
| **G-03** | Live schema/tables/columns vs source | 39 tables, 19 enums, columns per appendix | 39 public tables present; 29 expected-existence objects present; **live column inventory CAPTURED for 14 tables** (see §C-1); source side established from merged migrations | **PASS** (table/object existence) + **PARTIAL PASS / RECONCILIATION PENDING** (column-level: live captured, source-to-live equality pending repository comparison) | Medium | Complete field-by-field equality (names/types/nullability/defaults) by merging the captured live inventory with the source column contract; **T3 does not claim equality until proven** | No (read-only compare only) | `T3_DB_CONTRACT_APPENDIX.md` A/C/D; §C-1 below |
| **G-04** | RLS enabled + FORCE + policies | RLS on all app tables; FORCE on 14; 25 ENABLE-only by design; refined role policies; audit tables default-deny | 39 tables **all RLS-enabled**; **FORCE 14 / not-FORCE 25** (matches source set); **93 policies / 36 tables, all `authenticated`, no `anon`**; 3 audit tables FORCE with no ordinary policy | **PASS** | — | None (matches source). V-1 (25 ENABLE-only) is design characteristic, not a defect | N/A | `T3_SECURITY_VARIANCE_REPORT.md S2`; `0005/0006/0010/0015/0021` |
| **G-05** | Grants / EXECUTE least-privilege | All application functions `REVOKE … FROM PUBLIC, anon`; CRUD RPCs EXECUTE to `authenticated` only | **17 unique functions with EXECUTE to BOTH PUBLIC and anon — enumerated** (see §C-2) | **VARIANCE — CONFIRMED (V-5 materialised)** | **Aggregate HIGH** (driven by `get_sensitive_audit_logs` + privileged role/audit helpers; individual exploitability varies — see §C-2) | Explicit `REVOKE ALL … FROM PUBLIC, anon`; source-contract triage + remediation decision **pending** | **No** (do not revoke now) | `T3_SECURITY_VARIANCE_REPORT.md V-5`; `T3_PJ_EVIDENCE_REQUEST.md Step 3 item 2`; §C-2 |
| **G-06** | SECURITY DEFINER `search_path` | Every definer pins `search_path`; 3 helpers bare `'public'` (V-4) | 51 functions, 48 DEFINER, **all 51 have explicit `search_path`**; 3 helpers = `public` only; **public-schema ACL: CREATE only to `pg_database_owner`; PUBLIC/anon/authenticated = USAGE not CREATE** | **PASS** (S3); **V-4 currently benign** | Low | Repin the 3 helpers to `pg_catalog,public,pg_temp` as defence-in-depth (shadowing precondition absent today) | No (hardening only) | `T3_SECURITY_VARIANCE_REPORT.md S3/V-4` |
| **G-07** | Auth ↔ team mapping | `team.portal_role`+`is_admin`+`is_active`; `auth_user_id` mapping | 10 auth users (10 confirmed, 0 banned); 8 team rows (7 active, 1 inactive); **8/8 mapped, 0 orphan team, 0 duplicate**; **2 orphan Auth users** (confirmed, not banned); roles: Admin 3, Manager 1, Executive 1, Staff 2 (1 inactive), Viewer 1 | **PASS** (integrity) + **VARIANCE** (2 orphan Auth) | Low | Decide disposition of 2 orphan Auth users (map to team or decommission); they resolve to `denied` today so cannot access app data | No (not required) | `T3_PJ_EVIDENCE_REQUEST.md Part2 §11/§11b/§11c` |
| **G-08** | Storage isolation (`secure-docs`) | Frozen DB source `0011` is a **DEFER manifest** (buckets commented, "nothing executable, AUTHORED NOT APPLIED"); `0012` secure-docs live-only | `secure-docs`: public=false, 6 objects, policy `secure_docs_admin_manager_all` (authenticated, ALL, `bucket_id='secure-docs' AND is_admin_or_manager()`); `completed-work`/`client-docs` **absent** | **secure-docs: PASS** (exists, private, admin/manager-restricted) · **completed-work + client-docs: SOURCE-EXPECTATION RECONCILIATION PENDING** | Med (pending) | Determine whether `completed-work`/`client-docs` are required by frozen governing source — they are **not required** by any executable migration (`0011` defers them; described as frontend paths only). Classify as variance **only if** governing source explicitly requires them | No (no bucket/policy change) | `supabase/migrations/0011_storage_and_edge_DEFER.sql:10-11,15-17`; `T3_DB_CONTRACT_PROPOSAL.md §5` |
| **G-09** | Edge source recovery | Governing register: required outcome = **"Source recovered into governing (versioned)"**, status **OPEN** | No `.ts` recoverable in any ref; none invented (exhaustive all-ref search) | **PENDING GOVERNING GAP-DEFINITION RECONCILIATION** — the register defines success as *versioned source recovered*; it defines **no** "NOT-RECOVERABLE" terminal state, so evidence of unattainability cannot itself close it in the governing model | — | Governing register must record the NOT-RECOVERABLE evidence to formally resolve G-09; until then it stays OPEN/pending. No code invented | N/A (documentation) | Def: `docs/recovery/GAP_REGISTER.md:17` · Evidence: `supabase/functions/EDGE_FUNCTION_RECOVERY_STATUS.md` |
| **G-10** | Edge deployment state | Governing register: required outcome = **"Deploy state per function known"**, acceptance = **"Deployed list captured"**, status EVIDENCE-PENDING | **Zero Edge Functions deployed** on V2 (deployed list captured = empty) | **PASS** — governing acceptance ("Deployed list captured") met; deploy state now known | — (acceptance met) | None for the gap itself. The **0-deployed** state is retained as live evidence; whether the app requires deployment is a separate app-functionality concern (relates to G-09 unrecoverable source). No deployment authorised | No (do not deploy) | Def: `docs/recovery/GAP_REGISTER.md:18` · Evidence: `EDGE_FUNCTION_RECOVERY_STATUS.md` |
| **G-11** | Views reconciled | 3 views authored in `0009`; `v_team_workload` **not authored in any governing migration** (DEFER note only) | `v_firm_dashboard`, `v_client_compliance_summary`, `v_overdue_ageing` **present**; `v_team_workload` **absent** | **PASS** (3/3 authored views present) · `v_team_workload`: **CROSS-PACKAGE SOURCE COMPLETENESS VARIANCE** (consumed by app source, absent from **both** live V2 **and** the frozen authored DB source set) | Medium | Author `v_team_workload` (needs column spec) or remove the app-source reference — cross-package (T2/G-19 + T3 spec). **Not** a failure to apply an authored migration (never authored) | No (needs spec) | `supabase/migrations/0009_views.sql` (3 views); DEFER note `0011_storage_and_edge_DEFER.sql:29-30`; `T3_DB_CONTRACT_PROPOSAL.md §3` |

### §C-1. G-03 column-contract reconciliation (source side performed; equality pending)
**Live column inventory CAPTURED** by PJ for 14 tables. The **source side** is fully established from the merged
migrations (all 14 defining migrations located in-repo). Field-by-field equality (names/types/nullability/defaults)
is the remaining step and requires merging the two captures — **T3 does not assert equality until proven.**

| Table | Source definition (merged repo) | Source column contract |
|---|---|---|
| `clients` | `0002_tables_people_and_clients.sql` | `T3_DB_CONTRACT_APPENDIX.md` §A |
| `team` | `0002_tables_people_and_clients.sql` | §A |
| `client_persons` | `0015_m1a_client_master_foundation.sql` | §C |
| `client_identifiers` | `0015…` | §C |
| `client_addresses` | `0015…` | §C |
| `client_contacts` | `0015…` | §C |
| `client_registrations` | `0015…` (+ `0021` adds `client_registrations_id_client_uq`) | §C |
| `gst_registration_details` | `0015…` | §C |
| `client_relationships` | `0015…` | §C |
| `client_service_applicability` | `0021_service_applicability.sql` (+ `0022` CHECK) | §D |
| `service_catalogue` | `0021…` | §D |
| `audit_event_contract` | `0005_audit_phase4b.sql` | §A |
| `audit_log` | `0005…` | §A |
| `audit_ingestion_failures` | `0005…` | §A |

**Classification (G-03 column-level): PARTIAL PASS / RECONCILIATION PENDING** — live inventory captured, source
contract established; the value-level equality determination remains pending the side-by-side merge. No live SQL run.

### §C-2. G-05 — the 17 PUBLIC/anon EXECUTE functions (enumerated)
**17 unique functions with PUBLIC and anon EXECUTE have been enumerated.** Source-contract triage and the
remediation decision remain **pending**. **`get_sensitive_audit_logs` IS included.** No remediation is authorised.

**Contract variance: CONFIRMED.**
**Aggregate severity: HIGH**, driven particularly by `get_sensitive_audit_logs` and privileged role/audit helper
exposure. **Individual exploitability depends on the function body, internal authorization gates and accessible
return data** — it is not uniform across the 17.

| Group | Functions | Practical-risk note (not remediation) |
|---|---|---|
| **Sensitive audit/log access** | `get_sensitive_audit_logs` | Highest concern. Returns audit data; mitigated in-body by an `auth.uid()` non-null + `get_app_role()='admin'` gate (defence-in-depth), but PUBLIC/anon EXECUTE still breaches least-privilege. |
| **Role/authentication helpers** | `get_app_role`, `get_app_role_for_user`, `get_my_role`, `get_my_team_id`, `get_portal_role`, `is_active_user`, `is_admin`, `is_admin_or_manager` | Expose role/identity resolution to anon; low direct data exposure but widen the reachable attack surface of the RBAC layer. |
| **Audit validation / internal helpers** | `_record_audit_failure`, `_write_read_audit`, `audit_contains_secret`, `audit_field_format_ok`, `audit_is_uuid`, `audit_validate_event` | Internal audit-pipeline helpers not meant to be caller-reachable; risk depends on side-effects/inputs. |
| **Pure calculation / read helpers** | `calc_gst_due_date`, `get_client_start_fy` | Lowest concern — computation/read utilities. |

Total = 1 + 8 + 6 + 2 = **17**. These are the `0007`/`0008`/`0014` helpers carrying the built-in default PUBLIC
EXECUTE never explicitly revoked (the V-5 latent default). The `0017` CRUD RPCs and `0016` `audit_write_event`
(which explicitly `REVOKE ALL FROM PUBLIC, anon`) are **not** among the 17 — consistent with source.

---

## D. Data-content verification (informational — no schema bearing)
- Row counts: `clients` 13, `team` 8, `service_catalogue` 11, `client_service_applicability` 4.
- **M1-A person/identity tables are EMPTY:** `client_persons` 0, `client_directors` 0, `client_identifiers` 0,
  `client_addresses` 0, `client_contacts` 0, `client_registrations` 0, `gst_registration_details` 0.
- **The approved 10-row weak-identity person backfill has NOT been executed.** No data migration authorised here.
- Audit: `audit_event_contract` 24 rows (risk tiers CRITICAL 1 / HIGH 5 / MEDIUM 17 / LOW 1); `audit_log` 33 rows;
  `audit_ingestion_failures` 0. **All 33 audit-log rows match an `event_name` in `audit_event_contract` (0 unmatched)**
  — referential integrity PASS. Keyword secret-scan: 33/33 checked, 0 possible secret-bearing rows.
  **The keyword scan is supporting evidence, not absolute proof** that no confidential value exists in any row.

---

## E. Internal consistency checks (all satisfied)
- ✔ **No claim that `v_team_workload` exists** — recorded **absent from both live V2 and the authored DB source**.
- ✔ **No claim that Edge Functions are deployed** — recorded as **0 deployed** (retained as live evidence).
- ✔ **No claim that a migration ledger exists** — `schema_migrations` recorded **absent** (BLOCKED, not "not applied").
- ✔ **No claim that orphan Auth users are resolved** — 2 orphan Auth users recorded **open**.
- ✔ **No claim that PUBLIC/anon EXECUTE grants were revoked** — recorded **confirmed variance, enumerated, not remediated**.
- ✔ **No claim that the client-person backfill was executed** — recorded as **not executed**.
- ✔ **No claim of exact source column equality** — column-level recorded **PARTIAL PASS / RECONCILIATION PENDING** (live inventory captured; source contract established; equality not asserted).
- ✔ **No governing "NOT-RECOVERABLE" state asserted for G-09** beyond what the register supports — reclassified to **PENDING GOVERNING GAP-DEFINITION RECONCILIATION** with cited definition.

---

## F. Evidence-based completion update (reproducible)
**Rule applied:** documentation activity itself counts **0**. Each contribution below is attributed **solely to
newly verified live V2 evidence**. Formula per area: **contribution_pp = area_weight × (new_fraction − prior_fraction)**,
where `area_weight` is in points-of-100 and fractions are area-completion.
**Rounding convention:** completion is calculated using **unrounded** figures and displayed to **one decimal place
using standard rounding**.

| # | Area | Area weight | Prior verified fraction | New verified fraction | Δ fraction | Contribution (weight × Δ) | Evidence basis (live V2, PJ) |
|---|---|---:|---:|---:|---:|---:|---|
| 3 | Supabase schema/DB | 15 | 0.20 | 0.28 | +0.08 | 15 × 0.08 = **+1.20 pp** | 39/39 tables present, 3/3 authored views present, 51/51 functions present; **enum live-reconciliation EVIDENCE-PENDING** and **column-level PARTIAL/PENDING** cap it below full |
| 4 | Security (RLS/RBAC/Auth/grants/audit) | 15 | 0.25 | 0.32 | +0.07 | 15 × 0.07 = **+1.05 pp** | RLS on all 39; FORCE 14=14; 93 policies clean (all `authenticated`, no `anon`, no `*_authenticated_all`); all 51 `search_path` pinned; public-schema CREATE locked to `pg_database_owner`; auth/team integrity (0 orphan team, 0 dup); audit referential integrity (0 unmatched); secure-docs pass — **capped** by confirmed HIGH grant variance (G-05) + pending RBAC runtime (T2) |
| 5 | Edge/storage/integrations | 15 | 0.10 | 0.12 | +0.02 | 15 × 0.02 = **+0.30 pp** | secure-docs verified private+role-gated; Edge deploy state now **known** (0 deployed — G-10 acceptance met) |
| 7 | Runtime/E2E | 10 | 0.12 | 0.12 | +0.00 | 10 × 0.00 = **+0.00 pp** | **No runtime tests performed** → no completion credit. Data-row counts (clients 13, team 8, CSA 4) are **informational evidence only**, not completion. |
| | **Total** | | | | | **+2.55 pp** | 1.20 + 1.05 + 0.30 + 0.00 = **2.55** |

**Reconciliation check:** 1.20 + 1.05 + 0.30 + 0.00 = **+2.55 pp** ✔ (matches the four mandated contributions).

- **Official completion (before):** **39.3%**.
- **Contribution:** **+2.55 percentage points**.
- **Provisional after (unrounded):** **41.85%** (= 39.3 + 2.55) → **displayed 41.9%** (one-decimal standard rounding).
- **Final revised completion:** **PENDING** independent review of the calculation above.
- **Remaining (unrounded):** **58.15%** → **displayed 58.2%** (one-decimal standard rounding).
- **Confidence:** **MEDIUM-HIGH** on verified live facts (PJ manual read-only capture; structural catalog evidence).
  **Caps:** column-level equality **pending** (not asserted); RBAC runtime negatives pending (T2); keyword
  secret-scan is not absolute proof. **No completion counted for documentation activity or data-row presence.**

## G. Unresolved items (for PJ / independent review — none remediated)
1. **G-05 (Aggregate HIGH) — CONFIRMED variance:** 17 enumerated functions with PUBLIC+anon EXECUTE (§C-2) — source-contract triage + REVOKE decision pending (not authorised).
2. **G-09 (pending):** PENDING GOVERNING GAP-DEFINITION RECONCILIATION — register requires versioned source recovery; no source exists; governing register needs to record the NOT-RECOVERABLE evidence.
3. **G-03 (Medium) — column-level:** PARTIAL PASS / RECONCILIATION PENDING — live inventory captured, source contract established; field-by-field equality pending the side-by-side merge.
4. **G-11 (Medium):** `v_team_workload` — CROSS-PACKAGE SOURCE COMPLETENESS VARIANCE (consumed by app source; absent from live **and** authored DB source).
5. **G-08 (pending):** `completed-work`/`client-docs` — SOURCE-EXPECTATION RECONCILIATION PENDING (frozen source `0011` defers, does not require them). secure-docs itself PASS.
6. **G-07 (Low):** 2 orphan Auth users; 1 inactive Staff (integrity otherwise clean).
7. **G-06 (Low):** 3 helpers pin bare `'public'` (benign today — public-schema CREATE locked to `pg_database_owner`).
8. **G-02 (Low):** live migration ledger (`schema_migrations`) absent (BLOCKED, not proof of non-application).

**Resolved this cycle (not unresolved):** **G-04** PASS; **G-06** PASS (S3); **G-10** PASS (governing acceptance "Deployed list captured" met — 0 deployed captured).

## Constraints honoured
No SQL executed by T3 · no V1 access · no create/alter/drop/insert/update/delete · no Edge deploy · no storage
change · no auth change · no grant/revoke change · **no remediation**. Commit, push and draft PR #33 were
performed **solely as authorised review actions**; **no merge, SQL, remediation, deployment or live action occurred.**

## Governance footer
```
Governing Issue: #23 · Integration HEAD: 0455a3726adf5086f64bb0ffc8aeb6d7d1e02419
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Target: sync/integration
Authorised: V2 ogjrwemjefvccpyjwxuo ONLY · Prohibited: V1 zcszesuvjrryxtigjglt (never queried)
Live evidence: PJ manual read-only capture · T3 role: reconciliation/documentation only
SQL/DB mutation: NOT AUTHORISED · Deploy/Alias: NOT AUTHORISED · Remediation: NOT PERFORMED · V1 access: NONE
```
