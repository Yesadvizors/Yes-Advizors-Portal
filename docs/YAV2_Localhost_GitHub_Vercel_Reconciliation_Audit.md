# YAV2 Portal — Localhost ↔ GitHub ↔ Vercel Reconciliation & Live-Alignment Audit

**Type:** Documentation-only record. **Governance:** Issue #13. **Work-package issue:** #17. **Reviewer:** ChatGPT
(prior audit result: **PASS WITH SPECIFIC CORRECTIONS**). **Author:** Claude Code · **Approver:** PJ.
**Audit date:** 2026-07-23 IST. **Governing base:** `ui/redesign-v1` @ `e0cb82b15bd4cbaef434a161a1ee5dfd57a4c782`.

> **Read-only audit.** No Supabase access, no runtime execution, no Vercel change, no deployment, no migration/SQL,
> no V1/Production action, no reconciliation. This document **records** the audit and the corrected opinion; it does
> **not** perform reconciliation. Local-only P6 files and ZIP packages are **not** staged/committed by this package.

## 1. Authoritative identifiers
- **Repository:** `Yesadvizors/Yes-Advizors-Portal` (GitHub repoId 1257818966, public).
- **Governing branch:** `ui/redesign-v1` — **GitHub HEAD `e0cb82b15bd4cbaef434a161a1ee5dfd57a4c782`**. Local working
  copy of the branch is behind (fast-forward-only; 0 ahead / 4 behind) — a local sync state, not a divergence.
- **Approved commits merged into the governing branch:**
  - PR **#15** `docs/project-wide-ai-collaboration-setup` → merge `e6b7ec6b50695a992a08f841b9e0dd309ec696ad`.
  - PR **#16** `docs/p6-first-release-scope-and-due-dates` → merge `e0cb82b15bd4cbaef434a161a1ee5dfd57a4c782`.
  - Prior source line: app source unchanged since `3a5f439c15cafa493cd2d2320d7733f286441b6b` (P5 UI); every commit
    since is documentation-only.
- **Issues:** #13 (project-wide collaboration governance), #14 (P6 simple first-release scope), #17 (this reconciliation work package).

## 2. Vercel project classification
| Vercel project | Project ID | Role (proposed classification) | Governing V2? | Production? | Notes |
|---|---|---|---|---|---|
| `yes-advizors-portal-v2-preview` | `prj_PFPT5rOJ4hpjyfqDHvppBlxTVeZv` | **Governing V2 Preview** target | **Yes** | No (`live:false`; all deployments target = Preview) | Latest deployment `dpl_Cogv748rziz1cqgJC87DTFvD4b8V`, commit `e0cb82b…`, ref `ui/redesign-v1`, GitHub-verified. Team `team_k1XHDoYfk0zOBVvGC4pVPFOc`. |
| `yes-advizors-portal` | `prj_7vjFHtSJQIIHiPJEvPw0DSwnCvEJ` | **Separate project** (auto-built the PR branches as Preview) | No | **Not deep-audited** in this pass | Its independent Production state is out of V2 audit scope; **no Production action was taken** by any reconciliation activity. Classify/confirm at a later gate. |

## 3. Six-dimension alignment (each assessed independently — do NOT infer runtime PASS from matching SHAs)
| # | Dimension | Result | Evidence |
|---|---|---|---|
| A | **Source-code alignment** (localhost ↔ GitHub) | **PASS** | Tracked source identical; working tree has no `src/` changes; `src/` (55), `tests/` (14) present on `ui/redesign-v1@e0cb82b`. |
| B | **GitHub branch alignment** | **PASS** | Governing branch `ui/redesign-v1` HEAD `e0cb82b…`; PRs #15/#16 merged; no approved unmerged current-cycle work. |
| C | **Vercel deployment SHA alignment** | **PASS** | Latest V2 deployment commit `e0cb82b…` == GitHub `ui/redesign-v1` HEAD `e0cb82b…`, from the authorised repo/branch. |
| D | **Runtime application verification** (does the deployed app actually behave as expected end-to-end) | **NOT FULLY VERIFIABLE** | No runtime evidence gathered; the app was not driven/exercised in this read-only audit. Matching SHAs prove *provenance*, not *runtime behaviour*. |
| E | **Database / migration verification** | **PARTIAL / NOT FULLY VERIFIABLE** | Migration files `0001–0011, 0014–0018, 0021, 0022` (+ rollbacks) and execution-evidence docs present in GitHub; **actual V2 (`ogjrwemjefvccpyjwxuo`) execution state NOT VERIFIABLE** (Supabase intentionally not accessed); legacy `0012` file/provenance gap (E-3). |
| F | **Environment / configuration verification** | **NOT FULLY VERIFIABLE** | Vercel/Supabase env-var values and build configuration were not (and must not be) exposed; only `.env.example` is tracked. Correct project-ref/env binding is not independently confirmed here. |

**Correction applied (per ChatGPT):** source-code alignment (A), branch alignment (B) and deployment-SHA alignment
(C) are **PASS**; **complete runtime functional alignment remains NOT FULLY VERIFIABLE** (D/E/F) without runtime,
database and configuration evidence. **A source-code/SHA match must not be reported as a full runtime functional PASS.**

## 4. Ten-assertion summary (from the reviewed audit, as corrected)
| # | Assertion | Result |
|---|---|---|
| 1 | Completeness of GitHub | PASS *(legacy `0012` gap → #8)* |
| 2 | Absence of material localhost-only work | PASS WITH EXCEPTIONS (E-1) |
| 3 | Governing-branch completeness | PASS |
| 4 | Vercel source alignment | PASS |
| 5 | Deployment SHA alignment | PASS |
| 6 | Functional alignment | **PASS WITH EXCEPTIONS** — source-code aligned; **runtime functional alignment NOT FULLY VERIFIABLE** (see §3 D/E/F) |
| 7 | Documentation alignment | PASS WITH EXCEPTIONS (E-2) |
| 8 | Migration alignment | PASS WITH EXCEPTIONS (E-3); DB execution NOT VERIFIABLE |
| 9 | No Production contamination | PASS |
| 10 | Secret hygiene | PASS |

## 5. Exception register
| ID | Assertion | Exact difference | Localhost evidence | GitHub evidence | Vercel evidence | Risk | Required corrective package (future) | PJ decision required |
|---|---|---|---|---|---|---|---|---|
| **E-1** | 2 | Local-only, superseded P6 "Rev10" material + review bundles: 14 `docs/M1B_P6_*.md`, `docs/YAV2_P6_Readonly_Discovery_Execution_Capture_22_July_2026_IST.md`, `supabase/verification/M1B_P6_discovery_readonly.sql`, and 26 `*.zip` — plus uncommitted edits in `docs/YAV2_Master_Completion_Register.md` | `git status`: `??`/`M` on the above | Not present on any branch | N/A | Low — superseded by the #14 simple scope (`PROJECT_STATUS.md` marks Rev10 not governing) or transient bundles | Retention package: (a) discard, (b) archive outside repo, or (c) commit a curated subset under a future PJ-approved issue. **This package does NOT stage/commit them.** | Yes |
| **E-2** | 7 | GitHub `PROJECT_STATUS.md`/`CURRENT_PHASE_SCOPE.md` were pre-#16 (said "no P6 due-date PR yet", HEAD `270da9e…`) | `M docs/YAV2_Master_Completion_Register.md` (local P6 edits) | pre-#16 wording on `e0cb82b` | N/A | Low — expected post-closure status refresh | **Proposed by this draft PR #18** — refreshes `PROJECT_STATUS.md` + `CURRENT_PHASE_SCOPE.md` post-#16 (docs-only); **governing only after ChatGPT PASS + PJ-authorised merge** (closed then) | No (routine) |
| **E-3** | 8 | `supabase/migrations/0012*` absent (register R-9: "secure-docs, executed live, no file in repo"); `0013` reserved/unused | register R-9 text | `0012`/`0013` absent on `ui/redesign-v1` | N/A | Medium — an executed V2 migration lacks an immutable file + evidence (provenance/DR gap) | **Future** DB-gate package to recover/re-author `0012` with content + evidence (do not reuse `0012`/`0013`). **Not recovered in this package.** | Yes (schedule) |

## 6. Superseded items — identified only (NOT closed/deleted by this package)
- **Open PRs (superseded, pre-M1 feature branches):** **#6** `feat/phase4c-audit-log-implementation-draft`, **#9**
  `feat/dkyc-phase2-frontend`, **#10** `feat/dkyc-statutory`. Recommendation: PJ-decided disposition at a later gate.
  **Not closed here.**
- **Local-only branch:** `g2b/v2-migrations` @ `ae6bf1e` (exists locally only; not on origin; superseded PR-#12
  baseline). **Not deleted here.**
- Other local branches (informational): `fix/frontend-safety-v1` (`bda50f6`), `main` (`0588806`).

## 7. Proposed sequence of future reconciliation packages (each a separate PJ-approved, documentation-or-gated item)
1. **Post-#16 status refresh** — *(this package)* update `PROJECT_STATUS.md` + `CURRENT_PHASE_SCOPE.md`. Docs-only.
2. **Local-only retention (E-1)** — PJ decides discard / archive / curated-commit of the superseded P6 material + ZIPs.
3. **Second Vercel project classification** — confirm `yes-advizors-portal` role/Production posture (read-only), no change.
4. **Runtime/config verification (D/F)** — a controlled, PJ-approved runtime check of the governing V2 Preview
   (drive the app; confirm env/project-ref binding) to upgrade D/F beyond NOT FULLY VERIFIABLE. No Production.
5. **DB/migration verification (E)** — PJ-run read-only V2 checks to reconcile executed migrations vs repo files;
   then the **`0012` recovery** DB-gate package (E-3). PJ-executed on V2 only.
6. **Superseded-PR/branch disposition** — PJ-decided close/keep for #6/#9/#10 and `g2b/v2-migrations`.

## 8. Audit opinion
### `ALIGNMENT WITH SPECIFIC EXCEPTIONS`
The governing provenance chain is aligned: GitHub `ui/redesign-v1@e0cb82b15bd4cbaef434a161a1ee5dfd57a4c782` ↔
Vercel V2 deployment `dpl_Cogv748rziz1cqgJC87DTFvD4b8V` (commit `e0cb82b…`, ref `ui/redesign-v1`, Preview, verified),
from the authorised repository; source code and merged approved work are consistent. **This is expressly NOT a full
runtime functional PASS:** runtime application (D), database/migration execution (E) and environment/configuration
(F) verification are **NOT FULLY VERIFIABLE** without runtime/database/configuration evidence, and three specific
exceptions stand — **E-1** (local-only superseded material), **E-2** (stale status docs, corrected by this package),
**E-3** (legacy `0012` provenance gap). It is not `MATERIAL MISALIGNMENT` because the deployed functional source and
the branch↔deployment SHA alignment hold.

**Unresolved limitations:** V2 database/migration execution state (Supabase not accessed); runtime behaviour of the
deployed app (not exercised); Vercel/Supabase environment-variable and build-config values (not exposed); the
`yes-advizors-portal` project's Production posture (not deep-audited). These are addressed by the future packages in §7.
