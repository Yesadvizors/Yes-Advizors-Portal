# G-13 — Server-enforced RBAC matrix (live)  [BLOCKED-CREDS]

**Status:** BLOCKED — requires PJ-authorised credentials for each role + T3 live RLS evidence (G-04..G-08).
Frontend-gate map (defence-in-depth only) is in `FRONTEND_GATE_INVENTORY.md`. **Menu-hiding is NOT security.**

**Target:** governing deployment `d95912f`. Every capture records identity row
(`is_admin`, `portal_role`, `is_active`) + observed allow/deny + `Sb-Project-Ref: ogjrwemjefvccpyjwxuo`.
A DENY must be shown to originate **server/DB/Edge-side** (e.g. RLS/permission error, RPC rejection), not
merely a hidden menu.

## Allow / Deny matrix (Acceptance §B)
| Role | ALLOW (expected) | DENY (must be server-enforced) | Identity artifact | Status |
|---|---|---|---|---|
| Admin | all tabs + Firm Overview + Audit Log; client-master/team writes; sensitive RPCs | — | ☐ | pending creds |
| Manager | read all; client-master/team writes | Firm Overview / Audit Log; sensitive audit RPC | ☐ | pending creds |
| Executive | read per scope | writes; admin-only; sensitive RPC | ☐ | pending creds |
| Staff | read per scope | writes; admin-only; sensitive RPC | ☐ | pending creds |
| Viewer | minimal read | writes; admin-only; sensitive RPC | ☐ | pending creds |
| Unauthenticated | Login only | all data + RPC | ☐ | pending creds |

## Negative scenarios (each must be server-denied)
| # | Scenario | Direct probe | Expected server result | Status |
|---|---|---|---|---|
| N1 | Unmapped auth user | sign in, load portal | entry denied (fail-closed `loadUser` + RLS) | ☐ |
| N2 | Inactive member (`is_active=false`) | sign in | entry denied | ☐ |
| N3 | Banned member | sign in | entry denied | ☐ |
| N4 | Wrong-client data read | query another client's rows | RLS denies | ☐ |
| N5 | Direct-route to admin-only tab as non-admin | set `tab=auditlog`/`home` in state | data/RPC denied server-side | ☐ |
| N6 | Direct RPC `get_sensitive_audit_logs` as non-admin | `supabase.rpc(...)` | RPC denies | ☐ |
| N7 | Direct RPC `generate_client_compliance` as non-privileged | `supabase.rpc(...)` | RPC denies / no effect | ☐ |
| N8 | Cross-client `secure-docs` object | `createSignedUrl` on foreign path | storage RLS denies | ☐ |
| N9 | Audit-log read as non-admin | audit query | denied | ☐ |

**Dependency:** N4/N8 depend on T3 confirming RLS+FORCE (G-04) and storage isolation (G-08). This matrix
cannot be closed until those land **and** credentials are authorised. Do not fabricate results.
