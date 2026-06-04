import { createClient } from '@supabase/supabase-js'

// Uses .env.local values in dev, Vercel env vars in production.
// Hardcoded fallbacks let the app work before env vars are configured.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zcszesuvjrryxtigjglt.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_rZmEiJTT6-Z2wjXp561qSQ_b_GjkSsN'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
