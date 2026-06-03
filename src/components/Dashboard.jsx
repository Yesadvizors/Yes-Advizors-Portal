import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({ total: 0, pending: 0, overdue: 0, completed: 0, followupToday: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    const { data: tasks } = await supabase.from('tasks').select('*')
    const today = new Date().toISOString().split('T')[0]
    const t = tasks || []
    setStats({
      total: t.length,
      pending: t.filter(x => x.status !== 'Done' && x.status !== 'Cancelled').length,
      overdue: t.filter(x => x.due_date && x.due_date < today && x.status !== 'Done' && x.status !== 'Cancelled').length,
      completed: t.filter(x => x.status === 'Done').length,
      followupToday: t.filter(x => x.next_followup_date === today).length,
    })
    setLoading(false)
  }

  const cards = [
    { label: 'TOTAL', value: stats.total, color: '#1A2942', accent: '#1A2942' },
    { label: 'PENDING', value: stats.pending, color: '#1D4ED8', accent: '#1D4ED8' },
    { label: 'OVERDUE', value: stats.overdue, color: '#DC2626', accent: '#DC2626' },
    { label: 'COMPLETED', value: stats.completed, color: '#0D7A53', accent: '#0D7A53' },
    { label: 'FOLLOW-UP TODAY', value: stats.followupToday, color: '#D97706', accent: '#F59E0B', bg: '#FFFBEB' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy2)', marginBottom: 4 }}>Welcome, {user.name}</h1>
      <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 24 }}>Here is your firm overview</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {cards.map(c => (
          <div key={c.label} className="card" style={{ padding: 20, borderTop: `3px solid ${c.accent}`, background: c.bg || '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray2)', letterSpacing: 0.5, marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: c.color }}>{loading ? '—' : c.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Quick start</h3>
        <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>
          Your portal is now live with a real database. Go to the <strong>Tasks</strong> tab to add tasks, 
          <strong> Clients</strong> to onboard clients, and <strong>Compliance</strong> to track GST/ITR/TDS deadlines. 
          Everything saves permanently and updates live for your whole team.
        </p>
      </div>
    </div>
  )
}
