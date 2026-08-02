# YAV2 — Compliance Reliability and Consistency Closure — Test Evidence

**Branch:** `feature/yav2-compliance-reliability-closure` @ base `sync/integration`
`53d14b73c90bdc7d412b92f44b5d9781179a5235`.
**Convention (OD-5):** no jsdom / React Testing Library — pure-logic unit tests over the shared helpers plus
static source guards that lock in the corrections. No live Supabase; no DB shape invented.

## Commands and result

```
$ node --test
ℹ tests 422
ℹ pass  422
ℹ fail  0

$ node --run build      # vite build
✓ 125 modules transformed.
✓ built in ~2.1s        # exit 0

$ git diff --cached --check
(clean)
```

**Baseline was 399 pass / 0 fail; this package adds 23 tests → 422 pass / 0 fail. No existing (pre-package)
test was modified.** (The independent-review corrections revised this package's own new tests — CR-1, CR-7,
CR-9, CR-12 — to reflect the conservative global closed set, and added CR-1b/CR-7b/CR-9b/CR-10b/CR-10c/CR-10d.)

## New tests — `tests/complianceReliabilityClosure.test.js`

Pure-logic over `src/lib/compliance.js` (clock injected as a fixed `TODAY = '2026-08-02'`):

| ID | What it proves |
|---|---|
| CR-1 | Global closed set is the **conservative** `Filed/Completed/Closed/Not Applicable` (+ defensive `Filed / Completed`/`Cancelled`/`Done`); `Reviewed`/`Uploaded` are **NOT** globally terminal; mid-workflow statuses (`Partner Approved`, `Filing Pending`, …) stay open; null-safe. |
| CR-1b | **Module override:** `Uploaded`/`Reviewed` are terminal for `financials` **only** — not for `roc`/`gst`; `terminalStatusesFor` reflects this. |
| CR-2 | `effectiveDueDate` precedence `individual → extended → standard → response → due_date`; null-safe. |
| CR-3 | A row due **exactly today** is due-today, **never overdue** (the UTC/local bug). |
| CR-4 | Past open date → overdue; future date → not overdue. |
| CR-5 | **Every** closed status suppresses overdue even with a long-past due date; an open status with the same date IS overdue. |
| CR-6 | Due-soon window is `(today, today+7]`; beyond is upcoming. |
| CR-7 | Missing / malformed / **calendar-impossible** dates (`2026-13-01`, `2026-02-30`, `2026-00-10`, `2026-04-31`, non-leap `2025-02-29`) never crash and read as `nodate` (not overdue/today/soon). |
| CR-7b | Valid **leap-day** `2024-02-29` and ordinary valid dates are accepted and classified. |
| CR-8 | ISO timestamps compare on the date portion (a same-day timestamp is due-today, not overdue). |
| CR-9 | `isComplianceOverdue` uses `effectiveDueDate` — a future **extended** date rescues a past **standard** date. |
| CR-9b | **The core correction:** a past-due `Reviewed`/`Uploaded` row is terminal (not overdue) for `financials`, but overdue for `roc` / no-module. |
| CR-10 | `complianceRowGroup` classifies overdue / today / duesoon / upcoming / closed consistently. |
| CR-10b | `isComplianceCompleted` — `Filed/Completed/Filed / Completed/Done` are completed; `Closed`/`Not Applicable`/`Cancelled` and standard-tracker `Reviewed`/`Uploaded` are **not**; financials `Uploaded`/`Reviewed` are. |
| CR-10c | Reviewer status matrix — Reviewed/Uploaded-not-Filed (overdue-able, not completed) vs Filed/Not Applicable/Cancelled behaviour. |
| CR-10d | Boundary dates — day before today (overdue), today (due-today), day after (due-soon, not overdue). |

Static source guards:

| ID | Locks in |
|---|---|
| CR-11 | `Compliance.jsx` imports and uses the shared helper; the old `new Date(eff(r)) < new Date()` cell math is **gone**. |
| CR-12 | The ActivityView overdue **stat** (`isComplianceOverdue(r, today, act.id)`), row **badge** (`complianceDateMeta(dueDate, r.status, today, 7, act.id)`) and **filed** count (`isComplianceCompleted(r.status, act.id)`) use the same shared, **module-aware** verdict. |
| CR-13 | **No** compliance loader destructures only `{ data }` (all capture `error`); the `<Err … onRetry={reload}>` panel exists and is used. |
| CR-14 | Both Financial modals have re-entrancy guards; the review save is gated behind checked writes (`throw` on error, `onDone` only on success); no raw supabase `error.message` is concatenated into a user message. |
| CR-15 | WorkDocuments surfaces load + view failures, validates file type in JS (`isAllowedFile`), uses `.limit(1).maybeSingle()` for the duplicate check, and is `user?.name`-null-safe. |
| CR-16 | Every `deleteDoc` (WorkDocuments ×2, DocumentsHub, DocumentManager) checks the record-delete error before reporting success. |
| CR-17 | No document component surfaces a raw supabase `error.message` to the user. |

## Scope of what tests do and do not cover

- **Covered:** the pure date/status truth (the heart of the consistency fix) exhaustively, and the presence of
  every resilience correction via static guards that fail if a fix is removed or regressed.
- **Not covered (by design / environment):** live Supabase behaviour, and the interactive authenticated boot
  smoke (needs yav2-dev credentials + a git-ignored `.env.local`, absent here). The `vite build` transforming
  all 125 modules is the syntactic/type-adjacent runtime check performed in-repo.
- **Backend, out of scope:** whether `v_client_compliance_summary` / `v_firm_dashboard` / `v_overdue_ageing`
  compute overdue with the same date-field + closed-set rules as the (now-consistent) frontend — a recorded
  backend dependency, not verifiable from the repository.
