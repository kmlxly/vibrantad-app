'use server'

import { createClient as createServerClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

export async function inviteStaff(prevState: any, formData: FormData) {
    // Debug logging
    console.log('[InviteStaff] Starting action...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // 1. First check if the requester is an admin
    const authSupabase = await createServerClient()
    const { data: { user: requester }, error: authError } = await authSupabase.auth.getUser()

    if (authError || !requester) {
        return { error: 'Sesi tamat. Sila log masuk semula.' }
    }

    const { data: profile } = await authSupabase
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single()

    if (profile?.role !== 'admin') {
        return { error: 'Hanya Admin dibenarkan menghantar jemputan.' }
    }

    if (!supabaseServiceKey) {
        return { error: '⚠️ Configuration Error: Missing Service Role Key.' }
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })

    // Support both single and multiple entries
    const emails = formData.getAll('email') as string[]
    const fullNames = formData.getAll('full_name') as string[]
    const roles = formData.getAll('role') as string[]
    const jobTitles = formData.getAll('job_title') as string[]

    if (!emails.length) {
        return { error: 'Sila isi maklumat jemputan.' }
    }

    // Get the dynamic site URL
    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = host?.includes('localhost') ? 'http' : 'https'
    const siteUrl = `${protocol}://${host}`

    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
    }

    for (let i = 0; i < emails.length; i++) {
        const email = emails[i]
        const fullName = fullNames[i]
        const role = roles[i]
        const jobTitle = jobTitles[i]

        if (!email || !fullName || !role || !jobTitle) continue

        try {
            const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
                redirectTo: `${siteUrl}/update-password`,
                data: {
                    full_name: fullName,
                    role: role,
                    job_title: jobTitle,
                    setup_complete: false,
                },
            })

            if (error) {
                results.failed++
                results.errors.push(`${email}: ${error.message}`)
            } else {
                results.success++
            }
        } catch (err) {
            results.failed++
            results.errors.push(`${email}: Unexpected error`)
        }
    }

    if (results.failed > 0) {
        return {
            error: `Berjaya: ${results.success}, Gagal: ${results.failed}. ${results.errors.join(', ')}`,
            success: results.success > 0 ? `Berjaya menghantar ${results.success} jemputan.` : undefined
        }
    }

    return { success: `Berjaya menghantar jemputan kepada ${results.success} orang.` }
}
