'use server'

import { createClient } from '@supabase/supabase-js'

export async function inviteStaff(prevState: any, formData: FormData) {
    // Debug logging
    console.log('[InviteStaff] Starting action...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
        console.error('[InviteStaff] Error: NEXT_PUBLIC_SUPABASE_URL is missing')
        return { error: 'Configuration Error: Missing Supabase URL' }
    }

    if (!supabaseServiceKey) {
        console.error('[InviteStaff] Error: SUPABASE_SERVICE_ROLE_KEY is missing')
        return { error: 'Configuration Error: Missing Service Role Key' }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const email = formData.get('email') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string
    const jobTitle = formData.get('job_title') as string

    // Debug inputs
    console.log('[InviteStaff] Inputs:', { email, fullName, role, jobTitle })

    if (!email || !fullName || !role || !jobTitle) {
        return { error: 'Sila isi semua maklumat mandatori.' }
    }

    // Double check site URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    try {
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${siteUrl}/update-password`,
            data: {
                full_name: fullName,
                role: role,
                job_title: jobTitle,
                setup_complete: false,
            },
        })

        if (error) {
            console.error('[InviteStaff] Supabase Invite Error:', error)
            return { error: error.message }
        }

        console.log('[InviteStaff] Success:', data)
        return { success: `Jemputan telah dihantar ke ${email}` }
    } catch (err) {
        console.error('[InviteStaff] Unexpected Exception:', err)
        return { error: 'Terdapat ralat semasa menghantar jemputan.' }
    }
}
