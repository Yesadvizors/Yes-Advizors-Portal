# YAV2 Portal V2 — Stage A — Pre-Run Checklist

> ## PATH 2 — SPLIT EXECUTION SELECTED (2026-07-30)
> F2: `cu_is_superuser=false`, `eligible_for_postgres_default_alter=true`,
> `eligible_for_supabase_admin_default_alter=false`. **PATH 1 rejected; PATH 3 not selected; execution
> UNAUTHORISED.** **Part A** = existing-table REVOKEs + `postgres` default (eligible). **Part B** =
> `supabase_admin` default only (current identity **INELIGIBLE** → Supabase-supported mechanism, separate PJ
> approval/evidence). **No combined atomic path permitted.** Part A is **not** full closure; future-table
> protection stays **INCOMPLETE** until Part B PASSES. Full Stage A closure needs **both** Part A PASS **and**
> Part B PASS. **A1–F1 evidence still required. Stage B EXCLUDED.** Old combined candidates **SUPERSEDED**.

**Status:** **READINESS DOCUMENT — no Supabase access, no SQL executed.** Every check below is performed by
the operator **at execution time under separate PJ authorisation** in `yav2-dev` only.
**Scope:** Stage A only (anon object-level `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`). Stage B out of scope.
**Governing:** `sync/integration` @ `370dd95d470bf1baa096f61a64409dd1259e2a04`.
**Authorised env:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.

> Every item must PASS. **Any single FAIL = hard STOP** — do not execute Stage A.

---

## A. Target / environment
- [ ] **Project/ref confirmed** = `yav2-dev` / `ogjrwemjefvccpyjwxuo` (read the Supabase Editor header).
- [ ] **NOT** V1/Production (`zcszesuvjrryxtigjglt`) — if seen, **STOP immediately**.
- [ ] Executing role and its memberships noted (`postgres`? `supabase_admin`?) per the Execution-Role &
      Authority Decision doc.

## B. Branch / SHA / tree
- [ ] Governing branch `sync/integration` @ `370dd95d470bf1baa096f61a64409dd1259e2a04`.
- [ ] Readiness candidate matches the reviewed file (SHA recorded in the review package).
- [ ] Local working tree clean; no uncommitted changes.

## C. Backup / export expectations
- [ ] A point-in-time reference is available (Supabase automatic backup / PITR for `yav2-dev`), so the
      change is reversible beyond the SQL rollback.
- [ ] The **rollback candidate** (`…_ROLLBACK_CANDIDATE.sql`) is on hand and reviewed.
- [ ] Grants are metadata (no data rows change), so no data export is required; the ACL state is the thing
      being changed and is restorable via rollback + PITR.

## D. Baseline catalog checks (run the SELECT-only kit; record raw output)
Run `supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql` and confirm:
- [ ] **`[S0]` 28-table count:** found_base_tables = **28**, missing = 0.
- [ ] **`[A-PRE2]` current object-level anon rows:** tables_with_object_priv = **28**, total_object_priv_rows
      = **112** (28 × 4, incl. MAINTAIN).
- [ ] **`[HYG1]` RLS enabled tables = 39**.
- [ ] **`[HYG1]` anon/PUBLIC policy targets = 0** (G5 = 0).
- [ ] **`[HYG1]` `*_authenticated_all` policies = 0** (G6 = 0).
- [ ] **`[B-PRE2]` current data-level anon rows = 112** (must be PRESERVED by Stage A).
- [ ] **`[BASE1]` authenticated / service_role baseline** captured (privilege_rows per role) for post-run
      comparison — must be unchanged after Stage A.
- [ ] **`[DEF-PRE1]` owner-scoped default ACL baseline:** anon object default rows present for **both**
      `postgres` **and** `supabase_admin`.

## E. Authority gate (from the Execution-Role & Authority Decision)
- [ ] Existing-table REVOKE authority confirmed (owner/grantor rights on the 28 tables).
- [ ] `postgres` default correction: executing role is `postgres` or a member — confirmed, or the split-path
      decision recorded.
- [ ] `supabase_admin` default correction: membership confirmed, or the **Supabase-mechanism fallback**
      recorded as a separate PJ-authorised step.

## F. Hard STOP conditions — mandatory (any one → do NOT run)

- [ ] **Target is not `yav2-dev`.**
- [ ] **Project ref is not `ogjrwemjefvccpyjwxuo`.**
- [ ] **Any Production or V1 target appears** (`zcszesuvjrryxtigjglt`) — STOP immediately.
- [ ] **Execution identity differs from the discovery identity** (the identity whose F2 authority was captured).
- [ ] **`postgres` eligibility is not reconfirmed** (`[F2] eligible_for_postgres_default_alter` not true / Part A P7 fails).
- [ ] **Any attempt to run Part B through the current ineligible identity** (F2 supabase_admin = false) — Part B is Supabase-mechanism only.
- [ ] **Baseline is not exactly 28 tables.**
- [ ] **Baseline is not exactly 112 anon object-privilege rows.**
- [ ] **Any of the four Stage A privileges (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) is missing or drifted unexpectedly** (not all 4 present on every table).
- [ ] **authenticated or service_role baseline differs** from the captured baseline.
- [ ] **anon SELECT/INSERT/UPDATE/DELETE would be changed** (Part A must preserve them; data-level rows ≠ 112).
- [ ] RLS ≠ 39, or G5 ≠ 0, or G6 ≠ 0 (row-level posture changed since evidence).
- [ ] **Remaining A1–F1 discovery evidence has not been preserved** before final execution approval.
- [ ] Part A candidate/rollback not available/reviewed.
- [ ] Any ambiguity about scope (Stage B must NOT be run; no combined atomic path).

**On any STOP:** do not execute; record the failing item and raw output; escalate to PJ.
