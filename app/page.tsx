'use client'
import { useState } from 'react'
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
    // CONTAINER UTAMA: Flex center untuk letak kotak di tengah skrin
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#FBF7F0]">
      
      {/* KAD LOGIN: White bg, Thick Border, Hard Shadow, Rounded Corners */}
      <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl shadow-neo-lg p-8 relative overflow-hidden">
        
        {/* Hiasan background abstrak */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-300 rounded-full border-2 border-black z-0"></div>

        <div className="relative z-10 text-center space-y-6">
          
          {/* Logo Favicon */}
          <div className="flex justify-center">
            <div className="bg-white p-3 border-2 border-black rounded-xl shadow-neo transform -rotate-6 hover:rotate-0 transition-transform duration-300 cursor-help overflow-hidden">
              <Image 
                src="/favicon.ico" 
                alt="Logo" 
                width={40} 
                height={40} 
                className="object-contain"
              />
            </div>
          </div>
          
          {/* Tajuk */}
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Vibrant Staff App</h1>
            <p className="text-gray-500 font-medium text-sm mt-2">Masuk untuk kemaskini laporan tugasan.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5 text-left mt-6">
            
            {/* Error Alert */}
            {error && (
              <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3 text-red-700 text-sm font-bold flex items-center gap-2">
                <span className="block w-2 h-2 bg-red-600 rounded-full"></span>
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold mb-1 ml-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-white border-2 border-black rounded-lg px-4 py-3 outline-none font-bold focus:shadow-neo focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all placeholder:font-normal"
                placeholder="nama@vibrant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 ml-1">Kata Laluan</label>
              <input 
                type="password" 
                required
                className="w-full bg-white border-2 border-black rounded-lg px-4 py-3 outline-none font-bold focus:shadow-neo focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all placeholder:font-normal"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#FF6B6B] text-white border-2 border-black rounded-lg py-3 font-black text-lg shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-red-500 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Log Masuk <ArrowRight size={20}/></>}
            </button>
          </form>
        </div>
      </div>
      
      <div className="fixed bottom-4 text-xs font-bold text-gray-400">
        © 2026 Vibrant Tactic.
      </div>
    </div>
  )
}
