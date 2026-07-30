# YAV2 Portal V2 — SECURITY DEFINER `search_path` Review

**Discrepancy area:** 3 of 3 — the 10 functions observed live with `search_path = public, pg_temp`.
**Basis:** static read of governing definitions in `supabase/migrations/0008` and `0014`, **corroborated by
the live SELECT-only run** (PJ-executed, 2026-07-30 11:15 IST). **No SQL executed by Claude; no function
altered; no migration created.**
**Governing baseline:** `sync/integration` @ `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`.
**Live evidence — PRIMARY (exact):** `docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_EXACT_2026-07-30_1115_IST.json` (complete raw Supabase output). **Convenience summary only:** `…/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_SUMMARY_2026-07-30_1115_IST.json` (Claude-prepared; not raw/exact).

> **STATUS: CLOSED (setting comparison).** The live run confirmed all 10 SECURITY DEFINER functions carry
> `search_path = public, pg_temp` — the **live `search_path` configuration matches the governing repository
> setting**, with no divergence. This is a `search_path`-**setting** comparison (not a normalized
> full-definition/body diff). **Future hardening — pin `pg_catalog` first — is RETAINED** as a non-urgent
> recommendation (currently safe because the live run confirmed anon/authenticated cannot CREATE in public).

---

## 1. Live observation vs governing source — the headline

The reconciliation observed these 10 functions live with `search_path = public, pg_temp`:

`activate_accounting_service`, `ensure_financial_year_horizon`, `expected_backfill_start_fy`,
`generate_client_compliance`, `generate_client_compliance_core`, `get_current_fy`, `get_my_role`,
`get_my_team_id`, `is_admin`, `resolve_client_start_fy`.

**Every one of them is defined in the governing repository source with the same
`SET search_path TO 'public', 'pg_temp'` setting.** On the live-observed value, the **live `search_path`
configuration matches the governing repository setting** for all 10 — there is **no live/repository
divergence** in the `search_path` setting. (This is a comparison of the `search_path` *setting*, confirmed
live at [F1]/[F2]; it is **not** a normalized full-definition/body comparison — see §3.)

> Note these are **not** the three bare-`'public'` helpers (`get_portal_role`, `is_active_user`,
> `is_admin_or_manager`) that were the subject of the earlier V-4 hardening line. Those pin a *1-element*
> `'public'`; the 10 here pin the *2-element* `'public', 'pg_temp'`. Different set, different finding.

---

## 2. Governing source, function by function

Governing = highest-numbered forward migration that `CREATE [OR REPLACE]`s the function. (The
`0014_..._rollback.sql` re-definitions of `activate_accounting_service`/`generate_client_compliance` are an
**undo** script, not part of the forward sequence, so the forward `0014` file governs.)

| # | Function | Governing def (file:line) | Lang | SECURITY | Volatility | `search_path` (exact) | EXECUTE grant |
|---|---|---|---|---|---|---|---|
| 1 | `activate_accounting_service` | `0014:645` (also `0008:127`) | plpgsql | DEFINER | VOLATILE (default) | `'public', 'pg_temp'` | REVOKE ALL FROM PUBLIC,anon (`0014:1144`); **GRANT → authenticated, service_role** (`0014:1146`) |
| 2 | `ensure_financial_year_horizon` | `0014:263` | plpgsql | DEFINER | VOLATILE (default) | `'public', 'pg_temp'` | REVOKE ALL FROM PUBLIC,anon,authenticated,service_role (`0014:1092`) — no grant |
| 3 | `expected_backfill_start_fy` | `0014:567` | sql | DEFINER | STABLE | `'public', 'pg_temp'` | REVOKE ALL (all roles) (`0014:1111`) — no grant |
| 4 | `generate_client_compliance` | `0014:998` (also `0008:158`) | plpgsql | DEFINER | VOLATILE (default) | `'public', 'pg_temp'` | REVOKE ALL FROM PUBLIC,anon (`0014:1137`); **GRANT → authenticated, service_role** (`0014:1140`) |
| 5 | `generate_client_compliance_core` | `0014:737` | plpgsql | DEFINER | VOLATILE (default) | `'public', 'pg_temp'` | REVOKE ALL (all roles) (`0014:1097`) — no grant |
| 6 | `get_current_fy` | `0014:422` | plpgsql | DEFINER | STABLE | `'public', 'pg_temp'` | REVOKE ALL (all roles) (`0014:1102`) — no grant |
| 7 | `get_my_role` | `0008:56` | sql | DEFINER | STABLE | `'public', 'pg_temp'` | none in migrations (see §3 note) |
| 8 | `get_my_team_id` | `0008:66` | sql | DEFINER | STABLE | `'public', 'pg_temp'` | none in migrations |
| 9 | `is_admin` | `0008:99` | sql | DEFINER | STABLE | `'public', 'pg_temp'` | none in migrations |
| 10 | `resolve_client_start_fy` | `0014:510` | plpgsql | DEFINER | STABLE | `'public', 'pg_temp'` | REVOKE ALL (all roles) (`0014:1108`) — no grant |

All `0014` functions also `ALTER FUNCTION … OWNER TO postgres`.

---

## 3. Classification of each function

Classes: **(a)** intended & accepted · **(b)** future hardening recommended · **(c)** live/repository
divergence · **(d)** insufficient evidence.

**All 10 → (a) *intended and accepted*, with a shared (b) *future-hardening* recommendation.**

- **(a) intended and accepted** — for every function the `search_path` is **explicitly pinned** (not
  caller-controlled) and the **live `search_path` configuration matches the governing repository setting**
  (`'public', 'pg_temp'`). There is no unpinned definer here; the caller cannot influence name resolution.
  (This is a `search_path`-setting comparison, not a normalized full-definition diff.)
- **(b) future hardening recommended** — the pin omits `pg_catalog`, so `public` is searched **before** the
  system catalog. The stricter, condition-independent convention (already used by the `0016/0017/0021/0022`
  functions, which pin `'pg_catalog', 'public', 'pg_temp'`) is to put `pg_catalog` **first**. Normalising
  these 10 to `pg_catalog, public, pg_temp` removes any dependency on the §4 mitigation and makes the whole
  fleet consistent.
- **(c) live/repository divergence — NONE (CONFIRMED LIVE).** The live run ([F1]/[F2]) confirmed all 10
  carry `search_path = public, pg_temp`; zero `DIVERGENT_OTHER`/`UNPINNED`. Setting comparison **CLOSED**.
- **(d) insufficient evidence — NONE.** The live `proconfig` dump ([F1]/[F2]) settled the setting-level
  comparison. (A normalized full-definition/body diff was not performed and is not required for this
  discrepancy; it remains an optional deeper check.)

**Note on grants for `get_my_role` / `get_my_team_id` / `is_admin` (`0008`):** the migrations issue no
explicit EXECUTE grant/revoke for these, so under the Supabase default they may carry PUBLIC/anon EXECUTE.
This is the *grant* question tracked separately as **G-05** (prior live evidence enumerated these three
among 17 functions with PUBLIC+anon EXECUTE — a **confirmed HIGH** variance, not remediated). It is
**orthogonal to `search_path`**: it does not change the (a) search_path classification, and it is recorded
here only so the two lines of enquiry are not conflated. Block **[F3]** re-enumerates EXECUTE on all 10.

---

## 4. Should `pg_catalog` be pinned first? — the security reasoning

A pinned `search_path` is **not** categorically injection-safe. Pinning removes the *caller-controlled*
path attack, but a pin that searches `public` before `pg_catalog` is safe **only on the condition** that
untrusted roles cannot **create or replace** objects (functions, operators, types) in `public` to *shadow*
a built-in the function relies on.

- **Current mitigation (must confirm live at [G8]/[G8b]):** prior evidence recorded public-schema `CREATE`
  locked to `pg_database_owner` — i.e. `anon`/`authenticated` **cannot** create objects in `public`. On
  that condition the `public`-first pin is **currently safe**: there is no untrusted writer to plant a
  shadowing object. This is why the classification is **(b) hardening**, not **(c)/(d) defect**.
- **Why still pin `pg_catalog` first (recommendation):** it makes safety **independent** of that condition.
  If a future change ever granted `CREATE ON SCHEMA public` to a broader role, a `public`-first definer
  would immediately become shadowing-exploitable, whereas a `pg_catalog`-first definer would not. It also
  aligns the 10 with the rest of the fleet (`0016/0017/0021/0022`).

**Assessment:** `pg_catalog` **should** be pinned first as the target end-state. It is **not urgent** while
[G8]/[G8b] confirm `public` CREATE is locked, but it is the correct hardening and removes a latent
condition. Any repin is a live `CREATE OR REPLACE` (DDL) — **out of scope here**; proposal only.

---

## 5. Read-only verification SQL (proposals only — no ALTER, no migration)

| Block | Proves | Expected |
|---|---|---|
| **[F1]** | Live `proconfig`, `prosecdef`, owner, volatility, identity args for the 10 | all pin `search_path`, all SECURITY DEFINER, owner `postgres` |
| **[F2]** | Per-function classification of the live `search_path` | all `MATCH_REPO_PGTEMP`; **0** `UNPINNED`/`DIVERGENT_OTHER` |
| **[F3]** | EXECUTE grants on the 10 (aclexplode, PUBLIC preserved) | grants only on `generate_client_compliance` + `activate_accounting_service`; flag any anon/PUBLIC (G-05) |
| **[F4]** | Fleet-wide: every SECURITY DEFINER fn whose `search_path` is not `pg_catalog`-first | scopes the hardening list (the 10 + any others on `public, pg_temp`) |
| **[G8]/[G8b]** | public-schema CREATE privilege | anon/authenticated **cannot** CREATE (the §4 condition) |

All are `SELECT`/`WITH` only and invoke no application function.

---

## 6. Recommendations (future hardening — none applied)

1. **Repin the 10 (and any [F4] siblings) to `pg_catalog, public, pg_temp`** via a future PJ-authorised
   `CREATE OR REPLACE` migration, for condition-independent safety and fleet consistency. Not urgent while
   [G8] holds; correct end-state regardless.
2. **Do not conflate with G-05.** The PUBLIC/anon EXECUTE variance on `get_my_role`/`get_my_team_id`/
   `is_admin` (and 14 others) is a separate, already-recorded HIGH item; `search_path` is sound for all 10.
3. **Keep the [G8]/[G8b] CREATE-lock check in periodic review** — it is the load-bearing precondition for
   the current `public`-first pin being safe.
