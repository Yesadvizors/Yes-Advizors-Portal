# G-16 — SOURCE CONTRACT FROZEN; LIVE RECONCILIATION PENDING PJ V2 READ-ONLY EVIDENCE

**Owner:** T1 — Control Tower / Lead Integrator (`sync/integration`). T1-owned path (`contracts/**`).
**Status:** **G-16 — SOURCE CONTRACT FROZEN; LIVE RECONCILIATION PENDING PJ V2 READ-ONLY EVIDENCE.**
**Frozen from:** T3 PR #30 (FINAL PASS) head `69f809394edd0a9b0484054e0300257b86269f73`, integrated into `sync/integration`. Source basis = authored migrations at governing HEAD `1286a29` (**AUTHORED NOT APPLIED**; `0021`/`0022` DRAFT).
**Authorised project:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` · **Prohibited:** V1 `zcszesuvjrryxtigjglt`.
**Provenance guarantee:** every item in §A is quoted from source with file anchors in `supabase/verification/T3_DB_CONTRACT_PROPOSAL.md` / `T3_DB_CONTRACT_APPENDIX.md`. **No SQL was executed; no V1 access; no live evidence is asserted as verified.**

> This freeze makes the **source-derived** contract authoritative for parallel consumption (T2). It does **not** assert live truth. TypeScript generated types are intentionally **deferred** until §B live evidence lands (generating them now would encode unverified assumptions).

---

## A. SOURCE-FROZEN CONTRACT (authoritative for T2 consumption now)

**A.1 Enums (19)** — `0001_extensions_and_enums.sql`, verbatim ordered labels; no `ALTER TYPE ADD VALUE` anywhere → label sets fixed. Contract-critical ones:
- `portal_role_enum` = `Admin, Manager, Executive, Staff, Viewer` (RBAC vocabulary; **distinct** from `user_role_enum` = `Partner, Manager, Team Member, Client` — do not conflate).
- Full set (frozen): `compliance_status_enum` (18 labels), `workflow_stage_enum`, `client_status_enum`, `client_type_enum`, `document_category_enum` (31), `audit_type_enum`, `gst_return_type_enum`, `gst_frequency_enum`, `tds_form_enum`, `roc_filing_type_enum`, `notice_authority_enum`, `month_enum` (Apr→Mar), `quarter_enum`, `priority_enum`, `reminder_channel_enum`, `dkyc_change_type_enum`, `dkyc_record_type_enum`.

**A.2 Views (3)** — `0009_views.sql`, all `WITH (security_invoker='on')`:
- **`v_firm_dashboard`** → `category, total, completed, overdue, pending, `**`due_in_7_days`**`, waiting_client, partner_approval_pending`. **The firm-dashboard column is `due_in_7_days`, NOT `due_soon`.**
- `v_client_compliance_summary` → includes `due_soon` (this is where `due_soon` legitimately lives).
- `v_overdue_ageing` → `client_id, category, due_date, days_overdue, ageing_bucket`.
- `due_date = COALESCE(individual_due_date, extended_due_date, standard_due_date)` (notice uses `response_due_date`).

**A.3 RPC / function signatures (34)** — 32 SECURITY DEFINER + 2 SECURITY INVOKER; **34/34 pin `search_path`** (source-level S3 pass). Frozen signatures incl. `get_app_role()→text`, `is_admin()/is_admin_or_manager()→boolean`, `generate_client_compliance(...)→void` (INVOKER), `get_sensitive_audit_logs(...)→jsonb` (DEFINER; enforces `auth.uid()` + `get_app_role()='admin'` internally), `audit_write_event(...)→uuid` (REVOKE ALL FROM PUBLIC/anon/authenticated/service_role), and the 22 client-master CRUD RPCs (0017; each update/set_active takes `p_expected_row_version integer` → optimistic-lock contract). Full arg lists in appendix.

**A.4 Two client-key models (OI-1) — critical for G-19:**
- `client_id text`, **NO FK**: `documents, tasks, follow_ups, completed_documents, client_directors, client_financials, financials_tracker, extracted_document_data, claude_usage_log`.
- `client_id uuid → clients(id)`: all 8 trackers (`0004`, unenforced — no FK constraint), 5 dependency trackers (`0007`), all M1-A/P5 tables (`0015`/`0021`, FK enforced).
- `clients` bridges both: `id uuid PK` + `client_id text UNIQUE`.

**A.5 Edge invocation shapes (§6)** — request/response contracts extracted from frontend call sites (source-verified; no Edge `.ts` exists — G-09):
- `ai-agent` ← `ChatAgent.jsx:51`: req `{messages:[{role,content}]}` → `{response, error?}`.
- `scan-document` ← `OnboardingWizard.jsx:380`: req `{imageBase64, mimeType}` → `{extracted{…}, fieldsFound, provider, error?}`.
- `extract-financial` ← `Compliance.jsx:653,721` (explicit `fetch` + bearer): req `{mode, financialId, fileBase64, mimeType, docType, clientId, fyLabel, documentId, …}` → `{fields?, engine?, confidence?, …, error?}`.

**A.6 Migration ledger (G-02)** — present `0001–0011,0014–0018,0021,0022`; **absent `0012` (secure-docs live-only), `0013` (reserved, unused), `0019` (cancelled), `0020` (numbering gap)**. **Apply-ordering (load-bearing): `0010` MUST apply after `0006`** — `0006` installs a wide-open `FOR ALL TO authenticated USING(true)`; `0010` drops those `*_authenticated_all` policies.

---

## B. LIVE-EVIDENCE-PENDING FACTS (NOT frozen; must not be treated as verified)

Closed only by the PJ-authorised **read-only A4 run on V2** (`T3_PJ_EVIDENCE_REQUEST.md`, currently on hold pending its own wording corrections + PJ authorisation):
- **B.1** Live tables/columns/constraints/indexes vs §A (G-03) — A4 §2–§4.
- **B.2** Live RLS enabled + FORCE + policies (G-04) — A4 §10/§10b; **confirm no `*_authenticated_all` survives (V-2)**.
- **B.3** Live EXECUTE grants / ACL incl. **PUBLIC (OID 0)** and `anon` (G-05, V-5) — A4 §10d/§7.
- **B.4** Live function `proconfig` `search_path` pinning (G-06) — A4 §7.
- **B.5** Storage `secure-docs` existence/private flag/policies/signed-URL expiry (G-08, S5) — A4 §13/§13c.
- **B.6** `v_team_workload` live existence (referenced by `Dashboard.jsx`/`Compliance.jsx`, **not authored** — G-11).
- **B.7** Live `supabase_migrations.schema_migrations` ledger (G-02 live half) — A4 Part 2 §9.
- **B.8** Edge deployment state of `ai-agent`/`extract-financial`/`scan-document` + `verify_jwt` (G-10) — A4 Part 2 §14; any (re)deploy is **[LIVE-PJ]**.

**No item in §B may be reported as "verified" until the A4 output is returned and reconciled.**

---

## C. SECURITY VARIANCES CARRIED FORWARD (V-1…V-5 + S5) — all pending, none remediated

| ID | Gate | Severity | Variance (source) | Disposition |
|---|---|---|---|---|
| **V-1** | S2 | Medium | 25 operational/dependency tables **ENABLE-only (no FORCE)** → table-**owner** bypass only (FORCE does **not** stop `service_role`/BYPASSRLS — that is a key-scoping control) | FORCE at a live S2 gate; **[LIVE-PJ]** |
| **V-2** | S2 | **Critical if present live** | `0006` open `authenticated`-all policy must be superseded by `0010`; if `0010` not applied, **all authenticated users have full read/write** | A4 §10b confirm no `*_authenticated_all` live |
| **V-3** | S2 | Low (current single-firm model) | No row-level tenant/client scoping (role-based only; deferred OQ-2) | Record; needed only for multi-tenant |
| **V-4** | S3 | Low→Medium (conditional) | 3 helpers (`get_portal_role`, `is_active_user`, `is_admin_or_manager`) pin **bare `'public'`** — safe only if untrusted roles cannot `CREATE` in `public` | Repin to `pg_catalog,public,pg_temp` + verify `public` CREATE privs; **[LIVE-PJ]** |
| **V-5** | S4 | High (latent) | Default privileges may leave **EXECUTE to anon/PUBLIC (OID 0)** on future functions; check must LEFT-JOIN + map OID 0 | A4 §10d/§7 corrected query; allowlist-reconcile |
| **S5-gap** | S5 | High | Storage buckets/policies **unversioned** (`0012` live-only) → source cannot prove isolation | A4 §13/§13c + runtime cross-client negative |

**Gate scorecard (source lens, live UNVERIFIED):** S1 PASS(source) · S2 PARTIAL · S3 PASS(source) · S4 PASS(source) · S5 INDETERMINATE. **No gate is satisfied live.** All variance remediations touching the live DB are **[LIVE-PJ]** and out of Sprint-1 scope.

---

## D. T2 CONSUMPTION RULES FOR G-19 (field reconciliation)

1. **Consume §A as the frozen contract** — reconcile `src/components/**` + `src/lib/**` field usage against §A enum sets, view columns, RPC signatures, the **two client-key models (A.4)**, and Edge shapes (A.5).
2. **Firm dashboard:** any consumer expecting `due_soon` on `v_firm_dashboard` is a **defect** — the frozen column is `due_in_7_days` (A.2). `due_soon` is valid only on `v_client_compliance_summary`.
3. **Client-key discipline:** when reconciling joins/filters, treat `client_id` as **text (no FK)** for the A.4 text-model tables and **uuid → clients(id)** for tracker/M1-A/P5 tables. Flag any code that assumes a single key type.
4. **Do NOT mark any §B item verified.** Field contracts that depend on live schema/RLS/storage/`v_team_workload` are reconciled **against source** and labelled **"pending live A4"** — not "verified".
5. **`v_team_workload`:** referenced in source but not authored (B.6) — if the app consumes it, record a **G-11 variance**, do not assume it exists.
6. **Ownership:** T2 writes only `src/**`, `docs/acceptance/evidence/**`, `tests/**`. Do **not** modify `contracts/**`, `supabase/**`, or `docs/recovery/**`. Contract changes route back through T1 (sequential).
7. **No live action:** G-19 is read-only reconciliation — no SQL, no deploy. Output is a field-contract reconciliation under `docs/acceptance/evidence/G-19_field_contract/`.

---

## Governance footer
```
Governing Issue: #23 · Governing merged PR: #29 · Governing HEAD: 1286a290f5d4287e70c6853d2eb3bad16256e276
G-16 status: SOURCE CONTRACT FROZEN; LIVE RECONCILIATION PENDING PJ V2 READ-ONLY EVIDENCE
Integrated from: PR #30 head 69f809394edd0a9b0484054e0300257b86269f73 (FINAL PASS) into sync/integration
Live evidence: PENDING (A4 read-only on V2, PJ-authorised) · Security variances V-1..V-5 + S5: PENDING
SQL/Database action: NOT AUTHORISED · Deployment/Alias change: NOT AUTHORISED · V1 access: NONE
Merge into ui/redesign-v1: NOT AUTHORISED · PR #31 (T2): NOT INTEGRATED
```
