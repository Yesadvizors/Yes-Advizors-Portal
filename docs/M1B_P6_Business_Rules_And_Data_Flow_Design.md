# YAV2 Portal V2 — Module 1 — P6 Business Rules & Data-Flow Design

**Status:** DISCOVERY / DESIGN — PROPOSED. No implementation, no SQL executed, no DB access by Claude.
**Authored:** 2026-07-21 23:10 IST (UTC+05:30) · Author: Claude Code · Reviewer: ChatGPT · Approver: PJ.
**Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53` · branch `ui/redesign-v1`.

> This document proposes rules. **Every genuine business choice is deferred to the PJ Decision Register
> (`M1B_P6_PJ_Decision_Register.md`); nothing here is silently decided.** Defaults marked *(proposed)* are
> recommendations pending PJ ruling + independent review.

---

## 1. Boundary reaffirmed
Module 1 reached "Ready for Service Applicability" at the **approved design boundary**. P6 is the **first**
phase permitted to generate compliance rows — and only through a controlled, dry-run-first, audited path
driven by **approved applicability**, never by Client Master attribute edits.

## 1.1 Current live inputs (from B0–B20, 22 July 2026 IST — evidence-anchored)
- **Only 2 Approved applicability rows exist:** `INCOME_TAX`/ANNUAL and `OTHER`/ANNUAL (both effective 21–22 Jul
  2026, `row_version=2`, owner present, no registration required). Two Inactive rows (OTHER/ANNUAL, TDS/MONTHLY).
- **`service_catalogue`:** all 11 services have `requires_registration=false` and `default_frequency=null` → the
  per-service registration and frequency rules below are **not yet configured in data** and remain PJ decisions.
- **`client_registrations` = 0 rows** → any registration-required rule currently blocks (nothing to link).
- **FY:** 2026-27 is the sole current FY; 11 active FYs 2020-21…2030-31.
- **Dataset is PJ-confirmed sample** (13 clients; 2 with legacy services; 2 `is_test_client` — not proven the same
  two). → Real generation is expected to follow the V2 Clean-Start Reset (D-06).
- **Implication:** on today's data a P6 dry-run would surface at most the 2 Approved rows; `OTHER`/ANNUAL maps to
  *no automatic output* under the proposed default (D-17), so effectively only `INCOME_TAX`/ANNUAL is a live
  candidate. This makes the current state ideal for a **safe first dry-run** once decisions are ruled.

## 2. Eligibility rules (which applicability rows generate)
**APPROVED — D-06 (PJ, 2026-07-22 IST):** no real generation executes on the current sample/test dataset;
**dry-run/preview only** for verification; **`is_test_client` clients are excluded from execute**; execute stays
**blocked** until the V2 Clean-Start Reset completes **or** PJ separately confirms the selected clients are
production-eligible; **no sample-generated tracker/calendar rows may be committed.**

A `client_service_applicability` row is a **generation candidate** only if ALL hold *(proposed)*:

| # | Rule | Basis | Decision ref |
|---|---|---|---|
| E1 | `status = 'Approved'` | Draft/Inactive never generate | — |
| E2 | `approved_by IS NOT NULL AND approved_at IS NOT NULL` | approval provenance complete (already CHECK-enforced) | — |
| E3 | `effective_from IS NOT NULL` and `effective_from <=` FY/period end being generated | active date range start | — |
| E4 | `effective_to IS NULL` OR `effective_to >=` period start | not stopped before the period | D-04 (proration) |
| E5 | If `service_catalogue.requires_registration` for the service → `linked_registration_id IS NOT NULL` and same-client (FK already enforces) | registration requirement | D-02 |
| E6 | Client is active/eligible (not sample/test/draft) | client status | D-05, D-06 |
| E7 | Target FY ∈ `financial_years` with `is_active = true` and within the client's eligible FY window | FY eligibility | D-03 |
| E8 | Sample/test/draft data excluded if PJ so rules | sample-data policy | D-06 |

**Open:** E6/E8 depend on the client-eligibility definition and the sample-data policy (current dataset is
PJ-confirmed sample). See D-05/D-06.

## 3. Frequency rules (how many obligations, and their period boundaries)
For a candidate row with a given `frequency`, over an eligible FY (India FY = 1 Apr–31 Mar) *(all proposed)*:

| Frequency | Obligations / FY | Period boundary | FY crossing | Effective-date proration | Late-start | Inactive/stopped | Restart | Historical periods |
|---|---|---|---|---|---|---|---|---|
| **MONTHLY** | 12 | calendar month within FY | none (each period inside one FY) | generate months where `month_end >= effective_from` and (`effective_to` null or `month_start <= effective_to`) | first obligation = month containing/after `effective_from` | stop at `effective_to`; no month after it | new Approved row (new `effective_from`) resumes forward | only if PJ enables backfill (D-07) |
| **QUARTERLY** | 4 | Q1 Apr–Jun … Q4 Jan–Mar | none | same rule at quarter grain | quarter containing `effective_from` | stop at `effective_to` | new row | D-07 |
| **HALF_YEARLY** | 2 | H1 Apr–Sep, H2 Oct–Mar | none | half-year grain | half containing `effective_from` | stop | new row | D-07 |
| **ANNUAL** | 1 | full FY | none | 1 obligation if FY overlaps [`effective_from`,`effective_to`] | FY containing `effective_from` | stop | new row | D-07 |
| **EVENT_BASED** | 0 automatic | n/a (triggered by a real-world event) | n/a | **no scheduled generation** *(proposed)* | n/a | n/a | n/a | n/a |
| **ONE_TIME** | 1 total (not per FY) | single obligation | n/a | 1 obligation in the FY containing `effective_from` | once | n/a | new row = new one-time | D-07 |
| **AS_REQUIRED** | 0 automatic | on demand | n/a | **no scheduled generation** *(proposed)* | n/a | n/a | n/a | n/a |

**FY-crossing note:** all periodic frequencies are defined **within a single Indian FY**, so no period straddles
two FYs. Multi-FY generation = iterate eligible FYs (E7), each independently.

**Proration (D-04):** *(proposed)* obligations are **whole-period**, included when the period **overlaps** the
`[effective_from, effective_to]` window; partial periods are still generated in full (a mid-quarter start still
creates that quarter's obligation). Alternative (skip partial leading period) is a PJ choice — D-04.

**Historical periods (D-07):** *(proposed default = FORWARD-ONLY)* generate for the **current and future eligible
FYs** only; back-generation of past FYs is **off by default** and requires explicit PJ enablement per run.

## 4. Service → output mapping (what each service generates)
**APPROVED — D-01 (PJ, 2026-07-22 IST).** Each service generates its tracker(s). **Calendar cardinality
(governing rule):** exactly one `compliance_calendar` row is created **per distinct compliance obligation, NOT
automatically per tracker-table row.** Where one compliance obligation is represented in multiple tracker tables,
those tracker rows must reference the **same** calendar obligation unless PJ separately approves them as distinct
obligations. A "distinct compliance obligation" is identified by the **five-part key**
`(client_id, service_code, obligation_code, fy_label, period_key)`, where **`obligation_code`** is the
PJ-approved statutory-obligation identity from the due-date matrix (multiple tracker representations of one
obligation share one `obligation_code`; distinct obligations use different codes). Tracker type alone is NOT the
obligation identity (see Data Model). Mapping:
- ACCOUNTING → `accounting_tracker` + calendar · GST → `gst_tracker` + calendar · TDS → `tds_tracker` + calendar ·
  PAYROLL → `payroll_tracker` + calendar · INCOME_TAX → `income_tax_tracker` + calendar · ROC → `roc_tracker` + calendar ·
  LLP → `llp_tracker` + calendar · STATUTORY_AUDIT → `financials_tracker` + `audit_tracker` + calendar ·
  TAX_AUDIT → `audit_tracker` + calendar · **SECRETARIAL → `roc_tracker` (INTERIM, until a dedicated secretarial
  tracker is separately approved) + calendar** · **OTHER → no automatic generation** (D-17).

> **"+ calendar" means one calendar obligation per distinct five-part obligation `(client_id, service_code,
> obligation_code, fy_label, period_key)` — not one per tracker row.**
> **STATUTORY_AUDIT:** `financials_tracker` and `audit_tracker` are **multiple tracker representations of the same
> statutory-audit obligation**, **use the same `obligation_code`**, and therefore **share one linked
> `compliance_calendar` row**, **unless the approved due-date matrix (`docs/M1B_P6_Service_Due_Date_Matrix.md`)
> assigns them separate approved `obligation_code` values as distinct obligations** (then each gets its own calendar row).

*(The proposed table below is retained as design detail; the approved mapping above governs.)* — "✔ = generates", "—" = none.

| Service | accounting_tracker | financials_tracker | income_tax_tracker | other tracker | compliance_calendar | tasks | Proposed default frequency |
|---|---|---|---|---|---|---|---|
| ACCOUNTING | ✔ (monthly) | — | — | — | ✔ (per obligation) | — | MONTHLY |
| GST | — | — | — | ✔ `gst_tracker` | ✔ | — | MONTHLY or QUARTERLY (per reg) |
| TDS | — | — | — | ✔ `tds_tracker` | ✔ | — | QUARTERLY |
| PAYROLL | — | — | — | ✔ `payroll_tracker` | ✔ | — | MONTHLY |
| INCOME_TAX | — | — | ✔ (annual) | — | ✔ | — | ANNUAL |
| ROC | — | — | — | ✔ `roc_tracker` | ✔ | — | ANNUAL / EVENT_BASED |
| LLP | — | — | — | ✔ `llp_tracker` | ✔ | — | ANNUAL |
| STATUTORY_AUDIT | — | ✔ `financials_tracker` (statements) + `audit_tracker` | — | ✔ `audit_tracker` | ✔ | — | ANNUAL |
| TAX_AUDIT | — | — | ✔ (linkage) | ✔ `audit_tracker` | ✔ | — | ANNUAL |
| SECRETARIAL | — | — | — | ✔ `roc_tracker`/secretarial | ✔ | — | ANNUAL / EVENT_BASED |
| OTHER | — | — | — | — | — | **✔ task (proposed)** or none | AS_REQUIRED |

**Genuinely undecided (Decision Register):** the exact tracker(s) per service (esp. STATUTORY_AUDIT vs
TAX_AUDIT vs financials_tracker relationship), whether `compliance_calendar` is always produced alongside a
tracker or only for certain services, and whether OTHER produces a task or nothing (D-01, D-09, D-10). Also
whether generation writes **new rows only** or may **update** existing tracker rows (D-11).

## 5. Data-flow (approved path)
```
Approved applicability (E1–E8)  +  eligible FYs (E7)
        │  expand by frequency (§3) → candidate obligations (client, service, fy, period_key, due_date, target_table)
        ▼
A. DRY-RUN  → classify each candidate: INSERT | SKIP(exists) | CONFLICT | BLOCKED(missing reg/owner/FY)
        │        (read-only; no writes; returns a preview set + counts)
        ▼   (PJ reviews preview, explicitly confirms)
B. EXECUTE  → within a generation-run: advisory lock; re-evaluate; INSERT only new (idempotent on lineage key);
        │        write generation-run + line lineage; emit audit event(s); atomic per run (or per client).
        ▼
C. VERIFY   → reconcile inserted vs preview; detect partial failure; safe-retry (re-run is a no-op for
             already-generated lines); NO delete/reverse without separate approval.
```

## 6. Due-date derivation — APPROVED (D-12, PJ 2026-07-22 IST)
- P6 computes **`standard_due_date` only**; `extended_due_date`/`individual_due_date` remain NULL unless separately
  approved or entered via an authorised workflow. `compliance_calendar.due_date` = the obligation's `standard_due_date`.
- Due-date rules are **configuration-driven** — a single rule table (NOT hard-coded across functions; the legacy
  `calc_*` path is not reused). Each rule is keyed by **service_code · obligation/return/form type · frequency ·
  period · applicable FY or effective-date range · standard due-date calc rule**.
- **No approved rule for an obligation → generation returns BLOCKED and creates NO tracker or `compliance_calendar`
  row** (fail-closed).
- **Government extensions never overwrite `standard_due_date`** — recorded separately as `extended_due_date` after
  authorised input.
- **Non-working-day dates are NOT auto-shifted** unless the approved statutory rule expressly includes the adjustment.
- The service-wise due-date rules themselves are **PJ TO SUPPLY / APPROVE** in `docs/M1B_P6_Service_Due_Date_Matrix.md`
  **before** backend implementation; no implementation may assume an unapproved statutory date.

## 7. Non-negotiable invariants (carry into every rule)
- Only **Approved** applicability generates; Draft/Inactive never do.
- **`clients.id` UUID** is the only client key used; no legacy text keys introduced.
- **No Client Master edit auto-generates** — generation is an explicit, separate, gated action.
- **Idempotent:** re-running a preview/execute for the same inputs produces no duplicates.
- **Fail-closed:** missing eligibility → BLOCKED, never a silent partial write.
- **0014 is untouched;** legacy generators are not invoked.
- **No compliance/tracker/calendar generation happens in this DESIGN phase** — this document proposes rules only.

## 8. Worked example (illustrative, proposed rules)
Client X, `GST` Approved, `frequency=QUARTERLY`, `effective_from=2026-04-15`, `effective_to=NULL`,
`linked_registration_id` present, FY 2026-27 active/current:
- Eligible FYs: 2026-27 (forward-only default).
- Quarterly obligations in FY 2026-27: Q1(Apr–Jun), Q2, Q3, Q4 → 4 candidates. Q1 overlaps `effective_from`
  (2026-04-15) → included (whole-period proration). → 4 `gst_tracker` rows + 4 `compliance_calendar` rows *(if
  §4 mapping approved)*, each with lineage to this applicability row + this generation run.
- Re-run preview → all 4 classified SKIP(exists) → 0 inserts (idempotent).

## 9. Summary of proposed defaults vs required PJ decisions
Proposed defaults (recommended): forward-only generation; whole-period proration; EVENT_BASED/AS_REQUIRED
generate nothing automatically; new-rows-only (historical immutability). **Required PJ decisions:** per-service
frequency + output-target mapping, registration-required per service, client-eligibility + sample-data policy,
FY window, proration choice, task generation, update-vs-immutable, statutory due-date rules. See the Decision
Register for the enumerated, un-answered list.
