import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleLogin(e) {
    if (e) e.preventDefault()
    setErr('')
    if (!email.trim()) { setErr('Please enter your email'); return }
    if (!password) { setErr('Please enter your password'); return }
    setLoading(true)

    // Real Supabase Auth — JWT session, works with RLS
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    })
    if (error) {
      setLoading(false)
      setErr('Email or password is incorrect.')
      return
    }

    // Load team profile for display name, initials, colour
    const { data: member } = await supabase
      .from('team').select('*')
      .ilike('email', email.trim())
      .eq('is_active', true)
      .maybeSingle()

    setLoading(false)
    onLogin(member || {
      name: data.user.email.split('@')[0],
      email: data.user.email,
      initials: data.user.email[0].toUpperCase(),
      color: '#0D7A53'
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#161b22', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 16, padding: '40px 32px', width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, background: '#0a1628', borderRadius: 12, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(76,175,80,0.4)' }}>
          <span style={{ color: '#4caf50', fontSize: 20, fontWeight: 900 }}>YA</span>
        </div>
        <div style={{ fontSize: 11, color: '#4caf50', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Team Portal</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Welcome back</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 26 }}>Sign in with your team credentials</div>

        <form onSubmit={handleLogin}>
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="your@yesadvizors.com" autoComplete="email"
            style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 14, color: '#fff', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
          <input
            value={password} onChange={e => setPassword(e.target.value)}
            type="password" placeholder="Password" autoComplete="current-password"
            style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 14, color: '#fff', outline: 'none', marginBottom: 4, boxSizing: 'border-box' }} />
          <div style={{ fontSize: 12, color: '#f87171', minHeight: 18, marginBottom: 12, textAlign: 'left' }}>{err}</div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 13, background: '#4caf50', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#111', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>🔒 Yes Advizors — Authorised Access Only</div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
          Account not working? Ask Pankaj to set up your<br/>login in the Supabase dashboard.
        </div>
      </div>
    </div>
  )
}
