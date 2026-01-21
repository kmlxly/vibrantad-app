import { createClient } from '@supabase/supabase-js'

// Client khas ini menggunakan SERVICE_ROLE_KEY untuk melepasi sekatan RLS (Bypass RLS)
// HANYA untuk kegunaan di bahagian SERVER sahaja.
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)
