# YAV2 Portal V2 — Module 1 — P6 Review Checklist (independent ChatGPT review + PJ)

**Status:** DISCOVERY / DESIGN package review gate. **Authored:** 2026-07-21 23:10 IST (UTC+05:30).
**Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53` · branch `ui/redesign-v1`.

Reviewer marks each ☐ → PASS / FAIL / N-A with a note. This package is **design-only**; nothing is executed.

## A. Scope & governance
- ☐ No source, test, migration, configuration, or database change in this package (docs + one read-only SQL only).
- ☐ Claude did not access or execute against V1 or V2 (no SQL run; discovery kit is for PJ).
- ☐ No compliance/tracker/calendar generation performed; no Production merge/deploy; no commit/push.
- ☐ Legacy generators (`generate_client_compliance(_core)`, `activate_accounting_service`) documented as SUPERSEDED/frozen, not reused; `0014` untouched.

## B. Read-only SQL kit (`M1B_P6_discovery_readonly.sql`)
- ☐ Every statement is SELECT / WITH / information_schema / pg_catalog — no DDL/DML/temp/mutation/write-RPC/trigger/transactional test.
- ☐ B0 environment attestation present; V1 prohibited, V2-only stated.
- ☐ Covers all required inspection points (tables/columns/constraints/indexes/RLS/policies/grants/functions/triggers/applicability/catalogue/registration/FY/tracker+calendar counts/duplicate-risk/lineage/vocabularies/owners/audit contracts/legacy services/sample flags/collisions).
- ☐ Selects **no** personal values (no Aadhaar/PAN/name/mobile/email/financials).
- ☐ Result-capture template provided.

## C. Discovery & architecture (Report)
- ☐ Present-state architecture + dependency map complete and accurate to the repo at HEAD.
- ☐ Authoritative keys stated (`clients.id` UUID; applicability id+row_version; registration composite; FY label).
- ☐ Output surface facts noted: trackers lack `row_version` and generation-lineage fields, **but the generation-target trackers already have business-UNIQUE keys** (existing keys = primary dedupe; P6 ledger adds lineage/preview-execute parity/concurrency classification/safe retry); `tasks.client_id` text; baseline 312/120/26/0.

## D. Business rules & data flow
- ☐ Eligibility (E1–E8), frequency (all 7), and service→output mapping tables present.
- ☐ FY-crossing, proration, late-start, inactive/restart, historical-period rules stated as **proposed**.
- ☐ **No genuine business question silently decided** — each is in the Decision Register.

## E. Decision Register
- ☐ All open decisions enumerated with proposed defaults + blocking flags (D-01…D-17).
- ☐ Blocking set for implementation authoring identified.

## F. Data model & generation architecture
- ☐ Generation-run + line ledger designed; lineage fields complete (source applicability id + row_version, run id, generated_by/at, active/supersession).
- ☐ Exact uniqueness boundary defined (active generation-line key) preventing duplicates.
- ☐ All edge scenarios assessed (multi-period, overlap, restart, dup registration, concurrency, partial-failure rerun, post-generation change, immutability).
- ☐ Three controlled stages (dry-run / execute / verify+recover) + idempotency/concurrency controls (advisory lock, unique, row-version, run status, fail-closed).

## G. UI & role workflow
- ☐ RPC boundary (preview/execute/verify), role checks, audit events, error codes; **no direct DML from UI**.
- ☐ Screen flow + component responsibilities; Admin/Manager only; non-authorised fail-closed; client vs firm; explicit confirm + count guard; retry/recovery; audit link; **no auto-generation from Client Master edits**.

## H. Security & test matrix
- ☐ Threat/misuse review; RLS/privilege/service-role; anonymous/unauthorised prevention; fail-closed; audit completeness; sensitive-data minimisation.
- ☐ Test matrices: concurrency, idempotency, duplicate-prevention, frequency, FY-boundary, registration, inactive/restart, role, error/recovery, frontend.
- ☐ Verification tiers: pre-exec (read-only), transactional (rollback-only), post-exec (read-only), runtime checklist; evidence templates.

## I. Execution plan
- ☐ Checkpoint order, tentative migration `0023` (collision to be verified), backend/frontend/runtime/closure packages.
- ☐ Gate map identifies ChatGPT review, PJ business approval, PJ SQL execution, PJ deployment approval; Claude never executes SQL or deploys Production.
- ☐ **Corrected gate order present and consistent across Execution Plan / Decision Register / Register / handshake:**
  (1) Claude incorporates runtime evidence → (2) PJ decides blocking business decisions (min D-01/D-06/D-12) →
  (3) Claude updates final readiness package → (4) ChatGPT independent final review → (5) implementation authoring
  requires SEPARATE WRITTEN PJ authorisation → (6) any DB execution requires SEPARATE PJ authorisation + manual V2
  execution → (7) commit/push requires SEPARATE PJ approval.
- ☐ Decision Register split into **genuine business decisions (PJ)** (each with issue/evidence/recommendation/consequence/default/blocks) vs **technical recommendations (ChatGPT review)**; blocking set minimised to D-01/D-06/D-12; every business decision has a recommended default.

## K. Runtime evidence incorporation (22 Jul 2026)
- ☐ B0–B20 results incorporated; **B1 and B6 marked PARTIAL** (100-row truncation) and not represented as complete proof.
- ☐ Supplemental read-only B1-S/B6-S/B7-S queries added (batched/aggregate/metadata-only, strictly read-only, not executed).
- ☐ Corrected fact: **trackers already have business-unique keys** (dedup primary); generation-line ledger is lineage/secondary.
- ☐ **Material security finding recorded:** `authenticated` EXECUTE on write-capable functions + Admin/Manager direct tracker writes; revocation/wrapper strategy specified; no live privilege changed.
- ☐ Protected baseline (312/120/26/0) preserved; legacy generators documented as not approved for P6 and untouched.

## L. PJ blocking-decision rulings (2026-07-22 IST) — recorded, conformant
- ☐ **D-01 APPROVED** mapping recorded consistently (Register + Business Rules §4): trackers per service; SECRETARIAL → roc_tracker (interim); OTHER → no auto; D-17 resolved.
- ☐ **Calendar cardinality (governing rule)** recorded consistently: **exactly one `compliance_calendar` row per distinct compliance obligation identified by the FIVE-part key `(client_id, service_code, obligation_code, fy_label, period_key)`, NOT per tracker row.** **`obligation_code`** = the PJ-approved statutory-obligation identity from the due-date matrix (stable/deterministic; tracker type alone is not the identity; multiple tracker types may share one code; distinct obligations use different codes; never invented/inferred). **STATUTORY_AUDIT** (financials_tracker + audit_tracker) share **one** `obligation_code` → one calendar row, unless PJ assigns separate approved codes. Tests K1/K1a/K1b/K1c/K1d/K1e verify the five-part cardinality, shared/distinct codes, parity, retry-no-duplicates, and BLOCKED-on-missing-code (D-10 resolved).
- ☐ **No stale four-part key** `(client_id, service_code, fy_label, period_key)` remains anywhere; all calendar cardinality uses the five-part key with `obligation_code`.
- ☐ **Due-date matrix** — **completed PROPOSED DRAFT** (researched from official primary sources): per-service obligations with proposed `obligation_code`, form/return name, tracker representation, frequency, applicability/category, FY/effective range, period-key, standard due-date rule, non-working-day treatment, dependency, authoritative source + effective date, assumptions/exceptions, all **status PROPOSED — PJ TO APPROVE (nothing approved)**. Includes PJ decision summary, source register, assumptions/unresolved register (U-1..U-7), obligation-code register, STATUTORY_AUDIT one-shared-obligation recommendation, and event-based/config/manual flags (ACCOUNTING no statutory date; ROC/audit event-based; PT state-config; ITR category; 44AB applicability). Missing/unapproved rule/code remains fail-closed/BLOCKED.
- ☐ **No value marked approved;** implementation remains blocked pending PJ express approval + ChatGPT review. Standard dates distinguished from temporary extensions (`standard_due_date` preserved).

## M. Rev10 — source-verified matrix + corrected sequence
- ☐ **`docs/M1B_P6_Statutory_Source_Evidence_Register.md`** present: every `obligation_code` mapped to official URL + Act/section + Rule + notification/circular/form + publn/effective date + clause + access date (2026-07-22 IST).
- ☐ **Row-level `verification_status`** applied to every row (`PRIMARY_TEXT_VERIFIED` / `OFFICIAL_PORTAL_VERIFIED` / `HOLD_PRIMARY_TEXT_VERIFICATION_REQUIRED` / `OUT_OF_SCOPE` / `INTERNAL_RULE_PJ_TO_DEFINE`); **no HOLD row presented to PJ for approval**.
- ☐ **Specific HOLDs applied:** ITR-TP date, TDS Q4, Form 16, Form 16A rule, MGT-7/7A period, ALL Income Tax + TDS (Act 2025 / Rules 2026 current-law mapping unresolved), EPF/ESI (PDF not machine-readable).
- ☐ **Current-law mapping** columns present for Income Tax/TDS (Act 2025 / Rules 2026 / current form); 1961-Act is legacy reconciliation only, not governing authority.
- ☐ **`obligation_class`** applied to every row (ACC→INTERNAL_WORKFLOW; TDS_PAY→PAYMENT; TDS_24Q/26Q/27Q→RETURN_FILING; TDS_FORM16/16A→CERTIFICATE; EPF/ESI→PAYMENT/RETURN_FILING; SEC_MR3→STATUTORY_REPORT|INTERNAL_WORKFLOW; SAUD_COAUDIT→EVENT_BASED audit-workflow (**NOT AOC-4 date**); ROC_AOC4/MGT7/ADT1→EVENT_BASED; OTHER→OUT_OF_SCOPE).
- ☐ **Legally-distinct obligations separated** (TDS payment vs statements vs certificates; GST return vs IFF/PMT-06; statutory-audit vs ROC filing; MR-3 vs annual filing; EPF ECR vs contribution decision). Multiple tracker reps share a code only where truly one obligation.
- ☐ **`docs/M1B_P6_PJ_Due_Date_Decision_Sheet.md`** present with 10+ genuine PJ decisions, each with recommendation + options; **no option pre-approved**.
- ☐ **Corrected approval sequence** (4a Claude prepares+source-verifies → 4b ChatGPT reviews rules+evidence → 4c PJ approves VERIFIED rules/codes → 4d Claude records → 4e ChatGPT final conformance) reflected in handshake / readiness plan / register; **PJ not asked to approve HOLD rows**.
- ☐ HEAD unchanged; docs-only; no implementation/SQL/DB/privilege/commit/push.
- ☐ **D-06 APPROVED**: no real generation on sample data; dry-run/preview only; `is_test_client` excluded from execute; blocked until Clean-Start/PJ production-eligible confirmation; no sample rows committed (Business Rules §2; Security K3/K4).
- ☐ **D-12 APPROVED**: standard_due_date only; config-driven rule table (keys per D-12); **no rule → BLOCKED (no tracker/calendar row)**; extensions separate; non-working-day no auto-shift; matrix-before-backend (Business Rules §6; Security K5–K9).
- ☐ **Service-wise due-date matrix scaffold** present (`docs/M1B_P6_Service_Due_Date_Matrix.md`) with **no assumed statutory dates**; PJ-to-supply/approve gate before backend.
- ☐ All three framework decisions marked RULED APPROVED. **The original framework decisions D-01, D-06 and D-12 are approved. No original framework-decision gate remains. However, P6 implementation remains blocked until PJ completes and expressly approves the service-wise statutory due-date matrix and ChatGPT independently reviews it.** Next gate = ChatGPT independent final review; implementation still requires separate written PJ authorisation.

## J. Consistency & hygiene
- ☐ Cross-document consistency (keys, counts, decision IDs, migration number, dates/IST) holds.
- ☐ Master Completion Register updated to **P6 — DISCOVERY / DESIGN only** (no CLOSED claim).
- ☐ Handshake notes contain date/time/IST, repo, branch, HEAD, environment, completed work, open decisions, next action, prohibitions.
- ☐ SHA-256 manifest + no secrets + no implementation/live-action claims.

**Reviewer decision:** ☐ PASS (proceed to PJ decision rulings) · ☐ PASS WITH CORRECTIONS · ☐ REVISE.
