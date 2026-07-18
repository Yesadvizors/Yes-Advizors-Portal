# YAV2 Portal V2 — Module 1 — **M1-B D2b Implementation Report** (Rev 2)

> **CLOSURE — D2b CLOSED PASS (2026-07-18).** Independently reviewed and executed on
> **V2 / yav2-dev (`ogjrwemjefvccpyjwxuo`)**. Migration `0017` (SHA `91c605a9…`) executed:
> hardened audited CRUD RPCs live + bypass closure revoked direct `authenticated`
> INSERT/UPDATE. Follow-on **Migration `0018` (DELETE privilege closure, SHA `bbef5d3e…`)
> executed and independently verified**: `all_7_insert_update_delete_denied_select_kept_
> expect_true = true` (authenticated on all 7 base tables now INSERT=false, UPDATE=false,
> DELETE=false, SELECT=true). Post-execution observation **OBS-D2B-V9-1** (raised at
> verification V9) is ruled **NON-BLOCKING** and is preserved for the record; it does not
> gate closure. No rollback run; no Production touched; D3/D4/P2 not started.
> *(The narrative below documents the authoring history and remains for the record.)*

**Status: AUTHORED — NOT EXECUTED (historical, superseded by the CLOSURE banner above).**
D2b Rev 2 answers the review ruling **HOLD — REVISION REQUIRED**. It delivers migration `0017` (now **22** hardened, audited
client-master CRUD RPCs — the registration-creation gap is closed), its paired
rollback, a read-only post-execution verification kit, and a **transactional
functional/negative/concurrency test kit**, authored inside the governed repo
`D:\Claude\Claude Code\Yes-Advizors-Portal` on branch **`ui/redesign-v1`**. **No SQL
was executed.** Migration **0014 and 0016 are unchanged**; V1/Production
(`zcszesuvjrryxtigjglt`) untouched; **no D3/D4, no frontend, no compliance, no
tracker/overdue/calendar/FY change**.

Grounded in the live catalogue (0005 audit, 0007 validators, 0008 role helpers, 0015
M1-A tables/RLS/grants, 0016 D2a `audit_write_event`).

---

## A. What changed vs Rev 1

1. **Registration creation gap CLOSED (review item 1).** Added:
   - `client_registration_create` → `registration.added` / CREATE / **CREATED**; returns `{id, row_version}`.
   - `client_registration_create_with_gst` → creates header **and** GST detail, emitting `registration.added` **+** `gst_detail.changed` **atomically**; returns `{registration_id, header_row_version, gst_row_version}`.
   - `client_registration_set_active` → `registration.updated` / **ENABLED|DISABLED** (the header has `is_active`).
   Now **every** table whose direct INSERT/UPDATE is revoked has a complete CREATE+UPDATE (and, where the table has `is_active`, activation) RPC path. Total **22 RPCs**.
2. **Validation strengthened + documented (review item 3)** — see §C.
3. **Transactional test kit added (review item 2)** — see §D.
4. **service_role EXECUTE explicitly denied** on all 22 RPCs (REVOKE from PUBLIC, anon, service_role; GRANT only authenticated) — asserted by post-condition + kit.

---

## B. RPC surface (22)

`client_persons`: create · update · set_active → **person.changed** ·
`client_identifiers`: create · update · set_active → **identifier.changed** ·
`client_contacts`: create · update · set_active → **contact.changed** ·
`client_addresses`: create · update · set_active → **address.changed** ·
`client_relationships`: create · update · set_active → **relationship.changed** ·
`gst_registration_details`: create · update → **gst_detail.changed** ·
`client_registrations`: **create** · update · **set_active** → **registration.added** (create) / **registration.updated** (update, set_active) ·
combined: `client_registration_create_with_gst` (registration.added + gst_detail.changed) · `client_registration_update_with_gst` (registration.updated + gst_detail.changed) — both atomic.

Actions **CREATE|UPDATE only**; `change_type_code ∈ {CREATED, UPDATED, ENABLED, DISABLED}` (whitelisted; never DEACTIVATED). Metadata is RPC-built, never caller-supplied.

### Complete operation-coverage matrix (instruction §B)

| Table | direct INSERT revoked | direct UPDATE revoked | RPC create | RPC update | Lifecycle/status op | Audit event(s) | Optimistic locking | Frontend operation supported |
|---|---|---|---|---|---|---|---|---|
| client_persons | YES | YES | client_person_create | client_person_update | client_person_set_active (is_active) | person.changed | row_version on update+lifecycle | onboarding §B Persons (P2) |
| client_identifiers | YES | YES | client_identifier_create | client_identifier_update | client_identifier_set_active (is_active + status kept consistent) | identifier.changed | row_version | onboarding §C Identifiers (P2) |
| client_contacts | YES | YES | client_contact_create | client_contact_update | client_contact_set_active (is_active) | contact.changed | row_version | onboarding §E Contacts (P2) |
| client_addresses | YES | YES | client_address_create | client_address_update | client_address_set_active (is_active) | address.changed | row_version | onboarding §F Addresses (P2) |
| client_relationships | YES | YES | client_relationship_create | client_relationship_update | client_relationship_set_active (is_active) | relationship.changed | row_version | onboarding §G Relationships (P2) |
| client_registrations | YES | YES | client_registration_create **(Rev 2 gap closure)** + client_registration_create_with_gst | client_registration_update + client_registration_update_with_gst | client_registration_set_active (is_active EXISTS in 0015 — not invented) + status vocabulary via update | registration.added (create) / registration.updated (update, lifecycle) | row_version | onboarding §D Registrations (P2) |
| gst_registration_details | YES | YES | gst_detail_create + via create_with_gst | gst_detail_update + via update_with_gst | **no is_active column in 0015 — none invented**; lifecycle = cancellation_date via gst_detail_update; header lifecycle via client_registration_set_active | gst_detail.changed | row_version | onboarding §D GST detail (P2) |

**No table is left with a revoked business operation and no replacement RPC.** The same
matrix is machine-checked by verification **V3/V3b**.

---

## C. Validation rule set (item 3 — grounded, not invented)

Each rule is tagged. **GROUNDED** = live schema `CHECK`/`NOT NULL`/`UNIQUE` (0015) or an
already-reviewed rule; **PROPOSED** = enforced but **explicitly listed for approval** (not
in schema/frontend). PROPOSED rules fail closed only when a value is **provided** (NULLs
pass unless the column is required). Reviewer may relax any PROPOSED rule — they are
isolated in the per-RPC validation blocks.

| Rule | Grounding |
|---|---|
| status enums (registration Applied/Active/Suspended/Cancelled; identifier Active/Inactive) | GROUNDED — CHECK |
| filing_frequency ∈ Monthly/Quarterly_QRMP | GROUNDED — CHECK |
| effective_to ≥ effective_from; gst cancellation ≥ registration | GROUNDED — CHECK (also re-checked in-RPC for a clean error) |
| relationship exactly-one-target (client XOR person); ownership_pct ∈ [0,100] | GROUNDED — CHECK |
| required: client_id, full_name, id_type/id_value, reg_type, relationship_type | GROUNDED — NOT NULL |
| uniqueness: (client_id,reg_type,upper(reg_number)); (client_id,id_type,upper(id_value)) | GROUNDED — UNIQUE INDEX (duplicate → fail closed) |
| **PAN** `^[A-Z]{5}[0-9]{4}[A-Z]$` | GROUNDED — M1-B pre-discovery Block 6/7 |
| **P1 DIN** `^[0-9]{8}$` | PROPOSED (MCA DIN = 8 digits) |
| **P2 GSTIN** `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$` | PROPOSED (standard GSTIN) |
| **P3 GST state_code** `^[0-9]{2}$` | PROPOSED (GST state code = 2 digits) |
| **P4 pincode** `^[0-9]{6}$` | PROPOSED (Indian PIN) |
| **P5 email** `^[^@ ]+@[^@ ]+\.[^@ ]+$` (stored lower-trimmed) | PROPOSED (basic shape) |
| **P6 mobile/phone** `^[0-9]{10}$` | PROPOSED (frontend shows '+91 '+mobile) |
| **P7 person cessation_date ≥ appointment_date** | PROPOSED (no schema CHECK on persons) |
| **P8 self-relationship** related_client_id ≠ client_id | PROPOSED |
| **P9 contact** ≥ one of person_name/email/phone | PROPOSED (a contact must be reachable/named) |
| **P10 address** line1 required | PROPOSED (reviewer explicitly requested; other minimums — city/state/pincode — listed but NOT hard-required, pending approval) |
| **P11 identifier per-type formats** when `id_type` ∈ PAN/TAN/CIN/LLPIN/DIN (value upper-normalised): PAN `^[A-Z]{5}[0-9]{4}[A-Z]$` · TAN `^[A-Z]{4}[0-9]{5}[A-Z]$` · CIN `^[LUF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$` · LLPIN `^[A-Z]{3}-?[0-9]{4}$` · DIN `^[0-9]{8}$` | PROPOSED (standard formats; UDYAM/IEC/PF/ESI/OTHER intentionally NOT validated — AQ-1) |
| **P13 GSTIN↔state consistency** first 2 digits of GSTIN = state_code (when both provided) | PROPOSED (GSTIN encodes the state code; instructed "where feasible") |
| **P14 GST header type gate** GST detail only on an `IN_GST` header — enforced in gst_detail_create/update AND both combined RPCs | PROPOSED (0015 reg_type vocabulary comment; gst_registration_details is the typed detail of an IN_GST registration) |
| **P15 reg_type enum** ∈ IN_GST/AE_VAT/AE_CT/LICENCE/OTHER (upper-normalised) | **RULED (AQ-2 closed)** — these five allowed; **OTHER is the extensible catch-all** for any type not yet enumerated |
| **P16 jurisdiction** trimmed non-empty text, `char_length ≤ 64`; default `'IN'` | **RULED (AQ-3 closed)** — **NOT** restricted to two letters and not upper-forced; free-form trimmed text with a length cap |

**G1 — GOVERNANCE (NOT optional; master Rule 6 + P0 R-6 ruling 2026-07-18): Aadhaar
rejection in `client_identifiers` — FINAL RULING (AQ-4 closed).** `id_type` matching
AADHAAR/AADHAR/ADHAR/UIDAI (any case) or equal to UID → `AADHAAR_IDENTIFIER_NOT_ALLOWED`
(mandatory, retained). The former length-only heuristic (`AADHAAR_VALUE_NOT_ALLOWED` for a
pure 12-digit value) is **REMOVED**: a value is **not** rejected solely for being 12
digits, so a legitimate 12-digit non-Aadhaar identifier under another type is accepted.
Portal V2 still must not capture, accept, backfill or newly store Aadhaar digits including
last-four; person RPCs accept **no Aadhaar parameter** of any kind.

Normalization: PAN/GSTIN/id_type/reg_type upper+trim; **jurisdiction trim only (not
upper)**; id_value upper+trim for P11 types; DIN/state/pincode/mobile trim; email
lower+trim; blank → NULL.

**Registration number/status:** status enum GROUNDED; reg_type required GROUNDED; case-
insensitive uniqueness on a present reg_number GROUNDED.

### APPROVAL REQUIRED (AQ) — reviewer to confirm, relax, or extend

| # | Question |
|---|---|
| AQ-1 | Confirm/adjust P11 formats; confirm UDYAM/IEC/PF/ESI/OTHER stay format-unvalidated. |
| AQ-2 | **CLOSED (final ruling)** — P15 reg_type = {IN_GST, AE_VAT, AE_CT, LICENCE, OTHER}; OTHER extensible. |
| AQ-3 | **CLOSED (final ruling)** — P16 jurisdiction = trimmed non-empty text, ≤64 chars; NOT restricted to two letters. |
| AQ-4 | **CLOSED (final ruling)** — reject Aadhaar identifier TYPES only; no length-only 12-digit value rejection. |
| AQ-5 | reg_number requirements — NOT enforced: schema permits NULL for 'Applied'; should 'Active' require a number per reg_type? |
| AQ-6 | Primary-contact/primary-address uniqueness per client — NOT enforced (schema allows multiple `is_primary` rows; enforcement needs a demote-or-reject decision). |
| AQ-7 | person_type vocabulary (0015 comment: Director/Partner/Proprietor/Trustee/Member/Karta/Authorised Signatory/Other) — NOT enforced in Rev 2. |

---

## D. Transactional test kit (authorized artifact 5) — authored, NOT executed

**Authoritative kit: `supabase/verification/M1B_D2b_transactional_functional_tests.sql`**
(the filename mandated by the P1 instruction). Design: project-attestation guard and a
pre-run snapshot **S0** run BEFORE the transaction (a guard failure leaves nothing open);
ALL test activity runs inside **one transaction that always ends in `ROLLBACK`** (the
script contains no COMMIT); results go to a temp table and every test records exact-error
PASS/FAIL (fail closed — unexpected outcomes are FAIL with the real SQLERRM); a
post-rollback snapshot **S9** must equal S0 or the run is invalid evidence. Synthetic
principals (six team rows: Admin/Manager/Staff/Executive/Viewer/inactive, all
`@example.invalid`, generated UUIDs) and two `is_test_client` clients are created inside
the transaction and vanish at rollback — **no persistent audit rows, no dependence on real
business rows**.

**36 recorded tests** covering the 24 mandated items:

| Mandate item | Tests |
|---|---|
| 1 valid create per family | T01–T08 (person, identifier, contact, address, relationship, registration, gst_detail, create_with_gst) |
| 2 update + row_version increment | T09 (returned AND stored rv = 2, exactly once) |
| 3 lifecycle enable/disable | T10 (person DISABLE), T11 (registration DISABLE→ENABLE) |
| 4 stale row_version | T12 |
| 5 missing row | T13 |
| 6 invalid PAN | T14 |
| 7 Aadhaar input/type rejection | T15 (Aadhaar TYPE rejected), T16 (12-digit value under non-Aadhaar type ACCEPTED — no length-only reject) |
| 8 invalid GSTIN | T17 |
| 9 GST state-code mismatch | T18 |
| 10 invalid date order | T19 |
| 11 invalid ownership pct | T20 |
| 12 self-relationship | T21 |
| 13 linked person from another client | T22 |
| 14 correct audit event + change_type_code | T24 (exact 17-row count + spot checks incl. DISABLED/ENABLED) |
| 15 atomic rollback when audit fails | T25 (contract removed in a sub-block → create fails → no data row survives) |
| 16 atomic registration+GST creation | T08 |
| 17 no partial write when GST leg fails | T26 (no header row survives) |
| 18 direct authenticated INSERT denial | T27 (`SET LOCAL ROLE authenticated`) |
| 19 direct authenticated UPDATE denial | T28 |
| 20 anon RPC denial | T29 (`SET LOCAL ROLE anon`) |
| 21 inactive user denial | T30 |
| 22 Staff/Executive/Viewer denial | T31a/T31b/T31c |
| 23 Admin/Manager allowance | T01–T11 (admin), T32 (manager) |
| 24 concurrent/stale simulation | T13b (two-writer, fresh row) — plus T33 null-auth-context |

Verdict row is fail-closed: PASS requires **0 FAIL and exactly 36 recorded tests**.

**Honestly separated — NOT executed by this kit (manual runtime test matrix, in the kit
footer):** M-1 real-JWT admin flow via Preview app; M-2 anon-key REST probe of an RPC
route; M-3 real Staff/Executive/Viewer JWT denial through the gateway; M-4 two-browser
optimistic-lock conflict UX; M-5 service_role-key REST probe. These belong to P2/P12
evidence; the kit simulates identity via transaction-local JWT-claim GUCs and `SET LOCAL
ROLE`, which exercises guards and grants but is not a GoTrue flow.

**Run only after 0017 is applied, and only when approved.**

> **Note (D-P1-1):** a second, unauthorized kit file
> `M1B_D2b_functional_test_kit_transactional.sql` (Rev 1, 15 assertions, weaker coverage —
> no Aadhaar/GSTIN-mismatch/role-matrix tests, depends on an existing live admin row)
> appeared in the working tree and index during this authoring session from a concurrent
> session. It is NOT part of this package; recommended disposition: remove under review
> (superseded by the authoritative kit above).

---

## E. Controls retained (item 4)

Exact live table shapes · NULL-safe active Admin/Manager (`fn() IS DISTINCT FROM TRUE`) ·
SECURITY DEFINER + pinned `search_path` · optimistic locking (STALE vs NOT_FOUND) · atomic
`audit_write_event` (raises, never swallows) · `clients.id` UUID keys · **no Aadhaar** ·
bypass closure (authenticated INSERT/UPDATE revoked on 7 tables) · **no service_role
EXECUTE** · no D3/D4/frontend/compliance · nothing executed. Owner-`BYPASSRLS` dependency
is fail-closed in SECTION 0 (proven live via `audit_write_event` writing FORCE-RLS
`audit_log`).

---

## F. File SHA-256 (genuine, from final bytes)

| File | SHA-256 |
|---|---|
| `…/0017_m1b_d2b_client_master_crud_rpcs.sql` | `91c605a9a3ecead468ae33ab2f6fda4a7f758dd648711e5dc59a99ddc7a36202` |
| `…/0017_m1b_d2b_client_master_crud_rpcs_rollback.sql` | `3e43fbacba7136979a026aaa233ea9514b7707c4f3fcfa97657666ead5466428` |
| `…/M1B_D2b_post_execution_verification_readonly.sql` | `c402174f02bf6a3a1e43638ad216786d95e1ed80734e012bae2c7e2d00cca430` |
| `…/M1B_D2b_transactional_functional_tests.sql` **(authoritative kit)** | `95e161e0ce5b9f757d2a092d321b133a8fff5b35e2367c524b683b422334f755` |

(The unauthorized concurrent-session kit `M1B_D2b_functional_test_kit_transactional.sql`,
sha `8fb696e8…`, is excluded from this package — see D-P1-1 note in §D.)
This report's own hash is recorded in the P1 authoring deliverable message (it cannot
contain its own hash).

---

## G. Parser / structural results

- **Migration** — 72 top-level statements; **0 top-level DROP/TRUNCATE/DELETE/INSERT/
  UPDATE/SELECT/ALTER**; 22 `CREATE FUNCTION`, 22 `REVOKE`, 22 `GRANT`, plus DO(precheck/
  closure/postcheck), CREATE TEMP, BEGIN/COMMIT. `$fn$` balanced (44). 24 audit emit-sites
  (20 single + 2×2 combined). Every data INSERT/UPDATE is inside a function body. — PASS.
- **Rollback** — 27 statements: fail-closed guard (attests project; verifies all 22
  exact signatures exist and no unexpected overloads before dropping) + 22 plain
  `DROP FUNCTION` + grant-restore. It carries an explicit **security-consequence** note
  (restoring direct authenticated INSERT/UPDATE reopens the unaudited write path). — PASS.
- **Verification kit** — 10 statements, all SELECT; invokes no RPC; V3 is a full
  operation-coverage matrix (create/update/lifecycle per table). — PASS.
- **Test kit (authoritative)** — S0 snapshot SELECT + guard DO before the transaction;
  then `BEGIN` · temp results table · temp identity helper · one tests DO (36 recorded
  tests, `v_seq` increments machine-counted = 36) · results/verdict SELECTs · `ROLLBACK`
  (no COMMIT anywhere) · S9 snapshot SELECT. All DML inside the transaction. — PASS
  (transactional, not executed).

Safety-token scan: forbidden `zcszesuvjrryxtigjglt` only in the migration header comment;
no compliance/tracker/FY tokens; `auth.uid()` schema-qualified throughout; no Aadhaar
column referenced.

---

## H. Git state and DEVIATION D-P1-1 (concurrent-session interference)

D2a is CLOSED / PASS / live-verified and committed separately: **`c67d650`** tracks the
four D2a artifacts, bytes unchanged (`a5044b4e…` / `83c72270…` / `aa4965d2…` /
`91fb54c6…`). The historical corpus (0001–0011: `2784d03`), the 0014 pair (`ccabe76`) and
the register (`9170466`) are likewise already committed.

**The P1 instruction requires the five D2b files NOT to be staged or committed.** This
executor staged nothing. However, a **concurrent session** interfered during authoring
(deviation **D-P1-1**, timestamps IST 2026-07-18):

- 07:39:42 — it authored `M1B_D2b_functional_test_kit_transactional.sql` (an unauthorized,
  overlapping Rev 1 test kit, 13,145 B);
- 07:51:20 — it rewrote this report (hashing the Rev 2 migration/rollback/verification
  bytes correctly, but referencing its own kit and omitting G1/P11/AQ — corrected in place
  by this revision);
- 07:51:56 — it ran `git add`, RE-staging the four D2b files (undoing the reviewer-approved
  index-only unstage of 07:2x) plus its own kit. The staged blobs of the migration,
  rollback and verification match the authored Rev 2 bytes; the staged report and kit
  blobs are its versions, now superseded on disk.

This executor did not stage, unstage, or delete anything in response — index operations
now require a ruling (P0 precedent). **Recommended dispositions for review:** (1) index-only
unstage of everything D2b again; (2) remove the unauthorized duplicate kit file
(superseded); (3) identify and stop the concurrent session before further gates — two
executors mutating one working tree mid-gate is itself a governance risk.

---

## I. Confirmations

- **0014, 0015 & 0016 byte-unchanged** (0014: `c32c8a0c…` / `d2120091…`; 0015:
  `b9d9a4e2…` / `ef88e109…`; 0016: `a5044b4e…` / `83c72270…`) — also proven by a clean
  `git status` for all tracked migration files.
- **Nothing executed, nothing deployed, nothing pushed** — the connected MCP exposes only
  V1/Production and was not queried; no SQL ran against any database.
- **No D3/D4, no frontend change, no compliance generation, no tracker/overdue/calendar/FY
  change. No Aadhaar parameter, digit or last-four is accepted or stored anywhere.**

---

**M1-B is at D2b Rev 2 authoring. Migration 0017 is authored, NOT executed. Awaiting
independent review before execution.**
