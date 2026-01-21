'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'

export default function SessionChecker() {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const handleSessionSync = async (session: any) => {
            if (!session) return

            // Try to get existing device ID
            let deviceId = localStorage.getItem('vibrant_device_id')

            if (!deviceId) {
                // Create new device ID only if we just signed in or it's missing
                let newId = crypto.randomUUID()
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    newId = 'dev_' + newId
                }
                deviceId = newId
                localStorage.setItem('vibrant_device_id', deviceId)
            }

            // 3. Update the database to claim this session
            // IMPORTANT: If Localhost, DO NOT update DB to avoid kicking out Production
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log("Dev Mode: Skipping session claim to prevent conflict with Production.")
                return
            }

            await supabase
                .from('profiles')
                .update({ active_session_id: deviceId })
                .eq('id', session.user.id)
        }

        // 1. Listen for Auth State Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // On new login, generate fresh device ID to kick out others
                const newDeviceId = crypto.randomUUID()
                localStorage.setItem('vibrant_device_id', newDeviceId)
                await handleSessionSync(session)
            }
        })

        // 2. Periodic Check (Every 10 seconds for session, every 30 seconds for heartbeat)
        let heartbeatCounter = 0;
        const interval = setInterval(async () => {
            // Don't check on login page
            if (pathname === '/') return

            try {
                const { data: { session } } = await supabase.auth.getSession()

                // If no session, we can't do anything (maybe expired), just return
                if (!session) return

                // --- HEARTBEAT (Every 30s) ---
                // We want Heartbeat to work on Localhost too, so you can see yourself live!
                heartbeatCounter += 10;
                if (heartbeatCounter >= 30) {
                    // console.log("Sending Heartbeat...") // Optional debug
                    await supabase
                        .from('profiles')
                        .update({ last_seen: new Date().toISOString() })
                        .eq('id', session.user.id)
                    heartbeatCounter = 0;
                }

                // --- SESSION ENFORCEMENT REMOVED ---
                // We removed the single-session check to prevent looping issues between Localhost & Production.
                // Users can now be logged in on multiple devices, but "Online Status" will still work via Heartbeat above.
            } catch (err) {
                console.error("Session check error (silent):", err)
            }
        }, 10000)

        // 3. Handle Tab Close / Browser Close
        // 3. Handle Tab Close / Browser Close
        const handleUnload = () => {
            // Use navigator.sendBeacon or fetch with keepalive to guarantee execution
            const userId = (supabase.auth.getSession() as any)?.user?.id // This might be tricky synchronously, let's rely on localStorage cache if possible or a simple fetch if we had the ID state.
            // Actually, we can just hit an API route that uses the server-side auth cookie to identify the user.
            navigator.sendBeacon('/api/offline');
        }
        window.addEventListener('beforeunload', handleUnload)

        return () => {
            subscription.unsubscribe()
            clearInterval(interval)
            window.removeEventListener('beforeunload', handleUnload)
        }
    }, [router, pathname])

    return null // This component doesn't render anything
}
