# YAV2 Portal V2 — Discrepancy-Closure — Package Review

**Reviewer:** Claude (authoring self-review). **Scope:** static/authoring review only — **no SQL executed,
no database accessed, no commit/push/PR/merge/deploy.**
**Governing baseline:** `sync/integration` @ `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`.
**Kit branch (local only):** `verification/v2-0021-0024-reconciliation-kit`.
**Revision:** correction pass #3 — wording-only (provenance language). Pass #2 applied the ten earlier
corrections.

---

## 0. Post-execution addendum (2026-07-30 — closure stage)

The SELECT-only kit was **executed by PJ on 2026-07-30 11:15 IST** (`yav2-dev` / `ogjrwemjefvccpyjwxuo`);
Claude did not execute it. **Primary evidence = the exact raw Supabase output**, preserved verbatim in
deliverable #7 (`…LIVE_RESULT_EXACT_2026-07-30_1115_IST.json`); deliverable #7b
(`…LIVE_RESULT_SUMMARY_…json`) is a Claude-prepared convenience summary only, **not** the raw/exact output.
Outcome:

- **Tracker variance — CLOSED** (T1–T7 confirmed complete legitimate generation; no off-grain; +1
  accounting-only pair; calendar 0/0/0; FY 2026-27).
- **search_path — CLOSED** (all 10 pin `public, pg_temp`; live setting matches the governing repository
  setting).
- **Grant posture — row level sound** ([G5]=0, [G6]=0, RLS on all 39, CREATE locked, service_role
  `BYPASSRLS`); **11 anon-revoked + 28 RLS-mitigated**.
- **NEW HIGH residual R-ANON-OBJECT-PRIVILEGES** — 28 tables grant anon object-level
  `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`; RLS does not mediate these. Proposal: deliverable #9. Not
  exploitability-asserted.

**SQL-analysis acknowledgement (MAINTAIN).** The `[G9]` object-admin rollup **as executed** enumerated
`TRUNCATE/REFERENCES/TRIGGER` and **omitted the PostgreSQL-17 `MAINTAIN`** privilege. `MAINTAIN` was
nonetheless **visible in the raw ACL evidence** (`[G1]`/`[G8b]`/`[G11]`, which project `privilege_type`
generically), so the finding is fully supported. The **exact live evidence (deliverable #7, the raw Supabase
output) is preserved verbatim and NOT altered**; the **future-verification SQL** (`[G9]` in both
`YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql` and
`YAV2_DISCREPANCY_CLOSURE_CONSOLIDATED_JSON.sql`) has been updated to include `MAINTAIN` in the object-admin
rollup, with a comment recording the executed kit's SHA. This addendum supersedes the pre-execution framing
in §§1–8 below where they differ; the hash/line-count tables are refreshed in the post-reconciliation
handshake and this session's return.

---

## 1. Deliverables produced (6) — authoritative `wc -l`

| # | Path | `wc -l` |
|---|---|---|
| 1 | `docs/yav2-discrepancy-closure/YAV2_DISCREPANCY_CLOSURE_REPORT.md` | 150 |
| 2 | `docs/yav2-discrepancy-closure/YAV2_GRANT_EFFECTIVE_ACCESS_MATRIX.md` | 230 |
| 3 | `docs/yav2-discrepancy-closure/YAV2_TRACKER_COUNT_RECONCILIATION.md` | 153 |
| 4 | `docs/yav2-discrepancy-closure/YAV2_SECURITY_DEFINER_SEARCH_PATH_REVIEW.md` | 136 |
| 5 | `supabase/verification/YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql` | 644 |
| 6 | `docs/yav2-discrepancy-closure/YAV2_DISCREPANCY_CLOSURE_REVIEW_PACKAGE.md` | *(self — final `wc -l`/SHA reported in this session's return, to avoid a self-referential hash)* |

> Values above are the **post-closure** counts (2026-07-30). Files 1–5 are stable at this write; file 6
> (this review) is measured last, and its final `wc -l` + SHA-256 are recorded in the session return. The
> **full 18-file package manifest** (incl. evidence JSON, handshake, hardening proposal, consolidated-JSON
> kit, and the prior reconciliation set) is provided in the session return and preserved by the Draft PR.

---

## 2. SQL safety scan (static, literal-masked, comments stripped) — post-correction

| Check | Result |
|---|---|
| Final SQL SHA-256 (`YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql`, post-MAINTAIN revision) | `c25999b9fffa1857a86c590125efd011959a99f5080f5586c303725c95bb8c62` |
| Total lines (`wc -l`) | 644 |
| Executable statements (`;`-split, literal-masked) | **27** |
| Statements **not** beginning `SELECT`/`WITH` | **0** |
| Prohibited SQL keywords as standalone tokens (word-boundary; INSERT/UPDATE/DELETE/UPSERT/MERGE/CREATE/ALTER/DROP/TRUNCATE/GRANT/REVOKE/VACUUM/ANALYZE/REFRESH/CALL) | **0** |
| Multiword prohibited (COMMENT ON / SECURITY LABEL / SET ROLE / SET SESSION AUTHORIZATION / DO) | **0** |
| Application `public.<fn>(` calls in executable SQL | **0** |
| Sensitive value in any SELECT list (PAN/Aadhaar/GSTIN/TAN/CIN/LLPIN/financial) | **0** — only `COUNT(*) WHERE gstin IS NOT NULL` (presence, never the value) |
| Single-quote balance / parenthesis balance | balanced (executable-code quotes even; parentheses balanced) |

**False-positive control:** privilege names appearing as *string literals* (`'INSERT'`, `'UPDATE'`,
`'DELETE'`, `'TRUNCATE'`, `'REFERENCES'`, `'TRIGGER'`, `'CREATE'`) inside `aclexplode`/`bool_or` predicates
and `has_schema_privilege(...)` are masked before scanning; identifier substrings (`auth_insert`,
`anon_truncate`, `g_references`, `default_object_admin`, `rolcreatedb`, `grantee`) are excluded by the
word-boundary rule `(?<![A-Z0-9_])TOKEN(?![A-Z0-9_])`. Zero real keyword hits remain.

**Read-only by construction:** every block is catalog inspection (`pg_class`, `pg_namespace`, `pg_proc`,
`pg_policy`, `pg_policies`, `pg_roles`, `pg_default_acl`, `aclexplode`, `has_schema_privilege`,
`pg_get_function_identity_arguments`), aggregate `count(*)`/`bool_or`, or non-sensitive grain queries over
tracker tables (`GROUP BY` / `EXCEPT` on `client_id`,`fy_label`,`month`,`doc_type` only). `get_current_fy()`
is **not** invoked; the current FY is read from `financial_years`.

---

## 2b. Package-scoped evidence (per correction item 8)

**Exact six-file list + `wc -l` + SHA-256** (files 1–5 authoritative here; file 6 in the return):

| Path | `wc -l` | SHA-256 |
|---|---|---|
| `docs/yav2-discrepancy-closure/YAV2_DISCREPANCY_CLOSURE_REPORT.md` | 150 | `e4bc5b6f1fa0a1af5ca4b75bfe9b3076fab358c99b70cdfc4c82d3255fce2afd` |
| `docs/yav2-discrepancy-closure/YAV2_GRANT_EFFECTIVE_ACCESS_MATRIX.md` | 230 | `5b237af8a2944af636bbb69fff244227b27c87286ecc3978b6919e3de792c694` |
| `docs/yav2-discrepancy-closure/YAV2_TRACKER_COUNT_RECONCILIATION.md` | 153 | `8097d59c3c95bd81435f1228fb723953c664c6fc036873656f1e1f272ee46fdd` |
| `docs/yav2-discrepancy-closure/YAV2_SECURITY_DEFINER_SEARCH_PATH_REVIEW.md` | 136 | `d7d14b5ee77948322516ff57915e09e4073cce80ff629228f5fdde65528b8951` |
| `supabase/verification/YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql` | 644 | `c25999b9fffa1857a86c590125efd011959a99f5080f5586c303725c95bb8c62` |
| `docs/yav2-discrepancy-closure/YAV2_DISCREPANCY_CLOSURE_REVIEW_PACKAGE.md` | *(return)* | *(return)* |

**Final SQL SHA-256 (post-MAINTAIN revision):** `c25999b9fffa1857a86c590125efd011959a99f5080f5586c303725c95bb8c62`. The version EXECUTED live on 2026-07-30 was `1ea286666a79b9597c69dab15e4d52ed9b8b4d03cc16da98e5e7a7d67a9833d9` (pre-MAINTAIN; recorded in the evidence JSON).

**`git status --short`:**
```
?? docs/v2-reconciliation/
?? docs/yav2-discrepancy-closure/
?? supabase/verification/YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql
?? supabase/verification/YAV2_V2_0021_0024_FULL_SELECT_ONLY_RECONCILIATION.sql
```

**Separation of THIS package from pre-existing untracked files** (`git status --porcelain -uall`):

*This package (6 files — all new/untracked):*
```
?? docs/yav2-discrepancy-closure/YAV2_DISCREPANCY_CLOSURE_REPORT.md
?? docs/yav2-discrepancy-closure/YAV2_DISCREPANCY_CLOSURE_REVIEW_PACKAGE.md
?? docs/yav2-discrepancy-closure/YAV2_GRANT_EFFECTIVE_ACCESS_MATRIX.md
?? docs/yav2-discrepancy-closure/YAV2_SECURITY_DEFINER_SEARCH_PATH_REVIEW.md
?? docs/yav2-discrepancy-closure/YAV2_TRACKER_COUNT_RECONCILIATION.md
?? supabase/verification/YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql
```
*Pre-existing untracked (NOT this package — prior reconciliation kit):*
```
?? docs/v2-reconciliation/  (7 files: CLOSURE_REPORT_TEMPLATE, DISCREPANCY_REGISTER,
     EVIDENCE_TEMPLATE, EXECUTION_GUIDE, EXPECTED_STATE_MATRIX, MASTER_REGISTER_DRAFT,
     PACKAGE_REVIEW)
?? supabase/verification/YAV2_V2_0021_0024_FULL_SELECT_ONLY_RECONCILIATION.sql
```

**No tracked file was modified:** `git diff --name-only HEAD` = *(empty)*; `git rev-list
c0009fc…..HEAD --count` = **0**. HEAD equals the governing baseline; nothing committed.

---

## 3. Cross-document consistency

- Baseline commit `c0009fc…`, target ref `ogjrwemjefvccpyjwxuo`, prohibited ref `zcszesuvjrryxtigjglt`
  stated identically across all 6 files.
- Block IDs referenced by the analysis docs match the kit exactly: `[A1]/[A2]/[A5]`, `[G1]–[G11b]`
  (incl. new `[G11]/[G11b]`), `[T1]–[T7]`, `[F1]–[F4]`.
- **Grant classification arithmetic:** (a) 14 + (b) 25 = **39 tables**. (a) = 3 audit + 7 core-M1-A +
  `entity_type_catalogue` + `client_remediation_flags` + 2 P5. (b) = 20 operational + 5 dependency.
- **Tracker arithmetic (PROVISIONAL):** +48÷12=4, +15÷5=3, +3÷1=3, 0; financials- and income_tax-implied
  pairs = 3; accounting-implied = 4 (hypothesised +1). Presented as *supporting arithmetic*, not proof, in
  the kit comments, deliverable #3, and the master report — consistently marked PROVISIONAL.
- **search_path:** all 10 = `'public', 'pg_temp'`; described uniformly as *"live `search_path`
  configuration matches the governing repository setting"* (no "byte-for-byte" wording anywhere).

## 4. Repository grounding (every claim cited to `file:line`)

| Claim | Cited source |
|---|---|
| No `ALTER DEFAULT PRIVILEGES` in repo ⇒ **likely** platform/default-environment origin; **historical provenance not conclusively available from current catalog evidence** ([G11]/[G11b] = supporting only) | comments only: `0015:401-402`, `0014:1049`, `0016:99`; supporting `pg_default_acl` [G11]/[G11b] |
| 0015 loop grants SELECT/INSERT/UPDATE to authenticated+service_role on 9 tables, revokes anon | `0015:384-399` |
| 0017 revokes INSERT/UPDATE from authenticated on 7 core tables (RPC-only writes) | `0017:1052-1064` |
| 0018 revokes DELETE from authenticated on the same 7 | `0018:57-66` |
| Audit tables FORCE RLS + no policy (default-deny) | `0005:36/56/67`, `0006:36-38`, `0010:571-580` |
| P5 tables SELECT-only + FORCE + RPC writes | `0021:199-227` |
| Tracker grain UNIQUE keys | `0007:435/438/440`, `0014:624` |
| Generator INSERT…ON CONFLICT (idempotent) | `0014:695/702, 802/808, 962/966, 1244/1264` |
| FY ceiling = `get_current_fy()` loop bound | `0014:686-687, 793-794` |
| calendar is GST-only | `0014:1240-1242, 1244-1264`; GST gate `0014:811` |
| 10 functions' governing search_path = `'public','pg_temp'` | `0008:56/66/99`, `0014:263/422/510/567/645/737/998` |
| Fleet convention `pg_catalog,public,pg_temp` elsewhere | `0016:313`, `0017:239…`, `0021:263…`, `0022:169/231` |

---

## 5. Governance / boundary checks

| Requirement | Result |
|---|---|
| No SQL executed | ✔ authored + statically validated only |
| No Supabase / MCP database access | ✔ zero connections |
| No migration created or run | ✔ kit lives under `verification/`, SELECT-only |
| No application code modified | ✔ only new files under `docs/yav2-discrepancy-closure/` + one `verification/` SQL |
| No commit / push / PR / merge / deploy | ✔ `git rev-list c0009fc..HEAD = 0`; `git diff HEAD` empty; adds are untracked (`??`) only |
| Production never referenced as authorised | ✔ `zcszesuvjrryxtigjglt` only in STOP/prohibited context |
| No live output fabricated | ✔ every live cell = *(pending execution)* / *(confirm live)*; tracker reading marked PROVISIONAL; grant origin marked "likely platform/default-environment — historical provenance not conclusively available from current catalog evidence" |
| No sensitive value exposed | ✔ counts / booleans / catalog / GSTIN-presence-count only |
| Broad grants not assumed harmless | ✔ owner-bypass, `BYPASSRLS`, policy-absence-fragility all stated as residuals |
| Every executable SQL statement begins `SELECT`/`WITH` | ✔ **27/27** |

---

## 6. Corrections applied in this pass (independent-review response)

| # | Correction required | Applied |
|---|---|---|
| 1 | Tracker conclusions → **PROVISIONAL — SUBJECT TO LIVE T2–T6 CONFIRMATION**; divisibility = supporting only | ✔ deliverable #3 (banner + §3/§4/§5 reworded), master report Area 2, SQL Section-T banner |
| 2 | Grant origin → **qualified** (likely platform/default-environment; historical provenance not conclusively available from current catalog evidence — refined in pass #3) | ✔ deliverable #2 §1 (G-ORIGIN qualified) + all "platform default" references softened; master report |
| 3 | Add SELECT-only `pg_default_acl` blocks (postgres/owner + anon/authenticated/service_role/PUBLIC; OID 0 preserved) | ✔ new **[G11]** (full) + **[G11b]** (presence summary) |
| 4 | [G9] privilege-specific (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER); no single `bool_or(true)`; separate read / data-write / object-admin verdicts | ✔ [G9] rewritten with 7 per-privilege booleans + 3 verdicts |
| 5 | Anon/PUBLIC policy detection catalog-safe via `pg_policy.polroles` + explicit PUBLIC (not rendered text) | ✔ [G5] rewritten on `pg_policy.polroles`, OID 0 → PUBLIC, empty polroles handled; [G9] uses same |
| 6 | Remove "byte-for-byte" → "live `search_path` configuration matches the governing repository setting" | ✔ removed in deliverable #4 (§1/§3), master report, this review |
| 7 | Resolve review-package line-count inconsistency; authoritative `wc -l` for all six | ✔ §1 + §2b rebuilt from `wc -l`; self-file measured in return |
| 8 | Package-scoped evidence (file list, `wc -l`, SHA-256 each, final SQL SHA, safety scan, `git status --short`, separation from pre-existing untracked, no tracked file modified) | ✔ §2 + §2b |
| 9 | Rerun static SQL validation after corrections | ✔ §2 — 27/27 SELECT/WITH, 0 prohibited, 0 fn-calls, 0 sensitive, balanced |
| 10 | Update recommended next decision — execution only after this corrected package passes independent review | ✔ master report §7 |

---

## 7. Limitations

- Live truth is unknown until PJ executes the kit; every verdict here is authoring-stage / source-lens, and
  the tracker reading is explicitly **PROVISIONAL**.
- The kit cannot prove the Supabase project ref from SQL — identity rests on the `[A5]` operator gate.
- Function equality is asserted at the **`search_path` setting** level (via live `proconfig` [F1]/[F2]), **not**
  a normalized full-definition (`pg_get_functiondef`) diff — that remains an optional manual step.
- Grant origin conclusion is **LIKELY PLATFORM/DEFAULT-ENVIRONMENT ORIGIN — HISTORICAL PROVENANCE NOT
  CONCLUSIVELY AVAILABLE FROM THE CURRENT CATALOG EVIDENCE.** `pg_default_acl` [G11]/[G11b] is **supporting**
  evidence (current default-privilege config); it can support or weaken the hypothesis but cannot prove the
  historical origin of ACLs already on existing tables (defaults may have changed before/after table
  creation). [G11]/[G11b] are retained precisely because they remain useful supporting evidence.
- Classes (c) and (d) are, by definition, only *fully* closable with the read-only run and — for (d) — a
  runtime/deployment audit outside SQL scope.

---

## 8. Reviewer verdict

The corrected package is **internally consistent, fully repository-grounded (every claim cited to
`file:line`), and statically proven SELECT-only** (27/27 statements, 0 prohibited tokens, 0 function calls,
0 sensitive values). All 10 required corrections are applied: tracker conclusions are PROVISIONAL, grant
origin is stated as "likely platform/default-environment — historical provenance not conclusively available
from current catalog evidence" with `pg_default_acl` [G11]/[G11b] retained as **supporting** evidence, [G9]
is privilege-specific with three verdicts, anon/PUBLIC policy detection is catalog-safe, and "byte-for-byte"
wording is removed. It introduces **no**
mutation, migration, or commit. **It is ready for independent (ChatGPT) review; live execution may be
requested only after that review passes.**
