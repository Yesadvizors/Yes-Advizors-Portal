# Phase 4B — Audit Event Catalogue and RLS Test Matrix (Final v2.1.1)

> **Status:** PLANNING / DRAFT ONLY
> **Author:** Yes Advizors Portal Team
> **Date:** June 2026
> **Revision:** v2.1.1 — final role-separation clarification applied
> **Depends on:** Phase 4A — Audit Log Schema Draft (`docs/PHASE4A_AUDIT_LOG_SCHEMA_DRAFT.md`)
>
> ⚠️ **This document is a design and planning proposal only.**
> ⚠️ No SQL has been run. No migration exists. No database has been changed.
> ⚠️ No Supabase change. No deploy. No branch created. No PR created.

---

## Table of Contents

1. [Architecture Clarifications](#1-architecture-clarifications)
2. [Audit Event Catalogue](#2-audit-event-catalogue)
3. [RLS Design and Test Matrix](#3-rls-design-and-test-matrix)
4. [Security Rules](#4-security-rules)
5. [Final Status](#5-final-status)

---

## 1. Architecture Clarifications

These clarifications must be understood before reading the RLS matrix or Security Rules.
They correct design assumptions that would be unsafe if implemented as written in earlier versions.

---

### 1.1 — Supabase Role and Claim Model

Supabase end-user requests through the Data API (PostgREST) normally operate as one of two database roles:

| DB Role | Used For |
|---|---|
| `anon` | Unauthenticated requests (Supabase anon key, no valid user JWT) |
| `authenticated` | Requests carrying a valid Supabase user JWT |

This is **not** a claim that these are the only PostgreSQL roles in the database. Supabase also provisions `service_role`, `postgres` (owner/superuser), `supabase_admin`, and other internal roles. The point is narrower: **end-user Data API traffic resolves to `anon` or `authenticated`**, and RLS policies for application users are written against those two roles.

**`admin`, `manager`, `staff`, `director`, and `client` are application roles, not database roles.** They are resolved from a single, consistent JWT claim path.

**Canonical role-claim design (choose ONE — this document uses Method A throughout):**

**Method A — `app_metadata.app_role` (default, used in this document):**
```sql
-- NOT IMPLEMENTED — planning only
-- Resolve application role from the app_metadata claim
CREATE OR REPLACE FUNCTION public.get_app_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'app_role',
    'anon'
  );
$$;
```

**Method B — top-level `app_role` via Custom Access Token Hook (alternative — NOT used here):**
> If a Custom Access Token Hook is configured to inject a top-level `app_role` claim, the resolver would read `auth.jwt() ->> 'app_role'`. This document does **not** mix the two methods. Method A is canonical for Phase 4B. Method B is documented only as a future option requiring a separate decision.

All references to `admin`, `manager`, `staff`, `director`, `client` in this document mean *application roles resolved via `get_app_role()` using Method A* — `auth.jwt() -> 'app_metadata' ->> 'app_role'`.

---

### 1.2 — service_role: Bypasses RLS but Subject to Object Privileges

**`service_role` bypasses all RLS policies, but it remains subject to standard PostgreSQL object privileges (GRANT/REVOKE).**

This distinction is the foundation of the audit_log protection design:

- RLS policies do **not** constrain `service_role` — they are skipped entirely
- **However**, `service_role` can only perform operations for which it holds object privileges
- Therefore, audit_log integrity is enforced at the **privilege (GRANT/REVOKE) layer**, not the RLS layer, for `service_role`

**Intended final design (planning only — NOT IMPLEMENTED):**

1. **Revoke direct DML on `audit_log` from `service_role`:**
   ```sql
   -- NOT IMPLEMENTED — planning only
   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.audit_log FROM service_role;
   ```
   In the intended final design, `service_role` holds **no** direct SELECT, INSERT, UPDATE, or DELETE privilege on `audit_log`. Raw DML by `service_role` on `audit_log` is **not** part of the final design.

2. **Grant `service_role` only `EXECUTE` on narrowly approved functions where operationally required:**
   ```sql
   -- NOT IMPLEMENTED — planning only
   GRANT EXECUTE ON FUNCTION public.log_audit_event(...) TO service_role;
   ```
   The writer function is the sole pathway. `service_role` can write to `audit_log` only by executing the approved, hardened function — never via raw INSERT.

3. **Separate table ownership and write authority:** A dedicated NOLOGIN role (`audit_owner`) owns `audit_log` but is not used by application code. A separate restricted NOLOGIN role (`audit_writer`) holds INSERT-only authority on `audit_log` and owns the hardened `log_audit_event()` SECURITY DEFINER function. Neither `service_role` nor application roles hold direct write privileges.

4. **Monitoring:** Supabase logs `service_role` activity. Any direct DML attempt against `audit_log` (which should fail on privilege grounds) is itself an alert condition.

---

### 1.3 — Append-Only Limitations

RLS alone **cannot enforce true append-only** behaviour because RLS is bypassed by:

- The **table owner** (the role that created the table)
- **`service_role`** (bypasses RLS — but see §1.2: constrained by object privileges)
- Roles with **`BYPASSRLS`** attribute
- Supabase platform superusers

**Intended defence in depth (planning only — NOT IMPLEMENTED):**

| Layer | Proposed Control |
|---|---|
| RLS policies | RESTRICTIVE policies block UPDATE/DELETE for `anon` and `authenticated` |
| Object privileges | `service_role` has UPDATE/DELETE/INSERT/SELECT on `audit_log` REVOKED; only EXECUTE on writer function granted |
| Separate ownership | `audit_log` owned by a dedicated NOLOGIN `audit_owner` role; the separate NOLOGIN `audit_writer` role has INSERT-only authority and owns the writer function |
| Controlled writer | All inserts via hardened `log_audit_event()` SECURITY DEFINER function only |
| FORCE RLS | `ALTER TABLE audit_log FORCE ROW LEVEL SECURITY` — applies RLS even to table owner (does not affect superusers) |
| External immutable archival | Future Phase 4D: export CRITICAL/HIGH events to an immutable external store (e.g. object storage with object-lock) |
| Monitoring | Alert on any UPDATE/DELETE detected against `audit_log` in query logs |

None of these are implemented. They are proposed for Phase 4C/4D.

---

### 1.4 — PostgreSQL Does Not Support SELECT Triggers

**PostgreSQL does not support row-level triggers on SELECT statements.**

Therefore, "log when an audit row is viewed" cannot be enforced by a trigger.

**Corrected approach (planning only — NOT IMPLEMENTED):**

All reads of `audit_log` — **including by admin** — occur through a controlled, audited RPC function or server endpoint that:
  1. Validates the caller's identity and application role
  2. Inserts an `audit.log.viewed` event **before** returning results
  3. Returns only the requested rows

**Direct SELECT on `audit_log` is DENY for every application role, including admin** (see §1.6 and §3). There is no permissive SELECT policy for any application role on the raw table.

**pgAudit** may be configured separately as a PostgreSQL extension that logs database-level SQL statements to the Postgres log stream. It is a **database statement logger** for infrastructure-level auditing (DBA activity, privileged-role queries). It is **not** a mechanism for inserting rows into `audit_log` and is separate from the application audit trail.

---

### 1.5 — Policy Combination Risk (OR Logic)

In PostgreSQL, multiple **permissive** RLS policies on the same table and operation combine with **OR logic**. If a row matches any one permissive policy, it is returned — even if another policy intended to restrict it.

Because the final design grants **no** permissive SELECT policy on the raw `audit_log` table to any application role (all reads go through the RPC), this risk is largely eliminated for reads. Where permissive policies are used elsewhere (e.g. on derived views or other tables), they must be:

**Option 1 — Consolidated:** a single SELECT policy per role-group embedding all conditions including any risk_tier exclusion.

**Option 2 — Paired with a RESTRICTIVE policy:** RESTRICTIVE policies combine with AND and act as a safety net.
```sql
-- NOT IMPLEMENTED — planning only
CREATE POLICY "block_high_critical_for_non_admin"
  ON public.audit_log AS RESTRICTIVE FOR SELECT
  TO authenticated
  USING (
    public.get_app_role() = 'admin'
    OR risk_tier NOT IN ('HIGH', 'CRITICAL')
  );
```
Option 2 is preferred as a defence-in-depth net even though the raw table has no permissive SELECT policy in the final design.

---

### 1.6 — Client and Director Visibility: Redacted RPC Preferred

**Clients and directors must not have direct SELECT access to the raw `audit_log` table.** Neither must admin (§1.4). The raw table contains internal actor identities, role names, session references, technical metadata, security events, and access-control events.

**Preferred approach (planning only — NOT IMPLEMENTED):**

A **redacted RPC function** is the preferred and primary method for client/director activity feeds:

```sql
-- NOT IMPLEMENTED — planning only
-- Preferred: hardened SECURITY DEFINER RPC (see §1.7 hardening requirements)
CREATE OR REPLACE FUNCTION public.get_client_activity(p_client_id uuid)
RETURNS TABLE (
  occurred_at      timestamptz,
  event_display    text,
  compliance_type  text,
  filing_period    text,
  new_status       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- caller identity + role + client-ownership validation here
  -- returns only compliance-category, own-client, redacted projection
END;
$$;
```

**A normal Postgres view is NOT presented as equally safe.** A view may be considered **only after** an explicit review confirming:
- `security_invoker = true` is set (so the view executes with the querying user's privileges and RLS, not the view owner's)
- RLS on the underlying `audit_log` correctly restricts the querying user
- Column-level projection excludes all sensitive fields

Until that review is complete, the redacted RPC is the only approved client/director pathway.

The redacted output exposes only: `occurred_at`, `event_display`, `compliance_type`, `filing_period`, `new_status`.
It explicitly excludes: actor identity fields, `actor_app_role`, session references, `metadata`, `old_values`/`new_values`, `risk_tier`, internal reference IDs, and all `auth`/`access_control`/`whatsapp_bot`/`ai_agent`/`data_export`/`audit`/`security` category events.

---

### 1.7 — SECURITY DEFINER Function Hardening Requirements

Every SECURITY DEFINER function in this design (`log_audit_event()`, `get_sensitive_audit_logs()`, `get_client_activity()`) must meet **all** of the following (planning only — NOT IMPLEMENTED):

| Requirement | Detail |
|---|---|
| **Secure fixed `search_path`** | `SET search_path = pg_catalog, public` (or stricter) on the function — never rely on the caller's search_path |
| **Fully qualified object names** | All table/function references use schema-qualified names (e.g. `public.audit_log`) inside the function body |
| **EXECUTE revoked from PUBLIC** | `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC;` immediately after creation |
| **Selective EXECUTE grants** | `GRANT EXECUTE` only to the specific roles that require it (e.g. `authenticated` for read RPC, `service_role` for writer where operationally required) |
| **Caller identity validation** | Function validates `auth.uid()` is non-null and resolves `public.get_app_role()`; rejects unauthorised callers |
| **Application-role validation** | Function checks the caller's `app_role` against the operation (e.g. only `admin` may call `get_sensitive_audit_logs()`) |
| **Event-specific metadata validation** | Function validates the supplied metadata against the **event-specific allow-list** for that `event_name` (primary control), with regex blocking as a secondary net (see §2.12) |

A function failing any of these requirements must not be deployed in Phase 4C.

---

## 2. Audit Event Catalogue

### Notation

| Field | Values |
|---|---|
| **Event Name** | lowercase dotted: `category.subcategory.action` |
| **Risk Tier** | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` |
| **Sensitivity Tier** | `S1` public / `S2` internal / `S3` confidential / `S4` restricted |
| **Alert Required** | `NO` / `YES – [recipient]` |

**Schema field conventions (aligned with Phase 4A, corrected in v2.1):**
- The event identifier column is **`event_name`** (lowercase dotted string).
- The audit activity timestamp output is **`occurred_at`**.
- **`client_id`** is the canonical client UUID. **`client_code`** is the optional human-readable code (e.g. `YA-001`).

---

### 2.1 — Authentication Events

---

#### auth.session.login_success

| Field | Value |
|---|---|
| **event_name** | `auth.session.login_success` |
| **Event Category** | `auth` |
| **Actor** | Team member, Director, or System service |
| **Resource** | `auth_session` |
| **Risk Tier** | `LOW` (routine); escalates to `HIGH` on new-device/location pattern (future) |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `login_method_code` (EMAIL_OTP / PIN / PASSWORD), `user_agent_family`, `portal_version`, `session_reference_id` |
| **Metadata Prohibited** | Password, raw JWT, full IP, OTP, email address |
| **Expected Outcome** | Row inserted; session established |
| **Alert Required** | NO (routine); YES – Admin if >3 successes from different `user_agent_family` within 1 hour |

---

#### auth.session.login_failed

| Field | Value |
|---|---|
| **event_name** | `auth.session.login_failed` |
| **Event Category** | `auth` |
| **Actor** | Unknown (actor_user_id NULL) |
| **Resource** | `auth_session` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `failure_reason_code` (INVALID_CREDENTIAL / ACCOUNT_NOT_FOUND / RATE_LIMITED / SESSION_EXPIRED), `attempt_count`, `user_agent_family`, `login_subject_hmac` (keyed HMAC for correlating repeated attempts — see §2.12) |
| **Metadata Prohibited** | Attempted password, OTP, plain email, full IP, any credential fragment |
| **Expected Outcome** | Row inserted; login rejected; rate-limit counter incremented |
| **Alert Required** | YES – Admin if 3+ failures within 10 minutes for same `login_subject_hmac` |

---

#### auth.session.logout

| Field | Value |
|---|---|
| **event_name** | `auth.session.logout` |
| **Event Category** | `auth` |
| **Actor** | Authenticated team member or Director |
| **Resource** | `auth_session` |
| **Risk Tier** | `LOW` |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `logout_type_code` (MANUAL / SESSION_TIMEOUT / FORCED_ADMIN), `session_duration_seconds` |
| **Metadata Prohibited** | Session token, JWT, password |
| **Expected Outcome** | Row inserted; session invalidated |
| **Alert Required** | NO |

---

#### auth.session.revoked

| Field | Value |
|---|---|
| **event_name** | `auth.session.revoked` |
| **Event Category** | `auth` |
| **Actor** | Admin (forced) or System (expiry enforcement) |
| **Resource** | `auth_session` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `revocation_reason_code` (ADMIN_FORCED / SECURITY_POLICY / INACTIVITY_TIMEOUT / MFA_CHANGED), `target_user_id` (internal UUID) |
| **Metadata Prohibited** | Session token, JWT, email, phone |
| **Expected Outcome** | Row inserted; target session invalidated |
| **Alert Required** | YES – independent secondary admin if Admin-forced |

---

#### auth.password_reset.requested

| Field | Value |
|---|---|
| **event_name** | `auth.password_reset.requested` |
| **Event Category** | `auth` |
| **Actor** | User (may be unauthenticated — actor_user_id may be NULL) |
| **Resource** | `auth_session` |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `request_channel_code` (PORTAL / WHATSAPP_BOT / ADMIN_PANEL), `user_agent_family`, `login_subject_hmac` |
| **Metadata Prohibited** | Email, phone, reset token, OTP |
| **Expected Outcome** | Row inserted; reset email dispatched |
| **Alert Required** | YES – Admin if 2+ requests for same `login_subject_hmac` within 1 hour |

---

#### auth.password_reset.completed

| Field | Value |
|---|---|
| **event_name** | `auth.password_reset.completed` |
| **Event Category** | `auth` |
| **Actor** | User completing reset |
| **Resource** | `auth_session` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `reset_channel_code` (PORTAL / ADMIN_PANEL), `time_since_request_seconds`, `login_subject_hmac` |
| **Metadata Prohibited** | Old/new password, reset token, email |
| **Expected Outcome** | Row inserted; password updated; existing sessions invalidated |
| **Alert Required** | YES – independent secondary admin |

---

#### auth.mfa.changed

| Field | Value |
|---|---|
| **event_name** | `auth.mfa.changed` |
| **Event Category** | `auth` |
| **Actor** | Admin or authenticated user |
| **Resource** | `team_member` |
| **Risk Tier** | `CRITICAL` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `change_type_code` (ENABLED / DISABLED / METHOD_CHANGED), `target_user_id` (UUID), `changed_by_user_id` (UUID) |
| **Metadata Prohibited** | MFA secret, TOTP seed, backup codes, email, phone |
| **Expected Outcome** | Row inserted; MFA setting updated; sessions revoked |
| **Alert Required** | YES – independent secondary admin (always) |

---

### 2.2 — User Account Events

---

#### user.account.created

| Field | Value |
|---|---|
| **event_name** | `user.account.created` |
| **Event Category** | `user_management` |
| **Actor** | Admin |
| **Resource** | `team_member` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `new_user_id` (UUID), `assigned_role_code`, `invite_method_code` (EMAIL_INVITE / MANUAL_SUPABASE) |
| **Metadata Prohibited** | Email, temporary password, invite token |
| **Expected Outcome** | Row inserted; auth user created; team record inserted |
| **Alert Required** | YES – independent secondary admin |

---

#### user.account.deactivated

| Field | Value |
|---|---|
| **event_name** | `user.account.deactivated` |
| **Event Category** | `user_management` |
| **Actor** | Admin |
| **Resource** | `team_member` |
| **Risk Tier** | `CRITICAL` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `target_user_id` (UUID), `deactivation_reason_code` (RESIGNATION / TERMINATION / SECURITY / TEMP_SUSPENSION) |
| **Metadata Prohibited** | Email, phone, personal details |
| **Expected Outcome** | Row inserted; sessions revoked; access blocked |
| **Alert Required** | YES – independent secondary admin (always) |

---

#### user.account.reactivated

| Field | Value |
|---|---|
| **event_name** | `user.account.reactivated` |
| **Event Category** | `user_management` |
| **Actor** | Admin |
| **Resource** | `team_member` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `target_user_id` (UUID), `reactivation_reason_code` |
| **Metadata Prohibited** | Email, phone |
| **Expected Outcome** | Row inserted; access restored |
| **Alert Required** | YES – independent secondary admin |

---

### 2.3 — Client Events

---

#### client.profile.viewed

| Field | Value |
|---|---|
| **event_name** | `client.profile.viewed` |
| **Event Category** | `client` |
| **Actor** | Team member (any role), Director |
| **Resource** | `client` |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `client_code` (optional, e.g. YA-001), `view_context_code` (COMPLIANCE_TAB / PROFILE_TAB / DOCUMENT_TAB), `portal_version` |
| **Metadata Prohibited** | PAN, GSTIN, mobile, email, Aadhaar, bank details |
| **Expected Outcome** | Row inserted; profile rendered |
| **Alert Required** | NO (routine); YES – Admin if Staff views unassigned client |

---

#### client.profile.updated

| Field | Value |
|---|---|
| **event_name** | `client.profile.updated` |
| **Event Category** | `client` |
| **Actor** | Admin or Manager |
| **Resource** | `client` |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `client_code` (optional), `fields_changed` (column names only — not values), `change_source_code` (ONBOARDING_WIZARD / DIRECT_EDIT) |
| **Metadata Prohibited** | Old/new PAN, GSTIN, mobile, email, Aadhaar, bank account — no raw values anywhere |
| **Expected Outcome** | Row inserted with filtered snapshot; record updated |
| **Alert Required** | YES – Admin if PAN or contact field name appears in `fields_changed` |

---

#### access.client.denied

| Field | Value |
|---|---|
| **event_name** | `access.client.denied` |
| **Event Category** | `access_control` |
| **Actor** | Team member or Director |
| **Resource** | `client` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `actor_user_id` (UUID), `client_id` (UUID, requested), `denial_reason_code` (NOT_ASSIGNED / ROLE_INSUFFICIENT / CLIENT_INACTIVE) |
| **Metadata Prohibited** | Client PAN, email, financial data |
| **Expected Outcome** | Row inserted; access denied |
| **Alert Required** | YES – Admin if 3+ denials for same actor within 1 session |

---

#### access.cross_client.attempted

| Field | Value |
|---|---|
| **event_name** | `access.cross_client.attempted` |
| **Event Category** | `access_control` |
| **Actor** | Any authenticated user |
| **Resource** | `client` |
| **Risk Tier** | `CRITICAL` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `actor_user_id` (UUID), `actor_app_role`, `requested_client_id` (UUID), `actor_assigned_client_id` (UUID), `detection_method_code` (RLS_BLOCK / APP_LAYER_BLOCK) |
| **Metadata Prohibited** | Client PAN, financial data, email |
| **Expected Outcome** | Row inserted; access denied; alert raised |
| **Alert Required** | YES – independent secondary admin (always; security incident) |

---

### 2.4 — Document Events

---

#### document.file.uploaded

| Field | Value |
|---|---|
| **event_name** | `document.file.uploaded` |
| **Event Category** | `document` |
| **Actor** | Team member (Admin / Manager / Staff) |
| **Resource** | `document` |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `client_code` (optional), `document_type_code` (FORM_COPY / RECEIPT / ACKNOWLEDGEMENT), `compliance_type_code`, `filing_period`, `file_size_kb`, `file_extension` |
| **Metadata Prohibited** | File contents, filename containing PAN/client name, storage path, signed URL |
| **Expected Outcome** | Row inserted; document stored |
| **Alert Required** | NO |

---

#### document.file.downloaded

| Field | Value |
|---|---|
| **event_name** | `document.file.downloaded` |
| **Event Category** | `document` |
| **Actor** | Team member, Director, WhatsApp bot (system) |
| **Resource** | `document` |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `document_type_code`, `compliance_type_code`, `filing_period`, `download_channel_code` (PORTAL / WHATSAPP_BOT) |
| **Metadata Prohibited** | Signed URL, storage path, filename with PAN, file contents |
| **Expected Outcome** | Row inserted; signed URL delivered |
| **Alert Required** | YES – Admin if >5 documents in single session (see `data.mass_download` threshold) |

---

#### document.file.deleted

| Field | Value |
|---|---|
| **event_name** | `document.file.deleted` |
| **Event Category** | `document` |
| **Actor** | Admin only |
| **Resource** | `document` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `document_type_code`, `compliance_type_code`, `filing_period`, `delete_reason_code` (DUPLICATE / ERROR / SUPERSEDED / RETENTION_EXPIRED) |
| **Metadata Prohibited** | File contents, signed URL, storage path |
| **Expected Outcome** | Row inserted; document removed |
| **Alert Required** | YES – independent secondary admin (always; irreversible) |

---

#### document.file.shared

| Field | Value |
|---|---|
| **event_name** | `document.file.shared` |
| **Event Category** | `document` |
| **Actor** | Admin or Manager |
| **Resource** | `document` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `document_type_code`, `compliance_type_code`, `share_channel_code` (WHATSAPP / EMAIL_LINK / PORTAL_LINK), `recipient_role_code` (DIRECTOR / EXTERNAL_AUDITOR) |
| **Metadata Prohibited** | Signed URL, recipient email, recipient phone, file contents |
| **Expected Outcome** | Row inserted; share link delivered |
| **Alert Required** | YES – Admin if external (non-director) recipient |

---

#### document.file.replaced

| Field | Value |
|---|---|
| **event_name** | `document.file.replaced` |
| **Event Category** | `document` |
| **Actor** | Admin or Manager |
| **Resource** | `document` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `document_type_code`, `compliance_type_code`, `filing_period`, `replacement_reason_code` (CORRECTION / VERSION_UPDATE / ERROR_CORRECTION) |
| **Metadata Prohibited** | Old/new file contents, signed URLs, storage paths |
| **Expected Outcome** | Row inserted; old version archived per retention; new stored |
| **Alert Required** | YES – Admin (may affect compliance record) |

---

#### document.access.denied

| Field | Value |
|---|---|
| **event_name** | `document.access.denied` |
| **Event Category** | `document` |
| **Actor** | Any user or system |
| **Resource** | `document` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `actor_user_id` (UUID), `client_id` (UUID), `document_type_code`, `denial_reason_code` (NOT_AUTHORISED / CLIENT_MISMATCH / DOCUMENT_NOT_FOUND / ROLE_INSUFFICIENT) |
| **Metadata Prohibited** | Signed URL, file contents, PAN |
| **Expected Outcome** | Row inserted; access denied |
| **Alert Required** | YES – Admin if 3+ denials for same actor within 1 session |

---

### 2.5 — Compliance Events

---

#### compliance.status.changed

| Field | Value |
|---|---|
| **event_name** | `compliance.status.changed` |
| **Event Category** | `compliance` |
| **Actor** | Team member |
| **Resource** | Tracker table (gst / tds / itr / roc / accounting) |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `client_code` (optional), `compliance_type_code`, `filing_period`, `old_status_code`, `new_status_code`, `tracker_form_name` |
| **Metadata Prohibited** | Tax amounts, liability values, challan numbers, ARN |
| **Expected Outcome** | Row inserted; tracker updated; calendar refreshed |
| **Alert Required** | NO (routine); YES – Admin if reverted FILED → PENDING |

---

#### compliance.due_date.changed

| Field | Value |
|---|---|
| **event_name** | `compliance.due_date.changed` |
| **Event Category** | `compliance` |
| **Actor** | Admin only |
| **Resource** | `compliance_calendar` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `compliance_type_code`, `filing_period`, `old_due_date`, `new_due_date`, `change_reason_code` (GOVT_EXTENSION / DATA_CORRECTION / CLIENT_REQUEST) |
| **Metadata Prohibited** | Tax liability, penalty amounts |
| **Expected Outcome** | Row inserted; due date updated; calendar synced |
| **Alert Required** | YES – Admin and Manager |

---

### 2.6 — Task Events

---

#### task.assigned

| Field | Value |
|---|---|
| **event_name** | `task.assigned` |
| **Event Category** | `task` |
| **Actor** | Admin or Manager |
| **Resource** | `task` |
| **Risk Tier** | `LOW` |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `task_type_code`, `assignee_user_id` (UUID), `due_date`, `priority_code` |
| **Metadata Prohibited** | Task notes with PAN/financial data; email addresses |
| **Expected Outcome** | Row inserted; task assigned |
| **Alert Required** | NO |

---

#### task.status.changed

| Field | Value |
|---|---|
| **event_name** | `task.status.changed` |
| **Event Category** | `task` |
| **Actor** | Team member (any role) |
| **Resource** | `task` |
| **Risk Tier** | `LOW` |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `task_type_code`, `old_status_code`, `new_status_code`, `completed_by_user_id` (UUID) |
| **Metadata Prohibited** | Email addresses, task notes with financial data |
| **Expected Outcome** | Row inserted; status updated |
| **Alert Required** | NO |

---

### 2.7 — Access Control Events

---

#### user.role.changed

| Field | Value |
|---|---|
| **event_name** | `user.role.changed` |
| **Event Category** | `access_control` |
| **Actor** | Admin only |
| **Resource** | `team_member` |
| **Risk Tier** | `CRITICAL` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `target_user_id` (UUID), `old_role_code`, `new_role_code`, `change_reason_code` |
| **Metadata Prohibited** | Email, password, token, session details |
| **Expected Outcome** | Row inserted; role updated; affected session invalidated |
| **Alert Required** | YES – independent secondary admin or owner (not the actor) |

---

#### user.permission.changed

| Field | Value |
|---|---|
| **event_name** | `user.permission.changed` |
| **Event Category** | `access_control` |
| **Actor** | Admin only |
| **Resource** | `team_member` |
| **Risk Tier** | `CRITICAL` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `target_user_id` (UUID), `permission_type_code`, `old_value_code`, `new_value_code` |
| **Metadata Prohibited** | Token, password, session data, email |
| **Expected Outcome** | Row inserted; permission updated |
| **Alert Required** | YES – independent secondary admin or owner (not the actor) |

---

#### user.staff_assignment.changed

| Field | Value |
|---|---|
| **event_name** | `user.staff_assignment.changed` |
| **Event Category** | `access_control` |
| **Actor** | Admin or Manager |
| **Resource** | `client` + `team_member` |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `old_assignee_user_id` (UUID), `new_assignee_user_id` (UUID), `assignment_type_code` |
| **Metadata Prohibited** | Client PAN, financial details, email |
| **Expected Outcome** | Row inserted; assignment updated |
| **Alert Required** | NO (routine) |

---

### 2.8 — WhatsApp Bot Events

---

#### whatsapp.document.requested

| Field | Value |
|---|---|
| **event_name** | `whatsapp.document.requested` |
| **Event Category** | `whatsapp_bot` |
| **Actor** | WhatsApp bot (system) on behalf of authenticated director |
| **Resource** | `document` |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `wa_actor_hmac` (keyed HMAC — see §2.12), `document_type_code`, `compliance_type_code`, `filing_period`, `bot_version`, `session_reference_id` |
| **Metadata Prohibited** | Plain WhatsApp number, PIN, OTP, document contents, signed URL |
| **Expected Outcome** | Row inserted; document delivered via WhatsApp |
| **Alert Required** | YES – Admin if >3 requests in single WhatsApp session |

---

#### whatsapp.access.denied

| Field | Value |
|---|---|
| **event_name** | `whatsapp.access.denied` |
| **Event Category** | `whatsapp_bot` |
| **Actor** | WhatsApp bot (unauthenticated/unauthorised) |
| **Resource** | `auth_session` or `document` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `denial_reason_code` (INVALID_PIN / SESSION_EXPIRED / NOT_AUTHORISED / CLIENT_NOT_FOUND), `bot_version`, `attempt_count`, `wa_actor_hmac` |
| **Metadata Prohibited** | Attempted PIN, plain WhatsApp number, phone in any form |
| **Expected Outcome** | Row inserted; access denied; generic WhatsApp error |
| **Alert Required** | YES – Admin if 3+ denials from same `wa_actor_hmac` within 1 hour |

---

### 2.9 — AI Agent Events

---

#### ai.query.permitted

| Field | Value |
|---|---|
| **event_name** | `ai.query.permitted` |
| **Event Category** | `ai_agent` |
| **Actor** | AI chat agent (system) on behalf of authenticated user |
| **Resource** | `system` |
| **Risk Tier** | `LOW` |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `query_intent_code` (COMPLIANCE_QUERY / CLIENT_LOOKUP / REPORT_REQUEST), `tool_invoked_code`, `client_id` (UUID, if applicable), `portal_version` |
| **Metadata Prohibited** | Raw prompt, AI response, PAN, GSTIN, financial values, tokens |
| **Expected Outcome** | Row inserted; tool invocation proceeds |
| **Alert Required** | NO |

---

#### ai.query.denied

| Field | Value |
|---|---|
| **event_name** | `ai.query.denied` |
| **Event Category** | `ai_agent` |
| **Actor** | AI chat agent (system) |
| **Resource** | `system` |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `denial_reason_code` (PERMISSION_DENIED / DATA_SENSITIVITY_BLOCK / RATE_LIMITED / OUT_OF_SCOPE), `tool_attempted_code`, `actor_app_role` |
| **Metadata Prohibited** | Raw prompt, AI response, PAN, GSTIN, financial values, tokens |
| **Expected Outcome** | Row inserted; query blocked |
| **Alert Required** | YES – Admin if 5+ denials from same user within single session |

---

#### ai.tool.execution_failed

| Field | Value |
|---|---|
| **event_name** | `ai.tool.execution_failed` |
| **Event Category** | `ai_agent` |
| **Actor** | AI agent (system) |
| **Resource** | `system` |
| **Risk Tier** | `MEDIUM` |
| **Sensitivity Tier** | `S2` |
| **Metadata Allowed (allow-list)** | `tool_name_code`, `failure_reason_code` (DB_ERROR / PERMISSION_DENIED / TIMEOUT / INVALID_INPUT), `actor_user_id` (UUID), `client_id` (UUID, if applicable) |
| **Metadata Prohibited** | Raw prompt, AI response, stack traces with PII, tokens, credentials |
| **Expected Outcome** | Row inserted; error handled gracefully |
| **Alert Required** | YES – Admin if failure rate >3 within 1 hour |

---

### 2.10 — Data Export Events

---

#### data.bulk_export

| Field | Value |
|---|---|
| **event_name** | `data.bulk_export` |
| **Event Category** | `data_export` |
| **Actor** | Admin only |
| **Resource** | `compliance_data` / `client_list` (logical) |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `export_type_code` (GST_SUMMARY / CLIENT_LIST / COMPLIANCE_CALENDAR), `record_count`, `date_range_start`, `date_range_end`, `export_format_code` (CSV / XLSX) |
| **Metadata Prohibited** | Exported file contents, PAN, GSTIN, financial values |
| **Expected Outcome** | Row inserted; export delivered |
| **Alert Required** | YES – independent secondary admin (always) |

---

#### data.mass_download

| Field | Value |
|---|---|
| **event_name** | `data.mass_download` |
| **Event Category** | `data_export` |
| **Actor** | Admin or Manager |
| **Resource** | `document` (multiple) |
| **Threshold** | Begins **only above the normal-download threshold**: a single-document or routine download is `document.file.downloaded`, not this event. This event fires at **6 or more** documents. |
| **Risk Tier** | `HIGH` for **6–20** documents; `CRITICAL` for **above 20** documents |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `client_id` (UUID), `document_count`, `compliance_type_code_filter`, `filing_period_range`, `download_channel_code` |
| **Metadata Prohibited** | Signed URLs, storage paths, file contents, PAN in filenames |
| **Expected Outcome** | Row inserted; batch download initiated |
| **Alert Required** | YES – Admin for 6–20 documents; YES – independent secondary admin for above 20 |

---

### 2.11 — Security and Audit Events

---

#### security.setting.changed

| Field | Value |
|---|---|
| **event_name** | `security.setting.changed` |
| **Event Category** | `access_control` |
| **Actor** | Admin only |
| **Resource** | `system_config` (logical) |
| **Risk Tier** | `CRITICAL` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `setting_name_code` (SESSION_TIMEOUT / WHATSAPP_PIN_ENABLED / MFA_REQUIRED), `old_value_code`, `new_value_code`, `change_reason_code` |
| **Metadata Prohibited** | API keys, tokens, secrets, passwords, service_role key, WhatsApp access token, EmaraTax credentials |
| **Expected Outcome** | Row inserted; setting updated |
| **Alert Required** | YES – independent secondary admin or owner (not the actor) |

---

#### security.rls_policy.changed

| Field | Value |
|---|---|
| **event_name** | `security.rls_policy.changed` |
| **Event Category** | `access_control` |
| **Actor** | Admin / DBA (Supabase SQL editor or migration) |
| **Resource** | `system_config` (RLS policy, logical) |
| **Risk Tier** | `CRITICAL` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `policy_name`, `table_name`, `change_type_code` (CREATED / ALTERED / DROPPED), `migration_reference` |
| **Metadata Prohibited** | Policy SQL body |
| **Expected Outcome** | Row inserted; policy updated |
| **Alert Required** | YES – independent secondary admin (always) |

---

#### audit.log.viewed

| Field | Value |
|---|---|
| **event_name** | `audit.log.viewed` |
| **Event Category** | `audit` |
| **Actor** | Admin |
| **Resource** | `audit_log` |
| **Risk Tier** | `HIGH` |
| **Sensitivity Tier** | `S3` |
| **Metadata Allowed (allow-list)** | `filter_risk_tier`, `filter_date_range_start`, `filter_date_range_end`, `filter_client_id` (UUID), `row_count_returned`, `access_method_code` (RPC / SERVER_ENDPOINT) |
| **Metadata Prohibited** | Contents of returned rows, PAN, credentials |
| **Expected Outcome** | Inserted **by the audited RPC before** returning results (see §1.4) |
| **Alert Required** | NO (routine admin activity); YES if outside business hours (future heuristic) |

---

#### audit.log.exported

| Field | Value |
|---|---|
| **event_name** | `audit.log.exported` |
| **Event Category** | `audit` |
| **Actor** | Admin only |
| **Resource** | `audit_log` |
| **Risk Tier** | `CRITICAL` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `export_format_code` (CSV / XLSX / JSON), `filter_applied`, `row_count_exported`, `date_range_start`, `date_range_end` |
| **Metadata Prohibited** | File contents, signed URL, storage path |
| **Expected Outcome** | Row inserted; export delivered |
| **Alert Required** | YES – independent secondary admin (always) |

---

#### audit.ingestion.failed

| Field | Value |
|---|---|
| **event_name** | `audit.ingestion.failed` |
| **Event Category** | `audit` |
| **Actor** | System (the writer function) |
| **Resource** | `audit_log` |
| **Risk Tier** | `CRITICAL` |
| **Sensitivity Tier** | `S4` |
| **Metadata Allowed (allow-list)** | `triggering_event_name`, `failure_reason_code` (PROHIBITED_VALUE_DETECTED / DB_ERROR / SCHEMA_MISMATCH / RATE_LIMIT), `field_names_only` (no values) |
| **Metadata Prohibited** | The prohibited value that caused failure; raw prompt; credentials |
| **Non-Recursive Handling** | **Critical:** if a primary audit insert fails, the writer must NOT recursively call itself or re-enter the audit writer. Failure handling uses a **separate fallback path only** (see §4 Rule 8): a separate structured application log, a monitoring/alerting channel, and/or a dedicated `audit_ingestion_failures` store. **Exactly one** fallback attempt is permitted. No retry loop into the audit writer. |
| **Expected Outcome** | Single fallback record written to the separate failure store; monitoring alert raised |
| **Alert Required** | YES – Admin (always; a silent audit failure is a security gap) |

---

### 2.12 — Metadata Safety Rules (Applied to All Events)

**Primary validation = event-specific allow-list.** Each event above defines a `Metadata Allowed (allow-list)`. The writer function validates supplied metadata keys against that event's allow-list and **rejects any key not on the list**. This positive allow-list is the primary control.

**Secondary validation = regex blocking.** As a secondary safety net, allowed string values are additionally scanned against a regex blocklist (PAN pattern, Aadhaar pattern, token/JWT patterns). Regex blocking supplements — but never replaces — the allow-list.

| Rule | Requirement |
|---|---|
| **No email addresses** | Use internal `user_id` (UUID). Masked snapshot (e.g. `p***@yesadvizors.com`) only if operationally required and approved |
| **No phone numbers** | Use keyed HMAC: `HMAC-SHA256(secret_key, phone)` — never plain or unsalted hash |
| **Login/reset correlation** | Use `login_subject_hmac` = `HMAC-SHA256(secret_key, normalised_login_subject)` to correlate repeated anonymous login and password-reset attempts without storing the email/phone |
| **No free-text reasons** | All reason fields use controlled codes; optional sanitised notes field (max 200 chars, validated) |
| **No raw prompts/responses** | Only `query_intent_code` / `tool_name_code` — never actual text |
| **No tokens/credentials** | JWTs, API keys, OTPs, PINs, passwords — never stored |
| **No signed URLs** | Time-limited secrets — never logged |
| **No document contents** | Store `resource_id` reference only |
| **No sensitive old/new values** | `old_values`/`new_values` pass through `SENSITIVE_COLUMNS` blocklist before insertion |
| **HMAC key management** | All HMAC secret keys stored in Supabase Vault, never in code; rotated on a defined schedule |

---

## 3. RLS Design and Test Matrix

> ⚠️ NOT IMPLEMENTED — All policies and test cases are proposed for Phase 4C QA. No RLS has been created or modified.

### 3.1 — Role Definitions

| Identifier | DB Role (Data API) | Resolved Via |
|---|---|---|
| `admin` | `authenticated` | `get_app_role()` → `app_metadata.app_role = 'admin'` |
| `manager` | `authenticated` | `app_metadata.app_role = 'manager'` |
| `staff` | `authenticated` | `app_metadata.app_role = 'staff'` |
| `director` | `authenticated` | `app_metadata.app_role = 'director'` |
| `client` | `authenticated` | `app_metadata.app_role = 'client'` (future) |
| `whatsapp_user` | n/a | No direct DB access; via bot |
| `ai_agent` | `authenticated` | Inherits calling user's JWT |
| `system_service` | `service_role` | Bypasses RLS; constrained by object privileges (§1.2) |
| `anon` | `anon` | No valid user JWT |

---

### 3.2 — Policy Architecture

**Raw `audit_log` has NO permissive SELECT policy for any application role — including admin.** All reads go through the audited RPC (§1.4, §1.6).

```sql
-- NOT IMPLEMENTED — planning only

-- No SELECT permitted on raw audit_log for any application role.
-- Reads occur ONLY via hardened RPC: get_sensitive_audit_logs() / get_client_activity()

-- Append-only: block UPDATE/DELETE for authenticated (RESTRICTIVE)
CREATE POLICY "no_update_authenticated"
  ON public.audit_log AS RESTRICTIVE FOR UPDATE
  TO authenticated USING (false);

CREATE POLICY "no_delete_authenticated"
  ON public.audit_log AS RESTRICTIVE FOR DELETE
  TO authenticated USING (false);

-- Block all anon access (RESTRICTIVE)
CREATE POLICY "no_anon_access"
  ON public.audit_log AS RESTRICTIVE FOR ALL
  TO anon USING (false);

-- Inserts: no direct INSERT policy for application roles.
-- Writes occur ONLY via hardened log_audit_event() SECURITY DEFINER function,
-- owned by audit_writer role (the only role with INSERT privilege on audit_log).

-- service_role: SELECT/INSERT/UPDATE/DELETE on audit_log REVOKED at privilege level (§1.2).
-- service_role granted EXECUTE on log_audit_event() only where operationally required.
```

The audited read RPC (hardened per §1.7):
```sql
-- NOT IMPLEMENTED — planning only
CREATE OR REPLACE FUNCTION public.get_sensitive_audit_logs(
  p_from timestamptz, p_to timestamptz, p_risk_tier text DEFAULT NULL
)
RETURNS SETOF public.audit_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_app_role() <> 'admin' THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  -- record the view BEFORE returning results
  PERFORM public.log_audit_event(
    'audit.log.viewed',
    jsonb_build_object(
      'filter_date_range_start', p_from,
      'filter_date_range_end', p_to,
      'filter_risk_tier', p_risk_tier,
      'access_method_code', 'RPC'
    )
  );

  RETURN QUERY
    SELECT * FROM public.audit_log
    WHERE occurred_at BETWEEN p_from AND p_to
      AND (p_risk_tier IS NULL OR risk_tier = p_risk_tier);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sensitive_audit_logs(timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sensitive_audit_logs(timestamptz, timestamptz, text) TO authenticated;
```

---

### 3.3 — RLS Test Matrix

#### Role: `admin`

| Operation | Condition | Expected | Notes |
|---|---|---|---|
| Direct SELECT on raw `audit_log` | Any row | ❌ DENY | No permissive SELECT policy for admin on raw table |
| SELECT via `get_sensitive_audit_logs()` RPC | Any row | ✅ ALLOW | RPC validates admin role; inserts `audit.log.viewed` first |
| INSERT via `log_audit_event()` | — | ✅ ALLOW | Via hardened function only |
| Raw INSERT on `audit_log` | Direct | ❌ DENY | No INSERT privilege/policy for admin on raw table |
| UPDATE | Any row | ❌ DENY | RESTRICTIVE append-only |
| DELETE | Any row | ❌ DENY | RESTRICTIVE append-only |

---

#### Role: `manager`

| Operation | Condition | Expected | Notes |
|---|---|---|---|
| Direct SELECT on raw `audit_log` | Any | ❌ DENY | No raw read for any role |
| SELECT via RPC | HIGH/CRITICAL | ❌ DENY | RPC restricts to admin |
| SELECT via scoped manager RPC (future) | Own + assigned-client, non-sensitive | ✅ ALLOW (future) | Separate RPC if needed; same hardening |
| INSERT via function | — | ✅ ALLOW | |
| UPDATE / DELETE | Any | ❌ DENY | |

---

#### Role: `staff`

| Operation | Condition | Expected | Notes |
|---|---|---|---|
| Direct SELECT on raw `audit_log` | Any | ❌ DENY | |
| SELECT via RPC | Any sensitive | ❌ DENY | Not admin |
| SELECT via scoped staff RPC (future) | Own entries only | ✅ ALLOW (future) | Least privilege |
| INSERT via function | — | ✅ ALLOW | |
| UPDATE / DELETE | Any | ❌ DENY | |

---

#### Role: `director`

| Operation | Condition | Expected | Notes |
|---|---|---|---|
| Direct SELECT on raw `audit_log` | Any | ❌ DENY | |
| `get_client_activity()` RPC | Own client_id | ✅ ALLOW (future) | Redacted projection only |
| `get_client_activity()` RPC | Other client_id | ❌ DENY | RPC validates ownership |
| Any sensitive/internal events | — | ❌ DENY | Excluded from redacted RPC |
| INSERT / UPDATE / DELETE | Any | ❌ DENY | |

---

#### Role: `client` (future)

| Operation | Condition | Expected | Notes |
|---|---|---|---|
| Direct SELECT on raw `audit_log` | Any | ❌ DENY | |
| `get_client_activity()` RPC | Own compliance events | ✅ ALLOW (future) | Redacted RPC |
| Internal operations | — | ❌ DENY | |
| INSERT / UPDATE / DELETE | Any | ❌ DENY | |

---

#### Role: `whatsapp_user`

| Operation | Condition | Expected | Notes |
|---|---|---|---|
| Direct DB access | Any | ❌ DENY | No DB access |
| Logging via bot | Bot executes `log_audit_event()` (service_role EXECUTE) | ✅ ALLOW (via function) | Writer function is sole path |
| UPDATE / DELETE | Any | ❌ DENY | |

---

#### Role: `ai_agent`

| Operation | Condition | Expected | Notes |
|---|---|---|---|
| SELECT on `audit_log` | Any | ❌ DENY | No audit read access |
| SELECT on `clients`/trackers | Per calling user's JWT | ✅ ALLOW (RLS-scoped) | Inherits user permissions |
| INSERT via function | System actions | ✅ ALLOW | |
| UPDATE / DELETE | Any | ❌ DENY | |

---

#### Role: `system_service` (`service_role`)

| Operation | Condition | Expected | Notes |
|---|---|---|---|
| SELECT on `audit_log` | — | ❌ DENY | SELECT privilege REVOKED (§1.2); RLS bypass irrelevant without privilege |
| INSERT on `audit_log` | Direct | ❌ DENY | INSERT privilege REVOKED |
| INSERT via `log_audit_event()` | EXECUTE granted where required | ✅ ALLOW | Sole write path |
| UPDATE on `audit_log` | — | ❌ DENY | UPDATE privilege REVOKED |
| DELETE on `audit_log` | — | ❌ DENY | DELETE privilege REVOKED |

> Note: `service_role` bypasses RLS, but with all direct DML privileges on `audit_log` revoked, it cannot read or mutate the table directly. It can only EXECUTE the approved writer function.

---

#### Role: `anon`

| Operation | Condition | Expected | Notes |
|---|---|---|---|
| SELECT / INSERT / UPDATE / DELETE | Any | ❌ DENY | RESTRICTIVE all-deny |
| Auth attempts | Login endpoint | Rate-limited | Failure logged as `auth.session.login_failed` with `login_subject_hmac` |

---

### 3.4 — RLS Summary Matrix

| Role | Direct raw SELECT | Read via RPC | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `admin` | ❌ DENY | ✅ audited RPC (sensitive) | Via function only | ❌ | ❌ |
| `manager` | ❌ DENY | Scoped RPC (future) | Via function | ❌ | ❌ |
| `staff` | ❌ DENY | Scoped RPC (future, own only) | Via function | ❌ | ❌ |
| `director` | ❌ DENY | ✅ redacted client RPC (own) | ❌ | ❌ | ❌ |
| `client` | ❌ DENY | ✅ redacted client RPC (own) | ❌ | ❌ | ❌ |
| `whatsapp_user` | ❌ DENY | ❌ | Via function (bot) | ❌ | ❌ |
| `ai_agent` | ❌ DENY | ❌ | Via function | ❌ | ❌ |
| `system_service` | ❌ DENY (privilege revoked) | ❌ | Via function EXECUTE only | ❌ (revoked) | ❌ (revoked) |
| `anon` | ❌ DENY | ❌ | ❌ | ❌ | ❌ |

---

## 4. Security Rules

### Rule 1 — Audit Records Are Append-Only

- `audit_log` is append-only by design
- RLS RESTRICTIVE policies block UPDATE/DELETE for `anon` and `authenticated`
- `service_role` UPDATE/DELETE/INSERT/SELECT privileges on `audit_log` are REVOKED (§1.2); it holds only EXECUTE on the writer function
- Defence in depth: dedicated NOLOGIN `audit_owner` for table ownership, separate restricted NOLOGIN `audit_writer` for INSERT-only function execution, minimal grants, FORCE RLS, monitoring, and future external immutable archival
- **Limitation:** true append-only against a determined superuser still requires external immutable archival (Phase 4D)

### Rule 2 — Normal Users Cannot Modify Audit Logs

- All `authenticated` roles are blocked from UPDATE/DELETE by RESTRICTIVE policies and hold no direct INSERT
- No application role reads or writes the raw table directly; all access is mediated by hardened functions

### Rule 3 — Client and Director Users Cannot See Raw Audit Logs

- No SELECT on raw `audit_log` for any role, including director/client
- Director/client access is via the **redacted `get_client_activity()` RPC** (preferred method)
- A view is permitted only after an explicit `security_invoker` + RLS review (§1.6)
- Redacted output exposes only `occurred_at`, `event_display`, `compliance_type`, `filing_period`, `new_status`; all internal fields and sensitive categories excluded

### Rule 4 — Staff Access Follows Least Privilege

- `staff` may read only own entries (via a future scoped RPC), never peers' logs, client trails, or HIGH/CRITICAL events
- `manager` may read own + assigned-client non-sensitive entries via a scoped RPC
- Escalation attempts are blocked and logged as `access.cross_client.attempted` or `access.client.denied`

### Rule 5 — Viewing Audit Logs Must Be Logged

- PostgreSQL does not support SELECT triggers (§1.4)
- All audit reads — including admin — occur through an audited RPC that inserts `audit.log.viewed` before returning results
- pgAudit is a separate statement logger (infrastructure level), not an `audit_log` row mechanism

### Rule 6 — Prohibited Values Must Never Be Stored

Primary control is the **event-specific metadata allow-list** (§2.12). Regex blocking is the secondary net. Prohibited everywhere: PAN, Aadhaar, passwords/hashes, OTPs, raw JWTs/tokens, plain or unsalted-hash phone numbers, bank/IFSC, document contents, service_role key, WhatsApp access token, signed URLs, free-text TRN/GSTIN, EmaraTax credentials, plain email, raw AI prompts/responses, PII-bearing stack traces.

Enforcement (proposed Phase 4C): the hardened `log_audit_event()` validates metadata keys against the event's allow-list, then scans values against the regex blocklist. On detection, the offending value is dropped and the failure is handled per Rule 8.

### Rule 7 — Role/Permission/Security Changes Alert an Independent Recipient

Events `user.role.changed`, `user.permission.changed`, `auth.mfa.changed`, `auth.session.revoked`, `auth.password_reset.completed`, `security.setting.changed`, `security.rls_policy.changed`, `audit.log.exported`, `data.bulk_export`, `access.cross_client.attempted`, `user.account.created/deactivated/reactivated` must alert an **independent** admin, owner, or secondary admin who is **not the actor**. The recipient is a configurable system setting, not hardcoded.

### Rule 8 — Audit-Ingestion Failure Handling Is Non-Recursive

- If a primary audit insert fails, the writer must **not** call itself recursively or re-enter the audit writer
- Failure is handled by a **separate fallback path only**: a separate structured application log, a monitoring/alert channel, and/or a dedicated `audit_ingestion_failures` store
- **Exactly one** fallback attempt is permitted — no retry loop
- The fallback record carries field names and reason codes only — never the prohibited value, raw prompt, or credentials
- A monitoring alert is raised to Admin

---

## 5. Final Status

| Item | Status |
|---|---|
| Document type | Planning and design only (v2.1 final) |
| SQL executed | ❌ None |
| Migration created | ❌ None |
| Database changed | ❌ No |
| Supabase changed | ❌ No |
| Edge Functions changed | ❌ No |
| App or runtime logic changed | ❌ No |
| Deployment triggered | ❌ No |
| Users, roles, or permissions changed | ❌ No |
| Secrets or API keys added | ❌ No |
| Branch created | ❌ No |
| PR created | ❌ No |
| Merged | ❌ No |

**This document must be reviewed and approved before Phase 4C (Implementation) begins.**

**Phase 4C will cover:**
- Hardened `log_audit_event()` SECURITY DEFINER writer (fixed search_path, qualified names, EXECUTE revoked from PUBLIC, selective grants, caller + role validation, event-specific allow-list validation)
- Dedicated NOLOGIN `audit_owner` table owner and separate restricted NOLOGIN `audit_writer` role; REVOKE of direct DML on `audit_log` from `service_role`
- Audited `get_sensitive_audit_logs()` admin read RPC (records `audit.log.viewed` first)
- Redacted `get_client_activity()` RPC for director/client
- RESTRICTIVE append-only and anon-deny policies; no permissive raw SELECT for any role
- Non-recursive failure handling with separate `audit_ingestion_failures` store
- Retention cron function
- QA execution against this matrix
- Migration files (created only after Phase 4B approval)

---

*Document version: 2.1.1 — Final*
*Phase: 4B (Planning only)*
*Previous phase: 4A — Audit Log Schema Draft*
*Next phase: 4C — Implementation (pending approval of Phase 4A + 4B)*
*Last updated: June 2026*
*Maintained by: Yes Advizors Portal Team*
*Contact: pankaj@yesadvizors.com*
