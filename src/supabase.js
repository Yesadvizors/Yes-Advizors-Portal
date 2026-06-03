import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zcszesuvjrryxtigjglt.supabase.co'
const SUPABASE_KEY = 'sb_publishable_rZmEiJTT6-Z2wjXp561qSQ_b_GjkSsN'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
