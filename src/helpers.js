// Due date metadata — ageing badges like HTML version
export function getDueMeta(dueDate, status) {
  if (status === 'Done' || status === 'Cancelled') return { label: '', color: '#9CA3AF', daysLeft: null, badge: '' }
  if (!dueDate) return { label: 'No date', color: '#9CA3AF', daysLeft: null, badge: '' }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((due - today) / 86400000)
  if (daysLeft < 0) return { label: `Overdue (${Math.abs(daysLeft)}d)`, color: '#DC2626', daysLeft, badge: '🔴 Overdue' }
  if (daysLeft === 0) return { label: 'Due today!', color: '#DC2626', daysLeft, badge: '🔴 Today' }
  if (daysLeft <= 3) return { label: `Due in ${daysLeft}d`, color: '#D97706', daysLeft, badge: '🟠 Due in 3d' }
  if (daysLeft <= 7) return { label: `Due in ${daysLeft}d`, color: '#CA8A04', daysLeft, badge: '🟡 Due in 7d' }
  return { label: fmtDate(dueDate), color: '#059669', daysLeft, badge: '🟢 Upcoming' }
}

export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function priColor(p) {
  if (p === 'Urgent') return { bg: '#FEE2E2', c: '#DC2626' }
  if (p === 'High') return { bg: '#FEF3C7', c: '#D97706' }
  if (p === 'Low') return { bg: '#F1F5F9', c: '#64748B' }
  return { bg: '#F3F4F6', c: '#6B7280' }
}

export const TEAM = ['Pankaj', 'Shivam', 'Prashant', 'Ankit', 'Vega', 'Sejal', 'Simmi', 'Ayush']
export const CLIENT_TYPES = ['Individual', 'Proprietorship', 'Partnership Firm', 'Company (Pvt Ltd)', 'LLP', 'OPC (One Person Company)', 'Trust / NGO', 'HUF']
export const STATUS_OPTIONS = ['Pending', 'In Progress', 'Waiting for Client', 'Document Received', 'Under Review', 'Filed / Completed', 'Done', 'On Hold', 'Cancelled']
export const COMPLIANCE_TYPES = ['GSTR-1', 'GSTR-3B', 'GSTR-9', 'GSTR-9C', 'ITR Filing', 'TDS Return (24Q)', 'TDS Return (26Q)', 'TDS Return (27Q)', 'ROC Annual (AOC-4)', 'ROC Annual (MGT-7)', 'Advance Tax', 'Tax Audit', 'PF Return', 'ESI Return', 'PT Return', 'Other']

export function isMyTask(task, user) {
  const first = user.name.split(' ')[0]
  const a = task.assigned_to || ''
  return a === user.name || a === first || user.name.startsWith(a) || a.startsWith(first)
}
