# YAV2 Master Completion Register — DRAFT UPDATE (0021–0024 Reconciliation)

> **STATUS: DRAFT — NOT APPLIED to `docs/YAV2_Master_Completion_Register.md`.**
> This is a proposed insertion, prepared for PJ review. It must **not** be merged into the governing
> register until (a) PJ's SELECT-only run is complete and (b) PJ authorises the edit. The register is
> governed state; a documentation package alone contributes **0%** to completion per its own rule
> (`Master Register :124`). Live evidence is required before any status here hardens beyond AUTHORED.

Format mirrors the governing register: status vocabulary
`NOT STARTED · DISCOVERY · AUTHORED · REVIEW HOLD · APPROVED FOR EXECUTION · EXECUTED · VERIFIED · CLOSED / PASS · BLOCKED`.

---

## Proposed new entry — "V2-RECON (0021–0024 live-state reconciliation kit)"

**To be inserted after the Post-Module-1 sections (T4 / G-11), before the Risk register.**

> ### V2-RECON — 0021–0024 Live-State Reconciliation (branch `sync/integration`)
>
> - **Objective:** Provide one comprehensive, SELECT-only, PJ-executable kit that reconciles the live
>   V2 (`yav2-dev`) state of migrations/objects **0021, 0022, 0023, 0024** and their dependencies
>   (P5 Service Applicability, T4 grants/search_path hardening, P6 FY generation, `get_current_fy`,
>   financial years, RLS/FORCE, Compliance Tracker posture, G-11 non-impact) against the governing
>   repository, without executing any SQL.
> - **Governing baseline:** `sync/integration` @ `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`.
> - **Deliverables:** `supabase/verification/YAV2_V2_0021_0024_FULL_SELECT_ONLY_RECONCILIATION.sql`
>   (SELECT-only, 58 blocks, SHA-256 `368e22d7…`) + 7 governance docs under `docs/v2-reconciliation/`.
> - **Status:** **AUTHORED — REVIEW HOLD.** Kit + evidence framework authored and statically validated
>   SELECT-only. **Live execution NOT performed by Claude.** Verification pending PJ manual run in
>   `yav2-dev` and independent (ChatGPT) review.
> - **Safety:** No SQL executed; no Supabase access; no MCP DB use; no commit/push/PR/merge/deploy;
>   Draft PR #35 untouched.
> - **% :** authoring 100 · live verification 0 (pending PJ execution) · **contribution to overall
>   completion = 0 until live evidence lands** (per register rule that documentation activity counts 0).

---

## Proposed amendments to the "Proposed migration numbering" table (for PJ consideration ONLY)

The governing register currently reads (quoted):

```
| 0021 | Service applicability schema + reference seed + RPCs — EXECUTED / CLOSED PASS (V2/yav2-dev, 2026-07-19) | P5 |
| 0022 | P5 PG-1 — OTHER-notes authoritative enforcement ... EXECUTED / CLOSED PASS (V2/yav2-dev, 2026-07-21) | P5 (PG-1) |
| 0023 | Controlled compliance generation (moved from 0022) | P6 |
```

**Reconciliation observations to raise with PJ (NOT edits):**

1. The formal migration number **0023** in the register is reserved for **P6 controlled compliance
   generation**, whereas `remediation-t4/0023_grants_hardening.PROPOSED.sql` and
   `remediation-t4/0024_search_path_hardening.PROPOSED.sql` are **local T4 folder names** that reuse
   the numerals 0023/0024. This dual use is already noted in the register (`:252`) but is a standing
   source of confusion; recommend the closure report restate it explicitly.
2. 0021/0022 register status is **EXECUTED/CLOSED PASS**, yet the migration *files* still carry the
   header **"DRAFT — NOT EXECUTED"**. Propose a doc-only header correction under separate PJ
   authorisation once live blocks C/D/E confirm the objects are present.
3. The T4 0023/0024 grant/search_path closures are **self-reported with no migration-ledger
   evidence**; blocks D4/D5/D6/L2/L3 exist to confirm or refute them live. Until then their live
   status should read **"CLOSED PASS (self-reported) — live re-confirmation pending V2-RECON."**

---

## Proposed post-execution status transition (to apply ONLY after PJ run + review)

| Condition after live run | Register transition to propose |
|---|---|
| All in-scope blocks PASS; only accepted UNKNOWN/NOT-VISIBLE remain | V2-RECON → **VERIFIED**; annotate 0023/0024 as live-re-confirmed |
| HIGH item FAIL (e.g. 0023 PUBLIC EXECUTE still present) | V2-RECON → **BLOCKED**; open remediation item; correct 0023 register status |
| Project identity unconfirmed | V2-RECON → **REVIEW HOLD**; no status change to 0021–0024 |

> Nothing in this file changes the governing register. Applying any of the above requires PJ to edit
> `docs/YAV2_Master_Completion_Register.md` directly, under explicit authorisation, in a separate,
> PJ-gated commit.
