# T3 — Edge Function source recovery status (Gap G-09)

**Owner:** TERMINAL 3 — Supabase & Security · **Branch:** `sync/supabase-security`
**Gap:** G-09 (Edge Function source recovery) · related G-10 (deployment state).
**Governing HEAD:** `1286a290f5d4287e70c6853d2eb3bad16256e276`.
**Outcome:** **NO Edge Function source is recoverable from git history.** No code invented. No deploy.

## Scope
The app references four Edge Functions:
- `ai-agent` (ChatAgent — YA Assistant chatbot)
- `extract-financial` (Compliance — financial-statement OCR/extraction)
- `scan-document` (OnboardingWizard — KYC document scan)
- `dkyc-verify-upload` (Package E — Director-KYC upload verify; **NOT AUTHORISED / never deployed**)

## Exhaustive recovery search (method & result)
All searches run across **every ref** in the repository (`git rev-list --all`), not just the governing HEAD.

1. **Files ever committed under `supabase/functions/`:**
   ```
   for c in $(git rev-list --all); do git ls-tree -r --name-only $c; done | grep '^supabase/functions/' | sort -u
   → supabase/functions/dkyc-verify-upload/SECURITY_SPEC.md          (ONLY match)
   ```
2. **Any Deno/edge TypeScript (`Deno.serve`, `serve(async`, `EdgeFunction`, `supabase/functions` in `.ts`):**
   ```
   git grep -lE "Deno\.serve|serve\(async|EdgeFunction" $(git rev-list --all) -- '*.ts'   → (no matches)
   ```
3. **Function-name references across history** resolve only to migration/frontend files
   (`0011_storage_and_edge_DEFER.sql`, `src/components/*.jsx`), never to a function implementation.

**Conclusion:** the **only** artifact that has ever existed under `supabase/functions/` in this repository is
a **review-only Markdown security specification** for `dkyc-verify-upload`. There is **zero** TypeScript/Deno
source for `ai-agent`, `extract-financial`, `scan-document`, or `dkyc-verify-upload` anywhere in history.
Per the sprint rule ("Do not invent missing function code"), **no source is reconstructed.**

## Per-function status

| Function | Source in history? | Provenance | Recovery action |
|---|---|---|---|
| `ai-agent` | **None** | referenced only in `src/components/ChatAgent.jsx:51`, `Usage.jsx:25` | Cannot recover. Invocation contract captured (below). Live deploy state = G-10 (A4 §14). |
| `extract-financial` | **None** | referenced in `src/components/Compliance.jsx:653,721`, `Usage.jsx:26` | Cannot recover. Invocation contract captured. G-10. |
| `scan-document` | **None** | referenced in `src/components/OnboardingWizard.jsx:380`, `Usage.jsx:27` | Cannot recover. Invocation contract captured. G-10. |
| `dkyc-verify-upload` | **Spec only** (no code) | `SECURITY_SPEC.md` @ commit `e63dd14` on branch `feat/dkyc-statutory` ("Package E — REVIEW ONLY — NOT DEPLOYED") | **Package E NOT AUTHORISED** — not resurrected into governing. Spec provenance recorded here only. |

## Why the spec is NOT copied into the governing tree
`dkyc-verify-upload` belongs to **Package E**, which is **NOT AUTHORISED** in this recovery
(`BASELINE.md` governance footer: "Package B: NOT AUTHORISED"; Package E is later-scoped, G-18 deferred).
The spec itself states **"REVIEW ONLY — NOT DEPLOYED … No Edge Function deployment … is approved."**
Bringing it into `supabase/functions/` as if versioned would misrepresent an unapproved, undeployed design
as recovered source. It is left in history with provenance recorded here. If Package E is later authorised,
recover it from commit `e63dd14:supabase/functions/dkyc-verify-upload/SECURITY_SPEC.md`.

## Invocation contracts (observed from frontend callers — NOT invented)
Read-only extraction from the SPA call sites. These define the request/response shape any recovered or
redeployed function must honour; they are the Edge invocation contract for T1 to freeze (shared contract #4).

**`ai-agent`** — `supabase.functions.invoke('ai-agent', { body: … })` (`ChatAgent.jsx:51`)
- Request: `{ messages: [{ role: 'user' | 'assistant', content: string }] }`
- Response consumed: `{ response: string, error?: any }`

**`scan-document`** — `supabase.functions.invoke('scan-document', { body: … })` (`OnboardingWizard.jsx:380`)
- Request: `{ imageBase64: string, mimeType: 'image/jpeg' }`
- Response consumed: `{ extracted: { name, pan, gstin, tan, cin, mobile, email, address, udyam_no, city, state, pincode }, fieldsFound: number, provider: string, error?: any }`

**`extract-financial`** — `fetch(`${SUPABASE_FUNCTIONS_URL}/extract-financial`, { method:'POST', headers:{ Authorization:'Bearer '+session.access_token }})` (`Compliance.jsx:653,721`)
- Request: `{ mode: 'check' | 'claude', financialId, fileBase64, mimeType, docType, clientId, fyLabel, documentId, unitOverride?, ocrText? }`
- Response consumed: `{ error?, usedFree?, needsClaude?, fields?, engine?, confidence?, crossCheck?, unit?, score?, charCount?, pdfType?, mistralChars?, ocrText?, message? }`

`SUPABASE_FUNCTIONS_URL = VITE_SUPABASE_FUNCTIONS_URL || `${SUPABASE_URL}/functions/v1`` (`src/supabase.js:21`).

## Gap disposition
- **G-09 (Edge source recovery):** **CLOSED as NOT-RECOVERABLE** — exhaustive all-ref search performed;
  no source exists; none invented. This is the correct terminal state, not a partial.
- **G-10 (Edge deployment state):** **remains [EVIDENCE-PENDING]** — captured via A4 Part 2 §14 (PJ,
  read-only dashboard/CLI). Any (re)deploy is **[LIVE-PJ]**, out of scope for this sprint.

## Governance footer
```
Governing Issue: #23 · Merged PR: #29 · HEAD: 1286a290f5d4287e70c6853d2eb3bad16256e276
Role: T3 — DATA SECURITY · Branch: sync/supabase-security · Target: sync/integration
Edge source: NONE recoverable (no code invented) · Edge deploy: NOT AUTHORISED · V1 access: NONE
```
