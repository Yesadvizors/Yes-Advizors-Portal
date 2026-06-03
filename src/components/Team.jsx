import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Team({ user }) {
  const [team, setTeam] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data: t } = await supabase.from('team').select('*').order('id')
    const { data: tk } = await supabase.from('tasks').select('*')
    setTeam(t || [])
    setTasks(tk || [])
    setLoading(false)
  }

  function taskCount(name) {
    const first = name.split(' ')[0]
    return tasks.filter(t => {
      const a = t.assigned_to || ''
      return (a === name || a === first || a.startsWith(first)) && t.status !== 'Done' && t.status !== 'Cancelled'
    }).length
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Team</h1>
      <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 24 }}>Your firm members and workload</p>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray2)' }}>Loading...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {team.map(m => (
            <div key={m.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: m.color || 'var(--dkgreen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{m.initials}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)' }}>{m.role}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border2)' }}>
                <span style={{ fontSize: 12, color: 'var(--gray)' }}>Open tasks</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--dkgreen)' }}>{taskCount(m.name)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
