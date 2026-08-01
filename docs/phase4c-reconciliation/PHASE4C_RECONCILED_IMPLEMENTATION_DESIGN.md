# YAV2 Portal V2 — Phase 4C Reconciled Implementation Design (read-only; not executable)

**Status:** design/documentation only. **No Supabase access, no SQL executed, no executable migration created,
no PR modified.** Governing base: `sync/integration` @ `18df34cc8d949d6c0da5552571e7a66962eece2b`.
Companion: `PHASE4C_VS_0005_RECONCILIATION.md`, `PHASE4C_AUDIT_ROLE_AUTHORITY_DISCOVERY_RUNBOOK.md`.

---

## 1. Recommended reconciliation method — **EXTEND IN PLACE (additive)**

Because the `audit_log`, `audit_ingestion_failures` and `audit_event_contract` **table shapes are identical**
between base `0005` and Phase 4C v8, and because the base tables are **load-bearing** (8+ dependent
migrations), the safest method is:

1. **Keep the existing `0005` tables. Do NOT drop, rename or re-`CREATE` them.**
2. **Layer only the NET-NEW Phase 4C objects additively**: the two roles, the validation/redaction functions,
   the trusted writer/reader functions, the seeded event-contract rows, and (subject to §3) the role-based
   access grants — each guarded with `IF NOT EXISTS` / `CREATE OR REPLACE` and idempotent seeding.
3. **Reconcile the three function collisions explicitly** (`get_app_role`, `get_app_role_for_user`,
   `get_sensitive_audit_logs`): confirm signature compatibility; prefer `CREATE OR REPLACE` **only** if the
   Phase 4C body is a superset that preserves existing callers, else keep the base version and drop the
   Phase 4C duplicate.
4. **Reconcile the writer:** decide the canonical audit writer (base `audit_write_event` vs Phase 4C
   `log_audit_event_trusted_backend`); do not leave two competing writers.

**Controlled reconstruction (drop + recreate) is NOT recommended** and is justified only if a live check proves
the `0005` audit tables are empty in `yav2-dev` **and** every dependent (see §4) is simultaneously migrated —
a materially riskier path reserved for an explicit PJ decision.

## 2. Proposed FUTURE numbered migration sequence (design only — not authored here)

Under the repo's `00xx` convention, continuing after `0022` (each with a paired `_rollback.sql`):

| # | Migration (proposed) | Purpose | Creates public table? |
|---|---|---|---|
| `0023` | `phase4c_audit_roles` | `CREATE ROLE audit_owner/audit_writer IF NOT EXISTS` (gated on authority discovery) | no |
| `0024` | `phase4c_audit_table_extend` | ALTER existing `audit_log`/`audit_ingestion_failures`/`audit_event_contract` to the v8 delta (indexes/constraints only if any) | **no** (extends existing) |
| `0025` | `phase4c_audit_validation_fns` | `audit_contains_secret`, `audit_is_uuid`, `audit_field_format_ok`, `audit_validate_event` | no |
| `0026` | `phase4c_audit_access_fns` | reconcile `get_app_role*`, `staff_can_access_client`, `get_sensitive_audit_logs` (CREATE OR REPLACE) | no |
| `0027` | `phase4c_audit_writer` | `_record_audit_failure`, `log_audit_event_trusted_backend`; retire/redirect base `audit_write_event` per §1.4 | no |
| `0028` | `phase4c_audit_reader_and_contract` | `_write_read_audit`, seed event-contract rows, RLS/grants per the §3 access-model decision | no |

Each ships a rollback that inverts **only** its own additions and **never** drops the `0005` tables. If any
step genuinely adds a new public table, it must satisfy the merged hygiene guard.

## 3. Access-model decision (PJ) — role-based vs SECURITY-DEFINER-only

- **Option A (align to base):** keep default-deny + `SECURITY DEFINER` functions as the sole access path; add
  `audit_owner`/`audit_writer` **only** as function owners/definers; **do not** add permissive table policies
  (honours `0010`'s "no policy on audit_*" rule). Lowest churn, consistent with the merged posture.
- **Option B (adopt Phase 4C):** add the role-based policies (`audit_writer_insert`, `audit_owner_select`,
  RESTRICTIVE denies) and object grants; supersede `0010`'s stance for these tables with a documented change.
- **Recommendation:** **Option A** (align to base) unless PJ wants the explicit role-based policy surface;
  Option A minimises collision with `0010` and existing SECURITY DEFINER RPCs. **Final choice is a PJ decision.**

## 4. Dependency register — what breaks if the base audit tables are dropped/renamed/replaced

| Dependent (base) | Uses `audit_log` for | Impact if base tables dropped |
|---|---|---|
| `0006_rls_policies.sql` | RLS baseline for audit_* | policy targets vanish → migration replay breaks |
| `0007_dependency_closure.sql` | references audit_* | broken references |
| `0008_functions_rpc.sql` | `get_sensitive_audit_logs`, role fns read audit | function bodies reference missing relation |
| `0010_rls_refined_phase4b.sql` | drops 0006 policy on audit_*, asserts posture | assertion/DDL fails |
| `0016_m1b_d2a_audit_write_and_lineage.sql` (**22 refs**) | `audit_write_event` + lineage writes | audit write path breaks |
| `0017_m1b_d2b_client_master_crud_rpcs.sql` | CRUD RPCs emit audit events | every client-master write loses its audit trail |
| `0021_service_applicability.sql` | emits audit events | audit trail breaks |
| `0022_p5_pg1_other_notes_enforcement.sql` | emits audit events | audit trail breaks |
| Live data | existing audit rows in `yav2-dev` | data loss on drop |

**Conclusion:** dropping/replacing the base audit tables is high-risk and broadly breaking → **extend in place**.

## 5. Authority dependency (roles)

- Phase 4C requires creating `audit_owner`/`audit_writer`. Per Stage A evidence the executing `postgres` role
  has `rolcreaterole = true` (not superuser), so role creation is **likely** permitted — but this must be
  **confirmed read-only** via `supabase/verification/YAV2_PHASE4C_AUDIT_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`
  before any implementation. `service_role` is platform-managed (grant/revoke only). This authority question is
  **separate from and independent of** the Stage A Supabase-support item.

## 6. Hygiene-guard compliance of the reconciled design

- The reconciled set is mostly **ALTER/function/seed** work; any genuinely new public table must carry the
  anon object + data revoke and RLS per the merged guard. The extend-in-place approach inherits the compliant
  posture already present on the `0005` tables (default-deny + FORCE RLS), so no new anon exposure is created.

## 7. Independence & scope

- Phase 4C reconciliation is **independent of the pending Stage A Supabase-support response**. It has its own
  (lighter, likely self-serviceable) role-creation authority question. It does not touch Stage A, PR #6, PR #39,
  or `main`, and requires no V1/Production access.
