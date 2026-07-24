# YAV2 Recovery — SECURITY BASELINE

Consolidates verified security findings from the merged Package A evidence and source, without rerunning unnecessary discovery. Status legend: **[V]** already verified · **[EP]** evidence pending (read-only, PJ-run A4) · **[IMPL]** implementation required · **[LIVE-PJ]** live execution requiring PJ approval.

## 1. Environment boundary — authorised vs prohibited
- **Authorised:** V2 / yav2-dev, ref `ogjrwemjefvccpyjwxuo`. **Prohibited:** V1 / Production, ref `zcszesuvjrryxtigjglt` — never connect/query/deploy.
- `src/supabase.js` requires env vars, throws on missing, **no V1 fallback**, no hard-coded ref. **[V]**
- `.env.example` uses placeholder `<APPROVED_V2_SUPABASE_PROJECT_REF>` (no concrete ref, no secret). **[V]**
- Mechanical guard `scripts/verify-supabase-ref.*` blocks the V1 ref and requires the V2 ref; fail-closed; tested (exit 2/1/0/1). **[V]** — adoption into workflow = **[IMPL]** (G-20).

## 2. RLS / FORCE RLS
- Policies defined in source: `0006_rls_policies.sql`, refined `0010_rls_refined_phase4b.sql`; client-restriction design (I-06/I-22). **[V] (source)**
- Live **RLS enabled + FORCE + per-table policies** on V2: **unverified**. **[EP]** (A4 §10; G-04). Any change to enforce = **[LIVE-PJ]**.

## 3. Grants / ACL
- Least-privilege grants + function EXECUTE privileges live state: **unverified**; must confirm no unintended `PUBLIC`/`anon` grants. **[EP]** (A4 §10; G-05).

## 4. SECURITY DEFINER & search_path
- Many SECURITY DEFINER functions exist (`0008`×10, `0017`×27, `0016`×10, others). **[V] (present)**
- Each definer must set a pinned/empty `search_path` (injection hardening); live confirmation: **unverified**. **[EP]** (A4 §7; G-06).

## 5. Auth / team mapping
- Model: `team.portal_role` enum + `is_admin` + `is_active`; server role via `get_app_role()`/`get_app_role_for_user`. **[V] (source)**
- Live Auth-user ↔ `team` mapping, active/banned status: **unverified**. **[EP]** (A4 Part2 §11; G-07).

## 6. Storage (`secure-docs`)
- Source references present; `0011_storage_and_edge_DEFER` deferred; `0012` secure-docs live-only (absent file). **[V] (partial)**
- Private bucket + per-client path separation + signed-URL expiry + storage RLS: **unverified**. **[EP]** (A4 §13; G-08).

## 7. Edge Functions — deployment/source gaps
- No `supabase/functions/*` in governing → source **unversioned** for `ai-agent`, `extract-financial`, `scan-document`; `dkyc-verify-upload` historical-branch only. **[V] (gap confirmed)**
- Source recovery = **[IMPL]** (G-09). Deployment state verification = **[EP]** (A4 Part2 §14; G-10); any (re)deploy = **[LIVE-PJ]**.

## 8. FIVE SECURITY GATES — cannot be relaxed
| Gate | Statement | Enforcement | Status |
|---|---|---|---|
| **S1 — V2-only** | No artifact/env references V1 ref `zcszesuvjrryxtigjglt`; authorised ref `ogjrwemjefvccpyjwxuo` required | **Mechanical** — `scripts/verify-supabase-ref.*` (fail-closed, tested) | **[V]** guard exists; adoption **[IMPL]** (G-20) |
| **S2 — RLS+FORCE** | Every tenant table has RLS enabled + FORCE + client-scoping policy; no cross-client read | A4 §10 evidence + reconcile | **[EP]** (G-04) |
| **S3 — Definer search_path** | Every SECURITY DEFINER function pins `search_path`; least-privilege EXECUTE | A4 §7 evidence + reconcile | **[EP]** (G-06) |
| **S4 — Server-side RBAC** | Frontend hiding is NOT security; admin-only surfaces (Firm Overview, Audit Log) and sensitive RPCs (`generate_client_compliance`, `get_sensitive_audit_logs`) deny non-privileged at DB/Edge | A4 + runtime negatives | **[EP]** (G-13) |
| **S5 — Storage isolation** | `secure-docs` private; per-client path separation; signed-URL expiry; no cross-client access | A4 §13 + runtime negative | **[EP]** (G-08) |

**No gate may be marked satisfied on frontend behaviour alone — each requires DB/Edge-level evidence.** Any remediation that mutates the live database, storage, Edge, or Vercel alias is **[LIVE-PJ]** and out of scope for the parallel implementation sprint until separately approved.
