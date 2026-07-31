# YAV2 Portal V2 — Stage A — Authority Evidence: One-Run PJ Instruction

**Goal:** capture the complete authority discovery evidence (blocks **A1–F2**) with **one** read-only SQL run
in `yav2-dev`. Nothing is changed — every statement is a `SELECT`/`WITH`.

**SQL file to run (exact repository path):**
`supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`

**Paste the output into:**
`docs/yav2-security-hardening/evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_A1_F2_RAW_CAPTURE_TEMPLATE_2026-07-31.md`

---

## Steps (do these in order)

1. **Open Supabase** (the dashboard).
2. **Select the project `yav2-dev`.**
3. **Confirm the project ref is `ogjrwemjefvccpyjwxuo`.**
   - If it is anything else — especially `zcszesuvjrryxtigjglt` (V1 / Production) — **STOP. Do not run.**
4. **Open the SQL Editor.**
5. **Open a New Query.**
6. **Copy the complete discovery SQL** from
   `supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`
   and paste it into the query.
7. **Run the complete SELECT-only SQL once** (it is read-only — no changes are made).
8. **Capture every result block: `[A1] [A2] [A3] [B1] [C1] [C2] [D1] [D2] [E1] [F1] [F2]`.**
   - Preserve **column headings**, **all rows**, and **`false` / `null`** values exactly.
9. **Export CSV where possible** (per block). If CSV export is not available for a block, **copy the raw
   output** (JSON or the table text) into the matching section of the capture template.
10. **Paste each block into the correctly labelled section** of the capture template (A1 → `[A1]`, etc.).
11. **Save** the completed template and **record its SHA-256** in the completeness checklist.

---

## Do NOT do any of these

- **Do not run any readiness or migration candidate** (nothing under `supabase/readiness/`).
- **Do not run Part A** (`…PATH2_PART_A…CANDIDATE.sql`).
- **Do not run Part B** (`…PATH2_PART_B…PROPOSAL.sql`).
- **Do not run on Production or V1** (`zcszesuvjrryxtigjglt`).
- **Do not** edit, summarise, or recalculate any value — paste raw output only.
- **Stop immediately if the project / ref is different** from `yav2-dev` / `ogjrwemjefvccpyjwxuo`.

---

## After the run

- The **F2** block is already confirmed; the run must supply the remaining **A1–F1** raw output.
- This capture is **evidence only**. It does **not** authorise execution. **Part A and Part B remain
  unauthorised; Stage B is excluded.** Final execution authorisation is a separate PJ decision after the
  A1–F1 evidence is preserved and independently reviewed.
