# T3 Live V2 Evidence — Permanent Storage Manifest (POPULATED)

**Status:** POPULATED with PJ's read-only V2 evidence. **UNCOMMITTED / UNTRACKED** — commit only after independent ChatGPT review + separate PJ authorisation.
**Owner/editor:** TERMINAL 1 (sole editor). **Integration HEAD:** `766993936a415837d5865e9dc00fbbd57b34e16a`.
**Authorised project:** V2 / yav2-dev `ogjrwemjefvccpyjwxuo` **ONLY** · **Prohibited:** V1 `zcszesuvjrryxtigjglt` (never queried).
**Transport:** delivered as `T3_LIVE_V2_EXACT_RECONCILIATION_EVIDENCE_BUNDLE.zip`, SHA-256 `b4c07db12c454c46241f8e2c4abe97a41e30cdf0b394fd5f0191dcaa4fcf3e48` — **verified on receipt**. Extracted read-only; the ZIP itself is **not** committed and is deleted (with the extraction) only after GitHub verification.

## Files (readable individual evidence, verbatim from the bundle)
| File | Evidence | Reconciled in report § |
|---|---|---|
| `01a_columns_rows_001_100.json` | columns rows 1–100 (14 tables) | §5 |
| `01b_columns_rows_101_200.json` | columns rows 101–200 | §5 |
| `01c_columns_remaining.json` | columns rows 201–224 | §5 |
| `01d_client_persons_cols_21_30.json` | **supplementary** — `client_persons` columns 21–30 (closes the truncation) | §5 |
| `02_constraints.json` | constraints (14 tables) | §6 |
| `03_indexes.json` | indexes (14 tables) | §7 |
| `04a_enum_labels_rows_001_100.json` | enum labels+order rows 1–100 | §8 |
| `04a_enum_labels_rows_101_end.json` | enum labels+order rows 101–149 | §8 |
| `04b_enum_type_count.json` | enum type count (19) | §8 |
| `05a_public_function_contracts_51.json` | function contract — **51 rows** (transport delivered it mislabelled `_52`; renamed here; bytes/checksum unchanged) | §9 |
| `05b_privileged_function_definitions_16.json` | 16 privileged function bodies | §10 |
| `06_views_and_relation_absence.md` | absence evidence for 4 named relations | §11b |
| `07_authored_view_definitions.md` | **supplementary** — attestation that the 3 authored views are present ordinary VIEW relations | §11a |
| `08_live_view_definitions.sql` | **supplementary** — raw live `pg_get_viewdef` for the 3 authored views (SHA `77709740…c01631`) → all **MATCH** source `0009` | §11a |
| `BUNDLE_SOURCE_README.md` | the transport bundle's own README (provenance, handling notes, SHA inventory) — retained immutable | — |
| `CHECKSUMS.sha256` | SHA-256 of the **15** immutable files above (this manifest & CHECKSUMS excluded) | — |

**Excluded from this permanent package:** the transport ZIP `T3_LIVE_V2_EXACT_RECONCILIATION_EVIDENCE_BUNDLE.zip` (kept read-only, untracked; deleted only after GitHub verification). **Metadata correction:** the function-contract file is **51 rows** (the transport `_52` name was a mislabel).

## Integrity
- Every evidence file's SHA-256 **matches the bundle's own SHA inventory** (`BUNDLE_SOURCE_README.md`) and the transport ZIP hash was verified — an unbroken provenance chain.
- `CHECKSUMS.sha256` covers the 12 immutable evidence/provenance files; verify with `sha256sum -c CHECKSUMS.sha256`. It intentionally excludes this mutable `README.md` and `CHECKSUMS.sha256` itself.
- **No secrets** appear in any file. **No live definitions of the 3 authored views** and **no `client_persons` columns beyond ordinal 20** are present — see report §9/§11 for the resulting `INSUFFICIENT EVIDENCE` items (supplementary read-only capture required).

## Provenance notes (from the bundle, load-bearing)
1. Compare functions by exact **name + identity arguments** — count alone is not a classification.
2. `client_persons` column output stopped at ordinal 20 (100-row cap boundary); later columns (`is_active`, `source_system`, `source_ref`, …) are corroborated by the index evidence but were **not captured** in the column inventory.
3. The 3 authored-view definitions are **not** in this bundle (the §6 view query returned the absence set); their exact-definition equality is unproven here.
4. No preflight query output is included; V2 identity recorded from the PJ-controlled execution context.

## Governance footer
```
Governing Issue: #23 · Integration HEAD: 766993936a415837d5865e9dc00fbbd57b34e16a
Role: T1 — sole editor · Branch: sync/integration · State: POPULATED, UNCOMMITTED, UNTRACKED
Transport ZIP: verified (b4c07d…3e48) · NOT committed · deleted only after GitHub verification
Commit/Push/PR/Merge/Deletion: NOT PERFORMED · SQL/DB action: NONE · V1 access: NONE · Fabricated data: NONE
```
