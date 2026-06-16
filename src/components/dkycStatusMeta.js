// Package D — dkycStatusMeta.js (REVIEW ARTIFACT)
// Static lookup only; no calculation. Frontend renders server values.
export const COMPLIANCE_STATUSES = [
  'MANUAL_REVIEW','OVERDUE','OVERDUE_INTERPRETED','DUE_SOON',
  'SUBMITTED_PENDING','FILED_VERIFIED','NOT_YET_DUE',
];
export const STATUS_COLOR_KEY = {
  MANUAL_REVIEW:'purple', OVERDUE:'red', OVERDUE_INTERPRETED:'red', DUE_SOON:'amber',
  SUBMITTED_PENDING:'blue', FILED_VERIFIED:'green', NOT_YET_DUE:'grey',
};
export const INTERPRETED_QUALIFIER = 'Overdue under interpreted rule — review recommended';
