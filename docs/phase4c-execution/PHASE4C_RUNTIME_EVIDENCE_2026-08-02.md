# YAV2 Phase 4C — Team Mapping, Identity Discovery & Runtime Verification Evidence

**Status:** EXECUTED (yav2-dev only). Consolidated runtime evidence for the authorised Phase 4C
team-mapping + T1–T10 + V1–V7 package.

| Field | Value |
|---|---|
| Date (IST) | 2026-08-02 |
| Operator | Claude Code (technical execution) under PJ authorisation; ChatGPT independent review |
| Governing branch | `sync/integration` |
| Governing SHA | `2ca7a6576a3452b91ddb00bad01bf85a58242897` (origin/sync/integration; PR #46 merged) |
| Supabase project | Yes Advizors (Pro) · **yav2-dev** · ref **`ogjrwemjefvccpyjwxuo`** (ACTIVE_HEALTHY, ap-south-1, PG 17.6) |
| Prohibited (not accessed) | V1 · Production · `zcszesuvjrryxtigjglt` |
| Test Admin Auth UUID | `4d33c692-cb9d-473d-975e-91f063d47fa8` (`zzz_ph4c_admin@yav2test.invalid`) |
| Test Non-Admin Auth UUID | `c22b72a8-eba8-40e2-9f19-afb231133ae6` (`zzz_ph4c_nonadmin@yav2test.invalid`) |

> All mutating tests ran inside a PL/pgSQL sub-transaction terminated by a sentinel `RAISE` (equivalent to
> `BEGIN … ROLLBACK`); the only committed writes in this package are the **two `public.team` mappings**.
> Deterministic rollback proof uses server-returned UUIDs verified absent post-rollback.

---

## 1. Preflight (all PASS)

| Check | Result |
|---|---|
| `origin/sync/integration` = `2ca7a65…42897` | ✅ exact |
| Working tree clean; branch `sync/integration` | ✅ |
| PR #46 merged | ✅ (merge commit = governing SHA) |
| Connected project = `ogjrwemjefvccpyjwxuo` | ✅ (`get_project` → name `yav2-dev`) |
| Both Auth users exist / not deleted / email-confirmed / convention-matched | ✅ |
| No pre-existing team row for either UUID; no email/name conflict | ✅ (0 rows before insert) |
| Repo docs loaded (RUNTIME_TEST_PLAN, EXECUTION_RUNBOOK, verifier SQL) | ✅ |

## 2. Team mappings created (the only persistent writes)

| Identity | team row ID | auth_user_id | portal_role | is_admin | is_active |
|---|---|---|---|---|---|
| ADMIN | `a1c009fe-e5da-4ce2-8e02-041938c2c960` | `4d33c692-…-91f063d47fa8` | `Admin` | true | true |
| NON-ADMIN | `2fa1412d-4843-4a52-8669-a64cb29f283a` | `c22b72a8-…-afb231133ae6` | `Viewer` | false | true |

Exactly one active mapping per UUID; no duplicates; no existing/historical team row modified.

## 3. Role-derivation & identity-discovery gate (PASS)

Role logic (`public.get_app_role` / `get_app_role_for_user`, `0008`): `auth.uid()` must map to exactly one
active `team` row; `is_admin=true` or `portal_role='Admin'` ⇒ `admin`; `Viewer` ⇒ `viewer`.
`is_admin_or_manager()` reads `portal_role IN ('Admin','Manager')`.

| Identity | exists | not-deleted | confirmed | convention | active rows | `get_app_role_for_user` | admin/manager gate |
|---|---|---|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ | 1 | `admin` (expected) ✅ | satisfied ✅ |
| NON-ADMIN | ✅ | ✅ | ✅ | ✅ | 1 | `viewer` (expected) ✅ | not satisfied ✅ |

## 4. Runtime tests T1–T10

Identity usage: ADMIN → T4, T8, T10; NON-ADMIN → T5(b); no-auth/built-in roles → T1, T2, T3, T5(a), T6, T7, T9.

| Test | Expected | Actual | SQLSTATE | Correlation / IDs | Verdict |
|---|---|---|---|---|---|
| **T1** valid event accepted | `reject_code = NULL` | `BAD_FORMAT:old_role_code` | — | — | ⚠ MISMATCH (stale sample) |
| **T1′** diagnostic (valid enum codes `STAFF`/`ADMIN`) | NULL | `NULL` | — | — | ✅ accept-path OK |
| **T2** unknown event rejected | `UNKNOWN_EVENT` | `UNKNOWN_EVENT` | — | — | ✅ PASS |
| **T3** secret detected | `true`, `false` | `true`, `false` | — | — | ✅ PASS |
| **T4** authorised admin reader + 2 linked rows | page obj; delta 2 (1+1); linked; rollback→0 | returned obj; delta=2, n_req=1, n_cmp=1, linked=true; req_after=0, cmp_after=0; standing=34 | — | req=`40dc8baa-6646-4285-9e9f-0370a230a591`, cmp=`35637fa4-e1fe-4e67-abd8-90dad8f653e3` | ✅ PASS |
| **T5(a)** no-auth reader denied | 42501 `not authenticated` | 42501 `not authenticated` | 42501 | — | ✅ PASS |
| **T5(b)** non-admin reader denied | 42501 `not authorised` | 42501 `not authorised` | 42501 | — | ✅ PASS |
| **T6** anon/authenticated/service_role direct access denied | all 18 (3×3×{S,I}) = 42501 | 18/18 = 42501 DENIED_OK; 0 unexpected success | 42501 ×18 | — | ✅ PASS |
| **T7** ingestion failure recorded | in-txn 1, after-rollback 0 | 1 → 0 | — | marker `ZZZ_PH4C_REASON` | ✅ PASS |
| **T8** read_requested+read_completed linked | satisfied by T4 | delta=2, linked=true, UUID absence after rollback | — | (T4 UUIDs) | ✅ PASS |
| **T9** `_write_read_audit`/`_record_audit_failure` (no auth) | `n_write=1`, `n_fail=1` | `req_id=NULL`, `n_write=0`, `n_fail=1`; after-rollback 0/0 | — | marker `ZZZ_PH4C_T9_MARKER` | ⚠ MISMATCH (fail-closed) |
| **T9′** diagnostic (admin ctx, valid `access_method_code=RPC`) | write succeeds | `req_id=f1b1c37e-c3c7-4d13-97eb-95d45cb7d074`, `n_write=1`, rollback→0 | — | — | ✅ write-path OK |
| **T10** audited CRUD workflow (admin) | RPC `{id,row_version:1}`; `n_audit=1`; rollback→0; authenticated EXECUTE=true | `{id:0f2c0e54-…, row_version:1}`; code `ACCOUNTING`; `n_audit=1`; app_after=0, audit_after=0; EXECUTE=true | — | applicability=`0f2c0e54-69f9-4432-aed1-9a86660c7dbf`, client=`fdce8a10-7885-4c7a-95f7-f83d81c194a7` | ✅ PASS |

**Rollback confirmation:** every mutating test (T4, T7, T8, T9, T9′, T10) rolled back to zero by explicit
server-returned-UUID absence checks. No `ZZZ_PH4C` marker persists in `audit_log`, `audit_ingestion_failures`,
`clients`, or `client_service_applicability`.

### Discrepancies (test-plan corrections; NOT security regressions)

1. **T1 sample values stale.** The plan's `old_role_code:"A"`/`new_role_code:"B"` violate the live
   `audit_field_format_ok` enum (`ADMIN|MANAGER|EXECUTIVE|STAFF|VIEWER|INTERN|DEVELOPER_TEST|CLIENT`), so the
   validator correctly returns `BAD_FORMAT:old_role_code`. The accept-path is proven by **T1′** (valid codes →
   NULL). *Correction:* update T1's sample metadata to valid enum codes.
2. **T9 cannot exercise the write path as written.** Live `_write_read_audit` is fail-closed: `auth.uid()` NULL
   ⇒ records `NO_VERIFIED_USER` and `RETURN NULL` (no `audit_log` row); non-admin ⇒ `READ_AUDIT_NOT_ADMIN` ⇒
   NULL. Additionally the plan's `access_method_code:"ZZZ_PH4C"` is not a valid code (`RPC`/`BACKEND`). So T9's
   `n_write=1` expectation is unattainable in the SQL editor (no auth). The write-path is proven by **T9′**
   (admin JWT + `access_method_code=RPC` → `n_write=1`). *Correction:* T9 must invoke `_write_read_audit` under
   an admin JWT with a valid `access_method_code`, matching the hardened contract (as `get_sensitive_audit_logs`
   does internally).

Both discrepancies reflect the **live system being stricter/more fail-closed than the test doc** — positive
security posture. No expected-denial check was weakened and no expected failure was converted to a pass.

## 5. Post-runtime verifier V1–V7 (all PASS — no drift)

| Verifier | Expected | Actual |
|---|---|---|
| V1 roles | `audit_owner`,`audit_writer` NOLOGIN/non-super/non-inherit | ✅ both `rolcanlogin=f, rolsuper=f, rolinherit=f` |
| V2 indexes | 8 | ✅ 8 (all named indexes present) |
| V3 chain | all present; writer SECDEF | ✅ contains_secret/validate_event/get_app_role/_for_user/get_sensitive all true; writer_is_secdef=true |
| V4 writers | competing=0, base helpers=2 | ✅ 0 / 2 |
| V5 events | 23 canonical; read S4=2; dupes=0 | ✅ 23 / 2 / 0 |
| V6 RLS | all 3 tables enabled+forced | ✅ audit_log, audit_event_contract, audit_ingestion_failures all `rls_enabled=t, rls_forced=t` |
| V7 grants | prohibited = 0 | ✅ 0 |

## 6. Security-posture summary

| Metric | Value |
|---|---|
| Prohibited direct grants (anon/authenticated/service_role/PUBLIC) | **0** |
| FORCE RLS on the three audit tables | **enabled + forced (all 3)** |
| Standing read-event rows preserved | **34** (unchanged) |
| Event-contract rows | **45** (23 Phase 4C canonical present; unchanged) |
| ZZZ_PH4C residue (audit/ingestion/clients/applicability) | **0** |
| Persistent intentional test records | **2 `public.team` mappings only** |
| Real client/staff records changed | **none** |

## 7. Cleanup status & recommendation

Per authorisation, **no cleanup performed**: Auth users retained, team rows retained/active.

**Recommendation:** **Retain temporarily for UAT**, then **disable after independent (ChatGPT) review** by
setting `team.is_active=false` for both mappings (which reverts each identity's `get_app_role` to `anon`), and
finally **delete the Auth users + team rows under a separate governed cleanup package** once Phase 4C UAT closes.
Do not delete in this package.

## 8. Final recommendation

**PASS WITH SPECIFIC CORRECTIONS.**

All security-critical behaviours verified on live yav2-dev: authorised admin read path functional and correctly
audited (2 linked rows, deterministic rollback); unauthorised/non-admin/anon/authenticated/service_role paths
fail-closed with exact `42501`; direct audit-table access denied across 18 probes; audited CRUD workflow intact;
verifiers V1–V7 show zero drift (0 prohibited grants, FORCE RLS intact, 23 events, 34 read rows preserved).

The two corrections are to the **test-plan document only** (T1 sample enum codes; T9 admin-context invocation
with a valid `access_method_code`) — both because the live hardened contracts are stricter/more fail-closed than
the stale examples. No database, migration, grant, role, RLS, contract, or application change is required or was
made.
