# YAV2 Portal V2 — Module 1 — P6 Implementation Readiness & Execution Plan

**Status:** DISCOVERY / DESIGN — PROPOSED. No implementation, no SQL executed, no DB access by Claude.
**Authored:** 2026-07-21 23:10 IST (UTC+05:30) · Author: Claude Code · Reviewer: ChatGPT · Approver: PJ.
**Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53`.

> **LATER-STATUS NOTE (added on GitHub preservation, 2026-07-26 IST — does not alter the historical plan below):** the `remediation-t4` identifiers **`0023_grants_hardening`** and **`0024_search_path_hardening`** were subsequently authored and executed on V2/yav2-dev. **No formal P6 migration number is approved.** Before authoring any P6 migration (the "backend 0023" referenced below), the number MUST be reconciled against GitHub, the governing Master Completion Register, the `remediation-t4` package and live database evidence. **Do not assume or reuse `0023` or `0024`.**

> This plan sequences the **future** P6 work. It authorises nothing. Each stage below begins only after the
> gate above it clears (PJ decisions → independent review → PJ execution/deployment approvals).

---

## 0. Corrected gate order (authoritative)
```
1. Claude incorporates runtime evidence (B0–B20, 22 Jul 2026 IST) — DONE in this package.
2. PJ decides the genuine blocking business decisions (minimum: D-01, D-06, D-12).
3. Claude updates the final readiness package (post-decisions; incl. any supplemental B1/B6 evidence).
4. ChatGPT performs independent final review.
5. P6 implementation authoring (backend 0023 + RPCs, then frontend) requires SEPARATE WRITTEN PJ authorisation.
6. Any database execution requires SEPARATE PJ authorisation and manual execution on V2 only.
7. Commit/push requires SEPARATE PJ approval.
```
**Corrected due-date-matrix approval sequence (Rev10 — governs step 4/D-12):**
```
4a. Claude prepares AND source-verifies the proposed matrix (verification_status + evidence register) — DONE.
4b. ChatGPT independently reviews the proposed rules + source evidence.  (PJ NOT asked to approve HOLD rows.)
4c. PJ expressly approves / amends / rejects the VERIFIED rules + obligation codes (+ Decision Sheet).
4d. Claude records PJ's rulings.
4e. ChatGPT performs the final conformance review.
```
**Status (2026-07-22 IST):** steps **1 and 2 COMPLETE** (evidence incorporated; D-01/D-06/D-12 RULED APPROVED). The
**service-wise due-date matrix is now a completed, source-verified PROPOSED DRAFT** (Rev10) — at step **4b (ChatGPT
reviews rules + source evidence)**. **Implementation is NOT authorised now.** **PJ approval of the matrix rules /
obligation codes (step 4c) applies only to non-HOLD rows; rows marked `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED`
must be upgraded before they may be approved.**

## 1. Readiness state
- **Inputs ready:** P5 (`client_service_applicability`, `service_catalogue`) + PG-1 CLOSED PASS; Module 1 CLOSED PASS; role/audit/lock helpers present.
- **Blocking business decisions (minimised):** **D-01, D-06, D-12 — ALL RULED APPROVED (PJ, 2026-07-22 IST).** **The original framework decisions D-01, D-06 and D-12 are approved. No original framework-decision gate remains. However, P6 implementation remains blocked until PJ completes and expressly approves the service-wise statutory due-date matrix and ChatGPT independently reviews it.** D-10/D-17 resolved by D-01. Other business items (D-02/03/04/05/07/09/13/18) carry recommended defaults confirmed at ChatGPT review.
- **New prerequisite (from D-12):** Claude prepares the **service-wise due-date matrix** (`docs/M1B_P6_Service_Due_Date_Matrix.md`, scaffold done); **PJ must supply + approve the statutory rules, and ChatGPT review them, before backend implementation.**
- **Technical matters** (migration numbering `0023`/T-15, DML hardening/T-08, lineage/T-16, advisory-lock/T-LOCK, uniqueness/T-UNIQ, transaction mechanics/T-TXN, rollback/T-14) are **Claude recommendations resolved by ChatGPT review**, not PJ business gates.
- **Also required before authoring:** PJ runs the read-only discovery kit on V2 (gate b) to confirm baseline + collision-free `0023`.
- **Migration number:** tentative **0023** (technical recommendation T-15; verify via B20).

## 2. Checkpoint order (proposed)
| CP | Deliverable | Gate before it |
|---|---|---|
| **P6-D** | *(this package)* discovery + design + decision register + read-only kit | Module 1 CLOSED (done) |
| **P6-DR** | (gate a) ChatGPT clears package → (b) PJ runs read-only kit on V2 + captures → (c) Claude incorporates → (d) PJ rules business decisions D-01/D-06/D-12 → (e) Claude updates final readiness → (f) ChatGPT reviews | P6-D authored |
| **P6-BE-1** | Backend migration `0023` (generation-run + line ledger, additive lineage, RLS, grants, audit-event contracts) + rollback + pre/post read-only verification + transactional (rollback-only) tests + report | (g) **separate PJ authorisation** + ChatGPT review + PJ execution approval |
| **P6-BE-2** | RPCs `compliance_generation_preview` / `_execute` / `_verify` (SECURITY DEFINER, fail-closed, advisory-lock, idempotent) + tests | P6-BE-1 executed/verified on V2 |
| **P6-T08** *(optional/parallel)* | Hardening (if T-08 accepted at ChatGPT review): revoke `authenticated` EXECUTE on superseded legacy generators + prevent direct `authenticated` INSERT/DELETE on trackers/calendar, **preserving narrowly-scoped UPDATE** | separate approval |
| **P6-FE** | Frontend generation UI (container, preview table, confirm modal, result, RPC wrappers) behind `VITE_P6_GENERATION`; static/DOM tests | backend closed on V2 |
| **P6-RT** | Runtime verification on Preview (dry-run-first; then a single approved execute on sample/Clean-Start data) | FE built; PJ runtime |
| **P6-CL** | Closure package (evidence, hashes, register update) | RT PASS + independent review |

## 3. Package types (each a controlled ZIP with hashes)
- **Backend package:** migration + rollback + read-only pre/post verification SQL + transactional (always-ROLLBACK) tests + implementation report + register update.
- **Frontend package:** components + wrappers + tests + build evidence + register update (no backend change).
- **Runtime package:** step checklist + evidence templates + Preview URL + SHA-matched commit.
- **Closure package:** consolidated evidence; P6 CLOSED PASS proposal → ChatGPT review → PJ final approval.

## 4. Gate map (who signs what)
| Gate | ChatGPT review | PJ business approval | PJ SQL execution (V2) | PJ deployment approval |
|---|---|---|---|---|
| P6-D (this) | ✔ (independent review) | ✔ (decision rulings) | — | — |
| P6-BE-1 migration | ✔ | ✔ | ✔ (executes 0023 on V2) | — |
| P6-BE-2 RPCs | ✔ | ✔ | ✔ | — |
| P6-D08 closure | ✔ | ✔ | ✔ | — |
| P6-FE | ✔ | ✔ | — | ✔ (Preview only) |
| P6-RT | ✔ | ✔ | ✔ (single approved execute, if any) | ✔ (Preview only) |
| P6-CL | ✔ | ✔ (final) | — | — |

**Claude never executes SQL or deploys Production.** All V2 SQL execution and any deployment are PJ actions.
No Production merge/deploy at any P6 stage.

## 5. Definition of done (P6)
Applicability-driven generation is dry-run-first, idempotent, concurrency-safe, audited, role-gated, and
verified on V2; legacy generators remain frozen and unused; baselines are preserved or changed only by an
explicit approved execute; all evidence captured; P6 recorded CLOSED PASS after independent review + PJ approval.

## 6. Risks carried into implementation
- Output trackers lack `row_version` and generation-lineage fields, but the intended generation-target trackers already have business-UNIQUE keys. Existing tracker keys are the primary duplicate-prevention control. The P6 generation-run/line ledger adds lineage, preview-execute parity, concurrency classification and safe retry.
- Sample data (D-06): real generation may wait for the V2 Clean-Start Reset.
- **MATERIAL SECURITY SURFACE (22 Jul 2026):** `authenticated` holds EXECUTE on write-capable functions and Admin/Manager have direct ALL on trackers — a surface to **verify + harden** (an EXECUTE grant alone is not proof of bypass; the P5 applicability RPCs are gated SECURITY DEFINER and are not prohibited). P6 must be RPC-only and [REC T-08] revoke `authenticated` EXECUTE on the superseded legacy generators + prevent direct INSERT/DELETE on trackers/calendar while **preserving narrowly-scoped UPDATE** (Security §0). No live privilege changed by this package.
- Output trackers already carry business-unique keys (dedup DB-enforced); P6 idempotency layers on top, it does not substitute for them.
- Statutory due-date rules (D-12) require domain input before backend authoring.
