# T4 — Remediation Design (read-only planning) for confirmed T3 variances

**Status:** DESIGN ONLY — no SQL executed, no Supabase access, no app change, no commit. All `.sql` here are **PROPOSED / NOT APPLIED**.
**Basis:** committed T3 reconciliation evidence (`supabase/verification/evidence/t3-live-reconciliation/`) at the **current governing integration HEAD `9b6a077e445736cfed3c973b6f23a4b76586816f`** (`sync/integration`). The repository source analysed (migrations `0001–0022`) is unchanged from the **pre-T3 source baseline `766993936a415837d5865e9dc00fbbd57b34e16a`** (PR #34 merge) — that SHA is the underlying source baseline, **not** the current package HEAD.
**Authorised project (for eventual PJ-run execution):** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` ONLY · **Prohibited:** V1 `zcszesuvjrryxtigjglt`.
**Next forward migration numbers:** present up to `0022`; next = **`0023`, `0024`** (gaps `0012/0013/0019/0020` must never be reused).

---

## A. The exact 17 functions with current grantees (from committed T3 live evidence `05a`; re-confirmed live by the SELECT-only PRE-2 check immediately before execution)
All 17 currently grant `EXECUTE` to **`PUBLIC, anon, authenticated, postgres, service_role`**. Split by role (drives minimum access, §B):

**Group A — internal audit-pipeline helpers (6) — DEFINER, caller-unreachable by design:**
| Function (signature) | Sec |
|---|---|
| `_record_audit_failure(text, text, text[], text)` | DEFINER |
| `_write_read_audit(text, uuid, jsonb)` | DEFINER |
| `audit_contains_secret(text)` | DEFINER |
| `audit_field_format_ok(text, jsonb)` | DEFINER |
| `audit_is_uuid(text)` | DEFINER |
| `audit_validate_event(text, text, text, text, uuid, uuid, jsonb)` | DEFINER |

**Group B — role/calc/sensitive functions (11) — must stay callable by `authenticated`:**
| Function (signature) | Sec | Why authenticated is required |
|---|---|---|
| `get_app_role()` | DEFINER | evaluated inside RLS policies (querying role = authenticated) |
| `get_app_role_for_user(uuid)` | DEFINER | RLS / role resolution |
| `get_my_role()` | DEFINER | RLS / role resolution |
| `get_my_team_id()` | DEFINER | RLS / role resolution |
| `get_portal_role()` | DEFINER | RLS / role resolution |
| `is_active_user()` | DEFINER | RLS gate |
| `is_admin()` | DEFINER | RLS / gate |
| `is_admin_or_manager()` | DEFINER | RLS write-gate on client-master/P5 tables |
| `calc_gst_due_date(text, month_enum, integer)` | INVOKER | called inside `generate_client_compliance` (INVOKER, run as authenticated) |
| `get_client_start_fy(date)` | INVOKER | called at `0008_functions_rpc.sql:169` inside INVOKER compliance fn |
| `get_sensitive_audit_logs(timestamptz, timestamptz, integer, integer, text, uuid)` | DEFINER | **called by the app** (`AuditLog.jsx:344,364`) as authenticated; in-body `auth.uid()`+`get_app_role()='admin'` gate |

## B. Minimum required role access (target end-state)
- **Group A (6):** callable **only via the SECURITY DEFINER chain** (a definer function runs as its **owner**, so an end-caller does not need EXECUTE). → **REVOKE from PUBLIC, anon, authenticated, service_role** (mirrors the existing `audit_write_event` pattern).
- **Group B (11):** **REVOKE from PUBLIC and anon; RETAIN `authenticated`.** `service_role` is decided **per function** in §B2 (not retained by default). This removes the anonymous/public attack surface while preserving RLS evaluation, compliance generation, and the Audit Log UI.

### B1. Function-owner privileges are UNAFFECTED by REVOKE (explicit)
`REVOKE … FROM PUBLIC, anon, authenticated, service_role` removes grants **only from those named roles/PUBLIC**. The **function owner** (the role that created it — `postgres`/the migration role) **retains full privileges implicitly**; owner privileges are not expressed as ACL grants and cannot be removed by a `REVOKE … FROM <role>`. Therefore the SECURITY DEFINER chain (which executes as the owner) continues to work after every REVOKE in `0023`. No statement in `0023` alters ownership.

### B2. `service_role` — exact per-function justification (NOT retained by default)
`service_role` is Supabase's server-side role (BYPASSRLS); the browser never uses it. No Edge Function is deployed (0/… live) and no in-repo server code calls any of these 17 → **there is no demonstrated `service_role` caller**. Decision per function:
| Function | service_role decision | Justification |
|---|---|---|
| all 6 Group-A helpers | **REVOKE** | internal, definer-chain-only; no direct server caller |
| `get_app_role`, `get_my_role`, `get_my_team_id`, `get_portal_role`, `is_active_user`, `is_admin`, `is_admin_or_manager` | **REVOKE** | resolve identity from `auth.uid()`/current context → meaningless under `service_role`; no server caller |
| `get_sensitive_audit_logs` | **REVOKE** | in-body gate requires `auth.uid()`+`get_app_role()='admin'`; under `service_role` there is no `auth.uid()` → the function fail-closes, so `service_role` EXECUTE is functionally dead. App uses `authenticated`. |
| `calc_gst_due_date`, `get_client_start_fy` | **REVOKE** | pure calculation; no server caller |
| `get_app_role_for_user(uuid)` | **REVOKE (PJ-flag)** | context-independent (explicit uuid) so a *future* admin/server tool could legitimately call it via `service_role`; none exists today → revoke now, **re-grant specifically** only if such a consumer is added |
**End-state: `service_role` is revoked from all 17** (justified above), not kept by default. If PJ identifies a real server-side consumer for any function, that function's `service_role` grant is restored explicitly with the caller documented.

## C. Application callers & breakage analysis (frontend `.rpc`/`.from` scan)
The frontend makes only **3 RPC calls total**: `get_sensitive_audit_logs` (×2), `generate_client_compliance` (×2), `activate_accounting_service` (×1). Of the 17:
- **Only `get_sensitive_audit_logs` is called directly** (`AuditLog.jsx`) — retains `authenticated` → **no expected breakage** (source-side; to be confirmed at runtime by the step-6 smoke).
- `is_admin`/`is_admin_or_manager` appear in `src` only as the **`user.is_admin` field read** and in **comments** — **not** RPC calls → revoking PUBLIC/anon does not touch the app.
- The other 15 are server-internal (RLS/definer/INVOKER-compliance) → not called by the browser.
- **Breakage risk (source-side assessment): LOW** — the only app interaction with this set is `get_sensitive_audit_logs`, which keeps `authenticated`. **Final confirmation is the step-6 runtime smoke, not asserted here as a live-verified result.**

### C1. Group-A (6 internal helpers) — full dependency analysis (every reachability class)
Because Group A additionally revokes `authenticated`, its reachability is analysed across **all** call paths. **Source-side dependency findings are complete. Live V2 confirmation remains pending the authorised SELECT-only PRE-3 checks immediately before execution.** The source-side expectation (to be confirmed by PRE-3, `3a–3d`) is:
| Reachability class | How checked | Source-side expectation (to be confirmed live by PRE-3) |
|---|---|---|
| **SECURITY DEFINER functions** calling a Group-A helper | PRE-3a (function-body regex, annotated with caller security) | Present — e.g. `audit_write_event`, `get_sensitive_audit_logs`, the audit pipeline. **Runs as owner → does NOT require the end-caller to hold EXECUTE** ⇒ safe to revoke `authenticated`. |
| **SECURITY INVOKER functions** calling a Group-A helper | PRE-3a (rows where `caller_security = INVOKER`) | **None expected.** If any appears AND it is EXECUTE-granted to `authenticated`/`anon`, that end-caller WOULD need EXECUTE → then keep the minimum grant for that specific helper. **This is the blocking condition.** |
| **RLS policies** referencing a Group-A helper | PRE-3b (`pg_policy` USING/WITH CHECK) | **None expected** (audit helpers are not used in policy predicates; policies use the role helpers). |
| **Triggers / trigger functions** referencing a Group-A helper | PRE-3c (`pg_trigger` → trigger fn body) | Audit-lineage triggers may invoke the pipeline **via SECURITY DEFINER** functions (run as owner → safe). No Group-A helper is itself a trigger function (they return `void/uuid/boolean/text`, not `trigger`). |
| **Application RPC references** | repo scan `grep -r "\.rpc(" src` (SQL cannot see the app) | **None** — the frontend calls only `get_sensitive_audit_logs`, `generate_client_compliance`, `activate_accounting_service`; **no Group-A helper**. |
| **Other externally reachable functions** | PRE-3a `caller_grantees` column | Any caller granted to `authenticated`/`anon`/PUBLIC is surfaced; if such a caller is **INVOKER** and calls a Group-A helper, hold `authenticated` for that helper. |
**Blocking rule:** revoke `authenticated` from a Group-A helper **only if** PRE-3 returns no INVOKER function-body caller, no RLS policy, and no INVOKER trigger-function referencing it. Otherwise retain the minimum grant that the reachable INVOKER path requires.

## D. `get_sensitive_audit_logs` access model — RECOMMENDATION
**Authenticated-only, relying on the existing in-body admin gate.** The browser authenticates with the anon/JWT (`authenticated` role) — it **never** uses `service_role`. A service-role-only model would **break the Audit Log for admins**. The function already enforces `auth.uid()` non-null **and** `get_app_role() = 'admin'` internally with fail-closed read-audit, so `authenticated` EXECUTE + in-body gate is the correct least-privilege model. → **REVOKE PUBLIC, anon, service_role; KEEP authenticated.** (Do **not** make it service-role-only — `service_role` has no `auth.uid()`, so the in-body admin gate fail-closes and `service_role` EXECUTE is dead; see §B2.)

## E. Every `v_team_workload` reference (traced)
- **Frontend (1, live):** `src/components/Compliance.jsx:1262` — `supabase.from('v_team_workload').select('*')`, inside a `Promise.all([...])`; the result is destructured as `t` but the following line uses only `d` (`setData(d||[])`) → **the returned data appears unused**; with the relation absent live, this select returns an error that the code does not consume.
- **Source (DEFER notes only):** `0009_views.sql:211`, `0011_storage_and_edge_DEFER.sql:29` — explicitly ADD/DEFER, never authored. No `CREATE VIEW v_team_workload` anywhere.
- Live: absent (`06_views_and_relation_absence.md` → `v_team_workload_present = 0`).

## F. `v_team_workload` — RECOMMENDATION
**Primary: remove/neutralise the unused frontend reference** (drop the `v_team_workload` select in `Compliance.jsx`), because (a) there is **no column spec** to author a faithful view, and (b) the returned data is **not consumed**. This is a **`src/**` change owned by T2** and requires separate authorisation.
**Alternative (if the team-workload feature IS wanted — a product decision):** author `v_team_workload` in a new migration **only after PJ supplies the column spec** (what workload metrics per team member). **Do not invent a schema.**
→ **Business decision required (see §I / decisions).** No migration is proposed for G-11 until the author-vs-remove decision is made.

## G. The exact three bare-`'public'` helpers (V-4) + hardening
Live `proconfig` = `search_path=public` for exactly: **`get_portal_role()`, `is_active_user()`, `is_admin_or_manager()`**. Proposed: repin to **`pg_catalog, public, pg_temp`** (built-ins resolve first; condition-independent hardening). Benign today (live public-schema CREATE is locked to `pg_database_owner`), so **LOW** priority defence-in-depth. → `0024_search_path_hardening.PROPOSED.sql`.

## H. Deliverables (in this folder)
- **Implementation plan** — this doc (§execution order below).
- **Proposed migration SQL** — `0023_grants_hardening.PROPOSED.sql` (G-05), `0024_search_path_hardening.PROPOSED.sql` (V-4).
- **Rollback SQL** — `0023_grants_hardening.ROLLBACK.PROPOSED.sql`, `0024_search_path_hardening.ROLLBACK.PROPOSED.sql`.
- **Pre-execution checks + post-execution verification** — `PRE_AND_POST_VERIFICATION.sql` (read-only SELECT/catalog only).
- **Evidence template** — `EVIDENCE_TEMPLATE.md`.
- **Risk matrix / execution order / structure** — below.

### Risk matrix
| Change | Likelihood of breakage | Impact | Mitigation |
|---|---|---|---|
| 0023 Group A (revoke incl. authenticated on 6 internal helpers) | LOW | Audit pipeline error **if** an INVOKER/policy caller exists | **Pre-check PRE-3** (no INVOKER/policy caller) before running; if any found, keep `authenticated` for that one |
| 0023 Group B (revoke PUBLIC/anon on 11, keep authenticated) | LOW | anon/pre-login flows lose these (they shouldn't use them) | `get_sensitive_audit_logs` keeps authenticated → Audit Log OK; post-verify grants |
| 0024 V-4 repin (3 helpers) | VERY LOW | none expected (adds `pg_catalog`/`pg_temp`) | post-verify `proconfig`; functions already resolve under `public` |
| G-11 (view author OR app change) | depends on decision | app query currently no-ops on missing view | business decision first; if remove-reference → T2 change + runtime smoke |

### Exact execution order (all live steps are PJ-authorised separately; design only here)
1. **PRE-checks** (read-only): confirm V2 ref; snapshot the 17 grantees + the 3 `proconfig`; **PRE-3** confirm no INVOKER/policy caller of the 6 Group-A helpers.
2. **Apply `0023`** (G-05, HIGH) — biggest security gain, isolated.
3. **POST-verify `0023`** (grantee query → expected end-state).
4. **Apply `0024`** (V-4, LOW).
5. **POST-verify `0024`** (`proconfig` → all pinned incl. the 3 repinned).
6. **Runtime smoke** (T2/PJ, approved creds): Audit Log loads for admin; denied for non-admin.
7. **G-11** — separate track after the author-vs-remove decision.

## I. One migration or separated by risk? — RECOMMENDATION: **SEPARATE by risk area**
- **`0023` = G-05 grant revocations** (HIGH, security-critical) — isolated so it can be reviewed, applied, verified, and rolled back **independently**.
- **`0024` = V-4 `search_path` repin** (**LOW-severity defence-in-depth security hardening**) — separate so a low-priority change never gates or endangers the high-priority security fix.
- **G-11 = its own track** — either a schema-authoring migration (needs column spec) or a T2 `src/**` change (remove reference); different ownership/review path and a **product decision**; do **not** bundle it with the security migrations.

## Unresolved business decisions requiring PJ approval
1. **G-11 direction:** remove the unused `Compliance.jsx` reference (recommended, low-risk) **or** author `v_team_workload` (requires PJ to supply the column/metric spec) **or** keep deferred.
2. **Group A scope:** approve revoking `authenticated` from the 6 internal audit helpers **subject to** the PRE-3 live checks finding no INVOKER/policy/trigger caller (if one exists, that helper keeps `authenticated`).
3. **`get_sensitive_audit_logs` model:** confirm **authenticated-only + in-body admin gate** (recommended) rather than any tighter model.
4. **`service_role` (per §B2):** approve **revoking `service_role` from all 17** (design default, justified per function) — in particular confirm the single flagged case `get_app_role_for_user(uuid)` should be revoked now and re-granted only if a future admin/server tool is added.
5. **Sequencing/authorisation** of the actual live run (PJ executes; T4 executes nothing).

## Governance footer
```
Governing Issue: #23 · Current governing integration HEAD: 9b6a077e445736cfed3c973b6f23a4b76586816f (sync/integration) · Pre-T3 source baseline: 766993936a415837d5865e9dc00fbbd57b34e16a (PR #34)
Package: T4 remediation DESIGN (read-only) · Migrations 0023/0024 PROPOSED — NOT APPLIED
SQL executed: NONE · Supabase access: NONE · V1 access: NONE · App change: NONE · Commit/Push/PR/Merge/Deploy: NONE
Closed T3 package: UNCHANGED
```
