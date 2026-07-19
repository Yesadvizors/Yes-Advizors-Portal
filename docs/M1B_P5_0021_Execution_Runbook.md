# M1-B P5 — Migration 0021 Execution Runbook (review-only)

**Status: REVIEW-ONLY. NOT AN AUTHORISATION TO EXECUTE.** PJ is the sole manual executor;
execution proceeds only after ChatGPT release approval. No SQL is executed by preparing this runbook.

**Governing baseline:** branch `ui/redesign-v1` · approved HEAD `05796268c7e0f5d5f597c9796fc32967ad9d237f`.
**Authorised database:** Supabase **V2/yav2-dev `ogjrwemjefvccpyjwxuo`** ONLY.
**Prohibited database:** V1/Production `zcszesuvjrryxtigjglt` (never connect).

**File integrity (SHA-256 — confirm before running):**
| File | SHA-256 |
|------|---------|
| `supabase/migrations/0021_service_applicability.sql` | `f312ae5e2ef57fb7f06ca6df5c06d0f17f7d2adc00a4e4e5fb249b152680f6af` |
| `supabase/verification/M1B_P5_0021_pre_execution_verification_readonly.sql` | `812c26c55a6ccacdf2f1b4f41ab723782281bdfd96882b419dcd599925ee4f76` |
| `supabase/verification/M1B_P5_0021_post_execution_verification_readonly.sql` | `70966b7590e6824e1719447ffe20b77ab8abc2e94802236883438ee48fc41578` |
| `supabase/verification/rollback_0021_service_applicability_manual.sql` | `d5871ce1f31cf0b6f47244ddcc811bf5154d1187f66f35ef30f4e832c75471f3` |

---

## 2. Manual execution procedure (PJ)

1. **Open only the V2/yav2-dev SQL Editor.** In the Supabase dashboard, select the project
   **yav2-dev** and open **SQL Editor**. Do **not** open, log into, or connect any tool to
   V1/Production `zcszesuvjrryxtigjglt`.
2. **Confirm project ref `ogjrwemjefvccpyjwxuo`.** Verify the project ref in the dashboard URL /
   project settings reads `ogjrwemjefvccpyjwxuo`. (The SQL editor cannot self-prove the ref; this is
   a visual, out-of-band confirmation. `PRE-0` prints only `current_database`/`current_user`/version.)
   **If the ref is anything other than `ogjrwemjefvccpyjwxuo`, STOP.**
3. **Confirm file integrity.** Ensure `supabase/migrations/0021_service_applicability.sql` matches the
   SHA-256 above (the reviewed source). Do not edit it.
4. **Run the pre-execution read-only checks.** Paste the **entire**
   `supabase/verification/M1B_P5_0021_pre_execution_verification_readonly.sql` and run it. It performs
   **no writes**.
5. **Required PASS conditions before proceeding** — ALL must hold:
   - `PRE-1.PASS_pre1` = true (9/9 base tables);
   - `PRE-2.PASS_pre2` = true (3 helper functions present);
   - `PRE-3.PASS_pre3_all_absent` = true (no 0021 tables/RPCs yet);
   - `PRE-4.PASS_pre4_absent` = true (0 of the 4 audit events);
   - `PRE-5.PASS_pre5_absent` = true (no `client_registrations_id_client_uq`);
   - `PRE-6.clients_id_is_uuid` = true;
   - `PRE-7.PASS_pre_execution_ready` = **true**.
   **Record the PRE-6 snapshot values** (clients / clients.services elems / client_registrations /
   audit_log / audit_event_contract / trackers / calendar) — they are compared against V8 afterwards.
   **If `PRE-7` is not true, STOP and report to ChatGPT. Do not run the migration.**
6. **Execute the migration ONCE.** Paste the **entire**
   `supabase/migrations/0021_service_applicability.sql` and run it a single time. It runs in one
   transaction (`BEGIN … COMMIT`); a failed pre/post assertion rolls the whole thing back.
7. **Capture output/notices.** Record:
   - success/failure of the statement;
   - the `NOTICE`: `P5 Migration 0021 postconditions passed (schema+reference-only; no client data; no compliance generation).`;
   - any `RAISE EXCEPTION` text (a `STOP:` or `POST:` message) verbatim;
   - the transaction result (COMMIT vs ROLLBACK).
8. **If ANY error occurs:** the transaction has already rolled itself back (single transaction, no
   partial state). **Do not re-run blindly** and **do not run the rollback file.** Capture the exact
   error text and **return it to ChatGPT** for a decision. (An additive-guard `STOP:` means objects
   already exist; a `POST:` means an invariant failed — both leave the DB unchanged.)
9. **Do not run the rollback automatically.** The rollback is a separate, manually-gated decision
   (see §4). It is never part of a normal successful execution.

---

## 3. Post-execution verification procedure + expected results

After a successful COMMIT, paste and run the **entire**
`supabase/verification/M1B_P5_0021_post_execution_verification_readonly.sql` (read-only). Expected:

| Block | Expected |
|-------|----------|
| **V1** objects + empty | `service_catalogue_present`=true; `client_service_applicability_present`=true; `service_catalogue_rows`=**11**; `client_service_applicability_rows`=**0**; `PASS_v1`=true |
| **V2** catalogue codes | `catalogue_count`=11; `approved_count`=11; `catalogue_not_in_approved`=0; `approved_not_in_catalogue`=0; `PASS_v2_exact_codes`=true (exact set: ACCOUNTING, GST, TDS, PAYROLL, INCOME_TAX, ROC, LLP, STATUTORY_AUDIT, TAX_AUDIT, SECRETARIAL, OTHER) |
| **V3** constraints/FK/indexes | **All four named business CHECKs true** — `csa_dates_chk`, `csa_effective_from_gate_chk`, **`csa_effective_to_null_when_approved_chk`**, `csa_approval_actor_chk`; plus `status_check_present`=true; `composite_same_client_fk_present`=true; `composite_fk_on_delete_restrict`=true; `client_registrations_id_client_uq_present`=true; `live_partial_unique_present`=true; `live_partial_unique_def` shows `… (client_id, service_code) WHERE status <> 'Inactive'`; **`PASS_v3_constraints`=true** |
| **V4** RLS + catalogue read-only | `csa_rls_enabled`=true; `csa_rls_forced`=true; `cat_rls_enabled`=true; `cat_rls_forced`=true; `csa_policy_cmds`=`["SELECT"]`; `cat_policy_cmds`=`["SELECT"]`; `cat_authenticated_select`=true; `cat_authenticated_insert/update/delete`=false; `PASS_v4_catalogue_readonly`=true |
| **V5** applicability privileges | `anon_select`=false; `authenticated_select`=true; `authenticated_insert/update/delete`=false; `PASS_v5_rpc_only_writes`=true |
| **V6** RPC security (all 3) | `per_rpc`: each of create/update/set_status → `exists`=true, `security_definer`=true, `exec_authenticated`=true, `exec_anon`=false, `exec_service_role`=false, `public_no_execute`=true; `PASS_v6_all_rpc_security`=**true** |
| **V7** audit events | **4** rows: `service_applicability.added` (CREATE), `.updated` (UPDATE), `.approved` (UPDATE), `.deactivated` (UPDATE); resource `client_service_applicability`; MEDIUM/S2 |
| **V8** protected post-exec counts | **manual comparison** with the PRE-6 snapshot — exact expected: `service_catalogue_rows` = **11**; `audit_event_contract_rows` = **PRE-6.audit_event_contract_rows + 4**; `audit_log_rows` = **PRE-6.audit_log_rows** (unchanged — the migration writes no audit_log rows); `clients_rows`, `clients_services_elems`, `client_registrations_rows`, `accounting_tracker`, `financials_tracker`, `income_tax_tracker`, `compliance_calendar` = **identical to PRE-6**; `client_service_applicability_rows` = **0**. (V8 makes no PASS claim by itself — it is manual comparison.) |

**Acceptance:** V1–V6 PASS booleans and PASS_v3_constraints are true; V7 shows exactly the 4 required events, and V8 matches PRE-6 except the
approved deltas (catalogue +11, contract +4; applicability 0). Return all outputs to ChatGPT.

---

## 4. Rollback decision note

- The rollback (`supabase/verification/rollback_0021_service_applicability_manual.sql`) is a
  **manual, operator-run** script kept **outside** `supabase/migrations/` — it is **never** a normal
  next step and never runs automatically.
- It **must not be used if any `client_service_applicability` rows exist** — it has a data-safe guard
  that aborts in that case; deleting live applicability data is out of scope and requires its own
  approval.
- Running it requires a **separate, explicit PJ + ChatGPT decision** (e.g. a defect found
  post-execution). It drops the 0021 objects + the 4 audit events + the composite-FK prerequisite; it
  does **not** touch `clients` / `clients.services` / `client_registrations` data.
- On a **failed** migration there is nothing to roll back (single transaction already rolled back) —
  do **not** run the rollback; report the error instead.

---

## 5. PJ execution checklist
See the one-page checklist: `docs/M1B_P5_0021_PJ_Execution_Checklist.md`.

---

**Boundaries:** preparing this runbook executed no SQL, made no Supabase/MCP connection, and made no
commit/push. Migration 0021 is **not** executed by this document. P5 UI implementation, P6, P2.2, D4
population, Clean-Start Reset, Production merge and deployment are **not** started.
