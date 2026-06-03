export default function HowToUse() {
  const steps = [
    { icon: '👥', title: 'Onboard clients first', text: 'Go to Clients tab → + New Client. Every task needs a client. For quick work, you can also quick-add a client inside the Add Task screen.' },
    { icon: '✅', title: 'Create tasks', text: 'Tasks tab → + Add Task. Search the client, fill task details, assign to a team member. Task saves permanently in the database.' },
    { icon: '📝', title: 'Add follow-ups', text: 'On any task assigned to you, click + Follow-up. Write status updates, next action, follow-up date. Full history is kept — nothing is lost.' },
    { icon: '📅', title: 'Track compliance', text: 'Compliance tab → add GST, ITR, TDS, ROC deadlines. Update status as you file. Overdue items are flagged in red.' },
    { icon: '🧑‍💼', title: 'Team workload', text: 'Team tab shows each member and how many open tasks they have. Helps you balance work across the firm.' },
  ]
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>How to Use</h1>
      <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 24 }}>Quick guide for your team</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((s, i) => (
          <div key={i} className="card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>{s.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
