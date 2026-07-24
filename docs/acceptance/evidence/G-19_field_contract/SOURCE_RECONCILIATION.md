# G-19 — Frontend↔DB field-contract: SOURCE reconciliation

**Status:** **G-19 — SOURCE CONTRACT RECONCILED; LIVE V2 EQUALITY PENDING PJ READ-ONLY EVIDENCE.**
**Gap:** G-19 (App/contract). **Acceptance:** Package A §C input. **Owner:** T2.
**Reconciled against:** T1 frozen `contracts/G-16_SOURCE_CONTRACT_FREEZE.md` (from T3 PR #30 head `69f8093`) +
its source anchors `supabase/verification/T3_DB_CONTRACT_PROPOSAL.md` / `T3_DB_CONTRACT_APPENDIX.md`.
**Integration HEAD consumed:** `d6dc469a019feec34750e9ef0f52b4ed32cc79ea`. **Date:** 2026-07-24.
**No SQL executed · no V1 access · no live evidence asserted as verified.**

## Method & honesty rule
The G-16 contract is **source-frozen** (authored migrations, *AUTHORED NOT APPLIED*; `0021`/`0022` DRAFT).
Reconciliation therefore proves **source** agreement between what the frontend *requests* and the *authored*
contract. It does **not** prove live schema/RLS/grant/storage/edge/RPC-availability equality — every such fact
is labelled **LIVE-EVIDENCE-PENDING** (closed only by the PJ-authorised read-only A4 run on V2). Statuses:
`MATCH — SOURCE` · `MISMATCH — SOURCE` · `VARIANCE` · `LIVE-EVIDENCE-PENDING` · `N/A`.

## Result summary
- **Views:** 3 MATCH — SOURCE; **1 VARIANCE** (`v_team_workload` consumed but **not authored** → G-11).
- **RPCs:** 3 core MATCH — SOURCE (exact arg names); **3 P5 RPCs** MATCH — SOURCE **vs DRAFT 0021**, but
  **absent from the frozen §4 enumeration** → contract-completeness note for T1.
- **Storage:** 3 buckets all documented in contract §5; per-client isolation LIVE-EVIDENCE-PENDING (S5/G-08).
- **Edge:** 3 invocation shapes MATCH — SOURCE (contract §6 derived from these callers); deployment
  LIVE-EVIDENCE-PENDING (G-10); source NONE-recoverable (G-09, terminal).
- **Base tables / Documents+Compliance fields:** all enumerated column selects MATCH — SOURCE; live column
  equality LIVE-EVIDENCE-PENDING (G-03).
- **T2 code corrections required by reconciliation: NONE.** (Frontend source is consistent with the contract.)
  One **evidence** correction was made to this package — see §7.

---

## 1. Views (contract A.2 / §3)
| View | Frontend anchor | Requested | Frozen columns | Status |
|---|---|---|---|---|
| `v_firm_dashboard` | `Dashboard.jsx:18` | `category,total,completed,overdue,pending,due_in_7_days` | `category,total,completed,overdue,pending,due_in_7_days,waiting_client,partner_approval_pending` | **MATCH — SOURCE** (subset; no `due_soon`) |
| `v_firm_dashboard` | `Compliance.jsx:1260` | `*`; reads `total,completed,overdue,pending,due_in_7_days,waiting_client,partner_approval_pending` | (as above) | **MATCH — SOURCE** |
| `v_client_compliance_summary` | `Compliance.jsx:1165,1174` | `*`; reads `due_soon` | includes `due_soon` (legit here) | **MATCH — SOURCE** |
| `v_overdue_ageing` | `Compliance.jsx:1261` | `ageing_bucket` | `client_id,category,due_date,days_overdue,ageing_bucket` | **MATCH — SOURCE** |
| `v_team_workload` | `Compliance.jsx:1262` | `*` | **NOT AUTHORED** (contract B.6/§3 note, OI-3) | **VARIANCE (G-11)** — see §5 |

## 2. RPCs (contract A.3 / §4 / appendix E)
| RPC | Frontend anchor | Frontend arg names | Frozen signature | Status |
|---|---|---|---|---|
| `get_sensitive_audit_logs` | `AuditLog.jsx:344,364` | `p_from,p_to,p_page_number,p_page_size,p_risk_tier,p_client_uuid` | `(p_from timestamptz,p_to timestamptz,p_page_number int,p_page_size int,p_risk_tier text=NULL,p_client_uuid uuid=NULL)→jsonb` | **MATCH — SOURCE** (6/6 exact) |
| `generate_client_compliance` | `complianceRunner.js:211` → `compliance.js:125` | `p_client_id,p_client_type,p_incorporation_date,p_has_gstin,p_gst_frequency,p_has_tan,p_has_cin,p_has_llpin,p_gstin,p_tan,p_cin,p_llpin` | 12 params incl. all above (INVOKER)→void | **MATCH — SOURCE** (12/12; no unknown param) |
| `activate_accounting_service` | `complianceRunner.js:220` | `p_client_id,p_start_fy` | `(p_client_id uuid,p_start_fy varchar='2020-21')→void` | **MATCH — SOURCE** (2/2) |
| `service_applicability_create` | `serviceApplicabilityWrites.js:57,110` | `p_client_id,p_service_code,p_effective_from,p_effective_to,p_frequency,p_linked_registration_id,p_owner_team_id,p_notes` | `0021:260` `(uuid,text,date,date,text,uuid,uuid,text)→uuid` | **MATCH — SOURCE vs DRAFT 0021** · see §6 |
| `service_applicability_update` | `serviceApplicabilityWrites.js:58,120` | `p_id,p_expected_row_version,p_effective_from,p_effective_to,p_frequency,p_linked_registration_id,p_owner_team_id,p_notes` | `0021:311` `(uuid,integer,date,date,text,uuid,uuid,text)→integer` | **MATCH — SOURCE vs DRAFT 0021** · see §6 |
| `service_applicability_set_status` | `serviceApplicabilityWrites.js:59,130` | `p_id,p_expected_row_version,p_new_status,p_effective_to` | `0021:366` `(uuid,integer,text,date)→integer` | **MATCH — SOURCE vs DRAFT 0021** · see §6 |

**Client-key discipline (contract A.4):** `generate_client_compliance`/`activate_accounting_service` receive
`client.id`/`row.id` (**uuid**) — correct (both RPCs take `p_client_id uuid`). Compliance passes `client.id`
(uuid) to tracker tabs and `client.client_id` (text) to `FinancialsTab` (`Compliance.jsx:1246`) — the two-key
model is respected. **No key-type mismatch.**

**0017 client-master CRUD RPCs (22):** enumerated in the frozen contract but **not invoked** by the current
frontend (`clientMasterReads.js:7` — "NO .rpc() call"). Contract surface present, not yet consumed → `N/A`
for G-19 (no frontend anchor to reconcile).

## 3. Storage buckets (contract A? / §5)
| Bucket | Frontend anchors | Operations | Contract §5 | Status |
|---|---|---|---|---|
| `secure-docs` | `Compliance.jsx:631,944,953`; `DocumentManager.jsx:10`; `DocumentsHub.jsx:5`; `MarkFiledModal.jsx:5`; `OnboardingWizard.jsx:16` | download/upload/remove/`createSignedUrl(…,600)` | private primary bucket | name **MATCH — SOURCE**; isolation **LIVE-EVIDENCE-PENDING** (S5/G-08) |
| `completed-work` | `WorkDocuments.jsx:7` | list/read finalised work | private | name **MATCH — SOURCE**; isolation **LIVE-EVIDENCE-PENDING** |
| `client-docs` | `DocumentManager.jsx:11`; `DocumentsHub.jsx:6` (`legacyBucket`) | legacy read path | private (legacy) | name **MATCH — SOURCE**; isolation **LIVE-EVIDENCE-PENDING** |

Signed-URL expiry is **600 s** in source (`DocumentsHub.jsx:121,132`; `DocumentManager.jsx:97`). Per contract
§5, `storage.objects` RLS / per-client path separation are **live-only (`0012`)** → source cannot prove S5.

## 4. Edge invocation (contract A.5 / §6)
| Function | Frontend anchor | Transport | Request/response vs contract | Status |
|---|---|---|---|---|
| `ai-agent` | `ChatAgent.jsx:51` | `functions.invoke` | `{messages:[{role,content}]}`→`{response,error?}` | **MATCH — SOURCE** |
| `scan-document` | `OnboardingWizard.jsx:380` | `functions.invoke` | `{imageBase64,mimeType}`→`{extracted{…},fieldsFound,provider,error?}` | **MATCH — SOURCE** |
| `extract-financial` | `Compliance.jsx:653,721` | explicit `fetch` + bearer | `{mode,financialId,fileBase64,mimeType,docType,clientId,fyLabel,documentId,unitOverride?,ocrText?}`→`{fields?,engine?,confidence?,crossCheck?,unit?,…,error?}` | **MATCH — SOURCE** |

**Edge source:** NONE recoverable for any function (G-09 terminal, `EDGE_FUNCTION_RECOVERY_STATUS.md`).
**Edge deployment presence on V2:** **LIVE-EVIDENCE-PENDING** (G-10, A4 Part 2 §14).
`SUPABASE_FUNCTIONS_URL = VITE_SUPABASE_FUNCTIONS_URL || ${SUPABASE_URL}/functions/v1` (`supabase.js:21`).

## 5. VARIANCE — `v_team_workload` (G-11)
`Compliance.jsx:1262` executes `supabase.from('v_team_workload').select('*')`, but the frozen contract states
`v_team_workload` is **NOT authored** in any migration (contract B.6 / §3 "referenced-but-absent", OI-3). Per
contract consumption rule D.5, this is recorded as a **G-11 variance**, not coded around:
- **Not treated as missing:** the consuming code is **left intact** (the view may exist live via an unversioned
  path, exactly like `0012` storage). Deleting the query would be coding against an unproven assumption.
- **Not treated as present:** its live existence and column shape are **LIVE-EVIDENCE-PENDING** (A4 §6/§9b).
- **Runtime impact (if absent live):** the firm-dashboard "team workload" panel would receive `[]` (the code
  already guards with `t||[]` at `Compliance.jsx:1268`) — no crash, graceful empty. This graceful-degradation
  is confirmed by static reading; **live behaviour remains G-12 (BLOCKED-CREDS).**
- **Accountability:** existence resolution is G-11 (T3, A4). If A4 reports it absent, T1/T2 decide whether to
  author the view (T3/T1 contract change) or remove the panel (T2) — **a contract decision, deferred.**

## 6. Contract-completeness note (P5 RPCs) — for T1
The frontend's only write path for P5 service applicability calls `service_applicability_create/update/
set_status` (`serviceApplicabilityWrites.js`). These are **defined in source** (`0021` lines 260/311/366) and
the frontend arg lists **match that source exactly** (§2). However they are **absent from the frozen contract
§4 / appendix E enumeration** (which covers the 34 functions of `0008/0016/0017` only). Two consequences:
- **For T1 (contract):** consider adding the 3 P5 RPC signatures to the frozen contract for completeness. This
  is a **T1-owned contract change** — **not** performed here (T2 does not edit `contracts/**`).
- **Live availability:** `0021`/`0022` are **DRAFT — NOT APPLIED**, so live existence of these RPCs is
  **LIVE-EVIDENCE-PENDING** (stronger than for applied objects). The P5 write UI is gated behind roles and
  will surface the native Supabase error if the RPC is absent live — no invented fallback.

## 7. Evidence correction made in this package
`CONSUMPTION_MANIFEST.md` (first block) stated `extract-financial` had *"no call site in src/"*. That was a
**first-block error**: the earlier scan matched only `functions.invoke(` and missed the explicit `fetch()` call
at `Compliance.jsx:653,721`. Corrected in the manifest this block; the frozen contract §6 independently
confirms the call site. No product code was involved — documentation-only correction.

## 8. Live-evidence-pending register (nothing below may be reported as verified)
| Item | Gap | Source |
|---|---|---|
| Live tables/columns equality vs frozen §A | G-03 | A4 §2–§4 |
| `v_team_workload` live existence/shape | G-11 | A4 §6/§9b |
| Live RLS+FORCE+policies; no `*_authenticated_all` (V-2) | G-04 | A4 §10/§10b |
| Live EXECUTE grants incl. PUBLIC(OID 0)/anon (V-5) | G-05 | A4 §10d/§7 |
| Live definer `search_path` incl. 3 bare-`public` (V-4) | G-06 | A4 §7 |
| `secure-docs`/`completed-work`/`client-docs` private + per-client isolation (S5) | G-08 | A4 §13/§13c |
| Edge deployment presence (`ai-agent`,`scan-document`,`extract-financial`) | G-10 | A4 Part 2 §14 |
| Live availability of P5 RPCs (DRAFT `0021`/`0022`) | G-02/G-03 | A4 §7/§9 |

## G-19 disposition
**SOURCE CONTRACT RECONCILED** (frontend consistent with frozen source; zero T2 code corrections required;
2 variances recorded for T1/T3). **NOT fully closed** — live V2 equality is LIVE-EVIDENCE-PENDING (§8), to be
closed after the PJ-authorised read-only A4 run.
