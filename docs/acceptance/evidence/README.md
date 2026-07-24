# T2 — Runtime & RBAC Evidence (Package A)

Owner: **T2 — Application & Runtime** (`docs/acceptance/evidence/**`).
Governing HEAD: `1286a290f5d4287e70c6853d2eb3bad16256e276` · Issue #23 · PR #29.
Authorised Supabase: **V2 / yav2-dev** ref `ogjrwemjefvccpyjwxuo` only. V1 `zcszesuvjrryxtigjglt` is **prohibited**.

This tree holds T2's evidence for **G-12** (per-tab runtime), **G-13** (per-role RBAC), and the
schema-independent input to **G-19** (frontend↔DB field contract). It separates what is **completed now**
(schema-independent, static, no credentials) from what is **BLOCKED** pending live credentials / deploy
or the T1 contract freeze.

## Status legend
- **[DONE-STATIC]** — completed schema-independent evidence (source/build/test), no live system touched.
- **[BLOCKED-CREDS]** — requires authorised runtime credentials + governing deployment (PJ-gated); template ready.
- **[BLOCKED-T1]** — requires the T1 DB-type contract freeze (G-16) and/or T3 live schema (G-03); template ready.

## Contents
| Path | Gap | Acceptance | Status |
|---|---|---|---|
| `G-12_runtime/STATIC_VERIFICATION.md` | G-12 | §A (compile/mount prerequisite) | **[DONE-STATIC]** |
| `G-12_runtime/PER_TAB_RUNTIME_TEMPLATE.md` | G-12 | §A (live per-tab) | **[BLOCKED-CREDS]** |
| `G-13_rbac/FRONTEND_GATE_INVENTORY.md` | G-13 | §B (frontend gate map; NOT security proof) | **[DONE-STATIC]** |
| `G-13_rbac/RBAC_MATRIX_TEMPLATE.md` | G-13 | §B (server/Edge-enforced) | **[BLOCKED-CREDS]** |
| `G-19_field_contract/SOURCE_RECONCILIATION.md` | G-19 | §C input | **[DONE-STATIC]** source reconciled vs G-16; live equality pending |
| `G-19_field_contract/CONSUMPTION_MANIFEST.md` | G-19 | §C input | inventory (updated); source verdicts in reconciliation file |

## Security rule (SECURITY_BASELINE §8)
**Frontend menu-hiding is NOT security.** Nothing in this tree marks a security gate (S2–S5) satisfied on
frontend behaviour. The frontend-gate inventory is a **defence-in-depth UX map** whose entries each name the
**server enforcement point** they rely on; those server points remain **EVIDENCE-PENDING** (T3 / live runtime).

## Evidence format (per acceptance checklist)
Every live item records: artifact (screenshot/console/Network text) + source anchor + Gap ID + timestamp +
`Sb-Project-Ref: ogjrwemjefvccpyjwxuo`. Static items record: source anchor + command + verbatim output + commit.
