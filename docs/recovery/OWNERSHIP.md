# YAV2 Recovery — OWNERSHIP & CONTRACT BOUNDARIES

**Core rule:**
> **Anything that changes a shared contract is sequential. Anything that consumes a frozen contract may run in parallel.**

**Precedence rule (prevents overlap):** the **most specific path prefix wins**. A terminal that owns a general prefix does **not** own a more-specific carve-out assigned to another terminal.

## Terminals
- **TERMINAL 1 — Lead Integrator** (`sync/integration`): shared contracts, integration assembly, recovery docs, build config, stacked-PR orchestration. Sole authority to *change* a shared contract.
- **TERMINAL 2 — Application & Runtime** (`sync/app-runtime`): frontend app + shared app libraries + runtime/RBAC evidence. *Consumes* frozen contracts.
- **TERMINAL 3 — Supabase & Security** (`sync/supabase-security`): migrations, Edge Function source, RLS/grants/functions/storage, security evidence. *Produces* the DB contract; *changes* to it are sequenced through T1.

## Exclusive write ownership (single writer per path)
| Asset | Owner | Path prefix / files | Parallel-safe? |
|---|---|---|---|
| **Shared/generated types** | **T1** | `contracts/**` (canonical); carve-out `src/types/generated/**` if tooling requires | **Contract — sequential** |
| **Environment templates** | **T1** | `.env.example` | **Contract — sequential** |
| **Build configuration** | **T1** | `vite.config.js`, `vercel.json`, `package.json`, `package-lock.json`, `index.html` | **Contract — sequential** |
| **Integration exports** | **T1** | `docs/recovery/exports/**` | Sequential |
| **Recovery documents** | **T1** | `docs/recovery/**`, `docs/acceptance/**` | Sequential |
| **Migrations** | **T3** | `supabase/migrations/**`, `supabase/verification/**` | Produces contract — sequential at contract points |
| **Edge Function source** | **T3** | `supabase/functions/**` | Parallel (own tree) |
| **Frontend source** | **T2** | `src/**` **except** carve-outs below | Parallel (consumes contract) |
| **Shared libraries** | **T2** | `src/lib/**`, `src/hooks/**`, `src/services/**` | **Contract-bearing** — changes to exported signatures are sequential via T1 |
| **Runtime/RBAC evidence** | **T2** | `docs/acceptance/evidence/**` (new) | Parallel |

**Carve-outs from `src/**` (NOT owned by T2):** `src/types/generated/**` → **T1**. No other terminal writes under `src/` besides T2.

## Shared contracts (frozen; only T1 may change them)
1. **DB schema/type contract** — column sets, enum values, view shapes, RPC signatures (e.g. `v_firm_dashboard.due_in_7_days`, `portal_role_enum`, `is_admin_or_manager()`, `get_app_role()`, `generate_client_compliance`, `get_sensitive_audit_logs`). *Produced by T3 (migrations), frozen by T1 (generated types), consumed by T2.*
2. **Environment contract** — variable names/semantics in `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_FUNCTIONS_URL`, `VITE_DOCS_BUCKET`, `VITE_P2_PREVIEW`, `VITE_P5_UI`).
3. **Build/deploy contract** — Vite/Vercel config, output target, authorised V2 ref safeguard.
4. **Edge invocation contract** — function names + request/response shapes for `ai-agent`, `extract-financial`, `scan-document`.

**Consuming a frozen contract → parallel-safe.** **Changing any contract above → sequential:** T3/T2 propose → T1 updates the contract + generated types → downstream re-consumes.

## Non-overlap verification (Phase 0)
- Every `src/` path → T2 only (except `src/types/generated/**` → T1).
- Every `supabase/` path → T3 only.
- Root build/config + `contracts/` + `docs/recovery|acceptance/` → T1 only.
- No path appears under two owners. Shared libraries stay single-writer (T2) but are flagged contract-bearing so signature changes route through T1.

## Ownership → Gap mapping
- **T1:** G-01, G-14(template), G-15(coordinate), G-16, G-17, G-20.
- **T2:** G-12, G-13, G-14(consume), G-19; shares G-18.
- **T3:** G-02–G-11; shares G-18.
