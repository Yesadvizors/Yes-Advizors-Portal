# YAV2 Portal V2 — Phase 4C v8 vs merged audit implementation (0005+) — Reconciliation Matrix

**Status:** read-only analysis. **No Supabase access, no SQL executed, no PR modified.** Governing base:
`sync/integration` @ `18df34cc8d949d6c0da5552571e7a66962eece2b`.
**Reference (not modified):** PR #6 `feat/phase4c-audit-log-implementation-draft` @ `a68308b47317e04739cd317d9df2adb1b489450d`.

> **Headline:** the audit **table shapes are compatible** (identical columns), so the tables can be
> **extended in place**. The divergence is in the **access model, functions, roles, and RLS policies** — plus
> **three function-name collisions** with the base. Phase 4C cannot be applied as-is (it re-`CREATE TABLE`s
> tables that already exist and are load-bearing); a reconciled, additive migration set is required.

---

## 1. Tables — `audit_log`

| Aspect | Base `0005` (merged) | Phase 4C v8 `080003` | Verdict |
|---|---|---|---|
| Columns | 18 (`id, occurred_at, initiated_by_type, actor_user_id, actor_service, actor_app_role, target_user_id, client_uuid, client_code_snapshot, resource_type, resource_id, event_name, event_category, action, description, risk_tier, sensitivity_tier, metadata`) | **Same 18 columns** | **COMPATIBLE — extend in place; do not re-create** |
| CREATE form | `CREATE TABLE public.audit_log (…)` (no IF NOT EXISTS) | `CREATE TABLE public.audit_log (…)` (no IF NOT EXISTS) | **COLLISION** on apply (relation exists) |
| Grants | `REVOKE`/default-deny posture (0005/0006) | `REVOKE ALL … FROM PUBLIC, anon, authenticated, service_role` + `GRANT INSERT→audit_writer`, `GRANT SELECT→audit_owner` | **DELTA — role grants are net-new** |
| RLS | ENABLE + FORCE; **default-deny, NO permissive policy** (0010 forbids policies on audit_*) | ENABLE + FORCE + explicit policies (`audit_writer_insert`, `audit_owner_select`, RESTRICTIVE `no_update/no_delete/no_anon/no_authenticated_direct`) | **ACCESS-MODEL DIVERGENCE (PJ decision)** |
| Indexes/constraints | (per 0005) | (per 080003) | verify parity at implementation |

## 2. Tables — `audit_ingestion_failures`

| Aspect | Base `0005` | Phase 4C v8 `080003` | Verdict |
|---|---|---|---|
| Columns | 6 (`id, failed_at, triggering_event, failure_reason_code, field_names_only, sqlstate_code`) | **Same 6 columns** | **COMPATIBLE — extend in place** |
| CREATE form | `CREATE TABLE` (exists) | `CREATE TABLE` (re-creates) | **COLLISION** |
| RLS | default-deny + FORCE | ENABLE + FORCE + restrictive | ACCESS-MODEL DELTA |

## 3. Tables — `audit_event_contract`

| Aspect | Base `0005` | Phase 4C v8 `080004` | Verdict |
|---|---|---|---|
| Presence | Exists (0005) | Re-created + seeded event rows + RLS | **COLLISION**; phase4c seeds a richer event contract (e.g. `security.rls_policy.changed`, `auth.password_reset.*`) |
| RLS | default-deny | `contract_owner_select`, `contract_writer_select`, RESTRICTIVE no-anon/no-authenticated | ACCESS-MODEL DELTA |

## 4. Roles

| Role | Base | Phase 4C v8 `080001` | Verdict |
|---|---|---|---|
| `audit_owner` | absent | `CREATE ROLE audit_owner NOLOGIN NOINHERIT NOCREATEROLE NOCREATEDB` | **NET-NEW — needs CREATE ROLE authority (see discovery kit)** |
| `audit_writer` | absent | `CREATE ROLE audit_writer NOLOGIN NOINHERIT NOCREATEROLE NOCREATEDB` | **NET-NEW** |
| `service_role` | platform-managed | REVOKE audit privileges FROM it | platform constraint — grant/revoke only, never own/alter |

## 5. Functions — collisions and net-new

| Function | Base | Phase 4C v8 | Verdict |
|---|---|---|---|
| `get_app_role` | **0008** | **080006** | **COLLISION** — verify signature; decide CREATE OR REPLACE vs keep base |
| `get_app_role_for_user` | **0008** | **080006** | **COLLISION** — same |
| `get_sensitive_audit_logs` | **0008** | **080008** | **COLLISION** — the audit READ path already exists in base; reconcile |
| `audit_write_event` | **0016** | — (phase4c uses `log_audit_event_trusted_backend`) | **PARALLEL WRITERS** — base writer vs phase4c writer; decide canonical |
| `audit_contains_secret` | — | 080005 | NET-NEW (redaction guard — security-positive) |
| `audit_is_uuid`, `audit_field_format_ok`, `audit_validate_event` | — | 080005 | NET-NEW (validation) |
| `staff_can_access_client` | — | 080006 | NET-NEW |
| `_record_audit_failure`, `log_audit_event_trusted_backend` | — | 080007 | NET-NEW (trusted writer) |
| `_write_read_audit` | — | 080008 | NET-NEW (read-audit) |

## 6. Access-model divergence (the central reconciliation decision)

- **Base model (0005/0006/0010):** audit_* tables are **default-deny + FORCE RLS with NO permissive policy**;
  all access flows through **SECURITY DEFINER** functions (e.g. `get_sensitive_audit_logs`). `0010` explicitly
  **DROPs** the 0006 permissive baseline and states the audit_* tables **MUST NOT** carry a policy.
- **Phase 4C model (080003/080004):** **role-based policies** granting `audit_writer` INSERT and `audit_owner`
  SELECT, with RESTRICTIVE deny-all for anon/authenticated, and object GRANTs to the new roles.
- **These are two different architectures for the same tables.** Choosing between them (or a hybrid:
  keep SECURITY-DEFINER access **and** add the `audit_writer`/`audit_owner` roles as the definer-owners) is a
  **PJ decision** recorded in the reconciled design doc.

## 7. Rollback implications

- Phase 4C ships `supabase/rollback/PHASE4C_AUDIT_LOG_ROLLBACK.sql` (outside `migrations/`, good). As drafted it
  assumes greenfield objects; **it must not drop the base `0005` tables** (they predate Phase 4C and carry
  data + dependents). Any reconciled rollback must invert **only** the net-new additions.

## 8. Hygiene-guard compliance (merged guard)

- Phase 4C's table-creating migration (`080003`) **PASSES** the merged
  `.github/scripts/check_migration_hygiene.mjs` (anon object + data revoked via
  `REVOKE ALL … FROM PUBLIC, anon, …`, RLS ENABLE + FORCE). The **reconciled** migration set must remain
  compliant — but because the tables already exist, the reconciled set will mostly **ALTER/extend**, not
  `CREATE TABLE`, so the guard applies only to any genuinely new public table.
