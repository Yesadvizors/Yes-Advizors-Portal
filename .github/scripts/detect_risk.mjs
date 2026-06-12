import { execFileSync } from 'node:child_process';

const baseSha = process.env.BASE_SHA;
const headSha = process.env.HEAD_SHA;
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const prNumber = process.env.PR_NUMBER;

if (!baseSha || !headSha) {
  console.log('Missing BASE_SHA or HEAD_SHA. Skipping risk detection.');
  process.exit(0);
}

const output = execFileSync('git', ['diff', '--name-only', `${baseSha}...${headSha}`], {
  encoding: 'utf8'
});

const files = output.split('\n').map((line) => line.trim()).filter(Boolean);

const riskRules = [
  { label: 'Supabase edge function', pattern: /^supabase\/functions\// },
  { label: 'Database migration / SQL', pattern: /(^|\/)(migrations|migration)\/|\.sql$/i },
  { label: 'Secrets / environment file', pattern: /(^|\/)\.env(\.|$)|secret|credential|token|key/i },
  { label: 'Permission / access control', pattern: /(permission|role|team_client_access|chatbot_role|auth|jwt)/i },
  { label: 'Dependency lockfile', pattern: /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/ },
  { label: 'GitHub workflow / CI', pattern: /^\.github\/workflows\// },
  { label: 'Production/Vercel config', pattern: /(vercel\.json|\.vercel|production|deploy)/i }
];

const findings = [];
for (const file of files) {
  for (const rule of riskRules) {
    if (rule.pattern.test(file)) {
      findings.push({ file, reason: rule.label });
    }
  }
}

let summary = '## PR Safety Gate — risk detector\n\n';
summary += `Changed files checked: ${files.length}\n\n`;

if (findings.length === 0) {
  summary += 'No high-risk file patterns detected.\n';
  console.log(summary);
  process.exit(0);
}

summary += 'High-risk file patterns detected. This is advisory, not a merge approval. Review carefully before approval.\n\n';
summary += '| File | Reason |\n|---|---|\n';
for (const finding of findings) {
  summary += `| \`${finding.file}\` | ${finding.reason} |\n`;
}

console.log(summary);

if (token && repository && prNumber) {
  const [owner, repo] = repository.split('/');
  const body = JSON.stringify({ body: summary });
  try {
    await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body
    });
  } catch (error) {
    console.log(`Could not post risk comment: ${error.message}`);
  }
}
