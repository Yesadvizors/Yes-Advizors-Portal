# G-13 — Frontend RBAC gate inventory  [DONE-STATIC]

**Gap:** G-13 (App/RBAC). **Acceptance:** Package A §B. **Commit:** `1286a29` · **Date:** 2026-07-24.

> **THIS IS NOT A SECURITY PROOF.** Per SECURITY_BASELINE §8 (S4): *frontend hiding is NOT security.*
> This file inventories the **frontend** gates as a **defence-in-depth UX map** and, for each, names the
> **server enforcement point** that actually secures it. Every server point below is **EVIDENCE-PENDING**
> (T3 live RLS/grants + credential-gated runtime negatives) and is **BLOCKED** in this block. The RBAC
> allow/deny matrix that closes G-13 is `RBAC_MATRIX_TEMPLATE.md` — **BLOCKED-CREDS**.

## Role model (source-verified)
`team.portal_role` enum `('Admin','Manager','Executive','Staff','Viewer')` + `is_admin` boolean + `is_active`
(migrations `0001`/`0002`). Frontend admin gate = `is_admin === true` (strict). Write predicate mirrors server
`public.is_admin_or_manager()` = `portal_role IN ('Admin','Manager')`.

## A. Frontend gates present (source anchors + the server point each relies on)
| # | Frontend gate | Source anchor | Relies on server enforcement | Server status |
|---|---|---|---|---|
| 1 | Portal entry fail-closed: only `is_active` mapped `team` member; else `signOut()` | `App.jsx:38-52` (`.eq('is_active', true)`, `signOut()` on `!member`) | Auth ↔ `team` mapping + RLS on `team` | EVIDENCE-PENDING (G-07/G-04) |
| 2 | `home` (Firm Overview) tab hidden unless `is_admin === true` | `App.jsx:112` | Firm-overview views/RPC deny non-admin at DB | EVIDENCE-PENDING (G-04/G-13) |
| 3 | `home` mount double-guard `is_admin === true` | `App.jsx:155` | (as #2) | EVIDENCE-PENDING |
| 4 | `auditlog` tab hidden unless `is_admin === true` | `App.jsx:121-123` | `get_sensitive_audit_logs` denies non-admin server-side | EVIDENCE-PENDING (G-13/S4) |
| 5 | `auditlog` mount double-guard `is_admin === true` | `App.jsx:164` | (as #4) | EVIDENCE-PENDING |
| 6 | Write affordances gated by `isAdminOrManagerRole` (mirrors `is_admin_or_manager()`) | `src/lib/clientMaster.js:24-29`; `src/hooks/useClientMasterRole.js`; `useServiceApplicabilityRole.js` | `is_admin_or_manager()` enforced in RPCs / RLS | EVIDENCE-PENDING (G-04/G-05) |
| 7 | Sensitive RPC call sites (admin surfaces) | `AuditLog.jsx:344,364` (`get_sensitive_audit_logs`); `complianceRunner.js:211` (`generate_client_compliance`) | RPC `SECURITY DEFINER` + role check server-side | EVIDENCE-PENDING (G-06/G-13) |
| 8 | Storage reads via time-boxed signed URLs (600 s), private bucket | `DocumentsHub.jsx:121,132`; `DocumentManager.jsx:97` (`createSignedUrl(..., 600)`); bucket `secure-docs` | `secure-docs` private + per-client storage RLS | EVIDENCE-PENDING (G-08/S5) |

**Honesty note (verified in source):** the frontend role helpers explicitly document that they *mirror* the
server predicate and assume **no** un-verified field — e.g. `clientMaster.js:21-22`:
*"Mirrors the server-side public.is_admin_or_manager() … No assumed field."* The gates do not fabricate
authority; they defer to the server.

## B. What is proven vs pending
- **Proven (static):** the frontend gates listed above **exist**, use **strict** `is_admin === true`, are
  **double-guarded** for admin tabs, and **fail closed** on entry. Locked by `tests/appShellRuntime.test.js`
  R3–R5 (admin-tab gate + mount re-check + fail-closed `loadUser`).
- **Pending (BLOCKED):** every corresponding **server** allow/deny — RLS/FORCE, grants, definer `search_path`,
  RPC role checks, storage isolation — is **unverified live** and requires T3 evidence (G-04..G-08) plus
  PJ-authorised runtime negatives (`RBAC_MATRIX_TEMPLATE.md`). **No security gate is marked satisfied here.**

## C. Negative scenarios owed at runtime (server-denied — Acceptance §B)
Unmapped user · inactive · banned · wrong-client · direct-route to admin-only tab · direct RPC
(`generate_client_compliance`, `get_sensitive_audit_logs`) as non-privileged · cross-client `secure-docs` ·
audit-log read as non-admin. All BLOCKED-CREDS; captured in `RBAC_MATRIX_TEMPLATE.md`.
