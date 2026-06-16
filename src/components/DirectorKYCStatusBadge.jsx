// Package D — DirectorKYCStatusBadge.jsx (REVIEW ARTIFACT)
// Colour is driven SOLELY by compliance_status. Internal-control advisory is a
// SEPARATE secondary chip and never recolours the badge.
import React from 'react';

const STATUS_META = {
  MANUAL_REVIEW:       { label: 'Manual review',          color: 'var(--purple, #7C3AED)', bg: '#F3E8FF' },
  OVERDUE:             { label: 'Overdue',                color: 'var(--red, #DC2626)',    bg: '#FEE2E2' },
  OVERDUE_INTERPRETED: { label: 'Overdue (interpreted)',  color: 'var(--red, #DC2626)',    bg: '#FEE2E2' },
  DUE_SOON:            { label: 'Due soon',               color: 'var(--amber, #D97706)',  bg: '#FEF3C7' },
  SUBMITTED_PENDING:   { label: 'Submitted — pending',    color: 'var(--blue, #2563EB)',   bg: '#DBEAFE' },
  FILED_VERIFIED:      { label: 'Filed & verified',       color: 'var(--dkgreen, #0D7A53)',bg: '#D1FAE5' },
  NOT_YET_DUE:         { label: 'Not yet due',            color: 'var(--gray, #6B7280)',   bg: '#F3F4F6' },
};

export function DirectorKYCStatusBadge({ status, interpretation_applied }) {
  // Fail closed: an unknown, null, misspelled, or future server status renders as MANUAL_REVIEW
  // (purple) so it is never silently shown as a safe green/grey statutory status.
  const validStatus = STATUS_META[status] ? status : 'MANUAL_REVIEW';
  const m = STATUS_META[validStatus];
  return (
    <span title={validStatus === 'OVERDUE_INTERPRETED'
        ? 'Overdue under interpreted rule — review recommended' : m.label}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'2px 10px',
        borderRadius:999, fontSize:12, fontWeight:600, color:m.color, background:m.bg }}>
      <span style={{ width:8, height:8, borderRadius:999, background:m.color }} />
      {m.label}
      {interpretation_applied && validStatus !== 'OVERDUE_INTERPRETED' &&
        <span style={{ fontWeight:400, opacity:0.8 }}>· interpreted</span>}
    </span>
  );
}

// Separate, secondary advisory chip — NEVER affects the status colour above.
export function InternalControlChip({ internal_control_status, internal_control_message }) {
  if (!internal_control_status || internal_control_status === 'NONE') return null;
  return (
    <span title={(internal_control_message || 'Internal control advisory') + ' (internal control, not a statutory requirement)'}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'2px 8px',
        borderRadius:6, fontSize:11, color:'var(--navy, #334155)', background:'var(--ltgray, #F1F5F9)',
        border:'1px dashed var(--border, #CBD5E1)' }}>
      ⚐ {internal_control_status === 'DOCUMENT_REVIEW_REQUIRED' ? 'Document review' : 'Advisory'}
    </span>
  );
}
