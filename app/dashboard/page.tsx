'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { LogOut, FolderPlus, Trash2, FolderOpen, User, Edit3, X, Check, Briefcase, Shield, Crown, Filter, Camera, Loader2, Building2, Calendar, Clock } from 'lucide-react'

// Define types (Tambah avatar_url)
type Profile = { id: string; full_name: string; job_title: string; role: string; company_name: string; avatar_url: string | null }
type Project = { id: number; name: string; description: string; user_id: string; profiles?: { full_name: string } }

export default function Dashboard() {
  const router = useRouter()
  
  // Data States
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [staffList, setStaffList] = useState<Profile[]>([]) 
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false) // State untuk loading upload gambar
  
  // Filter State
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')

  // Live Date State
  const [currentTime, setCurrentTime] = useState(new Date())

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

    // 3. Logic Fetch Projek
    // Nota: Kita gunakan join ke table profiles untuk dapatkan full_name pencipta
    let query = supabase
      .from('projects')
      .select('*, profiles:user_id(full_name)') 
      .order('created_at', { ascending: false })
    
    if (profileData?.role === 'admin') {
      // Admin View: Fetch all profiles for filtering if not already fetched
      if (staffList.length === 0) {
        const { data: allStaff } = await supabase.from('profiles').select('*').order('full_name', { ascending: true })
        setStaffList(allStaff || [])
      }
      // Apply filter if a specific staff member is selected
      if (selectedStaffId !== 'all') {
        query = query.eq('user_id', selectedStaffId)
      }
    } else {
      // User View: Strictly filter by their own ID
      query = query.eq('user_id', user.id)
    }

    const { data: projectData, error: projectError } = await query
    if (projectError) {
      console.error('Error fetching projects:', projectError)
    }
    setProjects(projectData || [])
    setLoading(false)
  }

  // --- FUNGSI UPLOAD GAMBAR ---
  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Sila pilih gambar.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${profile?.id}/${fileName}`

      // 1. Cek/Guna Bucket 'avatars' (Pastikan bucket ini Public di Supabase)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        if (uploadError.message.includes('not found')) {
          throw new Error('Bucket "avatars" tidak dijumpai. Sila cipta bucket bernama "avatars" di Dashboard Supabase anda dan set sebagai PUBLIC.')
        }
        throw uploadError
      }

      // 2. Dapatkan Public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl

      // 3. Simpan URL dalam Table Profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile?.id)

      if (updateError) throw updateError

      // 4. Update UI
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      alert('Gambar profil berjaya dikemaskini!')

    } catch (error: any) {
      alert('Gagal upload: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
    if (editingProject) {
      console.log('Updating project:', editingProject.id)
      
      // 1. Matikan re-fetch sementara dengan set projects secara manual
      const updatedProjects = projects.map(p => 
        p.id === editingProject.id ? { ...p, name: newProjectName, description: newProjectDesc } : p
      )
      setProjects(updatedProjects)

      // 2. Simpan ke Database
      const { data: checkData, error, status } = await supabase
        .from('projects')
        .update({ 
          name: newProjectName, 
          description: newProjectDesc 
        })
        .eq('id', editingProject.id)
        .select() // PENTING: Minta data balik untuk pastikan ia masuk ke DB
      
      console.log('Supabase Status (Update):', status)
      console.log('Returned Data (Update):', checkData)

      if (error) {
        // Jika error, rollback UI balik
        await fetchData()
        throw error
      }

      if (!checkData || checkData.length === 0) {
        console.error('No rows affected. RLS or invalid ID?')
        throw new Error('Tiada perubahan dikesan. Mungkin anda tiada akses untuk edit projek ini.')
      }
      
      resetModal()
      alert('Berjaya dikemaskini!')
      // fetchData() dipanggil oleh useEffect jika selectedStaffId berubah, 
      // tapi untuk edit kita tak perlu paksa re-fetch jika state dah local update
    } else {
        console.log('Adding new project')
        const { data, error } = await supabase.from('projects')
          .insert([{ 
            name: newProjectName, 
            description: newProjectDesc, 
            user_id: user.id 
          }])
          .select()
        
        console.log('Response from Supabase (Insert):', { data, error })

        if (error) throw error
        
        resetModal()
        await fetchData()
      }
    } catch (err: any) {
      console.error('Operation failed:', err)
      alert('Ralat sistem: ' + (err.message || 'Sila semak konsol'))
    }
  }

  const resetModal = () => {
    setShowModal(false); setEditingProject(null); setNewProjectName(''); setNewProjectDesc('')
  }
  
  const handleEditClick = (e: React.MouseEvent, proj: Project) => {
    e.stopPropagation(); setEditingProject(proj); setNewProjectName(proj.name); setNewProjectDesc(proj.description || ''); setShowModal(true)
  }

  const handleDeleteProject = async (id: number) => {
    if(!confirm("Adakah anda pasti mahu memadam projek ini secara kekal?")) return;
    
    try {
      console.log('Attempting to delete project:', id)
      
      const { error, status } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .select() // Paksa select untuk confirm delete

      console.log('Supabase Status (Delete):', status)
      
      if (error) throw error
      
      console.log('Delete successful')
      // Paksa buang dari UI state dulu
      setProjects(prev => prev.filter(p => p.id !== id))
      
      await fetchData()
      alert('Berjaya dipadam!')
    } catch (err: any) {
      console.error('Delete failed:', err)
      alert("Gagal memadam: " + err.message)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FBF7F0] font-bold">LOADING...</div>

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto font-sans">
      
      {/* HEADER SECTION */}
      <header className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 neo-card bg-white p-6 flex items-center gap-6 relative overflow-hidden">
          
          {/* --- GAMBAR PROFILE & UPLOAD BUTTON --- */}
          <div className="relative group">
            <div className="w-24 h-24 bg-neo-yellow border-2 border-black rounded-full flex items-center justify-center shrink-0 shadow-neo overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-black" />
              )}
            </div>
            
            {/* Butang Kamera (Overlay) */}
            <label className="absolute bottom-0 right-0 bg-white border-2 border-black p-1.5 rounded-full cursor-pointer hover:bg-gray-200 transition-colors shadow-sm">
              {uploading ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14} />}
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleUploadAvatar}
                disabled={uploading}
              />
            </label>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 size={12} className="text-zinc-500" />
              <span className="font-black uppercase tracking-widest text-[10px] text-zinc-500">
                {profile?.company_name || 'Vibrant Tactic'}
              </span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-3 italic">
              {profile?.full_name}
            </h1>
            
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-300 border-2 border-black px-2.5 py-0.5 text-[10px] font-black uppercase flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Briefcase size={10} /> {profile?.job_title || 'Staff'}
                </span>
                <span className={`border-2 border-black px-2.5 py-0.5 text-[10px] font-black uppercase flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isAdmin ? 'bg-red-300' : 'bg-green-300'}`}>
                  {isAdmin ? <Crown size={10}/> : <Shield size={10}/>} 
                  {profile?.role || 'User'}
                </span>
              </div>

              {/* LIVE DATE & TIME - Moved here */}
              <div className="flex items-center gap-2">
                <div className="bg-neo-dark text-white px-2 py-0.5 border-2 border-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Calendar size={10} className="text-neo-yellow" />
                  {currentTime.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div className="bg-white text-black px-2 py-0.5 border-2 border-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Clock size={10} className="text-neo-primary" />
                  {currentTime.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="neo-card bg-neo-dark text-white p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-zinc-400 uppercase mb-1">Total Projek Dipaparkan</div>
            <div className="text-4xl font-black text-neo-yellow">{projects.length}</div>
          </div>
          <button onClick={handleLogout} className="mt-4 bg-white text-black border-2 border-white hover:bg-zinc-200 font-bold py-2 px-4 flex items-center justify-center gap-2 text-sm transition-colors">
            <LogOut size={16} /> LOG KELUAR
          </button>
        </div>
      </header>

      {/* FILTER & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 border-b-4 border-black pb-4 gap-4">
        <div className="w-full md:w-auto">
          <h2 className="text-2xl font-black uppercase italic mb-1">{isAdmin ? 'Pantau Projek' : 'Projek Saya'}</h2>
          
          {isAdmin ? (
            <div className="flex items-center gap-2 mt-2 bg-white border-2 border-black px-3 py-2 shadow-neo-sm w-full md:w-auto">
              <Filter size={18} className="text-zinc-500" />
              <span className="font-bold text-xs uppercase mr-2">Tapis Staff:</span>
              <select className="bg-transparent font-bold outline-none cursor-pointer text-sm min-w-[150px]" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
                <option value="all">SEMUA STAFF</option>
                <option disabled>----------------</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.full_name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm font-bold text-zinc-500">Senarai tugasan aktif anda.</p>
          )}
        </div>

        <button onClick={() => setShowModal(true)} className="neo-btn bg-neo-primary text-white flex items-center gap-2">
          <FolderPlus size={18} /> <span className="font-bold">TAMBAH PROJEK</span>
        </button>
      </div>

      {/* PROJECTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.length === 0 && (
          <div className="col-span-full py-16 text-center border-4 border-dashed border-zinc-300 rounded-xl bg-zinc-50">
            <FolderOpen size={48} className="mx-auto text-zinc-300 mb-2" />
            <p className="font-bold text-zinc-400">Tiada projek ditemui.</p>
          </div>
        )}

        {projects.map((proj) => (
          <div key={proj.id} onClick={() => router.push(`/dashboard/${proj.id}`)} className="neo-card bg-white p-0 cursor-pointer group hover:-translate-y-1 transition-transform h-full flex flex-col">

            <div className="p-4 border-b-2 border-black bg-zinc-50 group-hover:bg-neo-yellow transition-colors flex justify-between items-start">
              <FolderOpen size={24} strokeWidth={2.5} />
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => handleEditClick(e, proj)} className="bg-white p-1.5 border-2 border-black hover:shadow-neo-sm text-black"><Edit3 size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }} className="bg-red-500 p-1.5 border-2 border-black hover:shadow-neo-sm text-white"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="p-5 flex-grow">
              <h3 className="text-xl font-black uppercase leading-tight mb-2 group-hover:underline decoration-2 underline-offset-2">{proj.name}</h3>
              <p className="text-sm font-medium text-zinc-500 line-clamp-3">{proj.description || "Tiada deskripsi."}</p>
            </div>
            <div className="px-4 py-3 bg-black text-white text-[9px] font-bold uppercase flex flex-col gap-1 mt-auto">
              <div className="flex justify-between items-center w-full">
                <span>ID: #{proj.id}</span>
                <span className="flex items-center gap-1 text-neo-yellow">Active <Check size={12} /></span>
              </div>
              {proj.profiles?.full_name && (
                <div className="pt-1 border-t border-white/20 flex items-center gap-1 text-zinc-400">
                  <User size={10} />
                  <span className="tracking-tighter">CREATOR: {proj.profiles.full_name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="neo-card bg-white w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
              <h3 className="text-2xl font-black uppercase italic">{editingProject ? 'Kemaskini Projek' : 'Projek Baru'}</h3>
              <button onClick={resetModal} className="hover:bg-red-100 p-1 rounded-md transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddProject} className="space-y-6">
              <div><label className="block font-black text-sm uppercase mb-2">Nama Projek</label><input autoFocus required className="neo-input w-full" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} /></div>
              <div><label className="block font-black text-sm uppercase mb-2">Deskripsi</label><textarea className="neo-input w-full h-32" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button type="button" onClick={resetModal} className="bg-zinc-200 border-2 border-black font-black py-3 hover:bg-zinc-300 shadow-neo transition-all">BATAL</button>
                <button type="submit" className="bg-neo-primary text-white border-2 border-black font-black py-3 hover:bg-red-400 shadow-neo transition-all">{editingProject ? 'SIMPAN' : 'CIPTA'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
