# M1-B P5 — Service Applicability UI: Discovery, Design & Implementation Plan (REVIEW-ONLY)

**Status: REVIEW-ONLY DESIGN. NO application code written; NO SQL executed; NO Supabase/MCP
connection; NO commit/push.** For independent ChatGPT review before any implementation gate is opened.

**Governing state**

| Item | Value |
|------|-------|
| Repository | `D:\Claude\Claude Code\Yes-Advizors-Portal` |
| Branch | `ui/redesign-v1` |
| HEAD | `48b186c14003fef93c4b7208eeb00f051a476b9b` |
| Authorised DB (future execution) | Supabase V2/yav2-dev `ogjrwemjefvccpyjwxuo` ONLY |
| Prohibited DB | V1/Production `zcszesuvjrryxtigjglt` |
| Backend foundation | Migration 0021 schema/RPCs — **EXECUTED / CLOSED PASS** |
| This deliverable | **P5 UI planning only** — implementation NOT authorised |
| P6 compliance generation | NOT STARTED (out of scope) |

---

## 1. Executive summary

Migration 0021 delivered the P5 backend: two tables (`service_catalogue`, `client_service_applicability`),
RLS (enabled + forced), a read-only catalogue, and three SECURITY DEFINER RPCs
(`service_applicability_create`, `service_applicability_update`, `service_applicability_set_status`)
that are the **only** write path. This document plans the frontend that drives those RPCs.

Key grounding facts discovered in the codebase:

- **The stack is JavaScript + JSX (React 18.3, Vite 5, `@supabase/supabase-js` 2.107).** There is **no
  TypeScript** and no build-time type checker. The brief asks for "TypeScript request/response types";
  this plan supplies them **as a design reference** and specifies the **JSDoc `@typedef` equivalents**
  that will actually live in the `.js` code (matching the repo). Introducing TypeScript is a separate,
  larger decision and is **out of scope** here (see §13, OD-6).
- A **read-only Client Master Preview** already exists (P2.1): `src/components/preview/ClientMasterPreview.jsx`
  + `src/components/preview/sections/*` + read layer `src/services/clientMasterReads.js` + role hook
  `src/hooks/useClientMasterRole.js`. It is Admin/Manager-only, keyed strictly on `clients.id` (uuid),
  feature-flagged behind `VITE_P2_PREVIEW`, and mounted from `Clients.jsx`. **This is the correct home
  and template for the Service Applicability UI.**
- Reusable presentational primitives already exist and should be reused: `Card`, `TableView`,
  `ReadSection` (with built-in loading/empty/error states), `Muted`, `Err`, `yesno`, plus the modal
  overlay + `useEscapeKey` pattern.
- Error text is already sanitised centrally by `src/lib/errors.js` (`safeErrorMessage` / `safeErrorDetail`,
  which preserves Postgres codes). The RPC-call convention is `supabase.rpc(name, {p_args}) → {data,error}`.
- The recommendation is a **new write-capable section** (`ServiceApplicabilitySection`) inside the
  existing preview container, plus two modals (form + status), a dedicated read/write service layer, a
  pure logic/validation module, and an error-map module — all gated behind a **new flag `VITE_P5_UI`**
  so it ships dark until approved.

The design honours every 0021 lifecycle rule and routes **all** writes through the three RPCs. It
introduces **no** direct table writes, **no** delete, **no** reopen, and touches **none** of
`clients.services`, `activate_accounting_service`, or `generate_client_compliance`.

---

## 2. Existing frontend findings (Workstream 1 — discovery, no code changed)

### 2.1 Navigation & session shell
- `src/App.jsx`: tab-based SPA, **no router**. Tabs are plain state (`useState('dashboard')`). The
  `user` object is a **`team` row** loaded fail-closed in `loadUser()` (active, email-mapped member
  required). It carries `id`, `name`, `initials`, `color`, `email`, `is_active`, `is_admin` (boolean),
  and `portal_role` (enum). Components receive `user` as a prop.
- Admin-only tabs (`home`, `auditlog`) are gated by `user?.is_admin === true` at the UX layer with the
  server as the real authority — the established pattern to mirror.

### 2.2 Client detail / profile surface
- `src/components/Clients.jsx` is the "Clients Onboarding" tab: a client list + a detail/read card
  (`viewClient`) + the onboarding wizard (`OnboardingWizard`). It **already mounts** the read-only
  Client Master Preview modal:
  ```
  const previewEnabled = previewEntryVisible(import.meta.env.VITE_P2_PREVIEW, user)
  ...
  {previewEnabled && previewClient && (
     <ClientMasterPreview clientId={previewClient.id} clientCode={previewClient.client_id}
        clientName={previewClient.name} user={user} onClose={() => setPreviewClient(null)} />
  )}
  ```
  → **`clients.id` (uuid) is already threaded to the preview** as `clientId`. P5 reuses this exact prop.

### 2.3 Reusable UI patterns (in `src/components/preview/ClientMasterPreview.jsx`)
- `Card({title,count,children})`, `TableView({columns,rows})`, `ReadSection({title,clientId,load,columns,emptyLabel})`.
- `ReadSection` already implements the four states the brief asks for: **loading** (`Muted`), **error**
  (`Err` — "Could not load this section: …"), **empty** (`emptyLabel`), and populated (`TableView`).
- **Permission-denied** pattern: `ClientMasterPreview` renders `S.deny` ("available to Admin and Manager
  roles only") when `!isAdminOrManager`. P5 reuses this verbatim.
- Modal pattern: fixed overlay + `useEscapeKey(onClose)` + click-outside-to-close.
- Other modal precedents for **write** forms with validation/toast feedback: `OnboardingWizard.jsx`,
  `AddTaskModal.jsx`, `FollowUpModal.jsx`, `MarkFiledModal.jsx` (toast at bottom-centre; see `Clients.jsx`
  `pinResetMsg`).

### 2.4 Supabase / RPC integration patterns
- `src/supabase.js`: single shared client (env-only target, no hard-coded ref).
- Read pattern (P2.1): `src/services/clientMasterReads.js` — thin functions returning the PostgREST
  `{data,error}` promise; **no `.rpc()` and no writes** there by design.
- RPC pattern (compliance engine): `src/lib/complianceRunner.js` — `await sb.rpc('name', {p_args})`,
  then `error ? safeErrorDetail(error) : ok`. This is the convention P5 write wrappers will follow.

### 2.5 Role & permission helpers
- `src/lib/clientMaster.js` → `isAdminOrManagerRole(user)` (checks `is_admin===true` OR
  `portal_role ∈ {Admin,Manager}`) — **mirrors server `public.is_admin_or_manager()`**.
- `src/hooks/useClientMasterRole.js` → `{ isAdminOrManager, canWrite }`. In P2.1 `canWrite` is hard
  `false`. **P5 needs a write-aware role hook** (see §6 / §9).

### 2.6 Optimistic-lock / version handling
- `row_version integer` is present on every client-master table and on `client_service_applicability`.
  It is already **displayed** ("Ver") in the preview sections. No write/`p_expected_row_version` flow
  exists yet in the frontend — P5 introduces the **first** optimistic-lock write UX (conflict → reload).

### 2.7 Legacy references — to be avoided by P5 (verified locations)
| Legacy artefact | Where it lives today | P5 rule |
|---|---|---|
| `clients.services` (legacy JSONB chips) | `Clients.jsx:349-353` (display), `OnboardingWizard.jsx` (write of `services` array) | **Do not read, write, migrate, or mirror.** P5 uses only the normalized `client_service_applicability`. |
| `activate_accounting_service` | `src/lib/complianceRunner.js:220`, `financialYear.js` (comment) | **Never called by P5.** |
| `generate_client_compliance` | `src/lib/complianceRunner.js:210-211`, `Clients.jsx` (commented), `compliance.js` | **Never called by P5.** |
- P5 also does **not** touch trackers (`accounting_tracker`, `financials_tracker`, `income_tax_tracker`)
  or `compliance_calendar`. Those belong to P6.

### 2.8 Recommended location for the Service Applicability UI
- **Primary recommendation:** add a new **write-capable section** to the existing
  `ClientMasterPreview` modal — a `ServiceApplicabilitySection` rendered after the read-only sections —
  gated behind a new flag **`VITE_P5_UI`** (independent of `VITE_P2_PREVIEW`). Rationale: the data is
  strictly client-scoped and already keyed on `clients.id` there; the Admin/Manager gate, modal shell,
  and primitives are all reusable; and a separate flag lets P5 ship dark and be enabled per-branch only
  for review (disabled in Production unless and until a separate PJ/ChatGPT Production release approval
  is completed).
- The section owns its own write modals; the surrounding P2.1 sections stay strictly read-only.
- **Alternative considered (not recommended):** a standalone top-level "Service Applicability" tab in
  `App.jsx`. Rejected for now: it would need its own client-picker and would duplicate the client-scope
  context the preview already provides. Can be revisited if P5 later needs a firm-wide cross-client view.

---

## 3. Proposed UI architecture (Workstream 2)

```
Clients tab (Clients.jsx)
  └─ ClientMasterPreview  (existing modal, clientId = clients.id, Admin/Manager gate)
       ├─ [existing read-only P2.1 sections … unchanged]
       └─ ServiceApplicabilitySection            ← NEW (behind VITE_P5_UI)
            ├─ Catalogue reference card           (11 codes, read-only)
            ├─ Live applicability table           (Draft/Approved rows)     ── row actions ▾
            ├─ Inactive history (collapsible)     (Inactive rows, read-only)
            ├─ "Add service (Draft)" button       → ServiceApplicabilityFormModal (create)
            ├─ row action "Edit"   (Draft only)   → ServiceApplicabilityFormModal (edit)
            ├─ row action "Approve"(Draft only)   → ServiceApplicabilityStatusModal (approve)
            └─ row action "Deactivate"(Draft/Appr)→ ServiceApplicabilityStatusModal (deactivate)
```

- **Card/table structure** reuses `Card` + `TableView`. Live rows and history are two tables in the
  same section (history collapsed by default). The catalogue is a compact reference card.
- **Two modals** (both new, both reuse the overlay + `useEscapeKey` pattern):
  - `ServiceApplicabilityFormModal` — create Draft / edit Draft (field form + client-side validation).
  - `ServiceApplicabilityStatusModal` — approve / deactivate (confirmation + the one field each needs).
- **Success feedback** uses the existing bottom-centre toast pattern (green = ok). Because the RPCs emit
  the audit events (`service_applicability.added/updated/approved/deactivated`), the toast copy states
  the audited action, e.g. "Service approved — recorded in the audit log."
- After any successful write, the section **re-reads** its data (see §7 refresh behaviour).

---

## 4. Detailed workflow (Workstream 2)

State machine (enforced by the DB; the UI mirrors it and never invents a transition):

```
        create (RPC)                 set_status Draft→Approved            set_status Approved→Inactive
 (none) ───────────▶  Draft  ─────────────────────────────▶  Approved ─────────────────────────────▶ Inactive
                        │                                                                                  ▲
                        └──────────────── set_status Draft→Inactive ───────────────────────────────────────┘
 Restart: from an Inactive row, "Start again" opens the CREATE modal → a NEW Draft row (never reopens).
```

| # | User action | UI behaviour | RPC |
|---|-------------|--------------|-----|
| 1 | View applicability | Section loads catalogue + rows; splits Live (Draft/Approved) vs Inactive history | reads only |
| 2 | View 11 catalogue entries | Reference card lists code, label, requires-registration, default frequency | read `service_catalogue` |
| 3 | Create Draft | "Add service" → form modal; on submit calls create; new Draft appears | `service_applicability_create` |
| 4 | Edit Draft | Row "Edit" (enabled only when `status==='Draft'`) → form modal prefilled | `service_applicability_update` |
| 5 | Approve Draft | Row "Approve" (Draft only) → status modal; requires `effective_from` set and `effective_to` empty | `service_applicability_set_status`(Approved) |
| 6 | Deactivate | Row "Deactivate" (Draft or Approved) → status modal; collects `effective_to` (stop date) | `service_applicability_set_status`(Inactive) |
| 7 | View Inactive history | Collapsible read-only table; no actions on Inactive rows | reads only |
| 8 | Restart a service | On an Inactive row, "Start again" opens CREATE prefilled with same `service_code` → new Draft | `service_applicability_create` |
| 9 | Prevent delete | **No delete control anywhere.** No RPC exists; not offered. | — |
| 10 | Prevent reopen | Inactive rows expose no Edit/Approve/Deactivate; "Start again" makes a **new** row | — |
| 11 | Optimistic-lock conflict | On `STALE_ROW_VERSION`: show the conflict message, **close the write modal**, refresh authoritative server data, and **require the user to reopen and reapply** the change. **Stale form values are discarded — never re-submitted by silently swapping `row_version`.** | any write |
| 12 | Validation / RPC errors | Inline field errors client-side; RPC errors mapped to friendly text (see §8) | any write |
| 13 | Audit success feedback | Toast naming the audited action | — |

**Approval pre-flight (important UX):** because approval requires `effective_from IS NOT NULL` and
`effective_to IS NULL`, the Approve modal validates both **before** calling the RPC and, if the Draft
still carries an `effective_to`, instructs the user to clear it via Edit first (mirrors DB
`EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED`). To avoid this trap entirely, the **create/edit form does not
expose `effective_to`** — that field is collected **only** in the Deactivate modal (see §5 note).

---

## 5. Field and validation matrix (Workstream 2)

Source of truth: 0021 table `client_service_applicability` + the three RPC signatures. "DB-enforced"
means a CHECK/RPC RAISE guarantees it server-side; "UI-only" means the rule is a client-side convenience
with **no** DB backstop in 0021 (flagged as a risk/open decision).

| Field | Type | Collected where | Editable | Client-side validation | Server backstop |
|-------|------|-----------------|----------|------------------------|-----------------|
| `service_code` | text (FK catalogue) | Create only (dropdown of active catalogue codes) | **Not** editable after create (no `p_service_code` on update; restart = new row) | required; must be an active catalogue code | `SERVICE_CODE_REQUIRED`, `INVALID_OR_INACTIVE_SERVICE_CODE` |
| `frequency` | text/enum or null | Create/Edit (dropdown; default = catalogue `default_frequency`) | Draft only | optional; if set ∈ 7-value vocabulary | `INVALID_FREQUENCY` |
| `effective_from` | date or null | Create/Edit (date) | Draft only | null allowed in Draft; **required before Approve** | `EFFECTIVE_FROM_REQUIRED_FOR_APPROVED` / `…_FOR_APPROVAL`; `csa_effective_from_gate_chk` |
| `effective_to` | date or null | **Deactivate modal only** (stop date) | set by deactivation | must be `≥ effective_from`; must be empty while Approved | `EFFECTIVE_TO_BEFORE_FROM`, `EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED`, `csa_effective_to_null_when_approved_chk`, `csa_dates_chk` |
| `linked_registration_id` | uuid or null | Create/Edit (dropdown of **same-client** registrations) | Draft only | required **iff** catalogue `requires_registration=true`; must be same client | `REGISTRATION_REQUIRED_FOR_SERVICE`, `REGISTRATION_NOT_SAME_CLIENT` + composite FK |
| `owner_team_id` | uuid or null | Create/Edit (dropdown of **active** team) | Draft only | optional; if set must be active team member | `OWNER_NOT_ACTIVE_TEAM_MEMBER` |
| `notes` | text or null | Create/Edit (textarea) | Draft only | **required when `service_code==='OTHER'`** (UI validation, defence-in-depth) | ⚠ **no DB backstop in 0021** → **authoritative backend enforcement mandated via PG-1** before write UI (OD-3); error `OTHER_NOTES_REQUIRED` |
| `status` | Draft/Approved/Inactive | Not a form field — set via actions | via set_status only | UI offers only legal transitions | `INVALID_STATUS`, `ILLEGAL_STATUS_TRANSITION` |
| `row_version` | integer | System; hidden; echoed to update/status | n/a | must be sent with every write | `STALE_ROW_VERSION`, `ID_AND_VERSION_REQUIRED` |
| `created_by` / `updated_by` / `approved_by` | uuid | System (`auth.uid()`) | read-only display | — | system-controlled |
| `created_at` / `updated_at` / `approved_at` | timestamptz | System (`now()`) | read-only display | — | system-controlled |

Lifecycle rules honoured (all from §4/§5): Draft may have null `effective_from`; Approved requires
`effective_from`; Approved must have null `effective_to`; deactivation sets Inactive + `effective_to`;
restart creates a new row; no direct delete; no reopening Inactive; OTHER requires notes (UI validation
now, **authoritative backend enforcement via PG-1 before write UI** — OD-3); registration mandatory only
when `requires_registration=true`; registrations must be same-client.

> **Discovery note (seed reality):** the 11 seeded catalogue rows currently have
> `requires_registration = false` and `default_frequency = NULL` for **all** codes (seed sets only
> `code,label,sort_order`). So today the "registration required" branch is unreachable via seed and no
> default frequency is prefilled. The UI must still read these flags **dynamically** from the catalogue
> (a future governed migration may flip them). Whether any first-pass service should require registration
> is **OD-4**.

---

## 6. Role and permission matrix (Workstream 3)

Backend authority: **every** RPC guards `auth.uid()` + `is_active_user()` + `is_admin_or_manager()`, and
the RLS SELECT policy on both tables is `is_active_user() AND is_admin_or_manager()`. So the backend
grants the **same** capability set to Admin and Manager, and nothing to other roles.

| Capability | Admin | Manager | Other active roles | anon | Enforced by |
|------------|:----:|:------:|:-----------------:|:----:|-------------|
| View applicability / catalogue | ✅ | ✅ | ❌ | ❌ | RLS SELECT (`is_active_user() AND is_admin_or_manager()`) |
| Create Draft | ✅ | ✅ | ❌ | ❌ | `service_applicability_create` guards |
| Edit Draft | ✅ | ✅ | ❌ | ❌ | `service_applicability_update` guards |
| Approve Draft | ✅ | ✅ | ❌ | ❌ | `service_applicability_set_status` guards |
| Deactivate | ✅ | ✅ | ❌ | ❌ | `service_applicability_set_status` guards |
| View Inactive history | ✅ | ✅ | ❌ | ❌ | RLS SELECT |
| Delete / reopen | — | — | — | — | **no RPC exists** |

Frontend mapping:
- Reuse `isAdminOrManagerRole(user)` to decide whether the **section renders at all** (else show the
  existing `S.deny` panel).
- Introduce `useServiceApplicabilityRole(user)` returning `{ canView, canWrite }` where both equal
  `isAdminOrManagerRole(user)` today — a thin, testable wrapper mirroring `useClientMasterRole`.
- **Open decision OD-1:** 0021 does **not** distinguish Manager from Admin for **approval**. If PJ wants
  approval to be Admin-only, that is currently only expressible as a **UI-only** guard (a Manager could
  still call the RPC directly). A true restriction would need a future RPC/policy change. Flagged, not
  assumed.

---

## 7. RPC integration mapping (Workstream 3)

**Only** these three RPCs are used. **No** direct INSERT/UPDATE/DELETE anywhere.

### 7.1 Exact payloads & returns (verbatim from 0021)

```
service_applicability_create(
  p_client_id uuid, p_service_code text, p_effective_from date, p_effective_to date,
  p_frequency text, p_linked_registration_id uuid, p_owner_team_id uuid, p_notes text
) RETURNS jsonb  ->  { id: uuid, row_version: int }      -- always creates status='Draft'

service_applicability_update(
  p_id uuid, p_expected_row_version integer, p_effective_from date, p_effective_to date,
  p_frequency text, p_linked_registration_id uuid, p_owner_team_id uuid, p_notes text
) RETURNS integer  ->  new row_version                    -- field edits only; NOT status; Draft only

service_applicability_set_status(
  p_id uuid, p_expected_row_version integer, p_new_status text, p_effective_to date
) RETURNS integer  ->  new row_version                    -- Draft→Approved | Draft→Inactive | Approved→Inactive
```

Note the UI never sends `effective_to` on create/edit (collected only at deactivation, §5). Create's
`p_effective_to` is always passed `null` from the form.

### 7.2 Payload mapping (form/action → RPC args)

| Action | RPC | Arg mapping |
|--------|-----|-------------|
| Create Draft | create | `p_client_id=clientId`, `p_service_code=form.service_code`, `p_effective_from=form.effective_from||null`, `p_effective_to=null`, `p_frequency=form.frequency||null`, `p_linked_registration_id=form.registration_id||null`, `p_owner_team_id=form.owner_team_id||null`, `p_notes=form.notes||null` |
| Edit Draft | update | `p_id=row.id`, `p_expected_row_version=row.row_version`, then same field mapping as create **minus** `service_code`; `p_effective_to=null` |
| Approve | set_status | `p_id=row.id`, `p_expected_row_version=row.row_version`, `p_new_status='Approved'`, `p_effective_to=null` |
| Deactivate | set_status | `p_id=row.id`, `p_expected_row_version=row.row_version`, `p_new_status='Inactive'`, `p_effective_to=form.effective_to` (defaults to today if left blank; must be ≥ effective_from) |

### 7.3 Types — TypeScript reference (design) + JSDoc equivalent (actual code)

TypeScript reference (documentation only — the repo is JS):
```ts
type Uuid = string; type IsoDate = string; // 'YYYY-MM-DD'
type Frequency = 'MONTHLY'|'QUARTERLY'|'HALF_YEARLY'|'ANNUAL'|'EVENT_BASED'|'ONE_TIME'|'AS_REQUIRED';
type Status = 'Draft'|'Approved'|'Inactive';

interface CreateReq { p_client_id: Uuid; p_service_code: string; p_effective_from: IsoDate|null;
  p_effective_to: null; p_frequency: Frequency|null; p_linked_registration_id: Uuid|null;
  p_owner_team_id: Uuid|null; p_notes: string|null; }
interface CreateRes { id: Uuid; row_version: number; }
interface UpdateReq { p_id: Uuid; p_expected_row_version: number; p_effective_from: IsoDate|null;
  p_effective_to: null; p_frequency: Frequency|null; p_linked_registration_id: Uuid|null;
  p_owner_team_id: Uuid|null; p_notes: string|null; }
type UpdateRes = number; // new row_version
interface SetStatusReq { p_id: Uuid; p_expected_row_version: number; p_new_status: Status;
  p_effective_to: IsoDate|null; }
type SetStatusRes = number; // new row_version
interface ApplicabilityRow { id: Uuid; client_id: Uuid; service_code: string;
  effective_from: IsoDate|null; effective_to: IsoDate|null; frequency: Frequency|null;
  linked_registration_id: Uuid|null; owner_team_id: Uuid|null; status: Status;
  approved_by: Uuid|null; approved_at: string|null; notes: string|null; row_version: number;
  created_at: string; created_by: Uuid|null; updated_at: string; updated_by: Uuid|null; }
interface CatalogueRow { code: string; label: string; requires_registration: boolean;
  default_frequency: Frequency|null; sort_order: number; is_active: boolean; }
```
Actual code equivalent — JSDoc `@typedef` blocks in `src/services/serviceApplicabilityWrites.js` and
`…Reads.js` (so editors get IntelliSense without a TS toolchain).

### 7.4 Query strategy (reads)

| Data | Query | Notes |
|------|-------|-------|
| Catalogue (11) | `from('service_catalogue').select('code,label,requires_registration,default_frequency,sort_order,is_active').eq('is_active',true).order('sort_order')` | read-only; cache per modal open |
| Applicability rows | `from('client_service_applicability').select('<all display cols>').eq('client_id',clientId).order('service_code').order('created_at',{ascending:true})` | split Live vs Inactive client-side |
| Registrations (same-client dropdown) | reuse `readRegistrations(clientId)` from `clientMasterReads.js` | label as `reg_type · reg_number · status`; DB composite FK is the backstop |
| Team members (owner dropdown) | `from('team').select('id,name,portal_role,is_active').eq('is_active',true).order('name')` | only active members (matches `OWNER_NOT_ACTIVE_TEAM_MEMBER`) |

### 7.5 Refresh behaviour after success
- Create/Edit/Approve/Deactivate → on success, close the modal, show toast, and **re-run the
  applicability read** for `clientId` (authoritative `row_version`s from the server). Catalogue/team/
  registration lists are only re-fetched on modal (re-)open.

### 7.6 Missing/invalid registration handling
- If a service needs a registration (`requires_registration=true`) but the client has **no**
  registrations, the create form disables submit and explains: "This service requires a registration;
  none exists for this client yet — add one in Client Master first." (No P5 write can proceed.)
- If the chosen registration is somehow not same-client, the DB rejects with `REGISTRATION_NOT_SAME_CLIENT`
  (mapped in §8) — a backstop; the dropdown only offers same-client rows so this should not occur.

### 7.7 Explicit exclusions (Workstream 3)
No migration/backfill from `clients.services`; no `activate_accounting_service`; no
`generate_client_compliance`; no compliance/tracker/calendar generation; no P6 logic; no V1/Production
change. The P5 UI reads/writes **only** `service_catalogue` (read) and `client_service_applicability`
(via RPC), plus `client_registrations`/`team` (read) for dropdowns.

---

## 8. Error-handling matrix (Workstream 3)

RPCs `RAISE EXCEPTION '<CODE>[: detail]'`; `error.message` carries the code as its leading token. A new
`mapRpcError(error)` extracts the leading `CODE` and maps to friendly copy; unknown codes fall back to
`safeErrorDetail(error)` (keeps the PG code, strips secrets).

| RPC error code | User-facing message | UX handling |
|----------------|---------------------|-------------|
| `NO_AUTH_CONTEXT` | "Your session expired. Please sign in again." | close modal; prompt re-login |
| `NOT_AUTHORISED_INACTIVE` | "Your account is inactive." | close; deny |
| `NOT_AUTHORISED` | "You don't have permission to do this." | close; deny |
| `CLIENT_REQUIRED` / `CLIENT_NOT_FOUND` | "This client could not be found." | close; refresh list |
| `SERVICE_CODE_REQUIRED` | "Select a service." | inline on service field |
| `INVALID_OR_INACTIVE_SERVICE_CODE` | "That service is not available." | inline; refresh catalogue |
| `INVALID_FREQUENCY` | "Choose a valid frequency." | inline on frequency |
| `EFFECTIVE_TO_BEFORE_FROM` | "End date can't be before the start date." | inline on effective_to |
| `EFFECTIVE_FROM_REQUIRED_FOR_APPROVED` / `…_FOR_APPROVAL` | "Set a start date before approving." | inline; keep modal |
| `EFFECTIVE_TO_NOT_ALLOWED_FOR_APPROVED` | "Clear the end date before approving (Edit the draft first)." | inline; guide to Edit |
| `OWNER_NOT_ACTIVE_TEAM_MEMBER` | "Choose an active team member as owner." | inline on owner |
| `REGISTRATION_REQUIRED_FOR_SERVICE` | "This service needs a linked registration." | inline on registration |
| `REGISTRATION_NOT_SAME_CLIENT` | "That registration belongs to another client." | inline; refresh dropdown |
| `ID_AND_VERSION_REQUIRED` | "Something went wrong; please reload." | reload row |
| `ROW_NOT_FOUND` | "This record no longer exists." | close; refresh |
| `ROW_INACTIVE_NOT_EDITABLE` | "Inactive records can't be edited. Use 'Start again' to add a new one." | close; refresh |
| `INVALID_STATUS` / `ILLEGAL_STATUS_TRANSITION` | "That change isn't allowed from the current status." | close; refresh |
| `STALE_ROW_VERSION` | "This record changed since you opened it. Your unsaved changes were not applied — please reopen and try again." | **close the modal; refresh authoritative data; require reopen + reapply. Do NOT keep stale form values or silently swap row_version.** |
| _fallback_ | `safeErrorDetail(error)` (sanitised + PG code) | inline/toast |

---

## 9. Proposed implementation files (Workstream 4)

**New files**
| File | Purpose |
|------|---------|
| `src/services/serviceApplicabilityReads.js` | reads: catalogue, applicability rows, team list; reuse `readRegistrations` from clientMasterReads |
| `src/services/serviceApplicabilityWrites.js` | the **only** RPC wrappers: `createApplicability`, `updateApplicability`, `setApplicabilityStatus`; JSDoc typedefs |
| `src/lib/serviceApplicability.js` | pure, testable logic: lifecycle predicates (`canEdit`, `canApprove`, `canDeactivate`, `isLive`), form validation, payload builders, OTHER-notes rule |
| `src/lib/serviceApplicabilityErrors.js` | `mapRpcError(error)` code→message map (+ fallback to `safeErrorDetail`) |
| `src/hooks/useServiceApplicabilityRole.js` | `{ canView, canWrite }` (mirrors `useClientMasterRole`) |
| `src/hooks/useServiceApplicabilityData.js` | load/refresh catalogue + rows + dropdown sources for a `clientId` |
| `src/components/preview/sections/ServiceApplicabilitySection.jsx` | the section: catalogue card, live table, history table, action wiring |
| `src/components/preview/sections/ServiceApplicabilityFormModal.jsx` | create/edit Draft form + client-side validation |
| `src/components/preview/sections/ServiceApplicabilityStatusModal.jsx` | approve / deactivate confirmation + the one field each needs |
| `tests/serviceApplicability.logic.test.js` | node:test for `lib/serviceApplicability.js` |
| `tests/serviceApplicabilityErrors.test.js` | node:test for the error map |
| `tests/serviceApplicabilityPayload.test.js` | node:test for payload builders (create/update/set_status arg mapping) |

**Modified files (minimal, additive)**
| File | Change |
|------|--------|
| `src/components/preview/ClientMasterPreview.jsx` | render `<ServiceApplicabilitySection clientId user />` after the read-only sections, behind `VITE_P5_UI`; export any shared primitive still needed |
| `src/lib/clientMaster.js` (or a new `p5.js`) | add `p5UiVisible(flagValue, user)` mirroring `previewEntryVisible` (flag `VITE_P5_UI` + Admin/Manager) |
| _(no change to `Clients.jsx` required)_ | the preview is already mounted with `clientId`; the new section lives inside it |

**Reusable components/hooks** already present: `Card`, `TableView`, `Muted`, `Err`, `yesno`, `dash`,
`useEscapeKey`, `safeErrorMessage/Detail`, `isAdminOrManagerRole`. No new runtime dependency is required.

---

## 10. Testing plan (Workstream 4)

Harness: existing `npm test` → `node --test` (node:test). The repo's tests are **pure-logic** tests
(no jsdom/RTL). The plan concentrates coverage in pure modules (high value, matches convention) and
treats DOM-render component testing as an explicit dependency decision (OD-5).

| Area | Test | Type |
|------|------|------|
| Lifecycle predicates | `canEdit` true only for Draft; `canApprove` true only for Draft; `canDeactivate` true for Draft/Approved; false for Inactive | logic |
| Draft→Approved | payload builder sends `p_new_status='Approved'`, `p_effective_to=null`; guard requires `effective_from` set | logic |
| Approved→Inactive | builder sends `Inactive` + `effective_to`; rejects `effective_to < effective_from` | logic |
| Restart | "Start again" builds a **create** payload (new row) with same `service_code`; never a status change on the Inactive row | logic |
| Registration-required validation | when catalogue `requires_registration=true` and no registration chosen → validation error; disabled submit when client has none | logic |
| OTHER-notes validation | `service_code==='OTHER'` with empty/blank notes → UI validation error (defence-in-depth); the **authoritative** rejection is the backend `OTHER_NOTES_REQUIRED` added by PG-1, mapped in the error map | logic |
| Optimistic-lock conflict | `mapRpcError('STALE_ROW_VERSION')` → conflict message; handler flagged **"close modal + refresh + require reopen"**; test asserts stale form values are **discarded** (no auto-resubmit, no silent `row_version` swap) | logic |
| RPC error mapping | every code in §8 maps to its message; unknown → `safeErrorDetail` fallback; secrets stripped | logic |
| No direct table writes | static test: `serviceApplicabilityWrites.js` contains only `.rpc(` calls and no `.insert/.update/.delete/.upsert`; reads module has no `.rpc(`/writes | static/lint-style |
| No delete/reopen | no code path builds a delete; no transition into Draft/Approved from Inactive | logic |
| No compliance generation | static test: P5 modules never reference `generate_client_compliance` / `activate_accounting_service` / trackers / `compliance_calendar` / `clients.services` | static |
| Role/permission | `useServiceApplicabilityRole`: Admin/Manager → canWrite true; others/inactive → false; section hidden when not Admin/Manager | logic |
| Regression | full existing suite stays green (currently ~179 tests); `npm run build` clean | suite/build |

Acceptance gates for the test phase: **all** new logic tests pass; existing suite unchanged and green;
`vite build` succeeds; static guards prove RPC-only writes and no legacy coupling.

---

## 11. Acceptance criteria (Workstream 4)

1. Admin/Manager can view catalogue + applicability; non-Admin/Manager see the deny panel; anon never
   reaches it.
2. Full lifecycle works **only** through the three RPCs: create Draft → edit Draft → approve →
   deactivate; restart makes a new Draft row; Inactive rows are read-only.
3. All 0021 lifecycle rules hold end-to-end (null-from in Draft; from required before Approved; to null
   while Approved; deactivation sets Inactive+to; same-client registration; registration required only
   where flagged; OTHER requires notes — enforced authoritatively in the backend via PG-1 before write
   UI is enabled, with UI validation as defence-in-depth).
4. Optimistic-lock conflicts (`STALE_ROW_VERSION`) **close the write modal, refresh authoritative data,
   and require the user to reopen and reapply** the change — stale form values are discarded; there is
   **never** a silent overwrite or an auto-resubmit with a swapped `row_version`.
5. Every RPC error code maps to friendly copy; unknown errors fall back safely (secrets stripped).
6. **Zero** direct table writes; **zero** delete/reopen paths; **zero** references to
   `clients.services` / `activate_accounting_service` / `generate_client_compliance` / trackers /
   calendar; **no** P6 logic.
7. Feature is dark by default (`VITE_P5_UI` unset) and enabled per-branch only for review; it is
   **disabled in Production unless and until a separate PJ/ChatGPT Production release approval is
   completed**. Current Production deployment remains unauthorized.
8. Existing test suite green; new logic tests green; `vite build` clean.
9. No V1/Production interaction of any kind.

---

## 12. Explicit exclusions

- No migration/backfill/copy/mirror of `clients.services` (legacy JSONB stays untouched; disposition
  remains the future V2 Clean-Start Reset).
- No `activate_accounting_service`, no `generate_client_compliance`, no compliance tracker / FY / due-date
  / calendar generation (that is **P6**, NOT STARTED).
- No direct INSERT/UPDATE/DELETE against `service_catalogue` or `client_service_applicability`.
- No delete and no reopen of Inactive rows.
- No catalogue editing UI (0021 catalogue is fail-closed read-only; changes need a separate governed
  migration).
- No change to Migration 0021, any SQL file, or any backend object.
- No V1/Production access; no Production merge or deploy; no P6.

---

## 13. Risks and open decisions

| ID | Risk / open decision | Recommendation |
|----|----------------------|----------------|
| OD-1 | 0021 does not distinguish Manager vs Admin for **approval**. | **DECIDED (approved):** Admin and Manager retain **identical** capabilities, matching Migration 0021. No Admin-only approval restriction is introduced (would require a future policy/RPC change, not planned). |
| OD-2 | Stack is **JavaScript**, but the brief asked for TS types. | Ship JSDoc `@typedef`s (IntelliSense, no toolchain). Provide TS as design reference only. Adopting TS is a separate, larger migration (see OD-6). |
| OD-3 | **OTHER-requires-notes** is **not** DB-enforced by 0021 (UI-only). | **DECIDED (approved):** UI-only enforcement is **insufficient**. Authoritative **backend** enforcement is **mandatory before P5 write UI is enabled** — a separate governed corrective migration (see PG-1 below). UI validation is defence-in-depth, not the authority. |
| OD-4 | Seed sets `requires_registration=false` and `default_frequency=NULL` for **all** 11 codes. | **DECIDED (approved):** for the **first release**, all catalogue rows remain `requires_registration=false` and `default_frequency=NULL`; any change requires a **separate governed migration** (not this UI). The UI still reads the flags dynamically so it needs no change when they later change. |
| OD-5 | No jsdom/RTL in the repo → no DOM-level component tests today. | **DECIDED (approved):** retain **node:test** pure-logic/static tests; **no jsdom/RTL dependency** in this phase. |
| OD-6 | Introducing TypeScript project-wide. | **DECIDED (approved):** remain **JavaScript/JSX with JSDoc typedefs**; **no TypeScript migration** in this phase. |
| R-1 | `client_registrations` currently has **0 rows** (discovery). | Registration dropdowns will be empty until Client Master registrations exist; only matters if a service becomes `requires_registration=true` (none today). No blocker. |
| R-2 | Legacy `clients.services` chips still render in `Clients.jsx`. | Leave as-is (out of scope). Optionally add a later note that normalized applicability supersedes it — not part of P5 UI. |
| R-3 | Feature-flag drift (P2 vs P5). | Use a **distinct** `VITE_P5_UI` flag; document that it is **disabled in Production unless and until a separate PJ/ChatGPT Production release approval is completed** (enabled per-branch only for review). |

**Open decisions are now closed (approved by review):** OD-1, OD-3, OD-4, OD-5 and OD-6 are all
**DECIDED** as recorded in the table above. The only remaining sequencing constraint is **PG-1** (below):
the OTHER-notes backend correction must be designed, reviewed, executed and verified **before** the P5
write UI (CP-5) is enabled. Read-only UI work (CP-1…CP-4) may proceed independently. No P6 work starts.

### 13.1 Prerequisite gate PG-1 — OTHER-notes backend enforcement (must precede write UI)

Because OD-3 is decided as **backend-authoritative**, a separate **governed corrective migration** is a
**hard prerequisite** for enabling P5 create/edit writes (CP-5). It is **NOT authored or executed by this
plan** — it is recorded here as a gate to be run under the same three-party governance as 0021
(PJ executes; ChatGPT reviews; Claude authors on approval).

**PG-1 corrective backend design (to be authored later, separately):**
- **create RPC** (`service_applicability_create`) rejects `service_code='OTHER'` when `notes` is NULL or
  blank (after trim) with error code **`OTHER_NOTES_REQUIRED`**.
- **update RPC** (`service_applicability_update`) applies the same rejection for `OTHER` rows with
  NULL/blank notes.
- **table-level constraint where safely possible** — a CHECK such as
  `CHECK (service_code <> 'OTHER' OR (notes IS NOT NULL AND btrim(notes) <> ''))` as a fail-closed
  backstop, **provided** it is safe against existing rows (the table is empty post-0021, so it is safe to
  add; confirm 0 rows at execution time).
- **exact error code:** `OTHER_NOTES_REQUIRED` (added to the §8 error matrix once PG-1 is approved).
- **post-execution verification** (read-only): asserts the CHECK/guards exist and that a probe of the
  RPC guard behaviour is covered; asserts **0 client applicability rows created** and **no compliance
  generation** (trackers/calendar/`clients.services` unchanged), mirroring the 0021 verification
  discipline.
- **no client rows populated; no compliance generation; no V1/Production change.**

**Gate rule:** CP-5 (create/edit write UI) **must not be enabled** until PG-1 is EXECUTED / CLOSED PASS
on V2/yav2-dev. The UI's OTHER-notes validation remains as defence-in-depth but is **not** the authority.

**No blocking unknowns remain for planning.** CP-1…CP-4 (pure logic + read-only UI) can start on
approval of this plan; CP-5/CP-6 (writes) are gated on PG-1.

---

## 14. Recommended implementation checkpoints (small, reviewable commits)

Each checkpoint is independently reviewable and leaves the app shippable. The **feature flag `VITE_P5_UI`
stays off** until PJ enables it per-branch for review; it is **disabled in Production unless and until a
separate PJ/ChatGPT Production release approval is completed**.

**Ordering rule (approved):** the **OTHER-notes backend correction (PG-1)** must be **separately
designed, reviewed, executed and verified** on V2/yav2-dev **before** CP-5 (create/edit writes) is
enabled. **Read-only UI work (CP-1…CP-4) may proceed independently** of PG-1. **No P6 work starts** at
any point in this sequence.

| CP | Scope | Reviewable artefact | Tests |
|----|-------|---------------------|-------|
| **CP-0** | This plan approved. Decisions **closed**: OD-1 (Admin=Manager), OD-3 (OTHER-notes backend enforcement mandatory before write UI → PG-1), OD-4 (all catalogue rows `requires_registration=false`/`default_frequency=NULL` for first release), OD-5 (node:test only, no jsdom/RTL), OD-6 (JS/JSX + JSDoc, no TS). | (decisions recorded) | — |
| **CP-1** | Pure logic + error map + payload builders (`lib/serviceApplicability.js`, `lib/serviceApplicabilityErrors.js`) | 3 test files, no UI | `node --test` green |
| **CP-2** | Read/write service layer (`services/*Reads.js`, `services/*Writes.js`) with JSDoc typedefs; static "RPC-only / no legacy" guards. *(Authoring the write wrappers is allowed; they are not wired into a write UI until CP-5, which is PG-1-gated.)* | modules + static tests | green + static guards |
| **CP-3** | Role hook + data hook (`hooks/useServiceApplicabilityRole.js`, `…Data.js`) | hooks + tests | green |
| **CP-4** | `ServiceApplicabilitySection` (read views: catalogue card, live table, history) behind `VITE_P5_UI`; **no writes yet** | section render, read-only | build clean; suite green — **CLOSED PASS (2026-07-20)** |
| **PG-1** | **PREREQUISITE BACKEND GATE (separate governed migration = 0022).** OTHER-notes authoritative enforcement (create/update RPC reject + table CHECK `csa_other_notes_required_chk`; error `OTHER_NOTES_REQUIRED`; read-only post-exec verification; 0 client rows; no compliance generation). Authored/reviewed/executed/verified under 0021-style governance. **Must be EXECUTED / CLOSED PASS before CP-5.** | migration + rollback + verification (separate package) | post-exec verification PASS — **EXECUTED / CLOSED PASS (Migration 0022, V2/yav2-dev, 2026-07-21; committed `6a96b3d`; pre 14/14 + post 15/15 PASS; see `docs/M1B_P5_PG1_Execution_Evidence.md`). CP-5 now UNBLOCKED for separate authorisation (not started).** |
| **CP-5** | *(PG-1 CLOSED)* Form modal (create/edit Draft) wired to create/update; validation + error mapping (incl. `OTHER_NOTES_REQUIRED`) | modal + flows | green — **IMPLEMENTED / CORRECTED — AWAITING FINAL CHATGPT REVIEW AND PJ RUNTIME VERIFICATION (2026-07-21; see `docs/M1B_P5_UI_CP5_CP6_CP7_Closure.md`)** |
| **CP-6** | *(PG-1 CLOSED)* Status modal (approve/deactivate) + optimistic-lock conflict UX (**close modal + refresh + require reopen**) + toasts + refresh; "Start again" (restart → new Draft) | modal + flows | green — **IMPLEMENTED / CORRECTED — AWAITING FINAL CHATGPT REVIEW AND PJ RUNTIME VERIFICATION (2026-07-21)** |
| **CP-7** | End-to-end polish, WAI-ARIA modal focus management, safe async writes, empty/error/loading/success states, regression sweep, `vite build` | final diff | full suite + build — **IMPLEMENTED / CORRECTED (2026-07-21; 322/322 tests, build clean; live runtime verification by PJ still pending; P5/Module 1 NOT yet CLOSED PASS)** |

Splitting this way keeps each commit small, keeps writes isolated to CP-5/CP-6, gates those on the PG-1
backend correction, and lets review verify the RPC-only boundary before any write UI lands. Read-only
checkpoints (CP-1…CP-4) are not blocked by PG-1. No P6 work is included in any checkpoint.

### CP-4 closure record (2026-07-20) — CLOSED PASS

CP-4 (read-only `ServiceApplicabilitySection`) is **CLOSED PASS** at commit
`f9f2eb3989811c50c32fec65be78f2df41281721` (branch `ui/redesign-v1`, in sync with origin) following
**corrected local runtime verification** approved by PJ.

- **Corrected verification procedure:** local Vite dev server started with **process-scoped**
  `VITE_P2_PREVIEW=true` and `VITE_P5_UI=true` (no `.env.local` / no file change) at
  `http://localhost:5173/`; logged in as an active Admin (existing session); Clients → open a client
  detail → the **"Client Master (Preview)"** button appeared (proves the `VITE_P2_PREVIEW` gate) → the
  read-only **Client Master Preview** modal opened → **Service Applicability rendered after
  Relationships** (proves the `VITE_P5_UI` gate).
- **Verified results:** live **empty state** ("No active service applicability records are configured for
  this client.") for **YA-008** and **YA-011**; **Refresh** re-read completed with no error; **read-only**
  confirmed — only a Refresh control, **no** create/edit/delete/approve/activate/deactivate controls;
  **no** browser-console, React, or Supabase read errors; service-applicability unit suite **57/57 pass**.
- **Earlier not-visible observation (resolved):** the section is rendered only inside the
  `VITE_P2_PREVIEW`-gated preview modal; the first check set only `VITE_P5_UI` and viewed the normal
  client-detail page whose final section is Documents.
- **Non-blocking residuals (do NOT block CP-4):** populated active-record and history/inactive runtime
  states were unavailable (no existing rows in V2; data creation out of scope); the non-Admin
  hidden-state was not runtime-exercised — all three remain covered by the passing unit tests.
- **Governance:** documentation-only; no source/test/SQL/migration/env/config change; no Supabase/MCP; no
  SQL; no database mutation; V1/Production untouched; not committed/pushed by this step. **CP-5 remains
  NOT AUTHORISED** (gated on PG-1 EXECUTED / CLOSED PASS).

---

## Governance boundary of this document

Preparing this plan: changed **no** application code, changed/executed **no** SQL, opened **no**
Supabase/MCP connection, made **no** commit or push, and did **not** touch V1/Production. Migration 0021
is unchanged. P5 UI implementation is **not** started — it remains gated on approval of this plan.
