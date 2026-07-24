# YAV2 Recovery — Sprint 1 Coordination Record (T1 Control Tower)

**Owner:** T1 — Control Tower / Lead Integrator (`sync/integration`). T1-owned path (`docs/recovery/**`).
**Governing HEAD:** `1286a290f5d4287e70c6853d2eb3bad16256e276` (`origin/ui/redesign-v1`, PR #29 merged).
**Purpose:** single reference for what each workstream may begin, in what order, without overlap. T1 performs **no** T2/T3 implementation.
**Status:** T2 and T3 have submitted their first draft packages (PR #31, PR #30). **Nothing integrated. G-16 contract NOT frozen.**

## 1. Branch/HEAD verification & PR status
| Workstream | Branch | Draft PR | Base | Head | Based on | Review | Integrated |
|---|---|---|---|---|---|---|---|
| T1 Control Tower | `sync/integration` | — | — | `1a85aaf` | GOV | n/a | n/a |
| T2 App & Runtime | `sync/app-runtime` | **#31** | `sync/integration` | `d856669` (+2) | `sync/integration@1a85aaf` | **PASS** | **NO — keep unchanged** |
| T3 Supabase & Security | `sync/supabase-security` | **#30** | `sync/integration` | `69f8093` (+2) | GOV | **PASS WITH SPECIFIC CORRECTIONS — correction cycle in progress** | **NO — do not integrate** |

`origin/ui/redesign-v1` = GOV (MATCH). No branch in >1 worktree. Neither PR merged.

## 2. Overlap / ownership monitoring (verified clean)
- **T2 authored (in-bounds, T2-owned):** `docs/acceptance/evidence/G-12_runtime/**`, `docs/acceptance/evidence/G-13_rbac/**`, `docs/acceptance/evidence/G-19_field_contract/**`, `docs/acceptance/evidence/README.md`, `tests/appShellRuntime.test.js`.
- **T3 authored (in-bounds, T3-owned):** `supabase/verification/T3_DB_CONTRACT_PROPOSAL.md`, `T3_DB_CONTRACT_APPENDIX.md`, `T3_SECURITY_VARIANCE_REPORT.md`, `T3_PJ_EVIDENCE_REQUEST.md`, `supabase/functions/EDGE_FUNCTION_RECOVERY_STATUS.md`.
- **No path overlap** between T2 and T3 authored files. **No ownership crossing** — T3 did not write `docs/recovery/**`; T2 only inherited (did not modify) T1's coordination record.
- Integration-safety: T2's PR #31 does not modify `SPRINT_COORDINATION.md`, so T1 advancing this file will not conflict with PR #31.

## 3. Corrected sequencing (authoritative)
```
A. T3 implements consolidated PR #30 corrections            [IN PROGRESS — head 69f8093]
B. ChatGPT final review of amended PR #30                   [PENDING]
C. Only after final PASS:
     1) T1 reviews corrected T3 contract package
     2) T1 freezes G-16 shared DB/types contract            [NOT YET — BLOCKED on C.1]
     3) T2 resumes G-19 field reconciliation                [gated by G-16 freeze]
     4) PJ separately authorises corrected V2-only read-only evidence run
D. No merge into sync/integration until applicable independent-review PASS + PJ integration authorisation
```
Dependency edges unchanged: `G-16 ← G-03`; `G-19 ← G-03 + G-16`; `G-13 ← A4 RLS evidence (T3) + creds`.

## 4. Current gate state per workstream
- **T3:** in its **correction cycle** for PR #30 (ACL/PUBLIC detection, FORCE-RLS & `search_path` wording per review). Read-only/source only — **no SQL, no deploy** performed or authorised. `T3_PJ_EVIDENCE_REQUEST.md` must **NOT** be executed yet (security-query wording/query issues to be corrected first); PJ authorisation of any V2-only read-only run comes only after final PASS.
- **T2:** PR #31 **PASS**, **keep unchanged**. G-12/G-13 evidence templates + app-shell test are schema-independent. **G-19 remains gated** — its `CONSUMPTION_MANIFEST.md` is a *preparatory inventory only*; field reconciliation must not be treated as complete until T1 freezes G-16.
- **T1:** coordination only. **G-16 NOT frozen** (awaits corrected T3 contract + final PASS). No contract file created.

## 5. Stacked-PR sequence (target model — not authorisation to open/merge)
1. **PR-1 = PR #30** — T3 DB/security definitions & reconciliation → `sync/integration` (in correction).
2. **PR-2** — T1 shared contracts / generated types (G-16 freeze) → `sync/integration` (after C.1/C.2).
3. **PR-3 = PR #31** — T2 application/runtime evidence → `sync/integration` (PASS; hold for ordered integration).
4. **PR-4** — T3 Edge source + T1 integration exports → `sync/integration`.
5. **PR-5** — `sync/integration` → `ui/redesign-v1` (final; PJ-approved only).
T1 alone integrates; no workstream self-merges into `ui/redesign-v1`.

## 6. Provisional completion (NOT official until integration)
- Official integrated completion: **38.1%** (unchanged).
- Provisional: T2 **+0.3 pp**, T3 **+0.9 pp** → provisional combined **≈ 39.3%**.
- Provisional contributions are **not** added to official completion until PRs pass final review and PJ authorises integration. Remaining official work: **61.9%**.

## 7. Blocker register (updated)
- **BLK-6 (active):** G-16 freeze blocked on corrected T3 contract + PR #30 final PASS → T2 G-19 held.
- **BLK-7 (active):** `T3_PJ_EVIDENCE_REQUEST.md` must not be executed — security-query wording issues; awaits T3 correction + PJ authorisation.
- BLK-1 test creds (PJ) → G-12/G-13 live capture. BLK-2 A4 SQL is PJ-run on V2. BLK-3 n8n/WhatsApp external. BLK-4 Edge source (G-09)/deploy (G-10 SA). BLK-5 Vercel evidence (PJ).

## 8. Live-action gates (STOP — PJ only; none authorised in Sprint 1)
Merge into `ui/redesign-v1` or `sync/integration`; SQL/DB execution; deployment; Vercel alias (G-15); Edge deploy (G-10); n8n/WhatsApp; V1 access.
