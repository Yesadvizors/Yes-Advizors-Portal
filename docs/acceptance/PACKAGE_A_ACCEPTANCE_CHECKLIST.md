# YAV2 — Package A Acceptance Checklist

**Source:** verification/evidence content preserved from draft PR #28 (`docs/YAV2_Package_A_Remaining_Verification_Plan.md`, commit `bc6da5e`).
**Superseded (removed):** the sequential *Package A-1 → Package A-2 → Package A closure → later recovery* process. This file is now **acceptance criteria only**, consumed by the Modified Hybrid YAV2 Recovery terminals. It is not a process document.

**Runtime target for all runtime tests:** `https://yes-advizors-portal-v2-preview-git-4c8764-yes-advizors-projects.vercel.app` (governing `d95912f`). **Do NOT** use the stale clean alias. All evidence records `Sb-Project-Ref: ogjrwemjefvccpyjwxuo` (no V1).

## A. Runtime acceptance criteria (per-tab SPA) — Gap G-12
Each tab must load without console/DB error on the governing deployment; evidence = screenshot + console + Network.

| Tab | Pass criterion | Login/role |
|---|---|---|
| `dashboard` (`v_firm_dashboard`) | valid data, `due_in_7_days`, no 42703, V2 target | any active — **already [V] (I-26)** |
| `home` (Firm Overview) | renders for admin; hidden + guarded for non-admin | Admin vs non-admin |
| `tasks` | list loads, no error | active |
| `clients` (Onboarding) | list + wizard load; `scan-document` behaviour observed | active |
| `compliance` | trackers load; `generate_client_compliance` behaves; no `due_soon` | active |
| `documents` | `secure-docs` list/download; per-client scoping | active + 2nd client |
| `team` | list loads; edit gated Admin/Manager | multi-role |
| `usage` (API Usage) | renders | active |
| `auditlog` | renders for admin; **blocked** non-admin (server denies) | Admin vs non-admin |
| `ChatAgent` (`ai-agent`) | invoke behaviour + deployed-or-not observed | active |
| Unauthenticated | redirect to Login; no data/RPC | none |

## B. Auth/RBAC test criteria — Gap G-13 (server/Edge-enforced, not menu-hiding)
Roles = `portal_role_enum` `('Admin','Manager','Executive','Staff','Viewer')` + unauthenticated. Admin-only: `home`, `auditlog`. Write predicate: `is_admin_or_manager()`.

| Role | ALLOW | DENY | Evidence |
|---|---|---|---|
| Admin | all tabs + Firm Overview + Audit Log; client-master/team writes; sensitive RPCs | — | identity row (`is_admin`,`portal_role`,`is_active`) + menus + RPC success |
| Manager | read all; client-master/team writes | Firm Overview/Audit Log; sensitive audit RPC | per-scenario capture |
| Executive | read per scope | writes; admin-only; sensitive RPC | per-scenario |
| Staff | read per scope | writes; admin-only; sensitive RPC | per-scenario |
| Viewer | minimal read | writes; admin-only; sensitive RPC | per-scenario |
| Unauthenticated | Login only | all data + RPC | direct-route + direct-RPC deny |

**Negative scenarios (each server-denied):** unmapped user; inactive; banned; wrong-client; direct-route to admin-only tab; direct RPC (`generate_client_compliance`, `get_sensitive_audit_logs`) as non-privileged; cross-client `secure-docs`; audit-log read as non-admin.

## C. Supabase reconciliation criteria — Gaps G-02..G-08, G-11
Via the read-only A4 script `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` on **V2 only**. Pass = full Part 1 output + all Part 2 probes captured (incl. "does not exist" as findings), reconciled to source:
- [ ] Schemas/tables/columns/constraints/indexes/enums (§1–5) reconciled.
- [ ] Views/matviews (§6) — `v_firm_dashboard` **[V]**; others reconciled.
- [ ] Functions security/owner/`search_path` (§7) — S3 gate.
- [ ] Triggers (§8).
- [ ] Expected-object existence `0001–0022` (§9b); ledger `schema_migrations` gaps `0012/0013/0019/0020` explained (Part2 §9).
- [ ] RLS enabled + FORCE + policies + grants + function-execute (§10) — S2/S5 gates.
- [ ] Storage policies `secure-docs` (§13/§13c) — S5 gate.
- [ ] Auth/team mapping counts/status (Part2 §11) — S4 gate input.
- [ ] Audit objects/functions (§15).

## D. Vercel criteria — Gap G-14
- [ ] Build config (framework/build/output) evidenced (redacted; source `framework:null`, Vite via `vercel.json`).
- [ ] Presence/scope of **all six** env vars; complete the three not yet observed (`VITE_SUPABASE_FUNCTIONS_URL`, `VITE_DOCS_BUCKET`, `VITE_P5_UI`); FUNCTIONS_URL V2-target confirmed. Never reveal secret values.
- [ ] Clean-alias state recorded (remediation = separate PJ Vercel gate, G-15).

## E. Edge / integration evidence criteria — Gaps G-09, G-10, G-17
- [ ] Edge deployment list for `ai-agent`, `extract-financial`, `scan-document` (dashboard/CLI, Part2 §14).
- [ ] Edge source recovery status recorded (versioned-in-governing or gap, G-09).
- [ ] n8n workflow export + WhatsApp config/screens captured, or explicit BLK (G-17).

## Evidence format
Every item: artifact (screenshot/text output) + source anchor + Gap ID + timestamp + `Sb-Project-Ref` where runtime. Frontend behaviour alone never satisfies a security gate (see `docs/recovery/SECURITY_BASELINE.md`).
