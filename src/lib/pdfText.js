// Local, client-side PDF text extraction for Smart Upload content classification.
//
// Browser-only (uses pdfjs-dist + a Web Worker) — NOT imported by node:test. It extracts
// machine-readable text from the first few pages of a PDF so lib/documentContent.js can
// classify by CONTENT. Everything stays in the browser: the PDF is never uploaded or sent to
// any API/OCR/production service for classification (privacy — spec §16). Scanned/image PDFs
// yield little/no text and are flagged "Needs OCR" upstream; we do NOT rasterise or OCR here.

const DEFAULT_MAX_PAGES = 5
const MAX_CHARS = 20000 // enough to identify a form; we never need the whole document

// Extract text from the first `maxPages` pages. Returns '' on any failure (caller treats an
// empty result as "no usable text" → Needs OCR), never throws.
export async function extractPdfText(file, maxPages = DEFAULT_MAX_PAGES) {
  if (!file || file.type !== 'application/pdf') return ''
  try {
    const pdfjsLib = await import('pdfjs-dist')
    // Same worker wiring the repo already uses (OnboardingWizard) — bundled, no CDN.
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
    const pages = Math.min(pdf.numPages, maxPages)
    let out = ''
    for (let p = 1; p <= pages && out.length < MAX_CHARS; p++) {
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      out += ' ' + content.items.map((it) => (it && it.str) || '').join(' ')
    }
    return out.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS)
  } catch (e) {
    console.error('[SmartUpload] PDF text extraction failed:', e)
    return ''
  }
}
