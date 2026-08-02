// Task-status vocabularies. A task carrying a completion status must never be
// counted as open/overdue, and completed tasks include the "Filed / Completed"
// status offered by the follow-up modal (not only "Done").
export const CLOSED_TASK_STATUSES = ['Done', 'Cancelled', 'Filed / Completed']
export const COMPLETED_TASK_STATUSES = ['Done', 'Filed / Completed']
export function isTaskClosed(status) { return CLOSED_TASK_STATUSES.includes(status) }
export function isTaskCompleted(status) { return COMPLETED_TASK_STATUSES.includes(status) }

// Local calendar date as YYYY-MM-DD. Using toISOString() gives the UTC date,
// which is "yesterday" for IST (UTC+5:30) between 00:00–05:30 local and made the
// overdue/due-today cards disagree with the local-time ageing badges below.
export function todayLocal() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Due date metadata — ageing badges like HTML version
export function getDueMeta(dueDate, status) {
  if (isTaskClosed(status)) return { label: '', color: '#9CA3AF', daysLeft: null, badge: '' }
  if (!dueDate) return { label: 'No date', color: '#9CA3AF', daysLeft: null, badge: '' }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
  if (isNaN(due.getTime())) return { label: 'No date', color: '#9CA3AF', daysLeft: null, badge: '' }
  const daysLeft = Math.round((due - today) / 86400000)
  if (daysLeft < 0) return { label: `Overdue (${Math.abs(daysLeft)}d)`, color: '#DC2626', daysLeft, badge: '🔴 Overdue' }
  if (daysLeft === 0) return { label: 'Due today!', color: '#DC2626', daysLeft, badge: '🔴 Today' }
  if (daysLeft <= 3) return { label: `Due in ${daysLeft}d`, color: '#D97706', daysLeft, badge: '🟠 Due in 3d' }
  if (daysLeft <= 7) return { label: `Due in ${daysLeft}d`, color: '#CA8A04', daysLeft, badge: '🟡 Due in 7d' }
  return { label: fmtDate(dueDate), color: '#059669', daysLeft, badge: '🟢 Upcoming' }
}

export function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function priColor(p) {
  if (p === 'Urgent') return { bg: '#FEE2E2', c: '#DC2626' }
  if (p === 'High') return { bg: '#FEF3C7', c: '#D97706' }
  if (p === 'Low') return { bg: '#F1F5F9', c: '#64748B' }
  return { bg: '#F3F4F6', c: '#6B7280' }
}

export const CLIENT_TYPES = ['Individual', 'Proprietorship', 'Partnership Firm', 'Company (Pvt Ltd)', 'LLP', 'OPC (One Person Company)', 'Trust / NGO', 'HUF']
export const STATUS_OPTIONS = ['Pending', 'In Progress', 'Waiting for Client', 'Document Received', 'Under Review', 'Filed / Completed', 'Done', 'On Hold', 'Cancelled']
export const COMPLIANCE_TYPES = ['GSTR-1', 'GSTR-3B', 'GSTR-9', 'GSTR-9C', 'ITR Filing', 'TDS Return (24Q)', 'TDS Return (26Q)', 'TDS Return (27Q)', 'ROC Annual (AOC-4)', 'ROC Annual (MGT-7)', 'Advance Tax', 'Tax Audit', 'PF Return', 'ESI Return', 'PT Return', 'Other']

export function isMyTask(task, user) {
  const a = (task?.assigned_to || '').trim()
  // An unassigned (null/blank) task is nobody's task: previously `startsWith('')`
  // returned true for everyone, letting any user complete null-assignee rows.
  if (!a || !user || !user.name) return false
  const first = user.name.split(' ')[0]
  return a === user.name || a === first || user.name.startsWith(a) || a.startsWith(first)
}

// ── Indian compliance validations ──
export const VALIDATORS = {
  pan: v => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v) || 'PAN must be like ABCDE1234F',
  gstin: v => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/.test(v) || 'Invalid GSTIN (15 chars)',
  tan: v => !v || /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(v) || 'TAN must be like ABCD12345E',
  mobile: v => !v || /^[0-9]{10}$/.test(v) || 'Mobile must be 10 digits',
  email: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email',
  din: v => !v || /^[0-9]{8}$/.test(v) || 'DIN must be 8 digits',
  aadhaar: v => !v || /^[0-9]{12}$/.test(v) || 'Aadhaar must be 12 digits',
  esi: v => !v || /^[0-9]{17}$/.test(v) || 'ESI must be 17 digits',
  pincode: v => !v || /^[0-9]{6}$/.test(v) || 'Pincode must be 6 digits',
}

export const ALL_CLIENT_TYPES = [
  'Individual', 'Proprietorship', 'Partnership Firm', 'LLP',
  'Private Limited Company', 'Public Limited Company', 'Section 8 Company', 'HUF'
]

// Point 5 & 6: person label + role name based on client type
export function personConfig(clientType) {
  switch (clientType) {
    case 'Private Limited Company':
    case 'Public Limited Company':
    case 'Section 8 Company':
      return { countLabel: 'Number of Directors', role: 'Director' }
    case 'LLP':
      return { countLabel: 'Number of Designated Partners', role: 'Designated Partner' }
    case 'Partnership Firm':
      return { countLabel: 'Number of Partners', role: 'Partner' }
    case 'Proprietorship':
      return { countLabel: 'Owner Details', role: 'Owner' }
    case 'Individual':
    case 'HUF':
      return { countLabel: 'Person Details', role: 'Person' }
    default:
      return { countLabel: 'Number of Directors / Partners / Owners', role: 'Person' }
  }
}

// Point 4: extra validators
export const EXTRA_VALIDATORS = {
  udyam: v => !v || /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/.test(v) || 'Format: UDYAM-XX-00-0000000',
  pf: v => !v || /^[A-Z]{2}\/[A-Z]{3}\/[0-9]{7}\/[0-9]{3}\/[0-9]{7}$|^[A-Z]{5}[0-9]{17}$/.test(v) || 'Enter a valid PF number',
}
