# YAV2 Portal V2 — Table Grant Posture & Effective-Access Matrix

**Discrepancy area:** 1 of 3 — *why anon / authenticated / service_role show broad table privileges.*
**Basis:** static read of authored migrations under `supabase/migrations/`, **corroborated by the live
SELECT-only run** (PJ-executed, 2026-07-30 11:15 IST, `yav2-dev` / `ogjrwemjefvccpyjwxuo`). Claude executed
no SQL and accessed no database; no privilege was revoked or altered.
**Governing baseline:** `sync/integration` @ `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`.
**Live evidence — PRIMARY (exact):** `docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_EXACT_2026-07-30_1115_IST.json` (complete raw Supabase output; G1 = 818 grant rows, G4 = 93 policies, G11 = 64 default-ACL rows, etc.). **Convenience summary only:** `…/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_SUMMARY_2026-07-30_1115_IST.json` (Claude-prepared; not raw/exact).

> **LIVE RESULTS (2026-07-30 11:15 IST).** All **39 tables have RLS enabled**. **[G5] anon/PUBLIC policies =
> 0**; **[G6] legacy `*_authenticated_all` policies = 0**; anon/authenticated **cannot CREATE in public**;
> **service_role `BYPASSRLS` confirmed**. Grant posture: **11 tables anon-revoked** (explicit least-privilege)
> and **28 tables RLS-mitigated** (anon default grant present, blocked by RLS default-deny). The row-level
> access picture is therefore sound. **However, 28 tables still grant anon non-RLS *object-level*
> privileges — TRUNCATE, REFERENCES, TRIGGER, and the PostgreSQL-17 `MAINTAIN` privilege — which RLS does
> NOT mediate.** This is recorded as a new HIGH hardening residual **R-ANON-OBJECT-PRIVILEGES** (§3.5); it is
> **not** asserted as currently exploitable (no runtime evidence gathered).

> **Prime directive honoured:** *broad grants are NOT assumed harmless merely because RLS exists.* RLS
> `ENABLE` does not bind the table **owner**; neither `ENABLE` nor `FORCE` binds a role holding
> **`BYPASSRLS`** (Supabase `service_role`); RLS does **not** mediate object-level privileges (TRUNCATE/
> REFERENCES/TRIGGER/MAINTAIN); and anon's block on the 28 RLS-mitigated tables rests on *absence of any
> anon policy*, not an explicit anon `REVOKE`. Each is a real residual, classified below.

---

## 1. Why the three roles show broad privileges — the grant origin

**Finding G-ORIGIN (QUALIFIED) — LIKELY PLATFORM/DEFAULT-ENVIRONMENT ORIGIN — HISTORICAL PROVENANCE NOT
CONCLUSIVELY AVAILABLE FROM THE CURRENT CATALOG EVIDENCE.** The broad grants are of *likely*
platform/default-environment origin because no matching grant statement exists in the governing repository;
the *historical* origin of the ACLs already attached to existing tables cannot be conclusively established
from catalog evidence.

- **What source proves:** there is **no** `ALTER DEFAULT PRIVILEGES` and **no** `GRANT ... ON ALL TABLES`
  statement anywhere in `supabase/migrations/`. Every textual match for that phrase is a **comment**
  describing the expected platform behaviour (`0015_m1a_client_master_foundation.sql:401-402`,
  `0014_r4db_financial_year_repair.sql:1049`, `0016_m1b_d2a_audit_write_and_lineage.sql:99`). The 20
  operational + 5 dependency tables are never granted or revoked by any migration; only the 9 M1-A tables
  (`0015:384-399`) and 2 P5 tables (`0021:219-227`) — plus function/write closures (`0017:1052-1064`,
  `0018:57-66`) — carry explicit statements.
- **What source cannot prove:** *why* those 25 tables nonetheless show broad grants. The **likely**
  explanation is a standing, project-level default privilege (a Supabase project commonly ships
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role`,
  applied by the platform owner role outside the migration set, so tables inherit `GRANT ALL` at
  `CREATE TABLE` time). This is a **hypothesis about the environment**, not a fact readable from the repo.
- **What [G11]/[G11b] can and cannot do (supporting evidence only):** `pg_default_acl` shows the **current**
  default-privilege configuration and can **support or weaken** the platform/default-environment-origin
  hypothesis. It **cannot by itself prove** the historical origin of ACLs already attached to existing
  tables, because default privileges may have changed before or after those tables were created. If a
  standing TABLE default privilege to the three roles (and/or PUBLIC) is **present**, that **supports** the
  reading; if **absent**, it **weakens** it (and other mechanisms — explicit object-level grants [G1], role
  membership — would be examined) — but neither outcome is conclusive as to provenance.

**Final grant-origin conclusion:** **LIKELY PLATFORM/DEFAULT-ENVIRONMENT ORIGIN — HISTORICAL PROVENANCE NOT
CONCLUSIVELY AVAILABLE FROM THE CURRENT CATALOG EVIDENCE.** The broad grants are *governed by RLS* — but
that is a mitigation, **not** a proof of harmlessness (per the prime directive). [G11]/[G11b] remain useful
**supporting** evidence for the origin hypothesis, not a determination of it.

---

## 2. Raw grant  ≠  RLS  ≠  FORCE  ≠  policy  ≠  effective access

| Layer | What it is | What it does **not** do |
|---|---|---|
| **Raw grant** (`relacl`) | Table-level privilege held by a role (`SELECT/INSERT/UPDATE/DELETE`). Origin here = likely default-ACL (§1; confirm [G11]). | Does not by itself grant row visibility when RLS is on. |
| **RLS `ENABLE`** | Turns on row filtering; with **no permissive policy for a role → default-deny** for that role. | Does **not** bind the table **owner**, nor any `BYPASSRLS` role. |
| **RLS `FORCE`** | Also binds the table **owner**. | Does **not** bind `BYPASSRLS`/superuser; does **nothing** about `service_role` key exposure. |
| **Policy** | Per-role, per-command predicate that *permits* rows. | Absence of a policy = deny; a too-broad policy (e.g. `USING(true)`) re-opens the table. |
| **Effective access** | The AND of the above for a given role at runtime. | Only a controlled runtime probe (`SET ROLE …; SELECT`) *proves* it; catalog state *strongly implies* it. |

**`BYPASSRLS` reality (verified against Supabase role model; confirm live at [G7]):** `service_role`
carries `BYPASSRLS`, so it reads/writes **every** table regardless of RLS/FORCE. `service_role` isolation
is therefore a **secret-handling** control (keep the key server/Edge-only; the SPA uses the anon key) —
**not** an RLS control. FORCE gives zero protection against it.

---

## 3. Table-by-table classification

Classes: **(a)** expected & effectively blocked · **(b)** excessive but currently mitigated ·
**(c)** potentially exploitable · **(d)** undeterminable without controlled runtime testing.

### 3.1 Class (a) — expected and effectively blocked  *(14 tables)*

| Tables | Raw grant | RLS / FORCE | Policies | Why (a) | Source |
|---|---|---|---|---|---|
| `audit_log`, `audit_event_contract`, `audit_ingestion_failures` | default-ACL grant (likely; never revoked) | **ENABLE + FORCE** | **none** → default-deny | Zero permissive policy + FORCE ⇒ inert for anon *and* authenticated *and* owner; access only via SECURITY DEFINER audit RPCs. Default grant is dead weight. | RLS `0006:36-38`; FORCE `0005:36,56,67`; deny-by-design `0010:571-580` |
| `client_persons`, `client_registrations`, `gst_registration_details`, `client_identifiers`, `client_contacts`, `client_addresses`, `client_relationships` (7 core M1-A) | anon **REVOKE**d; authenticated **SELECT only** (INSERT/UPDATE revoked `0017:1061`, DELETE revoked `0018:63`); service_role SELECT/INSERT/UPDATE | **ENABLE + FORCE** | role-scoped (`is_admin_or_manager()`), **no DELETE policy** | Least-privilege explicitly enforced; writes RPC-only via 22 definer RPCs; anon fully closed. | `0015:384-399,351-364`; `0017:1052-1064`; `0018:57-66` |
| `entity_type_catalogue`, `client_remediation_flags` | anon **REVOKE**d; authenticated SELECT/INSERT/UPDATE (0015 posture retained) | **ENABLE + FORCE** | role-scoped | anon closed; reference / flag tables; authenticated writes are policy-gated. | `0015:384-399,371-375,316` |
| `service_catalogue`, `client_service_applicability` (P5) | anon **REVOKE**d; authenticated **SELECT only**; writes RPC-only; `service_catalogue` SELECT-only even for service_role | **ENABLE + FORCE** | Admin/Manager (applicability) / all-active (catalogue) SELECT | anon closed; explicit least-privilege; FORCE'd. | `0021:199-227,202,213` |

> For all (a) tables the **anon** raw grant is either revoked or rendered inert by FORCE + no-policy; the
> **authenticated** surface is explicitly minimised; **service_role** still bypasses RLS but that is the
> §4 secret-handling item, not a per-table defect.

### 3.2 Class (b) — excessive but currently mitigated  *(25 tables)*

**Operational (0002/0003/0004), 20:** `financial_years`, `team`, `clients`, `client_directors`, `tasks`,
`follow_ups`, `documents`, `completed_documents`, `extracted_document_data`, `client_financials`,
`financials_tracker`, `claude_usage_log`, `compliance_calendar`, `gst_tracker`, `income_tax_tracker`,
`tds_tracker`, `roc_tracker`, `notice_tracker`, `audit_tracker`, `accounting_tracker`.
**Dependency (0007), 5:** `ct_team_members`, `llp_tracker`, `payroll_tracker`, `tds_client_config`,
`trust_ngo_tracker`.

| Dimension | State | Consequence |
|---|---|---|
| Raw grant | Default-ACL `GRANT ALL` (likely; confirm [G11]) to anon + authenticated + service_role; **no explicit REVOKE** | anon holds unused `SELECT/INSERT/UPDATE/DELETE`; authenticated holds broad direct DML |
| RLS | **ENABLE** on all 25 (`0006:19-31`, re-asserted `0010:74-87`; deps `0007:445-449`) | anon: no policy → **default-deny** (mitigated). authenticated: role-scoped by `0010` |
| FORCE | **absent on all 25** | **owner bypasses RLS** — defence-in-depth gap |
| Policy | authenticated role model (`0010`): Admin/Manager broad; Executive scoped; Staff task-only; Viewer read-only; **PII tables `client_directors`, `client_financials` = Executive-only SELECT** | correct role model, but see V-2 caveat below |

**Why (b) not (a):** the anon grant is *excessive* (should be explicitly revoked as defence-in-depth like
the M1-A set) and is blocked **only** by policy-absence — a single future `USING(true)` anon policy would
expose the table. Lack of FORCE leaves an owner-bypass path. **Currently mitigated** because (i) anon has
no policy anywhere ([G5] must confirm 0 rows), and (ii) prior live evidence recorded the `0010` role model
in force with no open policy.

**Why (b) not (c):** exploitability requires a *missing* mitigation, which source does not show. It becomes
(c) **only if** [G6] finds a surviving `*_authenticated_all`, or [G5] finds an anon policy, or [G3] finds
RLS disabled on any of these 25.

### 3.3 Class (c) — potentially exploitable  *(0 confirmed from source; conditional)*

**No table is placed in (c) from source or from prior live evidence.** (c) is *reserved* for whatever the
live run surfaces:

| Trigger (live) | Table(s) | Severity if present | Block |
|---|---|---|---|
| Surviving `<table>_authenticated_all  USING(true) WITH CHECK(true)` | any operational | **CRITICAL** — every authenticated user full read/write | **[G6]** must return **0 rows** |
| Any permissive policy naming `anon`/`public` | any | **HIGH** — anon row access | **[G5]** must return **0 rows** |
| RLS `ENABLE = false` on a granted table | any of the 25 | **HIGH** — raw grant becomes live | **[G3]** / **[G9]=`REVIEW_RLS_OFF`** |

**LIVE RESULT — (c) is empty (confirmed 2026-07-30):** the run returned **[G6] = 0** (no surviving
`*_authenticated_all`), **[G5] = 0** (no anon/PUBLIC policy), and **RLS enabled on all 39 tables** — so none
of the (c) triggers fired. The row-level exposure class is **confirmed empty**. (Note: object-level anon
privileges are a *separate* concern from row access — see §3.5.)

### 3.4 Class (d) — undeterminable without controlled runtime testing  *(cross-cutting)*

| Question | Why SQL cannot settle it | How to close |
|---|---|---|
| Is the `service_role` key actually confined to server/Edge (never shipped to the browser)? | Catalog state cannot reveal where a key is used; `service_role` will always show broad + `BYPASSRLS`. | Deployment/runtime inspection (client bundle audit; Edge secret scope). Out of SQL scope. |
| Does anon **at runtime** truly get zero rows on the 25 (b) tables? | Policy-absence *implies* deny; only a probe proves it. | Controlled `SET ROLE anon; SELECT count(*)` negative test (PJ-authorised, **not** in this SELECT-only kit). |
| Is the owner-bypass path (no FORCE) reachable by any code path? | Requires knowing which role executes each path at runtime. | Runtime RBAC negatives (T2 scope). |

### 3.5 R-ANON-OBJECT-PRIVILEGES — **HIGH · HARDENING REQUIRED** (new live finding)

**Finding.** The live run confirmed that the **28 RLS-mitigated tables** still grant the `anon` role
**object-level** privileges that arrive via the default ACL and were never revoked: **`TRUNCATE`,
`REFERENCES`, `TRIGGER`, and the PostgreSQL-17 `MAINTAIN`** privilege. The 11 anon-revoked tables (M1-A + P5)
are **not** affected — their `REVOKE ALL FROM anon` removed these too.

**Why RLS does not help here.** Row-Level Security mediates **only** `SELECT / INSERT / UPDATE / DELETE`
(the row-returning/row-writing commands). It does **not** mediate object-level privileges: `TRUNCATE`
(empties the whole table, bypassing per-row policies), `REFERENCES` (create FKs against the table),
`TRIGGER` (attach triggers), and `MAINTAIN` (run `VACUUM`/`ANALYZE`/`REINDEX`/`CLUSTER`/`REFRESH
MATERIALIZED VIEW` maintenance). A role holding these on a table is **not** constrained by that table's RLS
policies. So the sound row-level posture (§3.1–§3.3) does **not** cover this surface.

| Attribute | Value |
|---|---|
| Finding ID | **R-ANON-OBJECT-PRIVILEGES** |
| Severity | **HIGH — HARDENING REQUIRED** |
| Scope | 28 RLS-mitigated tables (20 operational + 5 dependency + 3 audit) |
| Privileges held by anon | `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN` (PG-17) |
| RLS mediation | **None** — RLS does not apply to object-level privileges |
| Origin | Default-ACL grant (likely platform/default-environment; see §1), never revoked on these 28 |
| Exploitability | **NOT asserted.** No runtime evidence was gathered; this is recorded as a *hardening requirement*, not a demonstrated exploit. Whether `anon` (the unauthenticated PostgREST role) can actually reach these privileges at runtime requires a controlled negative test, which was not performed. |
| Remediation | Proposed (not executed) in `YAV2_SECURITY_HARDENING_PROPOSAL_ANON_OBJECT_PRIVILEGES.md` — explicit `REVOKE` of object-level privileges from `anon` + a default-privilege correction for future objects. **Requires separate PJ approval.** |
| This document | **Records only.** No `REVOKE`/`GRANT`/`ALTER`/DDL/DML is performed or proposed for execution here. |

> **Note on measurement (see review package):** the original `[G9]` object-admin rollup enumerated
> `TRUNCATE/REFERENCES/TRIGGER` but **omitted `MAINTAIN`** (a PG-17 addition). `MAINTAIN` was nonetheless
> **visible in the raw ACL evidence** ([G1]/[G8b]/[G11], which project `privilege_type` generically). Future
> verification SQL has been updated to include `MAINTAIN` in the `[G9]` rollup; the already-executed evidence
> is not altered.

---

## 4. `service_role` — the one cross-cutting broad grant that RLS cannot mitigate

`service_role` holds `GRANT ALL` (likely default-ACL origin; confirm [G11]) **and** `BYPASSRLS`. On every table — including the
FORCE'd (a) tables — it can read/write. This is **by design** for server-side/Edge use. The control is
**secret-handling**, confirmed at [G7] (attribute) but *closable only* by the (d) deployment audit. Recorded
as **residual R-SVC**: acceptable iff the service_role key never reaches an untrusted context.

---

## 5. Read-only verification SQL (proposals only — no mutation)

| Block | Proves |
|---|---|
| **[G1]/[G2]** | Raw grant matrix per role (aclexplode; PUBLIC OID 0 preserved) — the "broad privileges" ground truth |
| **[G3]** | `relrowsecurity` / `relforcerowsecurity` + policy_count per table — RLS vs FORCE |
| **[G4]** | Policy inventory (role targets + command), no predicate bodies |
| **[G5]** | Anon/PUBLIC-targeted policies — **expect 0** |
| **[G6]** | Surviving `*_authenticated_all` — **expect 0** (CRITICAL if not) |
| **[G7]** | `rolbypassrls` per role — confirms service_role bypass, anon/authenticated do not |
| **[G8]/[G8b]** | public-schema CREATE privilege — confirms untrusted roles cannot shadow (ties to Area 3) |
| **[G9]** | Per-table anon effective-access verdicts — **privilege-specific** (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER **+ `MAINTAIN` in the updated future-verification kit**) rolled into separate **read**, **data-write** and **object/admin** verdicts; anon/PUBLIC policy detected catalog-safe via `pg_policy.polroles` (OID 0 = PUBLIC). *Executed run omitted `MAINTAIN` from the object-admin rollup — see §3.5 note.* |
| **[G10]** | Object-count drift (expect ≈ 39 / 51 / 3) |
| **[G11]/[G11b]** | **`pg_default_acl` current default-privilege evidence** — **supporting** evidence for the origin hypothesis (§1): shows the current default grant (if any) to anon/authenticated/service_role/PUBLIC for schema `public`, which can support or weaken — but cannot by itself prove — the historical origin of existing tables' ACLs |

**All are `SELECT`/`WITH` only.** None invokes an application function; none selects a client value.

---

## 6. Recommendations (future hardening — none applied; all require separate PJ-authorised live action)

1. **R-ANON-OBJECT-PRIVILEGES (HIGH) — explicit `REVOKE` of `TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` (and
   any residual SELECT/INSERT/UPDATE/DELETE) from `anon` on the 28 RLS-mitigated tables**, plus a
   default-privilege correction so future objects do not re-inherit them. Detailed, non-executed plan:
   `YAV2_SECURITY_HARDENING_PROPOSAL_ANON_OBJECT_PRIVILEGES.md`. **Separate PJ approval required.**
2. **Explicit anon REVOKE of data privileges on the 28 RLS-mitigated tables** — mirror the M1-A/P5 pattern
   so anon's block is an *explicit* least-privilege posture, not policy-absence. (Defence-in-depth.)
3. **`FORCE ROW LEVEL SECURITY` on the 28 RLS-mitigated tables** — closes the owner-bypass path. Does **not**
   address `service_role`.
4. **Keep `service_role` key server/Edge-only** — the sole control for R-SVC; verify by client-bundle audit (d).
5. **Retain the live checks [G5]/[G6] in CI-adjacent review** — a future migration could accidentally
   reintroduce an open policy.

> **Taxonomy note.** Two lenses are used and are consistent: the effective-access classes (§3.1 (a) 14 /
> §3.2 (b) 25) group by *row-access outcome*; the live grant-posture split (**11 anon-revoked** = 9 M1-A + 2
> P5; **28 RLS-mitigated** = 20 operational + 5 dependency + 3 audit) groups by *whether anon was explicitly
> revoked*. The 3 audit tables are default-deny (a) yet still carry an un-revoked anon default grant, so they
> count among the 28 for R-ANON-OBJECT-PRIVILEGES. 11 + 28 = 39.

> None of the above is a mutation performed here. This document is analysis + read-only verification only;
> **no privilege was revoked or altered.**
