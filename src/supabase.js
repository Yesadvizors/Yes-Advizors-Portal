import { createClient } from '@supabase/supabase-js'

// Approved configuration only. No hard-coded project reference and no key value.
// Required env vars must be supplied (dev: .env.local; prod: Vercel project env),
// pointing ONLY at the approved V2 development project (ref supplied via configuration).
// The prohibited V1 project reference is not permitted and has no fallback.
function requireEnv(name) {
  const v = import.meta.env[name]
  if (!v) {
    throw new Error(
      `Missing required environment variable ${name}. Configure the approved V2 development ` +
      `Supabase project (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). No V1 fallback is permitted.`
    )
  }
  return v
}

export const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL')
export const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')
// Edge Function base URL: explicit approved override, else derived from the approved URL.
export const SUPABASE_FUNCTIONS_URL =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${SUPABASE_URL}/functions/v1`

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
