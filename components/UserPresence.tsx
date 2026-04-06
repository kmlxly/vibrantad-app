'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function UserPresence() {
    useEffect(() => {
        let interval: NodeJS.Timeout

        // Function to send heartbeat
        const sendHeartbeat = async () => {
            // Only send heartbeat if tab is visible
            if (document.visibilityState === 'hidden') return

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

        // Initial setup
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                sendHeartbeat() // Send immediately when coming back
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Start polling immediately
        sendHeartbeat()
        interval = setInterval(sendHeartbeat, 10000) // Increase frequency to 10s for faster status updates

        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    return null
}
