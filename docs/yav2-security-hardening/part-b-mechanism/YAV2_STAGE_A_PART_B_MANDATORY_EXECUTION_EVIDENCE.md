# YAV2 Portal V2 — Stage A — Part B Mandatory Execution Evidence

**Status:** **DISCOVERY / DESIGN — read-only.** Defines the evidence PJ must have **before authorising** and
**after any** Part B execution. **No Supabase access, no SQL executed here.**
**Governing:** `sync/integration` @ `7e3941eb65bf1efd80f18c07c76e560ea5848589`.
**Target (reference only):** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.

> **Any single MISSING/FAIL item = do NOT authorise / do NOT proceed.** Evidence must be raw and verbatim (no
> summary substituted for raw output), captured SELECT-only, and interpreted outside the raw blocks.

> **Sequencing (per the discovery doc §6):** do **not** execute Part A or Part B until Supabase confirms the
> Part B mechanism; then, in a coordinated window, execute **Part B first** (verify 4 → 0; postgres unchanged;
> graphql/graphql_public untouched), and **only after Part B PASSES** execute Part A. The pre-run set (§A) must
> be complete for **both** parts before the window opens.

---

## A. Pre-authorisation evidence (must exist before PJ says "go")

| # | Evidence | Requirement | Source |
|---|---|---|---|
| A-1 | **Executing identity** | Written confirmation of the exact DB role that will run Part B (must be `supabase_admin` or a member/superuser — **not** `postgres`) | Supabase Support reply / documented mechanism |
| A-2 | **Target project/ref** | `yav2-dev` / `ogjrwemjefvccpyjwxuo` confirmed; **never** `zcszesuvjrryxtigjglt` | Editor header / Support ticket |
| A-3 | **Exact SQL hash** | SHA-256 of `…_PATH2_PART_B_SUPABASE_ADMIN_DEFAULT_PROPOSAL.sql` recorded and matched to the file being executed | repo file hash |
| A-4 | **Exact rollback hash** | SHA-256 of `…_PATH2_PART_B_ROLLBACK_PROPOSAL.sql` recorded | repo file hash |
| A-5 | **Authority proof** | Evidence the executing identity is eligible (`pg_has_role(current_user,'supabase_admin','MEMBER')=true` **or** superuser) — the F2-equivalent for the *actual* executor, not the `postgres` session | live SELECT by executor / Supabase confirmation |
| A-6 | **Pre-run counts** | `supabase_admin`/`public`/`anon` object-default rows = **4** (`TRUNCATE, REFERENCES, TRIGGER, MAINTAIN`); `postgres`/`public` = 4 (control, unchanged) | `[DEF-PRE1]` SELECT-only |
| A-7 | **Rollback authority (statement-level, primary)** | Written confirmation that the **same** channel can apply the exact-inverse `GRANT` (the **primary** rollback). PITR is **DR-only** and must **not** be relied on as the privilege-level rollback unless the project's PITR availability and restoration implications are **separately verified** | Supabase reply |
| A-8 | **Reversibility guarantee** | Supabase confirms the change is reversible via the same method | Supabase reply |
| A-9 | **Cross-schema exclusion pre-check** | `graphql` (4) and `graphql_public` (4) `supabase_admin` anon defaults present and **explicitly out of scope** — Part B must not touch them | focused reconciliation `…_RAW_2026-07-31.json` |
| A-10 | **Separate PJ approval recorded** | Explicit, separate written PJ authorisation for Part B (distinct from Part A) | PJ instruction |

## B. Post-run evidence (must be captured immediately after execution)

| # | Evidence | Pass condition | Source |
|---|---|---|---|
| B-1 | **Executing identity (as run)** | Matches A-1 exactly; recorded verbatim | executor session / Support confirmation |
| B-2 | **Post-run count — target** | `supabase_admin`/`public`/`anon` object-default rows = **0** | `[DEF-POST-A]` SELECT-only |
| B-3 | **Post-run count — control unchanged** | `postgres`/`public`/`anon` object-default rows **unchanged** (Part B must not alter the postgres scope) | `[DEF-POST-A]` |
| B-4 | **No existing-table change** | anon object-privilege rows on the 28 tables unchanged by Part B (Part B alters **defaults only**, not existing tables) | `[A-PRE2]`/`[A-POST]` |
| B-5 | **No data-privilege change** | anon SELECT/INSERT/UPDATE/DELETE unchanged (= 112) | `[B-PRE2]`/`[B-POST]` |
| B-6 | **authenticated / service_role unchanged** | baselines identical pre/post | `[BASE1]` |
| B-7 | **Cross-schema untouched** | `graphql` = 4 and `graphql_public` = 4 `supabase_admin` anon defaults **unchanged** | focused reconciliation re-run |
| B-8 | **No Stage B / no escalation** | no SELECT/INSERT/UPDATE/DELETE default revoke; no `SET ROLE`; only `anon` affected | statement review + logs |
| B-9 | **Target confirmation (as run)** | Ran on `yav2-dev` / `ogjrwemjefvccpyjwxuo`; not V1/Prod | Support ticket / logs |
| B-10 | **Evidence hashing** | Raw pre/post JSON preserved verbatim with recorded SHA-256 | evidence files |

## C. Verification query anchors (SELECT-only, no execution here)

- **`[DEF-PRE1]` / `[DEF-POST-A]`** — owner-scoped default-ACL counts for `anon` object privileges, by
  `defaclrole` (postgres vs supabase_admin) and schema (public only for Stage A). Expected: supabase_admin
  public 4 → 0; postgres public unchanged; graphql/graphql_public unchanged.
- Reuse the merged SELECT-only kit
  (`supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql`) and the focused reconciliation
  query for cross-schema confirmation. **No new privileged query is introduced by Part B verification.**

## D. Decision rule

- **All A-items PASS** → Part B may be authorised (separate PJ approval).
- **Any A-item MISSING/FAIL** → **do not authorise.**
- **After execution, all B-items PASS** → Part B closed; combined with Part A PASS = **full Stage A closure**.
- **Any B-item FAIL** → STOP; apply Part B rollback via the confirmed channel; re-verify; escalate to PJ.

> **Exclusions (constant):** no existing-table privilege change, no `postgres`-default change, no anon
> data-privilege change, no `authenticated`/`service_role` change, no `graphql`/`graphql_public`, no Stage B,
> no V1/Production. Authority is a **database-role** fact — never inferred from project/dashboard ownership or
> the service-role API key.
