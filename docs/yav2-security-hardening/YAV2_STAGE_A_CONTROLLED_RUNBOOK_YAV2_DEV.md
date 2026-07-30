# YAV2 Portal V2 — Stage A — Controlled Runbook (yav2-dev)

**Status:** **READINESS DOCUMENT — no Supabase access, no SQL executed here.** This runbook is executed by
the operator **only under separate, explicit PJ authorisation**, against **`yav2-dev` only**.
**Scope:** Stage A only (anon object-level `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`). **Stage B is NOT part of
this runbook.** **No Production use.**
**Governing:** `sync/integration` @ `370dd95d470bf1baa096f61a64409dd1259e2a04`.
**Authorised env:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.

> ## PATH 2 — SPLIT EXECUTION (2026-07-30). This runbook now follows the phased PATH 2 sequence in §1.
> **Part A** (existing tables + `postgres` default) is executable by the eligible identity; **Part B**
> (`supabase_admin` default) is INELIGIBLE for the current identity → Supabase-supported mechanism, separate
> approval. **No combined atomic run.** Full Stage A closure = Part A PASS **and** Part B PASS. Stage B EXCLUDED.

Artefacts (PATH 2):
- **Part A candidate:** `supabase/readiness/YAV2_STAGE_A_PATH2_PART_A_EXISTING_TABLES_AND_POSTGRES_DEFAULT_CANDIDATE.sql`
- **Part A rollback:** `supabase/readiness/YAV2_STAGE_A_PATH2_PART_A_ROLLBACK_CANDIDATE.sql`
- **Part B proposal:** `supabase/readiness/YAV2_STAGE_A_PATH2_PART_B_SUPABASE_ADMIN_DEFAULT_PROPOSAL.sql`
- **Part B rollback:** `supabase/readiness/YAV2_STAGE_A_PATH2_PART_B_ROLLBACK_PROPOSAL.sql`
- SELECT-only checks:  `supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql`
- Authority discovery: `supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`
- Pre-run checklist:   `YAV2_STAGE_A_PRE_RUN_CHECKLIST.md`
- Authority decision:  `YAV2_STAGE_A_EXECUTION_ROLE_AND_AUTHORITY_DECISION.md`
- Evidence template:   `YAV2_STAGE_A_RUNTIME_TEST_EVIDENCE_TEMPLATE.md`
- **SUPERSEDED (do not use):** `…YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_MIGRATION_CANDIDATE.sql` /
  `…_ROLLBACK_CANDIDATE.sql` (combined; replaced by the four PATH 2 files).

---

## 1. Operator sequence — PATH 2 phased

### PHASE 0 — authority & path
1. **Preserve the complete `[A1]`–`[F2]` authority output** (raw). `[F2]` is captured
   (`evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_F2_RAW_2026-07-30.json`); the remaining `[A1]`–`[F1]` must be
   captured before final execution approval.
2. **Reconfirm PATH 2** from the evidence (postgres eligible; supabase_admin ineligible).

### PART A — existing tables + postgres default  *(eligible identity)*
3. **Pre-checks** (SELECT-only, §2) — capture raw output.
4. **Identity verification** — executing identity == the discovery identity.
5. **postgres eligibility reconfirmation** — `[F2] eligible_for_postgres_default_alter = true` (and Part A's
   own precondition P7).
6. **PJ execution approval** recorded (who/when).
7. **[PJ-ONLY] Execute Part A candidate** — `…PATH2_PART_A…CANDIDATE.sql` (remove guard; §3).
8. **Part A post-checks** (SELECT-only, §4) + the candidate's postcondition NOTICE.
9. **Runtime regression tests** — Evidence Template PART A section.
10. **Evidence capture** (raw).
11. **Classification: PART A PASS / FAIL / BLOCKED.** On FAIL → Part A rollback (§5).

### INTERMEDIATE STATE (after Part A PASS)
- existing-table object-privilege surface **corrected**;
- `postgres` future defaults **corrected**;
- **`supabase_admin` future default still OPEN**;
- **full Stage A NOT closed** (future-table protection incomplete for the supabase_admin scope).

### PART B — supabase_admin default  *(current identity INELIGIBLE)*
12. **Obtain the Supabase-supported authorised mechanism** for the `supabase_admin` default correction.
13. **Separate PJ approval** recorded.
14. **Separate identity/authority verification** (the mechanism's authorised identity).
15. **Execute Part B** (`…PATH2_PART_B…PROPOSAL.sql` statement) via that mechanism — **not** the current identity, no SET ROLE.
16. **Part B post-checks** — SELECT-only `[DEF-POST-A]` shows 0 anon object default rows for `supabase_admin`.
17. **Evidence capture** (raw).
18. **Classification: PART B PASS / FAIL / BLOCKED.** On FAIL → Part B rollback proposal (§5).

### FINAL STAGE A CLOSURE
- Permitted **only** when **Part A PASS AND Part B PASS**;
- complete raw evidence (`[A1]`–`[F2]` + Part A + Part B) preserved;
- independent review **PASS**;
- **no Stage B executed.**

---

## 2. Exact pre-check order (SELECT-only; nothing mutated)

Run, in order, from `YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql`:
1. `[S0]` scope integrity → **28 / 0**.
2. `[A-PRE1]` + `[A-PRE2]` anon object matrix + rollup → **28 tables, 112 rows**.
3. `[B-PRE2]` anon data rows → **112** (to be preserved).
4. `[BASE1]` authenticated / service_role baseline → record counts.
5. `[DEF-PRE1]` owner-scoped default ACL → anon object rows present for **postgres** and **supabase_admin**.
6. `[HYG1]` → **RLS 39 / anon-policy 0 / auth_all 0**.

Any deviation → **STOP** (do not run the migration).

---

## 3. Migration execution step — **[PJ-ONLY]**

> **This step changes live privileges and must be performed only by / with explicit PJ authorisation, in
> `yav2-dev`.** The candidate begins with a fail-fast guard that MUST be removed as a deliberate authorised
> act. It is a single atomic transaction with built-in precondition and postcondition checks that abort and
> roll back on any deviation.

1. Confirm the Editor header reads `yav2-dev` / `ogjrwemjefvccpyjwxuo`.
2. Open **`YAV2_STAGE_A_PATH2_PART_A_EXISTING_TABLES_AND_POSTGRES_DEFAULT_CANDIDATE.sql`** (Part A only).
3. Remove the fail-fast guard block (authorised act; record who/when).
4. Execute the file as a single transaction. Expected: precondition NOTICE → 28 REVOKEs → **1** default-scope
   ALTER (**postgres only**) → postcondition NOTICE `PART A POSTCONDITIONS PASSED` (which also reports the
   still-OPEN supabase_admin default), then `COMMIT`.
5. If any precondition/postcondition raises, or the postgres ALTER hits the authority STOP, the transaction
   **rolls back automatically** → treat as BLOCKED/FAIL and follow §5 (no partial state persists).
6. **Part B (`supabase_admin` default) is NOT executed here.** It is a separate step via the
   Supabase-supported mechanism (Phase PART B of §1). **Stage B is never executed here.**

---

## 4. Post-check order (SELECT-only)

From the same kit:
1. `[A-POST1]` anon object residual → **0 rows**.
2. `[B-POST1]`/`[B-PRE2]` anon data rows → **still 112** (preserved — Stage A must not touch data).
3. `[BASE1]` authenticated / service_role → **identical to pre-run baseline**.
4. `[DEF-POST-A]` owner-scoped default anon object rows → **0** for both owners (or record the OPEN GATE if
   `supabase_admin` was deferred to the Supabase mechanism).
5. `[HYG1]` → **RLS 39 / anon-policy 0 / auth_all 0** (unchanged).

Then run the runtime tests and fill the Evidence Template.

---

## 5. Rollback trigger conditions & procedure

**Trigger rollback if any of:**
- A postcondition check fails (should self-rollback within the transaction, but verify catalog state).
- A runtime regression: authenticated or service_role broken; a public/frontend flow breaks.
- Any unexpected behaviour attributable to the change.

**Procedure (per part):**
- **Part A rollback** — execute `YAV2_STAGE_A_PATH2_PART_A_ROLLBACK_CANDIDATE.sql` **[PJ-ONLY]** (remove its
  guard): restores anon object privileges (→ 112) and the **`postgres`** object default, with its own
  post-check. Re-run `[A-PRE2]`/`[DEF-PRE1]` to confirm.
- **Part B rollback** — `YAV2_STAGE_A_PATH2_PART_B_ROLLBACK_PROPOSAL.sql`: restores **only** the
  `supabase_admin` object default, via the authorised Supabase-supported mechanism (current identity
  ineligible).
- If SQL rollback is insufficient, use `yav2-dev` PITR. Record everything.

---

## 6. Evidence capture requirements

- Raw output of every pre-check and post-check (attach to the Evidence Template).
- The migration run log (NOTICE lines, COMMIT, or the abort/rollback error).
- Runtime test results (anon denials, regressions, frontend) with timestamps and operator.
- The authority path taken and any OPEN GATE (`supabase_admin` default).
- Final PASS / FAIL / BLOCKED decision, countersigned by PJ.

**Boundaries:** `yav2-dev` only; **no Production**; **no Stage B**; no deployment; nothing beyond Stage A.
