'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-detect invitation session
  useEffect(() => {
    const handleAuthChange = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      // If there's a session and it's an invite flow (from hash)
      // Or if the user just clicked the link and landing here
      if (window.location.hash.includes('type=invite') || window.location.hash.includes('recovery')) {
        router.push('/update-password')
      } else if (session) {
        // If already logged in normally, go to dashboard
        router.push('/dashboard')
      }
    }

    handleAuthChange()

    // Listen for auth state changes (especially for hash recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && window.location.hash.includes('type=invite'))) {
        router.push('/update-password')
      } else if (session && event === 'SIGNED_IN') {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
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
                <Image src="/favicon.ico" alt="Logo" width={40} height={40} className="object-contain" />
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1 text-black">
                Vibrant<br />Staff App
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 inline-block px-2 py-0.5 rounded border border-black mt-1">
                Authorized Personnel Only
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-3">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500 text-white border-2 border-black p-2 text-[10px] font-black uppercase text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-shake">
                  ⚠️ {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wide ml-1">Email Rasmi</label>
                <input
                  type="email"
                  required
                  className="w-full bg-zinc-50 border-4 border-black rounded-lg p-2.5 font-bold text-base outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all placeholder:text-zinc-400 placeholder:font-medium text-black"
                  placeholder="username@vibrantad.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wide ml-1">Kata Laluan</label>
                <input
                  type="password"
                  required
                  className="w-full bg-zinc-50 border-4 border-black rounded-lg p-2.5 font-bold text-base outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all placeholder:text-zinc-400 placeholder:font-medium text-lg tracking-widest text-black"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-neo-primary text-white border-4 border-black rounded-lg py-2.5 font-black uppercase text-sm tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-70 disabled:grayscale"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <>Log Masuk <ArrowRight className="group-hover/btn:translate-x-1 transition-transform w-4 h-4" strokeWidth={3} /></>}
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
