# YAV2 Portal V2 — Module 1 — **M1-B D3 Legacy-Person Backfill — Discovery & Design** (Rev 1)

> **⚠️ MIGRATION DECISION SUPERSEDED (retained as discovery evidence).** PJ later confirmed all 26 `clients.directors` entries are **sample/testing data**, so **Migration 0019 is CANCELLED before execution** and no backfill is required. This report is preserved **only** as the historical proof that 26 sample entries were discovered and classified; its backfill/design conclusions no longer apply. See the closure record: `docs/M1B_D3_0019_Draft_Decision_And_Mapping.md`.

**Status: DISCOVERY & DESIGN ONLY — NOTHING AUTHORED AS EXECUTABLE, NOTHING EXECUTED.**
At the time this discovery report was authored, Migration `0019` had not yet been written.
A later local draft was prepared but cancelled and never executed. No SQL was run; no
DML/DDL; no source/frontend change; no D4/P2.2/service-applicability/compliance work. Target database when eventually executed:
**V2 / yav2-dev only (`ogjrwemjefvccpyjwxuo`)**; V1/Production (`zcszesuvjrryxtigjglt`) is
prohibited and was not queried (Supabase MCP deliberately not used — it exposes V1).

Deliverables in this package:
- `supabase/verification/M1B_D3_legacy_person_discovery_readonly.sql` — read-only V2 discovery.
- `docs/M1B_D3_Discovery_And_Design_Report.md` — this file.
- `docs/YAV2_Master_Completion_Register.md` — D3 marked **DISCOVERY** (not AUTHORED/executable).

---

## A. Repository discovery findings

**Legacy source 1 — `clients.directors` jsonb** (migration 0002; keyed by `clients.id` uuid
directly). The app writer `src/lib/aadhaar.js:directorForPersist` emits objects with keys:
`{ name, din, email, mobile, pan, aadhaar_last4, aadhaar_masked, role }`. No `designation`,
`appointment_date`, `cessation_date`, `nationality`, `is_active`, or raw `aadhaar` key is
written. `clients.num_directors` records the intended count. **Confirmed on V2 (2026-07-18):
11 clients, 26 director entries** (§B-Results) — and every entry lacks PAN and DIN.

**Legacy source 2 — `client_directors` table** (migration 0002; text `client_id` → join
`clients.client_id` → `clients.id`). Columns: `id, client_id(text), name, role, din, pan,
aadhaar_last4, aadhaar_masked, mobile, email, dsc_expiry, dsc_status, is_active,
is_primary_contact, appointment_date, cessation_date, nationality, designation, remarks,
created_at, updated_at`. **Confirmed on V2 (2026-07-18): 0 rows** — empty; the jsonb is the
sole legacy source.

**Target — `public.client_persons`** (migration 0015 + 0016 lineage). Relevant columns:
`id(uuid), client_id(uuid→clients.id), person_type, full_name(NOT NULL), designation, pan,
din, mobile, email, nationality, is_primary_contact, appointment_date, cessation_date,
aadhaar_verification_status (metadata only — NO digits/last-four), is_active, row_version,
created_at/by, updated_at/by`. **Lineage (0016):** `source_system, source_ref, source_hash,
backfill_batch_id`, plus partial unique index `client_persons_source_uq (client_id,
source_system, source_ref) WHERE source_system IS NOT NULL`.

**D2b RPCs (0017):** `client_person_create/update/set_active` exist but are **NOT usable by
the backfill** — they require a non-null `auth.uid()` and Admin/Manager (a migration runs as
its executing role with no JWT → `NO_AUTH_CONTEXT`), and they do not set lineage columns. The
same auth precondition blocks `audit_write_event`. **Design consequence:** person rows are
written by controlled **direct INSERTs** as the migration owner (BYPASSRLS) with lineage
columns. **Provenance/audit for a non-user context is an OPEN BLOCKER — see §C-Audit; no
service actor, user UUID, or new bypass function is assumed.**

**Term references (frontend/backend):**
- `clients.directors` / `.directors`: `OnboardingWizard.jsx` (write path), `Clients.jsx`
  (display), `DocumentManager.jsx`, `lib/aadhaar.js`.
- `client_directors`: `Clients.jsx` (legacy read), `lib/aadhaar.js` (comment); migrations
  0002/0006/0010/0015/0016.
- `client_persons`: `src/services/clientMasterReads.js` (P2.1 read-only); migrations
  0015–0018; M1A verification.
- `aadhaar_last4` / `aadhaar_masked`: `OnboardingWizard.jsx`, `Clients.jsx`, `lib/aadhaar.js`;
  migration 0002 (`client_directors` columns).

**Existing backfill SQL:** **none.** No `INSERT INTO client_persons`, no `source_system`
population, and no person-migration script exists (only the 0015/0016 definitions and the
D2a/D2b verification kits reference these objects).

**Migration numbering:** highest existing is **0018** (D2b DELETE closure). **`0019` is free
and reserved for the D3 backfill** (not authored in this phase).

---

## B. Read-only discovery SQL (V2 only) — what it reports

`M1B_D3_legacy_person_discovery_readonly.sql` — 9 blocks, all SELECT, no writes, no sensitive
values (counts / IS-NULL / regex predicates / GROUP BY over normalised values never emitted /
jsonb key names only; Aadhaar last-four/masked **counted only**):

| Block | Reports |
|---|---|
| 1 | clients with non-empty `directors`; total director entries; non-array/non-object malformed counts; distinct director jsonb key names |
| 2 | counts by `client_type` (clients carrying directors) |
| 3 | per-entry field presence/quality: missing name; PAN present/valid/malformed; DIN present/valid; role(≈designation) present; no-PAN-and-no-DIN weak identity |
| 4 | **Aadhaar exclusion sizing** — entries carrying `aadhaar_last4`/`aadhaar_masked` (counts only) + proof no raw `aadhaar` key exists |
| 5 | dedupe candidates — **same-client** repeated PAN/DIN/name (collapse candidates) **and** **cross-client** repeated PAN/DIN identities (separate associations, not merges); group counts only, **values never emitted** |
| 6 | ambiguous records: name-only with no secondary signal; a valid PAN mapping to multiple distinct names |
| 7 | `client_directors` size, joinability, valid-PAN, Aadhaar-carrying, missing-name (secondary source) |
| 8 | target state: `client_persons` rows, already-backfilled rows, clients with directors **and** existing persons (collision), `client_persons_source_uq` present |
| 9 | **protected baseline** for post-backfill verification (clients all/active, directors-jsonb probe, client_persons, remediation flags, audit_log, trackers, compliance_calendar) |

Run on V2 by the authorised executor; preserve the output as the design's grounding evidence.

---

## B-Results. Discovery execution results — V2 / yav2-dev, 2026-07-18 (READ-ONLY, counts only)

Executed on V2 (`ogjrwemjefvccpyjwxuo`) by the authorised executor (PJ) in the SQL Editor.
**No write occurred** (9 SELECT/CTE blocks). All figures below are **counts / key names only —
no Aadhaar, PAN, name, mobile or email value is recorded anywhere.**

- **Block 1 — source sizing.** `clients_total = 13`; `clients_with_nonempty_directors = 11`;
  `total_jsonb_director_entries = 26`; `not_array = 0`; `elements_not_object = 0`. Distinct
  director keys: `aadhaar, aadhaar_last4, aadhaar_masked, din, email, mobile, name, pan, role`
  — the raw `aadhaar` key **is present** (Block 4 correction).
- **Block 2 — by entity type.** Individual: 1 client / 1 entry; Private Limited Company:
  10 clients / 25 entries.
- **Block 3 — field presence (26 entries).** `missing_or_blank_name = 0`;
  `has_role_designation = 26`; **`has_pan = 0`, `has_valid_pan_format = 0`, `has_din = 0`,
  `has_valid_din_format = 0`** → **every entry lacks PAN and DIN**;
  `no_pan_and_no_din_weak_identity = 26`. Consequence: the PAN and DIN legs of the dedupe ladder
  resolve **nothing** on this data — identity rests on name + secondary signal only.
- **Block 4 — Aadhaar (CORRECTED; counts only, no values).**
  `with_aadhaar_last4 = 2`, `with_aadhaar_masked = 2`, `any (last4|masked) = 2`; **raw
  `aadhaar` key = 24**. **The earlier `expect_0` assumption is factually wrong on live V2 — 24
  of 26 legacy entries carry a raw `aadhaar` key** (recorded as a count only; no value exposed).
  **No Aadhaar digit (raw / last-four / masked) may be copied into `client_persons`.** If a
  backfill is later approved, `aadhaar_verification_status` must remain the neutral
  **`'Not Provided'`** — legacy Aadhaar metadata is **never** treated as verification.
- **Block 5 — dedupe candidates.** All zero (`same_client_dup_pan/din/name = 0`,
  `cross_client_pan/din_identities = 0`) — consistent with PAN/DIN being empty.
- **Block 6 — ambiguous.** `name_only_no_secondary_signal = 16`;
  `valid_pan_mapping_to_multiple_names = 0`. **16 of 26 entries are AMBIGUOUS** (name-only, no
  PAN/DIN and no mobile/email) and **must NOT be represented as deterministically resolved
  identities.** The other **10 carry at least one secondary signal (mobile/email)** but are
  **not** automatically migratable: the design requires name **+ supporting evidence within the
  same client**, and whether these 10 clear that bar is an **unresolved decision**, not settled.
- **Block 7 — legacy `client_directors`.** `rows = 0` (all related counts 0) → empty; the jsonb
  is the sole legacy source.
- **Block 8 — target + collision.** `client_persons_rows = 0`; `backfilled_rows = 0`;
  `clients_with_directors_AND_existing_persons = 0` (**no source collision**);
  `client_persons_source_uq_present = 1` (**idempotency unique index exists**).
- **Block 9 — protected baseline (must-not-change).** `clients_all = 13`, `clients_active = 13`,
  `client_persons = 0`, `client_remediation_flags = 0`, `audit_log = 20`,
  `accounting_tracker = 312`, `financials_tracker = 120`, `income_tax_tracker = 26`,
  `compliance_calendar = 0`, `clients_directors_jsonb_unchanged_probe = 26`.

**State summary:** `client_directors` and `client_persons` are **empty** (0 rows); **no source
collision**; the **source unique index exists**. **Migration 0019 remains BLOCKED** — the audit
OPEN BLOCKER (§C-Audit) plus two data-driven gates (16 ambiguous records; 24 raw-`aadhaar`-key
records) are unresolved (§D). *(Governance note: the frontend `src/lib/aadhaar.js` comment
claiming "0 of 24" entries carry a raw `aadhaar` key is stale — live V2 shows 24; that file is
out of scope here and is not modified.)*

---

## C. Proposed backfill design (migration 0019 — NOT authored here)

**Source → target field mapping (`clients.directors` jsonb → `client_persons`):**

| jsonb key | client_persons column | transform / rule |
|---|---|---|
| `name` | `full_name` | `btrim`; **required** — missing/blank → not inserted; remediation candidate (§missing) |
| `role` | `person_type` | map to the person_type vocabulary; default `'Director'` |
| `pan` | `pan` | `upper(btrim)`; format-validated; malformed → kept null + flagged (not silently dropped) |
| `din` | `din` | `btrim` |
| `mobile` | `mobile` | `btrim` |
| `email` | `email` | `lower(btrim)` |
| `aadhaar_last4` | — | **DROPPED — never copied** (recorded only as an exception count) |
| `aadhaar_masked` | — | **DROPPED — never copied**; presence does **not** imply verification |
| (all persons) | `aadhaar_verification_status` | neutral approved value **`'Not Provided'`** (the NOT-NULL default; null is not permitted) — **never** inferred from legacy masked/last-four; legacy Aadhaar presence → exception/remediation item |
| (absent) | `designation` | `null` (not in jsonb) |
| (absent) | `nationality` | default `'Indian'` |
| (absent) | `appointment_date`,`cessation_date` | `null` |
| (absent) | `is_active` | `true` |
| (absent) | `is_primary_contact` | `false` (not derived in D3) |
| `clients.id` | `client_id` | **uuid** of the row holding the jsonb — never `clients.client_id` (YA-code) |
| — | `source_system` | `'legacy_jsonb'` (or `'client_directors'` for source 2) |
| — | `source_ref` | stable key: `clients.id || '#' || (array ordinality)` (jsonb) / `client_directors.id` (table) |
| — | `source_hash` | hash of normalised `(name,pan,din,mobile,email,role)` — drives idempotent re-run |
| — | `backfill_batch_id` | one uuid per backfill run |
| — | `created_by`,`updated_by` | `null` (service backfill; see audit) |

**Relational key:** `client_id = clients.id` (uuid) exclusively. For `client_directors`,
resolve `clients.id` via `client_directors.client_id (text) = clients.client_id`.

**Dedupe is PER-CLIENT.** A `client_persons` row is an association of a person **to one
client**; the same natural person legitimately has one row per client they belong to.
Deduplication therefore operates **within a single `client_id`**, never across clients.
- **Same-source duplicate** — the identical legacy entry seen again (same `source_ref`):
  idempotent no-op (see below), not a new row.
- **Same-client duplicate** — two different legacy entries **under the same client** that
  resolve to the same person by the ladder below: collapse to **one** canonical
  `client_persons` row for that client; the other is bucketed `duplicate` (lineage recorded).
- **Cross-client repeated identity** — the same PAN/DIN under **different** clients: these are
  **separate, legitimate per-client associations** — **each keeps its own `client_persons`
  row** and they are **never merged**.

Within-client resolution ladder (deterministic; no auto-merge of ambiguity):
1. **valid PAN** (`^[A-Z]{5}[0-9]{4}[A-Z]$`) — same normalised PAN within the client ⇒ same person;
2. else **valid DIN** (`^[0-9]{8}$`) — same DIN within the client ⇒ same person;
3. else **normalised full_name + supporting evidence** (same client AND matching mobile/email);
   a bare name match with **no** evidence is not sufficient;
4. anything matching only on a weaker/partial basis, or a PAN that maps to conflicting names,
   is **AMBIGUOUS** → **NOT merged, NOT inserted as canonical**; bucketed `ambiguous` and
   raised as a remediation candidate for manual resolution via the D2b RPCs.

**Idempotent / rerunnable — exact mechanism:**
- **Unique constraint used by `ON CONFLICT`:** the **partial** unique index
  `client_persons_source_uq` = `UNIQUE (client_id, source_system, source_ref) WHERE
  source_system IS NOT NULL` (migration 0016). A partial index requires the conflict target to
  name both the columns **and** the predicate: `ON CONFLICT (client_id, source_system,
  source_ref) WHERE source_system IS NOT NULL`.
- **Canonical `source_hash` inputs:** a stable hash of the NORMALISED identity/content fields
  only — `lower(collapsed full_name)`, `upper(pan)`, `trim(din)`, `trim(mobile)`,
  `lower(email)`, mapped `person_type`. **Excludes** Aadhaar (`aadhaar_last4`/`aadhaar_masked`)
  and volatile formatting (whitespace/case) so cosmetic differences are not counted as changes.
- **Changed source rows:** a row whose `source_ref` already exists but whose recomputed
  `source_hash` **differs** from the stored one means the legacy content changed since the last
  run → bucketed **`changed`** and reported for review; it is **not** silently skipped and
  **not** silently overwritten.
- **Not `ON CONFLICT DO NOTHING` alone:** every source entry is explicitly classified into
  outcome buckets — **`inserted` · `unchanged` (already migrated, same hash) · `changed`
  (same `source_ref`, different hash) · `duplicate` (same-client) · `ambiguous` · `malformed`
  · `rejected`** — so a re-run yields an auditable reconciliation, not a silent swallow.
  `inserted + unchanged + changed + duplicate + ambiguous + malformed + rejected` must account
  for **every** legacy source entry.

**Transaction & rollback:** one transaction per batch (BEGIN/COMMIT), fail-closed
preconditions (project attestation, target/lineage objects present, owner BYPASSRLS,
`0014`/`0016`/`0017`/`0018` untouched). Rollback deletes **strictly by `backfill_batch_id`**
and **only before any manual edit**; after edits → backup + forward-fix. **`clients.directors`
is never mutated or deleted** (it remains the untouched recovery baseline).

**No Aadhaar:** neither `aadhaar_last4` nor `aadhaar_masked` nor any Aadhaar digit is copied.
`client_persons` has no digit column; `aadhaar_verification_status` is set to the neutral
approved value **`'Not Provided'`** for every backfilled person (its NOT-NULL default; null is
not permitted). The presence of legacy masked/last-four is **never** taken as evidence of
verification — it is recorded only as an exception/remediation item.

**Missing names / malformed:** a director object with a missing or blank `name` is **never
inserted** and **no placeholder name is generated**; it is routed to the **exception report**
(bucket `missing_name`) and, at reviewer option, raised as a remediation candidate. Clients
whose `directors` is non-array, or whose element is non-object, are bucketed `malformed` and
not inserted. Malformed PAN → stored `null` + flagged, never as a wrong value.

**Audit strategy — OPEN BLOCKER (must be resolved before Migration 0019 is authored).**
- **Existing approved audit-write path:** the only approved emitters are
  `public.audit_write_event` (0016) and the read-audit `_write_read_audit` (0007). Both
  **require a non-null `auth.uid()`**, re-check `is_active_user()`/`is_admin_or_manager()`,
  hard-code `initiated_by_type='user'`, and validate via `audit_validate_event`.
- **Executing DB role in a migration:** the migration/SQL-Editor executor role (observed to be
  `postgres`, which holds BYPASSRLS — the property that lets the D2a helper write the
  FORCE-RLS `audit_log`). It has **no JWT**, so `auth.uid()` is NULL and the approved emitters
  **RAISE `NO_AUTH_CONTEXT`**. There is therefore **no approved audit path callable from a
  backfill migration**.
- **Audit actor representation:** the `audit_log` *schema* (0005) permits a non-user actor
  (`initiated_by_type='service'` + `actor_service NOT NULL`, `actor_user_id NULL`, per
  `chk_actor_service`), but **no approved service-audit event contract or emitter exists**, and
  a direct `audit_log` insert would bypass `audit_validate_event`. **This design does NOT
  assume a service actor, does NOT invent a user UUID, and does NOT add a bypass function.**
- **Batch linkage (available now, audit-independent):** `client_persons.backfill_batch_id`
  (0016), with `source_system`/`source_ref`/`source_hash`, is the DB-level provenance/batch key
  that identifies which run produced or last-touched each row — with **no** `audit_log` change.
- **Transactional failure behaviour:** the backfill is a single transaction; any failure or
  post-condition breach rolls back **all** person inserts **and** any audit rows atomically —
  no partial batch, no orphan audit row.
- **Why "just run it as an authenticated Admin/Manager" is NOT a currently-available path:**
  a SQL Editor or migration connection runs as the executor DB role (`postgres`) and does
  **not** automatically receive the portal user's JWT or populate `auth.uid()`. An Admin/Manager
  merely executing the migration therefore does **not** satisfy the approved user-path emitters.
- **Options for the reviewer (NONE selected here):**
  1. **Approve a governed migration/service audit event contract and an explicit emitter** for
     the backfill actor.
  2. **Approve lineage-only provenance** for this controlled one-time backfill —
     `backfill_batch_id` / `source_system` / `source_ref` / `source_hash` plus complete
     read-only verification evidence — with no `audit_log` rows written by the backfill.
  3. **Separately design and review an authenticated administrative RPC/job mechanism** that
     runs with a **real Admin/Manager JWT** (so `auth.uid()` and the approved user path apply).
     This is **future design work — not currently available and NOT part of Migration 0019
     unless separately approved.**
- Until one is approved, **audit remains an OPEN BLOCKER and Migration 0019 must not be
  authored.**

**Expected verification checks (post-run, read-only kit at authoring):** `client_persons`
increased by exactly `inserted`; `inserted + duplicate + ambiguous + skipped` accounts for
every legacy source entry; `clients.directors` jsonb length **unchanged**; every protected
baseline count from Block 9 **unchanged** (clients/trackers/calendar/remediation);
`client_persons_source_uq` enforced (no duplicate lineage); no Aadhaar digit present in any
new `client_persons` row.

**Proposed error / exception report (design):** per client and in total — buckets
`inserted | duplicate | ambiguous | unmatched | skipped(idempotent) | malformed | missing_name`,
plus `aadhaar_dropped` count; emitted read-only, values-free (codes/counts only).

---

## D. Open questions (for reviewer)
1. **Audit is an OPEN BLOCKER (§C-Audit)** — pick (1) a governed migration/service audit event
   contract + explicit emitter, (2) lineage-only provenance for this one-time backfill, or
   (3) a separately-designed authenticated administrative RPC/job with a real Admin/Manager JWT
   (future work, not part of 0019 unless separately approved). A postgres migration / SQL-Editor
   connection does not receive a portal JWT, so "just run it as an Admin" is **not** a path. No
   service actor, user UUID, or bypass is assumed until approved.
2. **16 ambiguous records (§B-Results Block 6)** — 16 of 26 entries are name-only with **no**
   PAN/DIN and no mobile/email. They **must not** be treated as deterministically resolved
   identities. Decision required: exclude from 0019, route to a D4 remediation queue, or hold.
   The 10 entries with a secondary signal (mobile/email) are **not** automatically migratable —
   whether "name + same-client evidence" is satisfied is itself an open decision, not settled.
3. **24 raw-`aadhaar`-key records (§B-Results Block 4)** — 24 of 26 legacy entries carry a raw
   `aadhaar` key (counts only; no value read). Decision required on how the backfill **ignores**
   this key so no Aadhaar digit reaches `client_persons`, and confirmation that
   `aadhaar_verification_status` stays neutral `'Not Provided'`. (The stale `src/lib/aadhaar.js`
   "0 of 24" comment is out of scope here and is not modified.)
4. `person_type` mapping from the jsonb `role` values (confirm the role→person_type table).
5. Should `missing_name` / `malformed` entries raise remediation candidates in D3, or be
   left entirely to D4?
6. Is the `client_directors` (secondary, ~0-row) source in scope for 0019, or jsonb-only?
7. `is_primary_contact` derivation — leave `false`, or infer from `role`/order?

---

## E. Confirmations
- No SQL executed; discovery SQL is read-only and **not run**. No MCP used (V1 exposure avoided).
- No migration authored (0019 reserved, not written); `0014`/`0016`/`0017`/`0018` untouched.
- No DML/DDL, no source/frontend change, no D4/P2.2/service-applicability/compliance work.
- `clients.directors` mutation/deletion explicitly excluded from the design.

**D3 remains at DISCOVERY. Migration 0019 is NOT authored. Awaiting independent review of this
discovery + design before any authoring.**
