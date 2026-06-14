# Phase 4C v8 — Correction Matrix

Four minimal corrections. No architecture redesign; no new tables/services/wrappers/event families.

| ChatGPT v7 finding | File changed | Exact correction | Static validation |
|---|---|---|---|
| 1. Request→completion correlation | `…04_event_contract_and_rls`, `…05_validation_functions`, `…08_sensitive_audit_reader` | `audit.log.read_completed` now requires `read_request_audit_id`, populated internally from the server-generated `v_req_id` (`v_req_id::text`); validated as a real UUID via `audit_is_uuid`; never a caller input. Links completion to the one immutable request event. | grep: required key; reader passes v_req_id; UUID-validated |
| 2. Completion scope traceable | same | Request event is authoritative for scope (date/client/risk/page); completion records outcome facts (returned/total/page_empty/completion_status_code) + correlation id. Duplicated scope fields dropped from completion required keys. | contract row; reader payload |
| 3. Rollback version heading | `supabase/rollback/PHASE4C_AUDIT_LOG_ROLLBACK.sql` | Heading changed to version-neutral `PHASE 4C AUDIT LOG — MANUAL ROLLBACK`. No behaviour change. | grep: no stale v6 |
| 4. Clean ZIP | packaging | `find -delete` metadata + `COPYFILE_DISABLE=1 zip -X`; final archive verified with `unzip -Z1`. | manifest scan = 0 metadata |

## Latent issue fixed in passing
`page_empty` and `completion_status_code` were required keys for `read_completed` since v6 but had no validator branch (would have failed `BAD_FORMAT` at runtime). v8 adds explicit branches: `page_empty` (boolean), `completion_status_code` (enum SUCCESS/PARTIAL/EMPTY), alongside the new `read_request_audit_id` (UUID).

## Preserved v7 controls (intact)
`_write_read_audit` owned by `audit_writer` (FORCE-RLS-compatible insert); internal-only execution; `_record_audit_failure` EXECUTE to audit_writer; `get_app_role_for_user` not authenticated-callable; consistent timestamp field names; canonical UTC `YYYY-MM-DDTHH:MI:SS.MSZ`; real timestamptz validation; no generic authenticated writer; Admin-only reader; one-statement pagination+total; empty-page envelope; unknown roles fail closed; Manager assignment-based; trusted-backend identity; valid migration order; no failing migration; rollback outside migrations; explicit grants/revokes.
