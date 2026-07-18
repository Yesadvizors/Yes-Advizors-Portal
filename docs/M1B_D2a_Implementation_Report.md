# YAV2 Portal V2 — Module 1 — **M1-B D2a Implementation Report** (Rev 2.2)

**Status: AUTHORED — NOT EXECUTED.** This Rev 2.2 package answers the independent
review ruling **HOLD — one final fail-closed authorization correction is required. Do
not execute any SQL.** Rev 2.2 changes **exactly one class of thing** versus Rev 2.1:
security Boolean control-flow checks are made **NULL-safe**. In PostgreSQL `NOT NULL`
evaluates to `NULL`, and a PL/pgSQL `IF` does **not** enter a `NULL` branch, so
`IF NOT fn() THEN raise` denies `FALSE` but **passes on `NULL`** (fail-open). The
caller-active and Admin/Manager gates now use `fn() IS DISTINCT FROM TRUE`; the
post-condition EXECUTE-denial checks use `has_function_privilege(...) IS DISTINCT FROM
FALSE`; and the SECURITY DEFINER post-check uses `IS DISTINCT FROM TRUE`. **All Rev 2.1
substantive decisions are unchanged** (see §J). (Rev 2.1 itself had replaced brittle
`pg_get_function_identity_arguments` string matching with exact OID resolution via
`to_regprocedure`.) Migration `0016` plus its paired rollback and a read-only
verification kit are authored **inside the governed repository**
`D:\Claude\Claude Code\Yes-Advizors-Portal` on branch **`ui/redesign-v1`**. No new
repository was initialised. **No SQL was executed** against any database. Migration
**0014 is unchanged**; V1/Production (`zcszesuvjrryxtigjglt`) was not touched; no D2b
RPC, no D3/D4 migration, no frontend, no compliance generation.

Grounding evidence is the **live catalogue of this repository's own migrations**
(`0005` audit model, `0007` validators + the live `_write_read_audit` writer, `0008`
role helpers) — the source V2 was built from — so the exact live signatures and the
`audit_log` shape are used, not assumed. The connected Supabase MCP still exposes only
V1/Production; live post-execution confirmation is deferred to the read-only kit run by
the authorised executor.

---

## A. Repository placement (review item 1 & 9)

| Artifact | Repository-relative path | Absolute path |
|---|---|---|
| Migration 0016 | `supabase/migrations/0016_m1b_d2a_audit_write_and_lineage.sql` | `D:\Claude\Claude Code\Yes-Advizors-Portal\supabase\migrations\0016_m1b_d2a_audit_write_and_lineage.sql` |
| Paired rollback | `supabase/migrations/0016_m1b_d2a_audit_write_and_lineage_rollback.sql` | `D:\Claude\Claude Code\Yes-Advizors-Portal\supabase\migrations\0016_m1b_d2a_audit_write_and_lineage_rollback.sql` |
| Read-only verification kit | `supabase/verification/M1B_D2a_post_execution_verification_readonly.sql` | `D:\Claude\Claude Code\Yes-Advizors-Portal\supabase\verification\M1B_D2a_post_execution_verification_readonly.sql` |
| This report | `docs/M1B_D2a_Implementation_Report.md` | `D:\Claude\Claude Code\Yes-Advizors-Portal\docs\M1B_D2a_Implementation_Report.md` |

Numbering `0016` is confirmed against `supabase/migrations/` (0014 = FY repair, never
touched; 0015 = M1-A foundation, live). Placement mirrors the **approved M1-A
precedent** (`0015` migration + rollback in `supabase/migrations/`, kit in
`supabase/verification/`).

> **Governance note — `supabase/` is locally git-excluded.** `.git/info/exclude`
> line 7 (`supabase/`) hides untracked files under `supabase/` from `git status`. The
> tracked M1-A artifacts (`0015*`, `M1A_*`) were therefore **force-added** (`git add
> -f`). This Rev 2 package follows the same convention: the three `supabase/` SQL files
> are **staged with `git add -f`** to produce genuine diff evidence, and the report is
> staged from `docs/`. **Nothing is committed** — staging is the evidence step; the
> commit awaits the reviewer's PASS (§ git evidence below).

---

## B. What each review point required and how it was fixed

**(1) Work inside the governed repository, branch `ui/redesign-v1`; no second repo; no
SQL; do not touch 0014 / V1 / frontend / D2b / D3 / D4 / compliance.**
✔ All four artifacts authored under the governed repo on `ui/redesign-v1`. No repo
init. No SQL executed. 0014 files byte-identical (§E). Scope fence in the migration
header; the migration creates only the shared helper (no D2b RPC), the six family
events, and additive lineage/rule columns.

**(2) `audit_write_event` must fail-closed on all authorization checks.**
✔ The helper now, **before any audit insertion**, in order:
1. rejects null `auth.uid()` → `NO_AUTH_CONTEXT`;
2. requires `public.is_active_user()` (exact live signature `is_active_user()
   RETURNS boolean`, 0008) → `NOT_AUTHORISED_INACTIVE`;
3. requires `public.is_admin_or_manager()` (exact live signature
   `is_admin_or_manager() RETURNS boolean`, 0008) → `NOT_AUTHORISED`;
4. derives **and retains** the role via `public.get_app_role_for_user(auth.uid())`
   and sanity-gates it to `admin`/`manager` → `NOT_AUTHORISED_ROLE`.
Rev 1 performed **none** of the active/role checks — this was the central defect.

**(3) Resolve `event_category` from live evidence; no caller-controlled nullable audit
field.** ✔ See § C (full decision + evidence). The caller parameter
`p_event_category` is **removed**; `event_category` is **derived** inside the helper.

**(4) Replace name-based dependency checks with exact signature checks
(`to_regprocedure`).** ✔ Section 0 validates, by exact signature:
`public.audit_validate_event(text,text,text,text,uuid,uuid,jsonb)`,
`public.get_app_role_for_user(uuid)`, `public.is_active_user()`,
`public.is_admin_or_manager()`, and `pg_catalog.gen_random_uuid()` — each via
`to_regprocedure(...) IS NULL` → fail-closed. The helper body calls
`pg_catalog.gen_random_uuid()` (schema-qualified) consistent with the check.

**(5) Expand fail-closed helper post-conditions.** ✔ Section E asserts:
`SECURITY DEFINER = true`; **exact pinned `search_path`** (`proconfig` identical to
`{search_path=pg_catalog, public, pg_temp}`); **approved owner** (= owner of the live
`public.audit_validate_event` definer function, grounded in live evidence, not a
literal); and EXECUTE **false** for `anon`, `authenticated`, and `service_role`
(three-false also proves **PUBLIC** holds no EXECUTE, since `has_function_privilege`
is true when either the role *or* PUBLIC is granted). **service_role decision:** it is
**not granted** — justified because D2b CRUD RPCs are themselves `SECURITY DEFINER` and
invoke this helper as their function owner (who executes regardless of grants); no
direct `service_role` invocation is part of the contract. Granting to nobody is the
most fail-closed posture. (This intentionally tightens Rev 1, which granted
`service_role`.)

**(6) Resolve the inconsistent rerun policy.** ✔ **OPTION A adopted and stated:** the
migration is **single-shot and strictly additive** — it requires the function, all 7
columns, both indexes, **and all six family events** to be **ABSENT**, and aborts
fail-closed on any pre-existing object. The Rev-1 `ON CONFLICT DO NOTHING` and the
"idempotent identical rerun" claim are **removed**; Section B is now a plain `INSERT`
guarded by the Section 0 absence check plus the `audit_event_contract` PK backstop. No
idempotent-rerun language remains anywhere in the package.

**(7) Strengthen live-contract prechecks for `audit_log` bindings incl. types &
nullability.** ✔ Section 0 checks the **exact (column, data_type, is_nullable)** of
every bound `audit_log` column against the live catalogue and fails closed on any
deviation — covering `id`, `event_category`, the actor columns, the client column,
`risk_tier`, `sensitivity_tier`, `metadata`, and the rest. See § C for the binding
correction this exposed.

**(8) Valid-event tests use an existing client UUID selected read-only.** ✔ V4a/V4b/
V4c/V4d bind `(SELECT id FROM public.clients ORDER BY id LIMIT 1)` — a real client PK
UUID selected read-only. No PAN/Aadhaar/contact/name is emitted (an opaque PK id is not
PII). **D1 note:** `audit_validate_event` does **not** itself enforce client existence
(it only checks non-null when `client_requirement='required'`, per 0007); existence is
enforced by the **writer** `audit_write_event`. Per the review directive we still bind a
**real** UUID rather than a synthetic one.

**(9) Correct repository structure + full evidence.** ✔ Paths (§A), full file contents
(in the repo; reproduced/paraphrased here), genuine SHA-256 (§D), parser/structural
results (§F), git branch/status/diff (§G), 0014-unchanged (§E), nothing-executed (§H).

**(10) Package the four complete files in a ZIP.** ✔ See § I.

---

## C. `event_category` — exact decision and evidence (review item 3) + the binding correction (item 7)

**Live evidence gathered from the repository catalogue:**
- **Type / nullability.** `public.audit_log.event_category` is `text` and **NULLABLE**
  (migration `0005_audit_phase4b.sql:23`; no `NOT NULL`, no `CHECK`).
- **Semantic source.** The **only** live audit writer, `public._write_read_audit`
  (`0007_dependency_closure.sql`), sets `event_category` to the **fixed literal
  `'audit'` at the write site**. `event_category` is **not** a column of
  `audit_event_contract`, and **not** a caller input.
- **Consumer.** The Admin audit viewer `src/components/AuditLog.jsx:266` renders it as
  free text (`row.event_category || '—'`); no enum/`CHECK`/filter constrains it.

**Decision.** Remove the arbitrary caller parameter `p_event_category` and **derive**
`event_category` deterministically inside the helper as the **event family** —
`split_part(p_event_name,'.',1)` → `person | identifier | contact | address |
relationship | gst_detail`. This is caller-independent, always non-null, and mirrors the
live precedent of a **write-site-assigned semantic category**, while eliminating the
"unresolved caller-controlled nullable audit field" the review flagged. Verified by kit
**V8**.

**Binding correction this exposed (Rev 1 was structurally broken).** Rev 1's `INSERT`
bound `actor_type / actor_id / actor_role / client_id` — **columns that do not exist**
in the live `audit_log`. The live columns (from `0005` and the live writer
`_write_read_audit` in `0007`) are `initiated_by_type / actor_user_id / actor_service /
actor_app_role / target_user_id / client_uuid`. Rev 1 could **never** have committed
(its own Section 0 column check named the non-existent columns). Rev 2 binds the exact
live columns and satisfies the live `CHECK` constraints: `initiated_by_type='user'` ⇒
`actor_user_id` NOT NULL and `actor_service` NULL (`chk_actor_user`); `risk_tier ∈
{LOW,MEDIUM,HIGH,CRITICAL}`; `sensitivity_tier ∈ {S1,S2,S3,S4}`. Section 0 now verifies
this binding by exact `(column, type, nullability)`.

**`change_type_code` value set (grounded).** The live whitelist
`public.audit_field_format_ok` (`0007`) accepts `CREATED, UPDATED, DELETED, ENABLED,
DISABLED, GRANTED, REVOKED`. The family lifecycle uses `CREATED | UPDATED | DISABLED |
ENABLED`; **`DEACTIVATED` is NOT a valid value** (would be `BAD_FORMAT`) and is used
nowhere as a contract/CHECK value. Optional keys `setting_name_code`,
`old_value_code`, `new_value_code` are whitelisted.

---

## D. File SHA-256 (genuine, recalculated after every revision)

Lowercase hex (`sha256sum`); identical to PowerShell `Get-FileHash -Algorithm SHA256`
(which prints uppercase). Recomputed against the final on-disk bytes of this revision.

| File | SHA-256 |
|---|---|
| `supabase/migrations/0016_m1b_d2a_audit_write_and_lineage.sql` | `a5044b4e2672ebc4d4947a142c82fb5edc546160d806f68b8213c4fbf76f8c40` |
| `supabase/migrations/0016_m1b_d2a_audit_write_and_lineage_rollback.sql` | `83c722704689c889668fcd851578eab3b2c51a9c83794a850fa272d74172a90a` |
| `supabase/verification/M1B_D2a_post_execution_verification_readonly.sql` | `aa4965d2d21df6d82e281b1985111ccd2652bc7c83d6a4bd1848040c89d08842` |

The report's own SHA-256 and a consolidated `SHA256SUMS.txt` (covering all four files)
are delivered alongside the ZIP in the chat response, since a file cannot contain its
own hash.

---

## E. Migration 0014 unchanged (confirmation)

`sha256sum` of the 0014 files is **identical to the pre-work baseline**:

| 0014 file | SHA-256 (unchanged) |
|---|---|
| `supabase/migrations/0014_r4db_financial_year_repair.sql` | `c32c8a0c5843026d2d289dfb639f4c77c92afc1c8b741f4329102c61e03c87ce` |
| `supabase/migrations/0014_r4db_financial_year_repair_rollback.sql` | `d2120091f1ec135a1b3cf599d7da703c14fb345707c38a9635bc2f4293ebc833` |

0014 is referenced only by name in the 0016 header scope-fence ("never touched"); no
executable statement in any artifact reads or writes 0014's objects.

---

## F. Parser / structural results

Static classification (line comments, dollar-quoted bodies and string literals stripped;
split on top-level `;`). Postgres semantic parse (libpg_query) is not available in this
environment; this is a lexical/structural classification. The migration's own
fail-closed Section 0 provides the semantic gate at execution time.

- **Migration** — **16** top-level statements:
  `BEGIN · DO(precheck) · CREATE TEMP(baseline) · CREATE FUNCTION(helper) · COMMENT ·
  REVOKE · CREATE TEMP(events) · INSERT(contract) · ALTER TABLE(add cols) ·
  CREATE INDEX · COMMENT · ALTER TABLE(add cols) · CREATE INDEX · COMMENT ·
  DO(postcheck) · COMMIT`.
  **Top-level DROP/TRUNCATE/DELETE: 0.** The only `INSERT` targets
  `audit_event_contract` (six additive rows); both `ALTER TABLE`s are `ADD COLUMN` only.
  — PASS (additive).
- **Rollback** — **9** top-level statements: `BEGIN · DO(guard) · DROP INDEX ×2 ·
  ALTER TABLE(DROP COLUMN) ×2 · DROP FUNCTION · DELETE(6 family rows) · COMMIT`. Every
  object dropped/deleted is one 0016 created; `DELETE` is scoped to the six family
  events. — PASS (drops are intended in a rollback).
- **Verification kit** — **11** top-level statements, **all `SELECT`** (0 mutating, 0
  DDL). Does **not** call `audit_write_event`. — PASS (read-only).

Safety-token scan (explaining every hit):
- Forbidden ref `zcszesuvjrryxtigjglt`: appears **only** in the migration header
  scope-fence comment; **no executable reference**; absent from rollback and kit.
- `DEACTIVATED`: appears **only** in migration comments documenting that it is *not* a
  valid value; never in a contract row or CHECK; absent from rollback and kit.
- `aadhaar`: appears **only** in header/kit comments asserting no Aadhaar is touched;
  no Aadhaar column is read or written.
- `CHANGE` + `permitted_actions`: co-occur only because comments state `CHANGE` is not
  permitted (migration) and the kit V3/V4d *verify* `CHANGE` is rejected. The six
  `permitted_actions` array literals contain **only** `CREATE`/`UPDATE` — no array
  contains `CHANGE`.
- `generate_client_compliance` / `activate_accounting_service` / `runComplianceSetup`:
  **absent** from all files.

**Rev 2.2 NULL-safe authorization scan.** Every security Boolean control-flow check in
the three files was audited for fail-open-on-NULL:
- **Converted to NULL-safe** (were fail-open): `is_active_user()` and
  `is_admin_or_manager()` gates → `IS DISTINCT FROM TRUE`; the three post-condition
  `has_function_privilege(...)` EXECUTE-denial checks → `IS DISTINCT FROM FALSE`; the
  SECURITY DEFINER post-check → `IS DISTINCT FROM TRUE`.
- **Already NULL-safe, left unchanged** (verified): all `IS NULL` / `IS NOT NULL` /
  `IS DISTINCT FROM` guards; the role gate `v_actor_role IS NULL OR NOT IN (...)`; the
  validator gate `v_reject IS NOT NULL AND v_reject <> ''` (NULL = success by the
  `audit_validate_event` contract); `IF NOT FOUND` (PL/pgSQL guarantees `FOUND` is
  non-NULL); the `count(*) <> n` structural comparisons (`count(*)` never NULL);
  `IF EXISTS(...)` (never NULL); the rollback's `current_setting(...) IS DISTINCT FROM`.
- **Verification kit:** contains **no `IF`-based security gate** (read-only); its
  Boolean outputs are evidence values. A NULL-safe roll-up
  (`execute_all_denied_nullsafe_expect_true`) was added to V1 to mirror the migration's
  `IS DISTINCT FROM FALSE` posture.
- A post-edit scan confirms **no bare `IF NOT fn()` or `IF has_function_privilege(...)
  THEN` security pattern remains**.

---

## G. Git evidence

- **Branch:** `ui/redesign-v1`.
- **`supabase/` is locally excluded** (`.git/info/exclude` line 7), matching how the
  approved M1-A artifacts were tracked (force-added). The three `supabase/` SQL files
  are staged with `git add -f`; the report is staged from `docs/`. **No commit is
  made** — staging is the evidence step; the commit awaits the reviewer's PASS.
- `git status --short`, `git diff --cached --stat`, and the full `git diff --cached` for
  each new artifact are captured and delivered in the chat response accompanying this
  report (they reflect the staged additions of exactly these four files and nothing
  else).

---

## H. Confirmation — nothing executed

No SQL was run against any Supabase project. The connected MCP exposes only
V1/Production (`zcszesuvjrryxtigjglt`), which was neither queried nor modified. All live
confirmation (helper existence/definer/owner/grants, six events, columns, indexes,
validator behaviour, unchanged counts) is **pending** the executor running `0016`
followed by `M1B_D2a_post_execution_verification_readonly.sql` on V2
(`ogjrwemjefvccpyjwxuo`) after this Rev 2.2 is ruled PASS.

---

## I. ZIP package (review item 10)

The four complete files are packaged for independent hash + content verification:
`M1B_D2a_Rev2.2_package.zip` (delivered in the chat response), containing the migration,
the paired rollback, the read-only verification kit, and this report, plus a
`SHA256SUMS.txt` over all four and the `git diff --cached` patch. Not truncated — full
file contents.

---

## J. Rev 2.1 substantive decisions — carried forward UNCHANGED (review item 3)

Rev 2.2 is a NULL-safety hardening of security Boolean control flow only. The following
decisions are unchanged in intent and implementation:

1. **Exact live `audit_log` bindings** — `initiated_by_type / actor_user_id /
   actor_service / actor_app_role / target_user_id / client_uuid / …`, prechecked by
   `(column, type, nullability)`.
2. **Active-user + Admin/Manager checks** — `is_active_user()` then
   `is_admin_or_manager()`, both fail-closed before any insert (Rev 2.2 makes the
   predicates NULL-safe: `IS DISTINCT FROM TRUE`), plus the derived-role sanity gate.
3. **Derived `event_category`** — `split_part(event_name,'.',1)`; no caller parameter.
4. **Exact OID dependency resolution** — `to_regprocedure(...)` for
   `audit_validate_event`, `get_app_role_for_user`, `is_active_user`,
   `is_admin_or_manager`, `pg_catalog.gen_random_uuid`, and for every function-identity
   lookup in the post-conditions and kit.
5. **No PUBLIC/anon/authenticated/service_role EXECUTE** — REVOKE from all; none
   granted.
6. **Strict single-shot rerun policy (Option A)** — function/columns/indexes/all six
   events must be absent; no `ON CONFLICT`, no idempotent-rerun claim.
7. **No D2b / D3 / D4** authored; **nothing executed.**

Only the *NULL-safety of the security Boolean control flow* changed in Rev 2.2. No
authorization semantics (who is allowed), binding, contract, grant, OID-resolution, or
scope decision moved — the gates now simply also deny the `NULL`/indeterminate case.

---

**M1-B remains STOPPED at D2a authoring. Migration 0016 is authored, NOT executed.
0014 / V1 / Production untouched; D2b RPCs and D3/D4 migrations NOT authored. Awaiting
independent approval before any SQL execution.**
