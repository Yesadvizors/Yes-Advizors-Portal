// Bounded-concurrency map — run async work over a list with at most `limit` in flight.
//
// Pure, node:test-importable (no DOM/network). Used to cap OCR jobs (spec: 2–3 concurrent max)
// so a batch of scanned PDFs never floods the browser. Results are returned in INPUT order; a
// task that throws resolves to { error } for that slot instead of rejecting the whole batch, so
// one failed OCR never breaks the other files.
export async function mapWithLimit(items, limit, fn) {
  const list = Array.isArray(items) ? items : []
  const n = list.length
  const cap = Math.max(1, Math.min(limit | 0 || 1, n || 1))
  const results = new Array(n)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= n) return
      try {
        results[i] = await fn(list[i], i)
      } catch (e) {
        results[i] = { error: e && e.message ? e.message : String(e) }
      }
    }
  }
  await Promise.all(Array.from({ length: cap }, () => worker()))
  return results
}
