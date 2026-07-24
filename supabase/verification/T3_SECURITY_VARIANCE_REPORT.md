# T3 — Security Variance Report (source-derived)

**Owner:** TERMINAL 3 — Supabase & Security · **Branch:** `sync/supabase-security`
**Gaps:** G-04 (RLS/FORCE), G-05 (grants), G-06 (definer search_path), G-07 (auth/team), G-08 (storage), G-10 (edge deploy).
**Basis:** static read of authored migrations (AUTHORED NOT APPLIED). **No SQL executed. No V1 access.**
**Governing HEAD:** `1286a290f5d4287e70c6853d2eb3bad16256e276`.

## Purpose
State the security posture provable **from source today**, the **variances/risks** found in source, and
exactly which claims can only be closed with live V2 evidence (A4). Every gate is evaluated against the
five gates in `docs/recovery/SECURITY_BASELINE.md`. **No finding here weakens any gate** — the corrections
proposed all *tighten or preserve* security, and none is applied (proposals only).

## Gate scorecard (source lens)

| Gate | Source verdict | Live verdict | Blocking evidence |
|---|---|---|---|
| **S1 — V2-only** | **PASS (source)** — no V1 ref anywhere in `supabase/**`; guard `scripts/verify-supabase-ref.mjs` fail-closed | n/a (static) | — (adoption = G-20, T1) |
| **S2 — RLS+FORCE** | **PARTIAL** — RLS authored on all app tables; **FORCE only on audit_* + M1-A + P5** | **UNVERIFIED** | A4 §10/§10b (G-04) |
| **S3 — Definer search_path** | **PASS (source)** — 34/34 functions pin `search_path` | **UNVERIFIED** | A4 §7 (G-06) |
| **S4 — Server-side RBAC** | **PASS (source)** — sensitive RPCs enforce role internally; RLS role-scoped | **UNVERIFIED** | A4 §7/§10 + runtime negatives (G-13, T2) |
| **S5 — Storage isolation** | **INDETERMINATE** — buckets/policies deferred in source (`0012` live-only) | **UNVERIFIED** | A4 §13/§13c (G-08) |

## S1 — V2-only boundary — PASS (source)
- `git grep` for the prohibited V1 ref `zcszesuvjrryxtigjglt` across `supabase/**` and `scripts/**`
  returns it **only** as an explicitly-labelled *prohibited / blocklisted* value — inside the guard
  (`scripts/verify-supabase-ref.mjs`) and inside "DO NOT RUN HERE / PROHIBITED" header comments of some
  migrations and verification scripts. **No file uses it as a connection target, project ref, or default.**
  No migration/verification/function embeds a live project ref. `src/supabase.js` throws on missing env,
  no V1 fallback (`BASELINE.md`).
- **No variance.** Adoption of the guard into CI is a build-config change owned by T1 (G-20).

## S2 — RLS + FORCE RLS — PARTIAL (variance found)

**Authored posture:**
- `0006` **ENABLE**s RLS on 20 operational tables; `0007` enables the 5 dependency tables; `0015`/`0021`
  enable + **FORCE** the 9 M1-A + 2 P5 tables; `0005` **FORCE**s the 3 audit tables.
- **FORCE ROW LEVEL SECURITY appears in only 3 files:** `0005`, `0015`, `0021` (verified by `grep`).

**Variance V-1 (design characteristic, not a defect):** the **20 operational + 5 dependency tables are
ENABLE-only, not FORCE.** Consequence: the **table owner bypasses RLS** on those tables (an ENABLE-only
table does not apply RLS to its owner). This is acceptable *iff* the owner role is not used for
application data access.

> **What FORCE RLS does and does not do (accurate):**
> - `FORCE ROW LEVEL SECURITY` makes RLS apply to the **table owner** as well — it closes the
>   owner-bypass path only.
> - It does **NOT** stop roles that hold the `BYPASSRLS` attribute. **Supabase `service_role` has
>   `BYPASSRLS`**, so `service_role` bypasses RLS on **every** table **regardless of whether FORCE is
>   set** — FORCE gives no protection against it.
> - FORCE therefore also does **nothing** to mitigate **exposure or misuse of the `service_role`
>   credential**: anything holding that key reads/writes all tables. `service_role` isolation is a
>   **secret-handling / key-scoping** control (keep the service-role key server/Edge-only, never in the
>   browser; the SPA uses the anon key), **not** an RLS/FORCE control.

**Recommendation (tightening, deferred to a live gate):** consider `FORCE RLS` on the operational tables
so a mis-scoped **owner** path cannot bypass RLS. This does **not** address `service_role` — that remains
governed solely by keeping the service-role secret out of untrusted contexts. **Not applied** — flagged
for the S2 live gate.

**Variance V-2 (load-bearing ordering):** `0006` alone installs `FOR ALL TO authenticated USING (true)
WITH CHECK (true)` on all 20 tables (`0006_rls_policies.sql:29`). `0010` **drops** each
`<table>_authenticated_all` (`0010:85`) before applying the refined role model. **If the live DB has `0006`
applied but not `0010`, every authenticated user has full read/write on all operational data.** A4 §10b
must confirm **no `*_authenticated_all` policy still exists live** — its presence is a **critical S2 failure**.

**Variance V-3 (deferred, documented as OQ-2):** there is **no row-level tenant/client scoping** in any
policy — scoping is purely role-based (Admin/Manager broad; Executive scoped writes; Staff task-only;
Viewer read-only). This is intended (single-firm internal tool). Row-level "own-assignment" scoping
(`assigned_to = auth.uid()`) is **not expressible** because operational tables store actor as `text`, and is
explicitly deferred. **No cross-*client* leakage risk** (single firm), but any future multi-tenant use would
require this. Recorded, not a gate failure for the current model.

**Audit tables:** `audit_log`, `audit_event_contract`, `audit_ingestion_failures` are FORCE RLS with **no
permissive policy** → **default-deny**; access only via SECURITY DEFINER RPCs. This is correct and tight.

## S3 — SECURITY DEFINER search_path — PASS (source)
- **34/34** functions set an explicit `SET search_path` (verified across `0008/0016/0017`; `0018` defines
  no functions). 32 are SECURITY DEFINER; all 32 pin `search_path`. **No unpinned definer exists.**
- **Variance V-4 (hardening — safety is conditional, verify before waving):** definers use three pin
  values — `'pg_catalog','public','pg_temp'` (most), `'public','pg_temp'`, and **bare `'public'`**
  (`get_portal_role`, `is_active_user`, `is_admin_or_manager`). Bare `'public'` omits `pg_catalog`/`pg_temp`.
  **A pinned `search_path` is NOT categorically injection-safe.** Fixing the search_path removes the
  *caller-controlled* path attack, but a bare `'public'` pin is only safe **on the condition** that
  untrusted roles cannot create or replace objects (functions, operators, types) in the `public` schema
  to **shadow** what the function resolves. If `anon`/`authenticated`/PUBLIC hold `CREATE` on `public`,
  a bare-`'public'` definer can resolve an attacker-planted object. Putting `pg_catalog` first (so
  built-ins resolve ahead of `public`) is the stricter, condition-independent convention.
  **Recommendation (tightening):** normalise the 3 bare-`'public'` helpers to
  `'pg_catalog','public','pg_temp'`, **and** verify `public`-schema CREATE privileges (evidence request
  Step 3 item 5). If anon/PUBLIC can CREATE in `public`, this is a **confirmed** variance, not a nuance.
  **Not applied** — proposal for T1 review; the repin requires a live `CREATE OR REPLACE` (SQL,
  PJ-authorised), out of scope for this sprint.
- **Live confirmation still required:** A4 §7 must show every live function's `proconfig` pins search_path
  (a function created/altered live outside these migrations could be unpinned).

## S4 — Server-side RBAC — PASS (source)
- `get_sensitive_audit_logs` enforces `auth.uid()` non-null **and** `get_app_role() = 'admin'` internally,
  with fail-closed read-audit before/after — frontend hiding is not relied upon. `audit_write_event` is
  `REVOKE ALL FROM PUBLIC, anon, authenticated, service_role` (callable only via definer chain).
- All 22 client-master CRUD RPCs embed `is_admin_or_manager() IS DISTINCT FROM TRUE` → fail-closed
  (NULL-safe) and are the **only** write path (0017/0018 revoke direct INSERT/UPDATE/DELETE from
  `authenticated`). RLS role model (0010/0015/0021) restricts PII (`client_directors`, `client_financials`)
  to Executive+; Viewer is read-only everywhere.
- **Variance V-5 (grant-default latent risk):** `0015` documents a **standing schema-wide
  `ALTER DEFAULT PRIVILEGES` that auto-grants EXECUTE on *future* functions to `anon`** unless each
  migration explicitly revokes; additionally, PostgreSQL's **built-in default** grants EXECUTE on a new
  function to **PUBLIC** when `proacl` is left NULL. The CRUD migrations mitigate by always
  `REVOKE ALL FROM PUBLIC, anon`, **but any function added live without that revoke would be
  anon- or PUBLIC-executable.** A4 §10d/§7 must enumerate live EXECUTE grants — **the check must detect
  `PUBLIC`, which is grantee OID `0` in the ACL (there is no `pg_roles` row named `public`); an inner
  join to `pg_roles` silently drops PUBLIC rows.** Use the corrected LEFT-JOIN query with explicit OID-0
  mapping in `T3_PJ_EVIDENCE_REQUEST.md` Step 3 item 2. **Reconciliation is allowlist-based:** each
  returned row is matched to the approved allowlist (extension utilities such as `pgcrypto` may hold
  PUBLIC EXECUTE) — **any application contract function appearing with anon/PUBLIC EXECUTE is a recorded
  variance.** This is the single most important grant check.
- **Runtime negatives (G-13)** are T2's accountability; T3 supplies the DB-level evidence (RLS/grants) as contributor.

## S5 — Storage isolation — INDETERMINATE (source), UNVERIFIED (live)
- `0011` is a **DEFER manifest** — buckets and `storage.objects` policies are **not authored** (all commented).
  Three buckets are specified **private** (`secure-docs`, `completed-work`, `client-docs`) but their creation
  and RLS were executed **live-only** (`0012`, no repo file). Therefore source **cannot** prove S5.
- **This is the largest evidence gap.** A4 §13/§13c must capture: (a) `secure-docs` exists and `public=false`;
  (b) `storage.objects` policies enforce per-client path separation; (c) no anon/public read policy; (d)
  signed-URL expiry configuration. Cross-client denial is a runtime negative (G-13/G-08). **No source change
  can close S5** — it is inherently live-evidence-bound.

## G-10 — Edge deployment state — UNVERIFIED
- Edge **source** is unrecoverable (G-09 — see `supabase/functions/EDGE_FUNCTION_RECOVERY_STATUS.md`).
  Edge **deployment** state (which of `ai-agent`, `extract-financial`, `scan-document` are live on V2, with
  `verify_jwt` setting) is **[EP]** — captured by A4 Part 2 §14 (dashboard/CLI, not SQL). Any (re)deploy is
  **[LIVE-PJ]** and out of scope.

## Consolidated variance register

| ID | Gate | Severity | Variance | Proposed action (all tightening; none applied) | Owner |
|---|---|---|---|---|---|
| V-1 | S2 | Medium | 25 operational/dependency tables ENABLE-only (no FORCE) → **owner** bypass only | FORCE RLS at a live S2 gate (closes owner bypass; **not** service_role/BYPASSRLS) | T3 proposes → PJ (live) |
| V-2 | S2 | **Critical (if present live)** | `0006` open policy must be superseded by `0010` | A4 §10b: confirm no `*_authenticated_all` live | T3 verify (A4) |
| V-3 | S2 | Low (current model) | No row-level tenant scoping (OQ-2 deferred) | Record; required only for multi-tenant | T3 record |
| V-4 | S3 | Low→Medium (conditional) | 3 helpers pin bare `'public'`; safe only if untrusted roles can't CREATE in `public` | Repin to `pg_catalog,public,pg_temp` + verify public-schema CREATE (Step 3 item 5) | T3 proposes → PJ (live) |
| V-5 | S4 | High (latent) | Default grants may leave EXECUTE to **anon or PUBLIC (OID 0)** on future fns | A4 §10d/§7 corrected LEFT-JOIN query; allowlist-reconcile every anon/PUBLIC EXECUTE row | T3 verify (A4) |
| S5-gap | S5 | High | Storage buckets/policies unversioned (live-only 0012) | A4 §13/§13c capture; runtime cross-client negative | T3 verify (A4) + T2 runtime |

**None of V-1…V-5 is remediated in this PR.** Remediations touching the live DB are `[LIVE-PJ]`. This report
plus `T3_PJ_EVIDENCE_REQUEST.md` gives PJ everything needed to close S2/S3/S4/S5 with a single read-only run.

## Governance footer
```
Governing Issue: #23 · Merged PR: #29 · HEAD: 1286a290f5d4287e70c6853d2eb3bad16256e276
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Target: sync/integration
SQL/Database action: NOT AUTHORISED · Deployment/Alias change: NOT AUTHORISED · V1 access: NONE
No security gate weakened; all proposals tighten or preserve.
```
