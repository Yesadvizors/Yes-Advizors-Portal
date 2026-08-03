# Client Lifecycle & Work Management Closure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repository-only reliability + consistency hardening of the existing client-lifecycle (`Clients.jsx`) and work-management (`Tasks.jsx`) surfaces, non-overlapping with PR #49/#51/#53.

**Architecture:** Reuse-first. Add small pure helpers to `src/helpers.js` (client lifecycle-status label, follow-up ageing predicates), consume them in `Tasks.jsx` and `Clients.jsx`, and add a retryable load-error state to `Tasks.jsx` mirroring the pattern already in `Clients.jsx`. Tests are pure-logic + static source guards (convention OD-5 — no jsdom/RTL, no invented DB shapes).

**Tech Stack:** Vite 5 + React 18 SPA; tests via `node --test` (`npm test`); Supabase JS client (read-only usage here; no backend change).

## Global Constraints

- **Repository-only.** No backend: no SQL/migration/RLS/RPC/grants/storage/MCP DB mutation. V2/yav2-dev only; V1/Production `zcszesuvjrryxtigjglt` prohibited. No deploy. No merge. Stop at **Draft PR** + merge-readiness report.
- **Base:** cut from `sync/integration` @ `a59d0e26548b8eaa7fea5ff8143ea98b868b3563`. Feature branch `feature/yav2-lifecycle-work-management-closure`; isolated worktree `D:/Claude/Claude Code/YAV2-Client-Lifecycle-Work-Management`.
- **Non-overlap:** do NOT re-touch task/follow-up/mark-filed WRITE paths (PR #49), compliance loaders (PR #51), or Client 360 (PR #53). Record those as done.
- **No new write path.** No client status-transition control (deferred). Status filtering + consistent read-only display only.
- **Preserve backend contracts:** no route/RPC/column renames; no new DB fields.
- **No raw `error.message` to users** (route through `safeErrorMessage`); no hardcoded fallbacks (OD-5).
- **Safety guard is active.** Commit messages / PR bodies must avoid the literal V1/Prod ref and command-like tokens (`rm -rf`, `reset --hard`, `git push … main`, etc.) or the PreToolUse guard will block the call. Use `--body-file` for PR bodies; reword commit messages.
- **Baseline:** 477 tests pass, `vite build` exit 0 (verify before starting).
- PR #48 (`feature/yav2-professional-redesign-launch`) untouched.

---

## File Structure

- **Modify** `src/helpers.js` — add pure helpers: `CLIENT_LIFECYCLE_STATUSES`, `clientStatusLabel`, `isFollowUpOverdue`, `isFollowUpToday`.
- **Modify** `src/components/Tasks.jsx` — load-error state + retry (WM-1); exact assignee filter (WM-2); consume follow-up predicates (WM-3); non-owner inline message (WM-4).
- **Modify** `src/components/Clients.jsx` — directors fetch error + race guard (CL-1); consistent lifecycle-status label + read-only status filter (CL-2); remove redundant ESC listener (CL-3).
- **Create** `tests/clientLifecycleWorkManagementClosure.test.js` — pure-logic + static source guards.
- **Create** `docs/YAV2_CLIENT_LIFECYCLE_WORK_MANAGEMENT_CLOSURE_REPORT.md`, `docs/YAV2_CLIENT_LIFECYCLE_WORK_MANAGEMENT_TEST_EVIDENCE.md`.
- **Modify** `docs/YAV2_Master_Completion_Register.md` — add package section.

---

## Task 0: Baseline verification

- [ ] **Step 1: Confirm branch, base, clean tree**

Run (in the isolated worktree):
```
git -C "D:/Claude/Claude Code/YAV2-Client-Lifecycle-Work-Management" rev-parse --abbrev-ref HEAD
git -C "D:/Claude/Claude Code/YAV2-Client-Lifecycle-Work-Management" status --short
```
Expected: `feature/yav2-lifecycle-work-management-closure`, clean.

- [ ] **Step 2: Install deps + baseline test/build**

Run: `npm ci` then `npm test` then `npx vite build`
Expected: `npm test` → 477 pass / 0 fail; `vite build` → exit 0.

---

## Task 1: Pure helpers in `src/helpers.js`

**Files:**
- Modify: `src/helpers.js` (append near the task-status helpers)
- Test: `tests/clientLifecycleWorkManagementClosure.test.js`

**Interfaces:**
- Produces:
  - `CLIENT_LIFECYCLE_STATUSES: string[]` = `['Draft', 'Active', 'Inactive', 'Archived']`
  - `clientStatusLabel(status): string` — blank/null → `'Unknown'`; otherwise the trimmed status verbatim (known or legacy). **Never defaults to `'Active'`.**
  - `isFollowUpOverdue(nextFollowupDate, today=todayLocal()): boolean` — truthy date strictly before `today` (local YYYY-MM-DD string compare).
  - `isFollowUpToday(nextFollowupDate, today=todayLocal()): boolean` — equals `today`.

- [ ] **Step 1: Write the failing tests**

Create `tests/clientLifecycleWorkManagementClosure.test.js`:
```js
/**
 * YAV2 Client Lifecycle & Work Management Closure — regression tests.
 * node:test — `npm test`. Convention OD-5: pure-logic + static source guards
 * (no jsdom/RTL, no invented DB shape). Non-overlapping with PR #49/#51/#53.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  clientStatusLabel, CLIENT_LIFECYCLE_STATUSES,
  isFollowUpOverdue, isFollowUpToday, todayLocal,
} from '../src/helpers.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

// ── 1. Client lifecycle status presentation (CL-2) ─────────────────────────────
test('CLW-1: clientStatusLabel never defaults a missing status to Active', () => {
  assert.equal(clientStatusLabel(null), 'Unknown')
  assert.equal(clientStatusLabel(undefined), 'Unknown')
  assert.equal(clientStatusLabel(''), 'Unknown')
  assert.equal(clientStatusLabel('   '), 'Unknown')
  assert.notEqual(clientStatusLabel(null), 'Active')
})

test('CLW-2: clientStatusLabel returns known + legacy statuses verbatim', () => {
  assert.equal(clientStatusLabel('Active'), 'Active')
  assert.equal(clientStatusLabel('Draft'), 'Draft')
  assert.equal(clientStatusLabel('Inactive'), 'Inactive')
  assert.equal(clientStatusLabel('Archived'), 'Archived')
  assert.equal(clientStatusLabel(' Active '), 'Active')          // trimmed
  assert.equal(clientStatusLabel('Suspended'), 'Suspended')      // legacy value preserved
  assert.ok(CLIENT_LIFECYCLE_STATUSES.includes('Inactive'))
  assert.ok(CLIENT_LIFECYCLE_STATUSES.includes('Archived'))
})

// ── 2. Follow-up ageing predicates (WM-3) ──────────────────────────────────────
test('CLW-3: follow-up due today is NOT overdue (local-date string compare)', () => {
  const today = todayLocal()
  assert.equal(isFollowUpToday(today, today), true)
  assert.equal(isFollowUpOverdue(today, today), false)          // due-today never overdue
})

test('CLW-4: follow-up overdue/today handle blank + past + future', () => {
  const today = '2026-08-03'
  assert.equal(isFollowUpOverdue('2026-08-02', today), true)
  assert.equal(isFollowUpOverdue('2026-08-04', today), false)
  assert.equal(isFollowUpOverdue('', today), false)
  assert.equal(isFollowUpOverdue(null, today), false)
  assert.equal(isFollowUpToday('2026-08-04', today), false)
  assert.equal(isFollowUpToday(null, today), false)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/clientLifecycleWorkManagementClosure.test.js`
Expected: FAIL — `clientStatusLabel`/`isFollowUpOverdue`/`isFollowUpToday`/`CLIENT_LIFECYCLE_STATUSES` are not exported.

- [ ] **Step 3: Implement the helpers**

In `src/helpers.js`, after the `getDueMeta` block (and after `todayLocal` is defined), add:
```js
// ── Client lifecycle status presentation ───────────────────────────────────────
// A client with no status is NOT assumed Active. Blank/null renders neutrally as
// "Unknown" so an inactive or mis-saved client is never silently shown Active.
// A non-empty legacy value is preserved verbatim (no invented mapping).
export const CLIENT_LIFECYCLE_STATUSES = ['Draft', 'Active', 'Inactive', 'Archived']
export function clientStatusLabel(status) {
  const s = (status == null ? '' : String(status)).trim()
  return s || 'Unknown'
}

// ── Follow-up ageing (local-date YYYY-MM-DD string compare; due-today is not overdue) ──
export function isFollowUpOverdue(nextFollowupDate, today = todayLocal()) {
  return !!nextFollowupDate && nextFollowupDate < today
}
export function isFollowUpToday(nextFollowupDate, today = todayLocal()) {
  return !!nextFollowupDate && nextFollowupDate === today
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/clientLifecycleWorkManagementClosure.test.js`
Expected: PASS (CLW-1..4).

- [ ] **Step 5: Commit**

```
git add src/helpers.js tests/clientLifecycleWorkManagementClosure.test.js
git commit -m "feat(lifecycle): pure helpers for client status label and follow-up ageing"
```

---

## Task 2: Work Management hardening — `src/components/Tasks.jsx`

**Files:**
- Modify: `src/components/Tasks.jsx`
- Test: `tests/clientLifecycleWorkManagementClosure.test.js` (add static guards)

**Interfaces:**
- Consumes: `isFollowUpOverdue`, `isFollowUpToday` (Task 1); existing `isMyTask`, `getDueMeta`, `isTaskClosed`, `isTaskCompleted`, `todayLocal`, `STATUS_OPTIONS`, `priColor`.
- Produces: a `loadError` state + retry branch (no exported API).

- [ ] **Step 1: WM-1 — load-error state.** Add `const [loadError, setLoadError] = useState(false)` beside the other `useState` calls, and replace `load()` so it captures each query's `error`:
```js
async function load() {
  setLoading(true)
  setLoadError(false)
  const [tasksRes, fuRes, tmRes] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('follow_ups').select('task_id'),
    supabase.from('team').select('name').eq('is_active', true).order('name'),
  ])
  if (tasksRes.error || fuRes.error || tmRes.error) {
    console.error('[Tasks] Failed to load task tracker:', tasksRes.error || fuRes.error || tmRes.error)
    setLoadError(true)
    setTasks([]); setFuCounts({}); setTeamMembers([])
    setLoading(false)
    return
  }
  setTasks(tasksRes.data || [])
  const counts = {}
  ;(fuRes.data || []).forEach(f => { counts[f.task_id] = (counts[f.task_id] || 0) + 1 })
  setFuCounts(counts)
  setTeamMembers((tmRes.data || []).map(m => m.name))
  setLoading(false)
}
```

- [ ] **Step 2: WM-1 — retry branch in render.** In the task-list card, change the `loading ? … : filtered.length === 0 ? … : filtered.map(…)` chain to insert a `loadError` branch between loading and empty (mirror `Clients.jsx`):
```jsx
{loading
  ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading tasks...</div>
  : loadError
  ? <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 6 }}>Couldn't load the task tracker</div>
      <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14 }}>We couldn’t load tasks. Please retry. If the problem continues, contact the portal administrator.</div>
      <button onClick={load} style={{ background: 'var(--dkgreen)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
    </div>
  : filtered.length === 0
  ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>No tasks match your filters.</div>
  : filtered.map(t => {
```
(Leave the existing `filtered.map` body unchanged.)

- [ ] **Step 3: WM-2 — exact assignee filter.** In the `filtered` predicate, change:
```js
if (fAssign !== 'All' && !(t.assigned_to || '').includes(fAssign)) return false
```
to:
```js
if (fAssign !== 'All' && (t.assigned_to || '') !== fAssign) return false
```

- [ ] **Step 4: WM-3 — consume follow-up predicates.** Update the import line to add the two helpers, then use them in the follow-up filter:
```js
import { getDueMeta, priColor, isMyTask, STATUS_OPTIONS, todayLocal, isTaskClosed, isTaskCompleted, isFollowUpOverdue, isFollowUpToday } from '../helpers'
```
Replace:
```js
if (fFollow === 'today' && t.next_followup_date !== today) return false
if (fFollow === 'overdue' && !(t.next_followup_date && t.next_followup_date < today)) return false
```
with:
```js
if (fFollow === 'today' && !isFollowUpToday(t.next_followup_date, today)) return false
if (fFollow === 'overdue' && !isFollowUpOverdue(t.next_followup_date, today)) return false
```
(Keep `const today = todayLocal()` above the filter; the `pending` branch is unchanged.)

- [ ] **Step 5: WM-4 — non-owner inline message.** In `markDone`, replace:
```js
if (!isMyTask(t, user)) { alert('Only ' + t.assigned_to + ' can mark this done'); return }
```
with:
```js
if (!isMyTask(t, user)) { setActionError('Only ' + (t.assigned_to || 'the assignee') + ' can mark this task done.'); return }
```

- [ ] **Step 6: Add static guards to the test file**

Append to `tests/clientLifecycleWorkManagementClosure.test.js`:
```js
// ── 3. Work-management source guards (Tasks.jsx) ────────────────────────────────
test('CLW-5: Tasks.load captures query errors and renders a retryable error state (WM-1)', () => {
  const src = read('../src/components/Tasks.jsx')
  assert.match(src, /setLoadError\(true\)/)
  assert.match(src, /tasksRes\.error \|\| fuRes\.error \|\| tmRes\.error/)
  assert.match(src, /Couldn't load the task tracker/)
  assert.match(src, /onClick=\{load\}/)              // retry re-runs load
})

test('CLW-6: Tasks assignee filter is exact, not substring (WM-2)', () => {
  const code = stripComments(read('../src/components/Tasks.jsx'))
  assert.doesNotMatch(code, /\(t\.assigned_to \|\| ''\)\.includes\(fAssign\)/)
  assert.match(code, /\(t\.assigned_to \|\| ''\) !== fAssign/)
})

test('CLW-7: Tasks uses shared follow-up predicates and no non-owner alert (WM-3/WM-4)', () => {
  const code = stripComments(read('../src/components/Tasks.jsx'))
  assert.match(code, /isFollowUpOverdue\(/)
  assert.match(code, /isFollowUpToday\(/)
  assert.doesNotMatch(code, /alert\(/)               // non-owner path now inline
  assert.match(code, /setActionError\('Only '/)
})
```

- [ ] **Step 7: Run tests + build**

Run: `node --test tests/clientLifecycleWorkManagementClosure.test.js` then `npx vite build`
Expected: CLW-1..7 PASS; build exit 0.

- [ ] **Step 8: Commit**

```
git add src/components/Tasks.jsx tests/clientLifecycleWorkManagementClosure.test.js
git commit -m "feat(work-mgmt): Tasks load-error retry, exact assignee filter, shared follow-up ageing, inline non-owner message"
```

---

## Task 3: Client Lifecycle hardening — `src/components/Clients.jsx`

**Files:**
- Modify: `src/components/Clients.jsx`
- Test: `tests/clientLifecycleWorkManagementClosure.test.js` (add static guards)

**Interfaces:**
- Consumes: `clientStatusLabel`, `CLIENT_LIFECYCLE_STATUSES` (Task 1); existing `useEscapeKey`, `safeErrorMessage`.

- [ ] **Step 1: CL-1 — directors fetch error + race guard.** Replace the `useEffect` that fetches `client_directors`:
```js
useEffect(() => {
  if (!viewClient) return
  let ignore = false
  const code = viewClient.client_id
  supabase.from('client_directors')
    .select('*')
    .eq('client_id', code)
    .eq('is_active', true)
    .order('is_primary_contact', { ascending: false })
    .order('created_at')
    .then(({ data, error }) => {
      if (ignore) return
      if (error) { console.error('[Clients] Failed to load directors:', error); return }
      // Only populate when rows exist, so a client with no client_directors rows
      // still falls back to legacy c.directors in the render below.
      if (data && data.length > 0) {
        setDirectorsMap(prev => ({ ...prev, [code]: data }))
      }
    })
  return () => { ignore = true }
}, [viewClient])
```

- [ ] **Step 2: CL-3 — remove redundant ESC listener.** Delete the manual window keydown `useEffect` (the one that does `if (e.key === 'Escape') setViewClient(null)`), keeping only `useEscapeKey(closeViewClient)`:
```js
// DELETE this block entirely:
// useEffect(() => {
//   function onKey(e) { if (e.key === 'Escape') setViewClient(null) }
//   window.addEventListener('keydown', onKey)
//   return () => window.removeEventListener('keydown', onKey)
// }, [])
```

- [ ] **Step 3: CL-2 — status filter state + import.** Add `clientStatusLabel, CLIENT_LIFECYCLE_STATUSES` to the `../lib/clientMaster` import? No — they live in `../helpers`. Add an import and a filter state:
```js
import { clientStatusLabel, CLIENT_LIFECYCLE_STATUSES } from '../helpers'
```
Add beside the `search` state: `const [fStatus, setFStatus] = useState('All')`.

Update the `filtered` list to apply the status filter:
```js
const filtered = clients.filter(c =>
  (fStatus === 'All' || clientStatusLabel(c.status) === fStatus) &&
  ((c.name || '').toLowerCase().includes(search.toLowerCase()) ||
   (c.client_id || '').toLowerCase().includes(search.toLowerCase()) ||
   (c.mobile || '').includes(search) ||
   (c.pan || '').toLowerCase().includes(search.toLowerCase()))
)
```

- [ ] **Step 4: CL-2 — status filter control.** In the search card `<div className="card" style={{ padding: 16, margin: '20px 0' }}>`, add a status `<select>` beside the search input (wrap them in a flex row):
```jsx
<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
  <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="🔍 Search by name, client ID, mobile, or PAN..." style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }} />
  <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1) }} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
    <option value="All">All statuses</option>
    {CLIENT_LIFECYCLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    <option value="Unknown">Unknown</option>
  </select>
</div>
```

- [ ] **Step 5: CL-2 — consistent status badge in detail modal.** Replace the detail badge expression `● {c.status || 'Active'}` and its color ternary so both use `clientStatusLabel(c.status)`:
```jsx
{(() => {
  const sl = clientStatusLabel(c.status)
  const tone = sl === 'Active' ? { background: 'rgba(16,185,129,.18)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,.3)' }
    : sl === 'Draft' ? { background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.15)' }
    : { background: 'rgba(212,185,120,.15)', color: '#E8D5A3', border: '1px solid rgba(212,185,120,.3)' }
  return <span className="cd-badge" style={tone}>● {sl}</span>
})()}
```

- [ ] **Step 6: Add static guards to the test file**

Append:
```js
// ── 4. Client-lifecycle source guards (Clients.jsx) ─────────────────────────────
test('CLW-8: directors fetch has a race guard and surfaces errors (CL-1)', () => {
  const code = stripComments(read('../src/components/Clients.jsx'))
  assert.match(code, /let ignore = false/)
  assert.match(code, /if \(ignore\) return/)
  assert.match(code, /\.then\(\(\{ data, error \}\)/)
  assert.match(code, /Failed to load directors/)
})

test('CLW-9: no null->Active default; consistent status label + read-only filter (CL-2)', () => {
  const code = stripComments(read('../src/components/Clients.jsx'))
  assert.doesNotMatch(code, /c\.status \|\| 'Active'/)   // the misleading default is gone
  assert.match(code, /clientStatusLabel\(c\.status\)/)
  assert.match(code, /fStatus/)                          // status filter state present
})

test('CLW-10: single Escape handler — no manual window keydown alongside useEscapeKey (CL-3)', () => {
  const code = stripComments(read('../src/components/Clients.jsx'))
  assert.match(code, /useEscapeKey\(/)
  assert.doesNotMatch(code, /addEventListener\('keydown'/)
})
```

- [ ] **Step 7: Run the closure tests + build**

Run: `node --test tests/clientLifecycleWorkManagementClosure.test.js` then `npx vite build`
Expected: CLW-1..10 PASS; build exit 0.

- [ ] **Step 8: Commit**

```
git add src/components/Clients.jsx tests/clientLifecycleWorkManagementClosure.test.js
git commit -m "feat(lifecycle): directors race/error guard, consistent status label + read-only status filter, single Escape handler"
```

---

## Task 4: Full verification, docs, and Draft PR

**Files:**
- Create: `docs/YAV2_CLIENT_LIFECYCLE_WORK_MANAGEMENT_CLOSURE_REPORT.md`, `docs/YAV2_CLIENT_LIFECYCLE_WORK_MANAGEMENT_TEST_EVIDENCE.md`
- Modify: `docs/YAV2_Master_Completion_Register.md`

- [ ] **Step 1: Full suite + build + regression check**

Run: `npm test` then `npx vite build`
Expected: full suite **502 pass / 0 fail** (477 baseline + 10 CLW tests + prior counts; the exact final number is whatever `npm test` reports with 0 failures) and build exit 0. If any pre-existing static-guard test in another file legitimately breaks because of these edits (e.g. a guard asserting the old `Tasks.load` shape or the removed ESC listener), update that single assertion to match the improved-but-correct code and note it in the report (same pattern as PR #49's one amended test). Do not weaken an unrelated test.

- [ ] **Step 2: Non-auth boot check**

Run the dev server and confirm it renders Login (not blank), HTTP 200, 0 console errors. (Use the project `run`/`verify` skill or `npx vite` + a curl of `/`.) Record the result.

- [ ] **Step 3: Write the closure report + test evidence**

Author `docs/YAV2_CLIENT_LIFECYCLE_WORK_MANAGEMENT_CLOSURE_REPORT.md` following the house format (see `YAV2_CORE_OPERATIONAL_CLOSURE_REPORT.md`): status table, scope (WM-1..4, CL-1..3), exact file counts, tests/build results, recorded backend dependencies (client-ID allocation race; task/followup uniqueness; client status-transition + Mark-Done role enforcement — RLS), manual-verification dependency (interactive authenticated smoke needs a governed test account + git-ignored `.env.local`), deferred items (guarded status-transition control), and rollback. Author `..._TEST_EVIDENCE.md` listing CLW-1..10 with the pass output.

- [ ] **Step 4: Update the completion register**

Add a `## Client Lifecycle & Work Management Closure (branch feature/yav2-lifecycle-work-management-closure)` section to `docs/YAV2_Master_Completion_Register.md` mirroring the Core Operational / Compliance sections: base SHA, no-backend statement, scope closed, exact file counts, test/build numbers, backend deps, evidence paths, and **Status: Draft PR against sync/integration — not merged, not deployed**.

- [ ] **Step 5: Commit docs**

```
git add docs/YAV2_CLIENT_LIFECYCLE_WORK_MANAGEMENT_CLOSURE_REPORT.md docs/YAV2_CLIENT_LIFECYCLE_WORK_MANAGEMENT_TEST_EVIDENCE.md docs/YAV2_Master_Completion_Register.md
git commit -m "docs(lifecycle): closure report, test evidence, and register section"
```

- [ ] **Step 6: Push + open Draft PR**

Run: `git push -u origin feature/yav2-lifecycle-work-management-closure`
Then `gh pr create --draft --base sync/integration --head feature/yav2-lifecycle-work-management-closure --title "…" --body-file <scratchpad body>` (use `--body-file`; keep the literal V1/Prod ref out of the body so the active guard does not block the call).
Expected: Draft PR created. **Do NOT mark Ready; do NOT merge.**

- [ ] **Step 7: Merge-readiness report to PJ**

Produce the consolidated merge-readiness report: both PRs (safety-controls #56 + this functional PR), test/build/boot evidence, file counts, recorded backend deps, and the explicit STOP (Draft only; awaiting PJ review). This is the terminal state.

---

## Self-Review (completed at authoring)

- **Spec coverage:** WM-1 (Task 2 Steps 1-2, CLW-5) · WM-2 (Task 2 Step 3, CLW-6) · WM-3 (Task 1 + Task 2 Step 4, CLW-3/4/7) · WM-4 (Task 2 Step 5, CLW-7) · CL-1 (Task 3 Step 1, CLW-8) · CL-2 (Task 3 Steps 3-5, CLW-9, CLW-1/2) · CL-3 (Task 3 Step 2, CLW-10). Safety controls (Part 1) delivered separately (PR #56). Backend deps + deferred transition recorded in Task 4.
- **Placeholder scan:** none — all steps carry real code.
- **Type consistency:** helper names (`clientStatusLabel`, `CLIENT_LIFECYCLE_STATUSES`, `isFollowUpOverdue`, `isFollowUpToday`) are identical across Task 1 definition, Task 2/3 consumption, and the tests.
