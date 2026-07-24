# G-19 — Frontend DB-consumption manifest (schema-independent)

**Gap:** G-19 (App/contract, Documents/Compliance field-contract). **Acceptance:** Package A §C input.
**Source basis commit:** `1286a29` · **Reconciled at integration HEAD:** `d6dc469` · **Date:** 2026-07-24.

> **UPDATE (this block):** T1 froze the G-16 source contract, so the reconciliation that was *BLOCKED — AWAITING
> T1 CONTRACT FREEZE* is now **DONE at source level** — see `SOURCE_RECONCILIATION.md`. This manifest remains
> the **inventory** of what the frontend *requests* (each row is *"the app asks for X"*, not *"the DB has X"*);
> the source-level MATCH/VARIANCE verdicts and the LIVE-EVIDENCE-PENDING register live in the reconciliation
> file. Live V2 equality is **still pending** the PJ read-only A4 run.

## 1. Views consumed (`.from(<view>)`)
| View | Frontend select | Anchor | Source verdict |
|---|---|---|---|
| `v_firm_dashboard` | explicit `category,total,completed,overdue,pending,due_in_7_days` | `Dashboard.jsx:18` | MATCH — SOURCE |
| `v_firm_dashboard` | `*`; reads `total,completed,overdue,pending,due_in_7_days,waiting_client,partner_approval_pending` | `Compliance.jsx:1260,1274-1280` | MATCH — SOURCE |
| `v_overdue_ageing` | `ageing_bucket` | `Compliance.jsx:1261` | MATCH — SOURCE |
| `v_client_compliance_summary` | reads `due_soon` (legit for THIS view; ≠ firm dashboard) | `Compliance.jsx:1165,1174` | MATCH — SOURCE |
| `v_team_workload` | `*` | `Compliance.jsx:1262` | **VARIANCE (G-11)** — not authored; LIVE-EVIDENCE-PENDING |

**Verified fact (not pending):** no `v_firm_dashboard` select requests the removed `due_soon` (frozen contract
A.2); guarded by `tests/appShellRuntime.test.js` R6 and `tests/g19FieldContract.test.js`.

## 2. RPCs invoked (`.rpc(<fn>)`)
| RPC | Anchor | Frozen signature source | Source verdict |
|---|---|---|---|
| `get_sensitive_audit_logs` | `AuditLog.jsx:344,364` | contract §4 (0008) | MATCH — SOURCE (6/6 args) |
| `generate_client_compliance` | `complianceRunner.js:211` → `compliance.js:125` | contract §4 (0008) | MATCH — SOURCE (12/12 params) |
| `activate_accounting_service` | `complianceRunner.js:220` | contract §4 (0008) | MATCH — SOURCE (2/2) |
| `service_applicability_create` | `serviceApplicabilityWrites.js:57,110` | `0021:260` (DRAFT) | MATCH — SOURCE; **not in frozen §4** (see reconciliation §6) |
| `service_applicability_update` | `serviceApplicabilityWrites.js:58,120` | `0021:311` (DRAFT) | MATCH — SOURCE; **not in frozen §4** |
| `service_applicability_set_status` | `serviceApplicabilityWrites.js:59,130` | `0021:366` (DRAFT) | MATCH — SOURCE; **not in frozen §4** |

The 22 `0017` client-master CRUD RPCs are enumerated in the contract but **not invoked** by the current
frontend (`clientMasterReads.js:7` — "NO .rpc() call") → N/A for G-19.

## 3. Storage (`storage.from(<bucket>)`)
| Bucket | Operations | Anchors | Source verdict |
|---|---|---|---|
| `secure-docs` | `download`, `upload`, `remove`, `createSignedUrl(…, 600)` | `Compliance.jsx:631,944,953`; `DocumentsHub.jsx:5,121,132`; `DocumentManager.jsx:10,97`; `MarkFiledModal.jsx:5`; `OnboardingWizard.jsx:16` | name MATCH — SOURCE; isolation LIVE-EVIDENCE-PENDING (S5/G-08) |
| `completed-work` | list/read finalised work | `WorkDocuments.jsx:7` | name MATCH — SOURCE; isolation LIVE-EVIDENCE-PENDING |
| `client-docs` | legacy read (`legacyBucket`) | `DocumentManager.jsx:11`; `DocumentsHub.jsx:6` | name MATCH — SOURCE; isolation LIVE-EVIDENCE-PENDING |

## 4. Edge functions
| Function | Invoked from frontend? | Transport | Anchor |
|---|---|---|---|
| `ai-agent` | **Yes** | `functions.invoke` | `ChatAgent.jsx:51` |
| `scan-document` | **Yes** | `functions.invoke` | `OnboardingWizard.jsx:380` |
| `extract-financial` | **Yes** (via explicit `fetch` + bearer) | `fetch(${SUPABASE_FUNCTIONS_URL}/extract-financial)` | `Compliance.jsx:653,721` |

**Correction (this block):** the first-block manifest wrongly stated `extract-financial` had *"no call site"* —
that scan matched only `functions.invoke(` and missed the `fetch()` caller. **All three** contract edge
functions ARE invoked (frozen contract §6 confirms the call sites). Edge source = NONE-recoverable (G-09);
deployment presence = LIVE-EVIDENCE-PENDING (G-10).

## 5. Tables consumed (base tables `.from(<table>)`, call-site counts)
`documents`(13), `clients`(13), `tasks`(9), `team`(7), `completed_documents`(7), `follow_ups`(5),
`compliance_calendar`(5), `gst_tracker`(3), `financials_tracker`(3), `tds_tracker`(2), `roc_tracker`(2),
`income_tax_tracker`(2), `extracted_document_data`(2), `client_registrations`(2), `client_financials`(2),
plus singletons: `service_catalogue`, `notice_tracker`, `llp_tracker`, `gst_registration_details`,
`financial_years`, `client_service_applicability`, `client_persons`, `client_identifiers`, `client_directors`,
`client_contacts`, `client_addresses`, `claude_usage_log`, `audit_tracker`, `accounting_tracker`.
All **enumerated** column selects (Documents/Compliance focus) reconcile to the frozen appendix — MATCH — SOURCE
(`SOURCE_RECONCILIATION.md` §? / spot-verified incl. `compliance_calendar` cols vs `0004`). Live column equality
= LIVE-EVIDENCE-PENDING (G-03).

## 6. G-19 status
**SOURCE CONTRACT RECONCILED; LIVE V2 EQUALITY PENDING PJ READ-ONLY EVIDENCE.** Zero T2 code corrections were
required (frontend is consistent with the frozen source). Two variances recorded for T1/T3 (`v_team_workload`
G-11; P5-RPC contract-completeness). Full detail + live-pending register: `SOURCE_RECONCILIATION.md`.
