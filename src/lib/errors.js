/**
 * Safe, user-facing error text.
 *
 * Moved here from OnboardingWizard so every component can use it. The real reason
 * is what makes a failure diagnosable ("Bucket not found", "new row violates row-level
 * security policy"), so we keep it — but we strip anything that could carry a secret:
 * signed URLs, tokens, API keys, JWTs.
 *
 * Postgres error codes are preserved (e.g. `[42501]`) because they are the fastest
 * route to a diagnosis and carry nothing sensitive.
 */
export function safeErrorMessage(e) {
  const raw = (e && (e.message || e.error_description || e.msg)) || 'Unknown error'
  return String(raw)
    .replace(/https?:\/\/\S+/gi, '[link removed]')
    .replace(/\b(token|apikey|api_key|key|jwt|signature|secret)=[^\s&"']+/gi, '$1=[redacted]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted]')
    .slice(0, 300)
}

/** safeErrorMessage plus the Postgres code, when there is one. */
export function safeErrorDetail(e) {
  const msg = safeErrorMessage(e)
  const code = e && e.code ? ` [${e.code}]` : ''
  return msg + code
}
