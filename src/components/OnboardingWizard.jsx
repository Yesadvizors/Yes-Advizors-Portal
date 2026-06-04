import { useState } from 'react'
import { supabase } from '../supabase'
import { ALL_CLIENT_TYPES, VALIDATORS, EXTRA_VALIDATORS, personConfig } from '../helpers'

const BUCKET = 'secure-docs'

/* ───────────────────────── Premium Onboarding — Yes Advizors ─────────────────────────
   Three-step guided journey: Client Details → People → Review & Confirm.
   Deep emerald + ivory + champagne gold. Serif display, geometric sans UI.
   All validations and the secure document pipeline preserved exactly.        */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.obw-overlay{position:fixed;inset:0;background:rgba(7,24,18,.55);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);z-index:3000;display:flex;align-items:flex-start;justify-content:center;padding:14px 16px;overflow-y:auto;animation:obwFade .25s ease}
.obw-modal{font-family:'Plus Jakarta Sans',-apple-system,sans-serif;background:#FDFDFB;border-radius:22px;width:100%;max-width:940px;margin-top:12px;overflow:hidden;box-shadow:0 30px 90px rgba(4,28,20,.45),0 2px 0 rgba(255,255,255,.6) inset;animation:obwRise .38s cubic-bezier(.22,1,.36,1)}
@keyframes obwFade{from{opacity:0}to{opacity:1}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes obwRise{from{opacity:0;transform:translateY(26px) scale(.985)}to{opacity:1;transform:none}}
@keyframes obwPane{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes obwPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
@keyframes obwDraw{to{stroke-dashoffset:0}}

/* header band */
.obw-head{position:relative;background:linear-gradient(132deg,#06281D 0%,#0A3D2C 52%,#0D7A53 130%);padding:26px 28px 22px;color:#fff;overflow:hidden}
.obw-head::after{content:'';position:absolute;inset:0;background:radial-gradient(rgba(212,185,120,.14) 1px,transparent 1px);background-size:26px 26px;pointer-events:none}
.obw-head::before{content:'';position:absolute;right:-70px;top:-90px;width:260px;height:260px;border-radius:50%;background:radial-gradient(closest-side,rgba(212,185,120,.22),transparent);pointer-events:none}
.obw-mono{width:46px;height:46px;border-radius:13px;background:rgba(255,255,255,.06);border:1px solid rgba(212,185,120,.55);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;letter-spacing:.5px;color:#E8D5A3;box-shadow:0 4px 18px rgba(0,0,0,.25)}
.obw-eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#CBB877;font-weight:700;margin-bottom:3px}
.obw-title{font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:600;letter-spacing:.2px}
.obw-close{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:rgba(255,255,255,.85);font-size:15px;cursor:pointer;transition:.2s;z-index:2}
.obw-close:hover{background:rgba(255,255,255,.16);transform:rotate(90deg)}

/* stepper */
.obw-steps{display:flex;align-items:center;gap:0;margin-top:20px;position:relative;z-index:1}
.obw-step{display:flex;align-items:center;gap:9px;flex:0 0 auto}
.obw-dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;border:1.6px solid rgba(255,255,255,.28);color:rgba(255,255,255,.55);background:transparent;transition:.3s}
.obw-step.active .obw-dot{background:#fff;color:#0A3D2C;border-color:#fff;box-shadow:0 0 0 4px rgba(212,185,120,.30)}
.obw-step.done .obw-dot{background:#D4B978;border-color:#D4B978;color:#0A3D2C}
.obw-slabel{font-size:11.5px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.3px;white-space:nowrap}
.obw-step.active .obw-slabel{color:#fff}
.obw-step.done .obw-slabel{color:#E8D5A3}
.obw-sline{flex:1;height:1.5px;background:rgba(255,255,255,.18);margin:0 12px;min-width:18px;position:relative;overflow:hidden}
.obw-sline.done::after{content:'';position:absolute;inset:0;background:#D4B978}

/* body */
.obw-body{max-height:66vh;overflow-y:auto;padding:26px 28px 8px;scrollbar-width:thin;scrollbar-color:#CBD5D1 transparent}
.obw-body::-webkit-scrollbar{width:5px}
.obw-body::-webkit-scrollbar-thumb{background:#CBD5D1;border-radius:99px}
.obw-pane{animation:obwPane .32s ease}
.obw-sec{font-size:10.5px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;color:#0A3D2C;display:flex;align-items:center;gap:12px;margin:6px 0 16px}
.obw-sec::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,#D4B978 0%,transparent 70%)}
.obw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:14px 16px;margin-bottom:14px}
.obw-field label{display:block;font-size:10.5px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#6B7280;margin-bottom:6px}
.obw-field label b{color:#B45309;font-weight:800}
.obw-inp{width:100%;padding:11px 13px;border:1.5px solid #E2E5E1;border-radius:11px;font-size:13.5px;font-family:inherit;background:#fff;outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box;color:#13241D}
.obw-inp:hover{border-color:#C9CFC9}
.obw-inp:focus{border-color:#0D7A53;box-shadow:0 0 0 3.5px rgba(13,122,83,.13)}
.obw-inp::placeholder{color:#B6BDB7}
textarea.obw-inp{resize:vertical;min-height:62px}
.obw-err{font-size:11px;color:#B91C1C;margin-top:4px;font-weight:600}

/* person chips */
.obw-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.obw-chip{display:flex;align-items:center;gap:8px;padding:7px 14px 7px 7px;border-radius:99px;border:1.5px solid #E2E5E1;background:#fff;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:600;color:#4B5563;transition:.2s;max-width:185px}
.obw-chip:hover{border-color:#0D7A53;transform:translateY(-1px)}
.obw-chip.active{background:#0A3D2C;border-color:#0A3D2C;color:#fff;box-shadow:0 6px 16px rgba(10,61,44,.28)}
.obw-ava{width:24px;height:24px;border-radius:50%;background:#ECFDF5;color:#0D7A53;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex:0 0 auto}
.obw-chip.active .obw-ava{background:#D4B978;color:#0A3D2C}
.obw-chip span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.obw-addchip{padding:7px 14px;border-radius:99px;border:1.5px dashed #A7D8C3;background:#F3FBF7;color:#0D7A53;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;transition:.2s}
.obw-addchip:hover{background:#ECFDF5;border-color:#0D7A53}
.obw-card{background:linear-gradient(180deg,#FBFBF8,#F6F7F4);border:1px solid #E8EAE5;border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(10,40,30,.04)}

/* attachments */
.obw-attach{display:flex;align-items:center;gap:10px;margin-top:7px;padding:9px 12px;border:1.5px dashed #C9D6CE;border-radius:11px;background:#FAFCFB;cursor:pointer;transition:.2s;font-size:12px;font-weight:600;color:#0D7A53}
.obw-attach:hover{border-color:#0D7A53;background:#F1FAF5}
.obw-attached{display:flex;align-items:center;gap:9px;margin-top:7px;padding:8px 12px;border:1.5px solid #BFE6D2;border-radius:11px;background:#F0FBF5;font-size:12px}
.obw-attached .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;color:#0A3D2C}
.obw-attached .sz{color:#6B7280;font-size:10.5px;flex:0 0 auto}
.obw-x{border:none;background:none;color:#9CA3AF;cursor:pointer;font-size:13px;padding:2px;line-height:1}
.obw-x:hover{color:#B91C1C}

/* review */
.obw-kv{display:flex;padding:9px 2px;border-bottom:1px solid #EEF0EC;font-size:13px}
.obw-kv .k{width:185px;flex:0 0 auto;color:#8A9189;font-weight:600;font-size:12px;letter-spacing:.2px}
.obw-kv .v{flex:1;color:#13241D;font-weight:600}
.obw-editlink{border:none;background:none;color:#0D7A53;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.4px;text-transform:uppercase}
.obw-editlink:hover{text-decoration:underline}
.obw-docrow{display:flex;align-items:center;gap:9px;padding:8px 12px;border:1px solid #E8EAE5;border-radius:10px;background:#fff;font-size:12.5px;margin-bottom:6px}
.obw-badge{font-size:10px;background:#ECFDF5;color:#0D7A53;padding:2px 9px;border-radius:99px;font-weight:700}

/* footer + buttons */
.obw-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:16px 28px 20px;border-top:1px solid #ECEEE9;background:#FBFBF8;flex-wrap:wrap}
.obw-btn{font-family:inherit;font-size:13px;font-weight:700;border-radius:11px;padding:11px 22px;cursor:pointer;transition:.2s;border:1.5px solid transparent;letter-spacing:.2px}
.obw-btn:disabled{opacity:.55;cursor:not-allowed}
.obw-primary{background:linear-gradient(135deg,#0D7A53,#0A5C3F);color:#fff;box-shadow:0 6px 18px rgba(13,122,83,.32)}
.obw-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 9px 24px rgba(13,122,83,.4)}
.obw-gold{background:linear-gradient(135deg,#0A3D2C,#06281D);color:#E8D5A3;border:1px solid rgba(212,185,120,.6);box-shadow:0 6px 18px rgba(6,40,29,.35)}
.obw-gold:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 26px rgba(6,40,29,.45)}
.obw-ghost{background:#fff;color:#4B5563;border-color:#E2E5E1}
.obw-ghost:hover:not(:disabled){border-color:#9CA3AF;color:#13241D}
.obw-text{background:none;color:#9CA3AF;border:none;font-weight:600}
.obw-text:hover{color:#B91C1C}

/* success */
.obw-okwrap{text-align:center;padding:34px 28px 8px}
.obw-okring{animation:obwPop .5s cubic-bezier(.22,1,.36,1)}
.obw-okring circle{stroke-dasharray:300;stroke-dashoffset:300;animation:obwDraw .8s .15s ease forwards}
.obw-okring path{stroke-dasharray:60;stroke-dashoffset:60;animation:obwDraw .45s .75s ease forwards}
.obw-oktitle{font-family:'Fraunces',Georgia,serif;font-size:23px;font-weight:600;color:#0A3D2C;margin-top:16px}
.obw-oksub{font-size:13px;color:#6B7280;margin-top:5px}
.obw-idpill{display:inline-flex;align-items:center;gap:8px;margin-top:16px;background:linear-gradient(135deg,#06281D,#0A3D2C);border:1px solid rgba(212,185,120,.65);color:#E8D5A3;padding:9px 22px;border-radius:99px;font-weight:800;font-size:14px;letter-spacing:1.5px;box-shadow:0 8px 22px rgba(6,40,29,.3)}
.obw-sumcard{background:#FBFBF8;border:1px solid #ECEEE9;border-radius:16px;padding:8px 18px;margin:22px 28px 0}
@media(max-width:600px){.obw-slabel{display:none}.obw-kv .k{width:120px}}
`

export default function OnboardingWizard({ user, onClose, onSaved, editClient = null }) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [draftFeedback, setDraftFeedback] = useState(null) // 'saved'|'updated'|null
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null) // { fieldsFound, fields } | { error: true } | null
  const [savedClientId, setSavedClientId] = useState(() => editClient?.client_id || null)
  const [f, setF] = useState(() => editClient ? {
    name: editClient.name || '', mobile: editClient.mobile || '',
    email: editClient.email || '', client_type: editClient.client_type || '',
    pan: editClient.pan || '', gstin: editClient.gstin || '',
    tan: editClient.tan || '', address: editClient.address || '',
    num_directors: editClient.directors?.length || 0,
    pf_no: editClient.pf_no || '', esi_no: editClient.esi_no || '',
    udyam_no: editClient.udyam_no || '', iec_no: editClient.iec_no || '', cin: editClient.cin || '', city: editClient.city || '', state: editClient.state || '', pincode: editClient.pincode || '', services: editClient.services || []
  } : {
    name: '', mobile: '', email: '', client_type: '', pan: '', gstin: '', tan: '',
    address: '', num_directors: 0, pf_no: '', esi_no: '', udyam_no: '', iec_no: '', cin: '', city: '', state: '', pincode: '', services: []
  })
  const [directors, setDirectors] = useState(() =>
    editClient?.directors?.map(d => ({
      name: d.name||'', din: d.din||'', email: d.email||'', mobile: d.mobile||'',
      pan: d.pan||'', aadhaar: d.aadhaar||'',
      photoFile: null, photoName: '', photoPreview: '',
      panFile: null, panFileName: '', aadhaarFile: null, aadhaarFileName: ''
    })) || []
  )
  const [activeDir, setActiveDir] = useState(0)
  const [companyDocs, setCompanyDocs] = useState({}) // { docType: { file, name, preview } }
  const [docViewer, setDocViewer] = useState(null)   // { url, name, isImage }

  const cfg = personConfig(f.client_type)
  const STEPS = ['Client Details', `${cfg.role} Details`, 'Review & Confirm']
  const emptyDir = () => ({ name: '', din: '', email: '', mobile: '', pan: '', aadhaar: '', photoFile: null, photoName: '', photoPreview: '', panFile: null, panFileName: '', aadhaarFile: null, aadhaarFileName: '' })

  /* ── validation (unchanged rules) ── */
  function fieldError(key, val) {
    switch (key) {
      case 'mobile': return VALIDATORS.mobile(val) === true ? null : VALIDATORS.mobile(val)
      case 'email': if (val && val.length > 40) return 'Email max 40 characters'; return VALIDATORS.email(val) === true ? null : VALIDATORS.email(val)
      case 'pan': return VALIDATORS.pan(val) === true ? null : VALIDATORS.pan(val)
      case 'gstin': return VALIDATORS.gstin(val) === true ? null : VALIDATORS.gstin(val)
      case 'tan': return VALIDATORS.tan(val) === true ? null : VALIDATORS.tan(val)
      case 'esi_no': return VALIDATORS.esi(val) === true ? null : VALIDATORS.esi(val)
      case 'udyam_no': return EXTRA_VALIDATORS.udyam(val) === true ? null : EXTRA_VALIDATORS.udyam(val)
      case 'pf_no': return EXTRA_VALIDATORS.pf(val) === true ? null : EXTRA_VALIDATORS.pf(val)
      default: return null
    }
  }
  function set(k, v) {
    setF(prev => ({ ...prev, [k]: v }))
    setErrors(prev => ({ ...prev, [k]: fieldError(k, v) }))
  }
  function setNumDirectors(n) {
    const num = Math.max(0, Math.min(5, parseInt(n) || 0))
    setF(prev => ({ ...prev, num_directors: num }))
    setDirectors(prev => {
      const arr = [...prev]
      if (num > arr.length) { for (let i = arr.length; i < num; i++) arr.push(emptyDir()) }
      else { arr.length = num }
      return arr
    })
    setActiveDir(0)
  }
  function addDirector() {
    if (directors.length >= 5) { alert('Maximum 5 allowed'); return }
    setDirectors(prev => { const arr = [...prev, emptyDir()]; setF(p => ({ ...p, num_directors: arr.length })); return arr })
  }
  function removeDirector(i) {
    setDirectors(prev => { const arr = prev.filter((_, x) => x !== i); setF(p => ({ ...p, num_directors: arr.length })); return arr })
  }
  function updateDir(i, k, v) {
    setDirectors(prev => { const d = [...prev]; d[i] = { ...d[i], [k]: v }; return d })
    let err = null
    if (k === 'pan') err = VALIDATORS.pan(v) === true ? null : VALIDATORS.pan(v)
    if (k === 'aadhaar') err = VALIDATORS.aadhaar(v) === true ? null : VALIDATORS.aadhaar(v)
    if (k === 'din') err = VALIDATORS.din(v) === true ? null : VALIDATORS.din(v)
    if (k === 'mobile') err = VALIDATORS.mobile(v) === true ? null : VALIDATORS.mobile(v)
    if (k === 'email') err = VALIDATORS.email(v) === true ? null : VALIDATORS.email(v)
    if (['pan', 'aadhaar', 'din', 'mobile', 'email'].includes(k)) setErrors(prev => ({ ...prev, ['dir' + i + k]: err }))
  }

  /* ── files: stored as File objects, uploaded securely on submit ── */
  function pickFile(i, field, nameField, file, imageOnly) {
    if (!file) return
    const ok = imageOnly ? ['image/jpeg', 'image/jpg', 'image/png'] : ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!ok.includes(file.type)) { alert(imageOnly ? 'Only JPG, JPEG, PNG allowed' : 'Only JPG, PNG, PDF allowed'); return }
    if (file.size > 10 * 1024 * 1024) { alert('File must be under 10 MB'); return }
    setDirectors(prev => {
      const d = [...prev]
      const extra = field === 'photoFile' ? { photoPreview: URL.createObjectURL(file) } : {}
      d[i] = { ...d[i], [field]: file, [nameField]: file.name, ...extra }
      return d
    })
  }
  function clearFile(i, field, nameField) {
    setDirectors(prev => {
      const d = [...prev]
      const extra = field === 'photoFile' ? { photoPreview: '' } : {}
      d[i] = { ...d[i], [field]: null, [nameField]: '', ...extra }
      return d
    })
  }

  function dirHeading(d, i) { return (d.name && d.name.trim()) || `${cfg.role} ${i + 1}` }
  function initials(d, i) {
    const n = (d.name || '').trim()
    if (!n) return String(i + 1)
    return n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }
  // Convert any image file → PNG base64 via canvas (browser-native, supports JPEG/PNG/GIF/WebP/BMP/TIFF)
  async function imageFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        URL.revokeObjectURL(img.src)
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
      }
      img.onerror = () => reject(new Error('Could not load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  // Convert PDF first page → PNG base64 via PDF.js
  async function pdfFileToBase64(file) {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
    const page = await pdf.getPage(1)
    const vp = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = vp.width; canvas.height = vp.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
  }

  // OCR scan — supports PDF, JPG, JPEG, PNG, GIF, WebP, BMP, TIFF and all image formats
  async function scanDocument(file) {
    if (!file) return
    const isPDF = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/') || ['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/bmp','image/tiff','image/x-tiff'].includes(file.type)
    if (!isPDF && !isImage) {
      alert('Please upload a PDF or image file (JPG, PNG, GIF, WebP, BMP, TIFF etc.)')
      return
    }
    if (file.size > 20 * 1024 * 1024) { alert('File must be under 20 MB for scanning'); return }
    setScanning(true)
    setScanResult(null)
    try {
      // All formats → PNG base64 before sending to OCR
      const base64 = isPDF ? await pdfFileToBase64(file) : await imageFileToBase64(file)
      const { data, error } = await supabase.functions.invoke('scan-document', {
        body: { imageBase64: base64, mimeType: 'image/jpeg' }
      })
      if (error || data?.error) { 
        console.error('Scan error:', error || data?.error)
        setScanResult({ error: true, msg: data?.error || error?.message || 'Unknown error' })
        setScanning(false)
        return 
      }
      const ex = data.extracted || {}
      setScanResult({ fieldsFound: data.fieldsFound || 0, fields: Object.keys(ex), provider: data.provider })
      if (ex.name)     set('name', ex.name)
      if (ex.pan)      set('pan', ex.pan.toUpperCase())
      if (ex.gstin)    set('gstin', ex.gstin.toUpperCase())
      if (ex.tan)      set('tan', ex.tan.toUpperCase())
      if (ex.cin)      set('cin', ex.cin.toUpperCase())
      if (ex.mobile)   set('mobile', ex.mobile.replace(/\D/g,'').slice(0,10))
      if (ex.email)    set('email', ex.email)
      if (ex.address)  set('address', ex.address)
      if (ex.udyam_no) set('udyam_no', ex.udyam_no)
      if (ex.city)     set('city', ex.city)
      if (ex.state)    set('state', ex.state)
      if (ex.pincode)  set('pincode', ex.pincode)
    } catch(e) {
      console.error('Scan failed:', e)
      setScanResult({ error: true })
    }
    setScanning(false)
  }

  // Company document helpers
  function getCompanyDocTypes() {
    const ct = f.client_type
    if (!ct) return []
    if (['Private Limited Company','Public Limited Company','Section 8 Company','LLP'].includes(ct))
      return ['PAN Card','GST Certificate','Incorporation Certificate','MOA', 'AOA','Address Proof','Cancelled Cheque','IEC Certificate','Other']
    if (ct === 'Partnership Firm')
      return ['PAN Card','GST Certificate','Partnership Deed','Address Proof','Cancelled Cheque','IEC Certificate','Other']
    if (['Individual','HUF'].includes(ct))
      return ['PAN Card','Aadhaar Card','Address Proof','Cancelled Cheque','Other']
    if (ct === 'Proprietorship')
      return ['PAN Card','GST Certificate','Udyam Certificate','Address Proof','Cancelled Cheque','IEC Certificate','Other']
    return ['PAN Card','GST Certificate','Address Proof','Cancelled Cheque','IEC Certificate','Other']
  }

  function pickCompanyDoc(type, file) {
    if (!file) return
    const ok = ['image/jpeg','image/jpg','image/png','application/pdf']
    if (!ok.includes(file.type)) { alert('Only JPG, PNG, PDF allowed'); return }
    if (file.size > 10*1024*1024) { alert('File must be under 10 MB'); return }
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setCompanyDocs(d => ({ ...d, [type]: { file, name: file.name, preview } }))
  }

  function removeCompanyDoc(type) {
    setCompanyDocs(d => { const n = {...d}; delete n[type]; return n })
  }

  function previewFile(file, name) {
    const url = URL.createObjectURL(file)
    const isImage = file.type.startsWith('image/')
    setDocViewer({ url, name, isImage })
  }

  function attachmentList() {
    const out = []
    // Company docs
    Object.entries(companyDocs).forEach(([type, { name }]) => out.push({ who: 'Company', type, name }))
    directors.forEach((d, i) => {
      const who = dirHeading(d, i)
      if (d.panFile) out.push({ who, type: 'PAN Card', name: d.panFileName })
      if (d.aadhaarFile) out.push({ who, type: 'Aadhaar Card', name: d.aadhaarFileName })
      if (d.photoFile) out.push({ who, type: 'Photo', name: d.photoName })
    })
    return out
  }

  /* ── step validation ── */
  function validateStep1() {
    const e = {}
    if (!f.name.trim()) e.name = 'Customer name is required'
    if (!f.mobile) e.mobile = 'Mobile is required'; else { const r = fieldError('mobile', f.mobile); if (r) e.mobile = r }
    if (!f.client_type) e.client_type = 'Select client type'
    ;['email', 'pan', 'gstin', 'tan', 'esi_no', 'udyam_no', 'pf_no'].forEach(k => { if (f[k]) { const r = fieldError(k, f[k]); if (r) e[k] = r } })
    setErrors(prev => ({ ...prev, ...e }))
    return Object.keys(e).filter(k => e[k]).length === 0
  }
  function validateStep2() {
    const e = {}
    directors.forEach((d, i) => {
      if (d.din) { const r = VALIDATORS.din(d.din); if (r !== true) e['dir' + i + 'din'] = r }
      if (d.pan) { const r = VALIDATORS.pan(d.pan); if (r !== true) e['dir' + i + 'pan'] = r }
      if (d.aadhaar) { const r = VALIDATORS.aadhaar(d.aadhaar); if (r !== true) e['dir' + i + 'aadhaar'] = r }
      if (d.mobile) { const r = VALIDATORS.mobile(d.mobile); if (r !== true) e['dir' + i + 'mobile'] = r }
      if (d.email) { const r = VALIDATORS.email(d.email); if (r !== true) e['dir' + i + 'email'] = r }
    })
    setErrors(prev => ({ ...prev, ...e }))
    return Object.keys(e).filter(k => e[k]).length === 0
  }
  function next() {
    if (step === 0 && !validateStep1()) return
    if (step === 1 && !validateStep2()) return
    setStep(s => Math.min(2, s + 1))
  }

  /* ── secure upload pipeline (unchanged) ── */
  async function uploadCompanyDocs(clientId, clientName) {
    const entries = Object.entries(companyDocs)
    const failed = []
    for (const [type, { file, name }] of entries) {
      const safe = (name||'file').replace(/[^\w.\-]+/g,'_')
      const path = `${clientId}/client/${Date.now()}_${Math.random().toString(36).slice(2,7)}_${safe}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
      if (upErr) { failed.push(type); continue }
      const { error: insErr } = await supabase.from('documents').insert({
        client_id: clientId, client_name: clientName, doc_type: type, doc_name: name,
        file_path: path, file_size: file.size, mime_type: file.type,
        uploaded_by: user.name, scope: 'client', director_name: null
      })
      if (insErr) failed.push(type)
    }
    return failed
  }

  async function uploadDirectorDocs(clientId, clientName) {
    const tasks = []
    directors.forEach((d, i) => {
      const who = dirHeading(d, i)
      ;[[d.panFile, d.panFileName, 'PAN Card'], [d.aadhaarFile, d.aadhaarFileName, 'Aadhaar Card'], [d.photoFile, d.photoName, 'Photo']]
        .forEach(([file, fname, type]) => { if (file) tasks.push({ file, fname, type, who }) })
    })
    const failed = []
    for (const t of tasks) {
      const safe = (t.fname || 'file').replace(/[^\w.\-]+/g, '_')
      const path = `${clientId}/director/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safe}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, t.file, { contentType: t.file.type })
      if (upErr) { failed.push(`${t.who} – ${t.type}`); continue }
      const { error: insErr } = await supabase.from('documents').insert({
        client_id: clientId, client_name: clientName, doc_type: t.type, doc_name: t.fname,
        file_path: path, file_size: t.file.size, mime_type: t.file.type,
        uploaded_by: user.name, scope: 'director', director_name: t.who
      })
      if (insErr) failed.push(`${t.who} – ${t.type}`)
    }
    return failed
  }

  async function submit(isDraft) {
    if (!isDraft && (!validateStep1() || !validateStep2())) { alert('Please fix the errors before submitting'); return }
    setSaving(true)
    const clientId = 'YA-' + Date.now().toString().slice(-6)
    const payload = {
      client_id: clientId, name: f.name.trim(), mobile: f.mobile, email: f.email || null,
      client_type: f.client_type, pan: f.pan.toUpperCase() || null, gstin: f.gstin.toUpperCase() || null,
      tan: f.tan.toUpperCase() || null, address: f.address || null,
      num_directors: directors.length, pf_no: f.pf_no || null, esi_no: f.esi_no || null, udyam_no: f.udyam_no || null, iec_no: f.iec_no || null, cin: f.cin || null, city: f.city || null, state: f.state || null, pincode: f.pincode || null, services: f.services.length ? f.services : null,
      directors: directors.map(d => ({ name: d.name, din: d.din, email: d.email, mobile: d.mobile, pan: d.pan, aadhaar: d.aadhaar, role: cfg.role })),
      status: isDraft ? 'Draft' : (editClient?.status === 'Active' ? 'Active' : 'Active'), is_draft: isDraft && editClient?.status !== 'Active', onboarded_by: user.name
    }
    let dbError
    if (savedClientId) {
      const { error } = await supabase.from('clients').update(payload).eq('client_id', savedClientId)
      dbError = error
    } else {
      const { error } = await supabase.from('clients').insert(payload)
      dbError = error
    }
    if (dbError) { setSaving(false); alert('Error: ' + dbError.message); return }
    const compFailed = await uploadCompanyDocs(clientId, payload.name)
    const failed = [...compFailed, ...(await uploadDirectorDocs(clientId, payload.name))]
    setSaving(false)
    if (failed.length) alert('Client saved, but these files failed to upload: ' + failed.join(', ') + '. You can re-upload them from the client\u2019s Documents section.')
    if (isDraft) {
      setSavedClientId(clientId)
      setDraftFeedback(savedClientId ? 'updated' : 'saved')
      setTimeout(() => setDraftFeedback(null), 4000)
      return  // stay in wizard — do NOT close
    }
    setDone(payload)
  }

  function resetForm() {
    if (!confirm('Reset the entire form?')) return
    setF({ name: '', mobile: '', email: '', client_type: '', pan: '', gstin: '', tan: '', address: '', num_directors: 0, pf_no: '', esi_no: '', udyam_no: '' })
    setDirectors([]); setErrors({}); setActiveDir(0); setStep(0)
  }

  /* ─────────────────────────── SUCCESS ─────────────────────────── */
  if (done) {
    return (
      <div className="obw-overlay">
        <style>{css}</style>
        <div className="obw-modal" style={{ maxWidth: 560 }}>
          <div className="obw-okwrap">
            <svg className="obw-okring" width="86" height="86" viewBox="0 0 86 86" fill="none">
              <circle cx="43" cy="43" r="40" stroke="#D4B978" strokeWidth="2.5" />
              <path d="M27 44.5 L38.5 56 L60 32" stroke="#0D7A53" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="obw-oktitle">Onboarding Complete</div>
            <div className="obw-oksub">{done.name} has been added to the Yes Advizors client register.</div>
            <div className="obw-idpill">✦ &nbsp;{done.client_id}</div>
          </div>
          <div className="obw-sumcard">
            <KV k="Customer Name" v={done.name} />
            <KV k="Client Type" v={done.client_type} />
            <KV k="PAN" v={done.pan || '—'} />
            <KV k="GSTIN" v={done.gstin || '—'} />
            <KV k={cfg.countLabel} v={done.num_directors} />
            <KV k="Mobile" v={'+91 ' + done.mobile} />
            <KV k="Email" v={done.email || '—'} last />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '18px 28px 24px' }}>
            <button className="obw-btn obw-gold" onClick={onSaved}>Done&nbsp; ✦</button>
          </div>
        </div>
      </div>
    )
  }

  /* ─────────────────────────── WIZARD ─────────────────────────── */
  return (
    <div className="obw-overlay">
      <style>{css}</style>
      <div className="obw-modal">

        {/* header */}
        <div className="obw-head">
          <button className="obw-close" onClick={onClose}>✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
            <div className="obw-mono">YA</div>
            <div>
              <div className="obw-eyebrow">Yes Advizors · Client Register</div>
              <div className="obw-title">Client Onboarding</div>
            </div>
          </div>
          <div className="obw-steps">
            {STEPS.map((label, i) => (
              <StepNode key={i} i={i} label={label} step={step} last={i === STEPS.length - 1} />
            ))}
          </div>
        </div>

        {/* body */}
        <div className="obw-body">
          {draftFeedback && (
            <div style={{ margin: '0 0 14px', padding: '10px 14px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 600, color: '#065F46' }}>
              <span>✓</span>
              {draftFeedback === 'saved' ? 'Draft saved — continue filling in the details and submit when ready.' : 'Draft updated successfully.'}
            </div>
          )}

          {/* STEP 1 — client details */}
          {step === 0 && (
            <div className="obw-pane" key="s1">

              {/* ── OCR AUTO-FILL SECTION ── */}
              <div style={{ marginBottom: 20, padding: '13px 16px', background: 'var(--ltgreen)', border: '1.5px dashed var(--green2)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dkgreen)', marginBottom: 4 }}>🔍 Auto-fill from Document</div>
                <div style={{ fontSize: 11.5, color: 'var(--gray)', marginBottom: 10 }}>Upload any document — PAN card, GST certificate, Aadhaar, Incorporation Certificate. Supports <strong>PDF, JPG, PNG, TIFF, BMP</strong> — all formats.</div>
                {!scanning && !scanResult && (
                  <label style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'7px 14px', background:'var(--dkgreen)', color:'#fff', borderRadius:8, cursor:'pointer', fontSize:12.5, fontWeight:600 }}>
                    📷 Upload & Scan
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,image/*,application/pdf" onChange={e => { scanDocument(e.target.files[0]); e.target.value='' }} style={{ display:'none' }} />
                  </label>
                )}
                {scanning && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--dkgreen)', fontWeight:500 }}>
                    ⏳ Scanning document... please wait
                  </div>
                )}
                {scanResult && !scanResult.error && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12.5, fontWeight:600, color:'#059669' }}>✓ {scanResult.fieldsFound} field{scanResult.fieldsFound!==1?'s':''} auto-filled:</span>
                    {scanResult.fields.map(f => <span key={f} style={{ fontSize:11, background:'#ECFDF5', color:'#059669', padding:'2px 8px', borderRadius:99, fontWeight:600, border:'1px solid #A7F3D0' }}>{f}</span>)}
                    <label style={{ fontSize:11.5, color:'var(--dkgreen)', cursor:'pointer', textDecoration:'underline' }}>
                      Scan another
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,image/*,application/pdf" onChange={e => { scanDocument(e.target.files[0]); e.target.value='' }} style={{ display:'none' }} />
                    </label>
                  </div>
                )}
                {scanResult?.error && (
                  <div style={{ fontSize:12.5, color:'#DC2626', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    ⚠ {scanResult.msg || 'Scanning failed'} &nbsp;
                    <label style={{ color:'var(--dkgreen)', cursor:'pointer', textDecoration:'underline', fontSize:11.5 }}>
                      Try again
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,image/*,application/pdf" onChange={e => { scanDocument(e.target.files[0]); e.target.value='' }} style={{ display:'none' }} />
                    </label>
                  </div>
                )}
              </div>

              <div className="obw-sec">Entity Information</div>
              <div className="obw-grid">
                <Fld label={<>Name of Customer <b>*</b></>} err={errors.name}><input className="obw-inp" value={f.name} onChange={e => set('name', e.target.value)} placeholder="As per PAN / MCA records" /></Fld>
                <Fld label={<>Client Type <b>*</b></>} err={errors.client_type}><select className="obw-inp" value={f.client_type} onChange={e => set('client_type', e.target.value)}><option value="">Select type…</option>{ALL_CLIENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></Fld>
                <Fld label={<>Mobile No. <b>*</b></>} err={errors.mobile}><input className="obw-inp" value={f.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="10-digit mobile" /></Fld>
                <Fld label="Email ID" err={errors.email}><input className="obw-inp" value={f.email} onChange={e => set('email', e.target.value.slice(0, 40))} maxLength={40} placeholder="name@example.com" /></Fld>
              </div>
              <div className="obw-sec">Registrations</div>
              <div className="obw-grid">
                <Fld label="PAN" err={errors.pan}><input className="obw-inp" style={{ textTransform: 'uppercase' }} value={f.pan} onChange={e => set('pan', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" /></Fld>
                <Fld label="GSTIN" err={errors.gstin}><input className="obw-inp" style={{ textTransform: 'uppercase' }} value={f.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} maxLength={15} placeholder="22ABCDE1234F1Z5" /></Fld>
                <Fld label="TAN" err={errors.tan}><input className="obw-inp" style={{ textTransform: 'uppercase' }} value={f.tan} onChange={e => set('tan', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCD12345E" /></Fld>
                <Fld label="Udyam / MSME No." err={errors.udyam_no}><input className="obw-inp" style={{ textTransform: 'uppercase' }} value={f.udyam_no} onChange={e => set('udyam_no', e.target.value.toUpperCase())} placeholder="UDYAM-XX-00-0000000" /></Fld>
                <Fld label="PF No." err={errors.pf_no}><input className="obw-inp" value={f.pf_no} onChange={e => set('pf_no', e.target.value.toUpperCase())} placeholder="e.g. DLCPM1234567000" /></Fld>
                <Fld label="ESI No." err={errors.esi_no}><input className="obw-inp" value={f.esi_no} onChange={e => set('esi_no', e.target.value.replace(/\D/g, ''))} maxLength={17} placeholder="17-digit ESI number" /></Fld>
                <Fld label="IEC No." err={errors.iec_no}><input className="obw-inp" style={{ textTransform: 'uppercase' }} value={f.iec_no} onChange={e => set('iec_no', e.target.value.toUpperCase())} maxLength={10} placeholder="e.g. AABBC1234D" /></Fld>
                {['Private Limited Company','Public Limited Company','Section 8 Company','LLP'].includes(f.client_type) && <Fld label="CIN / LLPIN"><input className="obw-inp" style={{ textTransform: 'uppercase' }} value={f.cin} onChange={e => set('cin', e.target.value.toUpperCase())} maxLength={21} placeholder="e.g. U12345DL2020PTC123456" /></Fld>}
              </div>
              <Fld label="Registered / Business Address"><textarea className="obw-inp" value={f.address} onChange={e => set('address', e.target.value)} placeholder="Registered / business address" /></Fld>
              <div className="obw-grid" style={{ marginTop: 8 }}>
                <Fld label="City"><input className="obw-inp" value={f.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Delhi" /></Fld>
                <Fld label="State"><input className="obw-inp" value={f.state} onChange={e => set('state', e.target.value)} placeholder="e.g. Delhi" /></Fld>
                <Fld label="Pincode"><input className="obw-inp" value={f.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g,''))} maxLength={6} placeholder="110001" /></Fld>
              </div>

            {/* Services */}
            <div className="obw-sec" style={{ marginTop: 8 }}>Services Enrolled</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 16 }}>
              {['GST Returns','Income Tax','Tax Audit','Statutory Audit','ROC / MCA','TDS Returns','Payroll','Bookkeeping','MSME / Udyam','Import Export (IEC)','UAE Corporate Tax','Advisory'].map(svc => {
                const on = f.services.includes(svc)
                return (
                  <button key={svc} type="button" onClick={() => set('services', on ? f.services.filter(s=>s!==svc) : [...f.services, svc])}
                    style={{ padding:'6px 13px', borderRadius:99, fontSize:12, fontWeight:600, border:'1.5px solid', cursor:'pointer', background: on?'var(--dkgreen)':'#fff', color: on?'#fff':'var(--gray)', borderColor: on?'var(--dkgreen)':'var(--border)' }}>
                    {on ? '✓ ' : ''}{svc}
                  </button>
                )
              })}
            </div>

            {/* Company Documents */}
            {f.client_type && (
              <>
                <div className="obw-sec" style={{ marginTop: 8 }}>Company Documents</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 14 }}>
                  {getCompanyDocTypes().map(type => {
                    const doc = companyDocs[type]
                    return (
                      <Fld key={type} label={type}>
                        {doc ? (
                          <div className="obw-attached">
                            <span>📎</span>
                            <span className="nm">{doc.name}</span>
                            <span className="sz">{(doc.file.size/1024).toFixed(0)} KB</span>
                            <button className="obw-x" onClick={() => previewFile(doc.file, doc.name)} title="Preview" style={{ color: 'var(--dkgreen)', marginRight: 2 }}>👁</button>
                            <button className="obw-x" onClick={() => removeCompanyDoc(type)} title="Remove">✕</button>
                          </div>
                        ) : (
                          <Attach file={null} name="" label={`Attach ${type}`}
                            onPick={file => pickCompanyDoc(type, file)}
                            onClear={() => {}} />
                        )}
                      </Fld>
                    )
                  })}
                </div>
              </>
            )}
            <div style={{ height: 18 }} />
          </div>
        )}

          {/* STEP 2 — people */}
          {step === 1 && (
            <div className="obw-pane" key="s2">
              <div className="obw-sec">{cfg.countLabel}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setNumDirectors(n)}
                    className="obw-chip" style={n === directors.length ? { background: '#0A3D2C', borderColor: '#0A3D2C', color: '#fff', padding: '7px 16px' } : { padding: '7px 16px' }}>
                    {n === 0 ? 'None' : n}
                  </button>
                ))}
              </div>

              {directors.length === 0 && (
                <div style={{ textAlign: 'center', padding: '26px 16px', color: '#8A9189', fontSize: 13, background: '#FBFBF8', border: '1px dashed #DDE1DA', borderRadius: 14 }}>
                  No {cfg.role.toLowerCase()} details added. You can continue, or pick a number above to add them.
                </div>
              )}

              {directors.length > 0 && (
                <>
                  <div className="obw-chips">
                    {directors.map((d, i) => (
                      <button key={i} className={`obw-chip ${activeDir === i ? 'active' : ''}`} onClick={() => setActiveDir(i)}>
                        <span className="obw-ava">{initials(d, i)}</span>
                        <span>{dirHeading(d, i)}</span>
                      </button>
                    ))}
                    {directors.length < 5 && <button className="obw-addchip" onClick={() => { addDirector(); setActiveDir(directors.length) }}>+ Add</button>}
                  </div>

                  {directors[activeDir] && (() => {
                    const d = directors[activeDir]; const i = activeDir
                    const isCompanyOrLLP = ['Private Limited Company', 'Public Limited Company', 'Section 8 Company', 'LLP'].includes(f.client_type)
                    return (
                      <div className="obw-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 600, color: '#0A3D2C' }}>{dirHeading(d, i)}</span>
                          <button className="obw-text obw-btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { removeDirector(i); setActiveDir(Math.max(0, i - 1)) }}>✕ Remove</button>
                        </div>
                        <div className="obw-grid">
                          <Fld label="Full Name"><input className="obw-inp" value={d.name} onChange={e => updateDir(i, 'name', e.target.value)} placeholder="Full name" /></Fld>
                          <Fld label="Mobile No." err={errors['dir' + i + 'mobile']}><input className="obw-inp" value={d.mobile} onChange={e => updateDir(i, 'mobile', e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="10-digit mobile" /></Fld>
                          <Fld label="Email ID" err={errors['dir' + i + 'email']}><input className="obw-inp" value={d.email} onChange={e => updateDir(i, 'email', e.target.value.slice(0, 40))} maxLength={40} placeholder="name@example.com" /></Fld>
                          {isCompanyOrLLP && <Fld label="DIN / DPIN" err={errors['dir' + i + 'din']}><input className="obw-inp" value={d.din} onChange={e => updateDir(i, 'din', e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="8-digit DIN/DPIN" /></Fld>}
                        </div>
                        <div className="obw-grid">
                          <Fld label="PAN Number" err={errors['dir' + i + 'pan']}>
                            <input className="obw-inp" style={{ textTransform: 'uppercase' }} value={d.pan} onChange={e => updateDir(i, 'pan', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" />
                            <Attach file={d.panFile} name={d.panFileName} label="Attach PAN card" onPick={file => pickFile(i, 'panFile', 'panFileName', file, false)} onClear={() => clearFile(i, 'panFile', 'panFileName')} />
                          </Fld>
                          <Fld label="Aadhaar" err={errors['dir' + i + 'aadhaar']}>
                            <input className="obw-inp" value={d.aadhaar} onChange={e => updateDir(i, 'aadhaar', e.target.value.replace(/\D/g, ''))} maxLength={12} placeholder="12-digit Aadhaar" />
                            <Attach file={d.aadhaarFile} name={d.aadhaarFileName} label="Attach Aadhaar card" onPick={file => pickFile(i, 'aadhaarFile', 'aadhaarFileName', file, false)} onClear={() => clearFile(i, 'aadhaarFile', 'aadhaarFileName')} />
                          </Fld>
                        </div>
                        <Fld label="Photograph (JPG / PNG)">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <Attach file={d.photoFile} name={d.photoName} label="Attach photo" imageOnly onPick={file => pickFile(i, 'photoFile', 'photoName', file, true)} onClear={() => clearFile(i, 'photoFile', 'photoName')} />
                            </div>
                            {d.photoPreview && <img src={d.photoPreview} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #D4B978', boxShadow: '0 4px 12px rgba(10,61,44,.18)' }} />}
                          </div>
                        </Fld>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                          <button className="obw-btn obw-ghost" style={{ padding: '8px 16px', fontSize: 12, opacity: i === 0 ? 0.45 : 1 }} disabled={i === 0} onClick={() => setActiveDir(Math.max(0, i - 1))}>← Previous</button>
                          {i < directors.length - 1 && <button className="obw-btn obw-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => setActiveDir(i + 1)}>Next {cfg.role} →</button>}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
              <div style={{ height: 18 }} />
            </div>
          )}

          {/* STEP 3 — review */}
          {step === 2 && (
            <div className="obw-pane" key="s3">
              <div className="obw-sec">Entity Information <button className="obw-editlink" onClick={() => setStep(0)}>Edit</button></div>
              <KV k="Customer Name" v={f.name || '—'} />
              <KV k="Client Type" v={f.client_type || '—'} />
              <KV k="Mobile" v={f.mobile ? '+91 ' + f.mobile : '—'} />
              <KV k="Email" v={f.email || '—'} />
              <KV k="PAN" v={f.pan || '—'} />
              <KV k="GSTIN" v={f.gstin || '—'} />
              <KV k="TAN" v={f.tan || '—'} />
              {f.udyam_no && <KV k="Udyam / MSME" v={f.udyam_no} />}
              {f.iec_no && <KV k="IEC No." v={f.iec_no} />}
              {f.cin && <KV k="CIN / LLPIN" v={f.cin} />}
              {f.city && <KV k="City" v={f.city} />}
              {f.state && <KV k="State" v={f.state} />}
              {f.services?.length > 0 && <KV k="Services" v={f.services.join(', ')} />}
              {f.pf_no && <KV k="PF No." v={f.pf_no} />}
              {f.esi_no && <KV k="ESI No." v={f.esi_no} />}
              {f.address && <KV k="Address" v={f.address} last />}

              <div className="obw-sec" style={{ marginTop: 24 }}>{cfg.role}s ({directors.length}) <button className="obw-editlink" onClick={() => setStep(1)}>Edit</button></div>
              {directors.length === 0
                ? <div style={{ fontSize: 12.5, color: '#8A9189', padding: '4px 2px 10px' }}>None added.</div>
                : directors.map((d, i) => (
                    <KV key={i} k={dirHeading(d, i)} v={[d.pan, d.din && 'DIN ' + d.din, d.mobile && '+91 ' + d.mobile].filter(Boolean).join(' · ') || 'Details to follow'} />
                  ))}

              <div className="obw-sec" style={{ marginTop: 24 }}>Documents to Upload ({attachmentList().length})</div>
              {attachmentList().length === 0
                ? <div style={{ fontSize: 12.5, color: '#8A9189', padding: '4px 2px 10px' }}>No files attached. They can also be added later from the client's Documents section.</div>
                : attachmentList().map((a, idx) => (
                    <div className="obw-docrow" key={idx}>
                      <span>📎</span>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, color: '#13241D' }}>{a.type} — <span style={{ color: '#6B7280', fontWeight: 500 }}>{a.name}</span></span>
                      <span className="obw-badge">👤 {a.who}</span>
                    </div>
                  ))}
              <div style={{ fontSize: 11.5, color: '#8A9189', marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#0D7A53' }}>🔒</span> Documents are stored in Yes Advizors' private, access-controlled vault.
              </div>
              <div style={{ height: 18 }} />
            </div>
          )}
        </div>

        {/* footer */}
        <div className="obw-foot">
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="obw-btn obw-text" onClick={resetForm}>Reset</button>
            {editClient?.status !== 'Active' && <button className="obw-btn obw-ghost" disabled={saving} onClick={() => submit(true)}>{savedClientId ? 'Update Draft' : 'Save Draft'}</button>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && <button className="obw-btn obw-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>}
            {step < 2 && <button className="obw-btn obw-primary" onClick={next}>Continue →</button>}
            {step === 2 && <button className="obw-btn obw-gold" disabled={saving} onClick={() => submit(false)}>{saving ? 'Saving…' : '✦ Confirm & Onboard'}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── small building blocks ── */
function StepNode({ i, label, step, last }) {
  const state = i < step ? 'done' : i === step ? 'active' : ''
  return (
    <>
      <div className={`obw-step ${state}`}>
        <div className="obw-dot">{i < step ? '✓' : i + 1}</div>
        <div className="obw-slabel">{label}</div>
      </div>
      {!last && <div className={`obw-sline ${i < step ? 'done' : ''}`} />}
    </>
  )
}
function Fld({ label, err, children }) {
  return <div className="obw-field"><label>{label}</label>{children}{err && <div className="obw-err">{err}</div>}</div>
}
function Attach({ file, name, label, onPick, onClear, imageOnly }) {
  const attachStyle = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, padding: '9px 12px', border: '1.5px dashed #A7D8C3', borderRadius: 11, background: '#FAFCFB', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0D7A53', fontFamily: 'inherit', letterSpacing: 'normal', textTransform: 'none' }
  const attachedStyle = { display: 'flex', alignItems: 'center', gap: 9, marginTop: 7, padding: '8px 12px', border: '1.5px solid #BFE6D2', borderRadius: 11, background: '#F0FBF5', fontSize: 12 }
  if (file) {
    return (
      <div style={attachedStyle}>
        <span>📎</span><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: '#0A3D2C' }}>{name}</span>
        <span style={{ color: '#6B7280', fontSize: 10.5, flexShrink: 0 }}>{(file.size / 1024).toFixed(0)} KB</span>
        <button style={{ border: 'none', background: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 13, padding: 2, lineHeight: 1 }} onClick={onClear} title="Remove">✕</button>
      </div>
    )
  }
  return (
    <label style={attachStyle}>
      <span>＋</span> {label}
      <input type="file" accept={imageOnly ? '.jpg,.jpeg,.png,image/jpeg,image/png' : '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'} onChange={e => { onPick(e.target.files[0]); e.target.value = '' }} style={{ display: 'none' }} />
    </label>
  )
}
function KV({ k, v, last }) {
  return <div className="obw-kv" style={last ? { borderBottom: 'none' } : undefined}><span className="k">{k}</span><span className="v">{v}</span></div>
}
