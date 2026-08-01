// Migration privilege-hygiene guard.
//
// For every public table CREATED by a migration ADDED or MODIFIED in a PR, the same
// migration file must, in-file, PROVABLY:
//   (1) REVOKE anon OBJECT privileges (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN);
//   (2) dispose of anon DATA privileges (SELECT, INSERT, UPDATE, DELETE) by EITHER
//       revoking all four from anon, OR carrying the exact TABLE-SPECIFIC marker
//         -- YAV2-ANON-DATA-ACCESS: public.<table> INTENTIONAL-RLS-GOVERNED
//       for that exact table, together with RLS enabled on it; and
//   (3) ENABLE ROW LEVEL SECURITY.
// FORCE RLS and an anon post-check are RECOMMENDED (warn only).
//
// PROOF DISCIPLINE (tightened): a dynamic loop only counts when the checker can resolve
// the loop's table list (inline `ARRAY[...]` or a named `text[] := ARRAY[...]` variable)
// and that list includes the created table. A generic loop over an unresolved source
// proves nothing on its own; coverage then requires a recognised in-migration residual
// post-check (a RAISE-guarded `has_table_privilege('anon', …)` / `relrowsecurity` block)
// whose iterated array provably includes the created table.
//
// Scope: only migrations added/modified in the PR (git diff --diff-filter=AM base...head)
// under supabase/migrations/ (excluding *rollback*). Pre-convention foundational
// migrations (0002–0007) are Stage A surface and are NOT re-audited. NO database access;
// NO SQL executed. `analyzeMigrationSql` is pure and import-safe for tests.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const OBJECT_PRIVS = ['TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'];
const DATA_PRIVS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

// Table-specific intentional-anon-data marker (lives in a comment; read from RAW sql):
//   -- YAV2-ANON-DATA-ACCESS: public.<table> INTENTIONAL-RLS-GOVERNED
// Returns the SET of table names that carry their OWN valid marker. A marker for one
// table never waives another; a marker naming a table not created here simply appears
// in the set but matches no created table (rule 6).
export function markedTables(rawSql) {
  const re = /--[ \t]*YAV2-ANON-DATA-ACCESS:[ \t]*public\.("?)(\w+)\1[ \t]+INTENTIONAL-RLS-GOVERNED\b/gi;
  const set = new Set();
  let m;
  while ((m = re.exec(rawSql)) !== null) set.add(m[2]);
  return set;
}

export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

export function createdPublicTables(code) {
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.("?)(\w+)\1/gi;
  const names = [];
  let m;
  while ((m = re.exec(code)) !== null) names.push(m[2]);
  return [...new Set(names)];
}

// '...' string literals inside an ARRAY[...] body → the table names.
function namesFromArrayBody(body) {
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

// Named array declarations:  foo text[] := ARRAY['a','b', ...]
function namedArrayMap(code) {
  const map = new Map();
  const re = /(\w+)\s+text\s*\[\s*\]\s*:=\s*array\s*\[([^\]]*)\]/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    const names = new Set(namesFromArrayBody(m[2]));
    if (map.has(m[1])) for (const n of map.get(m[1])) names.add(n);
    map.set(m[1], names);
  }
  return map;
}

function parsePrivList(privPart) {
  const s = privPart.toUpperCase();
  if (/\bREVOKE\s+ALL\b/.test(s)) return { obj: true, data: true };
  return {
    obj: OBJECT_PRIVS.every((p) => new RegExp(`\\b${p}\\b`).test(s)),
    data: DATA_PRIVS.every((p) => new RegExp(`\\b${p}\\b`).test(s)),
  };
}
function revokeTargetsAnon(fromPart) {
  return /\bANON\b/.test(fromPart.toUpperCase());
}

// Static per-table REVOKE covering anon. Returns {obj,data}.
function staticRevoke(code, table) {
  const re = new RegExp(`revoke\\b([\\s\\S]*?)\\bon\\s+(?:table\\s+)?public\\.("?)${table}\\2([\\s\\S]*?);`, 'gi');
  let out = { obj: false, data: false };
  let m;
  while ((m = re.exec(code)) !== null) {
    const fromPart = m[3];
    if (!revokeTargetsAnon(fromPart)) continue;
    const { obj, data } = parsePrivList('REVOKE ' + m[1]);
    out = { obj: out.obj || obj, data: out.data || data };
  }
  return out;
}
function staticRls(code, table) {
  return new RegExp(`alter\\s+table\\s+(?:only\\s+)?public\\.("?)${table}\\1\\s+enable\\s+row\\s+level\\s+security`, 'i').test(code);
}
function staticForce(code, table) {
  return new RegExp(`alter\\s+table\\s+(?:only\\s+)?public\\.("?)${table}\\1\\s+force\\s+row\\s+level\\s+security`, 'i').test(code);
}

// Parse every FOREACH loop: resolve its iterated table array, classify its body.
function foreachUnits(code, named) {
  const units = [];
  const re = /foreach\s+\w+\s+in\s+array\s+(array\s*\[[^\]]*\]|\w+)/gi;
  let m;
  while ((m = re.exec(code)) !== null) {
    const src = m[1];
    let tables = null; // null => unresolved
    if (/^array\s*\[/i.test(src)) {
      tables = new Set(namesFromArrayBody(src));
    } else if (named.has(src)) {
      tables = named.get(src);
    }
    // body = from here to the next END LOOP
    const start = re.lastIndex;
    const endIdx = code.toLowerCase().indexOf('end loop', start);
    const body = code.slice(start, endIdx === -1 ? code.length : endIdx);
    const bl = body.toLowerCase();

    // revoke action via format('REVOKE ... anon ...')
    let revObj = false, revData = false;
    for (const fm of body.matchAll(/format\(\s*'([^']*revoke[^']*)'/gi)) {
      const stmt = fm[1];
      if (!/\banon\b/i.test(stmt)) continue;
      const fromSplit = stmt.toUpperCase().split(' FROM ');
      if (fromSplit.length < 2 || !/\bANON\b/.test(fromSplit[1])) continue;
      const { obj, data } = parsePrivList(stmt);
      revObj = revObj || obj; revData = revData || data;
    }
    const rls = /format\(\s*'[^']*enable\s+row\s+level\s+security/i.test(body);
    // post-check: RAISE-guarded anon privilege / relrowsecurity assertions
    const hasAnonPriv = /has_table_privilege\(\s*'anon'/i.test(body) && /raise\s+exception/i.test(bl);
    const pcData = hasAnonPriv && DATA_PRIVS.some((p) => new RegExp(`'${p}'`, 'i').test(body) || /array\s*\[\s*'select'/i.test(body));
    const pcObj = hasAnonPriv && OBJECT_PRIVS.some((p) => new RegExp(`'${p}'`, 'i').test(body));
    const pcRls = /relrowsecurity/i.test(body) && /raise\s+exception/i.test(bl);

    units.push({ tables, revObj, revData, rls, pcData, pcObj, pcRls });
  }
  return units;
}

export function analyzeMigrationSql(sql, filename = '<memory>') {
  const code = stripSqlComments(sql);
  const marked = markedTables(sql); // table-specific markers, read from RAW (comments)
  const tables = createdPublicTables(code);
  const named = namedArrayMap(code);
  const units = foreachUnits(code, named);
  const anyPostCheck = units.some((u) => u.pcData || u.pcObj || u.pcRls) ||
    (/has_table_privilege\(\s*'anon'/i.test(code) && /raise\s+exception/i.test(code));

  const tableResults = tables.map((t) => {
    const sr = staticRevoke(code, t);
    let obj = sr.obj, data = sr.data;
    let rls = staticRls(code, t);
    let force = staticForce(code, t);

    for (const u of units) {
      const covers = u.tables && u.tables.has(t); // ONLY resolved arrays that include t
      if (!covers) continue;
      if (u.revObj) obj = true;
      if (u.revData) data = true;
      if (u.rls) rls = true;
      if (u.pcObj) obj = true;
      if (u.pcData) data = true;
      if (u.pcRls) rls = true;
    }

    const hasMarker = marked.has(t); // ONLY this exact table's own marker
    const objOk = obj;
    const rlsOk = rls;
    const dataOk = data || (hasMarker && rls);

    const violations = [];
    if (!objOk) violations.push('no provable anon object-privilege REVOKE (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN or ALL) from anon');
    if (!rlsOk) violations.push('no provable ENABLE ROW LEVEL SECURITY');
    if (!dataOk) violations.push(`anon data privileges (SELECT/INSERT/UPDATE/DELETE) neither revoked nor covered by an exact "-- YAV2-ANON-DATA-ACCESS: public.${t} INTENTIONAL-RLS-GOVERNED" marker with RLS`);

    const warnings = [];
    if (objOk && rlsOk && dataOk && !force) warnings.push('FORCE ROW LEVEL SECURITY recommended (not required)');
    if (objOk && rlsOk && dataOk && !anyPostCheck) warnings.push('anon residual post-check recommended (not required)');

    return { table: t, obj: objOk, data: dataOk, rls: rlsOk, force, marker: hasMarker, ok: violations.length === 0, violations, warnings };
  });

  const bad = tableResults.filter((r) => !r.ok);
  return {
    filename,
    createsPublicTable: tables.length > 0,
    tables: tableResults,
    hasPostCheck: anyPostCheck,
    markedTables: [...marked],
    ok: bad.length === 0,
    violationCount: bad.length,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────
function changedMigrations(baseSha, headSha) {
  const out = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', `${baseSha}...${headSha}`], { encoding: 'utf8' });
  return out.split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((f) => /^supabase\/migrations\/.+\.sql$/i.test(f) && !/rollback/i.test(f));
}

export function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA;
  const argFiles = process.argv.slice(2);

  let files;
  if (argFiles.length > 0) files = argFiles;
  else if (baseSha && headSha) files = changedMigrations(baseSha, headSha);
  else { console.log('Migration hygiene: no BASE_SHA/HEAD_SHA and no file args — nothing to check.'); process.exit(0); }

  let summary = '## Migration privilege-hygiene guard\n\n';
  const offenders = [];
  let checked = 0;
  for (const f of files) {
    let sql;
    try { sql = readFileSync(f, 'utf8'); } catch { continue; }
    const res = analyzeMigrationSql(sql, f);
    if (!res.createsPublicTable) continue;
    checked += 1;
    if (!res.ok) offenders.push(res);
  }

  summary += `Added/modified migrations creating public tables checked: ${checked}\n\n`;
  if (offenders.length === 0) {
    summary += checked === 0
      ? 'No added/modified migration creates a public table. Nothing to enforce.\n'
      : 'All checked migrations provably revoke anon object privileges, dispose of anon data privileges, and enable RLS. PASS.\n';
    console.log(summary);
    process.exit(0);
  }

  summary += 'FAIL — a migration creates a public table without provable hygiene:\n\n';
  summary += '| Migration | Table | Missing |\n|---|---|---|\n';
  for (const o of offenders) for (const t of o.tables.filter((x) => !x.ok)) {
    summary += `| \`${o.filename}\` | \`${t.table}\` | ${t.violations.join('; ')} |\n`;
  }
  summary += '\nSee `docs/yav2-migration-hygiene/YAV2_MIGRATION_PRIVILEGE_HYGIENE_CONVENTION.md` and the reusable snippet.\n';
  console.error(summary);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check_migration_hygiene.mjs')) {
  main();
}
