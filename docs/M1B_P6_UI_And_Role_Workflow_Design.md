# YAV2 Portal V2 — Module 1 — P6 UI & Role Workflow Design

**Status:** DISCOVERY / DESIGN — PROPOSED. No source implemented. No DB access by Claude.
**Authored:** 2026-07-21 23:10 IST (UTC+05:30) · Author: Claude Code · Reviewer: ChatGPT · Approver: PJ.
**Governing HEAD:** `270da9e6c425a9bdc46276d659b7fed432ab7b53`.

> Design only — component **responsibilities and flow**, no JSX. All writes go through the P6 RPC boundary
> (dry-run / execute / verify); **no direct table DML from the UI**; **no auto-generation from Client Master edits**.

---

## 1. Backend RPC boundary (proposed)
| RPC | Kind | Role gate | Returns | Audit |
|---|---|---|---|---|
| `compliance_generation_preview(scope, client_id?, fy_labels[], params)` | **read-only** SECURITY DEFINER (STABLE) | `is_active_user() AND is_admin_or_manager()` | preview jsonb (§3 Data Model) | `compliance.generation.previewed` (LOW) |
| `compliance_generation_execute(preview_token/params, expected_counts)` | **write** SECURITY DEFINER (VOLATILE) | `is_active_user() AND is_admin_or_manager()` | run summary + run_id | `compliance.generation.committed` (HIGH) |
| `compliance_generation_verify(generation_run_id)` | **read** SECURITY DEFINER (STABLE) or read view | active user + admin/manager | reconciliation jsonb | — |
- Error codes (proposed): `NOT_AUTHORISED`, `NO_APPROVED_APPLICABILITY`, `REGISTRATION_REQUIRED`, `FY_NOT_ELIGIBLE`,
  `STALE_APPLICABILITY` (source row_version drift), `RUN_LOCK_UNAVAILABLE`, `DUPLICATE_SUPPRESSED`, `PARTIAL_FAILURE`.
- **No direct table DML from UI** — the frontend calls only these RPCs (mirrors the P5 CP-2 wrapper pattern).
- **Reinforced by the 22-Jul-2026 material finding:** because `authenticated`/Admin-Manager currently have direct
  write paths to trackers, the P6 UI must **never** write a tracker directly; the SECURITY DEFINER RPC boundary is
  the only sanctioned writer, and [REC T-08] closes the direct path at the DB before generation is enabled.

## 2. Where P6 appears in the app
- **Not** in Client Master Preview (that is entitlement/scope only). A dedicated **"Compliance Generation"** surface,
  visible **only to Admin/Manager**, reached from: (a) the **Compliance** tab (firm-wide run) and (b) a client
  context (client-scoped run). *(proposed; D-13)*
- Feature-flagged (e.g. `VITE_P6_GENERATION`) dark until a separate release approval, consistent with P5's flagging.

## 3. Permissions & non-authorised behaviour (fail-closed)
| Role | Sees generation UI? | Can preview? | Can execute? |
|---|---|---|---|
| Admin | ✔ | ✔ | ✔ |
| Manager | ✔ | ✔ | ✔ *(D-13 may restrict execute to Admin)* |
| Executive / Staff / Viewer | **No** (entry hidden) | ✘ | ✘ |
| Inactive / no team row | ✘ | ✘ | ✘ (RPC also fail-closed) |
Gating mirrors P5: capability derived from `team` (`is_admin`/`portal_role`/`is_active`), **and** the RPC re-checks
server-side (`is_admin_or_manager()`), so UI hiding is defence-in-depth, never the only control.

## 4. Screen flow (proposed)
```
[Compliance ▸ Generate]  (Admin/Manager only)
  1. Scope select: ○ This client  ○ Firm-wide        (+ FY multiselect, + service filter, + [back-generate?] off)
  2. [Run preview]  → calls compliance_generation_preview  (READ-ONLY)
  3. Preview table:  service · FY · period · due_date · target · outcome(INSERT/SKIP/CONFLICT/BLOCKED) · reason
        summary chips:  Inserts N · Skips N · Conflicts N · Blocked N
        blockers panel: e.g. "GST needs a linked registration", "FY not eligible"
  4. If Inserts>0 and no unresolved blockers →  [Review & Generate]  (explicit confirm modal, shows counts)
  5. Execute:  compliance_generation_execute(expected_counts)  → progress → result summary (run_id, committed N)
  6. Result:  ✓ committed  ·  ⤾ [Verify run]  ·  ⚠ partial failure → [Safe retry] (idempotent re-run)
  7. [Open audit trail] → filtered audit_log for this run_id
```

## 5. Component responsibilities (no implementation)
| Component (proposed) | Responsibility |
|---|---|
| `ComplianceGeneration.jsx` (container) | scope/FY/service selection; orchestrates preview→confirm→execute→verify; capability-gated mount |
| `GenerationPreviewTable.jsx` | render read-only preview lines + outcome badges; sortable; no writes |
| `GenerationBlockersPanel.jsx` | surface BLOCKED reasons with actionable text (e.g. link to add registration) |
| `GenerationConfirmModal.jsx` | explicit confirmation; echoes exact counts + expected_counts guard; WAI-ARIA dialog (focus trap/restore), safe-async (try/catch/finally, busy resets) — reuse P5 modal-shell patterns |
| `GenerationResultSummary.jsx` | committed counts, run_id, verify + retry + audit-trail links |
| `services/complianceGeneration*.js` | thin RPC wrappers (preview/execute/verify) + error mapping (`mapRpcError`) — the **only** call path |

## 6. Client-level vs firm-level
- **Client-level:** advisory lock per client; preview/execute scoped to one `clients.id`.
- **Firm-wide:** iterate eligible clients; per-client advisory lock; a single `generation_run` with per-client
  lines; partial failure isolates to the failing client (others still commit) with a clear per-client result.
- Both are **dry-run-first** and **explicit-confirm**; neither is triggered by any Client Master edit.

## 7. UX guarantees
- **Count semantics (D-01/D-10):** the preview/confirm counts report **tracker rows per `obligation_type`** and
  **calendar rows per distinct compliance obligation** by the five-part key
  `(client_id, service_code, obligation_code, fy_label, period_key)` — one calendar row per distinct obligation,
  **not** per tracker row (STATUTORY_AUDIT's financials+audit share one `obligation_code` → one calendar obligation
  unless PJ assigns them separate approved `obligation_code` values). The `expected_counts` guard carries both
  figures (tracker-row count and distinct-calendar-obligation count); preview↔execute parity uses the same five-part key.
- Preview never writes; execute requires explicit confirmation with a count guard (`expected_counts` must match
  or the execute aborts → protects against drift between preview and execute).
- Retry is **safe** (idempotent): already-generated lines SKIP; only missing lines insert.
- Every execute is audited; the result links to the audit trail.
- Non-authorised users see nothing (fail closed) and the RPC independently denies them.
- No delete/reverse from the UI (recovery/cancel is a separate, approval-gated action — T-14).

## 8. Tests (frontend) — see the Security & Test Matrix for the full list
Static/DOM tests (Node `--test`, no live DB): RPC-only (no `.from`/`.rpc` direct table DML), capability gating
hides UI for non-Admin/Manager, confirm modal enforces the count guard, preview renders outcomes, error mapping,
accessibility (focus trap/restore), safe-async. Live runtime steps are in the runtime checklist.
