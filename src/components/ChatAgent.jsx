import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'

const SUGGESTIONS = [
  'How many clients do we have?',
  'Show all documents for Flick Media',
  'Any pending compliance this month?',
  'Who is on the team?',
]

export default function ChatAgent() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I\'m YA Assistant 👋\nI have full access to your client database, compliance tracker, documents and tasks.\n\nAsk me anything about Yes Advizors data!' }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && open) setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function send(text) {
    const q = (text || input).trim()
    if (!q || thinking) return
    setInput('')

    const userMsg = { role: 'user', text: q }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setThinking(true)

    try {
      // Build message history for Claude (exclude first assistant greeting)
      const history = updated
        .filter((_, i) => i > 0) // skip greeting
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }))

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: { messages: history }
      })

      if (error || data?.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Sorry, I encountered an error. Please try again.' }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.response }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Connection error. Please try again.' }])
    }
    setThinking(false)
  }

  function renderText(text) {
    // Simple markdown: **bold**, bullet points, line breaks
    return text.split('\n').map((line, i) => {
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <div key={i} style={{ display:'flex', gap:6, marginTop:3 }}><span style={{ color:'var(--dkgreen)', flexShrink:0 }}>•</span><span>{formatInline(line.slice(2))}</span></div>
      }
      if (line.trim() === '') return <div key={i} style={{ height:6 }} />
      return <div key={i}>{formatInline(line)}</div>
    })
  }

  function formatInline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((p, i) =>
      p.startsWith('**') ? <strong key={i}>{p.slice(2,-2)}</strong> : p
    )
  }

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)}
        style={{ position:'fixed', bottom:24, right:24, zIndex:9000, width:52, height:52, borderRadius:'50%',
          background: open ? '#0D7A53' : 'linear-gradient(135deg,#0D7A53,#1A4A35)',
          border:'none', cursor:'pointer', boxShadow:'0 4px 20px rgba(13,122,83,.4)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
          transition:'transform .2s', transform: open ? 'rotate(45deg)' : 'none' }}>
        {open ? '✕' : '💬'}
      </button>

      {/* Unread dot */}
      {!open && <div style={{ position:'fixed', bottom:68, right:24, zIndex:9001, width:10, height:10, borderRadius:'50%', background:'#F59E0B', border:'2px solid #fff' }} />}

      {/* Chat panel */}
      {open && (
        <div style={{ position:'fixed', bottom:88, right:24, zIndex:8999, width:360, maxWidth:'calc(100vw - 32px)',
          background:'#fff', borderRadius:18, boxShadow:'0 8px 48px rgba(0,0,0,.18)', display:'flex', flexDirection:'column',
          maxHeight:'70vh', overflow:'hidden', border:'1px solid rgba(13,122,83,.15)' }}>

          {/* Header */}
          <div style={{ background:'linear-gradient(135deg,#1A2942,#0D7A53)', padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🤖</div>
            <div>
              <div style={{ color:'#fff', fontSize:14, fontWeight:700 }}>YA Assistant</div>
              <div style={{ color:'rgba(255,255,255,.6)', fontSize:11 }}>AI powered · Full data access</div>
            </div>
            <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'#4ADE80' }} />
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 8px', display:'flex', flexDirection:'column', gap:10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth:'85%', padding:'10px 13px', borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role==='user' ? 'linear-gradient(135deg,#0D7A53,#1A4A35)' : '#F1F5F3',
                  color: m.role==='user' ? '#fff' : '#1A2942',
                  fontSize:13, lineHeight:1.5
                }}>
                  {renderText(m.text)}
                </div>
              </div>
            ))}

            {thinking && (
              <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                <div style={{ background:'#F1F5F3', padding:'10px 14px', borderRadius:'14px 14px 14px 4px' }}>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--dkgreen)',
                        animation:'bounce .8s infinite', animationDelay:`${i*0.15}s` }} />
                    ))}
                  </div>
                </div>
                <span style={{ fontSize:11, color:'var(--gray2)', marginBottom:4 }}>Searching data…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (show only at start) */}
          {messages.length <= 1 && (
            <div style={{ padding:'0 12px 8px', display:'flex', flexWrap:'wrap', gap:6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{ padding:'5px 10px', borderRadius:20, border:'1px solid var(--green2)', background:'var(--ltgreen)',
                    color:'var(--dkgreen)', fontSize:11, cursor:'pointer', fontWeight:500 }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border2)', display:'flex', gap:8 }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything about your portal…"
              disabled={thinking}
              style={{ flex:1, padding:'9px 13px', border:'1px solid var(--border)', borderRadius:22, fontSize:13,
                outline:'none', background: thinking ? '#f9f9f9' : '#fff', fontFamily:'inherit' }} />
            <button onClick={() => send()} disabled={!input.trim() || thinking}
              style={{ width:36, height:36, borderRadius:'50%', border:'none', background:'var(--dkgreen)',
                color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                opacity: (!input.trim() || thinking) ? 0.4 : 1, flexShrink:0 }}>
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)}
        }
      `}</style>
    </>
  )
}
