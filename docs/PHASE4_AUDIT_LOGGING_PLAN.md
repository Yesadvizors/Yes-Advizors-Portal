# Phase 4 — Audit Logs & Monitoring (PLANNING ONLY)

> Status: PLANNING / PROPOSAL. NOTHING IN THIS DOCUMENT IS IMPLEMENTED.
> No database change, no SQL migration, no edge-function change, no deployment,
> and no permission/role/user change is made by this PR. Every DB object and code
> change described below is explicitly marked NOT IMPLEMENTED and is deferred to a
> future, separately-approved PR. This PR adds only this document.

## 1. Objective
Design (not build) an audit-logging and monitoring layer for the portal and the
ai-agent chatbot, so that — in a future approved phase — privileged and sensitive
actions are recorded in a tamper-evident way and operational health is observable.
This document is the architecture/decision record a future implementation PR will follow.

## 2. Current stable baseline (context, unchanged)
- ai-agent v47 — live, accepted, frozen. Not changed by this PR.
- v46 rollback preserved.
- Existing logging (reference, not modified): chatbot_answer_log, claude_usage_log,
  Supabase edge-function logs, Postgres logs; permission engine check_chatbot_permission /
  ya_accessible_client_ids. This document proposes a dedicated structured audit layer above these.

## 3. Proposed audit-log architecture (NOT IMPLEMENTED)
Append-only audit trail plus lightweight monitoring views.
- Append-only: no UPDATE/DELETE by app roles; corrections are new rows.
- Least privilege: writable by service role only; readable only by Admin-scoped monitoring;
  never exposed to Manager/Staff chatbot tools.
- No secrets / no raw sensitive values: store action + masked identifiers + decision; reuse
  v47 masking rules.
- Separate sink: app logic must not read audit_log to make decisions.
- Retention: proposed 365 days with archival; confirmed at implementation time.

## 4. Events proposed to be logged (NOT IMPLEMENTED)
Each event captures: timestamp, actor (auth_user_id + role), action, target
(client_id/resource), decision (allow/deny + reason), correlation id. No raw sensitive data.
1. Permission check result (allow/deny) — esp. denials (sensitive/financial/bulk)
2. Unassigned-client access attempt (denied)
3. Admin full-access data fetch
4. Login success / failure (where available)
5. Inactive / unknown user request blocked (fail-safe deny)
6. Sensitive identifier viewed (masked vs full)
7. Financial figures accessed
8. Role / assignment change (team / team_client_access)
9. Edge-function deploy / version change
10. DB change executed (migration / DML)
11. Answer blocked (no_verified_source / hallucination)
12. Resolver ambiguity asked / none-found
13. Edge-function error / 5xx
14. Backup run success / failure
(Final list confirmed in the implementation PR.)

## 5. Risk classification
- Critical (breach/control failure): events 2, 5, 8, 10 — log + future alert.
- High (sensitive exposure / privilege use): 3, 6, 7, 9 — log + periodic review.
- Medium (quality/correctness): 11, 12, 13 — log + digest.
- Low (routine ops): 1 (allows), 4, 14 — log only.
No alerting is built in this PR.

## 6. Future database changes — NOT IMPLEMENTED (illustrative only)
Proposed shape for a future, separately-approved migration. NOT applied; do NOT run here.
-- NOT IMPLEMENTED — illustrative only. Do NOT run in this PR.
-- create table audit_log (
--   id bigint generated always as identity primary key,
--   occurred_at timestamptz not null default now(),
--   actor_auth uuid, actor_role text,
--   action text not null, target_type text, target_id text,
--   decision text, reason text, risk_tier text, correlation text, meta jsonb
-- );
-- append-only: service_role insert only; RLS enabled; no authenticated read;
-- indexes on (occurred_at),(action),(actor_auth),(risk_tier).
Monitoring views (also NOT IMPLEMENTED): read-only, Admin-scoped counts of denials by actor,
sensitive-access counts, error rates.

## 7. Future implementation steps (separate, each approval-gated)
Out of scope for this PR; each is its own branch + PR + REVIEW PACK + Pankaj approval,
DB steps via draft-SQL-first:
1. Schema PR — create audit_log (+RLS, indexes) via migration.
2. Emit PR — add audit-event emission to ai-agent (new version, gated deploy) / portal;
   writes to audit_log only; no change to v47 decision logic.
3. Monitoring PR — read-only views/digests; optional n8n daily summary.
4. Alerting PR (optional) — route Critical-tier events to a notification channel.
5. Retention PR — archival/cleanup for the retention window.
Nothing in steps 1–5 is done now.

## 8. What this PR does / does not touch
- Does: add this single planning document.
- Does NOT: change DB, create/modify SQL migrations, change app/runtime logic, change
  Supabase edge functions, deploy, change users/roles/permissions/assignments, or add
  secrets/API keys. ai-agent v47 stays frozen; v46 rollback preserved.

Phase 4 — planning only. Last updated: 2026-06-12.
