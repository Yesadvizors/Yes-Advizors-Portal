# YAV2 Portal V2 — Stage A — Controlled Runbook (yav2-dev)

**Status:** **READINESS DOCUMENT — no Supabase access, no SQL executed here.** This runbook is executed by
the operator **only under separate, explicit PJ authorisation**, against **`yav2-dev` only**.
**Scope:** Stage A only (anon object-level `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`). **Stage B is NOT part of
this runbook.** **No Production use.**
**Governing:** `sync/integration` @ `370dd95d470bf1baa096f61a64409dd1259e2a04`.
**Authorised env:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.

Artefacts:
- Migration candidate: `supabase/readiness/YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_MIGRATION_CANDIDATE.sql`
- Rollback candidate:  `supabase/readiness/YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_ROLLBACK_CANDIDATE.sql`
- SELECT-only checks:  `supabase/verification/YAV2_ANON_OBJECT_PRIVILEGES_PRE_POST_SELECT_ONLY.sql`
- Pre-run checklist:   `YAV2_STAGE_A_PRE_RUN_CHECKLIST.md`
- Authority decision:  `YAV2_STAGE_A_EXECUTION_ROLE_AND_AUTHORITY_DECISION.md`
- Evidence template:   `YAV2_STAGE_A_RUNTIME_TEST_EVIDENCE_TEMPLATE.md`

---

## 1. Operator sequence (top level)

1. **PJ authorisation recorded** (who/when) — without it, STOP.
2. Complete the **Pre-Run Checklist** — every item PASS, else STOP.
3. **Execution-role confirmation** (authority decision §3/§4) — record the chosen path (single atomic run vs
   split path).
4. **Pre-checks** (SELECT-only) — capture raw output.
5. **[PJ-ONLY] Execute the migration candidate** — see §3.
6. **Post-checks** (SELECT-only + the candidate's own postcondition NOTICE) — capture raw output.
7. **Runtime tests** — fill the Evidence Template (anon denials + regressions + frontend).
8. **Decide PASS / FAIL / BLOCKED**; on FAIL → **rollback** (§5).
9. Archive all evidence; report to PJ. **Do not proceed to Stage B.**

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
2. Open `YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_MIGRATION_CANDIDATE.sql`.
3. Remove the fail-fast guard block (authorised act; record who/when).
4. Execute the file as a single transaction. Expected: precondition NOTICE → 28 REVOKEs → 2 default-scope
   ALTERs → postcondition NOTICE `STAGE A POSTCONDITIONS PASSED`, then `COMMIT`.
5. If any precondition/postcondition raises, or an ALTER hits the owner-authority STOP, the transaction
   **rolls back automatically** → treat as BLOCKED/FAIL and follow §5 as needed (no partial state persists).

**Stage B is not executed here under any circumstance.**

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

**Procedure:** execute `YAV2_STAGE_A_ANON_OBJECT_PRIVILEGES_ROLLBACK_CANDIDATE.sql` **[PJ-ONLY]** (remove its
guard), which restores anon object privileges (→ 112) and the owner-scoped object defaults, with its own
post-check. Re-run `[A-PRE2]`/`[DEF-PRE1]` to confirm restoration. If SQL rollback is insufficient, use
`yav2-dev` PITR. Record everything.

---

## 6. Evidence capture requirements

- Raw output of every pre-check and post-check (attach to the Evidence Template).
- The migration run log (NOTICE lines, COMMIT, or the abort/rollback error).
- Runtime test results (anon denials, regressions, frontend) with timestamps and operator.
- The authority path taken and any OPEN GATE (`supabase_admin` default).
- Final PASS / FAIL / BLOCKED decision, countersigned by PJ.

**Boundaries:** `yav2-dev` only; **no Production**; **no Stage B**; no deployment; nothing beyond Stage A.
