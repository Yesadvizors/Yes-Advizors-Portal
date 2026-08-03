# YAV2 Client 360 — Handshake / Continuation Notes

**Prepared:** 03-Aug-2026, 08:09 AM IST  
**Authority:** PJ  
**Repository:** `Yesadvizors/Yes-Advizors-Portal`  
**Local reconciliation repo:** `D:/Claude/Claude Code/Yes-Advizors-Portal-V2-Reconciliation`  
**Client 360 worktree:** `D:/Claude/Claude Code/YAV2-Client-360-Operational-Workspace`  
**Feature branch:** `feature/yav2-client-360-operational-workspace`  
**Draft PR:** `#53`  
**Target:** `sync/integration`

---

## 1. Whole-product position

- **Verified whole-project completion:** **47.0%**
- **Remaining:** **53.0%**
- The full product baseline is always treated as **100%**.
- No additional percentage is earned merely because a Draft PR or review exists.
- Full remaining Client 360 credit requires: UAT pass, corrections, merge, post-merge tests/build, completion-register update, and blueprint update.

Latest blueprint created in chat:

`YAV2_Whole_Product_Completion_Blueprint_2026-08-03_v6.xlsx`

The blueprint records:
- Client 360 implementation: completed checkpoint
- Independent review: passed
- Live UAT: in progress
- Next big package: not started due to Client 360 closure gate

---

## 2. Client 360 repository position

- PR #53 is **OPEN / Draft / not merged**.
- Reviewed feature head before live UAT:  
  `a542ab8e85f9e398574f510457323fc2ac260b24`
- Governing base previously verified:  
  `d07e94ec7f000cf6dc107fb6509d5bb62545bc3f`
- Independent review decision: **PASS — READY FOR PJ MERGE AUTHORISATION**, subject to live UAT.
- Independent verification completed:
  - Focused tests: **47/47 passed**
  - Full tests: **471/471 passed**
  - Build: passed
  - `git diff --check`: clean
  - No Critical, High, or blocking Medium findings
  - PR #48 untouched
  - No SQL, migration, RLS, Supabase Dashboard, production, or deployment activity

---

## 3. Supabase / local UAT environment

Connected Supabase project verified:

- Project name: `yav2-dev`
- Project ref: `ogjrwemjefvccpyjwxuo`
- Region: `ap-south-1`
- Status: `ACTIVE_HEALTHY`

A local `.env.local` was placed in the Client 360 worktree with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` / publishable key
- `VITE_SUPABASE_FUNCTIONS_URL`
- `VITE_CLIENT360_UI=true`

No service-role key was used or authorised.

Local Vite server successfully started on:

`http://localhost:5174/`

Do not commit `.env.local`.

---

## 4. Live UAT completed so far

Test client used:

- **Rupesh & Co**
- Client code: **YA-013**

Confirmed live PASS items:

- Client 360 launcher is visible for authorised user.
- Workspace opens successfully.
- Client name, code, type, status, and FY display.
- All **14 operational summary cards** render.
- All **9 tabs** render.
- Missing values display as `—`.
- No visible raw `null`, `undefined`, or backend error.
- Financials tab loads successfully.
- FY 2026–27 financial records: **5**.
- All 5 records show **Not Uploaded**.
- Extraction status shows **pending**.
- No formal assigned team is shown.

---

## 5. Confirmed UAT findings

### UAT-01 — Visual defect

**Severity:** Low  
**Location:** Attention Required messages

Observed:
- Attention messages appear with an unintended strike-through / line through the text.

Required correction:
- Remove unintended line-through styling.
- Preserve click/navigation behaviour.
- Preserve accessible visual indication.
- Add a regression test or static assertion preventing `text-decoration: line-through`.

### UAT-02 — Misleading financial wording

**Severity:** Medium  
**Location:** Summary card and Attention Required message

Observed wording:
- `Financials to review`
- `5 financial documents pending review`

Actual data:
- All 5 records are **Not Uploaded**, not awaiting review.

Required correction:
- Use a neutral label such as `Financial documents pending`.
- Use attention wording such as `5 financial documents pending action`.
- Preserve detailed status breakdown in the Financials tab.
- Add tests for revised wording and status semantics.

---

## 6. Remaining live UAT

Complete before merge:

1. Team & access
2. Documents
3. Compliance
4. Tasks
5. Follow-ups
6. Notices
7. Recent activity
8. Create Task quick action
9. Edit Client quick action
10. Upload Document flow
11. Refresh / close / Escape / backdrop
12. Client switching and stale-data check
13. Responsive layout
14. Admin and Manager role checks
15. Unauthorised-role check where safely available

Do not create or modify business data unless specifically required and authorised.

---

## 7. Current governing closure instruction

The current objective is to complete **Client 360 closure first**.

Required sequence:

1. Complete remaining live UAT.
2. Consolidate all findings.
3. Correct UAT-01 and UAT-02 plus any other blocking UAT defects.
4. Update tests.
5. Run focused and full tests.
6. Run production build.
7. Update `docs/YAV2_CLIENT_360_UAT_RESULT.md`.
8. Update PR #53 body.
9. Mark PR #53 Ready only after all gates pass.
10. Merge using **merge-commit** method with expected-head protection.
11. Run post-merge tests and build on `sync/integration`.
12. Update `docs/YAV2_Master_Completion_Register.md`.
13. Update the Excel blueprint and whole-project percentage.
14. Stop. Do not start another package in the same closure run.

---

## 8. Next large package — held

Planned next package:

**YAV2 Client Lifecycle & Work Management Closure**

Proposed branch:

`feature/yav2-client-lifecycle-work-management`

Proposed worktree:

`D:/Claude/Claude Code/YAV2-Client-Lifecycle-Work-Management`

This package must **not start** until:

- PR #53 is merged.
- Client 360 UAT passes.
- UAT corrections are completed.
- Post-merge tests/build pass.
- Completion register is updated.
- PJ explicitly authorises the new package.

A previous attempt correctly hard-stopped because these conditions were not met.

---

## 9. Governance boundaries

Allowed for Client 360 closure:

- Local authorised yav2-dev frontend UAT
- Client 360 source/test/doc corrections
- Git commits and push to feature branch
- Ready status and merge only after mandatory gates pass
- Post-merge verification

Not allowed:

- V1
- Production
- Supabase Dashboard
- SQL
- Migrations
- RLS/policy/grant changes
- Service-role credentials
- User/password changes
- Storage changes
- Edge Function changes
- Deployment
- PR #48 modification
- Force push
- Destructive Git commands
- Starting another package before closure

GitHub remains the permanent source of truth.

---

## 10. New-chat continuation instruction

Start the new chat with:

> Continue YAV2 from the handshake file `docs/handshakes/YAV2_CLIENT_360_HANDSHAKE_2026-08-03_0809_IST.md` on branch `feature/yav2-client-360-operational-workspace`. Client 360 PR #53 is Draft and unmerged. Whole-project completion is 47%. Live UAT is in progress. UAT-01 is the Attention Required strike-through defect. UAT-02 is misleading financial pending-review wording. Complete Client 360 UAT, issue one consolidated correction package, merge only after all gates pass, run post-merge verification, update the completion register and Excel blueprint, and do not start the next package before closure.

---

## 11. Immediate next action

Continue live UAT from:

- **Team & access** tab
- then **Documents**
- then remaining tabs and quick actions

After UAT is complete, prepare one consolidated correction prompt for Claude.

---

**Current final state:** CLIENT 360 NOT YET CLOSED — LIVE UAT IN PROGRESS  
**Whole-project completion:** 47.0%  
**Remaining:** 53.0%
