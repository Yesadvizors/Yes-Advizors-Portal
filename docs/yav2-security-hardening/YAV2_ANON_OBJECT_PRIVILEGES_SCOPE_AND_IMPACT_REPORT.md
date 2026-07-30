# YAV2 Portal V2 — Anon Object-Privileges — Scope & Impact Report

**Residual:** `R-ANON-OBJECT-PRIVILEGES` (HIGH — hardening required).
**Status:** **DESIGN ONLY.** No Supabase access, no SQL executed, no migration run, no privilege changed.
**Governing branch/commit:** `sync/integration` @ `231fa39b608f6def9e6ed4b45ce5feb417c6f74f`.
**Authorised future-execution env:** `yav2-dev` / `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1/Prod `zcszesuvjrryxtigjglt`.
**Source evidence (exact, verbatim raw Supabase output):**
`docs/yav2-discrepancy-closure/evidence/YAV2_DISCREPANCY_CLOSURE_LIVE_RESULT_EXACT_2026-07-30_1115_IST.json`
(SHA-256 `8fe16665ff87b3414b8dc30c2a965fbfdf65645880b2703c557bc1143737ae0d`).

---

## 1. Derivation

The 28-table scope is derived **directly from the raw live evidence**, not from the summary:
- **Grants:** block `G1_raw_grants` (818 rows; `table_name, grantee, privilege_type` via `aclexplode`,
  PUBLIC OID-0 preserved). Only three grantees appear on `public` tables: `anon`, `authenticated`,
  `service_role` (no table-level PUBLIC grant exists).
- **RLS/FORCE/policies:** block `G3_rls_force` (39 rows).
- **Default privileges:** blocks `G11_default_acl` (64 rows) / `G11b_default_acl_summary`.
- **Role attributes:** `G7_bypassrls_roles`; **public CREATE:** `G8_public_create_named`;
  **policy hygiene:** `G5_anon_public_policies` = 0, `G6_authenticated_all` = 0.

**Result:** exactly **28** public tables grant `anon` one or more object-level privileges. On every one of
the 28, `anon` holds the **full default `GRANT ALL`** — all eight of
`SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` (PG-17). The remaining **11**
tables (9 M1-A client-master + 2 P5 service) hold **no** anon privilege (already explicitly revoked).
`28 + 11 = 39`.

---

## 2. Exact 28-table scope register

Legend: privileges — `S`=SELECT `I`=INSERT `U`=UPDATE `D`=DELETE `T`=TRUNCATE `R`=REFERENCES `Tg`=TRIGGER
`M`=MAINTAIN. `Y` = anon holds it (from raw `G1`). `RLS`/`FORCE` from `G3`. `pol` = policy_count.
`anon revoked?` = whether anon already had all privileges revoked (all 28 = **no**).

| # | Table | S | I | U | D | T | R | Tg | M | RLS | FORCE | pol | anon revoked? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `accounting_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 2 | `audit_event_contract` | Y | Y | Y | Y | Y | Y | Y | Y | Y | **yes** | 0 | no |
| 3 | `audit_ingestion_failures` | Y | Y | Y | Y | Y | Y | Y | Y | Y | **yes** | 0 | no |
| 4 | `audit_log` | Y | Y | Y | Y | Y | Y | Y | Y | Y | **yes** | 0 | no |
| 5 | `audit_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 6 | `claude_usage_log` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 1 | no |
| 7 | `client_directors` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 2 | no |
| 8 | `client_financials` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 2 | no |
| 9 | `clients` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 2 | no |
| 10 | `completed_documents` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 11 | `compliance_calendar` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 12 | `ct_team_members` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 2 | no |
| 13 | `documents` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 14 | `extracted_document_data` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 15 | `financial_years` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 2 | no |
| 16 | `financials_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 17 | `follow_ups` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 2 | no |
| 18 | `gst_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 19 | `income_tax_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 20 | `llp_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 21 | `notice_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 22 | `payroll_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 23 | `roc_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 24 | `tasks` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 25 | `tds_client_config` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 2 | no |
| 26 | `tds_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |
| 27 | `team` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 2 | no |
| 28 | `trust_ngo_tracker` | Y | Y | Y | Y | Y | Y | Y | Y | Y | no | 3 | no |

**Uniformity.** All 28 share an identical anon posture (full `GRANT ALL`), consistent with a single
platform default-ACL origin rather than any per-table grant. **All 28 have RLS enabled.** Only the 3 audit
tables are `FORCE`d (and have zero policies → default-deny). The other 25 are `ENABLE`-only with 1–3
policies (all `TO authenticated`; none for anon — `G5` = 0).

---

## 3. Privilege-by-privilege impact (of a future REVOKE from anon)

| Privilege | What anon holding it means | RLS mediates? | Impact of revoking from anon |
|---|---|---|---|
| **SELECT** | Row reads — but **RLS denies all rows to anon** (no anon policy; anon not `BYPASSRLS`) | Yes (row level) | **None at runtime** — anon already returns 0 rows; revoke makes the block explicit (defence-in-depth) |
| **INSERT/UPDATE/DELETE** | Row writes — again **RLS denies** (no anon policy) | Yes (row level) | **None at runtime** — anon writes already rejected; revoke makes explicit |
| **TRUNCATE** | Empties the entire table, **bypassing per-row policies** | **No** | Removes a non-RLS-mediated destructive capability from anon |
| **REFERENCES** | Create FK constraints referencing the table | **No** | Removes schema-coupling capability from anon |
| **TRIGGER** | Attach triggers to the table | **No** | Removes code-attachment capability from anon |
| **MAINTAIN** (PG-17) | `VACUUM`/`ANALYZE`/`REINDEX`/`CLUSTER`/`REFRESH MAT. VIEW` | **No** | Removes maintenance capability from anon |

**Highest-priority subset:** the **3 audit tables** (`audit_log`, `audit_event_contract`,
`audit_ingestion_failures`). Their row-level posture is default-deny (FORCE + 0 policies), yet anon still
holds `TRUNCATE` — a privilege RLS/FORCE do **not** mediate. An anonymous `TRUNCATE` of `audit_log` would
be an integrity concern for the audit trail. **Exploitability is not asserted** (§4).

---

## 4. Runtime-risk assumptions (clearly labelled — NOT proven without controlled testing)

1. **[ASSUMPTION]** The SPA uses the anon key only for *pre-authentication* requests and switches to the
   `authenticated` role (JWT) after login; no product feature performs anon `TRUNCATE`/`TRIGGER`/
   `REFERENCES`/`MAINTAIN`. → Revoking anon object privileges should be transparent. **Confirm via runtime
   test plan.**
2. **[ASSUMPTION]** No public/unauthenticated flow depends on anon `SELECT` returning rows (RLS already
   denies anon on all 28; `G5` = 0). → Revoking anon `SELECT` changes nothing observable. **Confirm.**
3. **[FACT, from evidence]** `anon` is **not** `BYPASSRLS` (`G7`), cannot `CREATE` in `public` (`G8`), and
   has no anon-targeted policy (`G5` = 0). So anon's *row* access is already fully constrained; this
   hardening closes only the *object-level* surface RLS cannot cover.
4. **[ASSUMPTION]** PostgREST does not expose `TRUNCATE`/DDL verbs over HTTP, so the practical reach of
   these anon privileges is via a direct Postgres connection using the anon role/key. Whether such a
   connection path is reachable in the deployed environment is **undetermined** without runtime/deployment
   inspection.

---

## 5. Dependencies

| Dependency | Relevance | Design consequence |
|---|---|---|
| **PostgREST** | anon/authenticated requests are PostgREST role mappings via the anon/JWT keys | Only anon is touched; authenticated path unchanged → no API regression expected |
| **Edge Functions** | run with `service_role` (server-side) | `service_role` **preserved** → Edge/maintenance jobs unaffected |
| **Migrations** | future objects re-inherit the default ACL unless corrected | Must add `ALTER DEFAULT PRIVILEGES` correction (see §6) or the finding regresses on next `CREATE TABLE` |
| **service_role** | holds `BYPASSRLS` + full grant; server-side data/maintenance path | **Preserved** — not in scope; secret-handling remains its control (R-SVC) |
| **authenticated** | the application's real data path (RLS-governed) | **Preserved.** (Note: authenticated *also* holds object-level TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on all 28 — a *separate, lower-priority* defence-in-depth item; see §7 Q3.) |

**Default-ACL owners (from `G11`):** table defaults are set by **two** roles — `postgres` **and**
`supabase_admin` — each granting anon/authenticated/service_role. A default-privilege correction must be
issued **`FOR ROLE postgres` and `FOR ROLE supabase_admin`**; a single unqualified `ALTER DEFAULT
PRIVILEGES` would miss one owner and leave a regression path.

---

## 6. Tables that may require anon SELECT for legitimate public flows

**None identified.** All 28 tables enforce RLS with **no anon policy** (`G5` = 0) and anon is not
`BYPASSRLS`, so anon already reads **zero rows** on every one of them. There is no reference-data or public
lookup table exposed to anon in this set (the read-only reference tables `service_catalogue` /
`entity_type_catalogue` are in the **11 revoked** group, not here). Therefore revoking anon `SELECT` on the
28 is not expected to break any public flow. **This remains an assumption to confirm** by the runtime read
test (§ test plan) before execution.

---

## 7. Uncertainties requiring controlled runtime testing

- **Q1.** Does any deployed client path actually authenticate before data access, such that removing anon
  data privileges is truly invisible? (Runtime: anon read/write negative tests.)
- **Q2.** Is a direct-Postgres anon connection reachable in `yav2-dev` (the only path by which anon
  TRUNCATE/DDL could be exercised)? (Deployment inspection.)
- **Q3.** Should `authenticated` object-level privileges (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) also be
  revoked as a follow-on? Out of scope for R-ANON-OBJECT-PRIVILEGES; flagged for a separate decision.
- **Q4.** Are there external tools/migration runners relying on anon holding any of these privileges?
  (Expected none; confirm before execution.)

All uncertainties are carried into the **Runtime Test Plan** and the **Migration Design** pre-checks. No
uncertainty is resolved by execution in this package — this is design only.
