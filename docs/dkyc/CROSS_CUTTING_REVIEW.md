# Director KYC — Phase 2 Review Packages v2: Cross-Cutting Review

Review only. Nothing applied/deployed/branched/merged. PR #9 open & unmerged. All SQL parse-checked
with pglast; all frontend transform-checked with esbuild; field/RPC usage reconciled; manifest verified
by extract + `sha256sum -c`. Live facts confirmed by read-only inspection this session.

## Blocker resolutions (v1 -> v2)
1. **Package/manifest structure** — ZIP now uses real directories A_database/ B_rpcs/ C_writers/
   D_frontend/ E_edge_function/ review/. review/MANIFEST.sha256 generated after assembly; verified by
   extracting to a clean dir and running `sha256sum -c` (see VERIFICATION below).
2. **SECURITY DEFINER** — external readers (dkyc_list_activitywise, dkyc_list_clientwise,
   dkyc_din_documents) and all writers are now SECURITY DEFINER, owner postgres, search_path pinned,
   PUBLIC/anon revoked, authenticated granted. Private helpers keep EXECUTE revoked from anon+authenticated.
   Validation scripts assert prosecdef, owner, and has_function_privilege for anon/authenticated.
3. **Dependency preflights** — B and C each have 01_PREFLIGHT.sql verifying exact enum labels,
   columns, and helper/function signatures; the migrations carry hard DO-block abort gates.
4. **Access model** — readers fail closed with stable NO_ACTOR_IDENTITY when identity is unresolved,
   and use the EXISTING dkyc_can_access_record / dkyc_staff_can_see_holder helpers: Admin/Manager see
   all; assigned staff see their assigned records; others get an explicit error, not a silent empty set.
5. **Record-type branches** — dkyc_record_status now branches: PERIODIC_KYC (transition/new-DIN routine),
   EVENT_UPDATE (trigger_date + 30-day deadline), REACTIVATION (evidence; cycle effect -> MANUAL_REVIEW),
   HISTORICAL (evidence status, no future periodic due). Exact live enum labels used.
6. **Transition evidence** — prior-regime completion now requires verified filing + registry_filing_date
   + SRN on a HISTORICAL/PERIODIC record (dkyc_has_prior_regime_evidence). Without it, no automatic
   30-June-2028; falls to new-DIN path or MANUAL_REVIEW.
7. **Document read path** — dkyc_din_documents(uuid) added in Package B: SECURITY DEFINER, access-checked
   (Admin/Manager OR dkyc_staff_can_see_holder), whitelisted columns. Frontend reconciled to call it.
8. **DIN-level document ownership** — the authoritative link is the `director_kyc_documents` BRIDGE
   table (document_id, din_holder_id, director_kyc_record_id). NO sentinel client ID is written:
   `documents.client_id` holds the real company code when the record is company-scoped, otherwise NULL.
   The DIN-level read RPC reads the bridge, so one canonical set surfaces across all linked companies.
   (Historical note: an earlier draft used a 'DKYC-DIN-LEVEL' fake client_id; that approach was REMOVED.)
9. **Edge Function identity/finalise** — finalize is service_role-EXECUTE-only (revoked from authenticated/
   anon); the trusted verifier passes the originating Admin/Manager actor, which the RPC re-validates and
   binds to intent.created_by; it re-derives size/MIME bounds from the intent (never trusts client values),
   binds intent+bucket+path+size+mime+actor, single-use + idempotent. Service role does not auto-map to a
   member (see E_edge_function/SECURITY_SPEC.md v2 addendum).
10. **Deletion protection** — trg_dkyc_block_doc_delete is ATTACHED, scoped via WHEN to DIRECTOR_KYC rows
    with a linked record; non-KYC document deletes are untouched. Validation asserts the trigger exists.
11. **Rollback packages** — B and C each ship 04_ROLLBACK_PREDATA.sql (exact DROP by signature, guarded)
    and 04_ROLLBACK_POSTDATA.md (disable-by-REVOKE, preserve data, never drop reused functions). All B/C
    functions are NEW (no prior definition to restore); reused functions are explicitly not dropped.
12. **Frontend reconciliation** — esbuild transform-check passes for all D files; an automated check
    confirms every row-field used maps to a reader output (NONE unknown) and every RPC called exists in
    B/C (NONE missing). Compliance.patch.md gives the exact wiring patch.

## File inventory (directory structure)
```
A_database/   01_PREFLIGHT.sql 02_MIGRATION.sql 03_VALIDATION.sql 04_ROLLBACK_PREDATA.sql 04_ROLLBACK_POSTDATA.md
B_rpcs/       01_PREFLIGHT.sql 02_MIGRATION.sql 03_VALIDATION.sql 04_ROLLBACK_PREDATA.sql 04_ROLLBACK_POSTDATA.md INITIAL_OBLIGATION_PROCESS.md
C_writers/    01_PREFLIGHT.sql 02_MIGRATION.sql 03_VALIDATION.sql 04_ROLLBACK_PREDATA.sql 04_ROLLBACK_POSTDATA.md
D_frontend/   DirectorKYCStatusBadge.jsx dkycStatusMeta.js DirectorKYCActivity.jsx DirectorKYCClientPanel.jsx DirectorKYCDetailModal.jsx Compliance.patch.md
E_edge_function/ SECURITY_SPEC.md
review/       CROSS_CUTTING_REVIEW.md MANIFEST.sha256
```

## Dependency order
A -> B -> C -> D, with E last (needs C.finalize). B requires A's columns; C requires A's tables +
B's dkyc_compute_due/has_prior_regime_evidence; D requires B readers + C writers; E requires C.finalize.

## Per-role / per-client access test matrix
| Caller | activitywise | clientwise(company X) | din_documents | writers |
|---|---|---|---|---|
| anon | EXECUTE denied (not granted) | denied | denied | denied |
| authenticated, no ct_team_members row | NO_ACTOR_IDENTITY error | NO_ACTOR_IDENTITY | FORBIDDEN_ROLE | NO_ACTOR_IDENTITY |
| Admin (team.is_admin / portal_role) | all records | all directors of X | any holder | allowed |
| Manager (portal_role='Manager') | all records | all directors of X | any holder | allowed |
| Staff assigned to record R | sees R only | sees only assigned records under X | holder of R only (dkyc_staff_can_see_holder) | filing/verify gated to Admin/Manager -> FORBIDDEN_ROLE |
| Staff NOT assigned | empty set of records they can't access (rows filtered by dkyc_can_access_record), identity resolved so NO error | same | FORBIDDEN_ROLE for holders they can't see | FORBIDDEN_ROLE |
Note: identity-resolvable-but-unauthorised staff get correct row-level filtering (not a blanket error);
only UNRESOLVED identity yields the explicit NO_ACTOR_IDENTITY error. Writers remain Admin/Manager-only.

## Classification (Point 1, corrected to date-driven three-path) + status test vectors
Three-path classification in dkyc_compute_due (verified evidence takes precedence over the date test):
  PRIOR_REGIME_VERIFIED -> NEW_DIN (allot >= 2025-04-01) -> LEGACY_HISTORY_UNRESOLVED (allot <= 2025-03-31).
Cutoff = dkyc_new_din_cutoff() = 2025-04-01 (single source). All vectors below validated in a logic port:
- PRIOR_REGIME_VERIFIED (evidence present): -> 2028-06-30, cycle 2028, interpretation false.
- PRIOR_REGIME_VERIFIED beats a legacy date: allot 2020-01-01 + verified -> 2028-06-30 (not legacy).
- NEW_DIN 31-Mar-2026 (allot in FY2025-26) -> 2029-06-30 (cycle 2029, interpretation true, REVIEW_RECOMMENDED).
- NEW_DIN first 31-Mar-2027 (allot 1-Apr-2026) -> 2030-06-30 (cycle 2030).
- NEW_DIN boundary allot 2025-04-01 -> 2029-06-30 (genuine new DIN; no prior KYC evidence required).
- LEGACY boundary allot 2025-03-31 -> MANUAL_REVIEW (MANUAL_REVIEW_LEGACY_HISTORY_UNRESOLVED), no calc.
- LEGACY live data allot 2021-04-01 and 2020-01-01 -> MANUAL_REVIEW (not mis-calculated as new DINs).
- No anchor (allotment NULL, live DIN 11521014) -> MANUAL_REVIEW_NO_ANCHOR_DATA.
- A genuine new DIN is NOT pushed to MANUAL_REVIEW merely for lacking prior-KYC evidence.
- EVENT_UPDATE: due = trigger_date + 30; overdue/ DUE_SOON bands; rejected -> RED; verified -> GREEN.
- REACTIVATION: completed+verified -> GREEN; else MANUAL_REVIEW_REACTIVATION_CYCLE_EFFECT.
- HISTORICAL: verified -> FILED_VERIFIED; else MANUAL_REVIEW (no future due).
- Internal-control advisory never recolours: filed+verified PERIODIC with missing address proof ->
  FILED_VERIFIED + DOCUMENT_REVIEW_REQUIRED chip.
- Private helpers reject direct authenticated EXECUTE (validation asserts has_function_privilege=false).
- Documents: prepare->upload->finalize; expired/cancelled/foreign-owner intent rejected; duplicate
  finalize idempotent; delete of DIRECTOR_KYC doc blocked by trigger.

## Remaining assumptions (explicit)
1. New-DIN first-cycle count remains interpretation (flagged; OVERDUE_INTERPRETED; admin-overrideable).
2. Classification is date-driven (cutoff 2025-04-01) with verified prior-regime evidence taking precedence.
   Legacy DINs (allot <= 2025-03-31) without verified evidence are MANUAL_REVIEW, never auto-calculated.
   If MCA publishes an official illustration moving the boundary, change only dkyc_new_din_cutoff().
3. No DIN-status field exists; reactivation derived from REACTIVATION records only.
4. Document linkage uses the `director_kyc_documents` bridge table as the authoritative DIN/KYC link.
   No sentinel client ID is written; documents.client_id is the real company code when company-scoped,
   else NULL. (The earlier 'DKYC-DIN-LEVEL' sentinel was removed; this point is now resolved, not open.)
5. Routine fee = NIL, change "does not reset cycle", 1-April window remain interpretation/operational.
6. Edge Function identity architecture: one design is approved and locked (no alternatives remain).
   The browser forwards the authenticated user JWT; the Edge Function resolves the active Admin/Manager
   actor using the user-context (auth) client; a separate service-role client performs storage verification
   and calls the finalise RPC. Deployment itself is NOT yet approved — Package E is review-only.

## Recommended implementation/approval sequence
Approve A -> apply (01,02,03); B -> apply + spot-check resolvers with explicit p_as_of_date; C -> apply +
exercise writers on one seeded record; D -> upload files + Compliance.jsx wiring via GitHub web; E ->
approve + deploy dkyc-verify-upload, then enable document UI. After PR #9 reusable fragments are preserved
on feat/dkyc-statutory, close PR #9 unmerged. Each step independently approvable and reversible.


## v3–v5 engineering-blocker and correction resolutions
1. **Finalise locked to verifier path** — `dkyc_finalize_document_upload` EXECUTE revoked from
   authenticated+anon, granted to `service_role` only. A direct browser call gets permission-denied;
   the frontend never calls it (reconciliation confirms). Validation asserts the grant matrix.
2. **One Edge Function identity architecture** — E_edge_function/SECURITY_SPEC.md specifies a single
   shape: browser forwards the user JWT; the function resolves auth.uid()->active Admin/Manager team.id
   (verifier actor) via an auth client, and uses a separate service client only for storage + the
   finalise RPC. The finalise RPC re-validates the actor is Admin/Manager AND equals intent.created_by.
   No alternative shapes retained.
3. **Explicit client-level authorisation** — `dkyc_list_clientwise` now calls
   `staff_can_access_client(p_client_id)` (Admin all; Manager/Executive/Staff only via
   team_client_access) and raises CLIENT_FORBIDDEN otherwise. Record assignment alone no longer grants
   visibility under every linked company. (Row-level dkyc_can_access_record remains as defence-in-depth.)
4. **Canonical document link** — new append-only `director_kyc_documents` bridge (Package A) ties a
   document to (din_holder_id, director_kyc_record_id); the DIN-level read RPC reads the bridge. The
   'DKYC-DIN-LEVEL' fake client_id is removed; documents.client_id holds the real company code or NULL.
5. **Package D complete** — DirectorKYCDetailModal.jsx has the full filing form, interpretation
   acceptance, and document prepare->upload->verify/finalise flow with permissions (canWrite),
   loading/error/retry states and stable error-code mapping; rows open the modal. Compliance.patch.md
   gives the exact diff (replaces the prior narrative). esbuild build-check passes; field/RPC reconcile.
6. **Initial-obligation workflow RPC** — `dkyc_create_initial_obligation(p_din_holder_id)` creates ONE
   DIN-level PERIODIC_KYC obligation, classifies via the engine (MANUAL_REVIEW/LEGACY create nothing),
   is duplicate-safe (advisory xact lock + existence check + partial unique index
   `uq_dkyc_periodic_holder_cycle`), and never reads last_kyc_month/kyc_change_done.
7. **Tests** — review/TEST_SPECIFICATION.md covers all seven required properties with runnable checks;
   review/LOGIC_TEST_RESULTS.txt shows the executed logic port (classification, duplicate prevention,
   company isolation) all PASS.

## Updated file inventory (v3–v5 additions)
A_database/   + director_kyc_documents bridge; + uq_dkyc_periodic_holder_cycle index
B_rpcs/       dkyc_list_clientwise client-authz; dkyc_din_documents reads bridge
C_writers/    finalise service_role-only + verifier-actor + bridge write; + dkyc_create_initial_obligation
D_frontend/   complete detail modal; Compliance.patch.md (replaces integration.md)
E_edge_function/ single locked architecture
review/       + TEST_SPECIFICATION.md, + LOGIC_TEST_RESULTS.txt

## v4 corrections (this round — scope-limited)
1. Consistency: every 'DKYC-DIN-LEVEL' mention is now explicitly historical/removed; the document
   states uniformly that no sentinel client ID is written, documents.client_id is the real company code
   or NULL, and director_kyc_documents is the authoritative DIN/KYC bridge.
2. Evidence level: review/LOGIC_TEST_RESULTS.txt now carries a tier table distinguishing
   (A) static/parse, (B) logic-port, (C) PostgreSQL execution [NOT done], (D) hosted read-only preflight
   [done], (E) hosted mutation testing [NOT done/approved]. No claim of SQL execution is made.
3. EVENT_UPDATE / change_type=OTHER: the resolver no longer grants OTHER a statutory trigger+30 deadline.
   The 30-day deadline (Rule 12A(2)) applies only to MOBILE/EMAIL/RESIDENTIAL_ADDRESS/MULTIPLE; OTHER and
   a NULL change_type FAIL CLOSED to MANUAL_REVIEW (reason MANUAL_REVIEW_EVENT_OTHER_NOT_CLASSIFIED /
   MANUAL_REVIEW_EVENT_TYPE_UNSPECIFIED). No unrelated design was changed.

## v5 corrections (this round — documentation only, no executable changes)
1. Assumption 6 rewritten: the forward-JWT-vs-signed-assertion choice is removed. The one locked
   architecture is stated (browser forwards user JWT → Edge Function resolves actor via auth client →
   service-role client for storage + finalise RPC; deployment not approved).
2. Compliance.patch.md reference corrected in point 12, the file inventory, and this note
   (all three previously referenced the removed integration file).
3. Section headings updated from "v3" to "v3–v5"; test spec title updated to v5.
No SQL, no schema change, no permission change, no executable file touched.
