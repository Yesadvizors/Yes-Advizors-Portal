/**
 * AI Assistant — Bento shell integration + honesty guards. node:test.
 *
 * The EXISTING ai-agent-backed ChatAgent is surfaced (unchanged) as a persistent
 * "Ask YA Assistant" entry point in the Bento shell. It is REAL: ChatAgent calls
 * the `ai-agent` Supabase edge function server-side — there is NO AI key in the
 * frontend and NO fabricated chatbot. These guards assert:
 *   AI-1  The assistant is reused (lazy-imported), not rebuilt in the bento layer.
 *   AI-2  It is mounted persistently, inside an ErrorBoundary + Suspense.
 *   AI-3  The backend is a server-side edge function — no VITE_/AI key in the client.
 *   AI-4  The bento layer stays Supabase-free (ChatAgent lives in src/components).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const APP = strip(read('src/bento/BentoApp.jsx'))
const CHAT = read('src/components/ChatAgent.jsx')
const MOCK_NAV = read('src/bento/mock/bentoMock.js')

test('AI-1: the existing ChatAgent is reused (lazy-imported), not rebuilt', () => {
  assert.match(APP, /const ChatAgent\s*=\s*lazy\(\(\) => import\('\.\.\/components\/ChatAgent'\)\)/)
  // must NOT re-implement a chat agent inside the bento layer
  function walk(relDir) {
    const out = []
    for (const name of readdirSync(join(ROOT, relDir))) {
      const rel = join(relDir, name)
      if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel))
      else out.push(rel)
    }
    return out
  }
  const bento = walk('src/bento').filter(f => /\.(jsx?|mjs)$/.test(f)).map(read).join('\n')
  assert.ok(!/function\s+ChatAgent\s*\(/.test(bento), 'must not re-implement ChatAgent in the bento layer')
})

test('AI-2: assistant is mounted persistently inside ErrorBoundary + Suspense', () => {
  assert.match(APP, /<ErrorBoundary><Suspense fallback=\{null\}>\s*<ChatAgent \/>/)
})

test('AI-3: assistant is backed by a server-side edge function — no AI key in the client', () => {
  assert.match(CHAT, /supabase\.functions\.invoke\('ai-agent'/)
  // no AI provider key is read in the browser bundle
  assert.doesNotMatch(CHAT, /VITE_[A-Z_]*(?:OPENAI|ANTHROPIC|CLAUDE|GEMINI|AI)[A-Z_]*KEY/)
  assert.doesNotMatch(CHAT, /sk-[a-zA-Z0-9]{10,}/)
})

test('AI-4: bento layer stays Supabase-free — the assistant lives in src/components', () => {
  // BentoApp references the component name only; no supabase symbol leaks into bento/
  assert.ok(!/supabase/i.test(APP), 'BentoApp must not reference supabase directly')
})

const SCAFFOLD = read('src/bento/modules/AiAssistantScaffold.jsx')

test('AI-5: proposed-assistant scaffold is honestly labelled as unconnected preview', () => {
  assert.match(SCAFFOLD, /PREVIEW/)
  assert.match(SCAFFOLD, /NOT CONNECTED/)
  assert.match(SCAFFOLD, /not a live response/i)
  assert.match(SCAFFOLD, /disabled in preview/i)
  // shows the answer-provenance taxonomy the proposal defines
  for (const t of ['STRUCTURED', 'DOCUMENT-EXTRACTED', 'INFERENCE']) assert.ok(SCAFFOLD.includes(t), `missing source type: ${t}`)
  // it must NOT fabricate a working chat: no supabase / fetch / invoke
  assert.doesNotMatch(SCAFFOLD, /supabase|fetch\s*\(|functions\.invoke/)
})

test('AI-6: scaffold is dev-preview only — gated on demoData, unreachable in the authed app', () => {
  // rendered only when demoData is present (preview); ComingLater otherwise
  assert.match(APP, /if \(tab === 'ai-preview'\) return demoData \? <AiAssistantScaffold \/> : <ComingLater/)
  // there is no 'ai-preview' entry in the authenticated nav, so users can't reach it
  assert.ok(!/ai-preview/.test(MOCK_NAV), 'ai-preview must not be a nav item')
})
