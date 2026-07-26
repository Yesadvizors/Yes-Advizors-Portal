# YAV2 Portal V2 — Module 1 — P6 PJ Decision Register

**Status:** OPEN — awaiting PJ **business** rulings + independent (ChatGPT) review. Design-only; nothing executed.
**Authored:** 2026-07-21 IST · **Evidence-updated:** 2026-07-22 IST (incorporating the B0–B20 read-only run) · Author: Claude Code · Approver: PJ · Reviewer: ChatGPT.
**Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53`.

> Only **genuine business decisions** are in Section A; each carries: **Issue · Evidence · Claude recommendation ·
> Business consequence · Default if PJ does not decide · Blocks?**. **Technical mechanics** (migration numbering,
> advisory locks, uniqueness mechanics, DML hardening, lineage structure, transaction mechanics, rollback
> mechanics) are **Claude recommendations subject to ChatGPT review** (Section B), NOT PJ decisions.
> **Minimum blocking set: D-01, D-06, D-12.**

---

## Section A — Genuine business decisions (PJ)

### D-01 — Service → output mapping  **[BLOCKS]**
- **Issue:** which tracker(s)/calendar each of the 11 services generates.
- **Evidence:** trackers exist with business-unique keys (B2); only INCOME_TAX + OTHER are currently Approved.
- **Recommendation:** Business-Rules §4 map (ACCOUNTING→accounting_tracker; GST→gst_tracker; TDS→tds_tracker; PAYROLL→payroll_tracker; INCOME_TAX→income_tax_tracker; ROC→roc_tracker; LLP→llp_tracker; STATUTORY_AUDIT→financials_tracker+audit_tracker; TAX_AUDIT→audit_tracker; SECRETARIAL→roc/secretarial; OTHER→none), each mirrored to compliance_calendar.
- **Consequence:** defines exactly what generation writes; wrong mapping = wrong obligations.
- **Default if silent:** none — generation cannot be authored without it.
- **Blocks:** YES.
- **RULED — PJ, 2026-07-22 IST: APPROVED.** Mapping (each service → tracker(s) **+ exactly one linked `compliance_calendar` row**): ACCOUNTING→accounting_tracker · GST→gst_tracker · TDS→tds_tracker · PAYROLL→payroll_tracker · INCOME_TAX→income_tax_tracker · ROC→roc_tracker · LLP→llp_tracker · STATUTORY_AUDIT→financials_tracker + audit_tracker · TAX_AUDIT→audit_tracker · **SECRETARIAL→roc_tracker (INTERIM, until a dedicated secretarial tracker is separately approved)** · **OTHER→no automatic generation**. **Calendar cardinality (governing rule):** exactly one `compliance_calendar` row is created **per distinct compliance obligation identified by the five-part key `(client_id, service_code, obligation_code, fy_label, period_key)`, NOT automatically per tracker-table row.** **`obligation_code`** is the PJ-approved statutory-obligation identity from the due-date matrix: multiple tracker representations of one obligation share the **same** `obligation_code` (→ one calendar row); distinct obligations use **different** `obligation_code` values (→ separate calendar rows). Tracker type alone is not the obligation identity. **STATUTORY_AUDIT:** `financials_tracker` and `audit_tracker` are **multiple tracker representations of the same statutory-audit obligation**, **use the same `obligation_code`**, and therefore **share one linked `compliance_calendar` row** — **unless the approved due-date matrix assigns them separate approved `obligation_code` values** (then each distinct obligation may create its own calendar row). This ruling also **resolves D-10** (mirror per distinct five-part obligation) and **D-17** (OTHER no-auto; SECRETARIAL→roc interim).

### D-02 — Per-service registration requirement
- **Issue:** which services require a linked registration (`service_catalogue.requires_registration`).
- **Evidence:** all 11 services currently `requires_registration=false`; `client_registrations=0 rows`.
- **Recommendation:** true for GST/TDS/ROC/LLP; false otherwise.
- **Consequence:** required-but-missing registration → BLOCKED (correctly) at generation.
- **Default if silent:** keep `false` for all (nothing blocks on registration) — but risks generating GST/TDS without a registration record.
- **Blocks:** No (recommended default usable; confirm at review).

### D-18 — Default frequency per service
- **Issue:** `service_catalogue.default_frequency` is NULL for all; frequency is set per applicability row.
- **Evidence:** B11 — all `default_frequency=null`; both Approved rows use ANNUAL.
- **Recommendation:** seed sensible defaults (GST MONTHLY/QUARTERLY, TDS QUARTERLY, PAYROLL MONTHLY, INCOME_TAX/ROC/LLP/audits ANNUAL) as a UI convenience; the applicability row's explicit frequency always wins.
- **Consequence:** speeds correct data entry; does not itself drive generation (the row's frequency does).
- **Default if silent:** leave NULL; require explicit per-row frequency.
- **Blocks:** No.

### D-03 — FY window (forward-only vs multi-FY)
- **Issue:** earliest generable FY and whether to iterate multiple FYs.
- **Evidence:** 11 active FYs; 2026-27 current.
- **Recommendation:** forward-only from the current FY.
- **Consequence:** avoids accidental mass back-generation of 6 historical FYs.
- **Default if silent:** forward-only.
- **Blocks:** No.

### D-04 — Proration of partial leading/trailing period
- **Issue:** include or skip a period only partly covered by [effective_from, effective_to].
- **Recommendation:** whole-period (include on overlap).
- **Consequence:** a mid-quarter start still creates that quarter's obligation.
- **Default if silent:** whole-period.
- **Blocks:** No.

### D-05 — Client-eligibility definition
- **Issue:** which clients may generate.
- **Evidence:** 13 clients; 2 `is_test_client`; dataset PJ-confirmed sample.
- **Recommendation:** active, non-draft, production-eligible clients only.
- **Consequence:** prevents generating for test/draft clients.
- **Default if silent:** exclude `is_test_client`.
- **Blocks:** No (but see D-06).

### D-06 — Sample/test-data treatment  **[BLOCKS]**
- **Issue:** may P6 execute generation on the current (sample) dataset at all?
- **Evidence:** PJ-confirmed sample data; 2 `is_test_client`; aggregates don't prove which clients.
- **Recommendation:** do **not** execute real generation on current sample data; gate real generation behind the V2 Clean-Start Reset; dry-run is safe now.
- **Consequence:** avoids polluting trackers with sample-driven obligations.
- **Default if silent:** treat as blocked for execute (dry-run only).
- **Blocks:** YES (for any execute).
- **RULED — PJ, 2026-07-22 IST: APPROVED.** No real generation on the current sample/test dataset; **dry-run/preview permitted for verification only**; **`is_test_client` clients excluded from execute**; execute remains **blocked** until (a) the V2 Clean-Start Reset completes **or** (b) PJ separately confirms the selected clients are production-eligible; **no sample-generated tracker/calendar rows may be committed.**

### D-07 — Historical back-generation of past FYs
- **Recommendation:** OFF by default; explicit per-run opt-in.
- **Consequence:** prevents unintended past-FY obligations.
- **Default if silent:** OFF.
- **Blocks:** No.

### D-09 — Task generation in P6 v1?
- **Issue:** should generation also create `tasks` rows? (`tasks.client_id` is legacy **text**, no unique key).
- **Recommendation:** exclude tasks from P6 v1 (trackers + calendar only).
- **Consequence:** avoids a legacy-keyed, un-deduped write surface.
- **Default if silent:** exclude tasks.
- **Blocks:** No.

### D-10 — compliance_calendar mirroring
- **Issue:** produce a calendar row for every generated tracker obligation, or only some.
- **Recommendation:** always mirror the tracker's due obligation (calendar unique key already dedupes).
- **Default if silent:** always mirror.
- **Blocks:** No.
- **RULED — resolved by D-01 (PJ, 2026-07-22 IST): mirror per distinct five-part obligation** — exactly one `compliance_calendar` row per **distinct compliance obligation `(client_id, service_code, obligation_code, fy_label, period_key)`**, not per tracker-table row; multiple tracker representations of one obligation (e.g. STATUTORY_AUDIT's financials+audit) share one `obligation_code` → one calendar obligation, unless PJ assigns them separate approved `obligation_code` values.

### D-11 — Behaviour when applicability changes after generation
- **Issue:** update / supersede / immutable for already-generated rows.
- **Recommendation:** historical immutability — never retro-edit; deactivation stops future periods; restart adds forward periods only.
- **Consequence:** preserves audit truth of what was generated.
- **Default if silent:** immutable.
- **Blocks:** No.

### D-12 — Statutory due-date rules  **[BLOCKS]**
- **Issue:** exact statutory due dates/extensions per service/period.
- **Evidence:** trackers hold standard/extended/individual_due_date; P6 must compute `standard_due_date`.
- **Recommendation:** PJ/domain supplies the due-date table; P6 computes `standard_due_date` only, leaves extended/individual NULL.
- **Consequence:** wrong dates = wrong compliance calendar; cannot be inferred safely.
- **Default if silent:** none — cannot author correct due-date math without the rules.
- **Blocks:** YES.
- **RULED — PJ, 2026-07-22 IST: APPROVED.** P6 computes **`standard_due_date` only**; `extended_due_date`/`individual_due_date` stay NULL unless separately approved or entered via an authorised workflow. Due-date rules must be **configuration-driven** (a single rule table — NOT hard-coded across multiple functions), each rule keyed by **service_code · obligation/return/form type · frequency · period · applicable FY or effective-date range · standard due-date calc rule**. **If no approved rule exists for an obligation → generation returns BLOCKED and creates NO tracker or `compliance_calendar` row.** Government extensions **never overwrite** `standard_due_date` — recorded separately as `extended_due_date` after authorised input. **Non-working-day dates are NOT auto-shifted** unless the approved rule expressly includes that adjustment. **Claude must prepare the service-wise due-date matrix for PJ review BEFORE backend implementation** → `docs/M1B_P6_Service_Due_Date_Matrix.md` (scaffold only; **no statutory dates assumed**). No implementation may assume statutory dates PJ has not approved.

### D-13 — Generation granularity / actor / execution approval
- **Issue:** client-level vs firm-wide; who may execute.
- **Evidence:** team has 4 active Admin/Manager; audit_log actor CHECK requires a user actor for `auth.uid()` runs.
- **Recommendation:** Admin/Manager only; both client-level and firm-wide; always dry-run-first; execute is an explicit authorised action.
- **Default if silent:** Admin/Manager, client-level + firm-wide, dry-run-first.
- **Blocks:** No.

### D-17 — OTHER and SECRETARIAL mapping (unclear business mapping)
- **Issue:** OTHER is free-form; SECRETARIAL's tracker target is ambiguous.
- **Evidence:** OTHER/ANNUAL is an Approved row today; no SECRETARIAL tracker exists distinctly (maps to roc/secretarial).
- **Recommendation:** OTHER → no automatic generation (AS_REQUIRED); SECRETARIAL → roc_tracker (or a PJ-named target) ANNUAL/EVENT_BASED.
- **Consequence:** avoids generating meaningless obligations for OTHER; clarifies SECRETARIAL.
- **Default if silent:** OTHER generates nothing; SECRETARIAL deferred (no generation until mapped).
- **Blocks:** No.
- **RULED — resolved by D-01 (PJ, 2026-07-22 IST): OTHER → no automatic generation; SECRETARIAL → `roc_tracker` (INTERIM)** until a dedicated secretarial tracker is separately approved.

**Minimum blocking set:** **D-01, D-06, D-12 — ALL RULED APPROVED (PJ, 2026-07-22 IST).** **The original framework decisions D-01, D-06 and D-12 are approved. No original framework-decision gate remains. However, P6 implementation remains blocked until PJ completes and expressly approves the service-wise statutory due-date matrix and ChatGPT independently reviews it.** D-10 and D-17 are resolved by the D-01 ruling. The remaining Section-A items (D-02/03/04/05/07/09/13/18) carry recommended defaults, confirmable at ChatGPT final review. **Next gate: ChatGPT independent final review; then PJ completes/approves the D-12 due-date matrix; implementation authoring still requires separate written PJ authorisation.**

## Section B — Claude technical recommendations (ChatGPT review — NOT PJ business gates)
| Ref | Technical matter | Recommendation |
|---|---|---|
| **T-08** *(was D-08)* | Direct-DML / EXECUTE hardening | **Material surface to verify + harden** (Security §0): (1) generation via new SECURITY DEFINER RPC only; (2) revoke `authenticated` EXECUTE on the **superseded legacy generators**; (3) prevent direct `authenticated` **INSERT/DELETE** on generation-target trackers + calendar; (4) **preserve narrowly-scoped UPDATE** (or workflow RPCs) for operational edits — do NOT broadly revoke UPDATE; (5) the P5 `service_applicability_*` RPCs are **not** prohibited for being write-capable — verify their internal gates separately; (6) an EXECUTE grant alone is **not** proof of bypass. PJ-executed on V2, separate migration; B6-S/B7-S quantify first. |
| **T-14** *(was D-14)* | Rollback / recovery mechanics | No physical delete; "cancel run" marks lineage `is_active=false`; gated by separate approval. |
| **T-15** *(was D-15)* | Migration numbering | `0023` — verified free in repo + collision-free in V2 (B20). |
| **T-16** *(was D-16)* | Lineage structure | Central `compliance_generation_run` + `_line` ledger; optional in-row `generation_run_id`. |
| **T-LOCK** | Advisory-lock / concurrency | `pg_advisory_xact_lock(hashtext('p6:gen:'||client_id))` per client; fail-closed. |
| **T-UNIQ** | Uniqueness mechanics | Rely on **existing tracker business-unique keys** (`ON CONFLICT DO NOTHING`) as primary; generation-line `UNIQUE(...) WHERE is_active` as secondary lineage/parity key. |
| **T-TXN** | Transaction mechanics | Atomic per client (all-or-nothing); `expected_counts` guard; idempotent safe-retry; run status lifecycle. |
| **T-AUDIT** | New audit-event contracts | Add `compliance.generation.previewed/committed/blocked/cancelled` (additive); `audit_write_event` remains sole writer; use **user** actor for logged-in runs (audit_log actor CHECK). |

## Assumptions requiring confirmation (not decisions)
- A1: Indian FY = 1 Apr–31 Mar; obligations do not straddle FYs.
- A2: 2026-27 is current; FY rows sufficient (confirmed B13).
- A3: Current dataset is sample; real generation follows V2 Clean-Start Reset (D-06).
- A4: The 2 `is_test_client` clients vs the 2 `clients_with_services` are **not proven identical** (B20 aggregate) — [OPEN], resolvable by a supplemental per-client-flag count if it becomes material.

## Corrected gate order (authoritative — mirrored in Execution Plan / Review Checklist / Register / handshake)
```
1. Claude incorporates runtime evidence (this update).
2. PJ decides genuine blocking business decisions (min: D-01, D-06, D-12).
3. Claude updates the final readiness package.
4. ChatGPT performs independent final review.
5. P6 implementation authoring requires SEPARATE WRITTEN PJ authorisation.
6. Any database execution requires SEPARATE PJ authorisation and manual execution on V2 only.
7. Commit/push requires SEPARATE PJ approval.
```
