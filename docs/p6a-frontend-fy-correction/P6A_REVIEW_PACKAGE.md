# P6A — Stale Frontend Financial-Year Warning/Logic Correction
## Repository-only implementation-readiness & correction package — FOR CHATGPT REVIEW

> **Status:** READY FOR INDEPENDENT REVIEW. Nothing committed, pushed, merged, or deployed. No Supabase access. No SQL. No migrations.

---

## 1. Executive summary

The P6 SELECT-only live diagnosis established that the **backend already supports the current financial year (FY 2026-27)**: `public.get_current_fy()` returns `2026-27`, and the generation functions (`generate_client_compliance_core()`, `activate_accounting_service()`) generate **through `get_current_fy()`**, with **no cap at FY 2025-26**. The residual defect was therefore a **stale frontend warning/logic**, not a backend limitation (register risk **R-11**; diagnosis correction **#1 / P6A**).

Root cause, confirmed in this package by reading the repository's own SQL: the frontend financial-year module `src/lib/financialYear.js` was authored against migration **`0008_functions_rpc.sql`**, which hard-coded a `<= '2025-26'` ceiling and returned success over an empty range. It carried a frozen constant `BACKEND_MAX_FY = '2025-26'` and a `fyCoverage()` guard that raised a scary *"the database can only generate compliance records up to FY 2025-26 … please ask an administrator"* warning whenever the real FY moved past that literal. Migration **`0014_r4db_financial_year_repair.sql`** later **removed that ceiling** (ceiling is now `get_current_fy()`; an empty range is now an **explicit error**, not a silent success), but the frontend module was **never updated**. Once the real FY became 2026-27, the frozen constant made the warning fire falsely on **every non-draft client save and every Re-sync Compliance** for the current year.

The correction is minimal and its **code change is frontend-only, in 4 implementation/test files** (`src/lib/financialYear.js`, `src/components/Clients.jsx`, `src/components/OnboardingWizard.jsx`, `tests/financialYear.test.js`); the overall working-tree package is **7 files = 4 changed + 3 added review documents** (see §4). The code change:

- **Remove** the frozen `BACKEND_MAX_FY = '2025-26'` constant (it *was* the defect).
- **Make `fyCoverage()`'s ceiling dynamic**, defaulting to the current FY — i.e. it now mirrors the backend's `get_current_fy()` contract, so the current year is always covered and the stale warning is gone.
- **Preserve** the fail-closed behaviour and the explicit-ceiling gap-detection *mechanism* (so a future caller holding the backend's live `get_current_fy()` can still surface a genuine mismatch).
- **Correct the user-facing copy** in `Clients.jsx` and `OnboardingWizard.jsx` so no screen asserts the removed ceiling; messaging is driven entirely by `coverage.reason`.
- **Update and extend the tests** to lock in the corrected behaviour and add a **regression guard** against reintroducing any frozen FY cap.

Result: **342/342 unit/integration/component/static tests pass** (was 336 at baseline) and the **production build is clean**. No database contract, migration, RLS/grant, or backend behaviour is touched.

---

## 2. Governing baseline and boundaries

| Item | Value |
|---|---|
| Repository | `Yesadvizors/Yes-Advizors-Portal` (GitHub = permanent source of truth) |
| Authoritative continuation branch | `sync/integration` |
| Required authoritative commit | `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5` |
| Verified `origin/sync/integration` | `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5` ✅ **exact match** |
| Fresh clone path | `D:\Claude\Claude Code\Yes-Advizors-Portal-P6` (new; old clone/worktrees confirmed absent) |
| Working branch (this package) | `p6/frontend-fy-warning-correction` (created from the exact governing commit; **not pushed**) |
| Working tree at clone | clean ✅ |

**Boundaries honoured (mandatory stop point):** no commit · no push · no PR · no merge · no deploy · no Supabase access · no SQL executed · no migration created or run · no Production change · no alias change · no P6A/P6B/P6C/P6D work beyond this minimum correction package.

**Scope discipline:** this is the *minimum* correction for the one confirmed P6A defect (stale frontend FY warning/logic). It does **not** attempt the broader P6 remediation register (service-applicability enforcement, grants, FORCE RLS, `search_path` hardening, tracker unique keys, payroll gaps, etc.), which remain NOT STARTED / UNAUTHORISED.

---

## 3. Root-cause analysis

**The stale premise (pre-`0014`, migration `0008`):**
```
generate_client_compliance   v_current_fy VARCHAR(10) := '2025-26'                  (0008:163)
activate_accounting_service  WHERE fy_label >= p_start_fy AND fy_label <= '2025-26'  (0008:139)
```
Both looped `>= start AND <= '2025-26'` and returned success even when the range was empty. The frontend module was correctly written *for that world*: it declared `BACKEND_MAX_FY = '2025-26'` and used `fyCoverage()` to detect the gap and refuse to show a green success over an empty current year.

**The superseding fix (migration `0014_r4db_financial_year_repair.sql`), verified in-repo:**
- `SECTION 2` creates `public.get_current_fy()` — the single governed "what year is it", derived from the IST date, cross-checked against `financial_years`, **fail-closed** (raises on zero/ambiguous rows). Its own `COMMENT` says: *"Replaces the hard-coded 2025-26 ceiling."* (line 460)
- `SECTION 4` rewrites `activate_accounting_service`: *"BEFORE: `… <= '2025-26'` … AFTER: ceiling from `get_current_fy()`; an empty FY range is an EXPLICIT ERROR."* (lines 636-682: `v_current := get_current_fy();` then `RAISE EXCEPTION` if `v_start > v_current`).
- The generation core likewise takes its ceiling from `get_current_fy()`.

**The gap that produced the bug:** migration `0014` fixed the backend, but `src/lib/financialYear.js` still cited `0008` in its comments and still carried the frozen `'2025-26'` ceiling. Once the wall-clock FY became **2026-27** (current per the diagnosis; today 2026-07-26), `fyCoverage()` (default ceiling `2025-26`) returned `ok:false` with `missing:['2026-27']` for the current year, and the two consuming components rendered the false *"the database only generates up to FY 2025-26 … needs a database update"* warning on every non-draft save and every re-sync.

**Independent live confirmation (from the diagnosis, §4.1/§4.3/§4.4):** `financial_years` holds FY 2022-23→2030-31; single current FY = 2026-27; `get_current_fy()` = 2026-27; generation functions generate through `get_current_fy()`; **no reviewed function caps at `<= '2025-26'`**; YA-012 demonstrably has live Income-Tax/Accounting/Financials rows for **FY 2026-27**. The remaining `2025-26` backend references are the **start-policy anchor** (`get_unknown_incorporation_start_fy()`), a floor for date-less clients — an intentional business rule, not a ceiling.

**Conclusion:** the warning was a **false alarm caused by a stale frontend constant**. Removing the frozen ceiling and making the coverage check track `get_current_fy()` semantics aligns the frontend with the verified backend and eliminates the false warning, while keeping every legitimate fail-closed guard.

---

## 4. File-by-file change register

**Working-tree package composition (7 files total):**
- **4 implementation/test files changed** (tracked, modified): `src/lib/financialYear.js`, `src/components/Clients.jsx`, `src/components/OnboardingWizard.jsx`, `tests/financialYear.test.js`. **No files added or deleted in `src/`.**
- **3 review-document files added** (untracked, documentation only — not part of the code change): `docs/p6a-frontend-fy-correction/P6A_REVIEW_PACKAGE.md`, `..._IMPACT_ASSESSMENT.md`, `..._MASTER_COMPLETION_REGISTER_DRAFT.md`.

This distinction matters: the **code change is 4 files**; the **overall working-tree package is 7 files** (4 changed + 3 added docs). All paths below are relative to repo root.

### 4.1 `src/lib/financialYear.js` — the owner of the fix  *(+44 / −20)*
- **Removed** `export const BACKEND_MAX_FY = '2025-26'` (the frozen ceiling constant).
- **Changed** `fyCoverage(now = new Date(), backendMaxFy = BACKEND_MAX_FY)` → `fyCoverage(now = new Date(), backendMaxFy = currentFy(now))`. The default ceiling is now the dynamic current FY, mirroring `get_current_fy()`.
- **Behaviour preserved verbatim:** the fail-closed branch (`fy === null || !isValidFyLabel(backendMaxFy)`), the `ok:true` branch (`compareFy(fy, backendMaxFy) <= 0`), and the explicit-ceiling gap branch (names every missing year, tells the user to ask an administrator, never says "retry"). Only the **default** for `backendMaxFy` changed.
- **Rewrote the two stale doc-comments** to cite migration `0014` and the P6 diagnosis instead of `0008`, to explain why there is no longer a frozen ceiling, and to note that backend `'2025-26'` survives only as the **start-policy anchor** (a floor, not a ceiling — must not be "corrected").
- **Untouched:** `MIN_FY = '2020-21'`, all date/FY math (`fyForDate`, `currentFy`, `fyOptions`, `startFyFromDate`, boundary/time-zone handling, etc.).

### 4.2 `src/components/Clients.jsx` — Re-sync Compliance button  *(+12 / −8)*
- The `fyCoverage()` fail-closed guard and its `if (!coverage.ok)` branch are **kept** (the STATIC contract requires them and they preserve fail-closed behaviour).
- **Replaced the stale alert copy** — removed *"Retrying will NOT create the missing year — this needs a database update"* — with copy driven by `coverage.reason` that never asserts the removed ceiling: *"Compliance setup … could not be confirmed as covering the current financial year. {reason} Existing records were retained and nothing was deleted or changed."*
- **Rewrote the explanatory comment** to describe the post-`0014` reality (guard now only fails closed on an indeterminate current FY; genuine backend failures surface as failed stages).

### 4.3 `src/components/OnboardingWizard.jsx` — onboarding success screen  *(+16 / −17)*
- `fyCoverage()`, `coverageGap(comp, coverage)`, and `saveFullySucceeded(comp, coverage)` call sites are **kept** unchanged (R4 Rev 1.1 truthfulness contract preserved).
- **Replaced the stale checklist-row text** — removed *"The database only generates up to FY {backendMaxFy}"* — with `coverage.reason` (honest for whatever actually blocks confirmation).
- **Rewrote two comments** (the coverage rationale and the "not worth retrying" callout note) to remove the false "ceiling lives in the database" narrative.

### 4.4 `tests/financialYear.test.js` — tests  *(+90 / −26)*
- Removed the `BACKEND_MAX_FY` import and the one assertion that referenced it.
- Rewrote the obsolete *"SQL ceiling"* test block to the corrected behaviour; **kept** the explicit-ceiling gap tests (they exercise the preserved mechanism).
- Added: FY 2026-27 raises no obsolete warning · default coverage tracks the current FY across future dates (regression guard) · fail-closed on indeterminate/malformed inputs · FY 2025-26 remains valid & selectable · STATIC guard that the frozen `BACKEND_MAX_FY = '2025-26'` constant is **gone** · STATIC guard that neither component asserts the removed ceiling to the user.

---

## 5. Before-and-after behaviour

| Surface | BEFORE (stale) | AFTER (corrected) |
|---|---|---|
| Onboarding a client (non-draft) in FY 2026-27, all stages green | Amber "Compliance Incomplete" screen; row: *"FY 2026-27 — NOT covered. The database only generates up to FY 2025-26."*; *"Retrying will not fix this."* | Green "Onboarding Complete"; no false FY warning; success reflects actual stage outcomes |
| Existing client, compliance found & retained | Amber warning claiming the current year is missing and needs a DB update | No false warning; retained records reported truthfully |
| Re-sync Compliance (current year, success) | `alert()`: *"…this needs a database update"*; button stuck on *"⚠️ Sync incomplete — retry"* | Completes green; no false alarm |
| `fyCoverage()` (no explicit ceiling) at FY 2026-27 | `{ ok:false, missing:['2026-27'], reason:"…up to FY 2025-26…" }` | `{ ok:true, currentFy:'2026-27', missing:[] }` |
| `fyCoverage(now, '2025-26')` explicit lagging ceiling | gap detected | gap **still** detected (mechanism preserved) |
| Broken clock / indeterminate FY | fail-closed warning | fail-closed warning (**unchanged**) |
| FY 2025-26 as a historical/selectable year | valid | valid (**unchanged**) — dropdown, start-FY, past-year filters all intact |

**No behavioural change** to: FY date math, dropdown option generation, `startFyFromDate`, the compliance-tab data-driven FY selector (`complianceTabs.js` / `Compliance.jsx`, already driven by the live `financial_years` table), stage-error handling, or the R2/R4-Rev1.1 truthfulness gates.

---

## 6. Test matrix and results

Runner: `node --test` (`npm test`). **Final: `tests 342 · pass 342 · fail 0 · skipped 0`** (baseline before changes: 336 pass / 0 fail).

| Required Phase-4 coverage | Test(s) | Result |
|---|---|---|
| FY 2025-26 remains valid where historically/operationally applicable | `FY 2025-26 remains a valid, selectable, operationally-applicable financial year` | ✅ |
| FY 2026-27 does not trigger the obsolete limitation warning | `P6A: FY 2026-27 does NOT trigger the obsolete FY-2025-26 limitation warning` | ✅ |
| Dynamic current-year behaviour | `P6A: … default (dynamic) ceiling covers the current FY`; `REGRESSION: default coverage tracks the current FY …` (2026-27→2031-32) | ✅ |
| Unavailable/malformed financial-year handling | `fail-closed: … current FY cannot be determined`; `fail-closed: … supplied ceiling is malformed` | ✅ |
| Backend/API failure behaviour | Preserved via existing stage-error tests (`complianceOutcome`, `saveFullySucceeded` with failed stages) + explicit-ceiling gap tests | ✅ |
| Permission/service-applicability restrictions | Unchanged; existing `serviceApplicability*` suites (untouched) | ✅ (regression-safe) |
| Regression protection vs. reintroducing the hard-coded FY cap | `STATIC: … frozen BACKEND_MAX_FY ceiling is GONE`; `STATIC: no component asserts the removed … ceiling`; `REGRESSION: …` | ✅ |
| Mechanism preservation (explicit-ceiling gap detection) | `mechanism preserved: …` (×3) + `explicit-ceiling gap opens exactly on 1 April` | ✅ |
| R4 Rev 1.1 truthfulness contract (unchanged) | Existing `coverageGap` / `saveFullySucceeded` suite (BEHIND/CURRENT fixtures) | ✅ still green |

No test was weakened or deleted to obtain a pass; obsolete assertions were **rewritten to the corrected truth** and net coverage increased.

---

## 7. Build, lint and type-check evidence

| Check | Command | Result |
|---|---|---|
| Unit / integration / component / static tests | `npm test` (`node --test`) | ✅ **342/342 pass, 0 fail** |
| Production build | `npm run build` (`vite build`) | ✅ **125 modules transformed, built in ~2.1s, exit 0** |
| Type check | — | **N/A** — project is plain JavaScript/JSX; no `tsconfig.json`, no `@types`, no TS toolchain present |
| Lint | — | **N/A** — no ESLint/Prettier config or `lint` script present in the repo |
| Repo verification script | `node scripts/verify-supabase-ref.mjs` | **Exit 2 (fail-safe refusal): "primary URL VITE_SUPABASE_URL is not set."** This is a Phase-0 *runtime environment* guard requiring configured V2 credentials; it cannot pass without a `.env` pointing at V2, which is **out of scope** (no Supabase access; no `.env` present by design). Its refusal-on-absence is the correct fail-closed behaviour, not a defect in this change. |

Type-check and lint are marked N/A truthfully because the toolchain does not exist in the repository — no config was invented to manufacture a green check.

---

## 8. Security and data-integrity assessment

- **No new attack surface, dependency, or framework.** Pure edits to existing JS/JSX; no new imports beyond what already existed.
- **No secrets, credentials, tokens, or environment values** read, added, or logged.
- **Fail-closed behaviour preserved and strengthened in intent:** `fyCoverage()` still refuses to claim coverage it cannot prove (indeterminate FY, malformed ceiling), and the change is covered by explicit fail-closed tests.
- **No silent capability escalation:** the FY dropdown (`fyOptions`) still caps at the current FY, and the compliance-tab selector remains data-driven from the live `financial_years` table — selection cannot silently exceed verified backend capability (the backend generates through `get_current_fy()`, and raises on an empty range).
- **No database contract change:** no RPC signature, argument, table, view, RLS policy, grant, or function is touched. The change consumes existing behaviour only.
- **No XSS/injection risk introduced:** no `dangerouslySetInnerHTML`; the new message strings are plain interpolations of controlled data (`coverage.reason`, `client.name`).
- **Data integrity:** the correction *reduces* the risk of a truthful-reporting regression, because a green success screen for the current year is now correct (backend does generate it), where before the UI over-warned. Genuine backend failures still surface via stage errors (`{ ok:false, error }`), unchanged.

---

## 9. Supabase non-access confirmation

**No Supabase access of any kind occurred during this package.** Specifically: no MCP Supabase tool call; no `execute_sql`; no migration applied/created/run; no project/branch/edge-function operation; no read (SELECT) against V2 or V1; no `.env` created; no live connection. All backend facts used here were read **from SQL files already in the repository** (`supabase/migrations/0008_*`, `0014_*`) and from the committed **P6 SELECT-only diagnosis document**. `scripts/verify-supabase-ref.mjs` correctly refused (exit 2) because no environment is configured — consistent with zero Supabase access.

---

## 10. Known limitations

1. **`fyCoverage()`'s default ceiling now mirrors the frontend clock, not a live backend read.** With the default (no explicit ceiling), it can no longer detect a *frontend-clock-ahead-of-backend* divergence, because both derive the current FY the same way. This is acceptable because (a) the backend now **raises** on an empty range rather than silently succeeding, so a genuine inability to generate surfaces as a failed stage; and (b) the explicit-ceiling parameter is preserved so a caller can inject the backend's live `get_current_fy()` if that guard is ever wanted. See §11.
2. **No live UI runtime verification** was performed (no deploy, no browser against V2). Verification is limited to unit/integration/component/static tests + production build. Live confirmation is a required future step (§11).
3. **Type-check and lint could not be run** — the toolchain is absent from the repo. If TS/ESLint are later adopted, this change should be re-verified under them.
4. The correction assumes the diagnosis's live findings remain true (current FY = 2026-27; generation through `get_current_fy()`). If V2's `financial_years` seeding or `get_current_fy()` behaviour changes, re-verify.

---

## 11. Required future live V2 verification (SELECT-only)

The following **cannot be verified from the repository alone** and require read-only V2 evidence (via PJ-manual V2 SQL Editor per B-1; never V1/Production):

1. **Confirm `get_current_fy()` currently returns `2026-27`** on V2 at verification time.
2. **Confirm the deployed generation functions take their ceiling from `get_current_fy()`** (i.e. the `0014` definitions are the live ones) — the application migration ledger (`supabase_migrations.schema_migrations`) was **not** independently visible during the diagnosis, so `0014`-applied is inferred from behaviour, not asserted.
3. **Live UI runtime check** on a Preview pinned to this branch: onboard/re-sync a client in FY 2026-27 and confirm the success screen is green with **no** FY warning, and that a deliberately un-seeded/edge case still fails closed.
4. **(Optional enhancement, not in this package):** if the firm wants the frontend to actively detect a frontend/backend FY divergence, wire a read-only `get_current_fy()` RPC value into `fyCoverage(now, backendMaxFy)` as the explicit ceiling. This is a deliberate, separately-authorised follow-up — not required for the correction.

---

## 12. Rollback plan

- **Nothing is committed, pushed, or deployed**, so "rollback" is simply discarding the working-tree changes on the local branch — no remote or Production impact is possible.
- **Local revert:** `git checkout -- src/lib/financialYear.js src/components/Clients.jsx src/components/OnboardingWizard.jsx tests/financialYear.test.js` (or delete the branch `p6/frontend-fy-warning-correction` and re-create from `c0009fc9…`).
- **Post-commit revert (if later committed):** a single `git revert <commit>` cleanly restores the prior frontend behaviour; the code change is self-contained to four implementation/test files with no data or schema effect.
- **No data migration or backfill** is involved, so there is **no data-state rollback** to perform. Reverting only restores the (stale) warning behaviour; it cannot corrupt or lose data.
- **Blast radius:** frontend-only, two user-facing surfaces (onboarding success screen, Re-sync button). Reverting affects only those messages.

---

## 13. Proposed commit scope and commit message

**Scope (single logical change):** `src/lib/financialYear.js`, `src/components/Clients.jsx`, `src/components/OnboardingWizard.jsx`, `tests/financialYear.test.js`. (Review-package docs may be committed separately as documentation, or left uncommitted, at PJ's discretion — they are not part of the code fix.)

**Proposed message (NOT executed — for review only):**
```
fix(fy): retire stale FY 2025-26 frontend ceiling; align coverage with get_current_fy()

The frontend FY module was authored against migration 0008 (hard-coded
`<= '2025-26'` SQL ceiling, silent success over an empty range) and carried a
frozen `BACKEND_MAX_FY = '2025-26'` constant. Migration 0014 removed that ceiling
(RPCs now generate through get_current_fy() and RAISE on an empty range), and the
P6 SELECT-only diagnosis verified the live backend generates the current FY
(2026-27). The stale constant made fyCoverage() falsely warn "the database can
only generate up to FY 2025-26 … needs a database update" on every non-draft save
and every Re-sync, for the current year.

- financialYear.js: remove BACKEND_MAX_FY; default fyCoverage() ceiling to the
  dynamic current FY (get_current_fy() semantics); keep the explicit-ceiling gap
  mechanism and fail-closed behaviour; rewrite the stale 0008-era comments.
- Clients.jsx / OnboardingWizard.jsx: drive coverage messaging from coverage.reason;
  remove copy asserting the removed ceiling; keep the fail-closed guards and the
  R4 Rev 1.1 truthfulness gates.
- tests: rewrite obsolete ceiling tests to the corrected behaviour; add FY 2026-27
  no-warning, dynamic-year, malformed/fail-closed, FY-2025-26-still-valid, and a
  STATIC regression guard against reintroducing any frozen FY cap.

Frontend-only. No database contract, migration, RLS/grant, or backend change.
Tests 342/342 pass; production build clean.

Addresses: P6A / diagnosis correction #1 / register risk R-11.
```

---

## 14. Independent-review checklist

- [ ] Governing baseline verified: `origin/sync/integration = c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`; branch cut from that exact commit; not pushed.
- [ ] Root cause agreed: stale frontend constant vs. `0014`-superseded backend ceiling (confirm by reading `0008` vs `0014` in-repo).
- [ ] `BACKEND_MAX_FY` frozen constant is removed; no module-level `'2025-26'` ceiling remains in executable code.
- [ ] `fyCoverage()` default ceiling is the dynamic current FY; explicit-ceiling gap mechanism and fail-closed branch are intact.
- [ ] No component asserts the removed ceiling to the user; messaging flows through `coverage.reason`.
- [ ] R4 Rev 1.1 truthfulness gates (`coverageGap`, `saveFullySucceeded`) and Clients `if (!coverage.ok)` are unchanged.
- [ ] FY 2025-26 remains valid/selectable; FY date math, dropdowns, and data-driven compliance-tab selector are untouched.
- [ ] Tests: 342/342 pass; new regression guard present; nothing weakened/deleted to force a pass.
- [ ] Production build clean; type-check/lint correctly marked N/A (no toolchain); Supabase-ref script refusal understood.
- [ ] Confirm no commit/push/PR/merge/deploy/Supabase/SQL/migration/Production/alias change occurred.
- [ ] Required future live V2 SELECT-only checks (§11) noted for scheduling.
- [ ] Master Completion Register draft (§ separate file) reviewed; agree it is a DRAFT and not committed.

---

*Package generated in the fresh clone `D:\Claude\Claude Code\Yes-Advizors-Portal-P6`, branch `p6/frontend-fy-warning-correction`, baseline `c0009fc9…`. See companion `P6A_MASTER_COMPLETION_REGISTER_DRAFT.md` for the register update draft (item 15) and `P6A_IMPACT_ASSESSMENT.md` for the Phase-5 wider impact assessment.*
