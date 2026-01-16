'use server'

import { createClient } from '@supabase/supabase-js'

export async function inviteStaff(prevState: any, formData: FormData) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        return { error: 'Supabase configuration missing (URL or Service Role Key)' }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const email = formData.get('email') as string
    const role = formData.get('role') as string
    const position = formData.get('position') as string

    if (!email || !role || !position) {
        return { error: 'Sila isi semua maklumat mandatori.' }
    }

    // Double check site URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    try {
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${siteUrl}/update-password`,
            data: {
                role: role,
                position: position,
                setup_complete: false,
            },
        })

        if (error) {
            console.error('Invite Error:', error)
            return { error: error.message }
        }

        return { success: `Jemputan telah dihantar ke ${email}` }
    } catch (err) {
        console.error('Unexpected Error:', err)
        return { error: 'Terdapat ralat semasa menghantar jemputan.' }
    }
}
