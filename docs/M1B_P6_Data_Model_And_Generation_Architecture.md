# YAV2 Portal V2 — Module 1 — P6 Data Model & Generation Architecture

**Status:** DISCOVERY / DESIGN — PROPOSED. No implementation, no SQL executed, no DB access by Claude.
**Authored:** 2026-07-21 23:10 IST (UTC+05:30) · Author: Claude Code · Reviewer: ChatGPT · Approver: PJ.
**Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53`.

> **LATER-STATUS NOTE (added on GitHub preservation, 2026-07-26 IST — does not alter the historical design below):** the `remediation-t4` identifiers **`0023_grants_hardening`** and **`0024_search_path_hardening`** were subsequently authored and executed on V2/yav2-dev. **No formal P6 migration number is approved.** Before authoring any P6 migration, the number MUST be reconciled against GitHub, the governing Master Completion Register, the `remediation-t4` package and live database evidence. **Do not assume or reuse `0023` or `0024`** — the "tentative 0023" reference below is a superseded assumption.

> All objects below are **proposals** for a future, separately-authorised migration (tentative **0023**, T-15 — technical recommendation).
> Nothing is created here. Trackers/calendar currently carry **no lineage and no `row_version`**, so P6 must
> own its idempotency.

---

## 1. Proposed generation-run ledger (new tables)

### 1.1 `compliance_generation_run` (the run header)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK default gen_random_uuid() | the `generation_run_id` referenced by lines/outputs |
| `mode` | text CHECK ∈ ('PREVIEW','EXECUTE') | dry-run vs approved execution |
| `scope` | text CHECK ∈ ('CLIENT','FIRM') | D-13 |
| `client_id` | uuid NULL → clients(id) | set when scope=CLIENT |
| `fy_labels` | text[] | eligible FYs the run targeted |
| `status` | text CHECK ∈ ('STARTED','PREVIEWED','COMMITTED','FAILED','CANCELLED') | run lifecycle |
| `requested_by` | uuid | = auth.uid() of the executor |
| `params` | jsonb | opt-ins (e.g. back-generation flag, service filter) — no secrets |
| `counts` | jsonb | {inserts, skips, conflicts, blocked} snapshot |
| `started_at` / `finished_at` | timestamptz | |
| `row_version` | integer NOT NULL DEFAULT 1 | optimistic lock on the run |

### 1.2 `compliance_generation_line` (per-obligation lineage — the idempotency backbone)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `generation_run_id` | uuid → compliance_generation_run(id) | |
| `source_applicability_id` | uuid → client_service_applicability(id) | source scope row |
| `source_row_version` | integer | applicability `row_version` at generation time (staleness detection) |
| `client_id` | uuid → clients(id) | authoritative client key |
| `service_code` | text → service_catalogue(code) | |
| `obligation_code` | text | **the approved statutory obligation identity** (from the due-date matrix). Identifies the actual obligation/return/form/approved calendar-obligation group. Multiple tracker representations of one obligation share ONE `obligation_code`; distinct obligations use different codes. **PJ-approved in the matrix; never invented/inferred.** |
| `linked_registration_id` | uuid NULL | registration reference (same-client) |
| `fy_label` | text | target FY |
| `period_key` | text | canonical period (`2026-27:M04`, `:Q1`, `:H1`, `:ANNUAL`, `:ONETIME`) |
| `obligation_type` | text | target table + kind (e.g. `gst_tracker`, `compliance_calendar`) — a **tracker representation**, NOT the obligation identity |
| `target_table` | text | physical output table |
| `target_row_id` | uuid NULL | the inserted output row id (NULL for PREVIEW / SKIP / BLOCKED) |
| `due_date` | date NULL | computed standard due date |
| `assigned_owner` | uuid NULL | owner_team_id / assigned_to |
| `outcome` | text CHECK ∈ ('INSERT','SKIP','CONFLICT','BLOCKED') | classification |
| `reason` | text NULL | why SKIP/CONFLICT/BLOCKED |
| `is_active` | boolean NOT NULL DEFAULT true | lineage active/superseded |
| `generated_by` | uuid | = auth.uid() |
| `generated_at` | timestamptz DEFAULT now() | |

### 1.3 Minimal additive lineage on output rows *(proposed, T-16 — technical recommendation)*
Rather than widen every legacy tracker, prefer the **central `compliance_generation_line`** as the mapping.
If PJ prefers in-row lineage, add **only** `generation_run_id uuid NULL` + `source_applicability_id uuid NULL`
to each generated table (additive, nullable, non-breaking). Recommendation T-16.

## 2. Exact uniqueness boundary (duplicate prevention) — CORRECTED by 22-Jul-2026 B2 evidence
**Two layers, primary is the existing tracker key:**

1. **Primary (already in the DB):** each generation-target tracker enforces its own **business-UNIQUE key**, so
   a duplicate output row is rejected by the database regardless of P6:
   | Table | Existing UNIQUE key |
   |---|---|
   | accounting_tracker | `(client_id, fy_label, month)` |
   | income_tax_tracker | `(client_id, fy_label)` |
   | financials_tracker | `(client_id, fy_label, doc_type)` |
   | gst_tracker | `(client_id, gstin, return_type, fy_label, period)` |
   | tds_tracker | `(client_id, form_type, quarter, fy_label)` |
   | roc_tracker | `(client_id, fy_label, cin, form_name)` |
   | llp_tracker | `(client_id, fy_label, llpin, form_name)` |
   | audit_tracker | `(client_id, audit_type, fy_label)` |
   | payroll_tracker | `(client_id, fy_label, month)` |
   | compliance_calendar | `(client_id, compliance_tracker_id)` |
   P6 generation performs the insert as `ON CONFLICT DO NOTHING` against these keys → repeat/concurrent inserts
   become no-ops (SKIP), **the authoritative anti-duplication control**.

2. **Secondary (P6-owned lineage key):** a **UNIQUE index on `compliance_generation_line`**:
   ```
   UNIQUE (client_id, service_code, obligation_code, fy_label, period_key, obligation_type) WHERE is_active
   ```
   maps each planned tracker line to the run that produced it — giving **lineage, preview↔execute parity and safe
   concurrent retry**. It complements (does not replace) the tracker keys, and lets P6 classify SKIP/CONFLICT
   even where a tracker's unique key columns differ from the P6 `period_key` shape (e.g. gst's `gstin`-bearing key).

3. **Distinct-calendar-obligation key (for calendar cardinality, D-01/D-10):** the **distinct compliance
   obligation** is the **five-part configurable key**
   `(client_id, service_code, obligation_code, fy_label, period_key)` — **excluding** `obligation_type`.
   `obligation_code` (approved in the due-date matrix) is what makes the identity configurable: two obligations
   under the **same** service/FY/period are distinguished by **different `obligation_code`** values, and multiple
   tracker representations of **one** obligation share the **same** `obligation_code`. Therefore:
   - Multiple tracker `obligation_type` lines sharing one `obligation_code` (e.g. STATUTORY_AUDIT's
     `financials_tracker` + `audit_tracker`) collapse to **one** calendar obligation → **one** `compliance_calendar`
     row — **not one per tracker row**.
   - Two **different** approved `obligation_code` values under the same service/FY/period → **two** distinct
     calendar obligations → **two** calendar rows.
   Exactly one `compliance_calendar` row is created **per distinct five-part key**. Expected-count and
   preview↔execute parity count **calendar rows by the five-part distinct-obligation key**, while tracker rows are
   counted per `obligation_type`. **Retry must never merge two separately-approved `obligation_code` obligations**,
   and a **missing/unapproved `obligation_code` → BLOCKED** (no tracker or calendar row).

## 3. Dry-run result structure (read-only preview)
`compliance_generation_preview(...) RETURNS jsonb` *(proposed)* — no writes; returns:
```json
{ "run": {"mode":"PREVIEW","scope":"CLIENT","client_id":"…","fy_labels":["2026-27"]},
  "summary": {"tracker_insert": N, "calendar_obligations": M, "skip": N, "conflict": N, "blocked": N},
  "lines": [ {"client_id":"…","service_code":"GST","fy_label":"2026-27","period_key":"2026-27:Q1",
              "obligation_type":"gst_tracker","due_date":"2026-07-31","outcome":"INSERT"},
             {"…":"…","outcome":"SKIP","reason":"already generated (line exists)"},
             {"…":"…","outcome":"BLOCKED","reason":"requires_registration but no linked_registration_id"} ] }
```
**Count semantics (D-01/D-10):** `tracker_insert` counts tracker rows **per `obligation_type`**;
`calendar_obligations` counts **distinct compliance obligations by the five-part key**
`(client_id, service_code, obligation_code, fy_label, period_key)` — i.e. **one calendar row per distinct
obligation, not per tracker row** (so a STATUTORY_AUDIT obligation whose `financials_tracker` + `audit_tracker`
lines share one `obligation_code` counts as **2 tracker_insert but 1 calendar_obligation**; two different approved
`obligation_code` values under the same service/FY/period count as **2 calendar_obligations**). `expected_counts`
in the execute guard carries these two separate figures, and preview↔execute parity uses the same five-part key.
The UI renders this table; PJ confirms before any EXECUTE.

## 4. Scenario assessment (correctness under edge cases)
| Scenario | Handling (proposed) |
|---|---|
| One applicability row → many periods | frequency expansion (§3 Business Rules); each period is a distinct line/period_key |
| Overlapping applicability rows (same client+service) | prevented upstream: live-uniqueness `UNIQUE(client_id,service_code) WHERE status<>'Inactive'` → at most one live row; only Approved generates |
| Restarted service (new Draft→Approved after Inactive) | new applicability row with a later `effective_from` → generates **forward** periods; old Inactive row's periods remain historically immutable (D-11) |
| Duplicate registration links | same-client FK + registration is a reference only; dedupe key does not include registration, so a changed registration does not fork obligations |
| Concurrent generation requests | **advisory lock** keyed on `hashtext('p6:gen:'||client_id)` (client scope) or a firm-wide key; second waiter re-evaluates and SKIPs already-created lines |
| Re-run after partial failure | idempotent: committed lines exist → SKIP; only missing lines insert; run marked COMMITTED when reconciled |
| Applicability changed after generation | `source_row_version` recorded; a later run with a newer version does **not** retro-edit prior rows (immutable, D-11); it may add new forward obligations |
| Due dates change after generation | generated `standard_due_date` is immutable historically; workflow may set `extended/individual_due_date` later; regeneration never overwrites (D-11/D-12) |
| Should generated rows be updated / superseded / immutable | **immutable** by default (D-11): supersession = mark line `is_active=false` + a compensating record; deletion/reversal requires separate approval (T-14) |

## 5. Idempotency & concurrency controls (summary)
1. **Advisory lock** per client (or firm) around EXECUTE — serialises concurrent runs, fail-closed if not acquired.
2. **UNIQUE(active) generation-line key** — the hard duplicate guard.
3. **`source_row_version`** capture — detects applicability drift between preview and execute (stale → re-preview).
4. **`compliance_generation_run.status`** — a run is COMMITTED only after verify reconciles; FAILED/CANCELLED runs leave a truthful trail.
5. **Fail-closed** — any missing eligibility / lock / registration / **approved due-date rule (D-12)** → BLOCKED
   line, **no tracker or `compliance_calendar` row created**, never a silent partial output.
6. **Calendar cardinality (D-01/D-10, governing rule)** — exactly one `compliance_calendar` row is created **per
   distinct compliance obligation, NOT automatically per tracker-table row.** A distinct obligation is the
   **five-part key** `(client_id, service_code, obligation_code, fy_label, period_key)`, where `obligation_code`
   is the PJ-approved statutory-obligation identity from the due-date matrix. Where one obligation is represented in
   multiple tracker tables (e.g. STATUTORY_AUDIT → `financials_tracker` + `audit_tracker` **sharing one
   `obligation_code`**), those tracker rows **reference the same calendar obligation** (the ledger records the
   mapping; the single calendar row links the obligation's designated primary tracker via
   `compliance_calendar.compliance_tracker_id`). If PJ later approves them as **distinct** statutory obligations,
   each gets a **separate approved `obligation_code`** and therefore its own calendar row.
7. **All-or-nothing execution** — each client's EXECUTE runs in a single transaction: all planned inserts for
   that client commit together or the client rolls back entirely (firm-wide runs isolate per client, so one
   failing client does not roll back the others). `expected_counts` from the preview must still match at execute
   time or the transaction aborts before writing.
8. **Legacy separation** — P6 objects live under a distinct `compliance_generation_*` namespace and call **none**
   of the legacy generators (`generate_client_compliance(_core)`, `activate_accounting_service`). The legacy
   functions are neither invoked nor modified; removing/hardening them is a separate future phase [REC T-08].

## 6. Audit linkage
Each EXECUTE emits audit events via the existing `audit_write_event` (SECURITY DEFINER, contract-validated),
under **new `audit_event_contract` rows** *(proposed, additive)*:
`compliance.generation.previewed` (LOW/S1, read), `compliance.generation.committed` (HIGH/S2, action),
`compliance.generation.blocked` / `compliance.generation.cancelled`. Required keys (proposed):
`generation_run_id`, `client_scope`, counts. No personal data in metadata (sensitivity-minimised).

## 7. What this does NOT do
No object is created here; this is a paper design. No `clients.services` migration; no legacy-generator reuse;
no compliance/tracker/calendar rows produced; `0014` untouched; V1/Production untouched. All names/numbers are
**tentative** pending the discovery-kit collision check (B20) and ChatGPT-reviewed technical recommendations T-15/T-16.
