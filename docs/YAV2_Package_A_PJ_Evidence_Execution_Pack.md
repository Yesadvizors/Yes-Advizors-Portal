# YAV2 — Package A — PJ Evidence Execution Pack

**Type:** Step-by-step manual evidence procedure for PJ (documentation-only). **Work-package:** Issue #23 · Package A.
**Author:** Claude Code · **Reviewer:** ChatGPT · **Approver/Executor:** PJ. **Date:** 2026-07-23 IST.
**Governing base:** `ui/redesign-v1` @ `800013f6189a554db3e9107601430ee0aec2bb4b`.
**Companion register:** `docs/YAV2_Package_A_Historical_Evidence_And_Live_State_Discovery.md`.
**Governing SQL:** `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql`.

> **Purpose:** collect the five remaining Package A evidence items so Package A can move from
> `PACKAGE A PARTIAL — PJ EVIDENCE REQUIRED` to closed. **This pack changes nothing** — it is instructions only.
> **Claude does not execute SQL and does not touch any live system.** PJ performs every step manually.
> **Golden rules:** authorised Supabase target is **V2 / yav2-dev `ogjrwemjefvccpyjwxuo`** ONLY; **never** touch
> **V1 / Production `zcszesuvjrryxtigjglt`**; **never paste secret values** (keys, tokens, passwords, webhook secrets);
> do **not** create users, reset passwords, activate/execute/edit workflows, deploy, or change any configuration.
> If any step cannot be completed safely, record it as evidence with the exact reason — do **not** work around it by
> changing a live system.

---

## Evidence checklist (what PJ returns)
| # | Evidence item | Source | Return format |
|---|---|---|---|
| E1 | Supabase V2 read-only discovery output | SQL Editor (V2) | full sectioned text |
| E2 | Vercel env-var presence/scope/V2-target | Vercel dashboard | table below (no secrets) |
| E3 | Exact governing portal URL | the browser PJ actually uses | one URL |
| E4 | Approved test-account runtime evidence | live portal | per-account template |
| E5 | n8n / WhatsApp workflow inventory | n8n workspace | table below (no secrets) |

Return everything to **Claude + ChatGPT** by pasting into the Issue #23 / PR thread (or attaching the screenshots).

## MANDATORY redaction check — run BEFORE uploading any screenshot or result
Everything posted to GitHub / ChatGPT is visible to reviewers and stored. **Before uploading**, review each screenshot and text block and **redact** (black out / delete) all of the following:
- **tokens** (access/refresh/JWT, API tokens);
- **keys** (`anon`/`service_role`/any Supabase or third-party key);
- **passwords** / credential values;
- **webhook secrets** and any secret query parameters;
- **secret-bearing URLs** — post only the non-secret path; for Supabase hosts keep **only the `<project-ref>` portion**;
- **unnecessary client or personal data** — client names, email addresses, phone numbers, PAN/Aadhaar/DIN, and any real business record content not needed for the finding.

**Retain** only what the reviewers need: the **project ref**, **variable name**, **role**, **present/missing status**, **scope**, **error category/text (with secrets removed)**, counts, and object/policy names. If in doubt, redact it. A redacted-but-clear screenshot is always preferred over an unredacted one.

---

## E1 — Supabase V2 read-only discovery (SQL)
**Do not modify the SQL file** unless a genuine execution error requires a *separately reviewed* correction. Claude must not execute it — **PJ runs it in the Supabase SQL Editor.**

### E1.0 — Confirm you are on V2 BEFORE opening the SQL Editor (manual, mandatory)
1. Open the Supabase dashboard and select the project.
2. Go to **Project Settings → General** (or **API**). Confirm the **Reference ID** reads exactly **`ogjrwemjefvccpyjwxuo`**.
3. If it shows **`zcszesuvjrryxtigjglt`** (V1/Production) or anything else — **STOP. Do not open the SQL Editor. Run nothing.**
4. Only when the ref is `ogjrwemjefvccpyjwxuo`, open **SQL Editor**. *(The script prints identity hints in Section 0, but it cannot itself prove the project — this manual check is the real safeguard.)*

### E1.1 — Locate and copy Part 1
1. Open `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` from the repo.
2. Part 1 is everything between the banner `## PART 1 — CATALOG-ONLY DISCOVERY` and the line `## END OF PART 1 ##` (it begins with `BEGIN; SET TRANSACTION READ ONLY;` and ends with `COMMIT;`).
3. Copy that Part-1 block into a new SQL Editor query.

### E1.2 — (Optional safety) set the session read-only
- Optionally paste this once at the very top of the query first: `SET default_transaction_read_only = on;`
- This is a belt-and-braces measure. Part 1 is already SELECT-only and wrapped in a read-only transaction.

### E1.3 — Execute Part 1
1. Click **Run**. Part 1 is **designed to avoid missing-object failures** because it reads from `pg_catalog`/`information_schema` — a missing table simply shows as `MISSING` in Section 9b rather than stopping the run. **This is not a guarantee it can never error:** permission restrictions, editor/session behaviour, statement timeout, or platform-specific issues may still produce an error.
2. **If any error occurs, capture the exact error text verbatim** (with the section it happened in) and include it in your returned evidence for review. **Do not alter the database, do not improvise or "fix" the SQL, and do not change the reviewed script** — an error is itself evidence. If a genuine execution error appears to require a script correction, stop and report it so a *separately reviewed* correction can be made.
3. If the editor complains that it runs statements one-at-a-time and the `BEGIN/COMMIT` did not apply, that is fine — every statement is still SELECT-only. Run the whole block; capture all section outputs.

### E1.4 — Preserve the full results
- For **each** section (`0`, `1`, `2`, … `15b`), copy the **entire** result grid to text (CSV/tab export or copy-all). Do not trim rows.
- Label each block with its section header exactly as printed (e.g. `10b. RLS POLICIES`).

### E1.5 — Execute each optional Part 2 probe SEPARATELY
Part 2 holds data-dependent probes that may error if a table/column/schema is absent. **They are commented out** in the file. For each probe (9, 11, 11b, 11c, 12 per-line, 13, 13b):
1. Copy **only that one probe**, un-comment it (remove the leading `-- `), and run it **on its own**.
2. Capture the result under its label.

### E1.6 — What to do when an optional probe errors
- An error such as `relation "…" does not exist` or `column "…" does not exist` **is itself evidence** — it tells us the live object/column is absent.
- **Record the exact error text** under that probe's label and **move on to the next probe**.
- **Do NOT "fix" it by changing the database** (no creating tables/columns, no altering anything). A missing object is a finding for Package B, not something to repair here.

### E1.7 — Labelling and return
- Return one block per section/probe, each headed by its label, in order. Include the `0. ENVIRONMENT IDENTITY` output so the reviewers can see the confirmed project ref hint.
- Confirm in one line: *"Executed on project ref `ogjrwemjefvccpyjwxuo` (V2) only; V1 not opened."*

### E1.8 — Never run in V1
- Do not open a second tab on V1. Do not switch projects mid-session. If unsure which project a tab is on, re-check **Project Settings → Reference ID** before running anything.

---

## E2 — Vercel environment-variable evidence (no secret values)
Capture for **each YAV2 Vercel project** (governing `yes-advizors-portal-v2-preview` `prj_PFPT5rOJ4hpjyfqDHvppBlxTVeZv`, and the second `yes-advizors-portal` `prj_7vjFHtSJQIIHiPJEvPw0DSwnCvEJ`).

### E2.1 — Project & deployment facts
In Vercel → the project → **Settings / Deployments**, record: project name · project ID · linked GitHub repo · linked branch · latest deployment SHA · exact deployment URL · domain aliases · Preview/Production status.

### E2.2 — Environment variables (names + scope + presence only)
In **Settings → Environment Variables**, for each required name below record **only**: present/missing · scope (Production / Preview / Development) · and, where safe, whether the value points to **V2** — **for URL-type variables you may reveal ONLY the `<project-ref>` portion of the host** (e.g. `https://<ref>.supabase.co`), never the key/secret.

| Variable | Present? | Scope(s) | Points to V2 ref `ogjrwemjefvccpyjwxuo`? | Notes |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` |  |  | (reveal only the `<ref>` in the host) |  |
| `VITE_SUPABASE_ANON_KEY` |  |  | n/a (**never reveal the key**) | record present/missing only |
| `VITE_SUPABASE_FUNCTIONS_URL` |  |  | (reveal only the `<ref>` in the host) |  |
| `VITE_DOCS_BUCKET` |  |  | value is a bucket name (`secure-docs`) — safe to record |  |
| `VITE_P2_PREVIEW` |  |  | value is `true`/`false` — safe to record |  |
| `VITE_P5_UI` |  |  | value is `true`/`false` — safe to record |  |

- **Never** paste `VITE_SUPABASE_ANON_KEY` or any secret. For `VITE_SUPABASE_URL`/`VITE_SUPABASE_FUNCTIONS_URL`, reveal only the project-ref portion so we can confirm V2 vs V1 without exposing anything sensitive.
- If a variable is missing in a scope, that is a finding (it may explain hidden features, e.g. `VITE_P5_UI` unset → Service Applicability hidden).

---

## E3 — Exact governing portal URL
- From the browser PJ actually uses to open the portal, copy the **exact URL** (e.g. `https://yes-advizors-portal-v2-preview.vercel.app` or the second project's domain).
- Note which of the two Vercel projects that domain belongs to (from E2). This resolves whether PJ views the governing V2 project or the duplicate.

---

## E4 — Approved test-account runtime evidence (existing accounts only)
**Do not create users or reset passwords.** Use only existing approved test accounts. Test the **exact governing portal URL from E3**; first record URL + deployment SHA (from E2) at the top.

For **each** role, complete one row. If an account/credential is unavailable, mark it
`PJ EVIDENCE UNAVAILABLE — DO NOT CREATE OR RESET WITHOUT APPROVAL`.

| Account role | Login success/fail | Visible menus | Direct-route access (try an admin-only URL) | Visible/allowed views (navigation only) | Denied views/routes | Client-data restriction observed | Write behaviour | Error message (if any) | Screenshot ref | Date/time (IST) |
|---|---|---|---|---|---|---|---|---|---|
| admin |  |  |  |  |  |  | `UNVERIFIED — WRITE TEST NOT AUTHORISED IN PACKAGE A` |  |  |  |
| manager |  |  |  |  |  |  | `UNVERIFIED — WRITE TEST NOT AUTHORISED IN PACKAGE A` |  |  |  |
| staff |  |  |  |  |  |  | `UNVERIFIED — WRITE TEST NOT AUTHORISED IN PACKAGE A` |  |  |  |
| restricted staff |  |  |  |  |  |  | `UNVERIFIED — WRITE TEST NOT AUTHORISED IN PACKAGE A` |  |  |  |
| inactive user |  |  |  |  |  |  | `UNVERIFIED — WRITE TEST NOT AUTHORISED IN PACKAGE A` |  |  |  |
| unmapped authenticated (if available) |  |  |  |  |  |  | `UNVERIFIED — WRITE TEST NOT AUTHORISED IN PACKAGE A` |  |  |  |

**Guidance (STRICTLY READ-ONLY — no writes of any kind in Package A):**
- Runtime evidence is limited to **login, visible menus, navigation, direct-access attempts, visibility and denial behaviour**. Do **not** create, edit, delete, submit, or otherwise persist any data — not even on a test client, and not "reversible" test data. Package A authorises **no live changes**.
- **All create/edit/delete/persistence behaviour must be recorded as** `UNVERIFIED — WRITE TEST NOT AUTHORISED IN PACKAGE A`. Write testing, if needed, is a separate later PJ-approved gate.
- "Direct-route access" = while logged in as a non-admin, try to **open** an admin-only view directly (e.g. the Audit Log tab/URL) and record whether it is correctly **denied** (menu hiding alone is not security — note the actual behaviour). This is a read/navigation attempt only — do not perform any action on the page.
- No external messages (no WhatsApp sends), no form submissions, no business-impacting actions of any kind.

---

## E5 — n8n & WhatsApp workflow inventory (no secrets; no execution)
**Do not activate, execute, edit, or export secrets.** Read-only inspection of the n8n workspace PJ identifies as the YAV2 one. Record:

| Field | Value |
|---|---|
| Workspace name |  |
| Workflow name |  |
| Workflow ID |  |
| Active / inactive |  |
| Last updated (date) |  |
| Webhook path (WITHOUT secret token) |  |
| Supabase project target (V2 ref `ogjrwemjefvccpyjwxuo`? / V1? / unknown) |  |
| Credential **names** used (names only, no values) |  |
| WhatsApp flow purpose |  |
| PIN / session handling (brief) |  |
| Retries |  |
| Idempotency / duplicate prevention |  |
| Error handling |  |
| Execution logs available? |  |
| Export file available? (yes/no — do not paste secrets) |  |
| Any V1 reference observed? |  |

- If there is **no safe access** to the workspace, record: `UNVERIFIED — PJ MANUAL EXPORT OR SCREEN EVIDENCE REQUIRED`.
- A **V1 reference** in any workflow is a priority finding — record it prominently; do not change it.

---

## Return & next step
1. **Run the mandatory redaction check above**, then paste E1 (all sections + probe results/errors, secrets removed), E2 (both projects' tables, no secrets), E3 (one URL), E4 (per-role rows — write behaviour stays `UNVERIFIED — WRITE TEST NOT AUTHORISED IN PACKAGE A`), E5 (table, no secrets) back to **Claude + ChatGPT** on Issue #23 / this PR thread.
2. Claude + ChatGPT reconcile the evidence into the Package A registers and confirm whether Package A can close.
3. **Only after** the evidence is attached and reviewed, and PJ separately approves, does **Package B** begin. **Nothing here authorises Package B, any live change, or any V1/Production access.**

## Package A status
`PACKAGE A PARTIAL — PJ EVIDENCE REQUIRED` — unchanged. This pack is the instruction set to gather the five evidence items (E1–E5). Package A closes only once that evidence is returned and reviewed.
