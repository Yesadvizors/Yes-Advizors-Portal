# YAV2 Portal V2 — Stage A — Part B Supported Execution Mechanism Discovery

**Status:** **DISCOVERY / DESIGN — read-only. No Supabase access, no SQL executed, no privilege changed, no
migration created/run, no deployment, no credentials used.**
**Governing:** `sync/integration` @ `7e3941eb65bf1efd80f18c07c76e560ea5848589` (PR #38 merged
2026-08-01T02:18:55Z as a readiness-only package).
**Authorised future-execution env (reference only):** `yav2-dev` / `ogjrwemjefvccpyjwxuo`.
**Prohibited:** V1 / Production / `zcszesuvjrryxtigjglt`.

---

## 1. Objective

Determine the **supported and governable** mechanism to execute Stage A **Part B**, whose sole statement is:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon;
```

(Source: `supabase/readiness/YAV2_STAGE_A_PATH2_PART_B_SUPABASE_ADMIN_DEFAULT_PROPOSAL.sql`. Exact inverse for
rollback: `…_PATH2_PART_B_ROLLBACK_PROPOSAL.sql`.)

This is a **discovery and design task only**. Nothing here authorises execution.

---

## 2. Grounding facts (from the merged Stage A package)

| Fact | Source | Value |
|---|---|---|
| Executing SQL-Editor identity | A1 | `current_user = session_user = current_role = postgres` |
| `postgres` is superuser? | A1 / B1 / F1 / F2 | **No** (`cu_is_superuser = false`; `rolbypassrls = true`) |
| `postgres` member of `postgres`? | C2 / F1 | **Yes** → `eligible_for_postgres_default_alter = true` (Part A) |
| `postgres` member of `supabase_admin`? | C1 / C2 / F1 | **No** (`cu_is_member_of_supabase_admin = false`) |
| Eligible to alter `supabase_admin` defaults? | **F2** | **`eligible_for_supabase_admin_default_alter = false`** |
| `supabase_admin`/`public`/`anon` object default rows | D2 + focused reconciliation | **4** (`TRUNCATE, REFERENCES, TRIGGER, MAINTAIN`) |
| `postgres`/`public`/`anon` object default rows | D2 + focused reconciliation | **4** (handled by Part A) |
| `graphql` / `graphql_public` `supabase_admin` defaults | focused reconciliation | exist (4 each) — **OUTSIDE Stage A; must remain untouched** |

**PostgreSQL rule that governs this task:** `ALTER DEFAULT PRIVILEGES FOR ROLE X` may only be executed by a
session that **is** role `X` **or is a member of** role `X`. For `X = supabase_admin` (an internal Supabase
**superuser** role), the customer-facing `postgres` role is neither. **Platform-level permissions (project
owner, dashboard owner, SQL-Editor access, service-role API key) do NOT confer PostgreSQL membership of
`supabase_admin`.** Authority is a database-role fact, established only by `pg_has_role(...,'MEMBER')` /
superuser — which F2 already measured as **false**.

---

## 3. Candidate execution routes (independent analysis)

> For each route the decisive question is **not** "can PJ reach a SQL prompt?" but **"what PostgreSQL role
> does the statement actually run as, and is that role `supabase_admin` or a member of it?"**

### 3.1 Supabase Dashboard SQL Editor
- **Executing DB role:** `postgres` (the same identity F2 was captured under).
- **Can alter `supabase_admin` defaults?** **No** — ineligible per F2; the statement raises
  `permission denied` / "must be a member of role \"supabase_admin\"".
- **Access required:** dashboard login (PJ has). **PJ can invoke directly:** yes, but it will **fail**.
- **Support required:** n/a (route cannot succeed). **Audit:** SQL Editor history (weak).
- **Rollback:** same route, same failure. **Risks:** false sense of authority; tempting `SET ROLE`/escalation
  (explicitly forbidden). **Classification: `UNSUPPORTED` (for this command).**

### 3.2 Supabase CLI (`supabase db push` / `db execute` / migration)
- **Executing DB role:** `postgres` (or the migration/pooler role) via the connection string — **not**
  `supabase_admin`.
- **Can alter `supabase_admin` defaults?** **No** — same ineligibility; would error and (if wrapped in a
  migration) fail the migration.
- **Access required:** DB connection string / access token. **PJ can invoke directly:** yes, but it **fails**.
- **Support required:** n/a. **Audit:** migration history / CLI logs. **Rollback:** n/a (never applies).
- **Risks:** committing a failing migration into `supabase/migrations/` (out of scope here; forbidden).
  **Classification: `UNSUPPORTED` (for this command).**

### 3.3 Direct database connection with supported credentials (psql / pooler / `postgres` password)
- **Executing DB role:** `postgres` (direct 5432) or a pooler role (6543) — **not** `supabase_admin`.
- **Can alter `supabase_admin` defaults?** **No.** The **`service_role` API key is not a database login for
  DDL** — it is a PostgREST JWT that maps to the `service_role` DB role over HTTP; `service_role` is likewise
  **not** a member of `supabase_admin` and cannot issue `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`.
- **PJ can invoke directly:** yes (a psql session), but it **fails**. **Support required:** n/a.
- **Audit:** `pg_stat_activity` / server logs (if enabled). **Rollback:** n/a.
- **Risks:** credential handling; temptation to escalate. **Classification: `UNSUPPORTED` (for this command).**

### 3.4 Supabase Management API / platform tooling
- **Executing DB role:** the Management API's SQL endpoint runs as `postgres` — **not** `supabase_admin`.
- **Can alter `supabase_admin` defaults?** **No documented endpoint** runs statements as `supabase_admin` or
  exposes an "alter another role's default privileges" capability.
- **PJ can invoke directly:** yes (with a management token), but it **fails** for this command.
- **Support required:** n/a for the generic endpoint. **Audit:** API request logs.
- **Classification: `UNSUPPORTED` for the generic SQL endpoint; `UNKNOWN` for any undocumented
  owner-authority endpoint (only Supabase can confirm existence).**

### 3.5 Supabase Support-assisted / privileged-maintenance execution
- **Executing DB role:** a **Supabase operator** acting as `supabase_admin` (or superuser) — the **only**
  identity that actually satisfies the PostgreSQL membership requirement.
- **Can alter `supabase_admin` defaults?** **Yes, in principle** — this is the one route where the executing
  identity is eligible.
- **Access required:** a **Support request** (drafted, not sent — see the Support-request draft doc). **PJ can
  invoke directly:** **No** — PJ requests; Supabase executes (or authorises/instructs a supported method).
- **Support required:** **Yes.** **Audit:** the support ticket thread + Supabase's written confirmation of the
  role used + PJ's post-run SELECT-only verification (`[DEF-POST-A]` → 0 supabase_admin anon object rows).
- **Rollback:** the **primary** reversal is the exact-inverse `GRANT` applied via the **same** Support channel;
  `yav2-dev` PITR is a **disaster-recovery** consideration only (availability/restoration implications
  unverified here — not a privilege-level rollback).
- **Risks:** turnaround/latency; Supabase may **decline** to alter an internal role's defaults or may propose
  an alternative; scope creep must be prevented by the strict, single-statement request.
  **Classification: `CONDITIONALLY SUPPORTED` — the credible route, gated on Supabase acceptance +
  separate PJ approval + evidence.**

### 3.6 Documented owner-authority / privileged self-service mechanism
- Whether Supabase offers a **self-service** way for the customer `postgres` role to correct a
  `supabase_admin`-owned default (e.g., a platform function, a temporary membership grant, or a documented
  maintenance procedure) is **not established from repository evidence**.
- **Classification: `UNKNOWN` — requires Supabase confirmation.** If such a documented mechanism exists it
  would become the preferred route (self-service, PJ-invocable, fully audited).

---

## 4. Part B mechanism decision matrix

| # | Route | Executes as | Can alter `supabase_admin` default? | PJ direct? | Support needed | Audit evidence | Rollback | Classification |
|---|---|---|---|---|---|---|---|---|
| 3.1 | Dashboard SQL Editor | `postgres` | No | Yes (fails) | No | Editor history | n/a | **UNSUPPORTED** |
| 3.2 | Supabase CLI / migration | `postgres`/pooler | No | Yes (fails) | No | CLI/migration logs | n/a | **UNSUPPORTED** |
| 3.3 | Direct psql / pooler / keys | `postgres`/`service_role` | No | Yes (fails) | No | server logs | n/a | **UNSUPPORTED** |
| 3.4 | Management API (generic SQL) | `postgres` | No | Yes (fails) | No | API logs | n/a | **UNSUPPORTED** (generic); **UNKNOWN** (undocumented endpoint) |
| 3.5 | Supabase Support-assisted | operator as `supabase_admin`/superuser | **Yes** | **No** | **Yes** | ticket + written confirmation + post-verify | Support inverse `GRANT` (primary); PITR DR-only | **CONDITIONALLY SUPPORTED** |
| 3.6 | Documented self-service authority | (unknown) | (unknown) | (unknown) | (unknown) | (unknown) | (unknown) | **UNKNOWN** |

**Conclusion:** every **customer-invocable** database route (3.1–3.4) is **UNSUPPORTED** for this specific
command because they all execute as `postgres`, which F2 proved ineligible. The **only credible route is 3.5
(Supabase Support-assisted)**, which is **CONDITIONALLY SUPPORTED** and **not yet confirmed**. Route 3.6 may
supersede it **if** Supabase documents a self-service authority path.

---

## 5. Recommended route, fallback, and a necessity check to raise with Supabase

- **Recommended route:** **3.5 — Supabase Support-assisted execution**, initiated by the (not-yet-sent)
  Support-request draft, and gated on: Supabase acceptance → separate PJ approval → separate evidence capture
  → post-run SELECT-only verification.
- **Fallback route:** **3.6 — a documented Supabase self-service owner-authority mechanism**, *if Supabase
  confirms one exists* in its reply. If neither 3.5 nor 3.6 is available, Part B is **BLOCKED**, and — under the
  governing sequencing (§6) — **Part A is also held** (no execution until Part B is confirmed), unless PJ
  invokes the express risk-accepted exception (§6.3). Only tables **created by `supabase_admin`** would inherit
  the anon object default that Part B targets.
- **Necessity/scope item to put to Supabase (open item, not a decision):** future public tables created by the
  **customer `postgres`** role inherit the **`postgres`** default (closed by Part A). The `supabase_admin`
  default only governs tables **created by `supabase_admin`**. Whether any Stage-A-relevant future public table
  is created by `supabase_admin` should be **confirmed by Supabase**; the answer determines whether Part B is
  **required**, **deferrable**, or a **documented accepted residual**. This is flagged as an OPEN ITEM — it is
  not resolved here and does not change the finding without PJ/Supabase input.

---

## 6. Execution sequencing model (GOVERNING RECOMMENDATION)

> **Governing rule: DO NOT execute Part A or Part B until Supabase has confirmed the Part B mechanism.** Once
> both mechanisms are confirmed, prefer a **coordinated execution window** with **Part B first, then Part A**.

### 6.0 Precondition — no execution until Supabase confirms (Part B)

Neither Part A nor Part B may be executed until **Supabase has confirmed, in writing**:
- the **supported Part B execution method**;
- the **actual executing PostgreSQL role** and its authority over `supabase_admin`;
- whether **Supabase Support will execute the exact statement**;
- the **supported rollback method** (the exact-inverse `GRANT`, via the same mechanism);
- the **evidence** that can be supplied **before and after** execution.

Until all five are confirmed, both parts remain **UNAUTHORISED and on hold** (see the optional risk-accepted
exception in §6.3).

### 6.1 Recommended order (coordinated window, once confirmed)

1. **Complete all pre-run evidence** (Mandatory Execution Evidence §A) for both parts.
2. **Execute Part B first**, through the **confirmed Supabase-supported mechanism** (not the `postgres` route).
3. **Verify** `supabase_admin`/`public`/`anon` object-level defaults changed **4 → 0** (`[DEF-POST-A]`).
4. **Verify** `postgres`/`public` remains **unchanged** at that point (Part B must not touch the postgres scope).
5. **Verify** `graphql` and `graphql_public` `supabase_admin` defaults remain **untouched** (still 4 each).
6. **Only after Part B PASSES**, execute **Part A** through the separately authorised **`postgres`** route
   (28 existing-table object REVOKEs + `postgres`/`public` default correction).
7. **Run the full Stage A post-verification** (SELECT-only kit: anon object rows 112 → 0 on existing tables;
   anon data rows preserved = 112; `authenticated`/`service_role` unchanged; both owner-scope defaults now 0).
8. **Close Stage A only when BOTH parts PASS** (+ verification). Full closure = **Part A PASS + Part B PASS**.

| Model | Assessment under the governing rule |
|---|---|
| **Do not execute until both mechanisms confirmed** | **REQUIRED precondition.** Nothing executes until Supabase confirms Part B (§6.0). |
| **Coordinated same-window, Part B first → Part A** | **RECOMMENDED once confirmed.** Two coordinated steps (not one transaction — different eligible identities; no combined atomic path). Part B (uncertain external authority) is proven first; Part A (PJ-eligible) follows only after Part B PASSES. |
| **Part A first, then Part B** | **NOT the default.** Only via the explicit risk-accepted exception in §6.3. |
| **Part B first, then Part A (separate windows)** | Acceptable if a single window is impractical, provided ordering (B before A) and all verifications are preserved. |

### 6.2 Why Part B first is preferred

- **Part B is the uncertain external-authority path** (Supabase Support / owner mechanism, unconfirmed).
- **Testing Part B first avoids changing Part A and then discovering Part B cannot be completed** — i.e. it
  prevents a partial Stage A where the existing tables are already altered but the future-default gap cannot be
  closed.
- **If Part B fails, the database is left at the known pre-Stage-A baseline** (no privilege changed at all),
  which is the cleanest possible fallback state.
- **It minimises partial-completion and rollback risk** by resolving the riskier, externally-dependent step
  before committing the PJ-eligible, easily-reversible step.

### 6.3 Optional separate path — **PART A EARLY EXECUTION — REQUIRES EXPRESS PJ RISK ACCEPTANCE**

This path is **NOT recommended** and is retained only as an explicit, separately-labelled option. It may be
considered **only if PJ intentionally and expressly accepts ALL of the following**:

- **partial Stage A completion** (existing tables + `postgres` default corrected; `supabase_admin` default not);
- **Part B remaining unresolved for an unknown period**;
- **future `supabase_admin`-created public tables potentially retaining the four `anon` object-level defaults**;
- **possible inability to complete or roll back Part B**;
- **Stage A remaining formally OPEN** until Part B PASSES.

Absent an express, recorded PJ risk acceptance of every item above, the **governing** order (§6.0–§6.1: hold
until confirmed, then Part B first) applies.

---

## 7. Partial-completion & rollback risk analysis

| Scenario | Consequence | Mitigation |
|---|---|---|
| **Part A succeeds, Part B fails/declined** | 28 existing tables + `postgres` future-default corrected; `supabase_admin` future-default still grants anon object privileges on any table **it** creates | **Avoided by the governing order** (Part B first → Part A only after Part B PASSES). This state only arises under the §6.3 risk-accepted early-Part-A path; if so, record as KNOWN OPEN GATE, pursue 3.5/3.6, and note Part A is reversible. |
| **Part B succeeds, Part A fails** | In the coordinated window, `supabase_admin` default corrected but the existing-table REVOKEs / `postgres` default did not complete | Real in-window scenario under the governing order. Part A is PJ-eligible, atomic, and independently retriable; re-run Part A under the `postgres` route. Part B remains correctly applied; do **not** roll Part B back merely because Part A must be retried. |
| **Rollback authority unavailable for Part B** | If Part B is applied via Support but cannot be reversed by PJ | Reversal must use the **same** Support channel (exact-inverse `GRANT` proposal) — obtain Supabase's confirmation of reversibility **before** authorising. **The primary rollback is the exact-inverse `GRANT` executed via the confirmed mechanism, NOT PITR.** PITR is a **disaster-recovery** consideration only and must not be treated as a privilege-level rollback unless the project's PITR availability and restoration implications have been separately verified. **Do not authorise Part B without a confirmed statement-level rollback path.** |
| **Evidence/verification fails after one part** | Post-run `[DEF-POST-A]` does not reach the expected count | Treat as STOP; capture raw output; reconcile before proceeding; use rollback if a change was applied and verification cannot confirm intended state. |
| **Supabase mechanism delayed or rejected** | Part B cannot proceed | Under the governing order, **Part A is also held** (nothing executes) and the database stays at the pre-Stage-A baseline; escalate the necessity/scope question (§5) to decide defer-vs-accept-residual. Part A may proceed **only** under the §6.3 express risk-accepted path, after which Part A closure would be valid but Stage A remains formally OPEN. |

---

## 8. Blockers and unknowns (explicit)

- **B-1 (BLOCKER):** No customer-invocable database route can execute Part B; it runs as `postgres`
  (ineligible per F2). Execution depends on **Supabase confirmation** of a supported role/method (3.5 or 3.6).
- **U-1 (UNKNOWN):** Whether Supabase Support will **accept** altering an internal `supabase_admin`-owned
  default on request, and by which role/method — resolved only by their reply.
- **U-2 (UNKNOWN):** Whether a **documented self-service** owner-authority mechanism (3.6) exists.
- **U-3 (UNKNOWN):** Whether Supabase guarantees **reversibility** of the change via the same channel
  (required before authorising Part B).
- **U-4 (OPEN ITEM):** Whether any Stage-A-relevant future public table is actually created by
  `supabase_admin` (determines whether Part B is required, deferrable, or an accepted residual).
- **Constant:** `graphql` / `graphql_public` `supabase_admin` defaults are **outside Stage A** and must remain
  untouched by any route.

---

## 9. PJ decision checklist (before any Part B authorisation)

- [ ] Accept the **governing sequencing** (§6): **hold both parts until Supabase confirms Part B**, then a
      **coordinated window with Part B first, Part A second** — **not** Part A first by default.
- [ ] Approve **sending** the Supabase Support-request draft (`…_SUPABASE_SUPPORT_REQUEST_DRAFT.md`) — currently
      **NOT sent**.
- [ ] Obtain Supabase's written answer on: (a) whether the statement is supported; (b) whether Support will
      execute it and the **executing PostgreSQL role**/authority; (c) the supported **rollback** method;
      (d) the **audit evidence** available; (e) any **platform dependency/side effect**; (f) that
      `graphql`/`graphql_public` remain untouched; (g) who owns future public tables (necessity question).
- [ ] Confirm the **target** is `yav2-dev` / `ogjrwemjefvccpyjwxuo` (never `zcszesuvjrryxtigjglt`).
- [ ] Confirm the **exact SQL** (single statement) and its **rollback** (exact inverse) — hashes recorded.
- [ ] Confirm the **statement-level rollback** works via the same channel **before** proceeding (PITR is
      DR-only, not the primary rollback).
- [ ] Require the **mandatory evidence set** (`…_MANDATORY_EXECUTION_EVIDENCE.md`) pre-run and post-run.
- [ ] Reaffirm exclusions: no existing-table change, no `postgres`-default change, no data privileges, no
      `graphql`/`graphql_public`, no Stage B, no V1/Production.
- [ ] If considering **Part A early execution**, record an **express risk acceptance** of every item in §6.3.

---

## 10. Boundary confirmation

| Control | Status |
|---|---|
| No Supabase / MCP DB access | ✔ |
| No SQL executed; no privilege changed | ✔ |
| No credentials / service-role keys used | ✔ |
| No migration created or run | ✔ |
| No deployment | ✔ |
| PR #35 untouched; no branch/worktree deleted | ✔ |
| V1/Production referenced only as prohibited | ✔ |
| Support request **drafted, NOT sent** | ✔ |

---

## 11. Consolidated recommendation

The supported mechanism for Part B is **provisionally identified as Supabase Support-assisted execution
(route 3.5, CONDITIONALLY SUPPORTED)**, with a possible **self-service owner-authority path (route 3.6,
UNKNOWN)** as a fallback. **All customer-invocable database routes are UNSUPPORTED** for this command because
they execute as `postgres`, which F2 proved ineligible; platform ownership does not confer `supabase_admin`
membership. Because the route depends on **Supabase's confirmation** of method, role, and reversibility (and on
the §5 necessity question), Part B **cannot be authorised for execution from this discovery alone**.

**Governing path:** **do not execute Part A or Part B until Supabase confirms the Part B mechanism** (§6.0);
**send the drafted Support request** (separate PJ authorisation); then, once confirmed, run a **coordinated
window with Part B first → verify → Part A → full post-verification → close Stage A only when both PASS**
(§6.1). Part B first is preferred because it is the uncertain external-authority step, and testing it first
avoids altering Part A only to find Part B cannot be completed; a Part B failure leaves the database at the
known pre-Stage-A baseline (§6.2). **Part A early execution is available only under an express PJ risk
acceptance** (§6.3). The **primary Part B rollback is the exact-inverse `GRANT` via the confirmed mechanism**;
PITR is DR-only and unverified here.
