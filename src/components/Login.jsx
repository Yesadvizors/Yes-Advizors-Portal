import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleLogin() {
    setErr('')
    if (!email.trim()) { setErr('Please enter your email'); return }
    setLoading(true)
    // Match email against team table
    const { data, error } = await supabase
      .from('team')
      .select('*')
      .ilike('email', email.trim())
      .eq('is_active', true)
      .maybeSingle()
    setLoading(false)
    if (error) { setErr('Login error. Please try again.'); return }
    if (!data) { setErr('Email not found in team list. Contact Pankaj.'); return }
    onLogin(data)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#161b22', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 16, padding: '40px 32px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, background: '#0a1628', borderRadius: 12, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(76,175,80,0.4)' }}>
          <span style={{ color: '#4caf50', fontSize: 20, fontWeight: 900 }}>YA</span>
        </div>
        <div style={{ fontSize: 11, color: '#4caf50', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Team Portal</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Welcome</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 26 }}>Enter your team email to login</div>

        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@yesadvizors.com"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 14, color: '#fff', outline: 'none', marginBottom: 4 }} />
        <div style={{ fontSize: 12, color: '#f87171', minHeight: 18, marginBottom: 12, textAlign: 'left' }}>{err}</div>
        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: 13, background: '#4caf50', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#111', cursor: 'pointer' }}>
          {loading ? 'Checking...' : 'Login →'}
        </button>
        <div style={{ marginTop: 20, fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>🔒 Yes Advizors — Authorised Access Only</div>
      </div>
    </div>
  )
}
