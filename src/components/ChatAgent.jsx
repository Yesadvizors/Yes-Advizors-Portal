import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'

const SUGGESTIONS = [
  '📊 How many clients do we have?',
  '📄 Documents of Flick Media',
  '✅ Any pending compliance?',
  '👥 Show team members',
]

export default function ChatAgent() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m **YA Assistant** 👋\n\nI have live access to your client database, compliance tracker, documents and tasks.\n\nAsk me anything about Yes Advizors data!' }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [thinkingText, setThinkingText] = useState('Searching data…')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
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
    const updated = [...messages, { role: 'user', text: q }]
    setMessages(updated)
    setThinking(true)
    setThinkingText('Searching data…')
    setTimeout(() => setThinkingText('Analysing…'), 1500)

    try {
      const history = updated
        .filter((_, i) => i > 0)
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }))

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: { messages: history }
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: (error || data?.error) ? '⚠️ Something went wrong. Please try again.' : data.response
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Connection error. Please try again.' }])
    }
    setThinking(false)
  }

  function renderText(text) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <div key={i} style={{ display:'flex', gap:7, marginTop:4 }}>
            <span style={{ color:'#E8D5A3', flexShrink:0, marginTop:1 }}>▸</span>
            <span>{formatInline(line.slice(2))}</span>
          </div>
        )
      }
      if (line.trim() === '') return <div key={i} style={{ height:5 }} />
      return <div key={i}>{formatInline(line)}</div>
    })
  }

  function renderUserText(text) {
    return text.split('\n').map((line, i) => (
      <div key={i}>{line || <br />}</div>
    ))
  }

  function formatInline(text) {
    return text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
      p.startsWith('**') ? <strong key={i} style={{ fontWeight:700 }}>{p.slice(2,-2)}</strong> : p
    )
  }

  return (
    <>
      {/* Floating button */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9000, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
        {!open && (
          <div style={{ background:'#1A2942', color:'#E8D5A3', fontSize:11.5, fontWeight:600, padding:'6px 12px',
            borderRadius:20, boxShadow:'0 2px 12px rgba(0,0,0,.2)', whiteSpace:'nowrap',
            animation:'fadeIn .3s ease' }}>
            Ask YA Assistant
          </div>
        )}
        <button onClick={() => setOpen(o => !o)}
          style={{ width:54, height:54, borderRadius:'50%',
            background: open ? '#1A2942' : 'linear-gradient(135deg,#0D7A53 0%,#1A2942 100%)',
            border:'2px solid rgba(232,213,163,.3)', cursor:'pointer',
            boxShadow:'0 4px 24px rgba(13,122,83,.35)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
            transition:'all .25s ease', transform: open ? 'rotate(45deg) scale(1.05)' : 'scale(1)' }}>
          {open ? <span style={{ color:'#fff', fontSize:18, fontWeight:300 }}>✕</span> : '🤖'}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div style={{ position:'fixed', bottom:92, right:24, zIndex:8999,
          width:380, maxWidth:'calc(100vw - 32px)',
          background:'#fff', borderRadius:20,
          boxShadow:'0 12px 60px rgba(0,0,0,.18), 0 0 0 1px rgba(13,122,83,.1)',
          display:'flex', flexDirection:'column', maxHeight:'72vh', overflow:'hidden',
          animation:'slideUp .25s ease' }}>

          {/* Header */}
          <div style={{ background:'linear-gradient(135deg,#0A1628 0%,#1A2942 50%,#0D7A53 100%)',
            padding:'16px 18px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <div style={{ width:40, height:40, borderRadius:'50%',
              background:'rgba(232,213,163,.15)', border:'1.5px solid rgba(232,213,163,.3)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
            <div style={{ flex:1 }}>
              <div style={{ color:'#E8D5A3', fontSize:14, fontWeight:700, letterSpacing:.3 }}>YA Assistant</div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, marginTop:1 }}>
                {thinking ? <span style={{ color:'#4ADE80' }}>● {thinkingText}</span> : '● Online · Live data access'}
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background:'rgba(255,255,255,.08)', border:'none', color:'rgba(255,255,255,.5)',
                width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:14,
                display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 14px 8px', display:'flex', flexDirection:'column', gap:12,
            scrollbarWidth:'thin', scrollbarColor:'#E5E7EB transparent' }}>

            {messages.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start', gap:8 }}>
                {m.role === 'assistant' && (
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#0A1628,#0D7A53)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, marginTop:2 }}>🤖</div>
                )}
                <div style={{
                  maxWidth:'80%',
                  padding: m.role==='user' ? '10px 14px' : '11px 14px',
                  borderRadius: m.role==='user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  background: m.role==='user'
                    ? 'linear-gradient(135deg,#0D7A53,#1A2942)'
                    : '#F8FAFB',
                  border: m.role==='assistant' ? '1px solid #E8EDF0' : 'none',
                  color: m.role==='user' ? '#fff' : '#1A2942',
                  fontSize:13, lineHeight:1.6,
                  boxShadow: m.role==='user' ? '0 2px 12px rgba(13,122,83,.25)' : '0 1px 4px rgba(0,0,0,.06)'
                }}>
                  {m.role === 'assistant' ? renderText(m.text) : renderUserText(m.text)}
                </div>
              </div>
            ))}

            {thinking && (
              <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#0A1628,#0D7A53)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>🤖</div>
                <div style={{ background:'#F8FAFB', border:'1px solid #E8EDF0', padding:'12px 16px',
                  borderRadius:'4px 18px 18px 18px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ display:'flex', gap:4 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--dkgreen)',
                        animation:'bounce .9s infinite ease-in-out', animationDelay:`${i*0.2}s` }} />
                    ))}
                  </div>
                  <span style={{ fontSize:11.5, color:'var(--gray2)', fontStyle:'italic' }}>{thinkingText}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && !thinking && (
            <div style={{ padding:'4px 14px 10px', display:'flex', flexWrap:'wrap', gap:6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s.replace(/^[^\s]+\s/, ''))}
                  style={{ padding:'6px 11px', borderRadius:20,
                    border:'1px solid rgba(13,122,83,.2)',
                    background:'linear-gradient(135deg,rgba(13,122,83,.04),rgba(13,122,83,.08))',
                    color:'var(--dkgreen)', fontSize:11.5, cursor:'pointer', fontWeight:500,
                    transition:'all .15s' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'10px 12px 12px', borderTop:'1px solid #F0F4F3', display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything about your portal…"
              disabled={thinking}
              style={{ flex:1, padding:'10px 14px', border:'1.5px solid #E5E7EB', borderRadius:24,
                fontSize:13, outline:'none', fontFamily:'inherit', transition:'border .2s',
                background: thinking ? '#FAFAFA' : '#fff',
                borderColor: input ? 'var(--dkgreen)' : '#E5E7EB' }} />
            <button onClick={() => send()} disabled={!input.trim() || thinking}
              style={{ width:38, height:38, borderRadius:'50%', border:'none', flexShrink:0,
                background: input.trim() && !thinking ? 'linear-gradient(135deg,#0D7A53,#1A2942)' : '#E5E7EB',
                color: input.trim() && !thinking ? '#fff' : '#9CA3AF',
                cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
                transition:'all .2s', boxShadow: input.trim() && !thinking ? '0 2px 8px rgba(13,122,83,.3)' : 'none' }}>
              ➤
            </button>
          </div>

          {/* Footer */}
          <div style={{ padding:'6px 14px 10px', textAlign:'center', fontSize:10.5, color:'#C0C8D0' }}>
            Powered by Claude AI · Live Yes Advizors data
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6)} 40%{transform:scale(1)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </>
  )
}
