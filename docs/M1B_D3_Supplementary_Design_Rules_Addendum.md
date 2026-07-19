# M1-B D3 — Supplementary Design-Rules Addendum (corrected rules + supplementary evidence plan)

> **⚠️ SUPERSEDED (retained as discovery evidence).** PJ confirmed all 26 `clients.directors` entries are **sample/testing data**; **Migration 0019 is CANCELLED before execution** and no backfill is required. These design rules are preserved as historical evidence only and no longer govern any executable work. See the closure record: `docs/M1B_D3_0019_Draft_Decision_And_Mapping.md`.

**Status:** PROPOSAL — documentation only. At the time of this addendum, Migration 0019 had not yet been authored. A later local draft was prepared but ultimately cancelled and never executed. No SQL has been executed, no Supabase connection made, no application code changed, no commit/push, no deploy. Nothing here assumes approval.

**Governing commit:** `558e3cf7072e0311048a9657097430fef46d3066` · branch `ui/redesign-v1`
**Authorised project:** V2/yav2-dev `ogjrwemjefvccpyjwxuo`. V1/Production strictly prohibited.
**Reviewer decision that produced this addendum:** HOLD — bounded supplementary read-only evidence required before Migration 0019 may be authored.

This addendum is a companion to `docs/M1B_D3_Discovery_And_Design_Report.md`. Where the two differ, the corrected rules below govern. The supplementary read-only evidence is gathered by `supabase/verification/M1B_D3_supplementary_discovery_readonly.sql` (Sections A, B, S, C, D, E and F — Section S is the full JSONB source-universe reconciliation).

---

## 1. Corrected design rules (supersede any conflicting earlier wording)

| # | Corrected rule | Change vs. earlier proposal |
|---|----------------|-----------------------------|
| R1 | **Lineage-only provenance** is provisionally preferred for the one-time backfill — **subject to confirmation** (Section A/B) that the required lineage columns (e.g. `source_system`, `batch_id`) and their constraints actually exist. Not assumed until proven. | Now gated on schema proof |
| R2 | The **16 name-only records are HELD** and are **not migrated**. | Unchanged, reaffirmed |
| R3 | Name + secondary evidence (mobile/email) may be considered **only when the normalized name is unique within that client**. | Tightened |
| R4 | **Repeated normalized names within the same client are NOT collapsed and NOT auto-merged.** They are **HELD** unless deterministic distinguishing evidence exists. | **CORRECTION** — the earlier report's "collapse same-client repeated names to one row" recommendation is **retracted**. |
| R5 | **Missing / blank-name entries are EXCLUDED.** | Reaffirmed |
| R6 | **Malformed PAN values are never copied** (dropped; row may still qualify on other rules). | Reaffirmed |
| R7 | **`client_directors` is provisionally out of Migration 0019 scope** (0 rows; jsonb-only source). | Reaffirmed |
| R8 | **`is_primary_contact` is provisionally `false`** for every migrated row (no inference). | Reaffirmed |
| R9 | **No Aadhaar value, digit, last-four or masked representation may be copied**; `aadhaar_verification_status` stays neutral where such a column exists. | Reaffirmed |
| R10 | **No `client_remediation_flags` write is authorised.** D4 remains deferred; HELD/EXCLUDED are recorded only as non-sensitive manifest evidence. | Reaffirmed |

### Retraction note (R4)
The earlier design report (Decision 3) proposed collapsing same-client repeated names via a "same-client dedupe" step. **That proposal is retracted.** Under the corrected rule, two entries sharing a normalized name within one client are treated as **potentially distinct persons** and are **HELD** — never merged — unless deterministic distinguishing evidence is later supplied. No automatic merge is performed by Migration 0019.

---

## 2. Idempotency is NOT yet assumed

Idempotency depends on the **exact** definition of `client_persons_source_uq` and any other unique constraint (Section B), which has not yet been read from the live schema. Accordingly:

- **The existing unique index is not assumed sufficient.** Its column list / expression / partial predicate must be inspected (Section B) before any idempotency claim is made.
- **Candidate stable per-entry source key:** `(client_id, source_ordinal)`, where `source_ordinal` is the 1-based position of the entry in `clients.directors` via `jsonb_array_elements(...) WITH ORDINALITY`. Section C proves this key's cardinality (= object-entry count) and uniqueness on current data.
- **Ordinal stability caveat:** array ordinal is stable for a one-time run while `clients.directors` is immutable, but is **not guaranteed stable across future application edits** to the array. Therefore a robust idempotency key must be one that the *index actually enforces* — confirmed only after Section B is read. If the index does not cover a stable per-entry key, idempotency must be redesigned before authoring.
- **Same-name separation without merge:** because the stable key is `(client_id, source_ordinal)` — never the name — two entries with the same name occupy **different ordinals** and therefore remain **separate keys**. This guarantees no name-based auto-merge (aligns with R4). Note this concerns key mechanics only; per R4 such repeated-name entries are HELD, not migrated, in Migration 0019.
- **Rerun behaviour when `batch_id` changes:** `batch_id` is provenance metadata only and **must not** participate in the uniqueness key. Reruns must be de-duplicated by the stable per-entry source key (independent of `batch_id`), so a new `batch_id` on rerun cannot create duplicate rows.

---

## 3. Weak-identity partition (definition; counts to be filled by Section E)

Mutually exclusive buckets, assigned by strict priority over the object entries of `clients.directors`:

1. `EXCLUDED_missing_name` — name null/blank → **EXCLUDED**
2. `HELD_repeated_name` — name repeated within the same client → **HELD** (R4)
3. `CAND_name_unique_both` — name unique in client + mobile **and** email → **CANDIDATE**
4. `CAND_name_unique_mobile_only` — name unique in client + mobile only → **CANDIDATE**
5. `CAND_name_unique_email_only` — name unique in client + email only → **CANDIDATE**
6. `HELD_name_only_no_signal` — name unique in client, no secondary signal → **HELD** (the 16)

**Malformed PAN** is a **non-partitioning overlay** flag: it never moves a row between buckets; per R6 the malformed value is simply never copied. Reconciliation invariant to be verified by Section E: `candidate_total + held_total + excluded_total = current object-entry source total`, with pairwise overlaps = 0 (buckets are exclusive by construction). The protected baseline expectation is **26** and **must be verified at execution** (Section S and the Section E `object_entry_total_equals_baseline_26` flag report whether the current total equals 26 — it is never assumed).

**Full-universe accounting (Section S).** The classification in Sections C/E/F covers **object** array entries only. Section S reconciles the complete `clients.directors` universe (array / null / non-array `directors`; total array elements; object vs non-object elements). Any **non-object array element**, if present, is outside the classified universe and **keeps Migration 0019 BLOCKED until explicitly handled** (Section S emits `non_object_elements_block_migration`).

---

## 4. Manifest design (controlled, non-sensitive execution evidence)

**Recommended mechanism:** a per-entry manifest whose **evidence-row identity within one saved execution artifact** is `(batch_id, client_id, source_ordinal)`, carrying **only** non-sensitive fields:

| Field | Type | Notes |
|-------|------|-------|
| `client_id` | uuid | client identifier, not a personal value |
| `source_ordinal` | int | 1-based array position (stable per-entry key candidate) |
| `outcome_code` | text | `MIGRATE_CANDIDATE` \| `HELD` \| `EXCLUDED` |
| `reason_code` | text | `NAME_UNIQUE_BOTH` \| `NAME_UNIQUE_MOBILE_ONLY` \| `NAME_UNIQUE_EMAIL_ONLY` \| `HELD_REPEATED_NAME` \| `HELD_NAME_ONLY_NO_SIGNAL` \| `EXCLUDED_MISSING_NAME` |
| `overlay_malformed_pan` | bool | diagnostic only; never a stored PAN value |
| `batch_id` | text/uuid | scopes manifest evidence rows to one saved run (part of the **manifest evidence-row identity**); **not** part of the migration idempotency key |

**Explicitly excluded from the manifest:** any name, PAN, Aadhaar (raw/last-four/masked), mobile, or email value; **and any hash of a personal value** — a hash over the tiny legacy name domain is potentially reversible, so it is deliberately not used.

**Two distinct keys — do not conflate:**
- **Manifest evidence-row identity** (within one saved execution artifact): `(batch_id, client_id, source_ordinal)`. `batch_id` scopes rows to a single captured run so re-captures do not collide within the evidence artifact.
- **Proposed migration idempotency candidate** (for `client_persons`): `(client_id, source_ordinal)`, **independent of `batch_id`**. This is a **candidate only** — it remains subject to ordinal stability (§2) and to the live `client_persons_source_uq` index/schema evidence (Section B), and is **neither approved nor proven sufficient**. Ordinal-based idempotency is not assumed.

**Governance-safe form:** Section F of the supplementary SQL is a **controlled, non-sensitive record-level execution-evidence output** (it returns exactly these non-sensitive columns with `batch_id` NULL). It is a **transient SQL result set and is not inherently durable**: it becomes durable evidence **only if PJ saves it into an approved controlled evidence artifact, or later approves a dedicated manifest table**. **No manifest table is created in this task.** Because R10 forbids `client_remediation_flags` writes and R1 prefers lineage-only provenance, no new table is written here. Migration 0019, if approved, would reuse this exact classification logic.

---

## 5. Supplementary evidence file map (read-only)

`supabase/verification/M1B_D3_supplementary_discovery_readonly.sql`:

- **Section A** → client_persons columns / types / nullability / defaults / check constraints / foreign keys / person_type enum (schema-safe join through `udt_schema`) + observed values / lineage columns.
- **Section B** → B.1 complete all-index listing; B.2 the **isolated** `client_persons_source_uq` (filtered by index name) with uniqueness flag, column order, expression and partial predicate.
- **Section S** → full JSONB source universe reconciliation: array / null / non-array `directors`, total array elements, object vs non-object elements, baseline-26 check, and the non-object → migration-blocked flag.
- **Section C** → `(client_id, source_ordinal)` key cardinality + uniqueness proof; max entries per client.
- **Section D** → grouped normalized `role` counts (lowercased, whitespace-collapsed, trimmed; non-sensitive) + permitted `person_type` domain (schema-safe join) for crosswalk gap analysis.
- **Section E** → weak-identity partition counts reconciling to the current object-entry source total (baseline-26 reported, not assumed) + malformed-PAN overlay.
- **Section F** → controlled, non-sensitive record-level execution-evidence output (one row per object entry).

Every statement in that file is a `SELECT`/`WITH … SELECT` (read-only); the file contains no data-modifying or schema-changing statement and emits no personal value.

---

## 6. Items still requiring PJ's business / governance decision (unchanged, pending Section A–F evidence)

1. Accept **weak-identity migration** in principle (no PAN/DIN exists for any of the 26).
2. Confirm **lineage-only provenance** once Section A/B prove the lineage columns/constraints exist (else choose a governed audit-event contract).
3. Ratify the **"name unique within client + secondary signal"** candidate rule (R3).
4. Confirm the **`person_type` enumeration and role→type crosswalk** once Section D returns the role vocabulary.
5. Confirm **manifest form** (captured read-only evidence vs. a future authorised durable manifest table).

---

**Boundaries honoured by this addendum:** no SQL executed, no Supabase connection, Migration 0019 not authored, no application code changed, D4/P2.2 not started, no commit/push, no deploy, no approval assumed, no personal values included, V1/Production untouched.
