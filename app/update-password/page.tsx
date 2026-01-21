'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, Lock, AlertCircle } from 'lucide-react'

export default function UpdatePasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isCheckingSession, setIsCheckingSession] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        const checkInitialSession = async () => {
            // Check if we have a session immediately
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                console.log('Session found on load')
                setIsCheckingSession(false)
                return
            }

            // If no session, wait for hash processing or auth state change
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth event change:', event, session ? 'Session Active' : 'No Session')
                if (session) {
                    setIsCheckingSession(false)
                    setError('') // Clear any "Auth missing" error if session finally arrives
                }
            })

            // Give it 2.5 seconds max
            const timer = setTimeout(() => {
                const hasTokenInURL = window.location.hash.includes('access_token')

                if (!hasTokenInURL) {
                    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
                        if (!currentSession) {
                            setError('Sesi tidak sah. Sila pastikan anda menekan pautan dari emel jemputan terbaharu.')
                        }
                        setIsCheckingSession(false)
                    })
                } else {
                    // We have a token, but session hasn't fired yet. 
                    // Let's stop the loading spinner and see if it works on submit
                    setIsCheckingSession(false)
                }
            }, 2500)

            return () => {
                subscription.unsubscribe()
                clearTimeout(timer)
            }
        }

        checkInitialSession()
    }, [router])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        // Ensure we have the latest session
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (!currentSession) {
            // Try one last check of auth state
            setError('Auth session missing! Sila cuba muat semula (refresh) halaman ini dan cuba lagi.')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Kata laluan mestilah sekurang-kurangnya 6 aksara')
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError('Kata laluan tidak sepadan')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess('Kata laluan berjaya dikemaskini!')
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)
        }
    }

    if (isCheckingSession) {
        return (
            <div className="min-h-screen bg-neo-yellow flex flex-col items-center justify-center gap-4">
                <div className="bg-white border-4 border-black p-8 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
                    <Loader2 className="animate-spin w-12 h-12 text-neo-primary mb-4" />
                    <p className="font-black uppercase italic tracking-tighter text-xl">Mengesahkan Sesi...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-neo-yellow selection:bg-black selection:text-white font-sans">

            {/* --- BRUTALIST ANIMATED BACKGROUND --- */}
            <div className="absolute inset-0 z-0 pointer-events-none">

                {/* 1. Scrolling Marquee Text (Diagonal) */}
                <div className="absolute inset-0 flex flex-col justify-center items-center overflow-hidden -rotate-12 translate-z-0">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className={`flex whitespace-nowrap font-black text-[12rem] uppercase leading-[0.85] text-black/5 ${i % 2 === 0 ? 'animate-marquee-left' : 'animate-marquee-right'}`}>
                            <span>{"VIBRANTAD ".repeat(40)}</span>
                            <span>{"VIBRANTAD ".repeat(40)}</span>
                        </div>
                    ))}
                </div>

                {/* 2. Floating Geometric Shapes */}
                <div className="absolute top-20 left-20 w-32 h-32 border-4 border-black bg-neo-primary animate-bounce-slow rounded-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"></div>
                <div className="absolute bottom-40 right-20 w-40 h-40 border-4 border-black bg-white animate-spin-slow rect shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                    <div className="w-20 h-20 border-4 border-black bg-black rounded-full"></div>
                </div>
                <div className="absolute top-1/2 left-10 w-24 h-24 border-4 border-black bg-neo-dark rotate-45 animate-pulse shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]"></div>
            </div>

            {/* --- LOGIN CARD (LANYARD STYLE) --- */}
            <div className="relative z-10 w-[92%] max-w-sm flex flex-col items-center animate-drop-in origin-top">

                {/* Lanyard Strap & Clip */}
                <div className="w-4 h-[100vh] bg-neo-primary border-x-4 border-black absolute bottom-full left-1/2 -translate-x-1/2 -mb-4 z-0"></div>

                {/* Metal Clip */}
                <div className="relative z-20 flex flex-col items-center -mb-6">
                    <div className="w-16 h-12 bg-zinc-300 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                        <div className="w-8 h-2 bg-black rounded-full opacity-50"></div>
                    </div>
                    <div className="w-4 h-8 bg-zinc-400 border-x-4 border-black"></div>
                    <div className="w-10 h-4 bg-black rounded-full"></div>
                </div>

                {/* ID Card Holder */}
                <div className="w-full bg-white border-4 border-black rounded-xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6 pt-8 relative overflow-hidden group hover:translate-y-[5px] transition-transform duration-500 ease-in-out text-black">

                    {/* Punch Hole */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-zinc-200 border-2 border-black rounded-full shadow-inner"></div>

                    {/* Decorative Corner */}
                    <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-neo-yellow rotate-45 border-t-4 border-l-4 border-black opacity-50 pointer-events-none"></div>

                    {/* Content */}
                    <div className="relative z-10 space-y-4">

                        {/* Header */}
                        <div className="text-center">
                            <div className="inline-block bg-neo-yellow p-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full mb-3 group-hover:rotate-12 transition-transform duration-300">
                                <Lock className="w-10 h-10 text-black" strokeWidth={2.5} />
                            </div>
                            <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1 text-black">
                                Tetapkan<br />Kata Laluan
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 inline-block px-2 py-0.5 rounded border border-black mt-1">
                                Akses Pekerja Baru
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleUpdatePassword} className="space-y-3">
                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-500 text-white border-2 border-black p-2 text-[10px] font-black uppercase text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-shake">
                                    ⚠️ {error}
                                </div>
                            )}
                            {/* Success Message */}
                            {success && (
                                <div className="bg-green-500 text-white border-2 border-black p-2 text-[10px] font-black uppercase text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    ✅ {success}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-wide ml-1">Kata Laluan Baru</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-zinc-50 border-4 border-black rounded-lg p-2.5 font-bold text-base outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all placeholder:text-zinc-400 placeholder:font-medium text-lg tracking-widest text-black"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-wide ml-1">Sahkan Kata Laluan</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-zinc-50 border-4 border-black rounded-lg p-2.5 font-bold text-base outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all placeholder:text-zinc-400 placeholder:font-medium text-lg tracking-widest text-black"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-neo-primary text-white border-4 border-black rounded-lg py-2.5 font-black uppercase text-sm tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-70 disabled:grayscale"
                                >
                                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <>Simpan & Masuk <ArrowRight className="group-hover/btn:translate-x-1 transition-transform w-4 h-4" strokeWidth={3} /></>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em] text-black">© 2026 Vibrant Tactic SDN BHD</p>
                </div>

            </div>
        </div>
    )
}
