import { execFileSync } from 'node:child_process';

const apiKey = process.env.ANTHROPIC_API_KEY;
const baseSha = process.env.BASE_SHA;
const headSha = process.env.HEAD_SHA;
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const prNumber = process.env.PR_NUMBER;
const prBody = process.env.PR_BODY || '';

if (!apiKey) {
  console.log('ANTHROPIC_API_KEY not configured. Skipping optional AI PR review.');
  process.exit(0);
}

if (!baseSha || !headSha || !token || !repository || !prNumber) {
  console.log('Missing required PR context. Skipping optional AI PR review.');
  process.exit(0);
}

const diff = execFileSync('git', ['diff', '--unified=2', `${baseSha}...${headSha}`], {
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 2
});

const trimmedDiff = diff.length > 120000 ? `${diff.slice(0, 120000)}\n\n[Diff truncated for AI review]` : diff;

const prompt = `You are an advisory PR reviewer for the Yes Advizors Portal governance workflow.

Rules:
- Do not approve or merge.
- Focus on safety, production risk, DB risk, permission risk, secrets, deploy risk, and governance violations.
- v47 production is frozen unless separately approved.
- Database, users, roles, assignments, Supabase functions, and production deploys require explicit approval.
- Return concise markdown with: Summary, Risks, Required fixes, Recommendation.

PR body:\n${prBody}\n\nDiff:\n${trimmedDiff}`;

let reviewText = '';
try {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    console.log(`AI review request failed with status ${response.status}. Skipping advisory review.`);
    process.exit(0);
  }

  const data = await response.json();
  reviewText = data.content?.map((part) => part.text || '').join('\n') || '';
} catch (error) {
  console.log(`AI review failed: ${error.message}. Skipping advisory review.`);
  process.exit(0);
}

if (!reviewText.trim()) {
  console.log('AI review returned empty response. Skipping comment.');
  process.exit(0);
}

const [owner, repo] = repository.split('/');
const body = `## Optional AI PR Review — advisory only\n\n${reviewText}\n\n_This is advisory and does not approve merge, deploy, DB change, or production release._`;

try {
  await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body })
  });
  console.log('Optional AI review comment posted.');
} catch (error) {
  console.log(`Could not post AI review comment: ${error.message}`);
}

process.exit(0);
