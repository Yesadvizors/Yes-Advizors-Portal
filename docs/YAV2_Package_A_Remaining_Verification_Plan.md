# YAV2 — Package A Remaining Verification Plan

**Governing Issue:** #23 — Complete Historical Recovery, Consolidation & Live Alignment
**Governing merged PR:** #27
**Governing HEAD:** `bbdf1ba1c611d61850662d5b042c5632c1f2ac43` (`origin/ui/redesign-v1`)
**Package A status:** PARTIAL — MERGED EVIDENCE UPDATE (this document plans the remaining verification)
**Document type:** Documentation-only planning. **No** source/SQL/migration/runtime/database/deployment/alias/Edge/n8n/WhatsApp change is proposed or performed here.
**Prepared by:** Claude Code (read-only repository + merged-evidence analysis)

> This plan is a permanent GitHub review object for independent ChatGPT review. Every factual claim below is grounded in the governing tree at `bbdf1ba` (merged Package A evidence document `docs/YAV2_Package_A_Historical_Evidence_And_Live_State_Discovery.md`) and the repository source/migrations, verified read-only.

---

## 0. Current verified Package A state

| Item | Verified value | Basis |
|---|---|---|
| Governing merged PR | **#27** (supersedes #26; #26 / `d95912f` are now historical, not current) | GitHub — PR #27 MERGED |
| PR #27 merge commit | `bbdf1ba1c611d61850662d5b042c5632c1f2ac43` | GitHub |
| Governing HEAD (`origin/ui/redesign-v1`) | `bbdf1ba1c611d61850662d5b042c5632c1f2ac43` | `git rev-parse origin/ui/redesign-v1` — MATCH |
| `d95912f → bbdf1ba` delta | **docs-only** (only the Package A evidence doc); **no app-source / DB change** | `git diff --name-only d95912f bbdf1ba` |
| Runtime deployment to test | `https://yes-advizors-portal-v2-preview-git-4c8764-yes-advizors-projects.vercel.app` (commit `d95912f`; representative for `bbdf1ba` because the delta is docs-only) | A3.1 + delta check |
| Clean Vercel alias | `https://yes-advizors-portal-v2-preview.vercel.app` — **STALE / MISASSIGNED**; must NOT be used (serves a non-governing bundle → `v_firm_dashboard.due_soon` PostgreSQL 42703) | A3.1 (I-26) |
| A4 read-only discovery script | **PRESENT**: `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` (SELECT-only) | governing tree |
| Edge Function source | **No `supabase/functions/*` in governing** (unversioned) | `git ls-tree origin/ui/redesign-v1` |
| Migration files present | `0001–0011, 0014–0018, 0021, 0022` | `ls supabase/migrations` |
| Migration files **absent** | `0012, 0013, 0019, 0020` (0012 secure-docs live-only; 0019 D3 backfill never assigned — per A8 I-20/I-21; 0013/0020 numbering gaps) | `ls supabase/migrations` |

### Verified implementation facts (source, at governing HEAD)
- The portal is a **single-page tabbed application** — one deployment URL, tabs switch **client-side** (`src/App.jsx`). It is **not** a multi-route app. "Page-by-page" therefore means **per-tab**.
- **Tabs:** `home` (Firm Overview, **admin-only**), `dashboard`, `tasks`, `clients` (Clients Onboarding), `compliance`, `documents`, `team`, `usage` (API Usage), `auditlog` (**admin-only**); plus `Login` (unauthenticated) and always-mounted `ChatAgent`.
- **Role model:** `team.portal_role` enum **`('Admin','Manager','Executive','Staff','Viewer')`** (`0001_extensions_and_enums.sql:56`) + `is_admin` boolean + `is_active` (`0002_tables_people_and_clients.sql`). UI admin gate = `user.is_admin === true` (`App.jsx:112,121,155,164`); write gate = server `public.is_admin_or_manager()` = `portal_role IN ('Admin','Manager')` (mirrored in `src/lib/clientMaster.js`). Server role resolution via `get_app_role()` / `get_app_role_for_user` (`0008`).
- **SECURITY DEFINER** functions exist across many migrations (e.g. `0008`×10, `0017`×27, `0016`×10) → `search_path`/owner/grant audit required.
- **Referenced Edge Functions (unversioned in governing):** `ai-agent` (`ChatAgent.jsx`), `extract-financial` (`Compliance.jsx`), `scan-document` (`OnboardingWizard`/Clients), plus `dkyc-verify-upload` (historical branch only).
- **Storage:** `secure-docs` bucket (private; per-client path separation to be confirmed live).

### Already-VERIFIED item
- **I-26 — Firm dashboard runtime:** on the governing deployment (`d95912f`, generated `-git-4c8764-…` URL), `v_firm_dashboard` returns valid data with `due_in_7_days` (no `due_soon` 42703), targeting authorised Supabase V2 `ogjrwemjefvccpyjwxuo` (Network `Sb-Project-Ref`; no V1). Source ↔ migration `0009` ↔ live V2 DB ↔ governing deployment are aligned on `due_in_7_days`. The **clean alias variance is verified** as a Vercel alias/promotion issue only — **not** a source/migration/live-DB defect. (Remediation is a separate authorisation — see §8.)

---

## 1. Verified / partially-verified / unverified item matrix

Classification legend:
**[V]** already verified · **[C-RO]** read-only Claude-verifiable (no mutation) · **[PJ]** PJ manual evidence required · **[SA]** separate live-action approval required · **[BLK]** blocked / unavailable to Claude.

| ID | Item | Current status | Class |
|---|---|---|---|
| I-26 | Firm dashboard (`v_firm_dashboard`) runtime + alias variance | **VERIFIED** (deploy) / alias stale-verified | **[V]** (fix = **[SA]**) |
| I-01–I-03 | Auth admin/manager/staff login | source present; live pending | **[PJ]** |
| I-04 | Auth ↔ `team` mapping | DB unverified | **[PJ]** (A4 §11) |
| I-05 | RBAC menu/route/action | admin gate present in source; multi-role live pending | **[V]** (source) / **[PJ]** (live) |
| I-06 | Client restrictions (RLS) | DB unverified | **[PJ]** (A4 §10) |
| I-07 | Client Master + preview (`VITE_P2_PREVIEW`) | config unverified | **[PJ]** |
| I-08 | Service Applicability (`VITE_P5_UI`) | config unverified | **[PJ]** |
| I-09 | Onboarding (`scan-document`) | live pending | **[PJ]** |
| I-10 | Tasks | live pending | **[PJ]** |
| I-11 | Compliance / `generate_client_compliance` | live pending | **[PJ]** |
| I-12 | Documents / `secure-docs` | live pending | **[PJ]** |
| I-13 | Team | live pending | **[PJ]** |
| I-14 | Dashboards/reports (views) | DB unverified (except I-26) | **[PJ]** |
| I-15 | Audit logs / `get_sensitive_audit_logs` | DB unverified | **[PJ]** |
| I-16 | Customer assessment / Director-KYC | missing from governing / historical-branch | **[SA]** (Pkg E) |
| I-17 | WhatsApp PIN/automation | UI only; runtime unverified | **[PJ]** / **[BLK]** (Pkg G) |
| I-18 | Edge Functions (ai-agent/extract-financial/scan-document) | source missing from governing; deploy unverified | **[PJ]** (deploy) / **[SA]** (source recovery, Pkg B/E) |
| I-19 | Migrations `0001–0022` execution | DB unverified | **[PJ]** (A4 §9) |
| I-20 | `0012` secure-docs (executed live, absent file) | provenance gap | **[PJ]** |
| I-21 | `0019` D3 backfill (never assigned) | provenance gap | **[PJ]** |
| I-22 | RLS & privileges | DB unverified | **[PJ]** (A4 §10) |
| I-23 | Functions/triggers/views | DB unverified | **[PJ]** (A4 §7/8) |
| ENV | Env-var evidence | observed only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_P2_PREVIEW`; **NOT observed:** `VITE_SUPABASE_FUNCTIONS_URL`, `VITE_DOCS_BUCKET`, `VITE_P5_UI` | **[PJ]** |
| VER | Vercel build config (`framework:null`) | unverified | **[PJ]** |
| I-24 | phase4c audit DB set | superseded | — |
| I-25 | Local-only Rev10 P6 / ZIPs | out of scope / review only | — |

---

## 2. Page-by-page (per-tab) runtime verification plan

**Deployment to use:** `https://yes-advizors-portal-v2-preview-git-4c8764-yes-advizors-projects.vercel.app` (governing `d95912f`; representative for `bbdf1ba`). **Do NOT** use the stale clean alias. **Login required** for all authenticated tabs. Evidence = screenshot + browser console + Network tab (confirm `Sb-Project-Ref: ogjrwemjefvccpyjwxuo`, no V1).

| Tab / surface | Expected result | Evidence required | Login / role | Class |
|---|---|---|---|---|
| `dashboard` (`v_firm_dashboard`) | valid data, `due_in_7_days`, no 42703, V2 target | screenshot + Network `Sb-Project-Ref` | any active user | **[V]** (re-affirm) |
| `home` (Firm Overview) | renders for admin; hidden + component-guarded for non-admin | screenshot admin **and** non-admin | Admin vs non-admin | **[PJ]** |
| `tasks` | list loads; no console/DB error | screenshot + console | active user | **[PJ]** |
| `clients` (Onboarding) | list + wizard load; `scan-document` call behaviour observed | screenshot + Network | active user | **[PJ]** |
| `compliance` | trackers load; `generate_client_compliance` RPC behaves; no `due_soon` | screenshot + Network | active user | **[PJ]** |
| `documents` | `secure-docs` list/download; per-client scoping holds | screenshot + Network + cross-client attempt | active user + second client | **[PJ]** |
| `team` | list loads; edit controls gated to Admin/Manager | screenshot admin + staff | multi-role | **[PJ]** |
| `usage` (API Usage) | renders | screenshot | active user | **[PJ]** |
| `auditlog` | renders for admin; **blocked** for non-admin (server `get_sensitive_audit_logs` denies) | screenshot both + Network deny | Admin vs non-admin | **[PJ]** |
| `ChatAgent` (`ai-agent`) | invocation behaviour + deployed-or-not observed | Network + response | active user | **[PJ]** |
| Unauthenticated load | redirect to Login; no data, no RPC | screenshot | none | **[PJ]** |

---

## 3. Per-role Auth/RBAC verification plan

Enforcement must be **DB/Edge-side** (frontend menu-hiding is not security). Roles map to `portal_role_enum`. Admin-only surfaces (source-verified): `home` (Firm Overview) and `auditlog`. Write predicate: `is_admin_or_manager()` (Admin/Manager).

| Role | Expected ALLOW | Expected DENY | Evidence required | Class |
|---|---|---|---|---|
| **Admin** | all tabs incl. Firm Overview + Audit Log; client-master/team writes; sensitive audit RPC | — | login + identity row (`is_admin`,`portal_role`,`is_active`) + visible menus + RPC success | **[PJ]** |
| **Manager** | read all; client-master/team writes | Firm Overview / Audit Log; sensitive audit RPC | per-scenario capture | **[PJ]** |
| **Executive** | read per scope | writes; admin-only tabs; sensitive RPC | per-scenario capture | **[PJ]** |
| **Staff** | read per scope | writes; admin-only tabs; sensitive RPC | per-scenario capture | **[PJ]** |
| **Viewer** | minimal read | writes; admin-only tabs; sensitive RPC | per-scenario capture | **[PJ]** |
| **Unauthenticated** | Login page only | all data + RPC | direct-route + direct-RPC deny capture | **[PJ]** |

**Negative scenarios (each must be server-denied):** unmapped authenticated user; inactive user; banned user; wrong-client access; direct-route access to an admin-only tab; direct RPC (`generate_client_compliance`, `get_sensitive_audit_logs`) as non-privileged; cross-client `secure-docs` access; audit-log read as non-admin.

---

## 4. Supabase V2 verification plan (schema / RLS / functions / storage / Auth / Edge)

**Method:** PJ executes the PRESENT read-only script `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` on **V2 (`ogjrwemjefvccpyjwxuo`) only — never V1**. Part 1 is wrapped `BEGIN; SET TRANSACTION READ ONLY; … COMMIT;`, uses only `pg_catalog`/`information_schema`; Part 2 probes are SELECT-only, "does not exist" errors captured as findings. Claude then reconciles output vs source read-only (no mutation).

| Object class | A4 section | Reconciliation target | Class |
|---|---|---|---|
| Schemas / tables / columns / constraints / indexes / enums | Part 1 §1–5 | expected set from `0001–0022` | **[PJ]** run + **[C-RO]** reconcile |
| Views / matviews | §6 | `v_firm_dashboard` (I-26 [V]), `v_client_compliance_summary`, reports | **[PJ]** / **[V]** (firm dashboard) |
| Functions: security / owner / `search_path` (SECURITY DEFINER audit) | §7 | all definers incl. `get_app_role*`, `is_admin_or_manager`, CRUD RPCs (`0017`) | **[PJ]** run + **[C-RO]** reconcile |
| Triggers | §8 | audit/lineage triggers (`0016`) | **[PJ]** |
| Expected-object existence `0001–0022` | §9b | note `0012/0013/0019/0020` gaps | **[PJ]** |
| Migration ledger `supabase_migrations.schema_migrations` | Part 2 §9 | reconcile absent `0012/0013/0019/0020` provenance | **[PJ]** |
| RLS enabled + **FORCE** + policies + grants + function-execute | §10 | per-table RLS/FORCE; client-separation policies (I-06/I-22) | **[PJ]** run + **[C-RO]** reconcile |
| Storage policies (`secure-docs`) | §13c/§13 | private bucket, per-client path, signed-URL expiry, storage RLS | **[PJ]** |
| Auth-user / `team` mapping (counts/status only) | Part 2 §11 | I-04 mapping | **[PJ]** |
| Edge deployment names (dashboard/CLI) | Part 2 §14 | ai-agent / extract-financial / scan-document deploy state | **[PJ]** |
| Audit objects / functions | §15 | `AuditLog`, `get_sensitive_audit_logs`, `_write_read_audit` | **[PJ]** |

---

## 5. Vercel / n8n / WhatsApp evidence plan

| Item | Evidence required | Class |
|---|---|---|
| Vercel build config | framework/build/output settings (redacted screenshot; source shows `framework:null`, Vite via `vercel.json`) | **[PJ]** |
| Env-var completion | presence/scope for the **three not yet observed** — `VITE_SUPABASE_FUNCTIONS_URL`, `VITE_DOCS_BUCKET`, `VITE_P5_UI` — plus V2-target confirmation for FUNCTIONS_URL (redacted; **never** secret values) | **[PJ]** |
| Stale clean alias | reassign alias → `d95912f` | **[SA]** (NOT authorised here) |
| n8n | workspace/workflow name·ID·active·webhook·credentials·Supabase target·PIN/session flow·retries·idempotency·failure·logging·version-export·V1 refs | **[PJ]** export / **[BLK]** for Claude (external, unversioned) |
| WhatsApp | PIN/session/provider configuration + screen evidence | **[PJ]** / **[BLK]** for Claude |

---

## 6. PJ manual-evidence checklist

- [ ] V2 project-ref confirmation screenshot (`ogjrwemjefvccpyjwxuo`) before trusting any SQL output; STOP if not V2.
- [ ] A4 **Part 1** full output (all sections).
- [ ] A4 **Part 2** all probe outputs (including any "does not exist" errors).
- [ ] Approved existing test accounts for **Admin, Manager, Executive, Staff, Viewer** (Claude creates none) + one inactive/unmapped account for negatives.
- [ ] Per-role: login result, resolved identity (`team` row: `is_admin`, `portal_role`, `is_active`), visible menus/tabs, allowed vs denied actions, client scope.
- [ ] Negative-scenario denials (server/Edge-enforced).
- [ ] Per-tab runtime screenshots + console + Network (`Sb-Project-Ref`) on the generated governing URL.
- [ ] Vercel: framework/build/output + presence/scope of **all six** env vars (redacted; complete the three not yet observed).
- [ ] Edge deployment list (dashboard/CLI) for ai-agent / extract-financial / scan-document.
- [ ] n8n workflow export + WhatsApp configuration/screens (or explicit BLK statement).

---

## 7. Exact 48-hour execution sequence

Columns: **Step · Task · Executor · Environment · Mutation risk · Evidence required · Completion criterion · Approval gate.** Every step is **non-mutating**.

| # | Task | Executor | Environment | Mutation risk | Evidence required | Completion criterion | Approval gate |
|---|---|---|---|---|---|---|---|
| 1 | Confirm V2 project ref `ogjrwemjefvccpyjwxuo` | PJ | Supabase V2 dashboard | **none** (read) | project-ref screenshot | ref matches; STOP if not V2 | Standing (A4 §0) |
| 2 | Run A4 **Part 1** read-only script; capture full output | PJ | Supabase V2 SQL editor | **none** (SELECT-only, `READ ONLY`) | full Part 1 text output | all sections returned | Standing (A4) |
| 3 | Run A4 **Part 2** optional probes | PJ | Supabase V2 | **none** (SELECT; errors=findings) | each probe output incl. "does not exist" | all probes captured | Standing |
| 4 | Reconcile #2/#3 vs source (RLS/FORCE, policies, grants, SECURITY DEFINER `search_path`, ledger gaps `0012/0013/0019/0020`, views) | Claude | local read-only | **none** | draft reconciliation register (no commit) | every A4 section mapped to a finding | Read-only planning |
| 5 | Re-confirm firm-dashboard on generated governing URL | PJ | `-git-4c8764-…` deploy | **none** (read flow) | screenshot + Network `Sb-Project-Ref` | `due_in_7_days`, no 42703, V2 | Standing (re-affirm I-26) |
| 6 | Page-by-page runtime capture — **Admin**, all tabs | PJ | generated governing URL | **none** | per-tab screenshots + console + Network | all tabs load; anomalies noted | **[PJ]** creds |
| 7 | RBAC capture — Manager, Executive, Staff, Viewer, unauthenticated | PJ | generated governing URL | **none** | per-role identity row + allow/deny matrix | each role recorded | **[PJ]** creds |
| 8 | Negative-scenario capture | PJ | generated governing URL | **none** | deny evidence per scenario (server/Edge-enforced) | all negatives denied server-side | **[PJ]** creds |
| 9 | Vercel config + full env-var presence/scope (redacted) | PJ | Vercel dashboard | **none** | redacted screenshots (framework/build/output + all 6 vars) | all source-required vars accounted | **[PJ]** |
| 10 | Edge deployment state (ai-agent, extract-financial, scan-document) | PJ | Supabase dashboard/CLI | **none** (list) | deployed-function list | deploy state known per function | **[PJ]** |
| 11 | n8n + WhatsApp inventory/export | PJ | external | **none** (export) | workflow export/screens | inventory captured or marked BLK | **[PJ]** |
| 12 | Consolidate all into updated A-registers; classify each I-item V/PJ/SA/BLK | Claude | local read-only | **none** | draft register (no commit until PJ authorises a PR) | every I-01…I-26 evidence-backed | Planning; PR only on PJ authorisation |

*No step mutates DB, source, alias, Edge, n8n, or starts Package B. Alias remediation, Edge deployment, and any SQL DML are explicitly excluded.*

---

## 8. Mandatory vs deferrable Package A items

**Mandatory to CLOSE Package A:**
- A4 Part 1 + Part 2 output and Claude reconciliation (schema, views, RLS/FORCE, policies, grants, SECURITY DEFINER `search_path`, migration ledger incl. `0012/0013/0019/0020`, audit objects).
- Per-role Auth/RBAC live evidence including negative scenarios.
- Page-by-page runtime for all tabs.
- `secure-docs` per-client enforcement.
- Vercel env-var completion for the three unobserved vars.

**Deferrable to later packages (NOT required to close Package A):**
- Edge Function **source recovery / redeploy** (Package B/E).
- n8n / WhatsApp integration alignment (Package G).
- dKYC historical-branch feature (Package E).
- **Clean-alias remediation** (separate Vercel gate) — the variance is *verified* now (I-26); only its *fix* is deferred.
- Missing-from-governing feature reconstruction (Package E).

---

## 9. Separate-authorisation items (explicitly NOT authorised by this plan)

- **[SA]** Vercel clean-alias reassignment → `d95912f`.
- **[SA]** Any migration execution / DDL / DML on V2.
- **[SA]** Edge Function (re)deployment / source recovery to governing.
- **[SA]** n8n / WhatsApp changes.
- **[SA]** Package B and beyond.

---

## 10. Blockers

- **[BLK-1]** No in-session approved **test-account credentials** → all runtime/RBAC (Steps 5–8) are PJ-executed.
- **[BLK-2]** Connected Supabase MCP reaches only **prohibited V1**; Claude must not execute SQL on V2 → A4 is PJ-run.
- **[BLK-3]** **n8n / WhatsApp** external and unversioned; no confirmed safe Claude access → PJ export only.
- **[BLK-4]** **Edge Function source** absent from governing; deployment state unverifiable by Claude read-only → PJ dashboard/CLI.
- **[BLK-5]** Vercel **build settings** (`framework:null`) and 3 env vars not exposed to any read-only API → PJ redacted evidence.
- None of these block the recommended next package (§11).

---

## 11. Recommended smallest next authorised read-only work package

**Package A-1 — V2 Read-Only Structural Reconciliation (Steps 1–4 only).**

Rationale: the **single largest verification gain with zero live-mutation risk**. The A4 script already exists and is SELECT-only; Steps 1–4 close the bulk of `DATABASE UNVERIFIED` items (I-04, I-06, I-14, I-15, I-19–I-23: schema, views, RLS/FORCE, policies, grants, SECURITY DEFINER `search_path`, migration-ledger gaps, audit objects). It requires only PJ SQL execution + Claude read-only reconciliation — **no credentials, no runtime, no alias/Edge/n8n, no Package B**. Runtime + RBAC (Steps 5–8) then form **Package A-2** once approved test accounts are available.

---

## Governance footer

```
Governing Issue: #23
Governing merged PR: #27
Governing HEAD: bbdf1ba1c611d61850662d5b042c5632c1f2ac43
Independent ChatGPT review (PR #27): COMPLETED — FINAL PASS
Package A status: PARTIAL — REMAINING VERIFICATION PLAN UNDER REVIEW
Package B: NOT AUTHORISED
Deployment/Alias change: NOT AUTHORISED
SQL/Database action: NOT AUTHORISED
```
