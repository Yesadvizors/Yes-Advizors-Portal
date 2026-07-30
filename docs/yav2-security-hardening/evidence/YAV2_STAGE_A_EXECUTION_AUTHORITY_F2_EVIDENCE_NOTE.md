# YAV2 Portal V2 — Stage A — F2 Authority Evidence Note

**Status:** evidence record. **No Supabase access by Claude, no SQL executed.** The result below was supplied
by PJ from a live read-only run in `yav2-dev` / `ogjrwemjefvccpyjwxuo`.
**Raw evidence file:** `YAV2_STAGE_A_EXECUTION_AUTHORITY_F2_RAW_2026-07-30.json` (verbatim, unmodified).
**Discovery SQL that produced it:**
`supabase/verification/YAV2_STAGE_A_EXECUTION_AUTHORITY_DISCOVERY_SELECT_ONLY.sql` (block `[F2]`).

---

## Preserved F2 result (verbatim)

```json
[
  {
    "cu_is_superuser": false,
    "eligible_for_postgres_default_alter": true,
    "eligible_for_supabase_admin_default_alter": false
  }
]
```

Values are preserved exactly — **not** rewritten, summarised, calculated, or transformed.

---

## Interpretation (facts only)

- The executing identity is **not a superuser**.
- It **is eligible** to alter the **`postgres`-owned** default privileges
  (`eligible_for_postgres_default_alter = true`).
- It is **not eligible** to alter the **`supabase_admin`-owned** default privileges
  (`eligible_for_supabase_admin_default_alter = false`).

## Status of this evidence

- This is **PARTIAL live authority evidence** — only block `[F2]` was supplied.
- The remaining discovery blocks **`[A1] [A2] [A3] [B1] [C1] [C2] [D1] [D2] [E1] [F1]`** are **still
  required** for complete authority-evidence closure before final live execution authorisation.
- This F2 result is **sufficient to REJECT PATH 1** (single atomic path), because a single transaction
  containing both owner-default corrections cannot succeed under an identity ineligible for the
  `supabase_admin` scope.
- This F2 result **selects PATH 2 (split execution) provisionally**.
- **PATH 3 is not selected** from this evidence (authority is provable, not ambiguous, for the two scopes
  reported).
- **Execution remains UNAUTHORISED.** No execution path is approved yet; final authorisation additionally
  requires the remaining A1–F1 evidence and separate PJ approval per scope.
