# M1-B P6 — SELECT-Only Live Diagnosis Closure Report

**Verdict:** **PASS WITH SPECIFIC CORRECTIONS.** **Documentation-only closure.** No implementation, no mutation.
**Branch/HEAD:** `sync/integration` @ `b1f2b60d52a0d09a9561e06182b5ced397ff8439`.
**Diagnosis package (authored, not stored in this worktree):** the 42-block SELECT-only script `P6_FINAL_SELECT_ONLY_V2_DIAGNOSIS.sql` (SHA-256 `cdad46e9de2cd21e8420080709093eb69ac7be0203daa093088b09b2ae20ceac`) resides in a separate recovery checkout and is **outside** this documentation package.
**Data minimisation:** no PAN/GSTIN/TAN/mobile/email/address/bank/document-path/remark/monetary value is recorded here; only presence/absence, FY/period coverage, catalog metadata.

---

## 1. Scope
Read-only live diagnosis of the P6 "historical & current compliance period" surface on V2/yav2-dev, to determine actual backend capability (not source-only inference) ahead of any P6 implementation. Covered: financial-year state, migration-ledger visibility, generation-function bodies/security, YA-012 live state, historical boundary, tracker constraints/idempotency, RLS/grants, function security, and document soft-references.

## 2. Environment
- **Supabase project:** yav2-dev · **project ref:** `ogjrwemjefvccpyjwxuo` (V2 only). V1/Production `zcszesuvjrryxtigjglt` never touched.
- **Executor:** PJ (manual SQL Editor). **Terminal 1 executed no SQL.**

## 3. Execution summary
- **42 of 42** SELECT-only blocks completed. **No mutation performed** (no DDL/DML/migration/function-body change).
- Findings recorded below in four visibly-separate categories: **VERIFIED LIVE**, **INFERENCE**, **DESIGN GAP**, **PROPOSED REMEDIATION**.

---

## 4. VERIFIED LIVE (from the 42-block outputs)
**4.1 Financial-year state** — `financial_years` holds FY **2022-23 → 2030-31**; **FY 2026-27 is the single current FY**; `public.get_current_fy()` returns **2026-27**. The database is **not** missing FY 2026-27.

**4.2 Migration-ledger visibility** — `supabase_migrations.schema_migrations` was **not visible**. Only Supabase subsystem tables were visible (`auth.schema_migrations`, `realtime.schema_migrations`, `storage.migrations`). **These are NOT the application migration ledger** and must not be treated as such.

**4.3 Generation functions** — `generate_client_compliance_core()` and `activate_accounting_service()` generate through `get_current_fy()`. **No reviewed function contained an upper ceiling `<= '2025-26'`**, and none hard-coded the current FY as 2025-26. The `2025-26` references are **start-policy fallback** logic for clients lacking a reliable incorporation date. **The live backend is not capped at FY 2025-26.**

**4.4 YA-012 live state** — YA-012 has **no** `date_of_incorporation`, `engagement_start`, `gst_registration_date`, `pf_registration_date`, `esi_registration_date`, **no** `client_registrations` rows, and **no** `client_service_applicability` rows. Tracker coverage: GST none · TDS none · **Income tax FY 2025-26 and FY 2026-27** · ROC none · LLP none · Audit none · **Accounting all 12 months for FY 2025-26 and FY 2026-27** · Payroll none · **Financials five document types for FY 2025-26 and FY 2026-27** · Compliance calendar none. → **YA-012 demonstrates the live backend already generates FY 2026-27.**

**4.5 Historical boundary** — **No rows earlier than FY 2025-26** were found in any of gst/tds/income_tax/roc/llp/audit/accounting/payroll/financials trackers.

**4.6 Constraints & idempotency** — Business unique constraints exist for accounting, audit, financials, gst, income_tax, llp, payroll, roc, tds trackers and `compliance_calendar`. **No visible business unique constraint** for **`notice_tracker`** or **`trust_ngo_tracker`**. Payroll uniqueness is only `(client_id, fy_label, month)` — it does **not** distinguish EPF vs ESIC, multiple registrations, or multiple establishments.

**4.7 RLS & grants** — RLS **enabled** on all reviewed tracker tables and `compliance_calendar`; **FORCE ROW LEVEL SECURITY is NOT enabled**. Under RLS: Admin/Manager generally ALL; Executive generally SELECT+UPDATE; Staff/Viewer generally SELECT; **Staff can UPDATE `llp_tracker`, `payroll_tracker`, `trust_ngo_tracker`**. Policies are **role-wide** — not visibly restricted by client assignment or ownership. At the table-grant layer, `anon`, `authenticated`, `service_role` hold **DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE** on all reviewed tracker tables and `compliance_calendar` — broad, relying heavily on RLS.

**4.8 Function security** — `generate_client_compliance` and `activate_accounting_service` are **SECURITY DEFINER**, executable by `authenticated` and `service_role`; internal helper/core functions are more restricted. Function `search_path` is **`public, pg_temp`** — **not** hardened to `pg_catalog, public, pg_temp`.

**4.9 Soft references** — `documents` carries `compliance_ref_id`, `compliance_type`, `compliance_period`, `fy_label`, `scope`; `financials_tracker` carries `document_id`; `compliance_calendar` carries `compliance_tracker_id`. **No corresponding FK constraints** were found — these are **soft references**, not FK-enforced.

---

## 5. INFERENCE (reasoned, not directly asserted)
- **I-1:** The "FY 2025-26 limitation" is **most likely stale frontend wording or stale frontend logic** — the backend verifiably supports FY 2026-27 (§4.1/§4.3/§4.4).
- **I-2:** YA-012 currently **falls back to the policy floor** because client-specific dates and applicability data are **absent** (§4.4) — not because the backend is capped.
- **I-3 (per correction #8):** live behaviour is **consistent with** the `get_current_fy()`-form generation functions, but because the application migration ledger was **not independently visible** (§4.2), **no migration is asserted as "applied" from live behaviour alone.**

---

## 6. DESIGN GAP (structural shortfalls surfaced)
- Generation is **not driven by approved Service Applicability**; the **later-of start-rule** is incomplete (incorporation-only). 
- **Broad table grants** + **no FORCE RLS** + **role-wide policies** concentrate all confidentiality on RLS with a wide privilege surface; **Staff UPDATE** is inconsistent across trackers.
- **Function `search_path`** not hardened to include `pg_catalog` first.
- **Missing business unique constraints** for `notice_tracker`/`trust_ngo_tracker`; **payroll establishment/registration model** is absent.
- **Soft references** lack FK enforcement.
- **Application migration ledger** is not independently observable.

---

## 7. PROPOSED REMEDIATION — correction register
Classifications: **Sev** = severity · **Biz** = business impact · **Sec/DI** = security or data-integrity impact · **Pkg** = proposed package · **DB** = database mutation required · **FE** = frontend work required · **PJ** = PJ business decision required. *(All PROPOSED — none authorised.)*

| # | Correction | Sev | Biz impact | Sec/DI impact | Pkg | DB | FE | PJ |
|---|---|---|---|---|---|:--:|:--:|:--:|
| 1 | Stale frontend FY warning/logic (frontend caps at 2025-26 though backend supports 2026-27) | Medium | Misleading "not supported" message to users | None | **P6A** | No | Yes | No |
| 2 | Missing Service Applicability enforcement in generation | High | Obligations not gated by approved applicability | Data-integrity (wrong/over-generation) | **P6B** | Yes | Yes | Yes |
| 3 | Incomplete later-of-date start-rule enforcement (incorporation-only) | Medium | Wrong start period per client/service | Data-integrity (over/under-generation) | **P6B** | Yes | Maybe | Yes |
| 4 | YA-012 missing dates & applicability data | Medium | Client falls back to policy floor; incomplete obligations | Data-quality | **P6B** (data) | Yes | Maybe | Yes |
| 5 | Broad table grants (anon/authenticated/service_role full DML incl. DELETE/TRUNCATE) | High | Wide privilege surface; reliance on RLS only | Security (privilege surface) | **P6C** | Yes | No | Yes |
| 6 | FORCE RLS not enabled on trackers/calendar | Medium-High | Owner/definer paths can bypass RLS | Security | **P6C** | Yes | No | Yes |
| 7 | Role-wide tracker policies (no client-assignment/ownership scoping) | Medium | Any role sees all clients' rows for its command | Data-confidentiality | **P6C** | Yes | No | Yes |
| 8 | Staff UPDATE inconsistencies (llp/payroll/trust_ngo) | Medium | Inconsistent write authority | Security/consistency | **P6C** | Yes | No | Yes |
| 9 | SECURITY DEFINER `search_path` not hardened (`public, pg_temp`) | Medium | — | Security (search_path shadowing) | **P6C** | Yes | No | No* |
| 10 | Missing business unique constraints: `notice_tracker`, `trust_ngo_tracker` | Medium | Duplicate/unsafe regeneration | Data-integrity (idempotency) | **P6D** | Yes | No | Yes |
| 11 | Payroll registration/establishment modelling gap (key = client/fy/month only) | Medium | Cannot distinguish EPF/ESIC, multi-registration/establishment | Data-integrity | **P6D** | Yes | Maybe | Yes |
| 12 | Soft references without FK enforcement (documents/financials/calendar) | Low-Medium | Orphan/mismatch risk in linkage | Data-integrity | **P6D** | Yes | No | Yes |
| 13 | Application migration ledger not independently visible | Medium | Cannot confirm applied migration set / governance | Governance/observability | **P6D** | No | No | Yes |

*\#9 is a technical hardening; PJ authorises execution but it is not a business-rule decision.*

---

## 8. Next-package recommendation (RECOMMEND ONLY — do not start)
- **P6A — Frontend warning & display alignment:** retire/repair the stale "FY 2025-26 not supported" wording/logic so the UI reflects verified backend FY 2026-27 support (frontend-only; corrections #1).
- **P6B — Generation policy & Service Applicability design:** applicability-driven, later-of-date-aware generation; per-client start data governance (corrections #2, #3, #4).
- **P6C — RLS, grants & function-security hardening:** tighten table grants, add FORCE RLS, scope policies, reconcile Staff UPDATE, harden definer `search_path` (corrections #5–#9).
- **P6D — Schema integrity & payroll establishment model:** add missing unique constraints, model payroll registrations/establishments, enforce/qualify document linkage, and establish independent application-migration-ledger visibility (corrections #10–#13).

Sequencing is a PJ decision; **none of P6A–P6D is authorised or started.**

---

## 9. Explicit no-mutation confirmation
This diagnosis and closure are **documentation-only**. **No SQL executed by Terminal 1, no Supabase mutation, no migration, no application/SQL/verification/transport file changed, no file moved/copied between worktrees, no staging/commit/push/PR/merge/deploy, no V1/Production access.** Backend behaviour was observed via PJ-run SELECT/catalog reads only; **no migration is claimed applied on the basis of live behaviour alone** (§4.2/I-3). `ui/redesign-v1` untouched.
