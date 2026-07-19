# M1-B P5 — Migration 0021 Service Applicability — Implementation Plan

**Status: EXECUTED / CLOSED PASS on V2/yav2-dev (`ogjrwemjefvccpyjwxuo`), 2026-07-19.** PJ manually
executed `supabase/migrations/0021_service_applicability.sql` once (COMMIT, no visible error);
pre-checks (`PASS_pre_execution_ready=true`) and post-checks V1–V8 all passed; **0** applicability
rows created; no compliance/tracker/calendar generation; no `clients.services` change; protected
counts unchanged. **Migration must NOT be rerun; rollback NOT authorized.** Full transcribed evidence:
`docs/M1B_P5_0021_Execution_Evidence.md`. (Sections below are the as-authored plan, retained verbatim
as the design record.)

**Baseline:** branch `ui/redesign-v1` · migration commit `05796268c7e0f5d5f597c9796fc32967ad9d237f`
· execution-readiness commit `814a52b6956363cb9c911cb4eac0c1babfd856ee`. (The `8cc87664…` HEAD noted
during drafting is superseded by these committed states.)
**Authorised project:** V2/yav2-dev `ogjrwemjefvccpyjwxuo` only; V1/Production prohibited.

**Package (4 files):**
- `supabase/migrations/0021_service_applicability.sql` — schema + reference seed + FK + RLS + grants + audited RPCs + 4 audit events (single transaction; fail-closed pre/post).
- `supabase/verification/rollback_0021_service_applicability_manual.sql` — **manual, operator-run** data-safe reverse (deliberately **outside** `supabase/migrations/`; never a forward migration).
- `supabase/verification/M1B_P5_0021_post_execution_verification_readonly.sql` — read-only V1–V8.
- this plan.

**Scope reminder:** SCHEMA + CONTROLLED REFERENCE DATA ONLY. No `clients.services` migration/backfill/
copy/delete/modify; **0** `client_service_applicability` rows created from current clients; no
client-data cleanup; no compliance/FY/due-date/overdue/calendar generation; `clients.id` uuid stays
authoritative.

---

## 1. Objects created

| Object | Kind | Notes |
|--------|------|-------|
| `public.service_catalogue` | table | 11 PJ-approved codes seeded; `requires_registration`/`default_frequency` neutral (false/NULL) pending per-service PJ rulings |
| `public.client_service_applicability` | table | core layer; `status` single lifecycle authority; CHECKs incl. `csa_effective_from_gate_chk`, `csa_effective_to_null_when_approved_chk`, `csa_approval_actor_chk` |
| `client_registrations_id_client_uq` | UNIQUE(id, client_id) on `client_registrations` | composite-FK prerequisite (additive) |
| `csa_registration_same_client_fk` | composite FK | `(linked_registration_id, client_id) → client_registrations(id, client_id)` **ON DELETE RESTRICT** |
| `client_service_applicability_live_uq` | partial unique | `(client_id, service_code) WHERE status <> 'Inactive'` |
| RLS + policies | — | applicability: SELECT admin/manager (RPC-only writes); catalogue: SELECT active users, **read-only — no runtime write path (fail-closed)** |
| 3 RPCs | SECURITY DEFINER | create / update / set_status |
| 4 audit events | contract rows | `service_applicability.added` / `.updated` / `.approved` / `.deactivated` (§4) |

## 2. Exact RPC signatures (deliverable 7)

```
public.service_applicability_create(
  p_client_id uuid, p_service_code text, p_effective_from date, p_effective_to date,
  p_frequency text, p_linked_registration_id uuid, p_owner_team_id uuid, p_notes text
) RETURNS jsonb            -- {id, row_version}; always creates status='Draft'

public.service_applicability_update(
  p_id uuid, p_expected_row_version integer, p_effective_from date, p_effective_to date,
  p_frequency text, p_linked_registration_id uuid, p_owner_team_id uuid, p_notes text
) RETURNS integer          -- new row_version; field edits only; not for status

public.service_applicability_set_status(
  p_id uuid, p_expected_row_version integer, p_new_status text, p_effective_to date
) RETURNS integer          -- new row_version; Draft→Approved | Draft→Inactive | Approved→Inactive
```

All three: SECURITY DEFINER, `SET search_path = pg_catalog, public, pg_temp`; guard
`auth.uid()`/`is_active_user()`/`is_admin_or_manager()`; `created_by/updated_by/approved_by :=
auth.uid()`; `REVOKE ALL … FROM PUBLIC, anon, service_role; GRANT EXECUTE … TO authenticated`.
**Approval actor + timestamp are system-controlled** (`auth.uid()`/`now()` inside `set_status`), never
client-supplied. **Restart = a new `create`** (allowed once the prior row is `Inactive`); rows are not
reopened; `update`/`set_status` refuse an `Inactive` row.

**`effective_to` lifecycle rule (fail-closed).** `status` is the single lifecycle authority, so
`effective_to` is a *live* value **only** for a stopped (`Inactive`) row and is set **only** by the
governed deactivation transition (`set_status → Inactive`, which flips `status` in the same UPDATE).
A `Draft` may carry a *proposed* `effective_to`, but: (a) `update` rejects a non-null `p_effective_to`
on an `Approved` row (`EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED`); (b) approval rejects a `Draft` that
still carries `effective_to` (same error) until it is cleared; and (c) the DB constraint
`csa_effective_to_null_when_approved_chk` (`CHECK (status <> 'Approved' OR effective_to IS NULL)`) is
the fail-closed backstop.

## 3. Exact RLS & privilege model (deliverable 6)

- `client_service_applicability`: RLS **ENABLE + FORCE**. One policy — `..._select` FOR SELECT TO
  authenticated USING `is_active_user() AND is_admin_or_manager()`. **No INSERT/UPDATE/DELETE policy.**
  Grants: `REVOKE ALL FROM PUBLIC, anon; GRANT SELECT TO authenticated, service_role; REVOKE
  INSERT,UPDATE,DELETE FROM authenticated`. → **All writes go through the SECURITY DEFINER RPCs**
  (owned by the migration owner, which bypasses RLS); direct DML is impossible for `authenticated`.
- `service_catalogue` (**fail-closed reference governance**): RLS ENABLE + FORCE; **`..._select`
  only** (all active users). **No write policy**; grants are **SELECT only** to authenticated +
  service_role, with an explicit `REVOKE INSERT,UPDATE,DELETE`. The catalogue is **seeded by this
  migration only** (as the migration owner). **0021 grants no new runtime write authority** over the
  catalogue — adding/altering service codes, `requires_registration`, `default_frequency`, and any
  `DELETE`, are **deferred** to a separate PJ-approved migration (or a future governed audited RPC).
  This deliberately diverges from the more permissive `entity_type_catalogue` write model: no direct
  Admin/Manager catalogue writes, so runtime catalogue changes cannot bypass controlled governance.
  Verified by `p5_0021_v4_rls` (`PASS_v4_catalogue_readonly`: SELECT true; INSERT/UPDATE/DELETE false).
- Verified by `p5_0021_v5_privileges` (applicability — authenticated: SELECT true; INSERT/UPDATE/DELETE
  false; anon SELECT false), `p5_0021_v4_rls` (catalogue read-only + RLS forced on both tables), and
  `p5_0021_v6_rpcs` — which checks **all three RPCs** for exact signature, `prosecdef=true`, EXECUTE to
  authenticated, and **no** EXECUTE for anon / service_role / PUBLIC (PUBLIC via `aclexplode` grantee=0),
  yielding `PASS_v6_all_rpc_security`.

## 4. Audit-event model (deliverable 5) — DECISION: Option A (four separate lifecycle events)

**Decision.** Approval and deactivation are **not** compressed into a generic `updated`. Four
distinct events are registered — one per lifecycle stage — so approval and deactivation are
independently queryable in `audit_log`.

| event_name | permitted_actions | resource | risk / sensitivity | required_keys | change_type_code | emitted by |
|------------|-------------------|----------|--------------------|---------------|------------------|------------|
| `service_applicability.added` | `CREATE` | `client_service_applicability` | MEDIUM / S2 | `change_type_code` | `CREATED` | `_create` |
| `service_applicability.updated` | `UPDATE` | `client_service_applicability` | MEDIUM / S2 | `change_type_code` | `UPDATED` | `_update` (field edits only) |
| `service_applicability.approved` | `UPDATE` | `client_service_applicability` | MEDIUM / S2 | `change_type_code` | `ENABLED` | `_set_status` (Draft→Approved) |
| `service_applicability.deactivated` | `UPDATE` | `client_service_applicability` | MEDIUM / S2 | `change_type_code` | `DISABLED` | `_set_status` (→Inactive) |

**Why this is valid against the existing contract/validator:**
- **Naming/category:** event names follow the existing `<resource-family>.<stage>` convention
  (cf. `registration.added`, `person.changed`); `event_category` is derived by
  `split_part(event_name,'.',1)='service_applicability'` (free-text category — `registration` is an
  existing precedent, so a new family is accepted).
- **Actions:** only the LIVE vocabulary `CREATE`/`UPDATE` is used (0016 permits no others); approval
  and deactivation are `UPDATE` actions but carry **distinct event_names**, so they are not folded
  into `updated`.
- **change_type_code:** every value is in the `audit_field_format_ok` whitelist (0007:
  `CREATED/UPDATED/DELETED/ENABLED/DISABLED/GRANTED/REVOKED`). Approval → `ENABLED` (brought into
  force); deactivation → `DISABLED`. `'DEACTIVATED'` is deliberately **not** used (not whitelisted).
- **Metadata contract:** `required_keys=['change_type_code']`, `optional_keys=[]`,
  `allow_empty_metadata=false`, `client_requirement='required'`, `target_user_requirement='prohibited'`,
  `permitted_actor_types=['user']` — identical shape to the D2a family events, so
  `audit_validate_event` passes. `risk_tier='MEDIUM'`, `sensitivity='S2'` mirror the master-write family.
- Events are emitted by the RPCs at **runtime only**; the migration writes **no** `audit_log` rows
  (SECTION H asserts `audit_log` unchanged).

## 5. Rollback-risk & rerun/idempotency analysis (deliverable 2)

- **Single transaction.** Any failed SECTION 0 precondition or SECTION H postcondition rolls the whole
  migration back — partial application is impossible.
- **Additive / rerun-safe by refusal.** SECTION 0 aborts if `service_catalogue` /
  `client_service_applicability` / the 3 RPCs / the 4 audit events / `client_registrations_id_client_uq`
  already exist → **a second run is disallowed** (fail-closed), avoiding duplicate objects. It is not a
  DO-NOTHING idempotent no-op; it is a one-shot additive migration (matches 0016/0017 convention).
- **Postconditions** re-assert: 11 catalogue rows; **0** applicability rows; and **row-count /
  element-count invariance** of `clients` / `clients.services` element total / `client_registrations`
  / trackers / calendar / `audit_log`; contract **+4**; composite-FK prerequisite present; 3 RPCs
  present; **RLS enabled+forced on BOTH new tables**; and the catalogue asserted **read-only** (no
  authenticated INSERT/UPDATE/DELETE privilege, no non-SELECT policy). **These are count checks, not
  content proofs** — see §7.
- **Rollback** (`supabase/verification/rollback_0021_service_applicability_manual.sql` — a **manual,
  operator-run** script kept **outside** `supabase/migrations/`, never a forward migration):
  **data-safe guard** aborts if any `client_service_applicability` rows exist; otherwise drops the 3
  RPCs, the core table (with its policies/indexes/FK), the `client_registrations_id_client_uq`
  constraint, `service_catalogue`, and the **4** audit events — in reverse dependency order — then
  re-asserts absence. It never touches `clients` / `clients.services` / `client_registrations` **data**.
- **Risks / notes:** (a) dropping `client_registrations_id_client_uq` is safe (additive, no data);
  (b) the composite FK requires that UNIQUE — verified present in SECTION 0 flow; (c) `service_code`
  and `linked_registration_id` FKs use RESTRICT, so catalogue/registration deletes are blocked while
  referenced (intended); (d) `owner_team_id → team(id)` has no same-client concept (team is global) —
  intended.

## 6. Negative-test matrix (deliverable 4) — for the transactional test kit (later, always-ROLLBACK)

| # | Action | Expected error |
|---|--------|----------------|
| N1 | any RPC with no `auth.uid()` | `NO_AUTH_CONTEXT` |
| N2 | RPC as inactive user | `NOT_AUTHORISED_INACTIVE` |
| N3 | RPC as non-admin/manager | `NOT_AUTHORISED` |
| N4 | create with unknown/inactive `service_code` | `INVALID_OR_INACTIVE_SERVICE_CODE` |
| N5 | create with bad `frequency` | `INVALID_FREQUENCY` |
| N6 | create `effective_to < effective_from` | `EFFECTIVE_TO_BEFORE_FROM` |
| N7 | create with `owner_team_id` that is inactive/not a team member | `OWNER_NOT_ACTIVE_TEAM_MEMBER` |
| N8 | create a `requires_registration` service with NULL link | `REGISTRATION_REQUIRED_FOR_SERVICE` |
| N9 | create with `linked_registration_id` of a **different** client | `REGISTRATION_NOT_SAME_CLIENT` (RPC) / composite-FK violation (DB) |
| N10 | second live row for same `(client, service)` | `client_service_applicability_live_uq` unique violation |
| N11 | update/set_status with stale `row_version` | `STALE_ROW_VERSION` |
| N12 | update on an `Inactive` row | `ROW_INACTIVE_NOT_EDITABLE` |
| N13 | set_status `Draft→Approved` with NULL `effective_from` | `EFFECTIVE_FROM_REQUIRED_FOR_APPROVAL` |
| N14 | set_status illegal transition (e.g. `Inactive→Approved`, `Approved→Draft`) | `ILLEGAL_STATUS_TRANSITION` |
| N15 | direct `INSERT/UPDATE/DELETE` as `authenticated` (bypass RPC) | denied (no grant + no policy) |
| N16 | attempt to set `approved_by/at` via `update` | not a parameter — impossible (system-controlled) |
| N17 | direct `INSERT/UPDATE/DELETE` on `service_catalogue` as authenticated | denied (SELECT-only grant; no write policy) |
| N18 | set_status `Approved→Inactive` on a **future-dated** row (`effective_from > current_date`) with `p_effective_to = NULL` | `EFFECTIVE_TO_BEFORE_FROM` (explicit RPC rejection; the stop date is **not** silently moved to `effective_from`) |
| N19 | set_status `Draft→Approved` on a Draft that carries a **non-null proposed `effective_to`** | `EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED` (must clear `effective_to` via `update` first) |
| N20 | `update` an **Approved** row with non-null `p_effective_to` | `EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED` (`effective_to` is set only by governed deactivation) |
| N21 | any path leaving `status='Approved'` with non-null `effective_to` | DB `CHECK` `csa_effective_to_null_when_approved_chk` violation (defence-in-depth behind N19/N20) |
| P1 | happy path: create(Draft) → update → set_status(Approved) → set_status(Inactive) → create again (restart) | success; one live row at a time; history retained. (A Draft carrying a proposed `effective_to` must clear it via `update` before approval.) |

## 7. Confirmation — no client-data migration / no compliance generation (deliverable 9)

**Invariance claim (scoped honestly):** the protected-data guarantees rest on **static no-write
analysis PLUS row-count/element-count invariance** — *not* on count checks alone. Counts detect
additions/removals; they do **not** prove a count-preserving content edit did not happen. The
content guarantee is that the migration **issues no write** against the protected data:

- **Static no-write analysis (migration-level, function bodies excluded):** the only migration-level
  `INSERT`s target `service_catalogue` (the 11-row reference seed) and `audit_event_contract` (4
  events). There is **no** migration-level `INSERT INTO client_service_applicability`, **no**
  `INSERT … SELECT … FROM clients`, **no** read of `clients.services` into applicability, **no**
  `UPDATE/DELETE public.clients`, **no** call to `activate_accounting_service` /
  `generate_client_compliance`, and **no** write to `accounting_tracker` / `financials_tracker` /
  `income_tax_tracker` / `compliance_calendar` / `financial_years`. (Every `clients.services`
  reference is a *read* inside the baseline/postcheck.)
- **Count invariance (SECTION H):** `clients` rows, `clients.services` element total,
  `client_registrations` rows, all tracker/calendar rows, and `audit_log` rows are asserted
  unchanged; `client_service_applicability = 0` rows.
- The RPC `create` INSERT is **VALUES/parameter-driven at runtime** (caller input), not a migration
  data-load and not sourced from `clients.services`.

Static-scan evidence accompanies the review. **No claim is made that content was proven unchanged by
counts alone.**

## 8. Not authorized now

Execution, connection, commit/push, P5 runtime population, P6 compliance generation, P2.2, D4
population, Clean-Start Reset. Legacy `clients.services` disposition remains deferred to the V2
Clean-Start Reset. **DRAFT only.**
