# T3 — Exact Source-to-Live Reconciliation — Package Manifest

**Package:** T3 Source-to-Live Exact Contract Reconciliation (Issue #23) · **Owner:** TERMINAL 3 — Supabase & Security
**Branch:** `sync/supabase-security` → **draft PR base:** `sync/integration`
**Integration HEAD at package start:** `65e20a44e386f91ee85912414ad86e593cda11a1`
**Draft PR:** #34 · **Initial package commit:** `c254607f07f97a1884cc85b684708a398768224f` · correction commit + authoritative current head recorded in §7.
**Workflow:** GitHub-first review. Commit + draft PR are **review actions only** — they authorize **no** merge,
SQL, migration, deployment, V1 access, or Auth/Storage/grant/permission/live change. Merge & live execution = PJ-only.
**Nature:** read-only, evidence & documentation. **No SQL executed; no V1; no mutation/deploy/remediation.**

## 1. Expected items (this package's scope)
- **Documentation files:** exact reconciliation, consolidated read-only evidence request, this manifest.
- **Reconciliation targets:** 14 named tables (field-by-field: columns/ordinal/types/nullability/defaults/
  identity-generated/PK/UNIQUE/FK/CHECK/indexes) · 19 enum types (count/names/labels/ordering) · 51 functions
  (signature/return/language/volatility/security/search_path/grants/body per risk tier) · 3 views (definitions) ·
  3 storage buckets (disposition) · migration ledger (disposition).

## 2. Files created in this package
| File | GitHub path | Disposition |
|---|---|---|
| Exact reconciliation | `supabase/verification/T3_EXACT_SOURCE_TO_LIVE_RECONCILIATION.md` | **CREATED** (this PR) |
| Evidence request | `supabase/verification/T3_EXACT_RECONCILIATION_EVIDENCE_REQUEST.md` | **CREATED** (this PR) |
| This manifest | `supabase/verification/T3_EXACT_RECONCILIATION_PACKAGE_MANIFEST.md` | **CREATED** (this PR) |

## 3. Files already present & verified (consumed; not modified)
| File | Role |
|---|---|
| `supabase/verification/T3_DB_CONTRACT_APPENDIX.md` | SRC column/RPC contract (§A/C/D/E) |
| `supabase/verification/T3_DB_CONTRACT_PROPOSAL.md` | SRC contract (enums §1, views §3, RPCs §4) |
| `contracts/G-16_SOURCE_CONTRACT_FREEZE.md` | T1 frozen SRC (A.1 enums, A.2 views, A.3 fns) + §B live-pending list |
| `supabase/verification/T3_LIVE_V2_RECONCILIATION.md` | PR #33 structural/count-level LIVE evidence |
| `docs/M1B_P5_0021_Execution_Evidence.md` | LIVE structural for `service_catalogue`/`client_service_applicability` (0021) |
| `docs/M1B_P5_PG1_Execution_Evidence.md` | LIVE structural for P5 constraint + 3 RPC grants (0022) |
| `supabase/migrations/**` | SRC (authoritative) |

## 4. Item dispositions (every expected item dispositioned — no undispositioned item)
| Item | Disposition |
|---|---|
| 14 tables — **existence** | **PRESENT & VERIFIED (EXACT MATCH)** — LIVE (PR #33) |
| 14 tables — **RLS/FORCE posture** | **EXACT MATCH** — LIVE (PR #33 FORCE-14 + 25 ENABLE-only) |
| 14 tables — **columns field-by-field** | **EVIDENCE-PENDING** — SRC established (`APPENDIX §A/C/D`); LIVE detail via Evidence Request §1 |
| 14 tables — **constraints** | **EVIDENCE-PENDING**, except `client_registrations_id_client_uq` + `csa_other_notes_required_chk` = **EXACT MATCH** (P5 exec evidence) |
| 14 tables — **indexes** | **EVIDENCE-PENDING** (Evidence Request §3) |
| Enum **type count** (19) | **EVIDENCE-PENDING** (§4) — not in supplied LIVE evidence |
| Enum **type names** | **EVIDENCE-PENDING** (§4) |
| Enum **labels** | **EVIDENCE-PENDING** (§4) |
| Enum **label ordering** | **EVIDENCE-PENDING** (§4) — must not be inferred from source |
| Functions — **count (51)** | **EXACT MATCH** — LIVE (PR #33) |
| Functions — **security posture** (48 DEFINER/3 INVOKER; all search_path pinned) | **EXACT MATCH (aggregate)** — LIVE (PR #33) |
| Functions — **per-function signature/return/language/volatility/proconfig/body** | **EVIDENCE-PENDING** (§5) |
| Functions — **EXECUTE grants** | **17 PUBLIC/anon = CONFIRMED VARIANCE** (enumerated, not remediated); P5 RPC grants **EXACT MATCH** (0022 exec); remainder **EVIDENCE-PENDING** (§5) |
| Views — **existence** (3) | **EXACT MATCH** — LIVE (PR #33) |
| Views — **definitions** (3) | **EVIDENCE-PENDING** (§6) |
| `v_team_workload` | **CONFIRMED VARIANCE (cross-package source-completeness)** — absent live & source; **not created** |
| Storage — `secure-docs` | **PRESENT & VERIFIED (required/live) — PASS** (PR #33) |
| Storage — `completed-work` | **DEFERRED / PENDING GOVERNING DISPOSITION** — not required by executable source (`0011` DEFER) |
| Storage — `client-docs` | **DEFERRED / PENDING GOVERNING DISPOSITION** — legacy read path; not required by executable source |
| Migration ledger (`schema_migrations`) | **ACCEPTED PROVENANCE LIMITATION** (recommended) — absent; not a defect; no backfill |
| Edge Fn source (`ai-agent`/`extract-financial`/`scan-document`) | **UNRECOVERABLE — with evidence** (prior package; carried) |
| `dkyc-verify-upload` | **OUT OF AUTHORISED SCOPE** (Package E) |
| 10-row person backfill | **OUT OF AUTHORISED SCOPE** (data migration; not authorised) |

## 5. Unrecoverable / deferred / out-of-scope (with authority)
- **Unrecoverable-with-evidence:** Edge Function `.ts` source (exhaustive all-ref search; prior `EDGE_FUNCTION_RECOVERY_STATUS.md`).
- **Deferred by design (PJ authority to resolve):** `completed-work`/`client-docs` bucket governing disposition; `v_team_workload` authoring (needs column spec, cross-package).
- **Out of authorised scope (this package):** any remediation of the 17 grants, `v_team_workload` creation, bucket creation, person backfill, Edge/Vercel deploy, runtime/RBAC testing (T2), `src/**` changes, Package B, V1 access.

## 6. Evidence-acquisition posture
- Existing repo evidence used first (§3). Where exact LIVE detail is absent, a **single consolidated read-only
  evidence request** (`T3_EXACT_RECONCILIATION_EVIDENCE_REQUEST.md`) is prepared: V2-only, SELECT/catalog only,
  no mutation/temp-table/DDL/DML/GRANT/REVOKE/migration, divided into enum/function/view/constraint/index/column
  sections with expected outputs. **T3 executes none of it** (PJ manual V2 run).

## 7. GitHub coordinates & verification status
- **Branch:** `sync/supabase-security` · **Draft PR base:** `sync/integration`
- **Draft PR:** **#34** — https://github.com/Yesadvizors/Yes-Advizors-Portal/pull/34
- **Initial package commit:** `c254607f07f97a1884cc85b684708a398768224f` (created the three package files; **do not overwrite**).
- **Correction commit:** the review-correction commit made in this cycle (SHA recorded in the PR #34 description and the T3 final report on push).
- **Authoritative current PR head:** the correction commit is the current branch tip / PR #34 head after this push (exact SHA in the PR #34 description and final report).
- **Source verification:** COMPLETE for all reconciliation targets (merged migrations + frozen contract).
- **Live verification:** COMPLETE for existence/RLS-FORCE posture/function-count-posture/view-existence/`secure-docs`
  and P5 structural items; **PENDING** for field-by-field columns, constraints/indexes (bulk), enum
  type/names/labels/ordering, per-function detail/body/grant matrix, and view definitions (Evidence Request §1–§6).
- **Out-of-scope:** Vercel/alias (T1), n8n/WhatsApp (external), runtime RBAC (T2), Package B.

## 8. Completeness assertion (no undispositioned item)
Every expected item in §1 has a recorded disposition in §2–§6: **exact match**, **confirmed variance**,
**evidence-pending**, **present & verified**, **deferred (with authority)**, **unrecoverable with evidence**, or
**out of authorised scope**. **No expected item is undispositioned.**

## 9. Completion impact
**+0.00 pp.** Preparing documentation/queries/analysis earns no completion; exact live evidence is pending PJ
execution. Official displayed completion remains **41.9%** (unrounded 41.85%); remaining **58.2%** (unrounded 58.15%).
Any future increase attaches to the *returned* exact evidence, not to this preparation. Provisional pending review.

## Governance footer
```
Governing Issue: #23 · Integration HEAD: 65e20a44e386f91ee85912414ad86e593cda11a1
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Draft PR base: sync/integration
Commit + draft PR = REVIEW ACTIONS ONLY · Merge & live execution: PJ ONLY
Authorised: V2 ogjrwemjefvccpyjwxuo ONLY · Prohibited: V1 zcszesuvjrryxtigjglt (never queried)
SQL/DB mutation: NOT AUTHORISED · Deploy/Alias: NOT AUTHORISED · Remediation: NOT PERFORMED · V1 access: NONE
```
