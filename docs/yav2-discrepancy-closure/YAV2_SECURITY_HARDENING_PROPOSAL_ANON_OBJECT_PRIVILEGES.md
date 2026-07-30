# YAV2 Portal V2 — Security Hardening Proposal · R-ANON-OBJECT-PRIVILEGES

**Status:** **PROPOSAL ONLY — NOT EXECUTED.** No SQL was run; no migration was created; no live privilege was
revoked or altered. **Execution requires separate, explicit PJ approval.**
**Finding:** `R-ANON-OBJECT-PRIVILEGES` (HIGH — hardening required), raised by the live SELECT-only run of
2026-07-30 11:15 IST (`yav2-dev` / `ogjrwemjefvccpyjwxuo`).
**Governing baseline:** `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.

---

## 1. Problem statement

The live run confirmed that **28 RLS-mitigated tables** grant the `anon` role **object-level** privileges via
the platform default ACL that were never revoked:

- **`TRUNCATE`** — empties an entire table, bypassing per-row RLS policies.
- **`REFERENCES`** — create foreign-key constraints referencing the table.
- **`TRIGGER`** — attach triggers to the table.
- **`MAINTAIN`** (PostgreSQL 17) — run `VACUUM` / `ANALYZE` / `REINDEX` / `CLUSTER` / `REFRESH MATERIALIZED
  VIEW` maintenance on the table.

**RLS does not mediate any of these** (RLS governs only `SELECT/INSERT/UPDATE/DELETE`). The 11 anon-revoked
tables (M1-A + P5) are unaffected because their `REVOKE ALL FROM anon` already removed these.

> **Exploitability is not asserted.** No runtime negative test was performed. This proposal treats the grant
> as a least-privilege / defence-in-depth defect to be closed, **not** as a demonstrated exploit.

---

## 2. Proposed treatment (to be executed only under separate PJ approval)

### 2.1 Explicit least-privilege treatment of anon table privileges
Bring the 28 RLS-mitigated tables to the same explicit posture as the 11 anon-revoked tables:
`REVOKE ALL ON <table> FROM anon` (and `FROM PUBLIC`), then re-grant nothing to anon (anon reaches data only
via authenticated flows, never directly).

### 2.2 Data privileges — SELECT / INSERT / UPDATE / DELETE
- Confirm (via `[G9]` read/data-write verdicts) that anon currently holds these only by default-ACL and is
  blocked by RLS default-deny.
- **Revoke them explicitly** so the block is an explicit least-privilege posture, not policy-absence. This
  does **not** change current effective row access (RLS already denies anon), but removes the fragility of a
  future accidental `USING(true)` anon policy re-opening the table.

### 2.3 Object / administrative privileges — TRUNCATE / REFERENCES / TRIGGER / MAINTAIN
- **Revoke `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN` from `anon`** on all 28 tables (these are the
  privileges RLS cannot mediate — the core of R-ANON-OBJECT-PRIVILEGES).
- Apply the same to `PUBLIC` where present.
- Prefer a schema-wide, idempotent loop mirroring the M1-A pattern (`0015:384-399`) rather than 28 ad-hoc
  statements, so the treatment is auditable and repeatable.

### 2.4 Default-privilege correction for FUTURE objects
- Correct the standing default so **new** tables do not re-inherit broad anon/PUBLIC grants:
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon` (and PUBLIC as appropriate),
  scoped to the owning role(s) identified by `[G11]`. Without this, any future `CREATE TABLE` reintroduces
  the finding.
- This is the single most important forward-looking step; §2.1–2.3 fix existing tables, §2.4 stops regressions.

---

## 3. Regression verification (read-only; SELECT-only)

Re-run the SELECT-only kit after any approved change and require:

| Check | Expected post-hardening |
|---|---|
| `[G1]/[G2]` anon raw grants on the 28 tables | none (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN all absent for anon) |
| `[G9]` `object_admin_verdict` (now incl. MAINTAIN) | `BLOCKED_NO_GRANT` for anon on all 39 tables |
| `[G9]` `read_verdict` / `data_write_verdict` | `BLOCKED_NO_GRANT` for anon (explicit), not `BLOCKED_BY_RLS` |
| `[G11]/[G11b]` default ACL | no default TABLE grant to anon/PUBLIC for schema `public` |
| `[G3]` RLS | still enabled on all 39 tables (unchanged) |
| `[G5]/[G6]` | still 0 / 0 |
| Application smoke (authenticated flows) | unchanged — no authenticated privilege touched |

The updated `[G9]` (post-execution revision) already includes `MAINTAIN`, so regression verification covers it.

---

## 4. Rollback & impact assessment

**Rollback.** Each `REVOKE` has an exact inverse `GRANT`; author a paired rollback script that re-grants the
prior privileges to anon/PUBLIC on the 28 tables and restores the default privilege, returning the catalog
to the pre-hardening ACL state. The default-privilege change is likewise reversible with a matching
`ALTER DEFAULT PRIVILEGES ... GRANT ...`.

**Impact assessment.**
- **Expected impact: none on legitimate flows.** anon (the unauthenticated PostgREST role) is not the path
  for application writes; the SPA uses the anon key for RLS-scoped reads only, and no application feature is
  designed to `TRUNCATE`/attach triggers/maintain tables as anon. Removing these should be transparent.
- **Risk to watch:** any tooling or migration that (incorrectly) relied on anon holding object privileges
  would break — surface such usage before execution. `service_role` (server-side) is untouched, so
  server/Edge maintenance jobs are unaffected.
- **Blast radius:** limited to the `anon`/`PUBLIC` grantees on 28 tables + one default-privilege rule; no
  data is read, written, or deleted by the hardening itself.

---

## 5. Approval requirement

This proposal is **not** self-executing. Proceeding requires:

1. **Separate, explicit PJ approval** of the treatment and the specific table list.
2. Execution as a **governed migration** (authored, reviewed, with the paired rollback of §4) against
   **`yav2-dev` only** — never V1/Production.
3. Post-execution **regression verification** (§3) and evidence capture.

**Not authorised by this document:** any REVOKE/GRANT/ALTER/DDL/DML, any migration, any merge, any
deployment, any Production access. This file records the plan only.
