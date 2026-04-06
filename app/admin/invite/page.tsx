'use client'

import { useEffect, useState, useActionState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { inviteStaff } from '@/app/actions/inviteStaff'
import { Loader2, Send, Shield, Mail, Briefcase, UserPlus, User, ArrowLeft, Plus, Trash2 } from 'lucide-react'

function SubmitButton({ count }: { count: number }) {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-neo-primary text-white border-4 border-black rounded-lg py-3 font-black uppercase text-sm tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:grayscale cursor-pointer group/btn"
        >
            {pending ? (
                <Loader2 className="animate-spin w-5 h-5" />
            ) : (
                <>
                    Hantar {count} Jemputan
                    <Send className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" strokeWidth={3} />
                </>
            )}
        </button>
    )
}

export default function InviteStaffPage() {
    const router = useRouter()
    const [state, action] = useActionState(inviteStaff, null)
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
    const [inviteCount, setInviteCount] = useState([0]) // Array of unique IDs for rows

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                router.push('/dashboard')
                return
            }

            setIsAuthorized(true)
        }

        checkAuth()
    }, [router])

    const addRow = () => {
        setInviteCount(prev => [...prev, Math.max(...prev, 0) + 1])
    }

    const removeRow = (id: number) => {
        if (inviteCount.length > 1) {
            setInviteCount(prev => prev.filter(i => i !== id))
        }
    }

    if (isAuthorized === null) {
        return (
            <div className="min-h-[100dvh] bg-neo-yellow flex items-center justify-center">
                <Loader2 className="animate-spin w-10 h-10 text-black" />
            </div>
        )
    }

    return (
        <div className="fixed inset-0 w-full h-full bg-neo-yellow font-sans overflow-hidden">

            {/* --- BRUTALIST ANIMATED BACKGROUND (FIXED) --- */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none">

                {/* 1. Scrolling Marquee Text (Diagonal) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] flex flex-col justify-center items-center overflow-hidden -rotate-12 translate-z-0 opacity-50">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className={`flex whitespace-nowrap font-black text-[12rem] uppercase leading-[0.85] text-black/5 ${i % 2 === 0 ? 'animate-marquee-left' : 'animate-marquee-right'}`}>
                            <span>{"ADMIN PORTAL ".repeat(20)}</span>
                            <span>{"INVITE STAFF ".repeat(20)}</span>
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

            {/* --- SCROLLABLE CONTENT LAYER --- */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden p-4 pt-20 supports-[min-height:100dvh]:min-h-[100dvh]">
                {/* --- MAIN CARD (LANYARD STYLE) --- */}
                <div className="relative w-full max-w-lg flex flex-col items-center animate-drop-in origin-top my-auto">

                    {/* Lanyard Strap & Clip */}
                    <div className="w-4 h-[100vh] bg-zinc-900 border-x-4 border-black absolute bottom-full left-1/2 -translate-x-1/2 -mb-4 z-0"></div>

                    {/* Metal Clip */}
                    <div className="relative z-20 flex flex-col items-center -mb-6">
                        <div className="w-16 h-12 bg-zinc-300 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                            <div className="w-8 h-2 bg-black rounded-full opacity-50"></div>
                        </div>
                        <div className="w-4 h-8 bg-zinc-400 border-x-4 border-black"></div>
                        <div className="w-10 h-4 bg-black rounded-full"></div>
                    </div>

                    {/* ID Card Holder */}
                    <div className="w-full bg-white border-4 border-black rounded-xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6 pt-10 relative overflow-hidden group">

                        {/* Punch Hole */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-zinc-200 border-2 border-black rounded-full shadow-inner"></div>

                        <div className="relative z-10 space-y-6">
                            {/* Back Button */}
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="absolute -top-6 -left-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-black transition-colors group"
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                Kembali
                            </button>


                            {/* Header Section */}
                            <div className="text-center space-y-2">
                                <div className="inline-block bg-neo-primary p-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-full mb-1 group-hover:rotate-12 transition-transform duration-300">
                                    <UserPlus className="w-8 h-8 text-white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-black">
                                        Invite New Staff
                                    </h1>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 inline-block px-2 py-0.5 rounded border border-black mt-1">
                                        Admin Access Only
                                    </p>
                                </div>
                            </div>

                            <form action={action} className="space-y-6">

                                {/* Feedback Messages */}
                                {state?.success && (
                                    <div className="bg-green-400 text-black border-4 border-black p-2 font-bold text-[10px] uppercase text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                                        ✅ {state.success}
                                    </div>
                                )}
                                {state?.error && (
                                    <div className="bg-red-500 text-white border-4 border-black p-2 font-bold text-[10px] uppercase text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-shake">
                                        ⚠️ {state.error}
                                    </div>
                                )}

                                <div className="space-y-8">
                                    {inviteCount.map((id, index) => (
                                        <div key={id} className="relative p-4 border-4 border-black bg-zinc-50 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                                            {inviteCount.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(id)}
                                                    className="absolute -top-3 -right-3 bg-red-500 text-white border-2 border-black p-1 rounded hover:bg-red-600 transition-colors z-20"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}

                                            <div className="absolute -top-3 -left-3 bg-black text-white px-2 py-1 text-[10px] font-black rounded border-2 border-black">
                                                STAFF #{index + 1}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Full Name Input */}
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide ml-1 text-black">
                                                        Nama Penuh
                                                    </label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                        <input
                                                            type="text"
                                                            name="full_name"
                                                            required
                                                            placeholder="e.g. Ali Bin Abu"
                                                            className="w-full bg-white border-4 border-black rounded-lg py-2 pl-10 pr-3 font-bold text-xs outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-black"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Email Input */}
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide ml-1 text-black">
                                                        Email Pekerja
                                                    </label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            required
                                                            placeholder="staff@vibrant.com"
                                                            className="w-full bg-white border-4 border-black rounded-lg py-2 pl-10 pr-3 font-bold text-xs outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-black"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Job Title Input */}
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide ml-1 text-black">
                                                        Jawatan (Job Title)
                                                    </label>
                                                    <div className="relative">
                                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                        <input
                                                            type="text"
                                                            name="job_title"
                                                            required
                                                            placeholder="e.g. Graphic Designer"
                                                            className="w-full bg-white border-4 border-black rounded-lg py-2 pl-10 pr-3 font-bold text-xs outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-black"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Role Select */}
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide ml-1 text-black">
                                                        System Role
                                                    </label>
                                                    <div className="relative">
                                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                                                        <select
                                                            name="role"
                                                            required
                                                            defaultValue="user"
                                                            className="w-full bg-white border-4 border-black rounded-lg py-2 pl-10 pr-3 font-bold text-xs outline-none appearance-none cursor-pointer text-black relative z-0"
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="hr">HR (Human Resources)</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-black"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={addRow}
                                        className="w-full bg-white text-black border-4 border-black rounded-lg py-2 font-black uppercase text-[10px] tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Tambah Pekerja Lain
                                    </button>

                                    <div className="pt-2">
                                        <SubmitButton count={inviteCount.length} />
                                    </div>
                                </div>

                            </form>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6 space-y-1 pb-10">
                        <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em] text-black">Vibrant Staff Management System</p>
                        <p className="text-[9px] font-bold opacity-30 uppercase tracking-wider text-black">Secure Admin Portal</p>
                    </div>

                </div>
            </div>
        </div>
    )
}
