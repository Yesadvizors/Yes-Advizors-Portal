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
| `[A1]` session identity captured | ☐ | ☐ | ☐ |
| `[A2]` server information captured | ☐ | ☐ | ☐ |
| `[A3]` project/ref manually confirmed | ☐ | ☐ | ☐ |
| `[B1]` role attributes captured | ☐ | ☐ | ☐ |
| `[C1]` membership edges captured | ☐ | ☐ | ☐ |
| `[C2]` membership summary captured | ☐ | ☐ | ☐ |
| `[D1]` complete default ACL captured | ☐ | ☐ | ☐ |
| `[D2]` anon object default by owner captured | ☐ | ☐ | ☐ |
| `[E1]` 28-table ownership captured | ☐ | ☐ | ☐ |
| `[F1]` authority input facts captured | ☐ | ☐ | ☐ |
| `[F2]` eligibility result captured | ☐ | ☐ | ☐ (confirmed 2026-07-30) |

## Target & integrity

| Item | PASS | FAIL | MISSING |
|---|---|---|---|
| Target **project confirmed** = `yav2-dev` | ☐ | ☐ | ☐ |
| **Project ref confirmed** = `ogjrwemjefvccpyjwxuo` | ☐ | ☐ | ☐ |
| **Execution identity preserved** (`current_user` recorded; same as intended migration identity) | ☐ | ☐ | ☐ |
| **Raw output unedited** (headings + all rows + false/null values; no summary/recalc/rewrite) | ☐ | ☐ | ☐ |
| **Evidence file hash recorded** (SHA-256 of the completed capture template) | ☐ | ☐ | ☐ |

Recorded capture-template SHA-256: `________________________________________________________________`

## Decision reconfirmation

| Item | PASS | FAIL | MISSING |
|---|---|---|---|
| **PATH 2 decision reconfirmed** (postgres eligible; supabase_admin ineligible; PATH 1 rejected; PATH 3 not selected) | ☐ | ☐ | ☐ |
| **Part A remains unauthorised** (not executed) | ☐ | ☐ | ☐ |
| **Part B remains unauthorised** (not executed; Supabase-supported mechanism required) | ☐ | ☐ | ☐ |

---

## Final classification (choose exactly one)

- ☐ **COMPLETE** — all A1–F2 captured, target confirmed, raw unedited, hash recorded, PATH 2 reconfirmed.
- ☐ **INCOMPLETE** — one or more blocks MISSING (e.g. A1–F1 not yet captured).
- ☐ **INVALID TARGET** — project/ref is not `yav2-dev` / `ogjrwemjefvccpyjwxuo` (or Production/V1 seen).
- ☐ **EVIDENCE TAMPERED/EDITED** — output summarised, recalculated, rewritten, or rows/headings altered.
- ☐ **BLOCKED** — cannot capture safely (errors, ambiguity, or authority cannot be evidenced).

> **Final execution authorisation requires COMPLETE.** Even when COMPLETE, execution is a separate explicit
> PJ decision; **Part A and Part B remain individually gated; Stage B is excluded.**
