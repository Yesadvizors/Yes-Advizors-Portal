# YAV2 Phase 4C — yav2-dev Execution Runbook (RECONCILED; NOT EXECUTED)

**Status:** execution runbook prepared for PJ/operator. **Claude ran no migration, created no role, revoked no
grant, changed no live data.** Local file — **not yet committed at authoring time**.
**Governing:** `sync/integration` @ `f81082722102068300cb63f890bbb0ccfc862934`.
**Target (future execution only):** Yes Advizors (Pro) · project **yav2-dev** · ref **`ogjrwemjefvccpyjwxuo`**.
**PROHIBITED:** V1 / Production · ref **`zcszesuvjrryxtigjglt`** — if displayed at any point, **STOP**.

> **Reconciliation note (live gate 2026-08-01):** the live yav2-dev DB already contains the two load-bearing
> read events (`audit.log.read_requested`, `audit.log.read_completed`) as **HIGH/S4**, and the three audit
> tables carry **72 known prohibited direct grants**. This runbook governs the RECONCILED package
> (`0025`–`0031`): `0030` inserts only the 21 non-read events and asserts the 2 read events match the S4
> canonical; `0031` removes the 72 grants. Execute **one file at a time**; any failure/mismatch/unexpected count
> **HALTS** before the next file. Nothing runs until PJ issues a separate execution authorisation.

---

## Section 1 — Governing-state verification (before touching yav2-dev)

- [ ] Local `sync/integration` HEAD = `f81082722102068300cb63f890bbb0ccfc862934`; working tree clean.
- [ ] **Migrations present (SHA-256, first 16 hex):**
  - `0025_phase4c_audit_roles.sql` `c75cd4e69fa8864d`
  - `0026_phase4c_audit_indexes.sql` `097a22177061cae5`
  - `0027_phase4c_audit_validation_reconcile.sql` `4bb7d2713420b0f6`
  - `0028_phase4c_audit_access_reconcile.sql` `27418d4d57af89ce`
  - `0029_phase4c_canonical_writer_reconcile.sql` `d569801b8f11cc46`
  - `0030_phase4c_event_contract_seed.sql` `3476158e8c4701dd`
  - `0031_phase4c_audit_privilege_remediation.sql` `7630508a9af03030`
- [ ] **Paired rollbacks present:**
  - `0025…rollback.sql` `9c6652513366a9bd` · `0026…rollback.sql` `029dc814b4018ef3` ·
    `0027…rollback.sql` `02d6e3c9aec2626d` · `0028…rollback.sql` `101683c90cc4b34d` ·
    `0029…rollback.sql` `bea5313a1f2938a9` · `0030…rollback.sql` `97e816919f116027` ·
    `0031…rollback.sql` `0b56504bb07ad698`
- [ ] Verifier present: `supabase/verification/YAV2_PHASE4C_RECONCILED_POST_MIGRATION_SELECT_ONLY.sql`
  `9b3359af95c96cb0`
- [ ] No numbering conflict: `0025`–`0031` are the only phase4c migrations; no `0032`+; T4 owns `0023/0024` (separate).
- [ ] Supabase editor header shows **yav2-dev / `ogjrwemjefvccpyjwxuo`** — **NOT** `zcszesuvjrryxtigjglt`.

## Section 2 — Exact migration execution order
1. `0025_phase4c_audit_roles.sql`
2. `0026_phase4c_audit_indexes.sql`
3. `0027_phase4c_audit_validation_reconcile.sql`
4. `0028_phase4c_audit_access_reconcile.sql`
5. `0029_phase4c_canonical_writer_reconcile.sql`
6. `0030_phase4c_event_contract_seed.sql`
7. `0031_phase4c_audit_privilege_remediation.sql`

## Section 3 — Exact rollback order (reverse)
1. `0031_phase4c_audit_privilege_remediation_rollback.sql` — **⚠ SECURITY-RISK; PJ approval required; NEVER automatic**
2. `0030_phase4c_event_contract_seed_rollback.sql` — deletes only the 21 inserted events
3. `0029_phase4c_canonical_writer_reconcile_rollback.sql` (no-op)
4. `0028_phase4c_audit_access_reconcile_rollback.sql` (no-op)
5. `0027_phase4c_audit_validation_reconcile_rollback.sql` (no-op)
6. `0026_phase4c_audit_indexes_rollback.sql`
7. `0025_phase4c_audit_roles_rollback.sql` (roles dropped last)

> **Rolling back `0031` restores the insecure 72-grant posture** (anon/authenticated/service_role regain
> TRUNCATE/DELETE/… on the audit tables). It must **never** run automatically merely because a later step failed
> — it requires explicit separate PJ approval. The secure state is zero grants.

## Section 4 — Pre-execution checks (SELECT-only; run BEFORE step 1)

```sql
-- P-1 identity
SELECT current_user, session_user, current_role;                          -- expect: postgres, postgres, postgres
-- P-2 CREATEROLE still held
SELECT rolcreaterole, rolsuper FROM pg_roles WHERE rolname = current_user; -- expect: true, false
-- P-3 audit roles absent
SELECT count(*) AS audit_roles_present FROM pg_roles WHERE rolname IN ('audit_owner','audit_writer'); -- expect 0

-- P-4a the 21 NON-read Phase 4C events must be ABSENT
SELECT count(*) AS nonread_events_pre FROM public.audit_event_contract
WHERE event_name = ANY (ARRAY[
 'auth.session.login_success','auth.session.login_failed','auth.session.logout','auth.session.revoked',
 'auth.password_reset.requested','auth.password_reset.completed','auth.mfa.changed',
 'user.account.created','user.account.deactivated','user.account.reactivated','user.role.changed','user.permission.changed',
 'access.client.denied','access.cross_client.attempted','data.bulk_export','data.mass_download',
 'security.setting.changed','security.rls_policy.changed','audit.log.exported','audit.ingestion.failed','whatsapp.access.denied']); -- expect 0

-- P-4b the 2 READ events must ALREADY EXIST and EXACTLY match the approved HIGH/S4 canonical
--     (complete attribute comparison, NOT only risk_tier/sensitivity). expect read_events_exact_match = 2.
SELECT count(*) AS read_events_exact_match
FROM public.audit_event_contract e
JOIN (VALUES
  ('audit.log.read_requested','HIGH','S4',
     ARRAY['requested_page_number','requested_page_size','filter_applied','access_method_code','filter_date_start','filter_date_end'],
     ARRAY['filter_risk_tier'], false,'optional','prohibited',ARRAY['user'],ARRAY['VIEW'],ARRAY['audit_log']),
  ('audit.log.read_completed','HIGH','S4',
     ARRAY['read_request_audit_id','returned_row_count','total_match_count','page_empty','completion_status_code','requested_page_number','requested_page_size','access_method_code'],
     ARRAY[]::text[], false,'optional','prohibited',ARRAY['user'],ARRAY['VIEW'],ARRAY['audit_log'])
 ) AS c(event_name,risk_tier,sensitivity,required_keys,optional_keys,allow_empty_metadata,client_requirement,target_user_requirement,permitted_actor_types,permitted_actions,permitted_resource_types)
  ON  e.event_name = c.event_name
  AND e.risk_tier = c.risk_tier AND e.sensitivity = c.sensitivity
  AND e.required_keys = c.required_keys AND e.optional_keys = c.optional_keys
  AND e.allow_empty_metadata = c.allow_empty_metadata
  AND e.client_requirement = c.client_requirement AND e.target_user_requirement = c.target_user_requirement
  AND e.permitted_actor_types = c.permitted_actor_types AND e.permitted_actions = c.permitted_actions
  AND e.permitted_resource_types = c.permitted_resource_types;
-- HALT if nonread_events_pre <> 0 OR read_events_exact_match <> 2 (absence OR any attribute mismatch).

-- P-5 audit tables exist
SELECT to_regclass('public.audit_log') AS audit_log, to_regclass('public.audit_event_contract') AS audit_event_contract,
       to_regclass('public.audit_ingestion_failures') AS audit_ingestion_failures;               -- all non-null

-- P-6 base functions — EXACT signatures (all NON-NULL); incl. load-bearing helpers
SELECT
 to_regprocedure('public.audit_is_uuid(text)')                                                         AS is_uuid_text,
 to_regprocedure('public.audit_contains_secret(text)')                                                 AS contains_secret,
 to_regprocedure('public.audit_field_format_ok(text, jsonb)')                                          AS field_format_ok,
 to_regprocedure('public.audit_validate_event(text, text, text, text, uuid, uuid, jsonb)')             AS validate_event,
 to_regprocedure('public.get_app_role()')                                                              AS get_app_role,
 to_regprocedure('public.get_app_role_for_user(uuid)')                                                 AS get_app_role_for_user,
 to_regprocedure('public.get_sensitive_audit_logs(timestamp with time zone, timestamp with time zone, integer, integer, text, uuid)') AS get_sensitive,
 to_regprocedure('public.audit_write_event(text, text, text, text, uuid, jsonb)')                      AS audit_write_event_6arg,
 to_regprocedure('public._write_read_audit(text, uuid, jsonb)')                                        AS write_read_audit,       -- base helper (present)
 to_regprocedure('public._record_audit_failure(text, text, text[], text)')                             AS record_audit_failure;   -- base helper (present)
-- P-6b audit_is_uuid(text) properties
SELECT p.prorettype::regtype::text AS is_uuid_return, p.prosecdef AS is_uuid_secdef, p.provolatile AS is_uuid_volatile,
 (position('search_path=' in COALESCE(array_to_string(p.proconfig, ','), '')) > 0) AS is_uuid_search_path_pinned
FROM pg_proc p WHERE p.oid = to_regprocedure('public.audit_is_uuid(text)');                        -- boolean, true, i, true
-- P-6c canonical writer SECURITY DEFINER + NO competing alternative writer
SELECT
 (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = to_regprocedure('public.audit_write_event(text, text, text, text, uuid, jsonb)')) AS writer_secdef, -- true
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='log_audit_event_trusted_backend') AS competing_writer;  -- expect 0

-- P-7 audit tables ENABLE + FORCE RLS
SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
WHERE oid IN ('public.audit_log'::regclass,'public.audit_event_contract'::regclass,'public.audit_ingestion_failures'::regclass); -- all true/true

-- P-8 KNOWN PRE-STATE: prohibited direct grants (expected 72 on yav2-dev; this is a KNOWN EXPOSURE that 0031
--     MUST remove — NOT an acceptable posture and NOT a reason to stop before 0031). Capture count + detail.
SELECT count(*) AS prohibited_grants_pre FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
LEFT JOIN pg_roles r ON r.oid=a.grantee
WHERE c.relname IN ('audit_log','audit_event_contract','audit_ingestion_failures')
  AND (a.grantee=0 OR r.rolname IN ('anon','authenticated','service_role'));   -- expected 72 (HALT if it differs unexpectedly from the reviewed matrix)
SELECT n.nspname, c.relname, CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname END AS grantee, a.privilege_type
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
LEFT JOIN pg_roles r ON r.oid=a.grantee
WHERE c.relname IN ('audit_log','audit_event_contract','audit_ingestion_failures')
  AND (a.grantee=0 OR r.rolname IN ('anon','authenticated','service_role'))
ORDER BY c.relname, grantee, a.privilege_type;   -- detail; expected: anon/authenticated/service_role × 8 privs × 3 tables

-- P-9 PUBLIC has no EXECUTE on the canonical writer
SELECT count(*) AS public_exec FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f',p.proowner))) a
WHERE n.nspname='public' AND p.proname='audit_write_event' AND a.privilege_type='EXECUTE' AND a.grantee=0; -- expect 0
```
- [ ] **Project ref confirmed = `ogjrwemjefvccpyjwxuo`** (re-read the header).

## Section 5 — Execution method (per migration)

**Rules:** run **one file at a time**, in Section 2 order; each migration is wrapped `BEGIN … COMMIT` and
self-checks its post-conditions; **capture raw output**; **a failure on any file = immediate STOP before the
next file**. Run the matching **PC-n** (§5b) after each.

| Step | File | Purpose | Expected changes | Success | Post-condition | Stop if | Evidence |
|---|---|---|---|---|---|---|---|
| 1 | `0025_phase4c_audit_roles.sql` | create `audit_owner`/`audit_writer` (NOLOGIN) | 2 roles | `DO`+`COMMIT` | roles NOLOGIN/non-super | role pre-exists w/ login/super | **PC-1** |
| 2 | `0026_phase4c_audit_indexes.sql` | 8 perf indexes | 8 indexes | `CREATE INDEX`×8 | 8 present | count≠8 | **PC-2** |
| 3 | `0027_phase4c_audit_validation_reconcile.sql` | assert validation chain incl. `audit_is_uuid(text)` | none | `DO`+`COMMIT` | assertion passed | `ASSERTION FAILED` | **PC-3** |
| 4 | `0028_phase4c_audit_access_reconcile.sql` | assert access fns retained | none | `DO`+`COMMIT` | assertion passed | `ASSERTION FAILED` | **PC-4** |
| 5 | `0029_phase4c_canonical_writer_reconcile.sql` | writer secdef; no competing writer; **base helpers present** | none | `DO`+`COMMIT` | assertion passed | `ASSERTION FAILED` | **PC-5** |
| 6 | `0030_phase4c_event_contract_seed.sql` | insert 21; assert 2 read events S4-canonical | +21 rows | `INSERT 0 21`+`COMMIT` | 23 present; read events S4 | precondition trips (21 present / read mismatch) | **PC-6** |
| 7 | `0031_phase4c_audit_privilege_remediation.sql` | revoke 72 prohibited grants | 72→0 grants | `REVOKE`×3+`COMMIT` | 0 prohibited grants | POST-CHECK ≠0 | **PC-7** |

**One-at-a-time: YES.** **Failure → immediate STOP before any later migration: YES.**

## Section 5b — Per-migration post-condition evidence queries (SELECT-only)

```sql
-- PC-1 (after 0025): roles present with exact posture
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin
FROM pg_roles WHERE rolname IN ('audit_owner','audit_writer') ORDER BY rolname;   -- BOTH: all false

-- PC-2 (after 0026): the 8 indexes exist
SELECT indexname FROM pg_indexes WHERE schemaname='public'
 AND indexname IN ('idx_audit_log_actor','idx_audit_log_target','idx_audit_log_service',
   'idx_audit_log_client_uuid','idx_audit_log_event_name','idx_audit_log_occurred',
   'idx_audit_log_risk_time','idx_audit_fail_time') ORDER BY indexname;           -- exactly 8

-- PC-3 (after 0027): validation chain + audit_is_uuid properties
SELECT
 to_regprocedure('public.audit_is_uuid(text)') AS is_uuid_text,
 to_regprocedure('public.audit_contains_secret(text)') AS contains_secret,
 to_regprocedure('public.audit_field_format_ok(text, jsonb)') AS field_format_ok,
 to_regprocedure('public.audit_validate_event(text, text, text, text, uuid, uuid, jsonb)') AS validate_event,
 (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=to_regprocedure('public.audit_is_uuid(text)')) AS is_uuid_secdef; -- all non-null / true

-- PC-4 (after 0028): access functions retained (exact signatures)
SELECT
 to_regprocedure('public.get_app_role()') AS get_app_role,
 to_regprocedure('public.get_app_role_for_user(uuid)') AS get_app_role_for_user,
 to_regprocedure('public.get_sensitive_audit_logs(timestamp with time zone, timestamp with time zone, integer, integer, text, uuid)') AS get_sensitive; -- all non-null

-- PC-5 (after 0029): canonical writer secdef; competing alt writer ABSENT; base helpers PRESENT
SELECT
 (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=to_regprocedure('public.audit_write_event(text, text, text, text, uuid, jsonb)')) AS writer_secdef,          -- true
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='log_audit_event_trusted_backend') AS competing_writer,                                                            -- 0
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('_write_read_audit','_record_audit_failure')) AS base_helpers_present;                                          -- 2

-- PC-6 (after 0030): exactly 23 events; the 2 read events remain S4; FORCE RLS intact
SELECT
 (SELECT count(*) FROM public.audit_event_contract WHERE event_name = ANY (ARRAY[
   'auth.session.login_success','auth.session.login_failed','auth.session.logout','auth.session.revoked',
   'auth.password_reset.requested','auth.password_reset.completed','auth.mfa.changed',
   'user.account.created','user.account.deactivated','user.account.reactivated','user.role.changed','user.permission.changed',
   'access.client.denied','access.cross_client.attempted','data.bulk_export','data.mass_download',
   'security.setting.changed','security.rls_policy.changed','audit.log.read_requested','audit.log.read_completed',
   'audit.log.exported','audit.ingestion.failed','whatsapp.access.denied'])) AS phase4c_events_exact,   -- 23
 (SELECT count(*) FROM public.audit_event_contract WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed')
    AND risk_tier='HIGH' AND sensitivity='S4') AS read_events_s4,                                        -- 2
 (SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class
    WHERE oid IN ('public.audit_log'::regclass,'public.audit_event_contract'::regclass,'public.audit_ingestion_failures'::regclass)) AS all_force_rls; -- true

-- PC-7 (after 0031): ZERO prohibited grants; 3 tables present; FORCE RLS; no replacement grants
SELECT
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
    LEFT JOIN pg_roles r ON r.oid=a.grantee
    WHERE c.relname IN ('audit_log','audit_event_contract','audit_ingestion_failures')
      AND (a.grantee=0 OR r.rolname IN ('anon','authenticated','service_role'))) AS prohibited_grants,   -- 0
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
    WHERE c.relname IN ('audit_log','audit_event_contract','audit_ingestion_failures')) AS audit_tables_present, -- 3
 (SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class
    WHERE oid IN ('public.audit_log'::regclass,'public.audit_event_contract'::regclass,'public.audit_ingestion_failures'::regclass)) AS all_force_rls; -- true
```

## Section 6 — Mandatory stop conditions (any one → HALT, capture evidence, escalate)
- Project ref ≠ `ogjrwemjefvccpyjwxuo`, or V1/Production (`zcszesuvjrryxtigjglt`) displayed.
- `audit_owner`/`audit_writer` already exists unexpectedly.
- Any of the 21 non-read events already present, OR either read event absent/mismatched vs the S4 canonical (P-4).
- A base function signature differs from P-6 (incl. the load-bearing helpers).
- `log_audit_event_trusted_backend` present (competing writer).
- Any audit table missing; RLS or FORCE RLS not present.
- **P-8 prohibited-grant count differs unexpectedly from the reviewed 72** (investigate before proceeding).
- After `0031`: prohibited grants ≠ 0, or a replacement grant was introduced.
- Any migration errors; any unexpected warning/row count; rollback safety cannot be proven.

## Section 7 — Post-execution verification (verifier V1–V7)
Run `supabase/verification/YAV2_PHASE4C_RECONCILED_POST_MIGRATION_SELECT_ONLY.sql`. Expected:
- **V1 (roles):** `audit_owner`,`audit_writer` — `rolcanlogin=f`, `rolsuper=f`.
- **V2 (indexes):** all **8** index names.
- **V3 (chain):** all validation/access flags **t**; `writer_is_secdef=t`.
- **V4:** `competing_writer_count = 0` **and** `base_helpers_present = 2`.
- **V5:** `phase4c_events_exact = 23`, `read_events_s4 = 2`, `duplicate_event_names = 0`.
- **V6 (posture):** each audit table `rls_enabled=t, rls_forced=t`.
- **V7:** `prohibited_grants = 0`.

## Section 8 — Runtime test plan (SEPARATELY governed; DO NOT run here)
Accepted event; rejected unknown event; secret/redaction rejection; authorised audit reader; unauthorised
reader; service_role direct-access denial; audit-failure recording; existing dependent workflows (0016 writer,
0017 CRUD RPCs, and the base read path via `_write_read_audit`) remaining functional. Out of scope here.

## Section 9 — Evidence-capture template (per migration + verifier + rollback)
```
Date / IST time      :
Operator             :
Organisation / Project: Yes Advizors (Pro) / yav2-dev
Project ref          : ogjrwemjefvccpyjwxuo        (CONFIRM — not zcszesuvjrryxtigjglt)
Governing Git SHA    : f81082722102068300cb63f890bbb0ccfc862934
Migration file       : <file>   (SHA-256: <verify vs Section 1>)
Start / completion   :
Raw SQL output       : <paste verbatim>
PC-n result          : <paste verbatim>
Result               : PASS / FAIL
Deviations           : <none / describe>
Stop / rollback decision :
PJ authorisation ref :
```

## Section 10 — Recovery / rollback plan
- **When permitted:** on any Section 6 stop after a change applied, or on PJ instruction. No-op rollbacks
  (0027/0028/0029) always safe.
- **Exact reverse order:** Section 3 (`0031` → `0025`).
- **`0031` rollback is SECURITY-RISK** (restores the 72-grant exposure) — PJ approval only, never automatic.
- **`0025` role drop (last)** fails if the roles own objects — run earlier rollbacks first; if a role still owns
  objects, STOP and reconcile (do not force).
- **The 2 read events + their `audit_log` history are NEVER deleted** by the `0030` rollback (it deletes only
  the 21 it inserted).
- **Evidence required before rollback:** failing migration raw output + affected-object pre/post state + PJ
  rollback authorisation.
- **Prohibitions:** no forced deletion, no `SET ROLE`, no privilege escalation, no unsupported workaround.

## Section 10a — Post-rollback verification batch (SELECT-only)
Run after a complete reverse-order rollback. Capture as rollback evidence before closure.
```sql
-- R-1 audit roles absent
SELECT count(*) AS audit_roles_remaining FROM pg_roles WHERE rolname IN ('audit_owner','audit_writer');  -- 0
-- R-2 the 21 inserted events absent (the 2 read events REMAIN — preserved)
SELECT count(*) AS inserted21_remaining FROM public.audit_event_contract WHERE event_name = ANY (ARRAY[
 'auth.session.login_success','auth.session.login_failed','auth.session.logout','auth.session.revoked',
 'auth.password_reset.requested','auth.password_reset.completed','auth.mfa.changed',
 'user.account.created','user.account.deactivated','user.account.reactivated','user.role.changed','user.permission.changed',
 'access.client.denied','access.cross_client.attempted','data.bulk_export','data.mass_download',
 'security.setting.changed','security.rls_policy.changed','audit.log.exported','audit.ingestion.failed','whatsapp.access.denied']); -- 0
SELECT count(*) AS read_events_preserved FROM public.audit_event_contract
WHERE event_name IN ('audit.log.read_requested','audit.log.read_completed');   -- 2 (preserved)
-- R-3 the 8 indexes absent
SELECT count(*) AS phase4c_indexes_remaining FROM pg_indexes WHERE schemaname='public'
 AND indexname IN ('idx_audit_log_actor','idx_audit_log_target','idx_audit_log_service',
   'idx_audit_log_client_uuid','idx_audit_log_event_name','idx_audit_log_occurred',
   'idx_audit_log_risk_time','idx_audit_fail_time');                            -- 0
-- R-4 the three base audit tables remain PRESENT
SELECT to_regclass('public.audit_log') AS audit_log, to_regclass('public.audit_event_contract') AS audit_event_contract,
       to_regclass('public.audit_ingestion_failures') AS audit_ingestion_failures;  -- non-null
-- R-5 the three audit tables still ENABLE + FORCE RLS
SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
WHERE oid IN ('public.audit_log'::regclass,'public.audit_event_contract'::regclass,'public.audit_ingestion_failures'::regclass); -- all true/true
-- R-6 retained base functions still exact
SELECT
 to_regprocedure('public.audit_is_uuid(text)') AS is_uuid_text,
 to_regprocedure('public.audit_write_event(text, text, text, text, uuid, jsonb)') AS audit_write_event_6arg,
 to_regprocedure('public._write_read_audit(text, uuid, jsonb)') AS write_read_audit,
 to_regprocedure('public._record_audit_failure(text, text, text[], text)') AS record_audit_failure,
 to_regprocedure('public.get_sensitive_audit_logs(timestamp with time zone, timestamp with time zone, integer, integer, text, uuid)') AS get_sensitive; -- non-null
-- R-7 grant posture AFTER a FULL rollback:
--   * If 0031 was NOT rolled back  -> prohibited_grants = 0 (secure; recommended).
--   * If 0031 WAS rolled back (PJ) -> prohibited_grants = 72 (INSECURE pre-state restored).
SELECT count(*) AS prohibited_grants FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
LEFT JOIN pg_roles r ON r.oid=a.grantee
WHERE c.relname IN ('audit_log','audit_event_contract','audit_ingestion_failures')
  AND (a.grantee=0 OR r.rolname IN ('anon','authenticated','service_role'));
```

## Section 11 — Execution decision package
- **Recommendation: GO (yav2-dev only), conditional on a separate PJ execution authorisation** and on the §4
  pre-checks matching the reviewed state (21 non-read absent; 2 read events S4-canonical; 72 known grants). The
  reconciled package is additive/guarded, fail-closed on the data-writing step (0030), removes the 72-grant
  exposure (0031), and was proven on a disposable local PostgreSQL 17 (apply + V1–V7 verify + negatives +
  reverse rollback all pass).
- **Exact risks:** (1) `0031` rollback restores the insecure 72-grant posture (guarded, PJ-only); (2) live
  signature/attribute drift trips 0027/0028/0029/0030 (fail-closed — safe); (3) `0025` role-drop rollback
  ordering; (4) fixture ≠ full live schema — the §4 live pre-checks are the final gate.
- **Default-privilege residual (Section 9 wording):** `0031` fixes only the **three existing** audit tables.
  The `postgres` and `supabase_admin` DEFAULT PRIVILEGES that would expose FUTURE tables are a **separate Stage
  A** issue and are **NOT** changed by this package. The merged migration privilege-hygiene guard prevents new
  public tables from re-exposing anon at PR time.
- **Exact SQL files & verifier:** Section 2 migrations + Section 3 rollbacks + the verifier — hashes in §1.
- **Estimated manual SQL runs ≈ 16 (all mandatory):** 1 pre-execution batch (§4) + 7 migration runs +
  **7 mandatory PC-1…PC-7 post-condition runs** + 1 final verifier run. **Rollback:** 1–7 additional
  rollback-file runs; a complete reverse rollback = 7 rollback runs + one post-rollback batch (§10a).
- **Rollback readiness:** all seven paired rollbacks present and hashed; reverse order defined; `0030` rollback
  provably preserves the 2 read events + history; `0031` rollback is SECURITY-RISK/PJ-only.
- **Confirmation:** no SQL executed in Supabase; no role created; no grant changed; no event row updated/deleted;
  no deployment; no V1/Production access.
