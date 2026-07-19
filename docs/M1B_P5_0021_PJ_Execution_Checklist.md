# M1-B P5 — Migration 0021 — PJ Execution Checklist (one page)

**Execute only after ChatGPT release approval.** Authorised DB: **V2/yav2-dev `ogjrwemjefvccpyjwxuo`** only.
Prohibited: V1/Production `zcszesuvjrryxtigjglt`. PJ is the sole manual executor.

Migration SHA-256: `f312ae5e2ef57fb7f06ca6df5c06d0f17f7d2adc00a4e4e5fb249b152680f6af`

| ✅ | Step | Evidence to record |
|----|------|--------------------|
| ☐ | **V2 project identity confirmed** — SQL Editor open on `ogjrwemjefvccpyjwxuo`; V1/Production NOT connected | project ref screenshot / note |
| ☐ | **Migration hash confirmed** — `0021_service_applicability.sql` matches the SHA-256 above; file unedited | hash value |
| ☐ | **Pre-checks passed** — ran `M1B_P5_0021_pre_execution_verification_readonly.sql`; `PRE-7.PASS_pre_execution_ready` = true; PRE-1..PRE-6 gates true | PRE-1..PRE-7 outputs |
| ☐ | **Pre-execution snapshot recorded** — PRE-6 counts captured for later comparison | PRE-6 JSON |
| ☐ | **Migration executed once** — pasted whole `0021_service_applicability.sql`; ran a single time; COMMIT | success/COMMIT status |
| ☐ | **Notices captured** — `NOTICE: P5 Migration 0021 postconditions passed …`; any RAISE text verbatim | notice text |
| ☐ | **Post-verification V1–V8 passed** — ran `M1B_P5_0021_post_execution_verification_readonly.sql`; V1/V2/V4/V5/V6 PASS booleans true; V7 shows 4 events | V1–V8 JSON |
| ☐ | **V3 PASS including all four named business constraints** — `PASS_v3_constraints`=true; `csa_dates_chk`, `csa_effective_from_gate_chk`, `csa_effective_to_null_when_approved_chk`, `csa_approval_actor_chk` all true (+ status check, composite same-client FK, `ON DELETE RESTRICT`, `client_registrations_id_client_uq`, live partial unique) | V3 JSON |
| ☐ | **Protected counts matched (incl. audit-log & audit-contract)** — V8 vs PRE-6: `service_catalogue_rows`=11; `audit_event_contract_rows`=PRE-6+4; `audit_log_rows`=PRE-6 (unchanged); clients/clients.services elems/registrations/trackers/calendar unchanged | side-by-side compare |
| ☐ | **No applicability rows created** — `client_service_applicability_rows` = 0 (V1 & V8) | 0 confirmed |
| ☐ | **No compliance rows generated** — trackers / `compliance_calendar` counts unchanged vs PRE-6 | 0 delta |
| ☐ | **Rollback NOT run** — rollback used only under a separate PJ + ChatGPT decision (see runbook §4) | n/a |
| ☐ | **Evidence returned to ChatGPT** — all PRE, migration notices, and V1–V8 outputs sent for release sign-off | evidence bundle |

**If any error occurs:** the single transaction has already rolled back — stop, capture the exact
error text, do **not** re-run blindly, do **not** run the rollback, and return the error to ChatGPT.

**Not authorised by this checklist:** P5 UI implementation, P6, P2.2, D4 population, Clean-Start Reset,
Production merge, deployment.
