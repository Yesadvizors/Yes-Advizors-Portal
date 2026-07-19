# YAV2 Portal V2 — Module 1 — **M1-B D4 Remediation-Flags — Discovery & Design**

**Status: DISCOVERY & DESIGN — PASS WITH NOTES.** The read-only discovery SQL was executed by
PJ in the authorised V2 SQL Editor (SELECT/WITH only); **no database write occurred, no
remediation population was authored or executed, no migration was created, no application code
changed**. Executed results are recorded in §2A. This remains discovery/design only; the
population phase is **deferred** behind a separate approval gate.

**Baseline:** branch `ui/redesign-v1` · HEAD `e39b3ac7cd8effc78d5f54e2d66616315268513b`.
**Authorised project:** V2/yav2-dev `ogjrwemjefvccpyjwxuo` **only**. V1/Production
`zcszesuvjrryxtigjglt` strictly prohibited.
**Companion read-only evidence file:** `supabase/verification/M1B_D4_remediation_discovery_readonly.sql`
(aggregate counts + boolean/schema metadata only; every statement SELECT/WITH; zero writes).

---

## 1. D4 purpose

D4 populates `public.client_remediation_flags` with **data-quality / grandfathering flags** so
the Client Master UI (P2.x) can surface and drive resolution of records that need attention
(e.g. missing incorporation date). A flag is an **observation about a client row**, keyed by a
stable `rule_code`, at most one **open** flag per `(client_id, rule_code)`, resolvable and
audited. **This document is the discovery + design record; it authorises no population.**

## 2. Sample-data context (governing)

The current V2/yav2-dev database contains **PJ-confirmed sample/testing data** (see the D3
closure, `docs/M1B_D3_0019_Draft_Decision_And_Mapping.md`). The 26 `clients.directors`
entries — and the client rows around them — are disposable and will be removed by a
separately-reviewed **V2 Clean-Start Reset** (`docs/M1B_Future_V2_Clean_Start_Reset_Task.md`)
after implementation + testing, immediately before real onboarding.

**Consequence:** populating remediation flags now would flag disposable sample rows that the
reset will wipe. **Current counts do not represent future production counts.** Therefore D4 is
scoped here to **discovery + design + schema-readiness confirmation only**; **population is
deferred**.

## 2A. Executed discovery results (V2/yav2-dev, PJ-run, read-only) — PASS WITH NOTES

Read-only SELECT/WITH executed by PJ in the authorised V2 SQL Editor. No write occurred.

**D4-DISC-01 — client universe:** all_current **13**; production_eligible **11**;
sample_test_draft_or_inactive **2**; `is_test_client_true` **2**; `is_draft_true` **0**;
`status_not_active` **0**; `PASS_scope_reconciliation` **true**.
> **NOTE.** The 11 "production-eligible" rows are production-eligible **only because most sample
> clients are not marked `is_test_client`** (only 2 of 13 are). All current data is PJ-confirmed
> **sample/testing data** — the production-eligible scope here is a technical partition, **not**
> a set of real clients.

**D4-DISC-02 — `MISSING_INCORP_DATE` (confirmed first-pass rule; design only, NOT populated):**
missing all_current **11**; production_eligible **9**; sample_test_draft_or_inactive **2**;
`PASS_scope_reconciliation` **true**.

**D4-DISC-03 — `LEGACY_JSONB_DIRECTORS` (TEMPORARY SAMPLE-CLEANUP OBSERVATION; NOT a permanent
rule; NOT populated):** non-empty-directors all_current **11**, production_eligible **11**,
sample **0**; director-element totals all_current **26**, production_eligible **26**, sample
**0**; both `PASS_scope_reconciliation` and `PASS_element_scope_reconciliation` **true**.
(Reconciles with the D3 discovery: 11 clients / 26 sample director entries.)

**D4-DISC-04 — current remediation flags:** total **0**; open **0**; resolved **0**.

**D4-DISC-05 — CANDIDATE OBSERVATIONS (NON-APPROVED; no severity/resolution/population
authority):** malformed_pan **0**; dup_pan_groups all_current **1**, production_eligible **1**,
mixed_scope **0**; dup_gstin_groups **0**; dup_cin_groups **0**; gst_registration_mismatch **0**;
unmapped_entity_type all_current **10**, production_eligible **10**.
> **NOTE.** Do **not** treat these as genuine production defects. On PJ-confirmed sample data,
> `unmapped_entity_type = 10` and `dup_pan_groups = 1` are **sample-data artifacts**; their
> validity is re-assessed only **after** the V2 Clean-Start Reset and a clean-data review. They
> remain non-approved candidate observations requiring separate business + normalization decisions.

**D4-DISC-06 — schema:** 10/10 expected columns present; `rule_code` text, `rule_version`
integer, `batch_id` uuid; `severity` default `warn`; `resolved` default `false`; severity CHECK
present.

**D4-DISC-07 — indexes:** `client_remediation_flags_open_uq` present (unique on
`(client_id, rule_code) WHERE resolved=false`); `idx_remediation_client` present;
`idx_remediation_open` present.

**D4-DISC-08 — RLS:** enabled **true**; forced **true**.

**D4-DISC-09 — grants/policies (SECURITY NOTE ONLY — no privilege change in D4):** `anon` SELECT
**false**; `authenticated` table grants SELECT/INSERT/UPDATE/DELETE **true**; policies exist for
SELECT/INSERT/UPDATE; **no DELETE policy**. Recorded as a security observation only; **D4 does
not change any privilege, grant, RLS or policy.** (A DELETE grant with no DELETE policy means RLS
denies row deletes to `authenticated`; the standing grant is noted for a later privilege review.)

**D4-DISC-10 — remediation-function catalogue check:** remediation-named functions **0**. This is
a **name-only** check and does **not** prove the absence of a differently-named writer; a governed
remediation write path still requires **repository review** (§7).

**Overall D4 discovery/design status: PASS WITH NOTES** — schema/constraints/indexes/RLS are
structurally present; the confirmed first-pass rule and the temporary sample-cleanup observation
are evidenced; candidate observations are recorded as sample-data artifacts pending clean-data
review; population remains deferred behind a separate approval gate.

## 3. Confirmed first-pass rule and temporary cleanup observation

> **`MISSING_INCORP_DATE` (A) is the ONLY confirmed remediation rule.** `LEGACY_JSONB_DIRECTORS`
> (B) is **not a rule** — it is a temporary sample-cleanup observation only. Neither item is
> populated; nothing here authorises population.

### A. `MISSING_INCORP_DATE` — the only confirmed first-pass remediation rule (design only, NOT populated)
- **Objective condition:** `clients.date_of_incorporation IS NULL`.
- **Entity/table:** `public.clients`.
- **Discovery reports all three scopes** (`all_current`, `production_eligible`,
  `sample_test_draft_or_inactive`) with `PASS_scope_reconciliation` — see §5. **Measured (§2A):
  11 all_current / 9 production_eligible / 2 sample; reconciliation true.** (On sample data — the
  production-eligible scope is a technical partition, not real clients.)
- **rule_version:** 1. **Idempotency key:** existing `client_remediation_flags_open_uq`
  `(client_id, rule_code) WHERE resolved=false`. **Lineage:** `rule_code`/`rule_version`/`batch_id`.
- **Resolution:** closes when `date_of_incorporation` becomes non-null (manual close, or an
  auto-close rescan) → `resolved=true` + `resolved_by`/`resolved_at`.
- **Population scope (future):** any future flag population is **limited to production-eligible
  real-client records** (`coalesce(is_test_client,false)=false AND coalesce(is_draft,false)=false
  AND coalesce(status,'')='Active'`) unless a separate **test-only** exercise is explicitly
  approved and labelled non-production.
- **No population is authorised now.** Rule *design* is appropriate for real onboarding;
  *population* must wait for real data.

### B. `LEGACY_JSONB_DIRECTORS` — temporary sample-cleanup observation only (NOT a remediation rule)
- **Classification: TEMPORARY SAMPLE-CLEANUP OBSERVATION** — **not** a permanent real-client
  remediation rule.
- **Objective predicate (non-empty directors array):** implemented with an evaluation-order-safe
  `CASE` guard — `CASE WHEN jsonb_typeof(directors)='array' THEN jsonb_array_length(directors) > 0 ELSE false END`
  — so `jsonb_array_length(directors)` is never called on a non-array; `n_elem` uses the same guard.
- **Current purpose:** only to **verify sample data pending the V2 Clean-Start Reset**. The
  reset moots this observation entirely; it is not carried into real onboarding as a standing rule.
- **Discovery reports both** the non-empty-directors **client counts** (three scopes,
  `PASS_scope_reconciliation`) **and** the **director-element totals** split by scope
  (`total_director_array_elements_{all_current, production_eligible, sample_test_draft_or_inactive}`)
  with a separate `PASS_element_scope_reconciliation` proving
  `all-current elements = production-eligible + sample/test/draft/inactive`.
- **Measured (§2A):** 11 / 11 / 0 clients; 26 / 26 / 0 director elements; both reconciliations
  true — consistent with the D3 discovery (11 clients, 26 sample director entries).
- **Do not populate now.**

## 4. Candidate observations (NON-APPROVED — require separate decisions)

The read-only file reports aggregate diagnostic counts for the following, **clearly labelled as
candidate observations requiring separate business and normalization decisions**. They are **not
approved rules**; **no final severity, resolution policy, or population authority is assigned**.

| Candidate observation | Diagnostic predicate (counts only) | Open decision needed |
|-----------------------|-------------------------------------|----------------------|
| `MALFORMED_PAN` | `pan` present AND `upper(trim(pan)) !~ '^[A-Z]{5}[0-9]{4}[A-Z]$'` | validation/normalization + severity |
| `DUP_IDENTIFIER` | ≥2 clients share a normalized `pan`/`gstin`/`cin` | dedup/normalization policy |
| GST-registration mismatch | `gstin` present AND no `client_registrations`(`IN_GST`) row | depends on a registrations backfill (not done) |
| `UNMAPPED_ENTITY_TYPE` | `client_type` not resolvable to an `entity_type_catalogue.code` | requires an approved `client_type → code` mapping (absent) |

**Duplicate-group scope semantics.** For PAN/GSTIN/CIN duplicates, the discovery emits
`dup_*_groups_{all_current, production_eligible, sample_test_draft_or_inactive, mixed_scope}`.
**Duplicate-group scope counts are diagnostic perspectives and are NOT expected to reconcile as
`all_current = production_only + nonproduction_only`, because a duplicate group may span both
scopes.** `dup_*_groups_mixed_scope` reports exactly those cross-scope groups — a normalized
identifier group with `count(*) > 1` containing **≥1 production-eligible** client **and ≥1
sample/test/draft/inactive** client. No normalized identifier value is emitted (grouping is
internal to the CTE). The per-row candidate counts (malformed PAN, GST mismatch, unmapped entity
type) **do** partition and reconcile; duplicate **group** counts do not. These remain
**NON-APPROVED candidate observations**.

## 5. Three-scope count model

Every relevant block (both confirmed rules **and** every candidate observation) reports the
same three scopes **separately**, using **one exact production-eligibility predicate** applied
identically everywhere:

```
prod_elig =  coalesce(is_test_client, false) = false
         AND coalesce(is_draft, false)       = false
         AND coalesce(status, '')            = 'Active'
```

- **`all_current`** — every current client row;
- **`production_eligible`** — `prod_elig` true;
- **`sample_test_draft_or_inactive`** — the exact `NOT(prod_elig)` complement.

`prod_elig` is a non-null boolean per row, so the third scope is the exact complement and
**every block reconciles**: `all_current = production_eligible + sample_test_draft_or_inactive`.
The universe and each confirmed-rule block emit `PASS_scope_reconciliation` proving this
(implemented via a per-block base CTE + `count(*) FILTER (…)`, so the predicate is identical
across blocks and no partial/variant predicate is used anywhere).

**Do not infer that current sample-data counts represent future production counts.** The
production-eligible scope is the only one with forward relevance, and even it is sample today.

## 6. Structural schema readiness

**The storage schema, columns, constraints, indexes and RLS are structurally ready for
discovery and future remediation use. Executable population remains blocked because a governed
audited write path and actor-provenance decision are not yet approved.**

| Element | Provided by | State |
|---------|-------------|-------|
| Table + `client_id` FK (`ON DELETE RESTRICT`) | 0015 | present |
| `flag_type`, `severity` (+CHECK `info/warn/block-on-edit`), `detail jsonb`, `resolved`, `created_by/at`, `resolved_by/at` | 0015 | present |
| Rule identity + lineage: `rule_code`, `rule_version`, `batch_id` | 0016 | present |
| Idempotency: `client_remediation_flags_open_uq` `(client_id, rule_code) WHERE resolved=false` | 0016 | present |
| Indexes: `idx_remediation_client`, `idx_remediation_open` | 0015 | present |
| RLS enabled + forced; Admin/Manager SELECT/INSERT/UPDATE; **no DELETE** | 0015 | present (adequate) |
| Direct write path | 0015 grants; **excluded** from the 0017/0018 D2b closures | `authenticated` INSERT/UPDATE remain (RLS-gated) — the one master table not bypass-closed |

## 7. Audited write-path gap

- `public.audit_write_event(...)` exists (0016; SECURITY DEFINER; pinned search_path) but is
  **actor-driven** (`auth.uid()`).
- **No governed remediation write path has been identified.** The read-only file's D4-DISC-10
  performs a **name-only** catalogue check: *"No dedicated remediation-named RPC was found by
  this catalogue check, and no approved governed remediation write path has been identified
  through repository review."* The `%remediation%` name search alone does **not** prove the
  absence of every differently-named write function; the conclusion rests on repository review,
  not the catalogue check in isolation.
- **Actor-provenance for a non-user/migration population is unresolved** (the same blocker
  carried over from D3): a migration run by the table owner has no `auth.uid()`, so audit
  provenance is undefined; an Admin/Manager RPC has `auth.uid()` and could audit cleanly.
- **Implication:** before any population, a reviewed decision on the write path (audited RPC vs
  actor context) is required. **Not authored here.**

## 8. Population deferral (recommendation)

**Defer D4 population.** Author the audited write path and populate flags **only against real
onboarded data**, after the V2 Clean-Start Reset removes sample data — not against the current
sample dataset. A test-only population against sample data could be exercised later purely to
validate the mechanism, but only if explicitly requested and clearly labelled non-production.

## 9. Relationship to P2.2 and the V2 Clean-Start Reset

- **P2.2 (write UI):** remediation flags are consumed/resolved through the Client Master write
  surface. D4's audited write path should be designed **consistently with the D2b RPC model**
  used by P2.2 (SECURITY DEFINER, actor context, optimistic locking, audit emission). D4
  population is **not** a P2.2 prerequisite; P2.2 can proceed independently.
- **V2 Clean-Start Reset:** the reset wipes sample data (preserving schema/migrations/RLS/
  functions/reference data/FY/etc.). `LEGACY_JSONB_DIRECTORS` is fully mooted by it; real
  remediation-flag population belongs **after** the reset, at real onboarding.

## 10. Dependencies & blockers

1. **Sample-data context (governing)** — population deferred; discovery/design only now.
2. **Audited write path + actor-provenance** — undecided/unbuilt (§7); blocks population.
3. **No remediation RPC** — to be authored later as a separate reviewed step.
4. **B-1 execution channel** — the connected Supabase MCP exposes only V1/Production; the
   read-only discovery must be run **by PJ in the V2 SQL Editor**, not via MCP.
5. **Candidate-rule policy gaps** — mapping (`UNMAPPED_ENTITY_TYPE`), registrations backfill
   (`GST` mismatch), dedup policy (`DUP_IDENTIFIER`), validation (`MALFORMED_PAN`).

## 11. Boundaries honoured

No SQL executed; no Supabase connection; no MCP; no database write; no remediation population;
no RPC authoring; no master-register update; no commit/push; no deploy; no P2.2; no sample-data
deletion; V1/Production untouched. Only the two authorised files were created.
