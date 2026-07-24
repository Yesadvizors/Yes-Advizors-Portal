#!/usr/bin/env node
/*
 * YAV2 Supabase environment safeguard (Phase 0, hardened).
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
 * RULES (all must hold to pass)
 *   1. A primary URL (VITE_SUPABASE_URL) MUST exist.
 *   2. The prohibited V1 ref MUST NOT appear in any checked URL.
 *   3. VITE_SUPABASE_URL MUST reference the authorised V2 ref.
 *   4. If VITE_SUPABASE_FUNCTIONS_URL is present, it MUST also reference V2.
 *   5. Any checked Supabase URL pointing to an unknown / third project is rejected.
 *
 * EXIT CODES (fail-safe: any doubt => non-zero)
 *   0  authorised V2 confirmed for every checked URL; no V1; primary present.
 *   1  prohibited V1 ref, unknown/third project, or a checked URL not on V2.
 *   2  primary URL missing / no vars set (cannot prove safety => refuse).
 *
 * REVIEW BEFORE USE. Not wired into build/CI; a human (PJ / Lead Integrator)
 * must review and opt-in (see docs/recovery/GAP_REGISTER.md G-20).
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

// Extract a Supabase project ref from a "<ref>.supabase.co" style URL, else null.
function extractRef(value) {
  const m = /([a-z0-9]{20})\.supabase\.co/i.exec(value);
  return m ? m[1].toLowerCase() : null;
}

// Rule 1: primary URL must exist (fail closed).
const primary = process.env.VITE_SUPABASE_URL;
if (typeof primary !== 'string' || primary.trim() === '') {
  fail(2, `primary URL VITE_SUPABASE_URL is not set. Cannot verify environment; refusing.`);
}

// Collect the checked URL strings that are actually set.
const present = CHECK_VARS
  .map((name) => [name, process.env[name]])
  .filter(([, v]) => typeof v === 'string' && v.trim() !== '');

// Rule 2: prohibited V1 ref must not appear in any checked URL.
for (const [name, value] of present) {
  if (value.includes(PROHIBITED_V1_REF)) {
    fail(1, `PROHIBITED V1/Production ref '${PROHIBITED_V1_REF}' found in ${name}. Refusing. Use only authorised V2 ref '${AUTHORISED_V2_REF}'.`);
  }
}

// Rules 3, 4, 5: every checked URL must reference the authorised V2 ref;
// anything else (unknown/third project) is rejected.
for (const [name, value] of present) {
  if (!value.includes(AUTHORISED_V2_REF)) {
    const ref = extractRef(value);
    const detail = ref ? `points to unknown/third project ref '${ref}'` : `does not reference authorised V2 ref '${AUTHORISED_V2_REF}'`;
    fail(1, `${name} ${detail}. Only '${AUTHORISED_V2_REF}' is permitted. Refusing.`);
  }
}

ok(`authorised V2 ref '${AUTHORISED_V2_REF}' confirmed for [${present.map(([n]) => n).join(', ')}]; prohibited V1 ref '${PROHIBITED_V1_REF}' absent; no unknown project.`);
