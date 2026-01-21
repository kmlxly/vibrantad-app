'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { LogOut, FolderPlus, Trash2, FolderOpen, User, Edit3, X, Check, Briefcase, Shield, Crown, Filter, Camera, Loader2, Building2, Calendar, Clock, ChevronDown, Sun, Moon, UserPlus, MapPin, Send, CheckCircle2, XCircle } from 'lucide-react'
import { useTheme } from '@/lib/ThemeProvider'

// Define types
type Profile = { id: string; full_name: string; job_title: string; role: string; company_name: string; avatar_url: string | null }
type Project = {
  id: number;
  name: string;
  description: string;
  user_id: string;
  profiles?: { full_name: string; avatar_url: string | null };
  status?: string;
  color?: string;
}
type WorkingRequest = {
  id: number;
  user_id: string;
  type: 'WFH' | 'Remote' | 'Lapangan';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: { full_name: string; avatar_url: string | null };
}

export default function Dashboard() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  // Data States
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [staffList, setStaffList] = useState<Profile[]>([])
  const [workingRequests, setWorkingRequests] = useState<WorkingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Filter State
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectStatus, setNewProjectStatus] = useState('active')
  const [newProjectColor, setNewProjectColor] = useState('neo-yellow')

  // Working Request Modal State
  const [showWorkModal, setShowWorkModal] = useState(false)
  const [reqLoading, setReqLoading] = useState(false)
  const [reqForm, setReqForm] = useState({
    type: 'WFH',
    start_date: '',
    end_date: '',
    reason: ''
  })

  // Live Date State
  const [currentTime, setCurrentTime] = useState(new Date())

  // Color Palette Options
  const colorOptions = [
    { name: 'yellow', value: 'neo-yellow', hex: '#FDE047' },
    { name: 'red', value: 'neo-primary', hex: '#FF6B6B' },
    { name: 'blue', value: 'blue-400', hex: '#60A5FA' },
    { name: 'green', value: 'green-400', hex: '#4ADE80' },
    { name: 'purple', value: 'purple-400', hex: '#C084FC' },
    { name: 'orange', value: 'orange-400', hex: '#FB923C' },
  ]

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchData()
  }, [selectedStaffId])

  const fetchData = async () => {
    // 1. Cek User Session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    // 2. Tarik Profile User Semasa
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)

    // 3. Logic Fetch Projek (Global View - All users see the same 'Client Folders')
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .order('created_at', { ascending: false })

    if (projectError) console.error('Error fetching projects:', projectError)
    setProjects(projectData || [])

    // Admin View: Fetch all profiles for filtering in the NEXT level if needed
    if (profileData?.role === 'admin' && staffList.length === 0) {
      const { data: allStaff } = await supabase.from('profiles').select('*').order('full_name', { ascending: true })
      setStaffList(allStaff || [])
    }

    // 4. Tarik Permohonan Kerja (WFH/Remote/Lapangan)
    const { data: reqs } = await supabase
      .from('working_requests')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .order('created_at', { ascending: false })

    setWorkingRequests(reqs || [])

    setLoading(false)
  }

  // --- FUNGSI UPLOAD GAMBAR ---
  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) throw new Error('Sila pilih gambar.')

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${profile?.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', profile?.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrlData.publicUrl } : null)
      alert('Gambar profil berjaya dikemaskini!')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Explicitly map colors to classes so Tailwind JIT picks them up
  const baseColorMap: Record<string, string> = {
    'neo-yellow': 'bg-neo-yellow',
    'neo-primary': 'bg-neo-primary',
    'blue-400': 'bg-blue-400',
    'green-400': 'bg-green-400',
    'purple-400': 'bg-purple-400',
    'orange-400': 'bg-orange-400',
  }

  const hoverGradientMap: Record<string, string> = {
    'neo-yellow': 'group-hover:bg-gradient-to-r group-hover:from-neo-yellow group-hover:via-white group-hover:to-neo-yellow',
    'neo-primary': 'group-hover:bg-gradient-to-r group-hover:from-neo-primary group-hover:via-red-300 group-hover:to-neo-primary',
    'blue-400': 'group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:via-blue-200 group-hover:to-blue-400',
    'green-400': 'group-hover:bg-gradient-to-r group-hover:from-green-400 group-hover:via-green-200 group-hover:to-green-400',
    'purple-400': 'group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:via-purple-200 group-hover:to-purple-400',
    'orange-400': 'group-hover:bg-gradient-to-r group-hover:from-orange-400 group-hover:via-orange-200 group-hover:to-orange-400',
  }

  // --- CRUD PROJEK --- (Rest of function remains same)
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const projectData = {
      name: newProjectName,
      description: newProjectDesc,
      status: newProjectStatus,
      color: newProjectColor,
      user_id: user.id
    }

    if (profile?.role !== 'admin') {
      alert('Hanya admin dibenarkan melakukan tindakan ini.')
      return
    }

    try {
      if (editingProject) {
        // PERCUBAAN 1: Update Semua Kolum
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id)

        if (error) {
          // Fallback: Jika error sebab kolum tiada, cuba update yang asas sahaja
          if (error.message.includes('column') || error.message.includes('Schema')) {
            console.warn('Kolum baru belum ada di DB, mencuba update asas...')
            const { error: retryError } = await supabase
              .from('projects')
              .update({ name: newProjectName, description: newProjectDesc })
              .eq('id', editingProject.id)

            if (retryError) throw retryError
            alert('Projek dikemaskini (Ciri Warna/Status belum aktif di server)')
          } else {
            throw error
          }
        }
      } else {
        // PERCUBAAN 1: Insert Semua Kolum
        const { error } = await supabase.from('projects').insert([projectData])

        if (error) {
          // Fallback
          if (error.message.includes('column') || error.message.includes('Schema')) {
            console.warn('Kolum baru belum ada di DB, mencuba insert asas...')
            const { error: retryError } = await supabase
              .from('projects')
              .insert([{ name: newProjectName, description: newProjectDesc, user_id: user.id }])

            if (retryError) throw retryError
            alert('Projek dicipta (Ciri Warna/Status belum aktif di server)')
          } else {
            throw error
          }
        }
      }

      fetchData()
      resetModal()
    } catch (error: any) {
      console.error('Error saving project:', error)
      alert(`Gagal: ${error.message}`)
    }
  }

  const handleDeleteProject = async (id: number) => {
    if (profile?.role !== 'admin') {
      alert('Hanya admin dibenarkan memadam projek.')
      return
    }
    if (confirm('Adakah anda pasti mahu memadam projek ini?')) {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) alert('Error deleting project: ' + error.message)
      else fetchData()
    }
  }

  // --- FUNGSI PERMOHONAN KERJA ---
  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setReqLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('working_requests').insert([{
      ...reqForm,
      user_id: user.id,
      status: 'pending'
    }])

    if (error) alert(error.message)
    else {
      setShowWorkModal(false)
      fetchData()
      setReqForm({ type: 'WFH', start_date: '', end_date: '', reason: '' })
      alert('Permohonan anda telah dihantar untuk kelulusan admin.')
    }
    setReqLoading(false)
  }

  const handleUpdateStatus = async (id: number, status: 'approved' | 'rejected') => {
    if (profile?.role !== 'admin') return

    const { error } = await supabase
      .from('working_requests')
      .update({ status })
      .eq('id', id)

    if (error) alert(error.message)
    else {
      alert(`Permohonan telah ${status === 'approved' ? 'diluluskan' : 'ditolak'}.`)
      fetchData()
    }
  }

  const handleEditClick = (e: React.MouseEvent, proj: Project) => {
    e.stopPropagation()
    setEditingProject(proj)
    setNewProjectName(proj.name)
    setNewProjectDesc(proj.description || '')
    setNewProjectStatus(proj.status || 'active')
    setNewProjectColor(proj.color || 'neo-yellow')
    setShowModal(true)
  }

  const resetModal = () => {
    setShowModal(false)
    setEditingProject(null)
    setNewProjectName('')
    setNewProjectDesc('')
    setNewProjectStatus('active')
    setNewProjectColor('neo-yellow')
  }

  if (loading) return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center">
      <Loader2 className="animate-spin w-10 h-10 text-neo-dark" />
    </div>
  )

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-neo-bg text-neo-dark font-sans !px-3 py-4 md:p-6 w-full max-w-7xl mx-auto pb-10">

      {/* HEADER: Compact & Responsive */}
      <header className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">

          {/* USER PROFILE CARD */}
          {/* USER PROFILE CARD - REDESIGNED */}
          {/* USER PROFILE CARD - COMPACT REDESIGN */}
          <div className="lg:col-span-8 group relative bg-white dark:bg-zinc-900 border-2 border-black dark:border-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.5)] transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[10px_10px_0px_0px_rgba(255,255,255,0.8)] overflow-hidden">

            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-neo-yellow rounded-full mix-blend-multiply blur-3xl opacity-20 animate-pulse pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-neo-primary rounded-full mix-blend-multiply blur-3xl opacity-20 pointer-events-none transform -translate-x-1/3 translate-y-1/3"></div>

            {/* AVATAR SECTION */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-black bg-zinc-100 overflow-hidden relative z-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:scale-105 transition-transform duration-300">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-300">
                    <User size={40} />
                  </div>
                )}
              </div>
              {/* Edit Button */}
              <label className="absolute bottom-0 right-0 z-20 bg-black text-white p-2 rounded-full cursor-pointer hover:bg-neo-primary hover:text-white transition-all border-2 border-white hover:scale-110 active:scale-95 shadow-lg group-hover:rotate-12">
                <Camera size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} disabled={uploading} />
              </label>
            </div>

            {/* TEXT CONTENT SECTION */}
            <div className="flex-grow text-center sm:text-left z-10 flex flex-col items-center sm:items-start gap-1 w-full">

              {/* Greeting & Name */}
              <div className="mb-1.5 w-full">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-0.5 opacity-60">
                  <div className="h-[2px] w-3 bg-black dark:bg-white"></div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black dark:text-white">HELLO</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black italic uppercase leading-[0.9] tracking-tighter text-black dark:text-white break-words w-full">
                  {profile?.full_name || 'Staff'}
                </h1>
              </div>

              {/* Details Row */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 w-full">
                <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-600 px-2.5 py-1 rounded border border-zinc-300">
                  <Briefcase size={12} className="text-zinc-600 dark:text-zinc-400" />
                  <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wide">{profile?.job_title || 'Jawatan'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-600 px-2.5 py-1 rounded border border-zinc-300">
                  <Building2 size={12} className="text-zinc-600 dark:text-zinc-400" />
                  <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wide">
                    {profile?.company_name || 'Generic Corp'}
                  </span>
                </div>
              </div>

              {/* Role Badge */}
              <div className="mt-2.5 w-full border-t border-dashed border-zinc-300 pt-2.5 flex justify-center sm:justify-start">
                <div className="inline-flex items-center gap-1.5 bg-black text-white px-3 py-1 rounded-full border-2 border-transparent group-hover:border-neo-primary transition-colors hover:bg-zinc-800">
                  <Shield size={12} className="text-neo-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Peranan SYSTEM: {profile?.role || 'User'}</span>
                </div>
              </div>

            </div>
          </div>

          {/* STATS & ACTIONS SIDEBAR */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
            {/* Stats Card */}
            <div className="neo-card bg-white dark:bg-zinc-900 text-black dark:text-white p-3 flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden group min-h-[100px] border-2 border-black dark:border-white">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neo-primary to-neo-yellow"></div>
              <div className="absolute -right-2 -bottom-2 text-6xl font-black text-black dark:text-white opacity-5 select-none leading-none z-0">{projects.length}</div>
              <div className="relative z-10">
                <h3 className="text-zinc-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">
                  {selectedStaffId === 'all' ? 'Projek Pasukan' : 'Jumlah Paparan'}
                </h3>
                <div className="text-4xl font-black text-black dark:text-white leading-none mb-0.5 group-hover:scale-110 transition-transform duration-300 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.2)] dark:drop-shadow-[2px_2px_0px_rgba(255,255,255,0.2)]">
                  {projects.length}
                </div>
              </div>
            </div>

            {/* Date/Time & Logout */}
            <div className="neo-card bg-white dark:bg-zinc-900 p-3 flex-1 flex flex-col justify-center gap-2">
              <div className="flex justify-between items-center border-b-2 border-zinc-100 dark:border-zinc-800 pb-1.5 mb-0.5">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-black dark:text-white" />
                  <span className="text-[10px] font-bold uppercase dark:text-white">{currentTime.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-neo-primary" />
                  <span className="text-[10px] font-bold uppercase dark:text-white">{currentTime.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full group bg-white hover:bg-neo-primary hover:text-white dark:bg-zinc-800 dark:text-white dark:border-white border-2 border-black rounded-lg text-black font-black py-2.5 px-4 flex items-center justify-center gap-2 text-xs transition-all uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.5)]"
              >
                <LogOut size={14} strokeWidth={3} className="group-hover:translate-x-1 transition-transform duration-300" />
                Log Keluar
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-full group bg-black hover:bg-zinc-800 text-white border-2 border-black rounded-lg font-black py-2.5 px-4 flex items-center justify-center gap-2 text-xs transition-all uppercase shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]"
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                {theme === 'light' ? 'Mod Gelap' : 'Mod Cerah'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* FILTER & ACTIONS TOOLBAR */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-900 border-2 border-black dark:border-white p-3 sm:p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)]">
          {/* Left Side */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="bg-white text-black border-2 border-black dark:bg-zinc-800 dark:text-white dark:border-zinc-700 p-2.5 rounded-lg shrink-0"><FolderOpen size={20} /></div>
              <div>
                <h2 className="text-xl font-black uppercase italic leading-none dark:text-white">Folder Projek Client</h2>
                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">Senarai Utama Client & Projek</p>
              </div>
            </div>
          </div>
          {/* Right Side */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin/invite')}
                className="w-full md:w-auto bg-black text-white border-2 border-black px-6 py-2.5 font-black uppercase tracking-wide rounded-lg shadow-[2px_2px_0px_0px_rgba(255,107,107,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 group"
              >
                <UserPlus size={18} className="text-neo-primary group-hover:scale-110 transition-transform" />
                <span>Urus Staff</span>
              </button>
            )}
            {!isAdmin && (
              <button
                onClick={() => setShowWorkModal(true)}
                className="w-full md:w-auto bg-black text-white border-2 border-black px-6 py-2.5 font-black uppercase tracking-wide rounded-lg shadow-[2px_2px_0px_0px_rgba(253,224,71,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 group"
              >
                <MapPin size={18} className="text-neo-yellow group-hover:scale-110 transition-transform" />
                <span>Mohon Lokasi</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="w-full md:w-auto bg-neo-primary text-white border-2 border-black dark:border-white px-6 py-2.5 font-black uppercase tracking-wide rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 group"
              >
                <FolderPlus size={18} className="group-hover:rotate-12 transition-transform" />
                <span>Tambah Projek</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* WORKING REQUESTS SECTION (Pending for Admin, All for User) */}
      {(workingRequests.length > 0) && (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-black text-white p-2 rounded-lg"><Calendar size={20} /></div>
            <div>
              <h2 className="text-xl font-black uppercase italic leading-none dark:text-white">
                {isAdmin ? 'Permohonan Menunggu Kelulusan' : 'Status Permohonan Kerja'}
              </h2>
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
                {isAdmin ? 'Semakan permohonan WFH, Remote & Lapangan' : 'Rekod permohonan lokasi luar pejabat'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workingRequests.filter(r => isAdmin ? r.status === 'pending' : true).map((req) => (
              <div key={req.id} className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-black bg-zinc-100 overflow-hidden">
                      {req.profiles?.avatar_url ? <img src={req.profiles.avatar_url} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-1" />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase leading-none dark:text-white">{req.profiles?.full_name || 'Staff'}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border-2 border-black ${req.status === 'pending' ? 'bg-neo-yellow' :
                      req.status === 'approved' ? 'bg-green-400' : 'bg-red-400 text-white'
                    }`}>
                    {req.status}
                  </span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg border-2 border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-black text-white text-[9px] font-black px-2 py-0.5 rounded">{req.type}</span>
                    <span className="text-[10px] font-bold dark:text-zinc-300 italic">{req.start_date} → {req.end_date}</span>
                  </div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 line-clamp-2">"{req.reason || 'Tiada alasan disediakan.'}"</p>
                </div>

                {isAdmin && req.status === 'pending' && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'approved')}
                      className="flex-1 bg-green-400 hover:bg-green-500 border-2 border-black py-2 rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                      Luluskan
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'rejected')}
                      className="flex-1 bg-red-400 hover:bg-red-500 text-white border-2 border-black py-2 rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROJECTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.length === 0 && (
          <div className="col-span-full py-16 text-center border-4 border-dashed border-zinc-300 rounded-xl bg-zinc-50">
            <FolderOpen size={48} className="mx-auto text-zinc-300 mb-2" />
            <p className="font-bold text-zinc-400">Tiada projek ditemui.</p>
          </div>
        )}

        {projects.map((proj) => {
          // Dynamic Color Logic
          const colorClass = proj.color ? `bg-${proj.color}` : 'bg-neo-yellow';
          // Ensure valid background class, otherwise fallback (simple hack without mapping full palette in safelist)
          // For now, assuming Tailwind arbitrary values are not needed if we stick to safelisted or known classes.
          // Or we use style attribute for safety if we are unsure about arbitrary class construction.

          return (
            <div
              key={proj.id}
              onClick={() => router.push(`/dashboard/${proj.id}`)}
              className="group relative flex flex-col justify-between h-full bg-white dark:bg-zinc-900 border-2 border-black dark:border-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.8)] transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
            >
              {/* Decorative Header Strip with Dynamic Color & Moving Stripes */}
              <div className={`h-3 w-full ${baseColorMap[proj.color || 'neo-yellow']} hover-stripes flex items-center justify-end px-2`}>
                <div className="w-16 h-full bg-white/20 transform -skew-x-12"></div>
              </div>

              {/* Main Content */}
              <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
                {/* Top Row: Actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <span className="font-mono text-[10px] font-black tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded border border-black dark:border-zinc-600 text-zinc-500 dark:text-zinc-400">
                      #{proj.id.toString().padStart(3, '0')}
                    </span>
                    {/* Status Badge */}
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border border-black ${proj.status === 'completed' ? 'bg-zinc-800 text-white' : 'bg-green-400 text-black animate-pulse'}`}>
                      {proj.status === 'completed' ? 'Selesai' : 'Aktif'}
                    </span>
                  </div>

                  {/* Floating Actions - ADMIN ONLY */}
                  {isAdmin && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-4 right-4 bg-white/90 backdrop-blur border border-black rounded-full p-1 shadow-sm z-10">
                      <button onClick={(e) => handleEditClick(e, proj)} className="p-1.5 hover:bg-neo-yellow rounded-full text-black transition-colors" title="Edit"><Edit3 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }} className="p-1.5 hover:bg-red-500 hover:text-white rounded-full text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h3 className="text-2xl font-black uppercase leading-[1.1] mb-2 tracking-tight group-hover:underline decoration-2 underline-offset-2 decoration-black dark:decoration-white transition-all line-clamp-2 dark:text-white">
                    {proj.name}
                  </h3>
                  <p className="text-sm font-medium text-zinc-500 line-clamp-3 leading-relaxed">
                    {proj.description || "Tiada deskripsi projek."}
                  </p>
                </div>
              </div>

              {/* Footer Metadata */}
              <div className="px-5 py-3 border-t-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-800 flex items-center justify-between gap-4 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full border-2 border-black bg-zinc-200 overflow-hidden flex-shrink-0 shadow-sm">
                    {proj.profiles?.avatar_url ? <img src={proj.profiles.avatar_url} alt="Creator" className="w-full h-full object-cover" /> : <User size={16} className="w-full h-full p-1.5 text-black" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 leading-none mb-0.5 whitespace-nowrap">Created By</span>
                    <span className="text-xs font-black uppercase text-black dark:text-white leading-none truncate w-full">{proj.profiles?.full_name?.split(' ')[0] || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg border-4 border-black dark:border-white rounded-xl shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] animate-in zoom-in-95 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b-4 border-black dark:border-white">
              <h3 className="text-3xl font-black uppercase italic tracking-tighter transform -skew-x-6 dark:text-white">{editingProject ? 'Kemaskini Projek' : 'Projek Baru'}</h3>
              <button onClick={resetModal} className="bg-red-100 hover:bg-red-500 hover:text-white border-2 border-transparent hover:border-black dark:hover:border-white p-2 rounded-lg transition-all"><X size={20} className="text-black" /></button>
            </div>
            <form onSubmit={handleAddProject} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Nama Projek</label>
                <input autoFocus required className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-base outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] focus:-translate-y-1 transition-all dark:text-white" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Masukkan nama projek..." />
              </div>
              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Deskripsi</label>
                <textarea className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-medium text-base outline-none h-24 resize-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] focus:-translate-y-1 transition-all dark:text-white" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} placeholder="Terangkan serba sedikit mengenai projek ini..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Status Selection */}
                <div className="space-y-2">
                  <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Status Projek</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-base outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] focus:-translate-y-1 transition-all cursor-pointer dark:text-white"
                      value={newProjectStatus}
                      onChange={(e) => setNewProjectStatus(e.target.value)}
                    >
                      <option value="active">AKTIF 🟢</option>
                      <option value="completed">SELESAI ⚫️</option>
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none"><ChevronDown size={16} /></div>
                  </div>
                </div>

                {/* Color Selection */}
                <div className="space-y-2">
                  <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Warna Kad</label>
                  <div className="flex gap-2">
                    {colorOptions.map((c) => (
                      <button
                        type="button"
                        key={c.name}
                        onClick={() => setNewProjectColor(c.value)}
                        className={`w-8 h-8 rounded-full border-2 border-black dark:border-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${newProjectColor === c.value ? 'ring-2 ring-offset-2 ring-black dark:ring-white' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {newProjectColor === c.value && <Check size={14} className="text-black" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-dashed border-zinc-200">
                <button type="button" onClick={resetModal} className="bg-zinc-200 hover:bg-white text-black border-2 border-black font-black uppercase tracking-wide py-3.5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">Batal</button>
                <button type="submit" className="bg-neo-primary hover:brightness-110 text-white border-2 border-black font-black uppercase tracking-wide py-3.5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">{editingProject ? 'Simpan' : 'Cipta'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* WORKING REQUEST MODAL */}
      {showWorkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md border-4 border-black dark:border-white rounded-xl shadow-[8px_8px_0px_0px_rgba(253,224,71,1)] animate-in zoom-in-95 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b-4 border-black dark:border-white">
              <h3 className="text-3xl font-black uppercase italic tracking-tighter transform -skew-x-6 dark:text-white flex items-center gap-3">
                <MapPin className="text-neo-yellow" /> Permohonan
              </h3>
              <button onClick={() => setShowWorkModal(false)} className="bg-red-100 hover:bg-red-500 hover:text-white border-2 border-transparent hover:border-black p-2 rounded-lg transition-all"><X size={20} className="text-black" /></button>
            </div>
            <form onSubmit={handleAddRequest} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Jenis Permohonan</label>
                <div className="grid grid-cols-3 gap-2">
                  {['WFH', 'Remote', 'Lapangan'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setReqForm({ ...reqForm, type: t as any })}
                      className={`py-2 border-2 border-black rounded-lg text-xs font-black uppercase transition-all ${reqForm.type === t ? 'bg-neo-yellow shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'bg-zinc-50 dark:bg-zinc-800 dark:text-white'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Tarikh Mula</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-black rounded-lg p-3 font-bold text-xs dark:text-white outline-none"
                    value={reqForm.start_date}
                    onChange={e => setReqForm({ ...reqForm, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Tarikh Tamat</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-black rounded-lg p-3 font-bold text-xs dark:text-white outline-none"
                    value={reqForm.end_date}
                    onChange={e => setReqForm({ ...reqForm, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Sebab / Alasan</label>
                <textarea
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-black rounded-lg p-3 font-medium text-sm dark:text-white outline-none h-24 resize-none"
                  placeholder="Kenapa anda memohon lokasi ini?"
                  value={reqForm.reason}
                  onChange={e => setReqForm({ ...reqForm, reason: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={reqLoading}
                className="w-full bg-black text-white border-4 border-black rounded-xl py-4 font-black uppercase text-sm tracking-widest shadow-[4px_4px_0px_0px_rgba(253,224,71,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {reqLoading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Hantar Permohonan</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
