#!/usr/bin/env node
/*
 * YAV2 Supabase environment safeguard (Phase 0).
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
 * BEHAVIOUR (fail-safe: any doubt => non-zero exit)
 *   exit 0  authorised V2 ref present, prohibited V1 ref absent.
 *   exit 1  PROHIBITED V1 ref detected, OR authorised ref missing/mismatched.
 *   exit 2  required env vars not set / unparseable (fail closed).
 *
 * REVIEW BEFORE USE. This script is intentionally NOT wired into build/CI yet;
 * a human (PJ / Lead Integrator) must review and opt-in.
 *
 * USAGE
 *   node scripts/verify-supabase-ref.mjs
 *   (reads VITE_SUPABASE_URL and, if present, VITE_SUPABASE_FUNCTIONS_URL)
 */

// Non-secret public project references (identifiers, not credentials).
const AUTHORISED_V2_REF = 'ogjrwemjefvccpyjwxuo';
const PROHIBITED_V1_REF = 'zcszesuvjrryxtigjglt';

const CHECK_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_FUNCTIONS_URL'];

function fail(code, msg) {
  console.error(`[supabase-safeguard] FAIL(${code}): ${msg}`);
  process.exit(code);
}
function ok(msg) {
  console.log(`[supabase-safeguard] OK: ${msg}`);
  process.exit(0);
}

// 1. Collect the env strings we are willing to inspect (values are URLs/refs, not secrets).
const present = CHECK_VARS
  .map((name) => [name, process.env[name]])
  .filter(([, v]) => typeof v === 'string' && v.length > 0);

if (present.length === 0) {
  // Fail closed: we cannot prove the environment is safe.
  fail(2, `no Supabase URL env vars set (${CHECK_VARS.join(', ')}). Cannot verify environment; refusing to proceed.`);
}

// 2. Hard block: the prohibited V1 ref must not appear anywhere.
for (const [name, value] of present) {
  if (value.includes(PROHIBITED_V1_REF)) {
    fail(1, `PROHIBITED V1/Production ref '${PROHIBITED_V1_REF}' found in ${name}. Refusing. Use only authorised V2 ref '${AUTHORISED_V2_REF}'.`);
  }
}

// 3. Require: the primary URL must reference the authorised V2 ref.
const primary = process.env.VITE_SUPABASE_URL;
if (typeof primary !== 'string' || primary.length === 0) {
  fail(2, 'VITE_SUPABASE_URL is not set. Cannot confirm authorised V2 project.');
}
if (!primary.includes(AUTHORISED_V2_REF)) {
  fail(1, `VITE_SUPABASE_URL does not reference the authorised V2 ref '${AUTHORISED_V2_REF}'. Refusing.`);
}

ok(`authorised V2 ref '${AUTHORISED_V2_REF}' confirmed; prohibited V1 ref '${PROHIBITED_V1_REF}' absent across [${present.map(([n]) => n).join(', ')}].`);
