import { useState } from 'react'
import { supabase } from '../supabase'

const DOMAIN = '@yesadvizors.com'

function isDomainValid(email) {
  return email.trim().toLowerCase().endsWith(DOMAIN)
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'sent'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleLogin(e) {
    if (e) e.preventDefault()
    setErr('')
    if (!email.trim() || !password) { setErr('Please enter email and password'); return }
    if (!isDomainValid(email)) { setErr(`Only ${DOMAIN} accounts can access this portal`); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password
    })
    if (error) { setLoading(false); setErr('Email or password is incorrect.'); return }
    const { data: member } = await supabase.from('team').select('*')
      .ilike('email', email.trim()).eq('is_active', true).maybeSingle()
    setLoading(false)
    if (!member) { await supabase.auth.signOut(); setErr('Your account is not active. Contact Pankaj.'); return }
    onLogin(member)
  }

  async function handleForgot(e) {
    if (e) e.preventDefault()
    setErr('')
    if (!email.trim()) { setErr('Please enter your email'); return }
    if (!isDomainValid(email)) { setErr(`Only ${DOMAIN} emails are supported`); return }

    setLoading(true)
    // Check team table — only send reset if email exists AND is_active = true
    const { data: member } = await supabase.from('team').select('id, is_active')
      .ilike('email', email.trim()).maybeSingle()

    if (member && member.is_active) {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin
      })
    }
    // Always show same message — never reveal whether account exists
    setLoading(false)
    setMode('sent')
  }

  const box = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }
  const btn = (disabled) => ({ width: '100%', padding: 13, background: 'var(--ds-brand)', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 650, color: '#fff', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.7 : 1 })
  const lnk = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }

  return (
    <div className="ds-app" style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #12203A 0%, var(--ds-navy) 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '40px 34px', width: '100%', maxWidth: 390, textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,0.45)' }}>
        <div style={{ width: 58, height: 58, background: 'linear-gradient(135deg, var(--ds-brand) 0%, var(--ds-brand-700) 100%)', borderRadius: 14, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: 0.5 }}>YA</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>Yes Advizors</div>
        <div style={{ fontSize: 10.5, color: 'var(--ds-brand-200)', letterSpacing: 2.4, textTransform: 'uppercase', marginBottom: 20, marginTop: 2 }}>Team Portal</div>

        {/* ── SIGN IN ── */}
        {mode === 'login' && <>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginBottom: 24 }}>Sign in with your Yes Advizors credentials</div>
          <form onSubmit={handleLogin}>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@yesadvizors.com" autoComplete="email" style={{ ...box, marginBottom: 10 }} />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="current-password" style={{ ...box, marginBottom: 4 }} />
            <div role="alert" style={{ fontSize: 12, color: '#FCA5A5', minHeight: 18, marginBottom: 12, textAlign: 'left' }}>{err}</div>
            <button type="submit" disabled={loading} style={btn(loading)}>{loading ? 'Signing in…' : 'Sign in →'}</button>
          </form>
          <button onClick={() => { setMode('forgot'); setErr(''); setEmail('') }} style={{ ...lnk, marginTop: 16 }}>Forgot password?</button>
        </>}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && <>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Reset password</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginBottom: 24 }}>Enter your Yes Advizors email address</div>
          <form onSubmit={handleForgot}>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@yesadvizors.com" autoComplete="email" style={{ ...box, marginBottom: 4 }} />
            <div role="alert" style={{ fontSize: 12, color: '#FCA5A5', minHeight: 18, marginBottom: 12, textAlign: 'left' }}>{err}</div>
            <button type="submit" disabled={loading} style={btn(loading)}>{loading ? 'Sending…' : 'Send reset link'}</button>
          </form>
          <button onClick={() => { setMode('login'); setErr('') }} style={{ ...lnk, marginTop: 16 }}>← Back to sign in</button>
        </>}

        {/* ── EMAIL SENT ── */}
        {mode === 'sent' && <>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Check your email</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 24 }}>
            If <span style={{ color: 'var(--ds-brand-200)' }}>{email}</span> is registered and active,<br />
            a reset link has been sent to that address.
          </div>
          <button onClick={() => { setMode('login'); setErr(''); setEmail('') }} style={btn(false)}>Back to sign in</button>
        </>}

        <div style={{ marginTop: 22, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>🔒 Yes Advizors — Authorised Access Only</div>
      </div>
    </div>
  )
}
