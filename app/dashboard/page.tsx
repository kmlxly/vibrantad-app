'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { LogOut, FolderPlus, Trash2, FolderOpen, User, Edit3, X, Check, Briefcase, Shield, Crown, Filter, Camera, Loader2, Building2, Calendar, Clock, ChevronDown, Sun, Moon, UserPlus, MapPin, Send, CheckCircle2, XCircle, Hash } from 'lucide-react'
import { useTheme } from '@/lib/ThemeProvider'
import { notifyAllAdmins, notifyStaffStatusUpdate } from '@/app/actions/emailActions'

// Define types
type Profile = { id: string; full_name: string; job_title: string; role: string; company_name?: string; avatar_url: string | null; email?: string; last_seen?: string }
type Project = {
  id: number;
  name: string;
  description: string;
  user_id: string;
  profiles?: { full_name: string; avatar_url: string | null; email?: string };
  status?: string;
  color?: string;
  created_at: string;
}
type WorkingRequest = {
  id: number;
  user_id: string;
  type: 'WFH' | 'Remote' | 'Lapangan' | 'Bercuti';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: { full_name: string; avatar_url: string | null; email?: string };
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

  // Dashboard View State
  const [activeTab, setActiveTab] = useState<'projects' | 'working'>('projects')

  // Tooltip State
  const [tooltipData, setTooltipData] = useState<{ text: string; reason: string | null } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)



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

  // Poll for online status & Send Heartbeat every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      // 1. Get Session for sorting (Heartbeat moved to UserPresence component)
      const { data: { session } } = await supabase.auth.getSession()

      // 2. Refresh Staff List (including sorting)
      const { data: allStaffRaw } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, last_seen, job_title, role') // Select necessary cols only
        .order('full_name', { ascending: true })

      const allStaff = allStaffRaw || []

      // Sort logic (User always first)
      if (session) {
        const sortedStaff = [
          ...allStaff.filter(s => s.id === session.user.id),
          ...allStaff.filter(s => s.id !== session.user.id).sort((a, b) => a.full_name.localeCompare(b.full_name))
        ]
        setStaffList(sortedStaff)
      } else {
        setStaffList(allStaff)
      }

      // 3. Refresh Working Requests (To ensure status updates automatically)
      const { data: requestsResult } = await supabase
        .from('working_requests')
        .select('*, profiles!user_id(full_name, avatar_url, email)')
        .order('created_at', { ascending: false })

      if (requestsResult) {
        setWorkingRequests(requestsResult)
      }

    }, 30000)
    return () => clearInterval(pollInterval)
  }, [])

  const fetchData = async () => {
    try {
      // 1. Cek User Session (Guna getSession lebih laju untuk initial check)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const user = session.user

      // 2. Fetch SEMUA data dalam satu batch (PARALLEL)
      const [profileResult, projectsResult, staffResult, requestsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),

        supabase
          .from('projects')
          .select('*, profiles!user_id(full_name, avatar_url, email)')
          .order('created_at', { ascending: false }),

        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, last_seen, job_title, role')
          .order('full_name', { ascending: true }),

        supabase
          .from('working_requests')
          .select('*, profiles!user_id(full_name, avatar_url, email)')
          .order('created_at', { ascending: false })
      ])

      // Set Profile
      if (profileResult.data) setProfile(profileResult.data)

      // Handle Projects
      if (projectsResult.error) console.error('Error fetching projects:', projectsResult.error)
      setProjects(projectsResult.data || [])

      // Handle Staff List
      if (staffResult.error) console.error('Error fetching staff list:', staffResult.error)
      const allStaff = staffResult.data || []
      // Sort: Current user first, then others alphabetically
      const sortedStaff = [
        ...allStaff.filter(s => s.id === user.id),
        ...allStaff.filter(s => s.id !== user.id).sort((a, b) => a.full_name.localeCompare(b.full_name))
      ]
      setStaffList(sortedStaff)

      // Handle Working Requests
      if (requestsResult.error) {
        console.error('Error fetching working requests:', requestsResult.error.message)
      }
      setWorkingRequests(requestsResult.data || [])

    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase
          .from('profiles')
          .update({
            active_session_id: null,
            last_seen: null
          })
          .eq('id', session.user.id)
      }
    } catch (err) {
      console.error("Logout cleanup error:", err)
    } finally {
      // 2. Clear local storage & Sign out
      localStorage.removeItem('vibrant_device_id')

      // Remove any supabase auth tokens manually just in case
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('supabase.auth.token') || key.includes('sb-'))) {
          localStorage.removeItem(key)
        }
      }

      await supabase.auth.signOut()

      // Hard redirect to root
      window.location.replace('/')
    }
  }

  const baseColorMap: Record<string, string> = {
    'neo-yellow': 'bg-neo-yellow',
    'neo-primary': 'bg-neo-primary',
    'blue-400': 'bg-blue-400',
    'green-400': 'bg-green-400',
    'purple-400': 'bg-purple-400',
    'orange-400': 'bg-orange-400',
  }

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
        const { error } = await supabase.from('projects').update(projectData).eq('id', editingProject.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('projects').insert([projectData])
        if (error) throw error
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
      // Logic Hantar Email ke SEMUA Admin (Server Side)
      const datesString = `${reqForm.start_date} hingga ${reqForm.end_date}`
      await notifyAllAdmins(profile?.full_name || 'Staff', reqForm.type, datesString)

      setShowWorkModal(false)
      fetchData()
      setReqForm({ type: 'WFH', start_date: '', end_date: '', reason: '' })
      alert('Permohonan anda telah dihantar. Admin akan menerima notifikasi email.')
    }
    setReqLoading(false)
  }

  const handleUpdateStatus = async (id: number, status: 'approved' | 'rejected') => {
    if (isAdmin) {
      const { error } = await supabase
        .from('working_requests')
        .update({ status })
        .eq('id', id)

      if (error) alert(error.message)
      else {
        // Logic Hantar Email ke Staff
        const req = workingRequests.find(r => r.id === id)
        if (req?.profiles?.email) {
          notifyStaffStatusUpdate(req.profiles.email, req.type, status)
        }

        alert(`Permohonan telah ${status === 'approved' ? 'diluluskan' : 'ditolak'}. Notifikasi email telah dihantar kepada staff.`)
        fetchData()
      }
    }
  }

  const handleDeleteRequest = async (id: number, userId: string) => {
    const isOwner = profile?.id === userId

    if (!isOwner && !isAdmin) {
      alert('Anda tidak mempunyai kebenaran untuk memadam permohonan ini.')
      return
    }

    if (confirm('Adakah anda pasti mahu membatalkan permohonan ini? Rekod akan dipadam sepenuhnya.')) {
      const { error } = await supabase
        .from('working_requests')
        .delete()
        .eq('id', id)

      if (error) alert('Gagal memadam: ' + error.message)
      else {
        fetchData()
        alert('Permohonan telah dibatalkan. Status bekerja anda kini kembali ke Office.')
      }
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

  // ADMIN QUICK STATUS TOGGLE
  const handleAdminStatusChange = async (newType: 'Office' | 'WFH' | 'Remote' | 'Lapangan' | 'Bercuti') => {
    if (!profile || profile.role !== 'admin') return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // 1. Find if there is ALREADY an approved request for today
      // actually we can just check 'workingRequests' state for efficiency
      const existingReqRaw = workingRequests.find(req => {
        if (req.user_id !== user.id || req.status !== 'approved') return false;
        return today >= req.start_date && today <= req.end_date;
      });

      if (newType === 'Office') {
        // If switching to Office, we DELETE the existing request for today if it matches 'today only'
        // OR we just assume admin overrides for TODAY.
        // For simplicity: If there's a request covering today, we delete it?
        // Warning: If request is "Mon-Fri" and today is "Wed", deleting it deletes whole week.
        // Admin override is powerful. Let's assume for "Quick Toggle", it manages "Today's" status.
        // Better logic: If start=end=today, delete it. If range, maybe warn?
        // Let's keep it simple: "Toggle" creates/updates a SINGLE DAY record for today.

        if (existingReqRaw) {
          if (confirm(`Anda mempunyai status aktif "${existingReqRaw.type}". Tukar kembali ke Office akan memadam rekod ini. Teruskan?`)) {
            await supabase.from('working_requests').delete().eq('id', existingReqRaw.id);
          } else {
            return;
          }
        }
      } else {
        // Switching to WFH/Remote/etc
        // If exists, update type. If not, insert.
        if (existingReqRaw) {
          await supabase.from('working_requests').update({ type: newType }).eq('id', existingReqRaw.id);
        } else {
          await supabase.from('working_requests').insert([{
            user_id: user.id,
            type: newType,
            start_date: today,
            end_date: today,
            status: 'approved',
            reason: 'Admin Manual Status Update'
          }]);
        }
      }

      // Notify other admins about this "Manual Update"
      // User request: "untuk status approve ke tak dia still kena bagi tau dekat email macam biasa sebab admin ada dua orang..."
      // So if I am admin and I toggle, I still notify admins.
      const datesString = `${today} (Status Pantas)`;
      await notifyAllAdmins(profile.full_name, newType, datesString);

      fetchData(); // Refresh UI
    } catch (error) {
      console.error(error);
      alert('Gagal mengemaskini status.');
    }
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

  const isAdmin = profile?.role?.toLowerCase() === 'admin'
  const isHR = profile?.role?.toLowerCase() === 'hr'

  return (
    <div className="min-h-screen bg-neo-bg text-neo-dark font-sans !px-3 py-4 md:p-6 w-full max-w-7xl mx-auto pb-10">

      {/* HEADER */}
      <header className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
          {/* PROFILE CARD */}
          <div className="lg:col-span-8 group relative bg-white dark:bg-zinc-900 border-2 border-black dark:border-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.5)] transition-all overflow-hidden">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-black bg-zinc-100 overflow-hidden relative z-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-300">
                    <User size={40} />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 z-20 bg-black text-white p-2 rounded-full cursor-pointer hover:bg-neo-primary border-2 border-white transition-all">
                <Camera size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} disabled={uploading} />
              </label>
            </div>

            <div className="flex-grow text-center sm:text-left z-10">
              <div className="mb-1.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">WELCOME BACK</p>
                <h1 className="text-3xl sm:text-4xl font-black italic uppercase leading-none tracking-tighter dark:text-white">
                  {profile?.full_name || 'Staff'}
                </h1>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <span className="bg-zinc-100 dark:bg-zinc-800 border-2 border-black dark:border-white px-2.5 py-1 rounded font-bold text-[10px] uppercase dark:text-white flex items-center gap-1.5">
                  <Briefcase size={12} className="text-zinc-400" />
                  {profile?.job_title}
                </span>
                <span className="bg-zinc-100 dark:bg-zinc-800 border-2 border-black dark:border-white px-2.5 py-1 rounded font-bold text-[10px] uppercase dark:text-white flex items-center gap-1.5">
                  <Building2 size={12} className="text-zinc-400" />
                  {profile?.company_name}
                </span>
                <span className="bg-black text-white px-2.5 py-1 rounded font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                  {profile?.role === 'admin' ? <Crown size={12} className="text-neo-yellow" /> : <Shield size={12} className="text-white/70" />}
                  {profile?.role}
                </span>
              </div>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white p-4 rounded-xl flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,107,107,0.5)]">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400">Total Projects</p>
                <h3 className="text-3xl font-black dark:text-white">{projects.length}</h3>
              </div>
              <div className="bg-neo-primary p-2.5 rounded-lg border-2 border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><FolderOpen size={24} /></div>
            </div>

            <div className="bg-black text-white p-3 rounded-xl flex flex-row items-center justify-between gap-3 shadow-[4px_4px_0px_0px_rgba(253,224,71,1)] h-full">
              <div className="flex items-center gap-3">
                <div className="bg-zinc-800 p-2 rounded-lg border border-zinc-700 hidden sm:block">
                  <Clock size={16} className="text-neo-yellow" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black leading-none tracking-tight tabular-nums">
                    {currentTime.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    {currentTime.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', weekday: 'short' })}
                  </span>
                </div>
              </div>

              <div className="flex gap-1.5 items-center">
                {isAdmin && (
                  <select
                    onChange={(e) => handleAdminStatusChange(e.target.value as any)}
                    value={(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      // Use workingRequests state directly which is up to date
                      const activeReq = workingRequests.find(r =>
                        r.user_id === profile?.id &&
                        r.status === 'approved' &&
                        today >= new Date(r.start_date) &&
                        today <= new Date(r.end_date)
                      );
                      // Fallback to Office if no matching approved request
                      return activeReq ? activeReq.type : 'Office';
                    })()}
                    className="bg-zinc-900 text-white px-2 py-1.5 rounded-md border border-zinc-700 hover:border-white transition-colors font-bold uppercase text-[9px] outline-none cursor-pointer text-center appearance-none"
                    style={{ backgroundImage: 'none' }}
                  >
                    <option value="Office">🏢 Office</option>
                    <option value="WFH">🏠 WFH</option>
                    <option value="Remote">🌐 Remote</option>
                    <option value="Lapangan">🚗 Site</option>
                    <option value="Bercuti">🏖 Cuti</option>
                  </select>
                )}
                <button onClick={toggleTheme} className="bg-white text-black w-8 h-8 rounded-md hover:bg-neo-yellow transition-colors flex items-center justify-center">
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <button onClick={handleLogout} className="bg-white text-black w-8 h-8 rounded-md hover:bg-neo-primary hover:text-white transition-colors flex items-center justify-center">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* REMOVED OLD ADMIN TOGGLE UI */}

      {/* DASHBOARD TABS */}
      <div className="grid grid-cols-2 sm:flex gap-2 mb-8 bg-zinc-100 dark:bg-zinc-800 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-3 sm:px-6 py-3 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'projects' ? 'bg-black text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
        >
          <FolderOpen size={16} /> Projek Client
        </button>
        <button
          onClick={() => setActiveTab('working')}
          className={`px-3 sm:px-6 py-3 rounded-lg sm:rounded-xl font-black uppercase text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 relative whitespace-nowrap ${activeTab === 'working' ? 'bg-black text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
        >
          <MapPin size={16} /> Log Lokasi
          {isAdmin || isHR ? (
            workingRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-2 -right-2 bg-neo-primary text-white text-[9px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 font-black px-1 animate-pulse">
                {workingRequests.filter(r => r.status === 'pending').length}
              </span>
            )
          ) : (
            workingRequests.filter(r => r.user_id === profile?.id && r.status !== 'pending' && r.created_at > (new Date(Date.now() - 86400000).toISOString())).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white animate-ping" />
            )
          )}
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="space-y-8 min-h-[400px]">
        {activeTab === 'projects' && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* LIVE STAFF SECTION */}
            <div className="mb-8 overflow-x-auto pb-4 scrollbar-hide">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] dark:text-white flex items-center gap-2">
                  Online Users <span className="text-zinc-400 font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-black/5">{staffList.filter(s => s.last_seen && new Date().getTime() - new Date(s.last_seen).getTime() < 120000).length} Online</span>
                </h3>
              </div>
              <div className="flex gap-4">
                {staffList.map((staff) => {
                  const isOnline = staff.last_seen && new Date().getTime() - new Date(staff.last_seen).getTime() < 120000;

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const activeReq = workingRequests.find(req => {
                    if (req.user_id !== staff.id || req.status !== 'approved') return false;
                    const start = new Date(req.start_date);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(req.end_date);
                    end.setHours(0, 0, 0, 0);
                    return today >= start && today <= end;
                  });

                  const workStatus = activeReq ? activeReq.type : 'Office';

                  return (
                    <div
                      key={staff.id}
                      className="flex flex-col items-center gap-2 group relative cursor-help select-none"
                      onMouseEnter={() => setTooltipData({ text: workStatus, reason: null })} // Re-using tooltipData for generic usage
                      onMouseLeave={() => setTooltipData(null)}
                      onMouseMove={(e) => {
                        if (tooltipRef.current) {
                          const x = e.clientX + 15;
                          const y = e.clientY + 15;
                          const isRightOverflow = x + 150 > window.innerWidth;
                          tooltipRef.current.style.left = isRightOverflow ? `${e.clientX - 120}px` : `${x}px`;
                          tooltipRef.current.style.top = `${y}px`;
                        }
                      }}
                      onClick={(e) => {
                        // Mobile / Click Behavior: Snap to bottom of element
                        e.stopPropagation();
                        // Small delay to prevent mouseMove from overriding immediately if it's a hybrid device
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipData({ text: workStatus, reason: null });

                        setTimeout(() => {
                          if (tooltipRef.current) {
                            tooltipRef.current.style.left = `${rect.left + (rect.width / 2) - 40}px`; // Center ish
                            tooltipRef.current.style.top = `${rect.bottom + 10}px`; // Below
                          }
                        }, 10);
                      }}
                    >
                      <div className={`relative w-14 h-14 rounded-full border-4 ${isOnline ? 'border-green-400 p-0.5' : 'border-zinc-200 dark:border-zinc-800'} transition-all bg-white dark:bg-zinc-900 shadow-sm`}>
                        <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-white">
                          {staff.avatar_url ? (
                            <img src={staff.avatar_url} className="w-full h-full object-cover" alt={staff.full_name} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        {isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <span className={`text-[9px] font-black uppercase truncate max-w-[60px] ${isOnline ? 'text-black dark:text-white' : 'text-zinc-400'}`}>
                        {staff.full_name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white dark:bg-zinc-900 border-2 border-black dark:border-white p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3">
                <div className="bg-neo-yellow p-2 rounded border-2 border-black"><FolderPlus size={20} /></div>
                <h2 className="text-xl font-black uppercase italic dark:text-white">Folder Projek Client</h2>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => setShowWorkModal(true)} className="flex-1 md:flex-none bg-black text-white px-6 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(253,224,71,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-2"><MapPin size={16} /> Mohon Lokasi</button>
                {isAdmin && (
                  <>
                    <button onClick={() => router.push('/admin/invite')} className="flex-1 md:flex-none bg-black text-white px-6 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(255,107,107,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">Staff</button>
                    <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none bg-neo-primary text-white px-6 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-2"><FolderPlus size={16} /> New Project</button>
                  </>
                )}
              </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.length === 0 ? (
                <div className="col-span-full py-20 text-center border-4 border-dashed border-zinc-200 rounded-3xl bg-white dark:bg-zinc-900/50">
                  <FolderOpen size={48} className="mx-auto text-zinc-200 mb-4" />
                  <p className="font-black text-zinc-400 uppercase tracking-widest">Tiada projek aktif.</p>
                </div>
              ) : (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => router.push(`/dashboard/${proj.id}`)}
                    className="group bg-white dark:bg-zinc-900 border-2 border-black dark:border-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col h-full"
                  >
                    <div className={`h-2.5 w-full ${baseColorMap[proj.color || 'neo-yellow']}`}></div>
                    <div className="p-5 flex-grow">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black uppercase px-2 py-1 bg-zinc-100 rounded border border-black text-zinc-400 flex items-center gap-1">
                          <Hash size={10} /> {proj.id}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border border-black flex items-center gap-1.5 ${proj.status === 'completed' ? 'bg-black text-white' : 'bg-green-400'}`}>
                          {(!proj.status || proj.status === 'active') && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                          {proj.status || 'Active'}
                        </span>
                      </div>
                      <h3 className="text-xl font-black uppercase leading-tight mb-2 dark:text-white group-hover:underline">{proj.name}</h3>
                      <p className="text-xs font-medium text-zinc-500 line-clamp-3 leading-relaxed">{proj.description}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border-t-2 border-black dark:border-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-zinc-400" />
                        <span className="text-[10px] font-bold uppercase text-zinc-400">
                          {new Date(proj.created_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => handleEditClick(e, proj)} className="p-1.5 hover:bg-neo-yellow rounded border-2 border-transparent hover:border-black"><Edit3 size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }} className="p-1.5 hover:bg-red-500 hover:text-white rounded border-2 border-transparent hover:border-black"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'working' && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white p-5 rounded-xl shadow-[4px_4px_0px_0px_rgba(253,224,71,1)] flex items-center gap-4 mb-8">
              <div className="bg-black text-white p-3 rounded-xl"><Calendar size={24} /></div>
              <div>
                <h2 className="text-2xl font-black uppercase italic dark:text-white">
                  {isAdmin || isHR ? 'Log Lokasi Staff' : 'Status Permohonan Saya'}
                </h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                  {isAdmin || isHR ? 'Status Kehadiran Luar Pejabat' : 'Rekod dan maklumbalas permohonan lokasi'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workingRequests.filter(r => (isAdmin || isHR) ? true : r.user_id === profile?.id).length === 0 ? (
                <div className="col-span-full py-20 text-center border-4 border-dashed border-zinc-200 rounded-3xl bg-white dark:bg-zinc-900/50">
                  <MapPin size={48} className="mx-auto text-zinc-200 mb-4" />
                  <p className="font-black text-zinc-400 uppercase tracking-widest">Tiada rekod data dijumpai.</p>
                </div>
              ) : (
                workingRequests
                  .filter(r => (isAdmin || isHR) ? true : r.user_id === profile?.id)
                  .map((req) => (
                    <div key={req.id} className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-zinc-100">
                            {req.profiles?.avatar_url ? <img src={req.profiles.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-2" />}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase dark:text-white leading-none">{req.profiles?.full_name}</p>
                            <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase">{new Date(req.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border-2 border-black ${req.status === 'pending' ? 'bg-neo-yellow' : req.status === 'approved' ? 'bg-green-400' : 'bg-red-400 text-white'}`}>{req.status}</span>
                          {(isAdmin || req.user_id === profile?.id) && (
                            <button
                              onClick={() => handleDeleteRequest(req.id, req.user_id)}
                              className="p-1.5 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                              title="Batal / Padam Permohonan"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border-2 border-black/5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">{req.type}</span>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">{req.start_date} → {req.end_date}</span>
                        </div>
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{req.reason}"</p>
                      </div>

                      {isAdmin && req.status === 'pending' && (
                        <div className="flex gap-2 mt-auto">
                          <button onClick={() => handleUpdateStatus(req.id, 'approved')} className="flex-1 bg-green-400 border-2 border-black py-2.5 rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all">Approve</button>
                          <button onClick={() => handleUpdateStatus(req.id, 'rejected')} className="flex-1 bg-red-400 text-white border-2 border-black py-2.5 rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all">Reject</button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* PROJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg border-4 border-black dark:border-white rounded-2xl shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] animate-in zoom-in-95">
            <div className="p-6 border-b-4 border-black flex justify-between items-center bg-neo-primary text-white rounded-t-[14px]">
              <h3 className="text-2xl font-black uppercase italic">{editingProject ? 'Update Project' : 'New Project'}</h3>
              <button onClick={resetModal} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddProject} className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest dark:text-white">Project Name</label>
                <input autoFocus required className="w-full bg-white dark:bg-zinc-800 border-2 border-black p-3 font-bold text-base rounded-lg outline-none focus:ring-4 ring-neo-primary/20" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest dark:text-white">Description</label>
                <textarea className="w-full bg-white dark:bg-zinc-800 border-2 border-black p-3 font-medium text-sm rounded-lg outline-none h-24 resize-none" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest dark:text-white">Status</label>
                  <select className="w-full bg-white dark:bg-zinc-800 border-2 border-black p-3 font-bold text-sm rounded-lg outline-none" value={newProjectStatus} onChange={e => setNewProjectStatus(e.target.value)}>
                    <option value="active">Active 🟢</option>
                    <option value="completed">Completed ⚫️</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest dark:text-white">Color Theme</label>
                  <div className="flex gap-1.5 h-11 items-center">
                    {colorOptions.map((c) => (
                      <button type="button" key={c.name} onClick={() => setNewProjectColor(c.value)} className={`w-7 h-7 rounded-full border-2 border-black ${newProjectColor === c.value ? 'ring-2 ring-black ring-offset-2' : ''}`} style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetModal} className="flex-1 bg-zinc-100 border-2 border-black py-4 font-black uppercase text-xs rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-neo-primary text-white border-2 border-black py-4 font-black uppercase text-xs rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">Save Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORKING REQUEST MODAL */}
      {showWorkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md border-4 border-black dark:border-white rounded-2xl shadow-[8px_8px_0px_0px_rgba(253,224,71,1)] animate-in zoom-in-95">
            <div className="p-5 border-b-4 border-black flex justify-between items-center bg-black text-white rounded-t-[14px]">
              <h3 className="text-lg sm:text-xl font-black uppercase italic">Mohon Lokasi</h3>
              <button onClick={() => setShowWorkModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddRequest} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest dark:text-white">Jenis Permohonan</label>
                <div className="grid grid-cols-3 gap-2">
                  {['WFH', 'Remote', 'Lapangan'].map(t => (
                    <button key={t} type="button" onClick={() => setReqForm({ ...reqForm, type: t as any })} className={`py-3 border-2 border-black rounded-lg text-[10px] font-black uppercase transition-all ${reqForm.type === t ? 'bg-neo-yellow shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-500'}`}>{t}</button>
                  ))}
                  {/* Option 'Bercuti' usually for admin override, but if staff needs to apply leave, they can use this too? 
                      The user requested 'Bercuti' for the ADMIN toggle specifically. 
                      Let's leave user form as is or add it if requested. Stick to User Request: "toggle slider button... tambah 1 lagi status dekat sini 'bercuti'" (referring to admin toggle context). */}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest dark:text-white">Mula</label>
                  <input type="date" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-black p-3 rounded-lg font-bold text-xs dark:text-white" value={reqForm.start_date} onChange={e => setReqForm({ ...reqForm, start_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest dark:text-white">Tamat</label>
                  <input type="date" required className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-black p-3 rounded-lg font-bold text-xs dark:text-white" value={reqForm.end_date} onChange={e => setReqForm({ ...reqForm, end_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest dark:text-white">Alasan / Note</label>
                <textarea required className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-black p-4 font-medium text-xs rounded-lg h-24 resize-none dark:text-white" value={reqForm.reason} onChange={e => setReqForm({ ...reqForm, reason: e.target.value })} placeholder="Nyatakan sebab permohonan..." />
              </div>
              <button type="submit" disabled={reqLoading} className="w-full bg-black text-white border-2 border-black py-4 font-black uppercase text-xs rounded-xl shadow-[4px_4px_0px_0px_rgba(253,224,71,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                {reqLoading ? <Loader2 className="animate-spin" /> : <><Send size={16} /> Hantar Permohonan</>}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* CUSTOM CURSOR TOOLTIP */}
      <div
        ref={tooltipRef}
        className={`fixed z-[9999] pointer-events-none transition-opacity duration-150 ${tooltipData ? 'opacity-100' : 'opacity-0'}`}
        style={{ left: 0, top: 0 }}
      >
        {tooltipData && (
          <div className={`text-[10px] font-black uppercase py-2 px-3 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap border-2 border-black flex items-center gap-2 ${tooltipData.text === 'Office' ? 'bg-white text-black' : 'bg-neo-yellow text-black'}`}>
            {tooltipData.text === 'Office' ? <Building2 size={12} /> : <MapPin size={12} />}
            {tooltipData.text}
          </div>
        )}
      </div>
    </div>
  )
}
