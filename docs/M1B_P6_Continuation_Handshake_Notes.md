# YAV2 Portal V2 — Module 1 — P6 Continuation Handshake Notes

- **Exact date:** 2026-07-22
- **Exact time:** 07:08 IST
- **Timezone:** IST / Asia-Kolkata (UTC+05:30)
- **Read-only discovery execution date:** **22 July 2026 IST** — PJ manually ran B0–B20 on V2/yav2-dev (after manual project-ref confirmation). **B0–B20 read-only discovery COMPLETED; B1 and B6 PARTIAL** (Supabase 100-row truncation). **No SQL write, migration, implementation, commit or push occurred.**
- **Repository:** `D:\Claude\Claude Code\Yes-Advizors-Portal` (GitHub `Yesadvizors/Yes-Advizors-Portal`)
- **Branch:** `ui/redesign-v1`
- **Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53`
- **Authorised environment:** Supabase **V2 / yav2-dev** (`ogjrwemjefvccpyjwxuo`) only; **Vercel Preview** only.
  Prohibited: V1/Production `zcszesuvjrryxtigjglt`; Production merge/deploy.
- **Roles:** PJ = final business approver + sole SQL/DB/runtime executor · Claude Code = technical/documentation author · ChatGPT = independent reviewer / release control.

## Current state
- P5: **CLOSED PASS**; Module 1: **CLOSED PASS**; Runtime Steps 1–14: PASS; ChatGPT review: PASS; PJ final approval granted 2026-07-21 IST (commit `270da9e`).
- P6: **DISCOVERY / DESIGN — runtime evidence incorporated; framework decisions D-01/D-06/D-12 RULED APPROVED (PJ, 2026-07-22 IST).** **The original framework decisions D-01, D-06 and D-12 are approved. No original framework-decision gate remains. However, P6 implementation remains blocked until PJ completes and expressly approves the service-wise statutory due-date matrix and ChatGPT independently reviews it.** **AWAITING CHATGPT INDEPENDENT FINAL REVIEW; NOT READY FOR IMPLEMENTATION.** Design-only; no SQL executed by Claude; nothing implemented/committed.
- **Material security surface recorded (verify + harden):** `authenticated` EXECUTE on write-capable functions + Admin/Manager direct tracker writes → P6 must be RPC-only + [REC T-08] revoke `authenticated` EXECUTE on **superseded legacy generators** and direct **INSERT/DELETE** on trackers/calendar, **preserving narrowly-scoped UPDATE**; the P5 applicability RPCs are gated and not prohibited; an EXECUTE grant alone is not proof of bypass (no live privilege changed).
- **Corrected fact:** every generation-target tracker already has a business-UNIQUE key (dedup DB-enforced); generation-line ledger is lineage/secondary.

## Completed work (this package — design only)
1. P6 Repository & Architecture Discovery Report — present-state map + dependency graph; legacy generators identified as SUPERSEDED/frozen; authoritative keys (`clients.id` UUID, applicability id+row_version, registration composite, FY label); output-surface facts (trackers lack `row_version` and generation-lineage fields, but the generation-target trackers already have business-UNIQUE keys — existing keys are the primary dedupe control, the P6 ledger adds lineage/parity/concurrency-classification/safe-retry; baseline 312/120/26/0).
2. P6 Business Rules & Data-Flow Design — eligibility (E1–E8), all 7 frequencies, service→output mapping, proration/FY-crossing/late-start/inactive/restart/historical rules (proposed).
3. P6 PJ Decision Register — D-01…D-17 open; blocking set identified.
4. Read-only V2 Discovery SQL (`supabase/verification/M1B_P6_discovery_readonly.sql`) — SELECT/WITH/metadata only, B0 attestation, PJ-run; + Discovery Result Capture Template.
5. P6 Data Model & Generation Architecture — generation-run + line ledger; active-uniqueness dedupe key; dry-run/execute/verify stages; advisory-lock + idempotency + fail-closed controls; edge-case assessment.
6. P6 UI & Role Workflow Design — preview/execute/verify RPC boundary; Admin/Manager only; non-authorised fail-closed; client vs firm; explicit confirm + count guard; retry/recovery; audit link; no direct UI DML; no auto-generation from Client Master edits.
7. P6 Security & Test Matrix — threat/misuse, RLS/privilege/service-role, anonymous prevention, fail-closed, audit completeness, sensitive-data minimisation; concurrency/idempotency/duplicate/frequency/FY/registration/inactive/role/error/frontend matrices; verification tiers + evidence templates.
8. P6 Implementation Readiness & Execution Plan — checkpoint order; tentative migration **0023** (collision-check pending); package types; gate map (ChatGPT/PJ approvals; PJ-only SQL execution + deployment).
9. P6 Review Checklist; Master Completion Register updated to P6 DISCOVERY/DESIGN; these handshake notes.

## Open decisions
The Decision Register is split into **genuine business decisions (PJ, Section A)** and **technical
recommendations (Claude → ChatGPT review, Section B)**.
- **Genuine business decisions — minimised blocking set = D-01 (per-service output mapping), D-06 (sample/test-data
  treatment), D-12 (statutory due-date rules).** Other business items (D-02/03/04/05/07/09/10/11/13/17) carry
  **recommended defaults** confirmed at ChatGPT review — non-blocking.
- **Technical recommendations (not PJ business gates):** T-08 DML hardening, T-14 rollback mechanics, T-15
  migration `0023`, T-16 lineage, T-LOCK advisory locks, T-UNIQ uniqueness, T-TXN transaction mechanics —
  resolved by ChatGPT review.

## Next exact action — corrected gate order
1. **Claude** incorporates runtime evidence (B0–B20, 22 Jul 2026 IST) — **DONE**.
2. **PJ** decides the genuine blocking business decisions **D-01, D-06, D-12** — **DONE: all APPROVED (2026-07-22 IST)** (D-10/D-17 resolved by D-01).
3. **Claude** updates the final readiness package (post-decisions) + prepares the **D-12 service-wise due-date matrix** (`docs/M1B_P6_Service_Due_Date_Matrix.md`) — **DONE: completed PROPOSED DRAFT** (researched from official primary sources — Income Tax Dept, GST/CBIC, MCA, EPFO, ESIC; every rule + `obligation_code` is **PROPOSED — PJ TO APPROVE**, nothing approved; category/threshold/state/event dependencies + unresolved items U-1..U-7 flagged).
**Corrected matrix approval sequence (Rev10):**
4a. **Claude prepares AND source-verifies** the proposed matrix (Rev10: per-row `verification_status`, `obligation_class`, current-law mapping, evidence register) — **DONE.**
4b. **ChatGPT independently reviews the proposed rules + source evidence.** ← **NEXT EXACT GATE.** *(PJ must NOT be asked to approve any row still marked `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED`.)*
4c. **PJ expressly approves / amends / rejects the VERIFIED rules + `obligation_code`s** (and the PJ Decision Sheet items).
4d. **Claude records PJ's rulings.**
4e. **ChatGPT performs the final conformance review.**
5. **P6 implementation authoring** (backend `0023` + RPCs, then frontend) still requires **SEPARATE WRITTEN PJ authorisation**.
6. **Any database execution** requires **SEPARATE PJ authorisation and manual execution on V2 only**.
7. **Commit/push** requires **SEPARATE PJ approval**.

## Prohibited actions (unchanged)
- No SQL execution by Claude; no database writes; no migration execution.
- No compliance/tracker/calendar/task generation.
- No source-code implementation; no commit or push (this package is uncommitted, for review).
- No V1/Production access; no Production merge or deployment.
- No proceeding to P6 implementation before the gates above clear.
