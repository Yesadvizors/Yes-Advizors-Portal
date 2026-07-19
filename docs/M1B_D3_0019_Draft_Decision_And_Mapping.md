# M1-B D3 — Migration 0019 — CANCELLED (superseded by PJ sample-data confirmation)

> # 🛑 MIGRATION 0019 IS CANCELLED — NEVER EXECUTED
>
> **PJ has confirmed that all 26 legacy `public.clients.directors` JSONB entries are sample/testing data** — not real legacy records — and are **disposable**. No preservation or migration is required. **Migration 0019 is cancelled before execution.**
>
> - The previously approved **10-migrate / 16-HELD** treatment is **SUPERSEDED**. No backfill is required. **D3 discovery remains valid evidence of the database contents; the proposed backfill treatment was superseded after PJ confirmed that all 26 records were sample/testing data.**
> - **No rows were inserted** into `public.client_persons`. **No database data was deleted or mutated.** No SQL was executed; no Supabase connection; no MCP; no commit/push; no deploy.
> - **HMAC identity lock is not required.** A draft HMAC approval-manifest SQL file was prepared locally but was **never executed**. **No HMAC output manifest was generated or approved.** **No secret was stored in the repository, documentation, committed history, or shared review output.**
> - The sample data will be removed later via a **separately reviewed V2 Clean-Start Reset** after implementation and testing are complete — see `docs/M1B_Future_V2_Clean_Start_Reset_Task.md`. **That reset is NOT authored or executed now.**
> - The executable 0019 package (2 drafts + 5 verification SQL) was **never committed** and has been **deleted locally**; this closure record is the sufficient historical evidence. No executable 0019 SQL is retained anywhere in the working tree.
>
> **Everything below is retained as the historical decision trail only, and is entirely superseded by this cancellation.** The D3 *discovery* evidence (that 26 sample entries were discovered and classified) is preserved separately in `docs/M1B_D3_Discovery_And_Design_Report.md`, `docs/M1B_D3_Supplementary_Design_Rules_Addendum.md`, and the `M1B_D3_*_discovery_readonly.sql` files.

**Superseded status (historical):** Migration 0019 was prepared as **DRAFT / NOT EXECUTED / NOT APPROVED FOR RUN** and never left draft. No SQL executed, no Supabase connection, no application code changed, no commit/push, no deploy. No personal values appear anywhere in this record.

**Governing commit:** `ea7171251668f278c6a17b7333d5056d5118f4a8` · branch `ui/redesign-v1`
**Authorised project:** V2/yav2-dev `ogjrwemjefvccpyjwxuo`. V1/Production `zcszesuvjrryxtigjglt` strictly prohibited.

---

## 0. Closure record (governing)

| Item | Outcome |
|------|---------|
| Business fact | All 26 `clients.directors` JSONB entries are **sample/testing data** (PJ-confirmed), disposable |
| Migration 0019 | **CANCELLED before execution**; never executed; remains outside `supabase/migrations/` |
| 10-migrate / 16-HELD treatment | **Superseded** — no backfill required |
| Rows inserted into `client_persons` | **0** |
| Database data deleted/mutated | **None** |
| HMAC identity lock | **Not required.** A draft HMAC approval-manifest SQL file was prepared locally but never executed; no HMAC output manifest was generated or approved; no secret was stored in the repository, documentation, committed history, or shared review output |
| Executable 0019 package | **Never committed; deleted locally.** No executable 0019 SQL is retained in the working tree — this closure record is the sufficient historical evidence |
| D3 discovery | **Remains valid evidence of database contents** (discovery reports + `*_discovery_readonly.sql` preserved); only the proposed backfill *treatment* is superseded |
| D3 outcome | **CLOSED — NO MIGRATION REQUIRED / SAMPLE DATA** |
| Sample-data removal | Deferred to a **separately reviewed V2 Clean-Start Reset** (not now) |
| D4 / P2.2 | **Not started** by this closure |

---

## 1. Live supplementary execution results (V2/yav2-dev, PJ-confirmed)

**Source universe:** clients_total = 13; clients carrying entries = 11; total JSONB array elements = 26; object elements = 26; non-object elements = 0; `all_array_elements_are_objects` = true; `matches_protected_baseline_26` = true.

**Candidate partition:** candidate_total = 10; held_total = 16; excluded_total = 0; `CAND_name_unique_mobile_only` = 10; `HELD_name_only_no_signal` = 16; repeated names = 0; missing names = 0; any PAN = 0; malformed PAN = 0; buckets mutually exclusive = true; reconciliation total = 26.

**client_persons state:** 0 rows. Columns (reviewed): `person_type` text NOT NULL default `'Director'`; `full_name` NOT NULL; `mobile`/`email` nullable; `is_primary_contact` NOT NULL default false; `aadhaar_verification_status` NOT NULL default `'Not Provided'`; `source_system`, `source_ref`, `source_hash` nullable; `backfill_batch_id` uuid nullable; `created_by` nullable (plus `designation`, `is_active`, `pan`, `din`, `updated_by` per target mapping).

**Constraints:** `client_id` FK → `clients(id)` uuid ON DELETE RESTRICT; Aadhaar status allowed = `Not Provided` / `Masked Only` / `Verified` / `Exception`; no `person_type` check; no PAN/DIN check.

**Indexes:** `client_persons_source_uq` UNIQUE on `(client_id, source_system, source_ref) WHERE source_system IS NOT NULL`; no name/mobile/email/PAN/DIN uniqueness.

**Role vocabulary:** `director` = 25, `person` = 1; `person_type` enum discovery returned 0 rows (column is plain text).

---

## 2. PJ final business decision — APPROVED

- **Migrate the 10** records classified `MIGRATE_CANDIDATE / NAME_UNIQUE_MOBILE_ONLY`, treated as **weak-identity, unverified** persons.
- **Keep the 16** records `HELD / HELD_NAME_ONLY_NO_SIGNAL` — **not inserted** into `client_persons`.
- **No** Aadhaar value/digit/last-four/masked/evidence-ref/verification-inference/exception copied. **No** PAN, **no** DIN copied.
- **No** `client_remediation_flags` write. **D4 deferred.**
- Provenance = **lineage-only** (no `audit_log` write).

### 2.1 PJ `source_hash` governance decision — APPROVED

- For this **closed 10-row** Migration 0019 backfill, `source_hash` is **intentionally `NULL`**.
- **No unkeyed hash** of names, mobile numbers, email, or any other personal data is stored.
- **Field-level equality** (§5) is the **approved integrity mechanism** — no stored fingerprint is needed or used.
- **No keyed HMAC / secret-management work** is required in D3.
- This is an **explicit PJ governance decision scoped to this migration only**; it does **not** establish a general rule for future migrations, which must be assessed on their own privacy footprint.

### 2.2 Final batch UUID — APPROVED

- `backfill_batch_id = 820a35b2-dfdd-41b0-9696-97969d016050` (UUIDv4) is the **final approved** batch id, substituted consistently across migration + rollback + pre/post verification + candidate manifest + this document. The files themselves **remain DRAFT / NOT EXECUTED / NOT APPROVED FOR APPLY**.

### 2.3 Approved 10-key manifest — EMBEDDED (independent review PASS)

The exact reviewed `(client_id, source_ref)` key set is embedded into the migration gate, the rollback, and pre/post verification; the empty-`WHERE false` sentinel has been **removed**. These are **non-value control identifiers containing no names, mobile numbers, email, PAN, DIN or Aadhaar** — client business-entity UUIDs + rank-based `source_ref` only:

| client_id | source_ref |
|-----------|------------|
| `41218d34-1cce-4ede-ab12-fef535bf20c0` | `ldj_v1:r1` |
| `5ce708e7-e0bc-4788-8f69-d96915b005c1` | `ldj_v1:r1` |
| `9d027482-7b8a-4b3e-a2af-9492ff087162` | `ldj_v1:r1` |
| `9d027482-7b8a-4b3e-a2af-9492ff087162` | `ldj_v1:r2` |
| `aef05357-d569-4e1e-996d-333768112ae7` | `ldj_v1:r1` |
| `aef05357-d569-4e1e-996d-333768112ae7` | `ldj_v1:r2` |
| `eca23efa-3adb-454f-be6f-3dd7ea5974da` | `ldj_v1:r1` |
| `eca23efa-3adb-454f-be6f-3dd7ea5974da` | `ldj_v1:r2` |
| `f0a1e70c-dd49-4fab-96a9-0af34999abeb` | `ldj_v1:r1` |
| `f0a1e70c-dd49-4fab-96a9-0af34999abeb` | `ldj_v1:r2` |

Six client entities (four carrying two candidates, two carrying one) = **10 keys**. The migration aborts unless the live-derived candidate key set equals this manifest **exactly**; ALREADY-APPLIED additionally requires the **stored** keys to equal it exactly.

> **The `(client_id, source_ref)` rank manifest proves lineage and uniqueness — it does NOT alone prove the exact ten *people*.** A name/mobile substitution within a client can preserve the same `r1/r2` keys, and in PRE-APPLY there are no stored rows for field-level equality to catch it. Exact-person identity is therefore additionally locked by a keyed HMAC (§2.4).

### 2.4 Exact-person identity lock — keyed HMAC (precondition only)

- **Mechanism.** Each approved candidate is bound to a **keyed HMAC-SHA256** over a canonical, length-prefixed, versioned identity representation. The migration recomputes each current candidate's HMAC and aborts unless the computed set equals the **10 reviewed HMACs exactly** (none missing, none unexpected, exactly ten). A substitution changes the HMAC → abort.
- **Canonical identity rep v1** (IDENTICAL across the approval-manifest SQL, the migration precondition gate 1f2, and pre-verification PRE-8):
  ```
  'YAV2|D3|IDENTV1'
    || '|cid:'||length(client_id)||':'||client_id
    || '|nam:'||length(name_key)||':'||name_key
    || '|mob:'||length(mobile_n)||':'||mobile_n
    || '|eml:'||length(email_n)||':'||email_n
    || '|rol:'||length(role_norm)||':'||role_norm
  ```
  with normalized fields (`name_key`/`role_norm` = lower+trim+collapse-whitespace; `mobile_n` = trim; `email_n` = lower+trim). Every field is **length-prefixed** (`len:value`) so the encoding is injective — no two distinct field-tuples can collide. `candidate_hmac = encode(extensions.hmac(<canonical>, <secret>, 'sha256'), 'hex')`.
- **source_hash stays NULL (PJ, §2.1).** The HMAC is used **only as a precondition assertion**; nothing is written to `public.client_persons.source_hash`. The embedded HMAC hex are **keyed, non-reversible control identifiers** — without the secret they disclose nothing.
- **PRE-APPLY now requires BOTH:** exact approved `(client_id, source_ref)` set **and** exact approved keyed-HMAC set.
- **Secret handling (the secret is NEVER in Git / repo SQL / docs / output / screenshots):**
  1. PJ generates a strong random secret **outside** the repository.
  2. In the authorised V2 SQL session **only**, PJ sets it as a session GUC — `SET app.d3_hmac_key = '<secret>';` — supplied manually, not from any committed file. (No `SET` with an actual secret is hard-coded anywhere.)
  3. PJ runs the approval-manifest SQL (`M1B_D3_0019_hmac_approval_manifest_readonly.sql`) with that secret, reviews the 10 emitted `candidate_hmac` values, and pastes them into the `hmac_manifest` `VALUES` lists in the migration (gate 1f2) and pre-verification (PRE-8), removing the sentinel.
  4. The **same** secret must be set again in the session that executes the migration, so the recomputed HMACs match.
  5. After D3 closure the secret is **destroyed**, or retained only under a separately approved policy.
- **Availability — CONFIRMED PASS on V2/yav2-dev** (`M1B_D3_0019_hmac_availability_readonly.sql`): `pgcrypto_installed=1`, `extensions.hmac(text,text,text)` available, `extensions.digest` available, `encode` available, `public.hmac` **unavailable**, `PASS_hmac_available=true`. The migration, approval-manifest, and pre-verification therefore use **`extensions.hmac` only** (never `public.hmac`).

---

## 3. Approved 10 / 16 treatment

| Class | Count | Action | Target rows |
|-------|-------|--------|-------------|
| `MIGRATE_CANDIDATE / NAME_UNIQUE_MOBILE_ONLY` | 10 | **MIGRATE** (weak-identity, unverified) | 10 inserted |
| `HELD / HELD_NAME_ONLY_NO_SIGNAL` | 16 | **HELD** — not inserted; recorded as non-sensitive evidence only | 0 |
| repeated-name / missing-name / PAN / malformed | 0 | n/a (none present) | 0 |
| **Total object entries** | **26** | — | **10 migrated + 16 held = 26** |

---

## 4. Final source→target mapping (`clients.directors[*]` object → `client_persons`)

| Target column | Value | Notes |
|---------------|-------|-------|
| `client_id` | `clients.id` (uuid) | FK, ON DELETE RESTRICT |
| `full_name` | source `name` (verbatim) | NOT NULL; the eligibility gate requires nonblank name |
| `mobile` | source `mobile` | present for the approved class |
| `email` | `NULL` | approved class is **mobile-only** (email absent) |
| `person_type` | `'Director'` | constant; **never** derived from role |
| `designation` | `director→'Director'`, `person→'Person'`, else `'Director'` | conservative; does not affect `person_type` |
| `is_primary_contact` | `false` | no inference |
| `aadhaar_verification_status` | `'Not Provided'` | neutral; never inferred from legacy metadata |
| `is_active` | `true` | |
| `pan` | `NULL` | never copied |
| `din` | `NULL` | never copied |
| *(all Aadhaar evidence/verification/exception fields)* | `NULL` | never copied in any form |
| `source_system` | `'legacy_clients_directors_jsonb'` | approved constant; part of unique key |
| `source_ref` | `'ldj_v1:r' \|\| row_number() OVER (PARTITION BY client_id ORDER BY name_key)` | **within-client content rank** — an integer position of this person's normalized name in the client's sorted candidate set. Not the array ordinal; not a name digest. Part of the unique key (`client_id` supplies the rest). |
| `source_hash` | `NULL` | **PJ-approved (§2.1)** for this closed 10-row backfill: no unkeyed personal-data hash stored; integrity proven by field-level equality instead. |
| `backfill_batch_id` | `820a35b2-dfdd-41b0-9696-97969d016050` (**final approved UUIDv4**) | **not** part of uniqueness; used consistently across migration + rollback + pre/post verification + manifest + this doc |
| `created_by` / `updated_by` | `NULL` | lineage-only; no actor asserted |

**Eligibility predicate (reproduces the approved classification):** object entry AND nonblank normalized name AND normalized name unique within its client AND `mobile` present AND `email` absent. This selects exactly the 10; repeated-name and name-only records are structurally excluded. A **role-vocabulary** fail-closed gate additionally aborts the migration if any object entry carries a role outside the reviewed `director`/`person` vocabulary (so the `designation` CASE never silently coerces an unreviewed role).

---

## 5. Lineage-key design, idempotency & privacy (post-review v2)

- **Unique key:** `(client_id, source_system, source_ref) WHERE source_system IS NOT NULL`. `client_id` is already part of the key, so `source_ref` only needs to disambiguate persons **within** a client. `backfill_batch_id` is **not** part of the key.
- **source_ref = within-client CONTENT RANK.** `'ldj_v1:r' || row_number() OVER (PARTITION BY client_id ORDER BY name_key)`, where `name_key` is the normalized (lower/trim/whitespace-collapsed) legacy name. The candidate gate makes `name_key` unique within its client (`ncic = 1`), so the rank is a well-defined `1..k` integer.
  - **Not the array ordinal:** derived from a deterministic *content sort*, reproducible regardless of JSONB element order — a pure reordering of `clients.directors` cannot change it.
  - **Not a name fingerprint:** it is an integer position, not a digest of the name; it is **not dictionary-testable to a name**.
  - **Privacy (stated accurately):** `source_ref` exposes **no** raw name/mobile/etc. Its only residual is that it weakly encodes the *relative alphabetical order* of a client's directors — information no greater than reading that client's own `client_persons` rows (which store the names in the clear by design). It is treated at the **row's PII tier** for export purposes (never exported/logged separately). It is **not** claimed "non-personal" and no non-reversibility claim is made or needed.
  - Yields exactly **10 distinct** `(client_id, source_ref)` keys, all matching `^ldj_v1:r[0-9]+$` (proved read-only by `d3_0019_pre6_lineage_key`).
- **source_hash = NULL (PJ-approved, §2.1).** PJ has explicitly approved leaving `source_hash` NULL for this closed 10-row backfill: **no unkeyed personal-data digest is stored**, and **field-level equality is the approved integrity mechanism** (no keyed HMAC / secret-management work in D3). Rationale that stands behind the approval: a *privacy-safe* fingerprint would require a **keyed** digest whose secret must not live in repository SQL and there is no server-side key store in D3 scope; an **unkeyed** md5 over name/mobile is a dictionary-testable fingerprint of personal data. Note too that `ON CONFLICT DO NOTHING` cannot update a stored hash, so a hash could never "record drift" post-insert — the NULL design avoids that false affordance. **This decision is scoped to this migration only and sets no general precedent.**
- **Approved-manifest protection (closed-migration key set).** Aggregate 10/16/0 counts alone do **not** authorise the run. The migration embeds a reviewed **exact key set** of the 10 non-personal `(client_id, source_ref)` pairs and, using the same candidate predicate + rank expression, aborts unless the derived candidate keys equal the manifest **exactly** (no missing key, no unexpected key, exactly 10). The manifest is produced read-only by `supabase/verification/M1B_D3_0019_candidate_manifest_readonly.sql` (client_id + rank + source_ref + classification + batch UUID only — no personal value). **The 10 reviewed keys (§2.3) are now embedded and the `WHERE false` sentinel is removed** — the gate enforces exact `(client_id, source_ref)` equality (byte-identical key list embedded in migration + rollback + pre/post verification).
- **Hardened two-state model (statically demonstrated):**
  - **PRE-APPLY** — no rows for this source (`stored = 0`) **and** the live universe/partition is exactly 10/16/0. The insert adds exactly 10; post-insert re-asserts the neutral profile → commit.
  - **ALREADY-APPLIED (proven, not assumed from count alone)** — before allowing a no-op, the pre-insert gate re-derives the expected 10-row mapping from live source and `FULL OUTER JOIN`s it to the stored rows, requiring **all** of: `expected = 10`, `stored = 10`, `extra_stored = 0`, `missing_expected = 0`, and **zero** field/predicate mismatches across `full_name`, `mobile`, `email`, `person_type`, `designation`, `is_primary_contact`, `is_active`, `pan`/`din` null, `source_hash` null, `backfill_batch_id = <approved uuid>`, `aadhaar_verification_status = 'Not Provided'`, and all Aadhaar evidence/verification/exception fields null — plus no duplicate source-key groups. Only then does the `ON CONFLICT DO NOTHING` insert no-op. `d3_0019_pre7_two_state_equality` / `d3_0019_post9_exact_equality` report the deltas.
  - **PARTIAL / DRIFTED** — **any** other state (`stored ∉ {0,10}`, any set delta, any field mismatch, any duplicate key) **aborts** before insert and rolls back. Count = 10 **alone never** proves ALREADY-APPLIED.
- **Ordinal-reordering risk — RESOLVED** (key no longer depends on element order).
- **Residual (accepted, fail-closed) risk — content change between runs.** Because the rank depends on the client's candidate **name set**, any add/remove/rename within that client can shift ranks. Such a change is a genuine data drift and is **caught and aborted** by the two-state equality gate (never a silent duplicate or silent update). Stability of `source_ref` is therefore claimed **only** while the approved candidate name set is frozen; this is stated as a condition, not a guarantee.

---

## 6. Migration 0019 status

> **HISTORICAL (superseded).** The files listed in this section were the local, never-committed 0019 draft package. Following the cancellation (see banner + §0), they were **deleted locally** and no longer exist in the working tree. This list is retained only to record what had been prepared.

**DRAFT / NOT EXECUTED / NOT APPROVED FOR APPLY.** All draft/verification files were deliberately placed **outside** `supabase/migrations/` (the apply-path) so no tooling could auto-apply them:
- `supabase/drafts/0019_m1b_d3_backfill_client_persons_from_directors.DRAFT.sql` — the migration.
- `supabase/drafts/0019_m1b_d3_backfill_client_persons_from_directors_ROLLBACK.DRAFT.sql` — rollback: asserts exactly 10 matching rows for the approved `source_system` + final `backfill_batch_id`, refuses partial/extra/mixed/duplicate/stale state, deletes only those 10 (its sole write), verifies zero remaining afterward, one transaction.
- `supabase/verification/M1B_D3_0019_pre_execution_verification_readonly.sql` / `..._post_execution_verification_readonly.sql` — read-only pre/post (PRE-8 = HMAC identity lock; POST-9 = exact set + mapping equality).
- `supabase/verification/M1B_D3_0019_candidate_manifest_readonly.sql` — read-only control-identifier manifest of the 10 keys + 16 HELD + reconciliation.
- `supabase/verification/M1B_D3_0019_hmac_availability_readonly.sql` — read-only pgcrypto/`hmac` availability check (no secret).
- `supabase/verification/M1B_D3_0019_hmac_approval_manifest_readonly.sql` — read-only; run by PJ with the out-of-band secret to emit the 10 `candidate_hmac` values for embedding (no secret written to the file).

The **final approved batch UUID `820a35b2-dfdd-41b0-9696-97969d016050`** is used consistently across all of the above and this document.

**Transaction & fail-closed behaviour:** single `BEGIN … COMMIT`; additive `INSERT` only (no UPDATE/DELETE, no `clients.directors` mutation, no `audit_log`/`client_remediation_flags` write); `source_hash` written NULL. A pre-insert `DO` block aborts (RAISE → full rollback) unless every approved condition holds (columns/index/constraint present; 26/0/10/16/0/0/0/0; **role vocabulary ⊆ {director, person}**; derived expected candidates = 10; **approved-manifest exact `(client_id, source_ref)` key match**; **exact-person HMAC identity lock** — secret supplied out-of-band, `extensions.hmac` available, and the 10 computed candidate HMACs equal the 10 reviewed HMACs exactly, else BLOCKED/abort; no duplicate source-key groups; and a **proven two-state gate** — either PRE-APPLY with 0 stored rows, or ALREADY-APPLIED with exact set + field/predicate + stored-vs-manifest equality; anything else is PARTIAL/DRIFTED → abort). A post-insert `DO` block re-asserts exactly 10 rows with zero PAN/DIN/Aadhaar leakage, neutral flags, `source_ref` format, `source_hash` NULL, single approved batch id, and no duplicate keys, else rolls back. All RAISE messages carry **integer counts / UUIDs only** — no personal value is ever logged.

---

## 7. Unresolved blockers (executable promotion)

1. **`(client_id, source_ref)` manifest — embedded** (§2.3). Proves lineage/uniqueness only.
2. **Exact-person HMAC identity lock — NOT yet populated (BLOCKER).** The `hmac_manifest` in the migration (gate 1f2) and pre-verification (PRE-8) holds a sentinel → empty → the migration **aborts by construction**. Promotion requires PJ to: confirm HMAC availability (`M1B_D3_0019_hmac_availability_readonly.sql`); supply the secret out-of-band; run `M1B_D3_0019_hmac_approval_manifest_readonly.sql`; review and embed the 10 `candidate_hmac` values into the migration + PRE-8; remove the sentinel. Until then, non-executable.
3. **HMAC secret is not stored** — it must be supplied in-session at both approval and execution; if a keyed-HMAC mechanism is unavailable, promotion stays BLOCKED.
4. **Project-ref cannot be self-verified in SQL** — PJ/reviewer must confirm the connection targets `ogjrwemjefvccpyjwxuo` out-of-band.
5. **Move into `supabase/migrations/` and execution remain HOLD** pending this final independent review; the files stay outside the apply-path until then.
6. **`source_ref`/identity stability is conditional** on the approved candidate set staying frozen; any drift is caught (abort) by the two-state + manifest + HMAC gates, never silently applied.

---

**Boundaries honoured:** no SQL executed, no Supabase connection, no MCP, no application-code change, D4/P2.2 not started, no commit/push, no deploy, V1/Production untouched, **no literal personal values embedded or emitted in any file/comment/diff/test/evidence — source key names occur only as SQL field references, and no HMAC secret appears anywhere**, all files remain DRAFT / NOT EXECUTED / NOT APPROVED FOR APPLY, outside `supabase/migrations/`.
