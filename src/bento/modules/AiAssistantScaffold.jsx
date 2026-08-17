/**
 * AiAssistantScaffold — HONEST, UNCONNECTED preview of the PROPOSED enhanced
 * "Ask YAV2 AI" workspace. Presentation-only; renders no live answers.
 * ----------------------------------------------------------------------------
 * WHY THIS EXISTS (read before editing):
 *  - The REAL, working assistant is ChatAgent (the floating "Ask YA Assistant"
 *    button), backed server-side by the `ai-agent` Supabase edge function. That
 *    is what authenticated users actually use today.
 *  - This component is a DESIGN PREVIEW of the *proposed* structured experience
 *    (docked right panel, source-typed citations, tool-grounded answers). It is
 *    deliberately NOT connected to any backend and fabricates NO answers — every
 *    string below is static, labelled "illustrative", and framed as a proposal.
 *  - It is surfaced ONLY in the dev standalone preview (previewEntry, demoData
 *    present), NEVER in the authenticated production nav, so no user can mistake
 *    it for a shipped feature. See docs/ai/AI_ASSISTANT_AND_DOC_INTELLIGENCE.md.
 *
 * Constraints (bento layer): no Supabase, no network, no writes, no emoji.
 */
const SURFACE = 'var(--b-surface)'
const TEXT = 'var(--b-text)'
const SUBTLE = 'var(--b-text-subtle)'
const MUTED = 'var(--b-text-muted)'
const BORDER = 'var(--b-border)'
const GREEN = 'var(--b-green)'

// The proposed answer-provenance taxonomy. Every fact the assistant states must be
// tagged with exactly one of these so users can tell grounded data from reasoning.
const SOURCE_TYPES = [
  { key: 'structured', label: 'STRUCTURED', tint: '#1D4ED8', bg: 'rgba(29,78,216,.10)',
    desc: 'Read from the YAV2 database via a typed tool (clients, compliance, tasks, financials tracker). Highest trust.' },
  { key: 'document', label: 'DOCUMENT-EXTRACTED', tint: '#7C3AED', bg: 'rgba(124,58,237,.10)',
    desc: 'Pulled from an authorized client document by the extract-financial / scan-document pipeline, with a page-level citation.' },
  { key: 'inference', label: 'INFERENCE', tint: '#B45309', bg: 'rgba(180,83,9,.12)',
    desc: 'The model’s reasoning over the above. Never presented as a source fact; always visibly flagged.' },
]

const PROPOSED = [
  'Docked right-side panel + full-page mode (context follows the active module / Client 360).',
  'Tool registry only — no raw-DB access. get_client_summary, get_directors, list_client_compliance, get_financial_statement_summary, etc.',
  'Every claim carries a source-type tag and, for documents, a citation (doc id, name, FY, page, confidence, snippet).',
  'Assistant inherits the signed-in user’s RBAC; it can never read beyond what the user can.',
  'Action levels 0–1 only (read / draft). Any write is proposed for explicit human approval — never executed autonomously.',
  'Multi-agent orchestration (orchestrator + specialists) behind the existing ai-agent edge function — no AI key in the browser.',
]

function Badge() {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:999,
      background:'rgba(180,83,9,.12)', color:'#B45309', fontSize:11, fontWeight:800, letterSpacing:.6, whiteSpace:'nowrap' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:'#B45309' }} />
      PREVIEW &middot; NOT CONNECTED
    </span>
  )
}

function SourceChip({ t }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:6,
      background:t.bg, color:t.tint, fontSize:10.5, fontWeight:800, letterSpacing:.4 }}>{t.label}</span>
  )
}

// A single illustrative answer showing the proposed structure. STATIC — not a live response.
function IllustrativeAnswer() {
  return (
    <div style={{ border:`1px solid ${BORDER}`, borderRadius:12, background:SURFACE, overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${BORDER}`, fontSize:12, color:MUTED, fontWeight:600 }}>
        Illustrative answer &mdash; layout only, not a live response
      </div>
      <div style={{ padding:14, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:13.5, color:TEXT, lineHeight:1.6 }}>
          <div style={{ display:'flex', gap:8, alignItems:'baseline', flexWrap:'wrap' }}>
            <SourceChip t={SOURCE_TYPES[0]} />
            <span>ABC Pvt Ltd has 3 compliance items due this month: GSTR-3B, TDS Q2, and DIR-3 KYC.</span>
          </div>
        </div>
        <div style={{ fontSize:13.5, color:TEXT, lineHeight:1.6 }}>
          <div style={{ display:'flex', gap:8, alignItems:'baseline', flexWrap:'wrap' }}>
            <SourceChip t={SOURCE_TYPES[1]} />
            <span>FY 2023-24 revenue was reported as the audited figure in the filed financial statements.</span>
          </div>
        </div>
        <div style={{ fontSize:13.5, color:TEXT, lineHeight:1.6 }}>
          <div style={{ display:'flex', gap:8, alignItems:'baseline', flexWrap:'wrap' }}>
            <SourceChip t={SOURCE_TYPES[2]} />
            <span style={{ color:SUBTLE, fontStyle:'italic' }}>Based on the above, the TDS return is the nearest deadline &mdash; verify before acting.</span>
          </div>
        </div>
        {/* Citation slot — the shape the ai-agent would populate for DOCUMENT-EXTRACTED facts. */}
        <div style={{ border:`1px dashed ${BORDER}`, borderRadius:10, padding:'10px 12px', background:'rgba(0,0,0,.015)' }}>
          <div style={{ fontSize:10.5, fontWeight:800, letterSpacing:.5, color:MUTED, marginBottom:6 }}>CITATION SLOT (proposed)</div>
          <div style={{ fontSize:12, color:SUBTLE, lineHeight:1.6 }}>
            document: <b style={{ color:TEXT }}>ABC-FS-2324.pdf</b> &middot; FY <b style={{ color:TEXT }}>2023-24</b> &middot;
            page <b style={{ color:TEXT }}>7</b> &middot; confidence <b style={{ color:TEXT }}>0.94</b><br />
            snippet: &ldquo;Revenue from operations &hellip;&rdquo; <span style={{ color:MUTED }}>(illustrative)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AiAssistantScaffold() {
  return (
    <div className="b-legacy-slot">
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4px 2px 40px' }}>
        {/* Honesty banner */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:8 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:750, color:TEXT, margin:0 }}>Ask YAV2 AI &mdash; proposed workspace</h1>
            <p style={{ fontSize:13.5, color:SUBTLE, margin:'6px 0 0', maxWidth:680, lineHeight:1.6 }}>
              A design preview of the <b>proposed</b> structured assistant. It is not wired to any backend
              and shows no live answers. The assistant you can use today is the floating
              &ldquo;Ask YA Assistant&rdquo; button, backed by the existing <code>ai-agent</code> edge function.
            </p>
          </div>
          <Badge />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 320px', gap:16, marginTop:18, alignItems:'start' }}>
          {/* LEFT — proposed answer structure */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <IllustrativeAnswer />

            <div style={{ border:`1px solid ${BORDER}`, borderRadius:12, background:SURFACE, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:750, color:TEXT, marginBottom:10 }}>Answer-provenance taxonomy</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {SOURCE_TYPES.map(t => (
                  <div key={t.key} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <SourceChip t={t} />
                    <span style={{ fontSize:12.5, color:SUBTLE, lineHeight:1.55 }}>{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — proposed docked panel + capabilities */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ border:`1px solid ${BORDER}`, borderRadius:14, background:SURFACE, overflow:'hidden' }}>
              <div style={{ padding:'12px 14px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:26, height:26, borderRadius:8, background:GREEN, display:'inline-flex' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12.5, fontWeight:750, color:TEXT }}>Ask YAV2 AI</div>
                  <div style={{ fontSize:10.5, color:MUTED }}>Proposed docked panel &middot; context-aware</div>
                </div>
              </div>
              <div style={{ padding:14, minHeight:120, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, color:MUTED, textAlign:'center', lineHeight:1.6 }}>
                Docked / full-page conversation area.<br />Context follows the active module and Client 360.
              </div>
              <div style={{ padding:'10px 14px', borderTop:`1px solid ${BORDER}` }}>
                <div style={{ border:`1px solid ${BORDER}`, borderRadius:999, padding:'9px 14px', fontSize:12, color:MUTED }}>
                  Ask about a client, compliance, or a document&hellip; <span style={{ color:'#B45309', fontWeight:700 }}>(disabled in preview)</span>
                </div>
              </div>
            </div>

            <div style={{ border:`1px solid ${BORDER}`, borderRadius:12, background:SURFACE, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:750, color:TEXT, marginBottom:10 }}>Proposed capabilities</div>
              <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:9 }}>
                {PROPOSED.map((p, i) => (
                  <li key={i} style={{ display:'flex', gap:9, fontSize:12.5, color:SUBTLE, lineHeight:1.55 }}>
                    <span style={{ color:GREEN, fontWeight:800, flexShrink:0 }}>&rsaquo;</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p style={{ fontSize:11.5, color:MUTED, marginTop:20, lineHeight:1.6 }}>
          Nothing on this page calls a backend. Building the connected version requires changes to the
          <code> ai-agent</code> edge function and supporting tables (tool registry, retrieval, citations,
          approval, audit) &mdash; proposed in docs/ai/AI_ASSISTANT_AND_DOC_INTELLIGENCE.md and NOT executed
          without approval.
        </p>
      </div>
    </div>
  )
}
