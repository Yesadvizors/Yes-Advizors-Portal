# YAV2 Portal V2 — Discrepancy-Closure Report

**FINAL DECISION: PASS WITH SPECIFIC CORRECTIONS.** The **three** original discrepancies (grant posture,
tracker variance, SECURITY DEFINER search_path) are **reconciled** against the PJ-executed live SELECT-only
run of **2026-07-30 11:15 IST** (`yav2-dev` / `ogjrwemjefvccpyjwxuo`). One **new** HIGH item —
anonymous **object-level** privileges (`TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`) on 28 tables — is carried as a
**separately governed hardening action** (`R-ANON-OBJECT-PRIVILEGES`), not a reopening of the three areas.
**Authorised target:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.
**Basis:** source analysis of `supabase/migrations/` corroborated by the live run. **Claude executed no SQL,
accessed no Supabase, performed no mutation/migration; no live privilege revoked or altered.**
**Governing baseline:** `sync/integration` @ `c0009fc9cca61d5aa716c4e6e1c3ea6ab6ef54d5`.
**Live evidence:** `docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_2026-07-30_1115_IST.json`.

---

## 0. Package contents

| # | Deliverable | Role |
|---|---|---|
| 1 | `docs/yav2-discrepancy-closure/YAV2_DISCREPANCY_CLOSURE_REPORT.md` | **This** master report |
| 2 | `docs/yav2-discrepancy-closure/YAV2_GRANT_EFFECTIVE_ACCESS_MATRIX.md` | Area 1 — grant posture |
| 3 | `docs/yav2-discrepancy-closure/YAV2_TRACKER_COUNT_RECONCILIATION.md` | Area 2 — tracker variance |
| 4 | `docs/yav2-discrepancy-closure/YAV2_SECURITY_DEFINER_SEARCH_PATH_REVIEW.md` | Area 3 — search_path |
| 5 | `supabase/verification/YAV2_DISCREPANCY_CLOSURE_SELECT_ONLY.sql` | SELECT-only verification kit (Sections A/G/T/F) |
| 6 | `docs/yav2-discrepancy-closure/YAV2_DISCREPANCY_CLOSURE_REVIEW_PACKAGE.md` | Self-review + safety scan + git diff |
| 7 | `docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_2026-07-30_1115_IST.json` | Live-run evidence (PJ-executed; structured transcription) |
| 8 | `docs/yav2-discrepancy-closure/YAV2_POST_RECONCILIATION_HANDSHAKE_2026-07-30_IST.md` | Post-reconciliation handshake / status |
| 9 | `docs/yav2-discrepancy-closure/YAV2_SECURITY_HARDENING_PROPOSAL_ANON_OBJECT_PRIVILEGES.md` | Future hardening proposal (R-ANON-OBJECT-PRIVILEGES) |
| — | `supabase/verification/YAV2_DISCREPANCY_CLOSURE_CONSOLIDATED_JSON.sql` | Single-JSON variant of the kit (convenience) |

---

## 1. Executive summary

| Area | Discrepancy | Live-confirmed finding (2026-07-30) | Disposition |
|---|---|---|---|
| **1. Grant posture** | anon/authenticated/service_role show broad table privileges | Live: **all 39 tables RLS-enabled**; **[G5]=0**, **[G6]=0**; anon/authenticated **cannot CREATE in public**; **service_role `BYPASSRLS`** confirmed. **11 tables anon-revoked**, **28 RLS-mitigated**. Broad grants are of **likely platform/default-environment origin** (no repo grant statement; `pg_default_acl` = supporting-only). **NEW:** 28 tables grant anon **object-level** `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` that RLS does **not** mediate. | **Row-level posture sound (c = empty, live-confirmed).** New HIGH residual **R-ANON-OBJECT-PRIVILEGES** (object-level) — separately governed hardening; **not** claimed exploitable (no runtime evidence). |
| **2. Tracker variance** | +48 / +15 / +3 / 0 | Live **[T1–T7] CLOSED**: totals 360/135/29/0; pairs 30/27/29 (`360=30×12`, `135=27×5`, `29=29×1`); **[T4] no off-grain**; **[T5] exactly 1 accounting-only pair**; **[T6] 0/0/0**; **[T7] FY 2026-27**. | **CLOSED.** Counts reflect **complete, legitimate generation**; duplicate/partial/off-grain **excluded** live. R-TRK resolved. |
| **3. search_path** | 10 functions on `public, pg_temp` | Live **[F1]/[F2]**: all 10 SECURITY DEFINER pin `search_path = public, pg_temp`; **live setting matches the governing repository setting**, no divergence. | **CLOSED** (setting comparison). Future hardening: pin `pg_catalog` first — **retained** (non-urgent; safe as anon/authenticated cannot CREATE in public). |

**Overall — PASS WITH SPECIFIC CORRECTIONS.** The three original discrepancies are **reconciled** against the
live run: tracker variance **CLOSED**, search_path **CLOSED**, and grant posture's **row-level** picture
**confirmed sound** (RLS on all 39; no anon/PUBLIC or legacy-open policy; CREATE locked). The one carried
item is the **new** HIGH **object-level** finding **R-ANON-OBJECT-PRIVILEGES** — anon holds
`TRUNCATE/REFERENCES/TRIGGER/MAINTAIN` on 28 tables, which RLS does not mediate — handled as a **separately
governed hardening action** (proposal only; not exploitability-asserted). No live mutation occurred.

---

## 2. Area 1 — Table grant posture  *(full detail: deliverable #2)*

- **Origin (qualified).** No `ALTER DEFAULT PRIVILEGES` / `GRANT ON ALL TABLES` exists in the repo (only
  comments: `0015:401-402`, `0014:1049`, `0016:99`). Final conclusion: **LIKELY PLATFORM/DEFAULT-ENVIRONMENT
  ORIGIN — HISTORICAL PROVENANCE NOT CONCLUSIVELY AVAILABLE FROM THE CURRENT CATALOG EVIDENCE.**
  `pg_default_acl` [G11]/[G11b] shows the **current** default-privilege configuration and can **support or
  weaken** this hypothesis, but **cannot by itself prove** how existing tables' ACLs were acquired (defaults
  may have changed before or after those tables were created) — it is supporting evidence, retained as such.
- **Explicit least-privilege** is applied only to the 9 M1-A tables (`0015:384-399`) and 2 P5 tables
  (`0021:219-227`), plus function-EXECUTE and write closures (`0017:1052-1064`, `0018:57-66`).
- **Four-way distinction enforced** (raw grant ≠ RLS ≠ FORCE ≠ policy ≠ effective access). Key hazards
  *not* waved away: (i) RLS `ENABLE` ≠ `FORCE` → owner bypass on 25 tables; (ii) `service_role` `BYPASSRLS`
  → RLS-irrelevant, secret-handling only; (iii) anon's block = policy-absence, not explicit revoke.
- **Classification:** (a) 14 tables · (b) 25 tables · **(c) 0 — CONFIRMED EMPTY LIVE** ([G5]=0, [G6]=0, RLS
  on all 39) · (d) service_role key confinement + owner-bypass reachability (runtime). Live grant-posture
  split: **11 anon-revoked + 28 RLS-mitigated = 39**.
- **Live results (2026-07-30):** all 39 RLS-enabled; **[G5]=0**; **[G6]=0**; anon/authenticated **cannot
  CREATE in public**; **service_role `BYPASSRLS`** confirmed. Row-level exposure class **(c) empty**.
- **NEW HIGH residual — R-ANON-OBJECT-PRIVILEGES:** 28 RLS-mitigated tables grant anon **object-level**
  `TRUNCATE / REFERENCES / TRIGGER / MAINTAIN` (PG-17) which **RLS does not mediate**. Recorded as a
  **separately governed hardening action**; **not** asserted exploitable (no runtime evidence). Proposal:
  deliverable #9. The original `[G9]` object-admin rollup **omitted `MAINTAIN`** (visible in raw ACL
  [G1]/[G8b]/[G11]); future verification SQL updated — executed evidence unaltered.
- **Verify:** [G1]–[G11b]. Origin (supporting only): **[G11]/[G11b]** (`pg_default_acl`, current config).

## 3. Area 2 — Tracker count variance  *(full detail: deliverable #3)* — **CLOSED**

- **Grain:** accounting 12/pair (`activate_accounting_service`), financials 5/pair + income_tax 1/pair
  (`generate_client_compliance_core`), calendar GST-only. UNIQUE keys `0007:435/438/440`, `0014:624`.
- **Live T1–T7 (2026-07-30):** totals **360/135/29/0**; pairs **30/27/29** (`360=30×12`, `135=27×5`,
  `29=29×1`); **[T4] no off-grain groups**; **[T5] exactly 1 accounting-only pair** (income_tax-only 0);
  **[T6] 0/0/0**; **[T7] FY 2026-27** (flag = date).
- **Confirmed live:** counts reflect **complete, legitimate generation** (FY 2026-27 in-range and/or
  newly-activated pairs). Duplicate and partial/off-grain generation **EXCLUDED** by [T4]. R-TRK **resolved**.
- **CLOSED.** No row modified; reconciliation was read-only.

## 4. Area 3 — SECURITY DEFINER search_path  *(full detail: deliverable #4)* — **CLOSED**

- **Live [F1]/[F2]:** all 10 SECURITY DEFINER functions pin `search_path = public, pg_temp`; the **live
  `search_path` setting matches the governing repository setting** (`0008:56/66/99`,
  `0014:263/422/510/567/645/737/998`) — **no divergence** (setting comparison; not a normalized
  full-definition diff). **CLOSED.**
- **Future hardening (retained):** pin `pg_catalog` first (fleet already does so in `0016/0017/0021/0022`).
  Non-urgent — live confirmed anon/authenticated cannot CREATE in public.
- **Orthogonal note:** PUBLIC/anon EXECUTE on `get_my_role`/`get_my_team_id`/`is_admin` is the separate
  **G-05** HIGH item — unrelated to search_path.

---

## 5. Consolidated residual register

| ID | Area | Severity | Residual | Status (post live run) | Applied? |
|---|---|---|---|---|---|
| **R-ANON-OBJECT-PRIVILEGES** | 1 | **HIGH — hardening required** | 28 tables grant anon **object-level** `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`; RLS does **not** mediate | **OPEN** — proposal in deliverable #9; **not** exploitability-asserted (no runtime evidence) | No — proposal, separate PJ approval |
| R-SVC | 1 | Medium (latent) | `service_role` broad grant + `BYPASSRLS` — RLS-irrelevant | OPEN — secret-handling; (d) client-bundle/Edge audit | No — proposal |
| R-OWN | 1 | Low→Medium | 28 RLS-mitigated tables RLS `ENABLE` not `FORCE` → owner bypass | OPEN — future `FORCE RLS` (DDL, PJ) | No — proposal |
| R-ANON (data) | 1 | Low (defence-in-depth) | 28 tables rely on policy-absence, not explicit anon `REVOKE` of SELECT/INSERT/UPDATE/DELETE | OPEN — folded into deliverable #9 | No — proposal |
| R-C-COND | 1 | HIGH *if present* | Any surviving `*_authenticated_all` / anon policy / RLS-off | **RESOLVED** — live [G6]=0, [G5]=0, RLS on all 39 | n/a — confirmed clean |
| R-TRK | 2 | Low | +1 accounting-only (client, FY) pair | **RESOLVED** — live [T5]=1, [T4] on-grain | n/a — confirmed benign |
| R-SP | 3 | Low | 10 fns pin `public` before `pg_catalog` | OPEN — future repin (DDL, PJ) | No — proposal |
| R-G05 | 3/1 | HIGH (pre-existing) | PUBLIC/anon EXECUTE on role helpers (17 fns) | OPEN — separate remediation track | No — recorded |

**None of the OPEN residuals is remediated here** — each is a live mutation requiring separate PJ
authorisation. This package only *analyses*, *records live evidence*, and *proposes* hardening. No privilege
was revoked or altered.

---

## 6. Boundary & governance attestation

| Control | Status |
|---|---|
| Every executable SQL statement begins `SELECT`/`WITH` | ✔ 27/27 (see deliverable #6 scan) |
| No application function executed | ✔ 0 `public.<fn>(` calls in code; FY derived from `financial_years` |
| No sensitive identifier / client value / financial figure selected | ✔ counts, catalog metadata, booleans, GSTIN-presence count only |
| No Supabase mutation / no MCP DB access **by Claude** | ✔ Claude ran nothing; the SELECT-only run was executed by PJ; results transcribed into deliverable #7 |
| No REVOKE/GRANT/ALTER/DDL/DML | ✔ 0 (word-boundary scan); R-ANON-OBJECT-PRIVILEGES is *proposal only* |
| No migration created or run · no deployment | ✔ none |
| V1/Prod ref appears only as prohibited/STOP | ✔ `zcszesuvjrryxtigjglt` in gate context only |
| Live results attributed, not fabricated | ✔ deliverable #7 is a labelled structured transcription of PJ's authorised run; provenance stated |
| PR #35 untouched | ✔ not modified, not marked ready |

---

## 7. Recommended next decision

**The three original discrepancies are reconciled (live-confirmed); this closure is preserved to GitHub via
a DRAFT PR on branch `verification/yav2-discrepancy-closure-final` (no merge).** The next authorised action
is a **separate PJ decision on the R-ANON-OBJECT-PRIVILEGES hardening proposal** (deliverable #9).

**Recommended sequence:**
1. **Preserve** this closure package on GitHub as a **Draft PR** (this task) — no merge, no deploy.
2. **PJ reviews R-ANON-OBJECT-PRIVILEGES** (deliverable #9). If approved, the anon object-level
   `REVOKE`/default-privilege correction proceeds as a **separately authorised** migration (with regression
   verification + rollback) — **not** part of this read-only closure.
3. The remaining OPEN residuals (R-SVC, R-OWN, R-ANON-data, R-SP, pre-existing R-G05) stay **separate,
   explicitly-authorised** live actions.

**Unauthorised and NOT performed here:** normal team use, Production access, any migration, merge, and
deployment. GitHub remains the permanent source of truth; nothing is merged or deployed without separate PJ
approval. **PR #35 is untouched and not marked ready.**
