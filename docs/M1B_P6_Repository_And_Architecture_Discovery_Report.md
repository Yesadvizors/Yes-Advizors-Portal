# YAV2 Portal V2 — Module 1 — P6 Repository & Architecture Discovery Report

**Status:** DISCOVERY / DESIGN only. No implementation, no SQL executed, no DB access by Claude.
**Authored:** 2026-07-21 23:10 IST (UTC+05:30) · Author: Claude Code · Reviewer: ChatGPT · Approver: PJ.
**Repo / branch / HEAD:** `D:\Claude\Claude Code\Yes-Advizors-Portal` · `ui/redesign-v1` · `270da9e6c425a9bdc46276d659b7fed432ab7b53`.
**Authorised target:** Supabase V2 / yav2-dev (`ogjrwemjefvccpyjwxuo`) only. V1/Production `zcszesuvjrryxtigjglt` prohibited.

> **LATER-STATUS NOTE — MIGRATION NUMBERING (added on GitHub preservation, 2026-07-26 IST — does not alter the historical discovery facts below):** the discovery fact below that "migration file `0023` is not present in the repo → number free" was true at authoring (2026-07-22). Since then the `remediation-t4` identifiers **`0023_grants_hardening`** and **`0024_search_path_hardening`** were authored and executed on V2/yav2-dev. **No formal P6 migration number is approved.** Before authoring any P6 migration, the number MUST be reconciled against GitHub, the governing Master Completion Register, the `remediation-t4` package and live database evidence. **Do not assume or reuse `0023` or `0024`.**
>
> **LATER-STATUS NOTE — FY 2026-27 (added 2026-07-26 IST):** a later 42-block read-only live diagnosis **verified backend FY 2026-27 support** (`financial_years` includes FY 2026-27; `get_current_fy()` = FY 2026-27; the reviewed generators run through `get_current_fy()`). The final diagnosis is recorded in `docs/M1B_P6_SELECT_Only_Diagnosis_Closure_Report.md`. The historical discovery facts below are unchanged.

> Repository facts are read from the migration + source files at the governing HEAD. **Live-state facts are now
> incorporated from the manually-executed B0–B20 read-only run of 22 July 2026 IST** (PJ; V2/yav2-dev), captured
> verbatim in `docs/YAV2_P6_Readonly_Discovery_Execution_Capture_22_July_2026_IST.md`.

---

## 0. Runtime evidence incorporation (B0–B20, executed 22 July 2026 IST, V2/yav2-dev)

**Completeness:** B0, B2–B5, B7–B20 captured complete. **B1 (table inventory) and B6 (table grants) are PARTIAL**
— the Supabase result grid truncated at 100 rows; they **must not** be represented as complete proof. Supplemental
read-only queries (B1-S/B6-S/B7-S, batched/aggregate/metadata-only) are appended to the kit for PJ to run; they
are **not** yet executed.

**Legend:** [FACT] proven by runtime/repo evidence · [DECISION] genuine PJ business decision · [REC] Claude
technical recommendation (ChatGPT review) · [OPEN] unresolved / needs supplemental evidence.

| Area | Finding |
|---|---|
| Environment | [FACT] PJ manually confirmed V2 before running; SQL returned `database=postgres`, `role=postgres`; **SQL cannot prove the project ref** (B0 is a reminder only). |
| Applicability | [FACT] 2 **Approved** rows — INCOME_TAX/ANNUAL ×1, OTHER/ANNUAL ×1; plus Inactive OTHER/ANNUAL ×1 and Inactive TDS/MONTHLY ×1. Incomplete-approval 0; missing-owner 0; required-registration-missing 0; missing-effective_from 0; approved rows with effective_to 0; approved effective dates 21–22 Jul 2026; `row_version=2` on both Approved rows. |
| Service catalogue | [FACT] 11 active services; **all `requires_registration=false`; all `default_frequency=null`** → per-service registration + frequency are still undecided [DECISION D-02/D-forreq]. |
| Registrations | [FACT] `registrations_total=0`; `applicability_with_link=0`; cross-client link violations 0. |
| Financial years | [FACT] 11 active FYs (2020-21…2030-31); **2026-27 is the sole current FY**. |
| Protected baseline | [FACT] accounting_tracker 312 · financials_tracker 120 · income_tax_tracker 26 · compliance_calendar 0; all other tested families 0; accounting + income-tax rows all `Not Started`. |
| Duplicate checks | [FACT] accounting / income-tax / calendar duplicate groups = **0**. |
| **Tracker unique keys** | [FACT] **Every generated tracker already has a business-UNIQUE key** (B2): accounting `(client_id,fy_label,month)`; income_tax `(client_id,fy_label)`; financials `(client_id,fy_label,doc_type)`; gst `(client_id,gstin,return_type,fy_label,period)`; tds `(client_id,form_type,quarter,fy_label)`; roc `(client_id,fy_label,cin,form_name)`; llp `(client_id,fy_label,llpin,form_name)`; audit `(client_id,audit_type,fy_label)`; payroll `(client_id,fy_label,month)`; compliance_calendar `(client_id,compliance_tracker_id)`. `notice_tracker` and `trust_ngo_tracker` have PK only (not generation targets). **This corrects the earlier "trackers lack business-unique keys" statement.** |
| Lineage | [FACT] Only `client_service_applicability.row_version` exists; **no** generation-run / generated-by / generated-at / source-ref / batch-id / run-id lineage on any output tracker. |
| Team | [FACT] total 8; active 7; active Admin/Manager 4; auth-linked 8. |
| Audit | [FACT] audit_log 33 rows; service-applicability audit contracts exist; **no compliance-generation audit-event contract exists** (P6 must add them). `audit_log` enforces actor CHECKs: `user`→`actor_user_id` set / `actor_service` null; `service`→ vice-versa. |
| Legacy/test | [FACT] clients_total 13; clients_with_services 2; `is_test_client`-flagged 2 — **aggregates do NOT prove these are the same two clients** [OPEN]. |
| Object-name collision | [FACT] proposed P6 object names returned 0 rows in V2 (unused). [FACT-repo] migration file `0023` is **not present in the repo** (verified locally) → number free. |
| Functions / security | [FACT] legacy write-capable generators exist (`generate_client_compliance(_core)`, `activate_accounting_service`); write-capable service-applicability RPCs exist; **`authenticated` currently holds EXECUTE on certain write-capable functions**; no triggers on tested P6 surfaces; all P6 tables RLS-enabled; **FORCE RLS** on `audit_event_contract`, `audit_log`, `client_registrations`, `client_service_applicability`, `service_catalogue`. B6 grant evidence is PARTIAL. |

**Material security surface (P6 design) — stated precisely:** `authenticated` EXECUTE on write-capable functions,
plus `*_admin_manager_all` RLS granting Admin/Manager direct **ALL** on trackers, is a material **surface to verify
and harden**. **Do not overstate:** an EXECUTE grant alone does **not** prove an unaudited bypass, and the P5
`service_applicability_*` RPCs are **not** prohibited merely for being write-capable — they are SECURITY DEFINER
with internal `is_active_user()`+`is_admin_or_manager()` gates and audit emission (verify those gates separately).
P6 must: (a) route all generation through a new SECURITY DEFINER RPC boundary; (b) [REC T-08] revoke `authenticated`
EXECUTE on the **superseded legacy generators** and prevent direct `authenticated` **INSERT/DELETE** on
generation-target trackers + calendar, **while preserving narrowly-scoped UPDATE** (or workflow RPCs) for
operational edits; (c) not reuse the legacy generators (below). B7-S/B6-S quantify the exact exposure first.

**Legacy generators — NOT approved for P6 use:** `generate_client_compliance`, `generate_client_compliance_core`,
`activate_accounting_service` are attribute-driven, SUPERSEDED, and **explicitly not approved** for P6. `0014`
remains untouched. P6 defines a **separate** applicability-driven path with clear separation from these.

---

## 1. P6 in one sentence
P6 must generate **compliance obligations (tracker rows and/or compliance_calendar rows and/or tasks)** from
**approved `client_service_applicability` rows** — controlled, idempotent, dry-run-first, FY-aware, audited —
**superseding** the legacy attribute-driven generators, and **without** letting Client Master edits auto-generate.

## 2. Legacy generation stack (present state) — SUPERSEDED / must not be reused

| Object | Location | What it does | P6 disposition |
|---|---|---|---|
| `generate_client_compliance(uuid, text, p_has_gstin, …, p_incorporation_date)` | `0008` (orig), rewritten `0014` §6 | Frontend entry point; delegates to `generate_client_compliance_core` | **SUPERSEDED / PROHIBITED for reuse.** Attribute-driven (has_gstin/tan/cin/llpin), not applicability-driven. |
| `generate_client_compliance_core(…)` | `0014` §5 | The actual generator; clamps start FY via `resolve_client_start_fy`; writes tracker rows | **SUPERSEDED / PROHIBITED.** |
| `activate_accounting_service(uuid, varchar)` | `0008`, rewritten `0014` §4 | Generates monthly `accounting_tracker` rows from a start FY | **SUPERSEDED / PROHIBITED.** |
| Helpers `calc_gst_due_date`, `get_client_start_fy`, `resolve_client_start_fy`, FY-floor helper | `0007`, `0014` | Due-date / start-FY math used by the legacy core | **Reference only.** Due-date math may be re-derived (not reused wholesale) in P6 under new naming; do not call the legacy path. |
| `src/lib/complianceRunner.js` | frontend | Calls `generate_client_compliance` + `activate_accounting_service` RPCs and upserts `compliance_calendar` (`onConflict client_id,compliance_tracker_id, ignoreDuplicates`) | **Legacy path — must be replaced/gated** by the P6 RPC boundary; not the P6 entry point. |
| `src/components/Clients.jsx` (commented `generate_client_compliance`) | frontend | Dormant call site | Leave dormant; P6 introduces its own gated entry. |

**Rule:** P6 designs a **new** applicability-driven generation path. The legacy objects are **retained but frozen**;
their **removal is a future, separately-authorised phase** (candidate for the V2 Clean-Start Reset), not P6.

## 3. P6 INPUT surface — the applicability layer (P5, closed)

`public.client_service_applicability` (migrations `0021` + `0022`/PG-1):
- Keys: `id uuid PK`; `client_id uuid → clients(id) ON DELETE RESTRICT` (**authoritative client key is `clients.id` UUID**);
  `service_code → service_catalogue(code)`.
- Scope fields: `effective_from date`, `effective_to date`, `frequency` (CHECK ∈ MONTHLY/QUARTERLY/HALF_YEARLY/ANNUAL/EVENT_BASED/ONE_TIME/AS_REQUIRED),
  `linked_registration_id` (same-client composite FK → `client_registrations(id, client_id)`), `owner_team_id → team(id)`.
- Lifecycle: `status` ∈ Draft/Approved/Inactive (single authority); `approved_by`, `approved_at`;
  CHECKs: dates order; `effective_from` required once Approved; `effective_to` NULL while Approved; approval actor required when Approved;
  PG-1 `csa_other_notes_required_chk` (OTHER requires notes).
- Concurrency: `row_version integer NOT NULL DEFAULT 1` (optimistic lock).
- Live-uniqueness: `UNIQUE (client_id, service_code) WHERE status <> 'Inactive'` → at most one live (Draft or Approved) row per (client, service).
- RLS: enabled+forced; **Admin/Manager SELECT only**; writes RPC-only (`service_applicability_create/update/set_status`, SECURITY DEFINER).
- Audit events (contract): `service_applicability.added/updated/approved/deactivated` (MEDIUM/S2).
- **`client_service_applicability` records NO due dates / FY obligations / tracker rows and generates NO compliance** — that is exactly P6's job.

`public.service_catalogue`: `code PK`, `label`, `requires_registration bool`, `default_frequency` (nullable, same 7-value CHECK), `sort_order`, `is_active`.
- 11 seeded codes: ACCOUNTING, GST, TDS, PAYROLL, INCOME_TAX, ROC, LLP, STATUTORY_AUDIT, TAX_AUDIT, SECRETARIAL, OTHER.
- **`requires_registration=false` and `default_frequency=NULL` for all codes today** (neutral, pending PJ per-service rulings). → **PJ decision input for P6** (see Decision Register D-01/D-02).

Supporting inputs: `clients` (uuid `id` authoritative; legacy `client_id` text + `services` jsonb present but sample data),
`client_registrations` (has `UNIQUE (id, client_id)`; currently 0 rows), `financial_years` (`fy_label` unique, `fy_start_date`, `fy_end_date`, `assessment_year`, `is_current`, `is_active`).

## 4. P6 OUTPUT surface — trackers, calendar, tasks (present state)

| Table | Grain (intended) | Due-date columns | Lifecycle | row_version? | Business-unique key? |
|---|---|---|---|---|---|
| `accounting_tracker` | (client_id, fy_label, **month**) | (none per-row; monthly) | `status` enum, `workflow_stage` | **No** | see B15 (0014 added some keys) |
| `income_tax_tracker` | (client_id, fy_label) [annual] | standard/extended/individual_due_date | status/workflow | No | to confirm (B2/B3) |
| `gst_tracker` | (client_id, fy_label, period; freq monthly/quarterly) | standard/extended/individual | status/workflow | No | to confirm |
| `tds_tracker` | (client_id, fy_label, **quarter**) | standard/extended/individual | status/workflow | No | to confirm |
| `roc_tracker` | (client_id, fy_label, form/event) | standard/extended/individual | status/workflow | No | **none** (0014 note) |
| `llp_tracker` | (client_id, fy_label) | (0007) | status/workflow | No | **none** (0014 note) |
| `audit_tracker` | (client_id, fy_label) [annual] | standard/extended/individual | status/workflow | No | to confirm |
| `payroll_tracker`, `trust_ngo_tracker` | (client_id, fy_label, period) (0007) | — | status | No | to confirm |
| `financials_tracker` | (client_id, fy_label) (0007) | — | status | No | to confirm |
| `notice_tracker` | event-driven (authority/notice) | response_due_date | status | No | **not generated** (reactive) |
| `compliance_calendar` | (client_id, **compliance_tracker_id**) | `due_date NOT NULL` | `compliance_status_enum` | No | `UNIQUE (client_id, compliance_tracker_id)` (`compliance_calendar_client_tracker_key`, added `0014`) |
| `tasks` | free-form | `due_date`, `next_followup_date` | `status text` | No | **none**; `client_id` is **text** (legacy), not uuid |

**Critical observations for P6 design (corrected by the 22-Jul-2026 B2 evidence):**
1. **Trackers/calendar have NO `row_version`**, **but every generation-target tracker DOES have a business-UNIQUE key** (see §0 evidence table). Duplicate prevention is therefore **primarily enforced by each tracker's own UNIQUE key** (e.g. accounting `(client_id,fy_label,month)`, income_tax `(client_id,fy_label)`, calendar `(client_id,compliance_tracker_id)`); the P6 generation-line ledger adds **lineage + a secondary idempotency key**, not the sole guard. `notice_tracker`/`trust_ngo_tracker` have PK only and are not generation targets.
2. `compliance_calendar` is derived from a tracker row (`compliance_tracker_id`) and is unique on `(client_id, compliance_tracker_id)`.
3. `tasks.client_id` is **text** (legacy key), diverging from the `clients.id` UUID standard → task generation, if approved, needs a keying decision (Decision Register D-09).
4. Protected baseline (guard values): **accounting 312 · financials 120 · income_tax 26 · compliance_calendar 0** — every P6 dry-run/verification must preserve these until an approved execution deliberately changes them.

## 5. Security / concurrency infrastructure (present state)

- **Role helpers** (all `SECURITY DEFINER`, `STABLE`, pinned `search_path`, resolve `team.auth_user_id = auth.uid()`):
  `is_active_user()`, `is_admin()`, `is_admin_or_manager()`, `get_portal_role()`, `get_app_role_for_user(uuid)` (`0008`, NULL-safe per `0016`). Fail-closed on null `auth.uid()`.
- **Audit:** `audit_write_event(text,text,text,text,uuid,jsonb)` (`0016`) — SECURITY DEFINER, fail-closed on null uid / inactive / non-admin-or-manager, validates against `audit_event_contract`, inserts one `audit_log` row; **internal** (not granted to `authenticated`/`anon`). `audit_event_contract` governs event vocabulary (risk_tier, sensitivity, required/optional keys, permitted actor/action/resource).
- **Optimistic locking:** `row_version` exists on `client_service_applicability` and the M1-A client-master tables **only**. Output trackers/calendar have none.
- **Concurrency:** no advisory-lock or generation-run infrastructure exists today. **Anti-duplication on outputs is already provided by each tracker's business-UNIQUE key** (B2 evidence) plus `compliance_calendar_client_tracker_key`. → P6 adds advisory locking + a generation-run/line ledger for **lineage, preview parity and safe concurrent retry**, layered on top of (not replacing) the existing unique keys.
- **RLS on outputs (`0010`):** trackers = Admin/Manager ALL + Executive/Staff/Viewer SELECT (+ Executive UPDATE); `compliance_calendar` = Admin/Manager ALL + Executive SELECT/UPDATE. Admin/Manager have direct ALL (incl. INSERT/UPDATE/DELETE) on trackers today — a P6 hardening item (technical recommendation T-08, ChatGPT review): route generation through SECURITY DEFINER RPCs and revoke direct `authenticated` **INSERT/DELETE** (preserving narrowly-scoped UPDATE for workflow), akin to the D2b bypass closure but UPDATE-preserving.

## 6. Present-state dependency map

```
                       ┌─────────────────────────────────────────────┐
                       │  P5 (CLOSED): approved entitlement/scope      │
                       │  client_service_applicability (status=Approved)│
                       │   + service_catalogue + client_registrations  │
                       └───────────────┬──────────────────────────────┘
                                       │  (P6 reads Approved rows only)
        financial_years ───────────────┤
        (fy ranges, is_current)         ▼
                       ┌──────────────────────────────────────────────┐
                       │  P6 GENERATION (to design)                    │
                       │  A. dry-run preview (read-only)               │
                       │  B. approved execute (atomic, audited)        │
                       │  C. verify / recover                          │
                       │  + generation-run ledger + lineage + locks    │
                       └───────────────┬──────────────────────────────┘
                                       ▼  (writes, gated, idempotent)
   accounting/income_tax/gst/tds/roc/llp/audit/payroll/... trackers
                          + compliance_calendar  (+ tasks?  → D-09)
                                       │
                                       ▼
                       Compliance.jsx / Dashboard views (v_firm_dashboard, …) read them
                                       │
                                       ▼
                       audit_log  ◀── audit_write_event (every P6 execute)

   LEGACY (frozen, NOT the P6 path): generate_client_compliance(_core),
   activate_accounting_service, complianceRunner.js  ── superseded, retained.
```

## 7. Authoritative relational keys
- **Client identity:** `clients.id` (UUID) is authoritative everywhere in Module 1. `clients.client_id` (text) and `tasks.client_id` (text) are legacy and must not be introduced as new relational keys.
- **Applicability identity:** `client_service_applicability.id` (UUID) + `row_version` (optimistic lock) is the P6 source-of-generation identity.
- **Registration identity:** `client_registrations.id` with composite `UNIQUE (id, client_id)` enabling same-client FK.
- **FY identity:** `financial_years.fy_label` (unique) is the human key; `financial_years.id` the surrogate. Trackers store `fy_label` (and often `fy_id`).

## 8. Gaps that become P6 work (forward pointers)
1. Per-service **frequency + registration + output-target rules** are undecided in `service_catalogue` (neutral defaults) → Business Rules doc + Decision Register.
2. **No lineage** columns on outputs (`generation_run_id`, `source_applicability_id`, `source_row_version`, `generated_by/at`) → Data Model doc proposes them (additive).
3. **No generation-run ledger** and **no advisory-lock/idempotency** infra → Generation Architecture doc.
4. **Direct-DML on trackers** still granted to `authenticated` (legacy) → security-hardening decision.
5. **Tasks keyed by text** → keying/authorisation decision if task generation is in P6 scope.

See the companion documents for the full design and the PJ Decision Register for every genuine open question.
