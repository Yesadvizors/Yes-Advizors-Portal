#!/usr/bin/env node
/*
 * YAV2 Supabase environment safeguard (Phase 0, hardened — parsed-host validation).
 *
 * PURPOSE
 *   Fail-safe, read-only guard that prevents accidental use of the PROHIBITED
 *   V1 / Production Supabase project and requires the AUTHORISED V2 / yav2-dev
 *   project. It ONLY inspects environment-variable *strings* already present in
 *   the current shell/CI environment.
 *
 * IT DOES NOT
 *   - contain any key, token, secret, or connection string;
 *   - connect to, query, deploy to, or modify EITHER Supabase project;
 *   - execute SQL or touch the database, Vercel, Edge Functions, n8n or WhatsApp.
 *
 * VALIDATION (per checked URL) — the project ref is taken ONLY from the host:
 *   1. Parse the value as a URL; reject malformed/unparseable.
 *   2. Require host of the form "<ref>.supabase.co" (or "*.<ref>.supabase.co"
 *      is NOT accepted — the ref must be the first label of a bare
 *      "<ref>.supabase.co" host). Non-Supabase host => reject.
 *   3. Extract <ref> from the hostname (never from path/query/fragment).
 *   4. Require <ref> === authorised V2 ref exactly. Reject V1 / unknown / third.
 *
 * RULES
 *   - VITE_SUPABASE_URL MUST exist and pass host validation for V2.
 *   - If VITE_SUPABASE_FUNCTIONS_URL is present, it MUST also pass for V2.
 *
 * EXIT CODES (fail-safe: any doubt => non-zero)
 *   0  every checked URL's HOST resolves to authorised V2 ref; primary present.
 *   1  V1 / unknown project / non-Supabase host / ref only in path or query /
 *      malformed URL / not on V2.
 *   2  primary URL missing (cannot prove safety => refuse).
 *
 * REVIEW BEFORE USE. Not wired into build/CI (see docs/recovery/GAP_REGISTER.md G-20).
 *
 * USAGE
 *   node scripts/verify-supabase-ref.mjs
 */

// Non-secret public project references (identifiers, not credentials).
const AUTHORISED_V2_REF = 'ogjrwemjefvccpyjwxuo';
const PROHIBITED_V1_REF = 'zcszesuvjrryxtigjglt';

const CHECK_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_FUNCTIONS_URL'];
const SUPABASE_SUFFIX = '.supabase.co';

function fail(code, msg) {
  console.error(`[supabase-safeguard] FAIL(${code}): ${msg}`);
  process.exit(code);
}
function ok(msg) {
  console.log(`[supabase-safeguard] OK: ${msg}`);
  process.exit(0);
}

// Return the Supabase project ref taken from the HOSTNAME only, or throw.
function projectRefFromHost(rawValue, name) {
  let url;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`${name} is not a valid URL (malformed/unparseable). Refusing.`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${name} has unsupported scheme '${url.protocol}'. Refusing.`);
  }
  const host = url.hostname.toLowerCase(); // host only — never path/query/fragment
  if (!host.endsWith(SUPABASE_SUFFIX)) {
    throw new Error(`${name} host '${host}' is not a *${SUPABASE_SUFFIX} host. Refusing.`);
  }
  const ref = host.slice(0, -SUPABASE_SUFFIX.length);
  // Ref must be a single DNS label: exactly "<ref>.supabase.co" (no extra dots).
  if (ref.length === 0 || ref.includes('.')) {
    throw new Error(`${name} host '${host}' is not of the form <ref>${SUPABASE_SUFFIX}. Refusing.`);
  }
  return ref;
}

// Rule: primary URL must exist (fail closed).
const primary = process.env.VITE_SUPABASE_URL;
if (typeof primary !== 'string' || primary.trim() === '') {
  fail(2, `primary URL VITE_SUPABASE_URL is not set. Cannot verify environment; refusing.`);
}

const present = CHECK_VARS
  .map((name) => [name, process.env[name]])
  .filter(([, v]) => typeof v === 'string' && v.trim() !== '');

for (const [name, value] of present) {
  let ref;
  try {
    ref = projectRefFromHost(value, name);
  } catch (e) {
    fail(1, e.message);
  }
  if (ref === PROHIBITED_V1_REF) {
    fail(1, `${name} host resolves to PROHIBITED V1/Production ref '${PROHIBITED_V1_REF}'. Refusing.`);
  }
  if (ref !== AUTHORISED_V2_REF) {
    fail(1, `${name} host resolves to unknown/third project ref '${ref}'. Only '${AUTHORISED_V2_REF}' is permitted. Refusing.`);
  }
}

ok(`authorised V2 host ref '${AUTHORISED_V2_REF}' confirmed for [${present.map(([n]) => n).join(', ')}]; no V1, unknown, non-Supabase, or path/query-only match.`);
