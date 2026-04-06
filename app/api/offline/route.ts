import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
    const cookieStore = await cookies()

    // Create a server-side Supabase client that can read cookies
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    // We don't need to set cookies here, just read
                },
            },
        }
    )

    // Check who is logged in based on the cookie
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        // We need SERVICE_ROLE key to bypass RLS potentially or just standard update if RLS allows
        // But standard update is safer.
        // Let's use SERVICE_ROLE for reliability in this background task
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        await adminClient
            .from('profiles')
            .update({ last_seen: null, active_session_id: null })
            .eq('id', user.id)

        console.log(`User ${user.id} marked offline via Beacon.`)
    }

    return new NextResponse(null, { status: 200 })
}
