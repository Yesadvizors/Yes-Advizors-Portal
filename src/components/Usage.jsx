import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PageHeader, Card, LoadingState } from './ui'

// Public Anthropic per-million-token prices (USD). Adjust if Anthropic changes pricing.
// Used only for an ESTIMATE — the real bill is in console.anthropic.com.
const PRICING = {
  'claude-haiku-4-5-20251001': { in: 1.00, out: 5.00 },
  'claude-haiku-4-5':          { in: 1.00, out: 5.00 },
  'claude-sonnet-4-6':         { in: 3.00, out: 15.00 },
  'claude-sonnet-4-20250514':  { in: 3.00, out: 15.00 },
  _default:                    { in: 3.00, out: 15.00 },
}
const USD_INR = 84  // rough conversion for display

function priceFor(model) { return PRICING[model] || PRICING._default }
function estCost(model, inTok, outTok) {
  const p = priceFor(model)
  return (inTok / 1e6) * p.in + (outTok / 1e6) * p.out
}
function fmtUSD(n) { return '$' + n.toFixed(n < 1 ? 4 : 2) }
function fmtINR(n) { return '₹' + (n).toLocaleString('en-IN', { maximumFractionDigits: 2 }) }
function fmtNum(n) { return (n || 0).toLocaleString('en-IN') }

const FN_LABELS = {
  'ai-agent':          { label: 'Chatbot (YA Assistant)', icon: '💬', color: 'var(--blue)' },
  'extract-financial': { label: 'Financial OCR',           icon: '📄', color: 'var(--dkgreen)' },
  'scan-document':     { label: 'KYC Document Scan',       icon: '🪪', color: '#9333EA' },
}
function fnMeta(name) { return FN_LABELS[name] || { label: name, icon: '⚙️', color: 'var(--gray)' } }

export default function Usage() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [range, setRange] = useState('30')  // '1' | '7' | '30' | 'all'

  useEffect(() => { load() }, [])

  async function load() {
    setErr('')
    const { data, error } = await supabase
      .from('claude_usage_log')
      .select('function_name,model,purpose,input_tokens,output_tokens,total_tokens,created_at')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) { setErr(error.message); setRows([]); return }
    setRows(data || [])
  }

  if (rows === null) return <Card><LoadingState label="Loading usage…" /></Card>

  // filter by range
  const now = Date.now()
  const cutoff = range === 'all' ? 0 : now - parseInt(range) * 86400000
  const filtered = rows.filter(r => new Date(r.created_at).getTime() >= cutoff)

  // totals
  let totIn = 0, totOut = 0, totCost = 0
  const byFn = {}
  const byDay = {}
  for (const r of filtered) {
    const inT = r.input_tokens || 0, outT = r.output_tokens || 0
    totIn += inT; totOut += outT
    const c = estCost(r.model, inT, outT); totCost += c
    if (!byFn[r.function_name]) byFn[r.function_name] = { calls: 0, in: 0, out: 0, cost: 0 }
    byFn[r.function_name].calls++; byFn[r.function_name].in += inT; byFn[r.function_name].out += outT; byFn[r.function_name].cost += c
    const day = r.created_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = { calls: 0, tokens: 0, cost: 0 }
    byDay[day].calls++; byDay[day].tokens += inT + outT; byDay[day].cost += c
  }
  const fnList = Object.entries(byFn).sort((a, b) => b[1].cost - a[1].cost)
  const dayList = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)
  const maxDayTok = Math.max(1, ...dayList.map(d => d[1].tokens))
  const totalCalls = filtered.length

  const rangeBtns = [['1', 'Today'], ['7', '7 days'], ['30', '30 days'], ['all', 'All time']]

  return (
    <div>
      <PageHeader
        title="Claude API Usage"
        subtitle="Tokens consumed by the portal's AI features. Cost shown is an estimate."
        actions={(
          <div style={{ display: 'flex', gap: 6 }}>
            {rangeBtns.map(([v, l]) => (
              <button key={v} onClick={() => setRange(v)} className={`ds-btn ds-btn-sm ${range === v ? 'ds-btn-primary' : 'ds-btn-secondary'}`}>
                {l}
              </button>
            ))}
          </div>
        )}
      />

      {err && <div role="alert" style={{ background: 'var(--ds-danger-bg)', border: '1px solid var(--ds-danger-bd)', color: 'var(--ds-danger)', padding: 12, borderRadius: 'var(--ds-r)', marginBottom: 16, fontSize: 13 }}>{err}</div>}

      {/* Summary cards */}
      <div className="ds-metric-grid" style={{ marginBottom: 22 }}>
        <StatCard label="Total API Calls" value={fmtNum(totalCalls)} sub={`over ${range === 'all' ? 'all time' : range + ' day' + (range === '1' ? '' : 's')}`} />
        <StatCard label="Input Tokens" value={fmtNum(totIn)} sub="sent to Claude" />
        <StatCard label="Output Tokens" value={fmtNum(totOut)} sub="generated" />
        <StatCard label="Est. Cost" value={fmtUSD(totCost)} sub={`≈ ${fmtINR(totCost * USD_INR)}`} accent />
      </div>

      {/* Breakdown by feature */}
      <Card className="ds-card-pad" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 650, color: 'var(--ds-text)' }}>Where it's being used</h3>
        {fnList.length === 0 && <div style={{ color: 'var(--ds-text-subtle)', fontSize: 13, padding: '12px 0' }}>No usage recorded in this period yet.</div>}
        {fnList.map(([name, d]) => {
          const m = fnMeta(name)
          const pct = totCost > 0 ? (d.cost / totCost) * 100 : 0
          return (
            <div key={name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text)' }}>{m.icon} {m.label}</span>
                <span style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>{fmtNum(d.calls)} calls · {fmtNum(d.in + d.out)} tok · {fmtUSD(d.cost)}</span>
              </div>
              <div style={{ background: 'var(--ds-n-100)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: m.color, borderRadius: 6, transition: 'width .3s' }} />
              </div>
            </div>
          )
        })}
      </Card>

      {/* Daily trend */}
      <Card className="ds-card-pad" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 650, color: 'var(--ds-text)' }}>Daily usage (last 14 active days)</h3>
        {dayList.length === 0 && <div style={{ color: 'var(--ds-text-subtle)', fontSize: 13 }}>No data.</div>}
        {dayList.map(([day, d]) => (
          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span className="ds-mono-num" style={{ fontSize: 12, color: 'var(--ds-text-subtle)', width: 88, flexShrink: 0 }}>{day}</span>
            <div style={{ flex: 1, background: 'var(--ds-n-100)', borderRadius: 5, height: 18, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: (d.tokens / maxDayTok * 100) + '%', height: '100%', background: 'var(--ds-brand-200)' }} />
            </div>
            <span className="ds-mono-num" style={{ fontSize: 12, color: 'var(--ds-text-subtle)', width: 130, textAlign: 'right', flexShrink: 0 }}>{fmtNum(d.tokens)} tok · {fmtUSD(d.cost)}</span>
          </div>
        ))}
      </Card>

      <div style={{ background: 'var(--ds-info-bg)', border: '1px solid var(--ds-info-bd)', borderRadius: 'var(--ds-r-lg)', padding: '14px 16px', fontSize: 12.5, color: 'var(--ds-text-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--ds-info)' }}>ℹ️ Note:</strong> Costs here are <strong>estimates</strong> based on public Anthropic token prices and are for guidance only.
        For your exact bill and balance, see <strong>console.anthropic.com → Settings → Usage / Billing</strong>.
        Token logging started when this feature was added, so earlier usage isn't included.
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="ds-metric" style={accent ? { '--ds-metric-accent': 'var(--ds-brand)' } : undefined}>
      <div className="ds-metric-label">{label}</div>
      <div className="ds-metric-value" style={{ fontSize: 24 }}>{value}</div>
      <div className="ds-metric-foot">{sub}</div>
    </div>
  )
}
