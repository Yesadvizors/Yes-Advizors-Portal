# YAV2 Portal V2 — 0021–0024 Live-State Reconciliation — PJ Execution Guide

**Package:** V2 SELECT-only reconciliation (migrations/objects 0021, 0022, 0023, 0024 + dependencies)
**Governing repo:** `Yesadvizors/Yes-Advizors-Portal`
**Governing branch / baseline commit:** `sync/integration` @ `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`
**Kit branch (local, unpushed):** `verification/v2-0021-0024-reconciliation-kit`
**SQL kit:** `supabase/verification/YAV2_V2_0021_0024_FULL_SELECT_ONLY_RECONCILIATION.sql`
**SQL kit SHA-256:** `368e22d78d2cf92741c291d9e57a5cb4b5d715ab3cd54f7134c9c80be7a11860`

> This guide is written for **PJ to execute manually** in the Supabase V2 SQL Editor.
> Claude/ChatGPT do **not** connect to the database. The kit is **SELECT-only** and
> makes **no** changes. If you cannot confirm the project identity, **stop**.

---

## 0. Non-negotiable guardrails

| Rule | Detail |
|---|---|
| **Authorised target ONLY** | Supabase project **`yav2-dev`**, project ref **`ogjrwemjefvccpyjwxuo`** (V2 / dev). |
| **PROHIBITED** | V1 / Production, project ref **`zcszesuvjrryxtigjglt`** — never open, never run against it. |
| **Read-only** | Run only the supplied kit. Do not run any INSERT/UPDATE/DELETE/DDL/GRANT/REVOKE. The kit contains none. |
| **No side effects** | Do not commit, push, deploy, re-point aliases, or apply any migration as a result of this run. |
| **PR #35 untouched** | Do not modify Draft PR #35 (`p6/frontend-fy-warning-correction`) or its branch. |
| **Stop on identity failure** | If the project name/ref cannot be positively confirmed as `yav2-dev` / `ogjrwemjefvccpyjwxuo`, **STOP** and run nothing. |

---

## 1. Open the correct Supabase V2 SQL Editor

1. Go to <https://supabase.com/dashboard>.
2. In the project switcher, select the project named **`yav2-dev`**.
3. Open the URL bar and confirm the project ref segment reads **`ogjrwemjefvccpyjwxuo`**
   (the dashboard URL looks like `…/project/ogjrwemjefvccpyjwxuo/…`).
4. **Project Settings → General** → confirm **Reference ID = `ogjrwemjefvccpyjwxuo`**.
5. If you see **`zcszesuvjrryxtigjglt`** anywhere, you are on **V1 / Production** — **close it and stop.**
6. Open **SQL Editor → New query**.

> **MCP / connector note:** Do **not** use any Supabase MCP connection for this. Per the standing
> project rule, the MCP in this environment may expose only V1/Production. All live verification is
> done by **you, manually**, in the **yav2-dev** SQL Editor. Claude runs zero queries.

---

## 2. Verify project identity BEFORE any further block (hard gate)

1. Paste and run **Block [A1]** and **Block [A5]** only.
2. `[A1]` returns `db_name` (expect `postgres`), your `run_as` role, and the IST clock.
3. `[A5]` prints the required vs prohibited project refs and the confirmation instruction.
4. **Look at the Editor header / project settings again.** Only if it positively reads
   **`yav2-dev` / `ogjrwemjefvccpyjwxuo`** may you continue.
5. Record in the evidence template: **PROJECT IDENTITY CONFIRMED = YES/NO**.
   - If **NO** → write `HOLD — PROJECT IDENTITY NOT ESTABLISHED` and stop. Do not run [A2]–[L6].

> SQL cannot read the Supabase project ref, so identity confirmation is a **human eyeball check**
> of the dashboard, not a query result. The kit deliberately makes you do it before anything else.

---

## 3. Run the blocks in order

Run **one block at a time**, top to bottom: `[A1]…[A5]`, `[B1]…[B4]`, `[C1]…[C8]`, `[D1]…[D6]`,
`[E1]…[E4]`, `[F1]…[F3]`, `[G1]…[G5]`, `[H1]…[H5]`, `[I1]…[I5]`, `[J1]…[J2]`, `[K1]…[K4]`, `[L1]…[L6]`.

- Each block is **independent and self-contained**. You may run them individually.
- The kit is safe to run inside an explicit read-only transaction if you prefer belt-and-braces:
  ```sql
  BEGIN;
  SET TRANSACTION READ ONLY;
  -- paste the block(s) here
  ROLLBACK;   -- or COMMIT; nothing was written either way
  ```
  This is **optional**. The kit itself performs no writes.
- Do **not** click "Run" on the whole file blindly if your Editor would stop at the first empty
  result — run block by block so you capture every result.

---

## 4. Capture each result

For every block:

1. Copy the **full result grid** (or the single-row result) into the evidence template
   `YAV2_V2_RECONCILIATION_EVIDENCE_TEMPLATE.md`, under that block's heading.
2. Record the block's **status label** (see §6).
3. Tag each capture with the **execution timestamp** (from `[A1] executed_at_ist`) and the
   confirmed project ref.
4. Never paste client PII. The kit only returns counts/booleans/catalog metadata, so a correct
   run has nothing sensitive to redact — if you see anything that looks like a client value,
   stop and report it (it would indicate you ran a modified file).

---

## 5. Handling permission errors and empty results

| Symptom | Meaning | What to record |
|---|---|---|
| `permission denied for schema supabase_migrations` (Block B) | Ledger not exposed to your role | `NOT VISIBLE` for B1–B3; applied-status stays **UNKNOWN** |
| Block returns **0 rows** where an object was expected | Object absent live, or filtered out | `FAIL` (if object was expected present) or `PASS` (if absence was expected, e.g. `v_team_workload`) |
| `permission denied for function …` on an inspection query | Rare — catalog reads shouldn't need it | `UNKNOWN`; note the exact error |
| `relation "public.x" does not exist` inside a count block | That table is absent live | `FAIL` if expected; capture the error text verbatim |
| A block errors midway | Only that block is affected | Label that block `UNKNOWN`, capture the error, **continue** with the next block |

> A permission or visibility error is **evidence**, not a failure of the kit. Record it honestly as
> `UNKNOWN` / `NOT VISIBLE`. Do **not** attempt to elevate privileges, change roles, or "make it work".

---

## 6. Status labels (use exactly these)

| Label | Use when |
|---|---|
| **PASS** | The live result matches the expected state in the Expected-State Matrix (within acceptable variance / expected business movement). |
| **FAIL** | The live result contradicts the expected state — e.g. a **governed** object is missing, a forbidden PUBLIC grant is present, or a **frozen** count moved / a guarded count dropped without explanation. |
| **NOT PRESENT** | A relation that is **intentionally optional / legacy / not governed** (e.g. `public.client_directors` in `[K1b]`) is absent. This is **not** a FAIL — record it as NOT PRESENT. |
| **UNKNOWN** | The block could not be evaluated (permission error, ambiguous result). Applied-status claims default here until proven. |
| **NOT VISIBLE** | A schema/table (e.g. the migration ledger) is not exposed to your role — a specific kind of UNKNOWN. |
| **SKIPPED — PREREQUISITE NOT MET** | The block was not run because a prerequisite block failed (e.g. `[H1]-[H5]` when `[C1]` shows a P5 table missing; `[B3]` when `[B2]` shows no ledger). |

### 6.1 Object-dependency gates (run order matters)

Some blocks depend on an object another block proves. Run the prerequisite first and honour the gate:

| Block(s) | Prerequisite | If prerequisite fails |
|---|---|---|
| `[B3]` ledger entries | `[B2]` confirms `supabase_migrations.schema_migrations` exists **and** has `version`+`name` columns | label `[B3]` **SKIPPED — PREREQUISITE NOT MET**; ledger → **NOT VISIBLE** |
| `[H1]`–`[H5]` P5 data | `[C1]` shows **both** `public.service_catalogue` and `public.client_service_applicability` PRESENT | label `[H1]`–`[H5]` **SKIPPED — PREREQUISITE NOT MET**; record the missing P5 table as **FAIL** in `[C1]` (0021 objects are governed) |
| `[K1b]` legacy directors | none (isolated) | if the table is absent → **NOT PRESENT** (never FAIL, never blocks `[K1]`) |

Deciding an object's absence:
- **governed object absent where the matrix expects it present** → **FAIL** / discrepancy;
- **intentionally optional / not-governed object absent** → **NOT PRESENT**;
- **ledger/schema inaccessible** → **NOT VISIBLE**;
- **block not run because its prerequisite failed** → **SKIPPED — PREREQUISITE NOT MET**.

### 6.2 Interpreting protected counts (Section K) — guards, not mechanical equality

The numbers in Section K are **guard baselines**, not automatically permanent exact expectations:
- a **higher** count can be legitimate operational growth (new clients, new `audit_log` rows) → **not a failure by itself**;
- a **lower** count requires **investigation** for deletion, data loss or scope change → raise a discrepancy;
- **exact equality** is required **only** where a separately governed **frozen-count** condition applies
  (e.g. `service_catalogue = 11`, `client_persons = 0`, `client_remediation_flags = 0`,
  `accounting_tracker = 312`, `financials_tracker = 120`, `income_tax_tracker = 26`,
  `compliance_calendar = 0`);
- decide PASS/FAIL using **expected business movement and the governing evidence**, not mechanical equality alone.

Apply the decision framework in `YAV2_V2_RECONCILIATION_CLOSURE_REPORT_TEMPLATE.md §Decision framework`.

---

## 7. Avoiding V1 / Production (repeat)

- The **only** authorised project is **`yav2-dev` / `ogjrwemjefvccpyjwxuo`**.
- Before **every** session, re-confirm the project ref in the URL and Settings.
- If a browser tab, bookmark, or MCP connection points at **`zcszesuvjrryxtigjglt`**, close it.
- Never run any block against Production. There is no scenario in this package that requires it.

---

## 8. Return the evidence to Claude / ChatGPT

1. Fill in `YAV2_V2_RECONCILIATION_EVIDENCE_TEMPLATE.md` with every block's captured result and label.
2. Note the **execution date/time (IST)**, the **confirmed project ref**, and **PROJECT IDENTITY
   CONFIRMED = YES**.
3. Paste the completed evidence template back into the chat (or attach the file).
4. Claude/ChatGPT will then populate the **Expected-vs-Live Matrix**, the **Discrepancy Register**,
   and a proposed **Closure Report** — **no live claims are made until your evidence is in hand.**
5. Nothing is committed, merged, or deployed without your separate explicit authorisation.

---

## 9. When to STOP immediately

- Project identity cannot be confirmed as `yav2-dev` / `ogjrwemjefvccpyjwxuo`.
- The Editor is pointed at `zcszesuvjrryxtigjglt` or any non-yav2-dev project.
- The kit file you are about to run does **not** match SHA-256
  `368e22d78d2cf92741c291d9e57a5cb4b5d715ab3cd54f7134c9c80be7a11860`
  (verify with `sha256sum` / `Get-FileHash -Algorithm SHA256` before running).
- Any statement in the file is **not** a `SELECT`/`WITH` (it should never be — the file is validated
  SELECT-only; a mismatch means you have the wrong or a tampered file).
