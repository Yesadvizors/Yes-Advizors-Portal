# YAV2 Portal V2 — Stage A — Authority Evidence Completeness Checklist

**Purpose:** confirm the full authority discovery evidence (A1–F2) is captured, unedited, and from the correct
target before any final execution authorisation. **No Supabase access by Claude, no SQL executed.**
**Capture template:** `evidence/YAV2_STAGE_A_EXECUTION_AUTHORITY_A1_F2_RAW_CAPTURE_TEMPLATE_2026-07-31.md`.
**Discovery SQL:** `supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql`
(SHA-256 `6aeb5e220f6233c4892777c20549831836d4c48c4f4b29361734b0ee28dca0e6`).

> Mark each item **PASS / FAIL / MISSING**. Any FAIL/MISSING (or an INVALID TARGET / TAMPERED result) blocks
> final execution authorisation.

---

## Result blocks captured (raw, unedited)

| Item | PASS | FAIL | MISSING |
|---|---|---|---|
| `[A1]` session identity captured | **✅** | ☐ | ☐ |
| `[A2]` server information captured | **✅** | ☐ | ☐ |
| `[A3]` project/ref manually confirmed | **✅** (PJ confirmed yav2-dev / `ogjrwemjefvccpyjwxuo`) | ☐ | ☐ |
| `[B1]` role attributes captured | **✅** | ☐ | ☐ |
| `[C1]` membership edges captured | **✅** | ☐ | ☐ |
| `[C2]` membership summary captured | **✅** | ☐ | ☐ |
| `[D1]` default ACL captured | **✅ — 100 rows captured verbatim** (partial/truncated vs full catalogue; public scope confirmed by the focused reconciliation) | ☐ | ☐ |
| `[D2]` anon object default by owner captured | **✅** (postgres 4 / supabase_admin 4) | ☐ | ☐ |
| `[E1]` 28-table ownership captured | **✅** (postgres owns 28/28) | ☐ | ☐ |
| `[F1]` authority input facts captured | **✅** | ☐ | ☐ |
| `[F2]` eligibility result captured | **✅** (confirmed 2026-07-30) | ☐ | ☐ |

> **DATABASE EXECUTION is NOT marked complete** — no Part A, Part B, migration, or privilege change has run.

## Target & integrity

| Item | PASS | FAIL | MISSING |
|---|---|---|---|
| Target **project confirmed** = `yav2-dev` | **✅** | ☐ | ☐ |
| **Project ref confirmed** = `ogjrwemjefvccpyjwxuo` | **✅** (V1/Prod `zcszesuvjrryxtigjglt` NOT used) | ☐ | ☐ |
| **Execution identity preserved** (`current_user` = `postgres`, recorded) | **✅** | ☐ | ☐ |
| **Raw output unedited** (headings + all rows + false/null values; no summary/recalc/rewrite) | **✅** (values recorded verbatim; no compression; interpretation kept outside raw blocks) | ☐ | ☐ |
| **Evidence file hash recorded** (SHA-256 of the completed capture template) | **✅** (working-copy SHA in the review report) | ☐ | ☐ |

Recorded capture-template SHA-256: *(corrected working-copy SHA recorded in the review report §K)*

## Decision reconfirmation

| Item | PASS | FAIL | MISSING |
|---|---|---|---|
| **PATH 2 decision reconfirmed** (postgres eligible; supabase_admin ineligible; PATH 1 rejected; PATH 3 not selected) | **✅** | ☐ | ☐ |
| **Part A remains unauthorised** (not executed) | **✅** | ☐ | ☐ |
| **Part B remains unauthorised** (not executed; Supabase-supported mechanism required) | **✅** | ☐ | ☐ |

---

## Final classification

**COMPLETE — AUTHORITY AND PUBLIC-SCOPE DECISION EVIDENCE.**

- **A1–F2 authority evidence is complete for the PATH 2 decision.**
- The original **[D1] capture contains 100 raw rows and is preserved accurately as a partial/truncated
  catalogue capture** (verbatim; no compression; interpretation outside raw blocks).
- **The focused reconciliation supplies decisive scope confirmation**
  (`evidence/YAV2_STAGE_A_DEFAULT_ACL_FOCUSED_RECONCILIATION_RAW_2026-07-31.json`).
- **`postgres`/`public` = 4.**
- **`supabase_admin`/`public` = 4.**
- **[D2] confirmed.**
- **Part A design confirmed.**
- **Part B public-schema design confirmed.**
- **No database execution has occurred.**
- **Part A and Part B remain unexecuted and unauthorised** (Part B via a Supabase-supported mechanism).
- Target and execution identity confirmed (`yav2-dev` / `ogjrwemjefvccpyjwxuo`; `current_user = postgres`).
- `graphql` / `graphql_public` defaults exist but are **outside Stage A** and remain untouched.

> **PUBLIC-SCOPE CONFIRMATION (focused reconciliation, authoritative):** the focused SELECT-only default-ACL
> reconciliation (`evidence/YAV2_STAGE_A_DEFAULT_ACL_FOCUSED_RECONCILIATION_RAW_2026-07-31.json`) confirms
> **`postgres`/`public`/`anon` = 4** and **`supabase_admin`/`public`/`anon` = 4** object-level defaults.
> Therefore **[D2] is confirmed** and **Part B's `IN SCHEMA public` scope is valid**; **Part A is confirmed**.
> The 100-row [D1] export was an incomplete/truncated catalogue capture (it did not include the
> `supabase_admin`/`public` and `graphql_public` rows); it is preserved verbatim and does not contradict the
> focused evidence. `supabase_admin` `graphql`/`graphql_public` anon object defaults exist but are **outside
> Stage A** and must remain untouched.

> **Final execution authorisation is a separate explicit PJ decision.** Part A and Part B remain individually
> gated; Stage B is excluded.
