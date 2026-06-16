# Compliance.jsx — Director KYC integration patch (accurate record)

This document records the exact changes made to `src/components/Compliance.jsx`
from the `main` baseline. It is an audit document — `Compliance.jsx` in this
PR is the integrated file; the original is the `main` branch version.

---

## 1. Two flat imports (top of file, after existing imports)

```diff
 import { useState, useEffect } from 'react'
 import { supabase } from '../supabase'
 import MarkFiledModal from './MarkFiledModal'
+import DirectorKYCActivity from './DirectorKYCActivity'
+import DirectorKYCClientPanel from './DirectorKYCClientPanel'
```

Paths are flat (same `src/components/` directory). No `./compliance/` subdirectory exists.

---

## 2. Director KYC button appended to the activity pill row (inside `ActivityView`)

The existing `ACTIVITY_TYPES.map(...)` renders GST / TDS / Income Tax / ROC / Accounting /
Financials pills. The Director KYC button is appended directly after that map — it is NOT
added to the `ACTIVITY_TYPES` array (which drives the generic DB-table loader).

```diff
         {ACTIVITY_TYPES.map(a => (
           <button key={a.id} onClick={() => { setActType(a.id); setStatus('all') }} ...>
             {a.icon} {a.label}
           </button>
         ))}
+        {/* Director KYC — NOT in ACTIVITY_TYPES; handled by its own component + early return */}
+        <button onClick={() => { setActType('dkyc'); setStatus('all') }} style={{
+          ..., background: actType==='dkyc' ? 'var(--dkgreen)' : 'transparent',
+          color: actType==='dkyc' ? '#fff' : 'var(--gray)',
+        }}>🏛️ Director KYC</button>
```

---

## 3. `loadRows` guard (first line of the async function)

Prevents the generic DB query from running when Director KYC is selected.
`act` (`ACTIVITY_TYPES.find(...)`) is `undefined` for `actType='dkyc'`, so
the generic `act.table` / `act.dueCol` accesses inside `loadRows` must be
unreachable:

```diff
 async function loadRows() {
+  if (actType === 'dkyc') { setLoad(false); return }   // Director KYC uses its own RPC
   setLoad(true)
   const dueCol = act.dueCol || 'standard_due_date'
```

---

## 4. Component-level early return for `actType === 'dkyc'` (the runtime-safety fix)

Inserted after all hooks (`useState` / `useEffect` calls) and after the `loadRows`
function definition, but **before** `const filtered = rows.filter(...)`.

This is the critical safety point. `const filtered` accesses `act.textClient`,
`act.nameCol`, and `act.periodCol`. Because `act` is `undefined` for
`actType='dkyc'`, those accesses would throw at runtime. The early return
prevents `const filtered` — and every subsequent `act.X` reference in the JSX
(stats strip, table row mapper) — from ever executing when DKYC is active.

The generic FY selector, status-filter chips, summary strip, and search box are
deliberately omitted from the DKYC path: `DirectorKYCActivity` has its own
equivalents.

```diff
+  // ── Director KYC early return — after all hooks, before const filtered ──
+  if (actType === 'dkyc') {
+    const canWrite = user?.is_admin === true || ['Admin','Manager'].includes(user?.portal_role)
+    return (
+      <div>
+        {/* Pill row (same styling) so user can switch back to a generic activity */}
+        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
+          <div style={{ display:'flex', gap:4, ... }}>
+            {ACTIVITY_TYPES.map(a => <button onClick={() => setActType(a.id)}>...</button>)}
+            <button style={{ background:'var(--dkgreen)', color:'#fff' }}>🏛️ Director KYC</button>
+          </div>
+        </div>
+        <DirectorKYCActivity canWrite={canWrite} />
+      </div>
+    )
+  }

  const filtered = rows.filter(r => { ...uses act.textClient, act.nameCol... })
```

`canWrite` derivation: `user?.is_admin === true` (matches `is_admin` column on
the `team` table) OR `user?.portal_role` in `['Admin','Manager']` (matches the
`portal_role` enum). `user` is the full `team` table row passed from `App.jsx`.

---

## 5. `DirectorKYCClientPanel` appended inside `ROCTab` (client-wise view)

`ROCTab` renders the existing ROC tracker table for a selected company. The
Director KYC section is appended after that table, separated by a `marginTop`.

```diff
       {filing && <MarkFiledModal ... />}
+      {/* Director KYC — DIN-level statutory KYC obligations for directors of this company */}
+      <div style={{ marginTop:20 }}>
+        <DirectorKYCClientPanel clientUuid={clientId} />
+      </div>
     </>
   )
 }
```

`clientId` is the `clients.id` UUID that `ROCTab` already receives as a prop —
it is the same value expected by `dkyc_list_clientwise(p_client_id uuid)`.

---

## What was NOT changed

- No existing tab, column, modal, or ROC-tracker row was removed or altered.
- `ACTIVITY_TYPES` array is unchanged — Director KYC is handled separately.
- The generic activity table, GST merged view, and financials upload modal are
  unaffected.
- No new standalone nav tab was added to `App.jsx`.
