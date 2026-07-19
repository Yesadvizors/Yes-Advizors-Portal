# YAV2 Portal V2 — Module 1 — **P5 Service Applicability — Discovery & Design**

**Status: DISCOVERY & DESIGN — PASS WITH NOTES.** The read-only discovery SQL (7 blocks) was
executed by PJ in the authorised V2 SQL Editor (SELECT/WITH only); **no database write, no migration,
no application/database object change**. Executed results are recorded in §2A. Design remains
discovery/design only; implementation requires a separate migration/RPC approval gate.

**Baseline:** branch `ui/redesign-v1` · HEAD `82e35686e1e345e82f3def71a6d8b155710b0caa`.
**Authorised project:** V2/yav2-dev `ogjrwemjefvccpyjwxuo` **only**. V1/Production
`zcszesuvjrryxtigjglt` strictly prohibited.
**Companion read-only evidence file (optional live check):**
`supabase/verification/M1B_P5_service_applicability_discovery_readonly.sql` (aggregate counts +
catalogue/metadata only; every statement SELECT/WITH; zero writes).

---

## 1. Purpose

Design the **per-client service-applicability layer** that makes Module 1 *"Ready for Service
Applicability"*: record **which services apply to each client**, with effective dates, optional
cadence, optional registration linkage, an assigned owner, a controlled status, actor auditability,
and safe concurrency. **Module 1 stops at recording approved service applicability.** It must
**not** generate compliance tracker rows, due dates, overdue status, financial-year obligations,
or calendar entries.

---

## 2. Confirmed existing facts (from repository migrations `0001`–`0018`)

- **No service-applicability table exists.** There is **no** `client_service_applicability` /
  `service_applicability` / `client_services` table in any migration. The only "services" storage
  is the **legacy `public.clients.services jsonb DEFAULT '[]'`** column (0002) — a free-form JSONB
  list, analogous to the legacy `clients.directors` JSONB (D3-confirmed sample/testing data).
- **No service catalogue table/enum.** 0001 defines many domain enums (`gst_frequency_enum`,
  `tds_form_enum`, `roc_filing_type_enum`, `gst_return_type_enum`, `month_enum`, `quarter_enum`,
  `compliance_status_enum`, `portal_role_enum`, …) but **no service-catalogue type**. The reusable
  pattern is a **catalogue table** like `public.entity_type_catalogue` (0015: `code` PK, `label`,
  `sort_order`, `is_active`).
- **Legacy service RPC couples activation to compliance generation.**
  `public.activate_accounting_service(p_client_id uuid, p_start_fy varchar)` (0008, revised 0014)
  is SECURITY DEFINER and **generates accounting compliance across financial years** (clamped via
  `resolve_client_start_fy` / `get_current_fy`). **This is exactly the coupling P5 must supersede**
  — P5 records applicability only; it must not call or extend this RPC.
- **Client key.** `public.clients.id uuid` is the authoritative key (M1-A/D2b convention;
  `clients.client_id text` is a legacy business code). FK pattern: `REFERENCES public.clients(id)
  ON DELETE RESTRICT`.
- **Owner/assignee source.** `public.team` (0002): `id uuid` PK, `name`, `email`, `portal_role
  public.portal_role_enum` (`Admin/Manager/Executive/Staff/Viewer`), `auth_user_id uuid`,
  `is_active`. Owner → `team.id` (with `auth_user_id` linking to the auth user).
- **Registration linkage source.** `public.client_registrations` (0015): `id`, `client_id` FK,
  `reg_type` (`IN_GST/AE_VAT/AE_CT/LICENCE/OTHER`), `jurisdiction`, `reg_number`, `status`
  (`Applied/Active/Suspended/Cancelled`), `effective_from/to`, `is_active`, `row_version`. A
  GST-type service can optionally link to an `IN_GST` registration row.
- **Reusable optimistic-locking + audited write path (D2b, 0017/0018).** Every M1-A/M1-B write is a
  **SECURITY DEFINER RPC** with pinned `search_path`, guards
  `auth.uid()`/`is_active_user()`/`is_admin_or_manager()`, `created_by/updated_by = auth.uid()`,
  **optimistic locking** via `p_expected_row_version` (`UPDATE … WHERE id=? AND
  row_version=?; row_version=row_version+1`; `STALE_ROW_VERSION` vs `ROW_NOT_FOUND`), and an
  **audit emission** `PERFORM public.audit_write_event(event, action, table, id::text, client_id,
  detail)`. Grants: `REVOKE ALL … FROM PUBLIC, anon, service_role; GRANT EXECUTE … TO authenticated`.
  Direct table INSERT/UPDATE/DELETE for `authenticated` is **revoked** (0017/0018 bypass closure) so
  RPCs are the only write path.
- **RLS convention.** M1-A master tables are RLS **enabled + forced**, **Admin/Manager only** for
  SELECT/INSERT/UPDATE, **no DELETE policy**; `entity_type_catalogue` is readable by all active users.
- **Audit infrastructure.** `public.audit_write_event(...)` (0016) + the 6-family event contract;
  `public.audit_log`. New service events would extend this family.
- **Every M1-A table carries** `row_version integer NOT NULL DEFAULT 1`, `created_at/by`,
  `updated_at/by` — the standard optimistic-lock + actor columns to reuse verbatim.

---

## 2A. Executed discovery results (V2/yav2-dev, PJ-run, read-only) — PASS WITH NOTES

All 7 blocks executed read-only (SELECT/WITH) by PJ in the authorised V2 SQL Editor. No write occurred.

**P5-DISC-01 — no pre-existing service structures:** `service_catalogue_exists` **false**;
`client_service_applicability_exists` **false**; `service_applicability_exists` **false**;
`client_services_table_exists` **false**; `PASS_no_preexisting_service_table` **true**. → The
normalized service-applicability layer **does not yet exist**; the design starts clean.

**P5-DISC-02 — RPC landscape:** `service_applicability_named_functions` **0**;
`legacy_activate_accounting_service_present` **true**; `legacy_generate_client_compliance_present`
**2**.
> **NOTE.** These are **legacy compliance-coupled generators** and are **superseded / not reused**
> by P5. The name-only search does **not** prove the absence of a differently-named writer — a
> governed write path is confirmed by repository review.

**P5-DISC-03 — legacy `clients.services` JSONB (counts only):** `clients_all_current` **13**;
`nonempty_services_all_current` **2**; `total_service_elements_all_current` **3**;
`nonempty_services_production_eligible` **2**; `nonempty_services_sample_test_draft_or_inactive`
**0**; `PASS_scope_reconciliation` **true**.
> **NOTE.** Current data remains **PJ-confirmed sample/testing data**; these counts do not represent
> future production. Legacy `clients.services` is **sample/legacy only** — no migration/deletion in P5.

**P5-DISC-04 — owner source (`team`):** `team_all` **7**; `team_active` **6**; `team_with_auth_user`
**7**.
> **NOTE.** Future owner selection must use **active team members only** (`team.is_active = true`).

**P5-DISC-05 — registration linkage source:** `client_registrations` returned **0 rows**. → No live
registration-linkage distribution can yet be validated; linkage design (§4.7) is unaffected but has
no live data to sample.

**P5-DISC-06 — reusable infrastructure:** `entity_type_catalogue_present` **true**;
`is_active_user_present` **true**; `is_admin_or_manager_present` **true**; `audit_write_event_present`
**true**; `client_registrations_present` **true**; `financial_years_present` **true**;
`gen_random_uuid_present` **true**; `client_registrations_id_client_unique_present` **0**.
> **NOTE.** All reuse targets are present. The composite same-client FK (§3.3-C) requires an additive
> `UNIQUE (id, client_id)` on `client_registrations` — **absent today** — to be added by the future
> migration **before** the composite FK.

**P5-DISC-07 — clients metadata:** `clients_count` **13**; `clients_id_type` **uuid**;
`clients_services_type` **jsonb**. → Confirms `clients.id uuid` as the authoritative key.

**Overall P5 discovery/design status: PASS WITH NOTES** — no service-applicability layer exists; all
reusable patterns/infrastructure are present; legacy compliance-coupled generators are superseded and
not reused; legacy `clients.services` is sample/legacy only; the PJ-approved design (§3–§4) remains
valid; implementation requires a **separate migration/RPC approval gate** (incl. the additive
`UNIQUE (id, client_id)`); **no compliance generation is authorized**.

---

## 3. Proposed minimum normalized design (NOT authored — design only)

Two additive tables + a future audited RPC set. **Nothing below is created now.**

### 3.1 `public.service_catalogue` (reference; pattern = `entity_type_catalogue`)
| Column | Type | Notes |
|--------|------|-------|
| `code` | text PK | **PJ-approved codes** (§4); `OTHER` governed per §4.11 |
| `label` | text NOT NULL | display label |
| `default_frequency` | text NULL, `CHECK (default_frequency IS NULL OR default_frequency IN (<vocabulary>))` | per-service default cadence, drawn from the **PJ-approved frequency vocabulary** (§3.3-E) |
| `requires_registration` | boolean NOT NULL DEFAULT false | e.g. `GST` ⇒ links an `IN_GST` registration |
| `sort_order` | integer NOT NULL DEFAULT 0 | |
| `is_active` | boolean NOT NULL DEFAULT true | catalogue-row availability (a reference table, not a per-client lifecycle) |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**PJ-approved catalogue codes (§4.1–4.3):** `ACCOUNTING, GST, TDS, PAYROLL, INCOME_TAX, ROC, LLP,
STATUTORY_AUDIT, TAX_AUDIT, SECRETARIAL, OTHER`. **ROC and LLP are separate codes; STATUTORY_AUDIT and
TAX_AUDIT are separate codes** (PJ-approved). Readable by all active users; write = admin/manager
(seed via migration).

### 3.2 `public.client_service_applicability` (the core layer)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `client_id` | uuid NOT NULL REFERENCES `clients(id)` ON DELETE RESTRICT | authoritative client key |
| `service_code` | text NOT NULL REFERENCES `service_catalogue(code)` | applicable service |
| `effective_from` | date NULL | **PJ-approved (§4.5):** may be NULL in `Draft`; **mandatory before `status` can become `Approved`** |
| `effective_to` | date NULL | optional end; `CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)` |
| `frequency` | text NULL, `CHECK (frequency IS NULL OR frequency IN (<vocabulary>))` | **nullable client-level override**; NULL ⇒ use `service_catalogue.default_frequency` (§3.3-E) |
| `linked_registration_id` | uuid NULL | part of the **composite same-client FK** below |
| `owner_team_id` | uuid NULL REFERENCES `team(id)` | assigned owner = **team-row identity** (§3.3-D) |
| `status` | text NOT NULL DEFAULT `'Draft'` CHECK IN (`'Draft','Approved','Inactive'`) | **single authoritative lifecycle** (§3.3-A) |
| `approved_by` | uuid NULL | auth-user id (§3.3-D); **required when** `status='Approved'`; **retained** if the row later becomes `Inactive` |
| `approved_at` | timestamptz NULL | **required when** `status='Approved'`; **retained** if the row later becomes `Inactive` |
| `notes` | text NULL | non-personal free text |
| `row_version` | integer NOT NULL DEFAULT 1 | **optimistic locking** |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `created_by` | uuid NULL | auth-user id (§3.3-D) |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_by` | uuid NULL | auth-user id (§3.3-D) |

> **No standalone mutable `is_active`** — `status` is the single lifecycle authority (§3.3-A). If a
> boolean is wanted for convenience it is a **generated** column
> `is_active boolean GENERATED ALWAYS AS (status <> 'Inactive') STORED`, which cannot contradict `status`.

**Same-client registration integrity (DB-enforced, §3.3-C):** add `UNIQUE (id, client_id)` to
`public.client_registrations` (additive), then a **composite FK**
`(linked_registration_id, client_id) REFERENCES public.client_registrations (id, client_id)
ON DELETE RESTRICT` — so a linked registration **must belong to the same client**. An unlinked row
(`linked_registration_id IS NULL`) is exempt from the check (composite FK MATCH SIMPLE). **`ON DELETE
RESTRICT` is the approved default** — a linked registration cannot be deleted while any applicability
row references it; a governed applicability update must **unlink or replace** the registration first.
The design does **not** null `client_id` (it is `NOT NULL` and authoritative) and does **not** use a
composite `ON DELETE SET NULL` (which could attempt to null both columns). A column-specific SET-NULL
alternative is **not selected** unless PostgreSQL-version support and exact syntax are separately
verified. Not reliant on UI/RPC validation.

**Effective-date gate (one-way CHECK, PJ-approved §4.5):**
`CHECK (status <> 'Approved' OR effective_from IS NOT NULL)` — `effective_from` may be NULL while
`Draft` but is required for the `Draft→Approved` transition (also enforced in the governed RPC).

**Approval-actor requirement (one-way CHECK — preserves approval lineage):**
`CHECK (status <> 'Approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))`.
This **requires** `approved_by`/`approved_at` when `status='Approved'` but does **not** force them to
be cleared when an Approved row later becomes `Inactive` — so approval evidence is retained. The
governed RPC sets `approved_by = auth.uid()` / `approved_at = now()` on the Draft→Approved
transition, **preserves** the original approval fields when deactivating, and **prohibits**
client-supplied approval actors/timestamps.

**Indexes / uniqueness (§3.3-B):**
- `idx_client_service_applicability_client (client_id)`;
- **partial unique** `client_service_applicability_live_uq (client_id, service_code) WHERE status <> 'Inactive'`
  — at most one **live** (Draft/Approved) applicability per (client, service); `Inactive` history rows
  are excluded, so **stop-and-restart keeps full history** (see §3.3-B).

**RLS:** enabled + forced; Admin/Manager SELECT/INSERT/UPDATE; **no DELETE** — identical to M1-A.

**Write path (FUTURE migration, NOT now):** SECURITY DEFINER RPCs
`service_applicability_create` / `_update` (with `p_expected_row_version`) / `_set_status`, each
guarding `auth.uid()`/`is_active_user()`/`is_admin_or_manager()`, validating `service_code` against
the catalogue, enforcing effective-date/registration/status/frequency rules, bumping `row_version`,
and emitting a new `audit_write_event` family event (`service.applicability.added/updated/approved/
deactivated`). Direct table DML revoked; RPCs the only write path — exactly the D2b model.

### 3.3 Design-issue resolutions (independent-review items A–G)

- **A. Lifecycle consistency.** `status` (`Draft/Approved/Inactive`) is the **single authoritative
  lifecycle**. The standalone mutable `is_active` is **removed**; any convenience boolean is a
  **generated** column derived from `status`, so `status='Inactive' with is_active=true` is
  structurally impossible. `row_version` remains solely for optimistic locking, not lifecycle.
- **B. History & uniqueness.** A client **may stop and later restart** the same service. **Stop** =
  set the live row `status='Inactive'` (+ `effective_to`); it is retained as history. **Restart** =
  insert a **new** applicability row (new `effective_from`). The partial unique
  `(client_id, service_code) WHERE status <> 'Inactive'` permits exactly one live row while allowing
  unlimited `Inactive` history — the uniqueness rule directly supports the chosen history model. (We
  deliberately do **not** reopen the old row: each period is kept as a **historical period record,
  with lifecycle changes captured through audited RPCs** — the row is updated to `Inactive` and
  `effective_to` is set, so the row itself is not immutable; the audit trail records the transition.)
- **C. Registration–client integrity.** Enforced in the **database** by the composite FK
  `(linked_registration_id, client_id) → client_registrations(id, client_id)` **`ON DELETE RESTRICT`**
  (needs an additive `UNIQUE (id, client_id)` on `client_registrations`). A row for client X can never
  reference client Y's registration. `ON DELETE RESTRICT` (not `SET NULL`) is the approved default so
  a delete cannot attempt to null the `NOT NULL` `client_id`; unlinking is a governed applicability
  update performed **before** any registration deletion. Not dependent on UI/RPC checks.
- **D. Actor & owner identity.** **Owner = team-row identity:** `owner_team_id → public.team(id)`.
  **Actors = auth-user identity:** `created_by`, `updated_by`, `approved_by` store the **auth user
  UUID** (`auth.uid()`), matching the M1-A/D2b convention (uuid actor columns, no hard FK into the
  `auth` schema). The **governed mapping** between the two identities already exists as
  `public.team.auth_user_id`; RPCs set actor columns from `auth.uid()` and resolve/authorise team
  ownership through that mapping. Team identity (who owns the work) and auth identity (who performed
  the write) are kept distinct.
- **E. Frequency governance.** **Controlled vocabulary — no free text (PJ-approved §4.4):**
  `MONTHLY, QUARTERLY, HALF_YEARLY, ANNUAL, EVENT_BASED, ONE_TIME, AS_REQUIRED` — enforced by `CHECK`
  on both `service_catalogue.default_frequency` and `client_service_applicability.frequency` (or a
  small `service_frequency_catalogue` reference). `service_catalogue.default_frequency` is the
  **per-service default**; the applicability `frequency` is a **nullable client-level override**
  (NULL ⇒ inherit the default). All cadences are **recorded as metadata only** — storing a frequency
  generates **no** schedule, due date, or compliance row.
- **F. Catalogue (PJ-approved §4.1–4.3).** Codes in §3.1 are **PJ-approved**. **ROC and LLP are
  separate codes**; **STATUTORY_AUDIT and TAX_AUDIT are separate codes** (PJ-approved — no combined
  code). **`OTHER` governance (PJ-approved §4.11):** admin-controlled, **descriptive `notes`
  mandatory**, does **not** auto-carry `requires_registration`, and recurring `OTHER` usages are
  **periodically reviewed for promotion** into first-class catalogue codes — so `OTHER` cannot erode
  normalization or become a dumping ground.
- **G. Compliance boundary (reconfirmed).** Service applicability records **entitlement/scope only**.
  It stores and generates **no** due dates, tracker rows, financial-year obligations, overdue status,
  or calendar entries, and **no** trigger/RPC generates any from a Client Master edit. The legacy
  `activate_accounting_service` and `generate_client_compliance` remain **superseded / not reused**.
  Downstream compliance generation (register P6) will *read* approved applicability in a separate,
  gated phase.

---

## 4. PJ-approved business decisions (P5)

The following P5 business decisions are **PJ-APPROVED**. They fix the design positions above; no P5
open business decision remains for these items. (Authoring of the migration/seed/RPCs is still a
separate, later, reviewed step — see §7.)

1. **Service catalogue — APPROVED:** `ACCOUNTING, GST, TDS, PAYROLL, INCOME_TAX, ROC, LLP,
   STATUTORY_AUDIT, TAX_AUDIT, SECRETARIAL, OTHER`.
2. **ROC and LLP — separate service codes** (not combined).
3. **Statutory Audit and Tax Audit — separate service codes** (`STATUTORY_AUDIT`, `TAX_AUDIT`; not combined).
4. **Frequency vocabulary — APPROVED:** `MONTHLY, QUARTERLY, HALF_YEARLY, ANNUAL, EVENT_BASED,
   ONE_TIME, AS_REQUIRED` (controlled; `CHECK`-enforced; no free text).
5. **`effective_from`** — may be NULL in `Draft`; **mandatory before `status` can become `Approved`**
   (`CHECK (status <> 'Approved' OR effective_from IS NOT NULL)` + governed RPC).
6. **Service history** — stopping sets the current row to `Inactive` and records `effective_to`;
   restarting **creates a new applicability row**; old rows are **not reopened**.
7. **Registration linkage** — mandatory **only** where `service_catalogue.requires_registration=true`;
   same-client linkage **database-enforced** via the composite FK; composite FK uses **`ON DELETE
   RESTRICT`**.
8. **Owner identity** — `owner_team_id REFERENCES public.team(id)`.
9. **Actor identity** — `created_by`, `updated_by`, `approved_by` store `auth.uid()`; the approval
   actor and timestamp are **system-controlled through the governed RPC** (not client-supplied).
10. **Legacy `clients.services` JSONB** — sample/legacy observation only; **no migration and no
    deletion in P5**; disposition deferred to the future V2 Clean-Start Reset.
11. **`OTHER`** — admin-controlled, **descriptive `notes` mandatory**, and periodically reviewed for
    promotion to a formal catalogue code.

---

## 5. Deferred compliance-generation logic (NOT P5)

The following are explicitly **out of P5 scope** and belong to a later, separately-approved
controlled compliance-generation phase (register P6), which will **read** approved applicability:
- financial-year obligation expansion; due dates; overdue/status computation;
- `accounting_tracker` / `financials_tracker` / `income_tax_tracker` row generation;
- `compliance_calendar` entries;
- any reuse/replacement of `activate_accounting_service` / `generate_client_compliance`.
P5 provides the **source of truth** for what applies; generation is a downstream, gated step.

---

## 6. Conflicts & gaps

- **Conflict:** the legacy `activate_accounting_service` conflates activation with generation — P5's
  design deliberately **separates** them; the legacy RPC is left untouched and superseded, not called.
- **Gap:** no service catalogue, no applicability table, no service RPCs, no service audit-event
  codes yet — all to be authored later under review.
- **Resolved (PJ-approved §4):** service catalogue, ROC/LLP + audit splits, frequency vocabulary,
  `effective_from` gating, history model, registration-linkage rule, owner/actor identity, legacy
  JSONB disposition, and `OTHER` governance are all decided; only later authoring remains.
- **Note:** current DB is PJ-confirmed sample/testing data; any live counts (legacy
  `clients.services`, etc.) are sample and must not drive production assumptions.

---

## 7. Actions NOT authorized (this task)

No migration; no table/catalogue/RPC creation; no application-code change; no service-applicability
population; no data modification; no compliance generation; no reuse of `activate_accounting_service`;
no P2.2; no D4 population; no sample-data deletion; no commit/push; no Supabase connection/MCP; no
V1/Production access. **Discovery & design only.**

---

## 8. Recommendation

Adopt the two-table normalized design (§3) reusing the M1-A catalogue + D2b audited/optimistic-lock/
RLS patterns verbatim, with the compliance boundary enforced. Resolve the §4 decisions with PJ, then
(separately, under review) author the additive migration + seed + audited RPCs. **No authoring now.**
