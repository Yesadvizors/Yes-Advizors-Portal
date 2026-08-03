# YAV2 Client 360° Operational Workspace — Manual UAT Result

| Field | Value |
|---|---|
| UAT date | 2026-08-03 (IST) |
| Tester | PJ (live yav2-dev session) + Claude Code (corrections, retest, source/test verification) |
| Environment | Authorised **V2 / yav2-dev** via local dev server + `.env.local` (V1/Prod not accessed) |
| Branch | `feature/yav2-client-360-operational-workspace` |
| Pre-correction head | `a542ab8e85f9e398574f510457323fc2ac260b24` |
| Feature flag | `VITE_CLIENT360_UI=true` (local `.env.local` only; never committed) |
| Client codes used | `YA-013` (live), plus source/test verification across scenarios |

> No credentials, keys, or `.env.local` contents are recorded here.

## 1. Live results confirmed (PJ, client YA-013)
PASS: launcher appears · workspace opens · header loads · all **14 cards** render · all **9 tabs** render ·
missing values show `—` · no raw `null`/`undefined`/backend error · Financials tab loads 5 FY 2026-27 rows
(all `Not Uploaded`, extraction `pending`) · Overview reports 5 financial items · no formal assigned team shown.

## 2. Findings and corrections

| Defect | Sev | Expected | Actual (pre-fix) | Correction | Retest |
|---|---|---|---|---|---|
| **UAT-01** | Low (visual) | Attention messages read cleanly and are clearly clickable | Message text showed an unintended line (dotted-underline affordance read as a strike) | Replaced with a solid-underline link colour + weight; explicit `textDecorationLine: 'underline'`; **no `line-through`** anywhere | PASS — test **C360-48** (no line-through; items navigate on click) |
| **UAT-02** | Medium (misleading wording) | Wording must not imply "review" for `Not Uploaded` rows | Card "Financials to review"; attention "5 … pending review" while rows are `Not Uploaded` | Card → **"Financial documents pending"**; attention → **"… pending action"**; section keeps full breakdown (reviewed/extracted/uploaded/not uploaded/pending); `Not Uploaded` counts as pending **action** | PASS — tests **C360-49/50** |

### Independent-review LOW findings addressed in this closure
| ID | Correction | Retest |
|---|---|---|
| F1 | Restricted state no longer exposes client identity — visible title **and** dialog `aria-label` gated on `role.canView`; restricted title is generic "Client workspace" | C360-52 |
| F2 | `extraction_status === 'reviewed'` is treated as terminal — never counted pending | C360-51 |
| F3 | Report clarifies 456 (integration-point) vs **471/477** authoritative test count | docs |
| F5 | `canUploadDocument` now gates the Documents manager (no-op for Admin/Manager, removes dead capability) | C360-53 |
| F4 | Not taken — optional pure stale-request sequencer extraction; **accepted** (behaviour covered by static guard C360-42). No functional gap. |

## 3. Remaining UAT items (Section D) — verification method
PJ confirmed the core runtime for YA-013 (§1). The interactive session available to the assistant had the
environment config but not Admin/Manager login credentials, so the remaining Section D items were verified at
**source + executable/static test** level (not additionally re-driven live). Each is backed by a test:

| Area | Verification |
|---|---|
| Team & access (no fabricated RM, derived label, no raw UUID) | source + C360-16 |
| Documents (scope, distinct empty vs load-fail, upload gated) | source + C360-13/53 |
| Compliance (due-today≠overdue, invalid date, states) | C360-6/7/9/34 |
| Tasks (counts, prefill YA-013, no stale on reopen) | C360-10/23/24/43 |
| Follow-ups (pending vs log, closed excluded) | C360-11/12 |
| Notices (empty/columns, replied/closed excluded) | C360-14/35/36 |
| Recent activity (client-specific, newest-first, not an audit log) | C360-17/18 |
| Quick actions (Create Task prefill, Edit Client, Upload, Refresh, Close/ESC/backdrop) | C360-43/47/53 + source |
| Client switching (no stale prior-client data) | C360-42 (stale guard) + source |
| Responsive (internal table scroll, no page overflow) | source (`overflowX:auto`, `min(…,100%)` widths; no media-query regressions) |
| Roles (Admin/Manager allowed; others/inactive/unknown denied) | C360-1/2 |

## 4. Remaining limitations (accepted, non-blocking)
- Exhaustive multi-role live click-through beyond PJ's confirmed YA-013 session is covered by source/tests, not a second live pass (no interactive credentials in the assistant session).
- Backend dependencies unchanged (client↔team assignment; assignee UUID→name; unified audit feed; required-doc checklist) — recorded in the package report, not executed.

## 5. Final UAT decision
**UAT PASS** — all confirmed findings (UAT-01, UAT-02) corrected and retested; no Critical/High/blocking-Medium
defect outstanding; full suite **477/477 pass**, `vite build` clean.
