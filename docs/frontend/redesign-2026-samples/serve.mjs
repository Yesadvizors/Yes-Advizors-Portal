/* Minimal zero-dependency static file server for previewing the design samples.
   Usage: node serve.mjs  → http://localhost:8080  (serves this folder only). */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const PORT = process.env.PORT || 8080
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }

createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(req.url.split('?')[0])
    if (rel === '/' || rel === '') rel = '/index.html'
    // Prevent path traversal: resolve within ROOT only.
    const path = normalize(join(ROOT, rel))
    if (!path.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return }
    const body = await readFile(path)
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found')
  }
}).listen(PORT, () => console.log(`samples on http://localhost:${PORT}/`))
