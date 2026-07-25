# T3 Live V2 Evidence Bundle

**Purpose:** Raw evidence handoff to Terminal 1 for exact source-versus-live reconciliation.

**Environment:** Supabase V2 / `yav2-dev` only — project ref `ogjrwemjefvccpyjwxuo`.

**Nature:** PJ-executed SELECT-only evidence. This bundle authorises no SQL rerun, remediation, database change, Git write, commit, push, PR, merge, or deployment.

## Evidence inventory

- `01a`–`01c`: Complete column inventory for the 14 target tables, split because the SQL editor capped outputs at 100 rows.
- `02`: Constraints for the 14 target tables.
- `03`: Indexes for the 14 target tables.
- `04a`: All enum labels and exact ordering, split at the 100-row cap.
- `04b`: Public enum type count (`19`).
- `05a`: Public function contract output (52 live function rows).
- `05b`: Full definitions of the 16 privileged role/audit functions.
- `06`: Live absence evidence for the four named relations.

## Important handling notes

1. Terminal 1 must compare exact function **name + identity arguments**; count alone is not a classification.
2. The first `client_persons` column output stopped at ordinal 20 because of the 100-row result cap. The index evidence refers to later columns such as `source_system`, `source_ref`, and `is_active`; Terminal 1 must reconcile using the full source contract and all supplied column chunks, and must not infer a phantom-column mismatch solely from the split.
3. The three requested view-definition names returned no rows, so there are no live definitions for those names to compare. Their source disposition must be classified independently.
4. No preflight query output is included in this bundle; environment identification is recorded from the PJ-controlled execution context and screenshots.

## SHA-256 inventory

| File | SHA-256 |
|---|---|
| `01a_columns_rows_001_100.json` | `7f925e35f987f4806e23a3b84bd6ddfbb9ee43f353d606ae60a70f9fe9afa32a` |
| `01b_columns_rows_101_200.json` | `01145f832a895d45bdf437f499eedded217b7cd03100988e738d55816760f6ba` |
| `01c_columns_remaining.json` | `41c4c9192bb77aa352c17f147db2f2a8ff50d7ef5428ba3dd2a30fd471b3966d` |
| `02_constraints.json` | `ed4cb4e95c187cb1b4415a1b7a233d5f46f60aabdb628bf995bea33bde36980d` |
| `03_indexes.json` | `a9f497ec49dbf1e4d0a291d40d43bac0c504fb097c36008ebee0324b4b08a071` |
| `04a_enum_labels_rows_001_100.json` | `6eb262a74daa2b24d1ad89a995726ef5f813fab751ae2b7054d83f1cddccfb5b` |
| `04a_enum_labels_rows_101_end.json` | `2baca50cc08d11bf80540da8445744e3a268d3db898931e39ec08c8432308084` |
| `04b_enum_type_count.json` | `e882a9a844ff0c8fc701885fb24aa17dc8945beca0f4f113aaa283bd4831506a` |
| `05a_public_function_contracts_52.json` | `7ee20ecd17417d188e280dbc4c86d1036cd5c86407019b0ef3cfd88324d44d9e` |
| `05b_privileged_function_definitions_16.json` | `ecd88902bc55a146cddbad3dc75c139b5de1b6e3d49ae8294cf7a5d33ac94247` |
| `06_views_and_relation_absence.md` | `3e923f3d1a1c048e92ea59a20088af6a791e8a310d959e974629a70a83f3f010` |

## Required Terminal 1 use

Use this bundle together with Terminal 2 and Terminal 3 source-side findings. Complete the governing `T3_EXACT_RECONCILIATION_REPORT.md` as the sole editor, leave it uncommitted, and return the package for independent ChatGPT review.
