# T3 — Evidence-run log: SAFETY-GATE ABORT (no queries executed)

**Owner:** TERMINAL 3 — Supabase & Security · **Branch:** `sync/supabase-security`
**Date:** 2026-07-24 · **Governing Issue:** #23 · **Integration HEAD (as advised):** `7baf2fa80c975660ab99f368c7924a8f9ecd23e5`
**Authorisation:** PJ "V2-ONLY READ-ONLY EVIDENCE RUN" for `supabase/verification/T3_PJ_EVIDENCE_REQUEST.md`.

## Outcome: **BLOCKED — safety gate triggered. Zero database queries executed. No mutation. No V1 query.**

## What happened (audit trail)
The PJ authorisation permits a **read-only** evidence run against **V2 `ogjrwemjefvccpyjwxuo` (yav2-dev) ONLY**,
with a mandatory pre-query safety gate: confirm the project is `ogjrwemjefvccpyjwxuo`; **stop immediately if
any evidence indicates `zcszesuvjrryxtigjglt`**; do not continue if project identity cannot be confirmed.

**Step 1 — identity pre-flight (account project listing).** The available Supabase connector (MCP) was asked
to list the projects it can access. It returned **exactly one** project:

| Field | Value |
|---|---|
| `id` / `ref` | **`zcszesuvjrryxtigjglt`** |
| `name` | `Yes Advizors` |
| `database.host` | `db.zcszesuvjrryxtigjglt.supabase.co` |
| region / status | `ap-northeast-2` / `ACTIVE_HEALTHY` |
| created_at | `2026-06-02T14:11:25Z` |

`zcszesuvjrryxtigjglt` is the **PROHIBITED V1 / Production** project. The **authorised V2 project
`ogjrwemjefvccpyjwxuo` (yav2-dev) is NOT accessible** through this connector.

**Step 2 — STOP.** Both stop conditions were met simultaneously:
1. The only reachable project *is* the prohibited ref `zcszesuvjrryxtigjglt`.
2. The authorised V2 project identity **cannot be confirmed** (it is absent from the connector).

Therefore **no query was issued** — not the environment pre-flight, not any catalog probe, nothing. The
project-listing call is an account-level enumeration, **not** a connection to or query against the V1
database. The standing rule "V1/Production — never connect, query, or deploy" was honoured in full: **V1 was
never queried, even read-only.**

## Why the run cannot proceed here
There is **no safe authorised V2 connector** in this environment. Running the evidence request against the
only connected project would query **V1/Production**, which is strictly prohibited and out of scope of PJ's
authorisation (PJ authorised V2 only). The safeguard behaved exactly as designed — fail-closed.

## Recommended path (per PJ's stated execution model)
PJ's authorisation already provides the fallback: *"PJ may manually run the read-only SQL in the V2 Supabase
SQL Editor and provide the outputs to T3."* That is now the required path:
1. In the **V2 project** (`ogjrwemjefvccpyjwxuo` / yav2-dev) SQL Editor, visually confirm the project selector
   shows `ogjrwemjefvccpyjwxuo`.
2. Run `supabase/verification/YAV2_Package_A_V2_Live_State_Discovery_Readonly.sql` (Part 1) plus the named
   Part-2 probes and the Step-3 targeted queries in `T3_PJ_EVIDENCE_REQUEST.md` (all read-only).
3. Export result sets (text/CSV) tagged `Sb-Project-Ref: ogjrwemjefvccpyjwxuo` + timestamp; no secrets/JWTs/keys.
4. Provide outputs to T3. T3 will then reconcile against the frozen contract and classify each item
   PASS / VARIANCE / BLOCKED **without remediating** — exactly as the authorisation requires.

Alternatively, if a V2-scoped read-only connector (an MCP/account with access to `ogjrwemjefvccpyjwxuo`, and
**without** access to `zcszesuvjrryxtigjglt`) is provisioned, T3 can run the read-only probes directly under
the same safety gate.

## Gap status after this attempt (unchanged — no evidence obtained)
| Gap | Status | Reason |
|---|---|---|
| G-02 (ledger, live) | EVIDENCE-PENDING → **BLOCKED (connector)** | live `schema_migrations` not read |
| G-03 (schema/columns) | EVIDENCE-PENDING → **BLOCKED (connector)** | no V2 catalog read |
| G-04 (RLS/FORCE) | EVIDENCE-PENDING → **BLOCKED (connector)** | — |
| G-05 (grants incl. PUBLIC/anon EXECUTE) | EVIDENCE-PENDING → **BLOCKED (connector)** | — |
| G-06 (definer search_path) | EVIDENCE-PENDING → **BLOCKED (connector)** | — |
| G-07 (auth/team mapping) | EVIDENCE-PENDING → **BLOCKED (connector)** | — |
| G-08 (storage) | EVIDENCE-PENDING → **BLOCKED (connector)** | — |
| G-10 (edge deploy state) | EVIDENCE-PENDING → **BLOCKED (connector)** | `list_edge_functions` would target V1 — not run |
| G-11 (views incl. `v_team_workload`) | EVIDENCE-PENDING → **BLOCKED (connector)** | existence not confirmed live |

`v_team_workload` existence, Edge deployment state, and storage state are all **UNDETERMINED** — no V2 evidence.

## Compliance confirmation
- **No mutation.** No INSERT/UPDATE/DELETE/DDL/GRANT/REVOKE/migration/deploy/alias/n8n/WhatsApp action.
- **No V1 query.** The prohibited project was never connected to or queried; only enumerated by the safety gate.
- **No V2 evidence fabricated.** Nothing is reported as verified.
- **Read-only run: authorised but not executable here** (no authorised V2 connector). Fail-closed.

## Governance footer
```
Governing Issue: #23 · Integration HEAD (advised): 7baf2fa80c975660ab99f368c7924a8f9ecd23e5
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Target: sync/integration (PR #30, DRAFT)
Authorised target: V2 ogjrwemjefvccpyjwxuo ONLY · Prohibited: V1 zcszesuvjrryxtigjglt (never queried)
Evidence run: AUTHORISED (read-only) · Result: BLOCKED (no V2 connector; safety gate fail-closed)
SQL/Database mutation: NOT AUTHORISED · Deployment/Alias: NOT AUTHORISED · V1 access: NONE
```
