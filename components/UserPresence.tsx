'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function UserPresence() {
    useEffect(() => {
        // Function to send heartbeat
        const sendHeartbeat = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session) {
                    await supabase
                        .from('profiles')
                        .update({ last_seen: new Date().toISOString() })
                        .eq('id', session.user.id)
                }
            } catch (err) {
                console.error('Heartbeat error:', err)
            }
        }

        // Send immediately on mount
        sendHeartbeat()

        // Send every 30 seconds
        const interval = setInterval(sendHeartbeat, 30000)

        return () => clearInterval(interval)
    }, [])

    return null
}
