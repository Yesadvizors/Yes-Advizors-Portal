# T3 — Package Manifest (Live V2 Evidence Reconciliation)

**Package:** T3 Live V2 Evidence Reconciliation (Issue #23) · **Owner:** TERMINAL 3 — Supabase & Security
**Branch:** `sync/supabase-security` → **draft PR base:** `sync/integration`
**Integration HEAD at package start:** `0455a3726adf5086f64bb0ffc8aeb6d7d1e02419`
**Package commit SHA / PR number:** initial commit `203a21f`; **PR #33** (this line finalized in the follow-up commit — see §7).
**Workflow:** YAV2 Permanent GitHub-First Review Method. This commit + draft PR are **review actions only** —
they do **not** authorize merge, SQL, migration execution, deployment, V1/Production access, or any Auth/Storage/
grant/permission/live change. PJ alone authorizes merge and any live execution.

## 1. Expected files & objects (this package's scope)
**Documentation files** (T3-owned, `supabase/verification/**` and `supabase/functions/**`):
DB contract proposal + appendix, security variance report, PJ evidence request, evidence-run log, Edge recovery
status, this reconciliation, this manifest.
**DB objects** (frozen source contract, reconciled to live V2): 39 public tables · 19 enums · 3 authored views
(+`v_team_workload` app-referenced) · 51 functions · 14 FORCE-RLS tables · 3 storage buckets expected · 4 Edge
Function names referenced · migration ledger.

## 2. Files created in this package
| File | GitHub path | Disposition |
|---|---|---|
| Live V2 reconciliation | `supabase/verification/T3_LIVE_V2_RECONCILIATION.md` | **CREATED & VERIFIED** (this PR) |
| This manifest | `supabase/verification/T3_PACKAGE_MANIFEST.md` | **CREATED** (this PR) |

## 3. Files already present & verified (merged prior; consumed by this package)
| File | GitHub path | Prior PR | Disposition |
|---|---|---|---|
| DB contract proposal | `supabase/verification/T3_DB_CONTRACT_PROPOSAL.md` | #30 | PRESENT & VERIFIED |
| DB contract appendix | `supabase/verification/T3_DB_CONTRACT_APPENDIX.md` | #30 | PRESENT & VERIFIED |
| Security variance report | `supabase/verification/T3_SECURITY_VARIANCE_REPORT.md` | #30 (corrected) | PRESENT & VERIFIED |
| PJ evidence request | `supabase/verification/T3_PJ_EVIDENCE_REQUEST.md` | #30 (corrected) | PRESENT & VERIFIED |
| Evidence-run log | `supabase/verification/T3_EVIDENCE_RUN_LOG.md` | #32 | PRESENT & VERIFIED |
| Edge recovery status | `supabase/functions/EDGE_FUNCTION_RECOVERY_STATUS.md` | #30 | PRESENT & VERIFIED |
| A4 discovery script | `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` | pre-existing | PRESENT & VERIFIED (read-only) |

## 4. DB-object dispositions (every expected item has a recorded disposition — step 10)
| Object class | Expected | Live disposition | Classification |
|---|---|---|---|
| Public tables | 39 | 39 present | **PRESENT & VERIFIED** (existence); columns → §6 |
| Enums | 19 | present (live) | PRESENT & VERIFIED (existence); full label reconciliation via A4 §5 = source-verified, live label-order EVIDENCE-PENDING |
| Authored views | `v_firm_dashboard`, `v_client_compliance_summary`, `v_overdue_ageing` | all 3 present | **PRESENT & VERIFIED** (G-11 PASS) |
| `v_team_workload` | app-referenced only | absent live **and** absent from authored DB source | **DEFERRED / CROSS-PACKAGE VARIANCE** (needs column spec; T2/G-19 + T3) |
| Functions | 51 | 51 present | **PRESENT & VERIFIED** (count match); grants → below |
| Function EXECUTE grants | least-privilege (no PUBLIC/anon) | 17 with PUBLIC+anon EXECUTE | **VARIANCE — CONFIRMED (G-05, HIGH)**; enumerated; remediation deferred (unauthorized) |
| FORCE-RLS tables | 14 (3 audit + 9 M1-A + 2 P5) | 14 FORCE / 25 not | **PRESENT & VERIFIED** (G-04 PASS) |
| RLS policies | refined role model, no `*_authenticated_all`, no anon | 93 policies / 36 tables, all authenticated, none leftover | **PRESENT & VERIFIED** (G-04 PASS) |
| `secure-docs` bucket | private, per-frozen-source | present, private, 6 objects, admin/manager policy | **PRESENT & VERIFIED** (G-08 secure-docs PASS) |
| `completed-work`, `client-docs` buckets | deferred in `0011` (not executable) | absent | **SOURCE-EXPECTATION RECONCILIATION PENDING** (not required by frozen source) |
| Edge Fn source (`ai-agent`, `extract-financial`, `scan-document`) | versioned source (register G-09) | none in any git ref | **UNRECOVERABLE — with evidence** (see §5); G-09 pending governing gap-definition reconciliation |
| Edge Fn deployment | deploy state known | 0 deployed (captured) | **PRESENT & VERIFIED** (G-10 PASS — acceptance "deployed list captured" met) |
| `dkyc-verify-upload` | Package E | spec-only in history; 0 deployed | **OUT OF AUTHORIZED SCOPE** (Package E not authorized) |
| Migration ledger (`schema_migrations`) | reconciled | table does not exist | **BLOCKED / ABSENT** (not proof of non-application; G-02) |
| Auth↔team mapping | integrity | 10 users / 8 team, 8/8 mapped, 0 orphan team, 2 orphan Auth | **VERIFIED with VARIANCE** (2 orphan Auth, Low; G-07) |
| Audit integrity | contract-matched | 33/33 matched, 0 unmatched, 0 secret-bearing (keyword) | **PRESENT & VERIFIED** (keyword scan not absolute) |

## 5. Unrecoverable items (with search evidence)
- **Edge Function TypeScript source** (`ai-agent`, `extract-financial`, `scan-document`, `dkyc-verify-upload`):
  exhaustive **all-ref** git search (`git rev-list --all` + `git ls-tree` + `git grep` for `Deno.serve`/`serve(async`)
  found **zero** `.ts`; the only `supabase/functions/**` artifact ever committed is a review-only
  `dkyc-verify-upload/SECURITY_SPEC.md` (commit `e63dd14`, branch `feat/dkyc-statutory`). No code invented.
  Evidence: `supabase/functions/EDGE_FUNCTION_RECOVERY_STATUS.md`.

## 6. Deferred items & authority
- **Column-level equality (G-03):** live inventory captured for 14 tables; source contract established; field-by-field
  equality **PENDING** side-by-side merge (no live SQL). Authority: reconciliation only per this package.
- **`v_team_workload` (G-11):** needs column spec — cross-package (T2/G-19 + T3). Not authored in any migration.
- **Person backfill (data):** 10-row weak-identity backfill NOT executed; data migration not authorized here.
- **Hardening (not authorized):** FORCE-RLS on operational tables (V-1); repin bare-`'public'` helpers (V-4);
  REVOKE the 17 PUBLIC/anon EXECUTE grants (V-5/G-05). All require PJ live authorization.

## 7. GitHub coordinates & verification status
- **Branch:** `sync/supabase-security` · **Draft PR base:** `sync/integration`
- **Draft PR:** **#33** — https://github.com/Yesadvizors/Yes-Advizors-Portal/pull/33
- **Package commit SHA:** initial `203a21f9af083c12dbf2ad35b0ffbbb9e8528943`; branch head advances by one follow-up commit that finalizes this line (the current branch tip is the authoritative package head shown on PR #33).
- **Source verification:** COMPLETE (merged migrations cross-checked; 39 tables / 51 functions / 14 FORCE / 3 views / bare-`'public'` set — all matched).
- **Live verification:** COMPLETE for structure/security/auth/audit/storage-secure-docs; **PENDING** for column-level equality (G-03), RBAC runtime (G-12/G-13, T2), migration ledger (G-02 absent/blocked).
- **Out-of-scope (not T3 / not this package):** Vercel/alias (T1, G-14/G-15), n8n/WhatsApp (external, G-17), runtime RBAC (T2, G-12/G-13).

## 8. Completeness assertion (step 10)
Every expected item in §1 has a recorded disposition in §2–§6: **created & verified**, **present & verified**,
**source-expectation pending**, **unrecoverable with evidence**, **deferred with authority**, or **out of
authorized scope**. No expected item is undispositioned.

## Governance footer
```
Governing Issue: #23 · Integration HEAD: 0455a3726adf5086f64bb0ffc8aeb6d7d1e02419
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Draft PR base: sync/integration
Commit + draft PR = REVIEW ACTIONS ONLY · Merge: PJ ONLY · Live execution: PJ ONLY (separate)
Authorised: V2 ogjrwemjefvccpyjwxuo ONLY · Prohibited: V1 zcszesuvjrryxtigjglt (never queried)
SQL/DB mutation: NOT AUTHORISED · Deploy/Alias: NOT AUTHORISED · Remediation: NOT PERFORMED · V1 access: NONE
```
