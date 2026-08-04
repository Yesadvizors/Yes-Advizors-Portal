/**
 * Representative MOCK data for the 2026 design prototype ONLY.
 * ----------------------------------------------------------------------------
 * This is a presentational adapter. It performs NO network / Supabase / DB
 * access and NO writes. Numbers and names are illustrative fixtures so the
 * flagged prototype can be reviewed without credentials or live data.
 */

export const MOCK_USER = {
  name: 'Priya Nair',
  initials: 'PN',
  email: 'priya@yesadvizors.example',
  is_admin: true,
  color: '#0E7C5A',
  role: 'Engagement Manager',
}

export const CURRENT_FY = 'FY 2025–26'

/* ── Dashboard: action-first (risk, deadlines, workload) ─────────────────── */
export const DASHBOARD_METRICS = [
  { key: 'overdue', label: 'Overdue filings', value: 7, accent: '#DC2626', foot: 'across 5 clients', trend: { dir: 'down', label: '2 vs last wk' } },
  { key: 'due7', label: 'Due in 7 days', value: 14, accent: '#C2740A', foot: 'GST · TDS · ROC', trend: { dir: 'up', label: '3 vs last wk' } },
  { key: 'open', label: 'Open tasks', value: 38, accent: '#0369A1', foot: '12 unassigned' },
  { key: 'clients', label: 'Active clients', value: 126, accent: '#0E7C5A', foot: '4 onboarding' },
]

export const DASHBOARD_DEADLINES = [
  { id: 1, client: 'Arunodaya Textiles Pvt Ltd', task: 'GSTR-3B — Sep', due: 'Today', status: 'overdue', owner: 'RK' },
  { id: 2, client: 'Meghna Foods LLP', task: 'TDS 26Q — Q2', due: 'Tomorrow', status: 'due', owner: 'PN' },
  { id: 3, client: 'Sri Balaji Traders', task: 'GSTR-1 — Sep', due: 'in 2 days', status: 'due', owner: 'AS' },
  { id: 4, client: 'Nexa Digital India', task: 'ROC AOC-4', due: 'in 4 days', status: 'due', owner: 'RK' },
  { id: 5, client: 'Kaveri Constructions', task: 'Advance Tax — Q2', due: 'in 6 days', status: 'due', owner: 'PN' },
  { id: 6, client: 'Zenith Pharma', task: 'GSTR-3B — Sep', due: 'in 7 days', status: 'due', owner: 'AS' },
]

export const DASHBOARD_WORKLOAD = [
  { name: 'Rahul Kapoor', initials: 'RK', open: 14, overdue: 3, load: 82 },
  { name: 'Priya Nair', initials: 'PN', open: 11, overdue: 1, load: 64 },
  { name: 'Ananya Shah', initials: 'AS', open: 9, overdue: 2, load: 58 },
  { name: 'Vikram Rao', initials: 'VR', open: 4, overdue: 0, load: 26 },
]

export const DASHBOARD_ATTENTION = [
  { id: 1, tone: 'danger', title: '3 filings overdue for Arunodaya Textiles', meta: 'Earliest overdue 4 days · GSTR-3B, GSTR-1' },
  { id: 2, tone: 'warning', title: 'Kaveri Constructions missing PAN verification', meta: 'Blocks onboarding step 3 of 5' },
  { id: 3, tone: 'info', title: 'Nexa Digital renewal due next month', meta: 'Engagement letter expires 30 Sep' },
]

/* ── Client Master: full-page workspace list ─────────────────────────────── */
export const CLIENTS = [
  { id: 'C-1042', name: 'Arunodaya Textiles Pvt Ltd', type: 'Private Ltd', pan: 'AAECA1234F', gstin: '29AAECA1234F1Z5', manager: 'RK', status: 'active', risk: 'high', services: ['GST', 'TDS', 'ROC'], open: 6 },
  { id: 'C-1043', name: 'Meghna Foods LLP', type: 'LLP', pan: 'AABFM5678K', gstin: '27AABFM5678K1ZT', manager: 'PN', status: 'active', risk: 'medium', services: ['GST', 'TDS'], open: 3 },
  { id: 'C-1051', name: 'Sri Balaji Traders', type: 'Proprietorship', pan: 'BXYPS4321L', gstin: '36BXYPS4321L1Z9', manager: 'AS', status: 'active', risk: 'low', services: ['GST'], open: 2 },
  { id: 'C-1067', name: 'Nexa Digital India', type: 'Private Ltd', pan: 'AADCN9012M', gstin: '29AADCN9012M1Z2', manager: 'RK', status: 'active', risk: 'medium', services: ['GST', 'ROC', 'Advisory'], open: 4 },
  { id: 'C-1072', name: 'Kaveri Constructions', type: 'Partnership', pan: 'AAFFK3456P', gstin: '—', manager: 'PN', status: 'onboarding', risk: 'high', services: ['GST', 'TDS'], open: 1 },
  { id: 'C-1080', name: 'Zenith Pharma', type: 'Private Ltd', pan: 'AAGCZ7890Q', gstin: '24AAGCZ7890Q1ZF', manager: 'AS', status: 'active', risk: 'low', services: ['GST', 'TDS', 'ROC'], open: 5 },
  { id: 'C-1091', name: 'Coastal Exports Co', type: 'Partnership', pan: 'AAHFC2345R', gstin: '32AAHFC2345R1Z8', manager: 'VR', status: 'active', risk: 'low', services: ['GST', 'Advisory'], open: 0 },
  { id: 'C-1099', name: 'Lumina Interiors', type: 'Proprietorship', pan: 'CDEPL6789S', gstin: '—', manager: 'VR', status: 'onboarding', risk: 'medium', services: ['GST'], open: 1 },
]

/* ── Client 360: flagship command-centre detail ──────────────────────────── */
export const CLIENT_360 = {
  id: 'C-1042',
  name: 'Arunodaya Textiles Pvt Ltd',
  type: 'Private Limited Company',
  since: 'Client since Apr 2019',
  pan: 'AAECA1234F',
  gstin: '29AAECA1234F1Z5',
  cin: 'U17110KA2011PTC058231',
  manager: 'Rahul Kapoor',
  risk: 'high',
  healthScore: 62,
  contact: { person: 'S. Arun Kumar', phone: '+91 98450 12345', email: 'accounts@arunodaya.example' },
  summary: [
    { label: 'Open tasks', value: 6, accent: '#0369A1' },
    { label: 'Overdue', value: 3, accent: '#DC2626' },
    { label: 'Due 30 days', value: 9, accent: '#C2740A' },
    { label: 'YTD billed', value: '₹2.4L', accent: '#0E7C5A' },
  ],
  compliance: [
    { area: 'GST', period: 'Sep 2025', item: 'GSTR-3B', status: 'overdue', due: '20 Oct' },
    { area: 'GST', period: 'Sep 2025', item: 'GSTR-1', status: 'overdue', due: '11 Oct' },
    { area: 'TDS', period: 'Q2 FY26', item: '24Q / 26Q', status: 'due', due: '31 Oct' },
    { area: 'Income Tax', period: 'FY 2024–25', item: 'ITR-6', status: 'filed', due: '31 Oct' },
    { area: 'ROC', period: 'FY 2024–25', item: 'AOC-4', status: 'due', due: '29 Oct' },
    { area: 'ROC', period: 'FY 2024–25', item: 'MGT-7', status: 'upcoming', due: '28 Nov' },
  ],
  tasks: [
    { id: 't1', title: 'Reconcile Sep GST input credit', owner: 'RK', priority: 'high', due: 'Today' },
    { id: 't2', title: 'Collect TDS challans Q2', owner: 'AS', priority: 'medium', due: 'in 3 days' },
    { id: 't3', title: 'Draft AOC-4 financials', owner: 'RK', priority: 'high', due: 'in 4 days' },
    { id: 't4', title: 'Client call — advance tax', owner: 'PN', priority: 'low', due: 'in 6 days' },
  ],
  documents: [
    { name: 'Sep 2025 Sales Register.xlsx', kind: 'GST', when: '2 days ago' },
    { name: 'TDS Challan Q2.pdf', kind: 'TDS', when: '5 days ago' },
    { name: 'Board Resolution AOC-4.pdf', kind: 'ROC', when: '1 week ago' },
    { name: 'Audited Financials FY24-25.pdf', kind: 'Audit', when: '3 weeks ago' },
  ],
  timeline: [
    { id: 1, title: 'GSTR-3B Aug filed', meta: 'by Rahul Kapoor · 20 Sep', done: true },
    { id: 2, title: 'Engagement letter renewed', meta: 'by Priya Nair · 12 Sep', done: true },
    { id: 3, title: 'Sep sales register received', meta: 'from client · 8 Oct', done: true },
    { id: 4, title: 'GSTR-1 Sep — pending review', meta: 'assigned Rahul Kapoor', done: false },
  ],
}
