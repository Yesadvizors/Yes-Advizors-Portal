const body = process.env.PR_BODY || '';

const requiredSections = [
  'Objective',
  'Current stable version',
  'Proposed change',
  'Files/functions affected',
  'Database tables affected',
  'Permission impact',
  'Security impact',
  'Risk level',
  'Rollback plan',
  'Test cases',
  'Expected result',
  'What will NOT be touched',
  'Approval required before'
];

const normalized = body.toLowerCase();
const missing = [];

if (!normalized.includes('review pack')) {
  missing.push('REVIEW PACK header');
}

for (const section of requiredSections) {
  if (!normalized.includes(section.toLowerCase())) {
    missing.push(section);
  }
}

const approvalChecks = ['Merge', 'Deployment', 'DB change', 'Staff access change'];
for (const check of approvalChecks) {
  if (!normalized.includes(check.toLowerCase())) {
    missing.push(`Approval required before: ${check}`);
  }
}

if (missing.length > 0) {
  console.error('REVIEW PACK gate failed. Missing required items:');
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  console.error('\nEvery PR to main must include the complete REVIEW PACK before review/merge.');
  process.exit(1);
}

console.log('REVIEW PACK gate passed.');
