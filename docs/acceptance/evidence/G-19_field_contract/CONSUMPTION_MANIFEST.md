# G-19 — Frontend DB-consumption manifest (schema-independent)

**Gap:** G-19 (App/contract, Documents/Compliance field-contract). **Acceptance:** Package A §C input.
**Commit:** `1286a29` · **Date:** 2026-07-24. **Source of truth:** the governing frontend source only.

> **Reconciliation is BLOCKED — AWAITING T1 CONTRACT FREEZE.**
> G-19 depends on **G-03** (T3 live schema) and **G-16** (T1 frozen generated types). This manifest is the
> **schema-independent inventory** of what the frontend **requests** — an input to reconciliation, produced
> without inventing, renaming, or asserting any database column/view/RPC. Each row is *"the app asks for X"*,
> **not** *"the database has X."* The pass/fail comparison against live shapes is performed **after** the freeze.

## 1. Views consumed (`.from(<view>)`)
| View | Frontend select | Anchor | Reconcile |
|---|---|---|---|
| `v_firm_dashboard` | explicit `category,total,completed,overdue,pending,due_in_7_days` | `Dashboard.jsx:18` | BLOCKED-T1 |
| `v_firm_dashboard` | `*`; fields read: `total,completed,overdue,pending,due_in_7_days,waiting_client,partner_approval_pending` | `Compliance.jsx:1260,1274-1280` | BLOCKED-T1 |
| `v_overdue_ageing` | `ageing_bucket` | `Compliance.jsx:1261` | BLOCKED-T1 |
| `v_team_workload` | `*` | `Compliance.jsx:1262` | BLOCKED-T1 |
| `v_client_compliance_summary` | reads `due_soon` (legit for THIS view; ≠ firm dashboard) | `Compliance.jsx:1174` | BLOCKED-T1 |

**Verified fact (not pending):** no `v_firm_dashboard` select requests the removed `due_soon` (BASELINE §2);
guarded by `tests/appShellRuntime.test.js` R6.

## 2. RPCs invoked (`.rpc(<fn>)`)
| RPC | Anchor | Notes | Reconcile signature |
|---|---|---|---|
| `get_sensitive_audit_logs` | `AuditLog.jsx:344,364` | admin-only surface (S4) | BLOCKED-T1 |
| `generate_client_compliance` | `complianceRunner.js:211` (args `compliance.js`) | idempotent per source docs | BLOCKED-T1 |
| `activate_accounting_service` | (`complianceRunner.js`) | accounting activation | BLOCKED-T1 |

## 3. Storage (`storage.from(<bucket>)`)
| Bucket | Operations | Anchors | Reconcile |
|---|---|---|---|
| `secure-docs` | `download`, `upload`, `remove`, `createSignedUrl(…, 600)` | `Compliance.jsx:631,944,953`; `DocumentsHub.jsx:121,132`; `DocumentManager.jsx:97` | per-client RLS = S5, BLOCKED (G-08) |

## 4. Edge functions (`functions.invoke(<fn>)`)
| Function | Invoked from frontend? | Anchor |
|---|---|---|
| `ai-agent` | **Yes** | `ChatAgent.jsx:51` |
| `scan-document` | **Yes** | `OnboardingWizard.jsx:380` |
| `extract-financial` | **No call site in `src/`** | — (listed in BASELINE edge contract; frontend does not invoke it) |

**Observation (for T1/T3, not a T2 fix):** the Edge invocation contract lists three functions; the governing
frontend invokes only two. `extract-financial` has **no `functions.invoke` call site** in `src/`. Recorded as a
contract observation; Edge source/deploy is G-09/G-10 (T3), not T2.

## 5. Tables consumed (base tables `.from(<table>)`, counts of call sites)
`documents`(13), `clients`(13), `tasks`(9), `team`(7), `completed_documents`(7), `follow_ups`(5),
`compliance_calendar`(5), `gst_tracker`(3), `financials_tracker`(3), `tds_tracker`(2), `roc_tracker`(2),
`income_tax_tracker`(2), `extracted_document_data`(2), `client_registrations`(2), `client_financials`(2),
plus singletons: `service_catalogue`, `notice_tracker`, `llp_tracker`, `gst_registration_details`,
`financial_years`, `client_service_applicability`, `client_persons`, `client_identifiers`, `client_directors`,
`client_contacts`, `client_addresses`, `claude_usage_log`, `audit_tracker`, `accounting_tracker`.

## 6. G-19 close-out plan (post-freeze)
When G-16 freezes generated types from the G-03 live schema, T2 reconciles §1–§5 above (focus: Documents +
Compliance per the gap) column-by-column against the frozen contract, records any mismatch as a finding, and
fixes frontend field usage where the frontend is wrong. **Until the freeze, no field is renamed or added.**
