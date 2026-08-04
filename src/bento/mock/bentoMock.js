/**
 * PRESENTATIONAL ADAPTER — approved Bento dashboard (Concept 6).
 * ----------------------------------------------------------------------------
 * DESIGN-ONLY fixtures mirroring the approved reference image so the flagged
 * dashboard renders pixel-faithfully without live data. Performs NO network /
 * Supabase / DB access and NO writes. Each panel below maps to a real YAV2 data
 * dependency documented in docs/frontend/approved-bento/DEFERRED_DATA_WIRING.md;
 * those reads are intentionally deferred to a later phase (see that doc).
 *
 * The approved LAYOUT is authoritative; these SAMPLE NUMBERS are not.
 */
export const BENTO_USER = { name: 'Arjun Mehta', role: 'Partner', initials: 'AM', is_admin: true }
export const BENTO_NOTIFICATIONS = 3
export const PAGE_CONTEXT = 'Dashboard' // sanctioned substitution for the mock's "Concept 6" pill

export const KPIS = [
  { key: 'total',      tone: 'blue',   label: 'Total Tasks',    value: '128', trend: { dir: 'up',   pct: '12%', tone: 'up' } },
  { key: 'pending',    tone: 'amber',  label: 'Pending',        value: '67',  trend: { dir: 'up',   pct: '8%',  tone: 'muted' } },
  { key: 'overdue',    tone: 'red',    label: 'Overdue',        value: '14',  trend: { dir: 'up',   pct: '27%', tone: 'down' } },
  { key: 'today',      tone: 'green',  label: 'Due Today',      value: '9',   trend: { dir: 'down', pct: '18%', tone: 'muted' } },
  { key: 'clients',    tone: 'blue',   label: 'Active Clients', value: '56',  trend: { dir: 'up',   pct: '5%',  tone: 'up' } },
  { key: 'compliance', tone: 'purple', label: 'Compliance Due', value: '23',  trend: { dir: 'down', pct: '13%', tone: 'muted' } },
]

export const ATTENTION = [
  { id: 1, title: '14 tasks are overdue', sub: 'Across 7 clients' },
  { id: 2, title: '3 compliance items due today', sub: 'GST, TDS, ROC' },
  { id: 3, title: 'Client ABC Pvt Ltd', sub: 'Document request pending' },
  { id: 4, title: 'ITR filings due in 5 days', sub: 'For 6 clients' },
]

export const OPERATIONAL = {
  progress: 72,
  statuses: [
    { key: 'done', label: 'Completed',   count: 92, pct: 72, tone: 'green' },
    { key: 'prog', label: 'In Progress', count: 23, pct: 18, tone: 'amber' },
    { key: 'not',  label: 'Not Started', count: 13, pct: 10, tone: 'blue' },
  ],
  topAreas: [
    { key: 'gst',   icon: 'rupee',    name: 'GST Compliance',   count: 32 },
    { key: 'it',    icon: 'file',     name: 'Income Tax',       count: 28 },
    { key: 'roc',   icon: 'building', name: 'ROC Filings',      count: 18 },
    { key: 'audit', icon: 'shield',   name: 'Audit & Assurance', count: 15 },
    { key: 'other', icon: 'grid',     name: 'Others',           count: 35 },
  ],
}

export const TEAM = [
  { id: 1, name: 'Arjun Mehta',  role: 'Partner',          pct: 85, tone: 'green-strong' },
  { id: 2, name: 'Priya Sharma', role: 'Manager',          pct: 72, tone: 'green' },
  { id: 3, name: 'Rohit Verma',  role: 'Senior Associate', pct: 68, tone: 'green' },
  { id: 4, name: 'Neha Iyer',    role: 'Associate',        pct: 55, tone: 'amber' },
  { id: 5, name: 'Karan Singh',  role: 'Associate',        pct: 40, tone: 'blue' },
]

export const DUE_THIS_WEEK = [
  { id: 1, day: '20', mon: 'MAY', title: 'GST Returns - GSTR 1', sub: '8 Clients', chip: 'Due Tomorrow' },
  { id: 2, day: '22', mon: 'MAY', title: 'TDS Returns - Q4',     sub: '5 Clients', chip: 'Due in 3 days' },
  { id: 3, day: '24', mon: 'MAY', title: 'ROC Filings',          sub: '3 Clients', chip: 'Due in 5 days' },
]

export const ACTIVITY = [
  { id: 1, icon: 'check',  tone: 'green', title: 'GST return filed for ABC Pvt Ltd', sub: 'Completed by Priya Sharma', time: '2h ago' },
  { id: 2, icon: 'upload', tone: 'blue',  title: 'Document uploaded for XYZ LLP',    sub: 'Uploaded by Rohit Verma',  time: '4h ago' },
  { id: 3, icon: 'clock',  tone: 'amber', title: 'Task updated: Audit Planning',     sub: 'Updated by Neha Iyer',     time: '1d ago' },
  { id: 4, icon: 'users',  tone: 'green', title: 'New client added: PQR Solutions Pvt Ltd', sub: 'Added by Karan Singh', time: '1d ago' },
]

export const QUICK_ACTIONS = [
  { key: 'add-client',   icon: 'user-plus',  label: 'Add New Client' },
  { key: 'create-task',  icon: 'plus',       label: 'Create Task' },
  { key: 'upload-doc',   icon: 'upload',     label: 'Upload Document' },
  { key: 'record-time',  icon: 'timer',      label: 'Record Time' },
  { key: 'cal',          icon: 'calendar',   label: 'Compliance Calendar' },
  { key: 'report',       icon: 'chart',      label: 'Generate Report' },
  { key: 'note',         icon: 'note',       label: 'Internal Note' },
  { key: 'request-doc',  icon: 'request',    label: 'Request Document' },
]

export const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'clients', label: 'Clients' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'documents', label: 'Documents' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'team', label: 'Team' },
  { id: 'reports', label: 'Reports' },
  { id: 'templates', label: 'Templates' },
  { id: 'knowledge', label: 'Knowledge Hub' },
  { id: 'settings', label: 'Settings' },
]
