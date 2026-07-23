# YAV2 Portal — Full-History Functional Recovery, Variance Analysis & Live-Alignment Audit

**Type:** Documentation-only, full-history **read-only** audit. **Work-package issue:** #19.
**Governance:** #13 · **P6 scope:** #14 · **Prior reconciliation:** #17 (`docs/YAV2_Localhost_GitHub_Vercel_Reconciliation_Audit.md`).
**Author:** Claude Code · **Reviewer:** ChatGPT · **Approver:** PJ. **Audit date:** 2026-07-23 IST.
**Governing base:** `ui/redesign-v1` @ `6ef948f3af811abe23fa60439b3540e37f5cc4b9`.

> **Read-only.** No Supabase access, no runtime execution, no Vercel change, no deployment, no migration/SQL
> authoring or execution, no V1/Production action, no branch deletion, no PR closure, no recovery merge, no deletion
> of local work. This document **records variance and proposes a recovery programme**; it performs no recovery.
> **Matching SHAs prove provenance, not runtime behaviour; a document PASS does not prove a live feature; a merged
> frontend file does not prove its database dependency exists; a localhost demo does not prove the governing Vercel
> environment has the feature.** Nothing older is assumed valid merely because it exists.

---

## 1. Why this audit exists (business trigger)
PJ reports that features developed across the full YAV2 history appear **not visible / not working** in the Vercel
portal currently in use — cited examples: customer/assessment onboarding, admin login & functionality, non-admin
login & functionality, and role-based access control (menu/route/action-level). This audit reconstructs the **entire
project history (first commit → today)** and separates, per feature, four independent completion facts — **Designed,
Developed, Merged into the governing line, Live-runtime-verified** — so PJ can see exactly which features are (a)
present and live, (b) present in source but unverified at runtime/DB, or (c) genuinely absent from the governing/live
line because they were built on branches that were never merged into the redesign.

## 2. Authoritative identifiers (evidence base)
- **Repository:** `Yesadvizors/Yes-Advizors-Portal` (GitHub repoId 1257818966, public). Local: `D:\Claude\Claude Code\Yes-Advizors-Portal`.
- **First commit:** `32e89da` — *"Create index.html"* — **2026-06-03 IST**. **Total commits across all refs:** **254**.
- **Governing branch / HEAD:** `ui/redesign-v1` @ **`6ef948f3af811abe23fa60439b3540e37f5cc4b9`** (after PR #18 merge).
- **Last application/source-change commit:** **`3a5f439c15cafa493cd2d2320d7733f286441b6b`** (P5 UI); every commit since is documentation-only (`git log -- src`).
- **Governing Vercel V2:** project `yes-advizors-portal-v2-preview` (`prj_PFPT5rOJ4hpjyfqDHvppBlxTVeZv`, team `team_k1XHDoYfk0zOBVvGC4pVPFOc`); `live:false` (Preview only) — deploys `ui/redesign-v1`.
- **Second Vercel project:** `yes-advizors-portal` (`prj_7vjFHtSJQIIHiPJEvPw0DSwnCvEJ`); `live:false`; domains include `yes-advizors-portal.vercel.app` and `…-git-main-…` — historically auto-built the `main`/PR branches. Production posture not deep-audited (out of V2 scope).
- **Approved DB environment:** Supabase **V2 / yav2-dev** (`ogjrwemjefvccpyjwxuo`) only. **Prohibited:** V1/Production (`zcszesuvjrryxtigjglt`).

## 3. Full-history timeline (branch lineage — the central finding)
The project has **two source lines**:

1. **Original line — `main`** (`0588806`, 2026-06-14). All early feature branches (`feat/*`) branched off `main`
   and were reviewed as **PRs #1–#10 against `main`**. This line ends at `main@0588806`.
2. **Redesign line — `ui/redesign-v1`** (governing). This is a **reimplementation** that became the governing
   branch. `main` is fully contained in it (`main` is 0 commits ahead of governing). The redesign **reimplemented and
   expanded** the app (governing `src/` = **55** files, **33** components incl. Client Master preview + service
   applicability + hooks/lib) but **did not port every `main`-line feature branch forward** — this is the source of
   the "developed but not live" gap.

**Branch inventory vs governing (`origin/ui/redesign-v1`), ahead/behind + PR state:**

| Branch | Behind | Ahead | Branch-only source additions (present on branch, absent on governing) | PR | State |
|---|---:|---:|---|---|---|
| `ui/redesign-v1` (governing) | 0 | 0 | — | — | — |
| `main` | 58 | 0 | none (contained in governing) | #1 etc. | merged history |
| `feat/phase3-pr-safety-gate` | 64 | 5 | none unique to source | #2 | merged→main |
| `feat/phase4-audit-logging-plan` | 63 | 1 | none unique | #3 | merged→main |
| `feat/phase4a-audit-log-schema-draft` | 62 | 1 | none unique | #4 | merged→main |
| `feat/phase4b-audit-event-catalogue-rls` | 61 | 2 | none unique | #5 | merged→main |
| `feat/phase4c-audit-log-implementation-draft` | 60 | 26 | **9 audit-log migrations** `20260613080000–080008_*.sql` + `PHASE4C_AUDIT_LOG_ROLLBACK.sql` | **#6** | **OPEN (unmerged)** |
| `feat/admin-dashboard-home` | 60 | 7 | **0** (only older copies of shared files) | #7 | merged→main |
| `feat/phase4d-audit-logging-integration` | 59 | 1 | **0** (only older copies) | #8 | merged→main |
| `feat/dkyc-phase2-frontend` | 58 | 11 | **Director-KYC frontend:** `DirectorKYC.jsx`, `DirectorTrackerModal.jsx`, `DINHolderModal.jsx`, `CompanyLinkModal.jsx`, `KYCRecordDetail.jsx`, `KYCRecordModal.jsx`, `dkycFormat.js` | **#9** | **OPEN (unmerged)** |
| `feat/dkyc-statutory` | 58 | 1 | **Director-KYC statutory:** `DirectorKYCActivity.jsx`, `DirectorKYCClientPanel.jsx`, `DirectorKYCDetailModal.jsx`, `DirectorKYCStatusBadge.jsx`, `dkycFormat.js`, `dkycStatusMeta.js` + **edge function** `supabase/functions/dkyc-verify-upload/` | **#10** | **OPEN (unmerged)** |
| `claude/yav2-portal-rev-1-5-d2p40o` | 53 | 0 | none | #11/#12 base | merged history |
| `claude/ir1a-target-binding-correction` | 56 | 0 | none | #11 | merged |
| `claude/ir1a2-env-example-placeholder-correction` | 54 | 0 | none | #12 | merged |
| `docs/governance-workflow` | 65 | 0 | none | #1 | merged |
| `docs/project-wide-ai-collaboration-setup` | 8 | 0 | none | #15 | merged |
| `docs/p6-first-release-scope-and-due-dates` | 4 | 0 | none | #16 | merged |
| `docs/project-live-alignment-audit` | 1 | 0 | none | #18 | merged |
| `fix/frontend-safety-v1` (`bda50f6`) | 52 | 0 | none | — | history |
| `tmp/dkyc-assembly-c8180f` (`0588806`) | 58 | 0 | none | — | =main |
| `g2b/v2-migrations` (**local-only** `ae6bf1e`) | — | — | not on origin; superseded PR-#12 baseline | #12 | local-only |

*Repository state: **0 stashes, 0 tags**.*

## 4. Master feature inventory & four-stage completion
Legend — **Des**igned · **Dev**eloped · **Mrg** merged into governing `ui/redesign-v1` · **Live** live-runtime-verified.
`✓` yes · `~` partial · `✗` no · `?` not verifiable in this read-only audit.
**Strict `Live` definition:** `Live = ✓` is reserved for features proven to operate on the **current governing
Vercel V2 URL with its current Supabase state**. This read-only Git-history package did **not** exercise the current
governing runtime, so **prior localhost/preview/migration/package PASS evidence is treated as *historical* runtime
evidence (`~`), not present live verification.** Current-runtime confirmation is deferred to FR-1/FR-8.

| # | Feature / module | Des | Dev | Mrg | Live | Evidence & note |
|---|---|:--:|:--:|:--:|:--:|---|
| 1 | Portal V2 shell, Auth, **admin login** | ✓ | ✓ | ✓ | ~ | Present in governing `src/` (`Login.jsx`, `App.jsx` `is_admin` gating). **Historical** admin-login evidence in P5 (CLOSED PASS 2026-07-21); current governing Vercel V2 URL + current Supabase state **not re-exercised** here. |
| 2 | **Non-admin (Staff) login** | ✓ | ✓ | ✓ | ~ | Source present. **Historical** P5 Step 12 showed "account not active" until a `team` row (`auth_user_id`,`is_active`) was provisioned on V2. **Current** live behaviour **not verified**; current cause must be verified (not assumed to equal the historical root cause). |
| 3 | **Role-based access control** (menu/route/action) | ✓ | ✓ | ✓ | ~ | Source-present (`is_admin`/portal-role gating, RLS `is_active_user()`). End-to-end RBAC on the **current governing Vercel V2** was **not exercised** here; depends on V2 `team`/RLS data + build/deploy/config. |
| 4 | Client Master + preview (identifiers/addresses/contacts/persons/registrations/relationships) | ✓ | ✓ | ✓ | ~ | Governing `src/components/preview/*`; P5 UI at `3a5f439`. **Historical runtime evidence** (P5 Steps 1–14 CLOSED PASS); **not** re-verified on the current governing Vercel V2 URL with current Supabase state in this package. |
| 5 | Service Applicability (form/history/live-table/status) | ✓ | ✓ | ✓ | ~ | Governing `src/components/serviceApplicability/*`; migrations `0021`/`0022`. **Historical** P5 CLOSED PASS; **current governing runtime not exercised** here. |
| 6 | Compliance trackers + firm dashboard | ✓ | ✓ | ✓ | ~ | `Compliance.jsx`, `Dashboard.jsx`, migrations `0004`; `v_firm_dashboard` uses `due_in_7_days`. Frontend `due_soon` mismatch was corrected in source (not re-deployed/re-verified end-to-end). |
| 7 | Tasks / follow-ups / documents / team / usage / chat | ✓ | ✓ | ✓ | ? | Governing components present; runtime not exercised. |
| 8 | **Onboarding wizard** (client onboarding) | ✓ | ✓ | ✓ | ? | `OnboardingWizard.jsx` present in governing. Runtime not verified. *(Note: this is client-onboarding, **not** the Director-KYC module below.)* |
| 9 | Audit logging (UI + DB) | ✓ | ✓ | ✓ | ? | Governing `AuditLog.jsx` + migrations `0005`/`0016`. **Governing DB audit design differs from the phase4c branch set (row 12).** |
| 10 | **Director-KYC / dKYC module** (DIN KYC, director tracker, KYC records) | ✓ | ✓ | **✗** | **✗** | **Built on `feat/dkyc-phase2-frontend` (#9) + `feat/dkyc-statutory` (#10); both PRs OPEN, never merged; absent from the redesign governing tree.** Strongest candidate for PJ's "developed but not visible". **Confirmed source-level gap.** |
| 11 | **dKYC upload verification** (edge function `dkyc-verify-upload`) | ✓ | ✓ | **✗** | **✗** | Present only on `feat/dkyc-statutory` (#10). Not in governing `supabase/functions/`. Confirmed gap (paired with row 10). |
| 12 | Phase4c audit-log DB implementation (9-migration set) | ✓ | ✓ | **✗** | n/a | On `feat/phase4c-…` (#6). **Superseded** by governing `0005`/`0016` — an alternative earlier design, **not a live gap**; PJ should formally supersede/close, not merge. |
| 13 | Readiness/UAT/SOP package (Rev1.5) | ✓ | ✓ | ✓ | n/a | `YAV2_Readiness_Package_Rev1.5/*` committed in governing tree (docs artefact). |

## 5. Feature variance register (what differs, why, and required decision)
| ID | Variance | Evidence | Classification | Risk | Required (future, separately-approved) action | PJ decision |
|---|---|---|---|---|---|---|
| **FV-1** | **Director-KYC (dKYC) module absent from governing/live** | §3 (PRs #9/#10 open; branch-only components); §4 rows 10–11; governing tree has no `Director*`/`DIN*`/`dkyc*` files | **Confirmed *developed-but-unmerged* source gap.** This proves the code exists and was never merged; it does **not** by itself prove the branch should be recovered wholesale or is production-ready. Whether dKYC is in first-release scope is a **PJ scope question**. | Medium–High if dKYC is expected live | FR-4/FR-5: **requirements-, security-, compatibility-, test- and database-reviewed selective port** (or re-implement) — author dKYC tables + `dkyc-verify-upload` edge fn; PJ-execute on V2 — **or** a PJ de-scope decision. No wholesale merge. | **Yes — scope + recovery** |
| **FV-2** | **Admin/non-admin login & RBAC reported "not working"; source is present** | §4 rows 1–3; historical P5 Step 12 root cause (team row/Auth mapping) | **Source-present → complete source-absence ruled out; current cause remains runtime/DB/config/build/deployment/data dependent and must be verified.** The historical P5 root cause is **not** assumed to be the current cause. | Medium | FR-1 current-runtime + FR-2 DB + FR-3 data-provisioning + FR-8 config verification on V2 | Yes — schedule |
| **FV-3** | **Phase4c audit-log DB set unmerged; governing uses a different audit design** | §3 (#6 branch-only migrations); governing `0005`/`0016` | **Superseded design**, not a live gap | Low | FR-6: confirm governing audit is accepted; PJ formally supersede/close #6 (do **not** merge old set) | Yes — disposition |
| **FV-4** | **Runtime / DB-execution / config not verifiable** | No Supabase, no runtime driving, env values not exposed | **Unverifiable in read-only audit** | Medium | FR-1/FR-2/FR-8 controlled verification packages | Yes — schedule |
| **FV-5** | **Migration `0012` provenance gap** (executed live historically, no file; `0013` reserved) | Prior register R-9; governing migrations list has no `0012`/`0013` | **Provenance/DR gap** (carried from E-3) | Medium | FR-2 DB reconciliation; recover/re-author `0012` with content + evidence (do not reuse `0012`/`0013`) | Yes — schedule |
| **FV-6** | **Open superseded PRs #6/#9/#10; local-only `g2b/v2-migrations`; stale `feat/*` branches** | §3 | **Disposition** | Low | FR-7 PJ-decided close/keep (this audit does **not** close/delete) | Yes — disposition |
| **FV-7** | **Local-only superseded P6 "Rev10" material + ZIPs uncommitted** | Prior audit E-1 | **Retention** | Low | Retention decision (discard/archive/curated-commit) — not staged here | Yes — retention |
| **FV-8** | **Second Vercel project `yes-advizors-portal` Production posture** | §2; `live:false`, `-git-main-` domain | **Not deep-audited** | Low–Medium | FR-8 read-only classification; no change | Yes — classify |

## 6. Git variance analysis (summary)
- **Two-line history:** `main` (PRs #1–#10) → **redesign `ui/redesign-v1`** (governing, PRs #11/#12/#15/#16/#18).
  The redesign is a **superset** of `main` for the features it re-implemented, and the source of truth today.
- **Genuine unmerged content** exists on exactly **three open PRs**: **#6** (phase4c audit DB set — superseded),
  **#9** and **#10** (Director-KYC frontend + `dkyc-verify-upload` edge function — **not superseded, genuinely
  absent** from governing).
- `feat/admin-dashboard-home` (#7, merged→main) and `feat/phase4d` (#8) add **no unique source** vs governing — their
  admin-home/audit functionality is present in the redesign (`AdminHome.jsx`, `AuditLog.jsx`). Not gaps.
- All `docs/*`, `claude/*`, `fix/*`, `tmp/*` branches are 0-ahead of governing (history only).

## 7. Vercel full-history analysis
| Project | ID | Role | Governing V2? | Production? | Evidence |
|---|---|---|---|---|---|
| `yes-advizors-portal-v2-preview` | `prj_PFPT5rOJ4hpjyfqDHvppBlxTVeZv` | **Governing V2 Preview** (deploys `ui/redesign-v1`) | **Yes** | No (`live:false`, all Preview) | Prior audit verified deployment SHA == governing HEAD; PR #18 merge (`6ef948f`) is the current governing tip. |
| `yes-advizors-portal` | `prj_7vjFHtSJQIIHiPJEvPw0DSwnCvEJ` | Separate (historically built `main`/PR branches) | No | **Not deep-audited — Production posture not confirmed in this package** | Latest `dpl_2jHcJySCgZ3jSajAHRD9XekP17N9` READY; domains incl. `yes-advizors-portal.vercel.app`, `-git-main-`. Its independent Production state was **not deep-audited** (consistent with the Issue #17 audit); project-metadata flags are **not** treated here as a Production determination. **A stale/old build here can look like "the portal in use" while lacking redesign features — verify which URL PJ opens (FR-8).** |
- **Runtime behaviour of either deployment was not exercised** (read-only). SHA/provenance alignment ≠ functional PASS.
- **Likely contributors to "features not visible"** (to be confirmed by FR-1/FR-8, not asserted here): viewing the
  **second project / an older build / a stale clean-domain bundle**; **feature flags** (`VITE_P2_PREVIEW`,
  `VITE_P5_UI`) gating preview/service-applicability sections; **DB data/RLS** gating non-admin/RBAC; and the
  **genuinely absent dKYC module** (FV-1).

## 8. Database / configuration variance map
- **Migrations in governing:** `0001–0011`, `0014–0018`, `0021`, `0022` (+ rollbacks). **`0012` file absent**
  (executed live historically — provenance gap FV-5); **`0013` reserved/unused**.
- **Edge functions in governing:** **none tracked** (`supabase/functions/` empty on governing). The `dkyc-verify-upload`
  edge function exists **only** on `feat/dkyc-statutory` (#10) — FV-1/row 11.
- **Actual V2 execution state:** **NOT VERIFIABLE** here (Supabase intentionally not accessed). Whether every
  governing migration is executed on V2, and whether `team`/Auth/RLS data supports live RBAC, is unconfirmed (FV-2/FV-4).
- **Env/config values:** not exposed (only `.env.example` tracked); correct project-ref/env/flag binding **not
  independently confirmed** (FV-4/FR-8).

> **System-boundary limitation (important).** This is a **Git/source history** audit. It did **not** inspect, and
> makes **no assertion** about, the live internals of: **Supabase V2** (executed schema, **Auth user↔`team`
> mappings**, RLS policies, functions, triggers, storage buckets/policies, **Edge Functions**), **Vercel**
> (environment variables, build settings, feature flags, domain/alias routing, which URL PJ actually opens), and
> **n8n / any other integrations** where used. **A Git-history audit alone does not identify every operational
> variance.** Confirming end-to-end synchronisation across Localhost↔GitHub↔Vercel↔Supabase↔n8n↔runtime requires the
> **next, separately authorised, read-only full-system synchronisation audit** (FR-1/FR-2/FR-8). Nothing here should
> be read as certifying any of these live layers.

## 9. Recovery programme (FR-0 … FR-8) — proposed; each a SEPARATE PJ-approved package
> This audit authorises **none** of the below. Each requires its own PJ-approved work-package issue, and (where
> applicable) separate gates for Supabase access, migration/SQL authoring, PJ-executed migration/SQL on **V2 only**,
> commit/push, merge, and deployment. No Production. No V1.

| FR | Package | Purpose | Depends |
|---|---|---|---|
| **FR-0** | Audit acceptance & scope confirmation | This document; PJ confirms which features are **in-scope for live** (esp. dKYC FV-1) vs intentionally de-scoped | — |
| **FR-1** | **Runtime verification (V2 Preview)** | Drive the governing app; confirm admin login, non-admin login, RBAC menus/routes/actions; identify exactly which reported features fail live and why | FR-0 |
| **FR-2** | **DB/migration reconciliation (V2, PJ-run read-only)** | Confirm executed migrations vs repo; resolve `0012` provenance (FV-5); confirm `team`/RLS data driving RBAC | FR-0 |
| **FR-3** | **RBAC/non-admin live-enablement** | Generalise the P5 Step-12 remedy — provision required `team`/role/`is_active` data on V2 (PJ-executed) so non-admin/RBAC works live | FR-1, FR-2 |
| **FR-4** | **Director-KYC (dKYC) recovery decision & build** | Evaluate PR #9/#10 content; PJ decides port-into-redesign / re-implement / drop; if built: dKYC tables + UI + review + V2 execution | FR-0 |
| **FR-5** | **dKYC `dkyc-verify-upload` edge function** | Recover/author the upload-verification edge function + storage/RLS | FR-4 |
| **FR-6** | **Audit-log design reconciliation** | Confirm governing `0005`/`0016` is the accepted audit design; PJ formally supersede/close PR #6 (do **not** merge the old set) | FR-2 |
| **FR-7** | **Superseded branch/PR disposition** | PJ-decided close/keep for #6/#9/#10, local-only `g2b/v2-migrations`, stale `feat/*`; retention of local-only Rev10 P6 material (FV-7) | FR-0 |
| **FR-8** | **Config/env & second-project posture** | Verify V2 env vars + feature flags + project-ref binding; confirm which URL PJ uses; classify `yes-advizors-portal` Production posture (read-only) | FR-1 |

> **Immediate next read-only package (FR-1 + FR-2 + FR-8 combined):** a **full-system synchronisation audit** that
> expressly covers **Supabase V2** (executed schema, **Auth↔`team` mappings**, RLS/functions/triggers/storage, **Edge
> Functions** incl. the missing `dkyc-verify-upload`), **Vercel** (env/build/feature-flags/domain routing + the exact
> URL PJ uses), and **n8n / other integrations**. This is required because the present package is **Git-history-only**
> and, by itself, **cannot identify every operational/live variance**. It remains read-only and separately PJ-approved.

## 10. Audit conclusion
### `UNABLE TO CONCLUDE` (full functional/live alignment)
**Two-part result:**

- **(a) Git / source variance — IDENTIFIED.** The full-history Git/PR analysis is complete and yields a **confirmed
  source-level omission**: the **Director-KYC (dKYC) module** (and its `dkyc-verify-upload` edge function) was
  **developed on PRs #9/#10 but never merged and is absent from the governing redesign and live line** (FV-1). This
  proves *developed-but-unmerged* code exists; it does **not** by itself prove the branch should be recovered
  wholesale or is production-ready — any recovery must be requirements-, security-, compatibility-, test- and
  database-reviewed (FR-4/FR-5), or the feature PJ-de-scoped. Provenance is otherwise aligned: GitHub
  `ui/redesign-v1@6ef948f` ↔ governing V2 Preview deployment (Issue #17 audit, SHA-verified) ↔ authorised repository.

- **(b) Full Localhost↔GitHub↔Vercel↔Supabase↔n8n↔runtime synchronisation — UNVERIFIED.** This package is
  **Git-history-only**. Current-runtime (D), Supabase-V2 database/Auth/RLS/Edge-Function execution (E) and
  Vercel/config (F) were **not** inspected and **cannot** be certified here. **A source/SHA/document/localhost/preview
  PASS is not a current live functional PASS.** For the reported admin/non-admin/RBAC failures, **source is present**
  so complete source-absence is ruled out, but the **current cause remains runtime/DB/config/build/deployment/data
  dependent and must be verified** — the historical P5 root cause is **not** assumed current (FV-2). This is resolved
  by the separately authorised **full-system synchronisation audit** (FR-1/FR-2/FR-8).

It is **not `FULL ALIGNMENT`** (no current-runtime evidence; a confirmed omission exists) and **not `MATERIAL
MISALIGNMENT`** (most of the app is present, reimplemented, and has historical P5 PASS evidence; the one confirmed
omission may be an intentional redesign de-scope). Hence **`UNABLE TO CONCLUDE`**, resolved by FR-0…FR-8 under
separate PJ approval.

**Unresolved limitations:** V2 DB execution state, Auth↔`team` mappings, RLS/functions/triggers/storage/Edge
Functions (Supabase not accessed); current runtime behaviour of both Vercel projects (not exercised); Vercel
env/flag/project-ref/domain values and the exact URL PJ uses (not exposed); n8n/other integrations (not inspected);
`0012` provenance; second-project Production posture (not deep-audited). All are carried into §9.
