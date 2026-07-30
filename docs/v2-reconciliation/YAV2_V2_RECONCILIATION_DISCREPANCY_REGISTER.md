# YAV2 Portal V2 — 0021–0024 Reconciliation — Discrepancy Register

> Opened during package authoring; **live columns filled only after PJ's SELECT-only run**.
> A discrepancy = any live result that diverges from the Expected-State Matrix, OR any assertion
> that cannot be evaluated (UNKNOWN / NOT VISIBLE). Pre-run entries below are **candidate**
> discrepancies flagged by the source/register reconciliation — they are hypotheses to test live,
> not confirmed defects.

Severity: **HIGH** (security/data-integrity) · **MED** (functional) · **LOW** (cosmetic/provenance).
Class: `VARIANCE-CONFIRMED` · `MATCH` (no discrepancy) · `EVIDENCE-PENDING` · `NOT-VISIBLE` · `INFO`.

---

## Candidate discrepancies identified during authoring (to test live)

| ID | Area | Description | Source evidence | Expected live | Live result | Severity | Class | Disposition |
|---|---|---|---|---|---|---|---|---|
| DR-1 | 0023 grants | Register claims G-05/V-5 **CLOSED PASS** (17 fns de-PUBLIC-ed) but there is **no migration-ledger evidence** and T3 previously **confirmed** all 17 functions still had PUBLIC+anon EXECUTE. | `remediation-t4/EXECUTION_CLOSEOUT_0023.md`; T3 `:125,:162,:184` | D4/D5/L2: no PUBLIC/anon EXECUTE on the 17 | _(pending)_ | HIGH | EVIDENCE-PENDING | Live D4/D5/L2 decide: PASS confirms 0023 applied; FAIL means self-reported closure not reflected live |
| DR-2 | 0024 search_path | Register claims V-4 **CLOSED PASS** 2026-07-26 for 3 helpers → `pg_catalog, public, pg_temp`; no ledger; T3 proved bare `public` pre-state. | `remediation-t4/0024-execution-readiness/EXECUTION_CLOSEOUT_0024.md`; T3 `:159` | D6/L3: all 3 hardened | _(pending)_ | LOW | EVIDENCE-PENDING | Live D6/L3 decide |
| DR-3 | 0021/0022 applied-status vs file header | Migration files 0021/0022 still carry header **"DRAFT — NOT EXECUTED"**, while the register records both **EXECUTED / CLOSED PASS**. Documentation inconsistency (not necessarily a live defect). | `0021_service_applicability.sql` header; register `:293-294` | Objects present live (C/D/E) — likely PASS | _(pending)_ | LOW | INFO | If C/D/E PASS, note the file-header wording as a doc-hygiene item (do not edit here) |
| DR-4 | Ledger absence | `supabase_migrations.schema_migrations` documented **absent** on V2 → applied-status of 0021–0024 is not ledger-provable. | T3 `G-02`; P6 closure `:26` | B1–B3 NOT VISIBLE | _(pending)_ | LOW | NOT-VISIBLE | Accepted provenance limitation; rely on object/definition/ACL evidence, never on ledger |
| DR-5 | 0023/0024 not in `migrations/` | 0023/0024 exist only as `*.PROPOSED.sql` under `verification/remediation-t4/`, never added to `supabase/migrations/`. If closeout prose is accurate they were applied **out-of-band by hand**. | folder listing; `T4_REMEDIATION_DESIGN.md:6` | n/a (structural) | n/a | LOW | INFO | Governance note: live ACL/search_path evidence is the only proof these took effect |
| DR-6 | P6 service-applicability wiring | P6 closure records a **design gap**: generation is NOT yet driven by approved Service Applicability (deferred to P6B). | `M1B_P6_SELECT_Only_Diagnosis_Closure_Report.md:52` | No applicability-gated generator expected | _(pending)_ | INFO | INFO | Out of scope for 0021–0024; record only |
| DR-7 | P6A frontend vs backend | Pre-fix frontend hard-codes `BACKEND_MAX_FY='2025-26'`; backend (0014) already uncapped. PR #35 corrects the frontend. | `src/lib/financialYear.js:66`; PR #35 `43aecec` | Backend I2/J1: no 2025-26 cap → frontend fix justified | _(pending)_ | MED | EVIDENCE-PENDING | Backend blocks I2/J1 substantiate PR #35's premise; PR #35 itself untouched |
| DR-8 | Object-count drift | Live prior figures were 39 tables / 51 functions / 3 views. New helpers or hand-applied changes could shift function count. | T3 `:28-30` | L5 ≈ 39 / 51 / 3 | _(pending)_ | LOW | EVIDENCE-PENDING | Investigate any material delta |

---

## Live discrepancies discovered during execution (PJ/Claude fill after run)

| ID | Block | Expected | Actual (live) | Severity | Class | Root-cause hypothesis | Action / owner |
|---|---|---|---|---|---|---|---|
| DL-1 | | | | | | | |
| DL-2 | | | | | | | |
| DL-3 | | | | | | | |
| DL-4 | | | | | | | |
| DL-5 | | | | | | | |

---

## UNKNOWN / NOT-VISIBLE register (must be listed explicitly, never silently dropped)

| ID | Block | Why unresolved | Retry condition |
|---|---|---|---|
| UN-1 | B1–B3 | Migration ledger expected absent / permission-denied | Re-check if Supabase later exposes `supabase_migrations` |
| UN-2 | | | |
| UN-3 | | | |

---

## Closure rule

This package cannot be declared **reconciled** while any HIGH-severity `EVIDENCE-PENDING` item
(e.g. DR-1) is unresolved. UNKNOWN/NOT-VISIBLE items are acceptable to carry **only** if explicitly
recorded here with a retry condition — they must never be reported as PASS.
