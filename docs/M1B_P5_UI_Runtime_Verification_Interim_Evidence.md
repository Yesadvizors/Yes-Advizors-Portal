# YAV2 Portal V2 — Module 1 — P5 UI — FINAL Live Runtime Verification Evidence

**STATUS: FINAL — P5 UI runtime verification COMPLETE. All 14 steps PASS.**
**P5: CLOSED PASS · Module 1: CLOSED PASS. Independent ChatGPT review: PASS; PJ final approval granted 2026-07-21 IST.** *(closure-status wording finalised 2026-07-21 22:44 IST)*

*(This document supersedes the earlier INTERIM record of 2026-07-21, whose sole open blocker was live
role-gating (Step 12). That blocker is now resolved and evidenced below. No source, SQL, migration,
configuration, or database object was changed to close it.)*

- **Verification date:** 2026-07-21 (IST / Asia/Kolkata). **Executor (live runtime):** PJ.
  **Documentation author:** Claude Code (no Supabase connection, no SQL, no DB action).
- **Closure authored:** 2026-07-21 21:53 IST (UTC+05:30).
- **Per-step wall-clock times:** not itemised by PJ; the authoritative verification date is 2026-07-21 IST.
- **Repository / branch:** `D:\Claude\Claude Code\Yes-Advizors-Portal` · `ui/redesign-v1`.
- **Governing HEAD (commit under test):** `3a5f439c15cafa493cd2d2320d7733f286441b6b`
  — `feat(p5): complete service applicability write UI`.
- **Authorised environment:** **Supabase V2 / yav2-dev only** (`VITE_SUPABASE_URL = https://ogjrwemjefvccpyjwxuo.supabase.co`).
  V1/Production `zcszesuvjrryxtigjglt` absent and prohibited. Feature flags `VITE_P2_PREVIEW=true` + `VITE_P5_UI=true`.
- **Deployment used for FINAL verification (immutable Preview):**
  `https://yes-advizors-portal-v2-preview-f90l6sj2s-yes-advizors-projects.vercel.app`
  — deployment `dpl_8y7CXhTpeFYAZiknWUJFGaf2Md2v`, target **Preview** (`target: null`, project `live: false`),
  `source: git`, state **READY**, `githubCommitSha = 3a5f439c15cafa493cd2d2320d7733f286441b6b`,
  ref `ui/redesign-v1`.
- **Static gates (this session, HEAD `3a5f439`):** `node --test` **322/322 pass**; `npm run build` **clean**
  (vite 5.4.21); the build's `v_firm_dashboard` selects use **`due_in_7_days`** (not `due_soon`).
- **Governance:** no P6/compliance/tracker/calendar/backend work; no source/SQL/migration/config edit; no V1/Production;
  not committed/pushed (held for ChatGPT review).

---

## 1. Per-step runtime result

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Open Client Master Preview | **PASS** | Steps 1–11 previously passed and documented (CP-4 closure 2026-07-20; CP-5/6/7 smoke). |
| 2 | Service Applicability section appears (+ "Add service") | **PASS** | as above |
| 3 | Create a Draft (non-OTHER) | **PASS** | as above |
| 4 | OTHER + blank notes **rejected** (`OTHER_NOTES_REQUIRED`) | **PASS** | PG-1 (0022) defence-in-depth |
| 5 | Create OTHER with meaningful notes | **PASS** | as above |
| 6 | Edit the Draft | **PASS** | as above |
| 7 | Approve the Draft (Draft→Approved) | **PASS** | as above |
| 8 | Deactivate (with effective_to; Approved→Inactive) | **PASS** | as above |
| 9 | Start again → NEW Draft (no reopen) | **PASS** | as above |
| 10 | Old Inactive row not reopened | **PASS** | as above |
| 11 | Stale-version conflict (two tabs) | **PASS** | conflict + refresh + no silent apply |
| **12** | **Non-authorised role cannot see/use write actions** | **PASS** | §2 — resolved (non-Admin login provisioned) |
| **13** | **No compliance/tracker/calendar rows generated** | **PASS** | §3 — baseline counts matched exactly |
| **14** | **No console / React / network / Supabase / RPC error** | **PASS** | §4 — resolved (stale-bundle URL, not a defect) |

**All 14 steps PASS.**

## 2. Step 12 — Non-Admin role gating — PASS (2026-07-21 IST)

Live-verified on the immutable Preview against V2/yav2-dev, logged in as an existing Auth user linked to an
active non-Admin `team` row (**no second Auth user was created** to close this):

- **Auth user:** `info@yesadvizors.com` · **Role: `Staff`** (`is_active` true, `is_admin` false, `portal_role` `Staff`).
- **Login succeeded** (authentication is not gated; authorisation/visibility is).
- On **Clients Onboarding**, the separate **"Client Master (Preview)"** button was **NOT visible** to the Staff user.
- Because that gated entry point was **hidden**, the Staff user **could not access the Client Master Preview, the
  Service Applicability section, or any of its write actions** (create / edit / approve / deactivate / "Start
  again") — all were **inaccessible**.
- The **normal Client Record modal remained available**, but the **gated Preview path was absent** — this
  confirms **fail-closed non-Admin role gating**.
- The **"Firm Overview"** and **"Audit Log"** tabs were also hidden (admin-only gate in `src/App.jsx`).

**Explicitly not claimed:** the Staff user did **not** open the Service Applicability section — it was
unreachable — and **no write action was attempted or possible**.

**Test-user record (deliberate P5 runtime-verification artifact):**

| Field | Value |
|---|---|
| Purpose | P5 runtime-verification non-Admin login (Step 12) |
| Auth user | `info@yesadvizors.com` |
| Auth UID | `94187bf5-d163-4763-adc4-ebfa52871686` |
| `team` row ID | `9eccb3d4-1e55-4fae-a896-5b7e79165a25` |
| Name | `P5 Non-Admin Test User` |
| `is_active` / `is_admin` / `portal_role` | true / false / `Staff` |

**Retention decision:** the row **remains active as recorded**. Whether it should stay active or be separately
removed/deactivated is **deferred to a future, explicit PJ decision** (a candidate for the separately-governed
**V2 Clean-Start Reset**). **It is NOT removed or deactivated by this closure**, and Claude Code performs no
such change (no SQL / no database action).

*(No password, bearer token, or key is recorded in this document. The UID and row ID are non-secret
identifiers retained as verification evidence.)*

## 3. Step 13 — No compliance/tracker/calendar side effects — PASS (2026-07-21 IST)

Post-verification counts matched the **approved protected baseline exactly**; no runtime side effects detected:

| Table | Count | Baseline | Match |
|---|---|---|---|
| `accounting_tracker` | 312 | 312 | ✅ |
| `financials_tracker` | 120 | 120 | ✅ |
| `income_tax_tracker` | 26 | 26 | ✅ |
| `compliance_calendar` | 0 | 0 | ✅ |

No compliance, tracker, calendar, or FY generation occurred during P5 runtime verification.

## 4. Step 14 — No console / network / Supabase error — PASS (2026-07-21 IST)

**4.1 Initial failure — investigated and RESOLVED as a stale-deployment / incorrect-URL issue (not a source or database defect).**
- An initial check via the **clean project domain** served an **older bundle** (`index-I7iIBOgp.js`) whose
  code requested `due_soon` from `v_firm_dashboard`; PostgREST returned `code 42703 — column
  v_firm_dashboard.due_soon does not exist`.
- **Repository and governing HEAD `3a5f439` already correctly select `due_in_7_days`** from
  `v_firm_dashboard` (`src/components/Dashboard.jsx`, `src/components/Compliance.jsx`); a fresh production
  build of HEAD contains **no `v_firm_dashboard.due_soon` select** anywhere in the bundle.
- **Root cause:** the browser/clean domain served a cached older deployment, not the current git Preview of
  `3a5f439`. **No database view change was required**, and no source change was required — the correct fix
  (`due_in_7_days`) was already committed.
- **Resolution:** FINAL verification was performed on the **immutable Preview URL** linked to governing HEAD
  `3a5f439` (deployment `dpl_8y7CXhTpeFYAZiknWUJFGaf2Md2v`), which serves the current build.

**4.2 Final runtime result on the immutable Preview (governing HEAD `3a5f439`):**
- **Admin runtime:** `v_firm_dashboard` returned **200**; **no red failed network request**.
- **Non-Admin runtime:** `v_firm_dashboard` returned **200**; "Firm Overview" hidden; "Audit Log" hidden;
  browser **Console contained no red errors**.
- **Final network and Console verification passed** — no `42703`, no React/Supabase/RPC error.

## 5. Residual notes

- **Chrome "Dangerous" label on the immutable Preview URL:** observed at verification. This is a **separate
  browser / Google Safe-Browsing reputation concern about the `*.vercel.app` preview hostname** — it is **not
  evidence of any P5 functional failure**, and did not affect the runtime results above. This concern is
  **not claimed resolved**; it is recorded for separate follow-up (no supporting evidence of resolution
  exists and none is asserted).
- **No database view change was required** at any point (see §4.1).
- **Deployed asset hash — qualified:** Runtime behaviour confirmed the immutable Preview served corrected
  code using `due_in_7_days`; the exact deployed asset hash was not independently captured. (Deployment
  protection (SSO) gates the immutable Preview, so the served bundle was validated by observed runtime
  behaviour — 200 responses, no `42703` — rather than by an independently captured asset hash.)

## 6. Verification status summary

- ✅ Automated/static: `node --test` **322/322**; `vite build` clean (HEAD `3a5f439`).
- ✅ Live runtime (PJ, immutable Preview, V2/yav2-dev): **Steps 1–14 PASS**.
- ✅ Step 12 (non-Admin role gating) — **resolved and PASS**.
- ✅ Step 14 (no console/network/Supabase error) — **resolved and PASS** (stale-bundle URL, not a defect).
- ✅ **P5 and Module 1: CLOSED PASS** — Independent ChatGPT review PASS; PJ final approval granted 2026-07-21 IST.

## 7. Recommendation

**P5 and Module 1 are CLOSED PASS** — Independent ChatGPT review PASS; PJ final approval granted 2026-07-21 IST.
No code, test, SQL, migration, configuration, or database change was required
to close; the two prior runtime observations (Step 12 login gap; Step 14 stale bundle) were verification /
deployment-serving matters, both resolved, with the governing HEAD `3a5f439` already correct.
