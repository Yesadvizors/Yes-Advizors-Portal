# YAV2 — AI Assistant & Document Intelligence: Discovery + Proposal

**Status:** Discovery complete. Frontend surfacing done (real assistant). Backend
enhancements are **PROPOSAL ONLY** — no edge-function / DB / RLS change is executed
without a separate, explicit PJ approval.

**Package:** Functional Completion + Document Intelligence + AI Assistant (Phases 4–6).
**Branch:** `design/yav2-core-operations-bento-package` (PR #70).

---

## 0. TL;DR

The package assumed AI/OCR might not exist and warned against building a fake chatbot.
**They already exist**, implemented the correct way — as **server-side Supabase edge
functions** with **no AI key in the frontend**:

| Capability | Edge function | State today |
|---|---|---|
| Conversational assistant | `ai-agent` | **Real & working.** Now surfaced in Bento as the floating "Ask YA Assistant" (reused, not rebuilt). |
| Financial-statement extraction / OCR | `extract-financial` | **Real & working.** Used in Compliance → Financials tab. Modes: `unpdf` (native text PDF), `mistral-ocr` (scans), `claude` (multimodal). |
| Document scanning | `scan-document` | Present. |

So the correct posture is **surface what exists + propose enhancements for the gaps**,
not "build shells."

---

## 1. What exists — AI assistant (`ai-agent`)

- **Client:** `src/components/ChatAgent.jsx` → `supabase.functions.invoke('ai-agent', { body: { messages } })`, renders `data.response`.
- **Security:** the AI provider key lives in the edge function (server-side). The browser
  bundle contains **no** `VITE_*_KEY` and no `sk-...` secret (guarded by
  `tests/aiAssistantBento.test.js`).
- **Data access:** the function has live access to clients / compliance / documents / tasks
  (per ChatAgent's own copy: "live access to your client database, compliance tracker,
  documents and tasks").
- **Surfacing (done this package):** mounted persistently in `BentoApp` inside
  `ErrorBoundary + Suspense` — reused unchanged, mirroring the AuditLog pattern.

### Gaps (why it is not yet "best-in-class")
1. It is a **single-turn chatbot** — no explicit tool registry, so answer grounding is opaque.
2. **No answer provenance** — users cannot tell database facts from document facts from model inference.
3. **No citations** for document-derived claims (doc id / FY / page / confidence / snippet).
4. **No context-awareness** of the active module / Client 360.
5. **No docked right-panel or full-page** surface — only the floating widget.
6. **No write-approval workflow** (action levels).
7. **RBAC inheritance** by the function is not verifiable from the frontend and must be confirmed server-side.

---

## 2. What exists — Document intelligence (`extract-financial`)

Pipeline **already implemented** for financial statements (Compliance → Financials tab):

```
secure-docs (storage)
   → download to base64 (browser)
   → POST {SUPABASE_FUNCTIONS_URL}/extract-financial  { mode, file }
        mode = unpdf      → native text-PDF extraction (free, text PDFs)
        mode = mistral-ocr→ OCR for scanned / image PDFs (low cost)
        mode = claude     → multimodal extraction (hard layouts)
   → returns { fields, engine, confidence, ocrText }
   → extracted_document_data (per-field rows)
   → human review (FinancialReviewModal) → financials_tracker (status: Reviewed)
```

This is a genuine, secure, provider-neutral, extract-then-**human-review** pipeline —
exactly the shape the package asked for. **Native-first (unpdf), OCR only when needed
(mistral-ocr)** is already the strategy.

### Gaps
1. Scoped to **financial statements only** — no general classification across doc types
   (PAN, GST cert, board resolutions, agreements, notices, ITR acknowledgements…).
2. **No retrieval index / embeddings / chunking** — documents are not searchable by the assistant.
3. Citations exist as reviewed fields but are **not exposed to the assistant** as grounded sources.

---

## 3. Proposed enhanced AI assistant (PROPOSAL — not built)

A design **preview** of the target experience ships in this package as unconnected,
clearly-labelled UI (`src/bento/modules/AiAssistantScaffold.jsx`, dev-preview only at
`/approved-bento.html?tab=ai-preview`). It fabricates no answers.

### 3.1 Answer-provenance taxonomy (every stated fact tagged with exactly one)
- **STRUCTURED** — read from YAV2 DB via a typed tool. Highest trust.
- **DOCUMENT-EXTRACTED** — from an authorized client document, with a citation.
- **INFERENCE** — the model's reasoning over the above; always visibly flagged, never a "source".

### 3.2 Tool registry (NO raw-DB tool)
`get_client_summary` · `get_directors` · `list_client_compliance` ·
`get_financial_statement_summary` · `get_document` · `search_documents` ·
`list_tasks_for_client` · `get_client_360`. Each tool:
- runs server-side inside `ai-agent`, and
- **inherits the caller's RBAC** — the assistant can never read beyond the signed-in user.

### 3.3 Action levels
- **L0 read**, **L1 draft** — allowed.
- **L2/L3 writes** — **proposed for explicit human approval**; never executed autonomously.

### 3.4 Surfaces
Docked right-side panel + full-page mode; context follows the active module / Client 360.

---

## 4. AI backend proposal — the 16 components (PROPOSAL — needs approval)

| # | Component | Note |
|---|---|---|
| 1 | Gateway | single `ai-agent` entry (exists); formalise request/response contract |
| 2 | Auth | Supabase JWT of the caller passed through (no service-role for reads) |
| 3 | RBAC | tools enforce the caller's row-level permissions server-side |
| 4 | Tool registry | typed tools only; no raw SQL tool |
| 5 | Retrieval | chunk + embed authorized docs; per-user filtered vector search |
| 6 | OCR | reuse `extract-financial` engines (unpdf → mistral-ocr → claude) |
| 7 | Model adapter | provider-neutral; key server-side only |
| 8 | Sessions | conversation persistence + titles |
| 9 | Citations | doc id, name, FY, page, confidence, snippet |
| 10 | Approval | write actions queued for human approval |
| 11 | Audit | every AI action logged (reuse the audit backend; never log secrets) |
| 12 | Observability | latency, tool-call traces, error rates |
| 13 | Eval | golden-question set; regression harness |
| 14 | Cost | per-request token/OCR cost caps |
| 15 | Rate limits | per-user throttle |
| 16 | Privacy | no client data in URLs/logs; retention policy |

**None of the above is executed here.** Items touching the DB / RLS / edge functions
require a separate PJ green light.

---

## 5. Document-intelligence proposal (general, beyond financials — PROPOSAL)

```
upload → secure-docs
   → native text extraction (unpdf)         [prefer]
   → OCR only if scanned/image (mistral-ocr) [fallback]
   → page-aware text
   → classification (doc type)
   → structured field extraction (+ citations)
   → chunk + embed → retrieval index (per-user filtered)
   → available to the assistant as DOCUMENT-EXTRACTED sources
```

Reuses the proven `extract-financial` engines; adds classification, chunking and a
retrieval index. DB objects (embeddings table, index) are **proposal-only**.

---

## 6. What was actually changed in this package (frontend only)

- Surfaced the **real** `ai-agent` assistant in the Bento shell (reused ChatAgent).
- Added an **unconnected, clearly-labelled preview** of the proposed structured workspace
  (dev-preview only; never in the authenticated nav).
- **No** edge-function, DB, RLS, RPC, or secret change.

---

## 7. Next PJ decision

Approve (or amend) the backend proposal (§4–§5) to move from "real basic assistant +
real financial extraction" to "grounded, cited, tool-based assistant + general document
intelligence." Backend work starts only after that approval.
