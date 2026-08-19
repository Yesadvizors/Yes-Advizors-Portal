// Local OCR fallback for Smart Upload — scanned PDFs and images.
//
// Browser-only (tesseract.js WASM + pdfjs canvas render) — NOT imported by node:test. OCR runs
// ENTIRELY in the browser: the client's document is NEVER uploaded or sent to any API/OCR/
// production service. tesseract.js fetches only its own OSS engine + English language model
// (not the document) on first use. No Claude / OpenAI / Mistral / Google / AWS, no secrets, no
// Edge function, no deployment. This is CLASSIFICATION-grade OCR (read enough to identify the
// document type / FY / period) — it does NOT extract financial figures.
//
// A test/UAT seam (setOcrRunner) lets callers inject deterministic OCR text without loading the
// WASM engine; the default path is real tesseract.

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff']

let _runner = null
// Inject a custom OCR runner `(file, {maxPages}) => Promise<string>` (tests/UAT). Pass null to
// restore the real tesseract path.
export function setOcrRunner(fn) { _runner = fn }

// ── tesseract worker pool (≤2) — lazy, reused across a batch ─────────────────
let _tess = null
const POOL_SIZE = 2
async function getPool() {
  if (_tess) return _tess
  const { createWorker } = await import('tesseract.js')
  const workers = []
  for (let i = 0; i < POOL_SIZE; i++) workers.push(await createWorker('eng'))
  const queue = [...workers]
  const waiters = []
  const acquire = () => queue.length ? Promise.resolve(queue.shift()) : new Promise((res) => waiters.push(res))
  const release = (w) => { const nextWaiter = waiters.shift(); if (nextWaiter) nextWaiter(w); else queue.push(w) }
  _tess = { acquire, release }
  return _tess
}

// ── render a PDF page to a canvas (reuses the repo's pdfjs pattern) ─────────
async function pdfPageCanvas(pdf, pageNum, scale = 2) {
  const page = await pdf.getPage(pageNum)
  const vp = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = vp.width
  canvas.height = vp.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
  return canvas
}

async function recognize(image) {
  const pool = await getPool()
  const worker = await pool.acquire()
  try {
    const { data } = await worker.recognize(image)
    return (data && data.text) || ''
  } finally {
    pool.release(worker)
  }
}

// ── public: OCR a file into text, stopping early once we have enough ────────
// enough(text) decides when a strong signature + FY/period is already present so we don't OCR
// every page. Returns '' on failure (caller → "OCR failed / manual"). Never throws.
export async function ocrFile(file, { maxPages = 5, enough } = {}) {
  if (_runner) { try { return await _runner(file, { maxPages }) } catch { return '' } }
  if (!file) return ''
  const isImage = IMAGE_TYPES.includes(file.type)
  const isPdf = file.type === 'application/pdf'
  if (!isImage && !isPdf) return ''
  try {
    if (isImage) {
      return (await recognize(file)).replace(/\s+/g, ' ').trim()
    }
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
    const pages = Math.min(pdf.numPages, maxPages)
    let text = ''
    for (let p = 1; p <= pages; p++) {
      const canvas = await pdfPageCanvas(pdf, p)
      text = (text + ' ' + (await recognize(canvas))).replace(/\s+/g, ' ').trim()
      if (typeof enough === 'function' && enough(text)) break // stop once confidently classifiable
    }
    return text
  } catch (e) {
    console.error('[SmartUpload] OCR failed:', e)
    return ''
  }
}

export function isOcrableImage(file) { return !!file && IMAGE_TYPES.includes(file.type) }
