'use client'
import { useEffect, useState, use, useRef } from 'react' // Import 'use' for params handling in Next 15/14
import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft, PlusCircle, Save, Calendar, CheckCircle2, AlertCircle, Rocket, X, FileText, ClipboardList, Edit3, Trash2, Printer, Share2, Filter, ChevronDown, User, LayoutList, LayoutGrid, Layout, MapPin, MessageSquare, Send, ShieldCheck, Paperclip, Link, ExternalLink, RefreshCw, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/ThemeProvider'

// Types
type Report = {
  id: number;
  title: string;
  status: string;
  type: 'project' | 'task';
  working_location: 'Office' | 'WFH' | 'Lapangan' | 'Remote';
  start_date: string;
  end_date: string;
  task_date: string;
  outcome: string;
  issues: string;
  next_action: string;
  user_id: string;
  profiles?: any;
  attachment_url?: string;
  attachment_name?: string;
}
type ReportComment = {
  id: number;
  report_id: number;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: any;
}
type Note = { id: number; project_id: number; type: 'issue' | 'suggestion'; content: string; created_at: string }
type WorkingRequest = {
  id: number;
  user_id: string;
  type: 'WFH' | 'Remote' | 'Lapangan';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function ProjectPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise)
  const projectId = params.id
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  // Floating Tooltip State
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipData, setTooltipData] = useState<{ text: string, reason?: string } | null>(null)

  const [projectName, setProjectName] = useState('')
  const [projectColor, setProjectColor] = useState('neo-yellow') // Default color
  const [reports, setReports] = useState<Report[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [workingRequests, setWorkingRequests] = useState<WorkingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('')
  const [staffList, setStaffList] = useState<{ id: string, full_name: string }[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('all')
  const [reportTypeTab, setReportTypeTab] = useState<'all' | 'project' | 'task'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [comments, setComments] = useState<ReportComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  const handleLogout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase
          .from('profiles')
          .update({ active_session_id: null, last_seen: null })
          .eq('id', session.user.id)
      }
    } catch (err) {
      console.error("Logout cleanup error:", err)
    } finally {
      localStorage.removeItem('vibrant_device_id')

      // Remove any supabase auth tokens manually just in case
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('supabase.auth.token') || key.includes('sb-'))) {
          localStorage.removeItem(key)
        }
      }

      await supabase.auth.signOut()
      window.location.replace('/')
    }
  }

  // Form State
  const [showForm, setShowForm] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [formData, setFormData] = useState({
    title: '', status: 'In Progress', type: 'project', working_location: 'Office', start_date: '', end_date: '', task_date: '', outcome: '', issues: '', next_action: '',
    attachment_url: '', attachment_name: ''
  })
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [noteForm, setNoteForm] = useState({ type: 'issue', content: '' })

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProjectData()
  }, [])

  const fetchProjectData = async () => {
    // Guna getSession lebih laju
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const user = session.user
    setUserId(user.id)

    // Parallel fetch untuk semua data projek
    const [profileRes, projRes, reportsRes, notesRes, workRes] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('projects').select('name, color').eq('id', projectId).single(),
      supabase.from('reports').select('*, profiles:user_id(full_name, avatar_url)').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('project_notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('working_requests').select('*').eq('status', 'approved')
    ])

    // Set Role & Profile
    const profileRole = profileRes.data?.role || 'user'
    setUserRole(profileRole)

    // Set Project Info
    if (projRes.data) {
      setProjectName(projRes.data.name)
      if (projRes.data.color) setProjectColor(projRes.data.color)
    }

    // Handle Reports (Filter by role if not admin)
    let finalReports = reportsRes.data || []
    if (profileRole !== 'admin') {
      finalReports = finalReports.filter(r => r.user_id === user.id)
    } else if (selectedStaffId !== 'all') {
      finalReports = finalReports.filter(r => r.user_id === selectedStaffId)
    }

    // Fetch Staff List if Admin
    if (profileRole === 'admin' && staffList.length === 0) {
      const { data: allStaff } = await supabase.from('profiles').select('id, full_name').order('full_name', { ascending: true })
      setStaffList(allStaff || [])
    }

    setReports(finalReports)
    setNotes(notesRes.data || [])
    setWorkingRequests(workRes.data || [])
    setLoading(false)
  }

  const fetchComments = async (reportId: number) => {
    try {
      setCommentLoading(true)
      const { data, error } = await supabase
        .from('report_comments')
        .select(`
          id,
          comment,
          created_at,
          user_id,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('report_id', reportId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Formatting to handle the single/array profile return from Supabase
      const formattedData = (data || []).map(item => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      })) as any

      setComments(formattedData)
    } catch (err: any) {
      console.error("Error fetching comments:", err.message)
    } finally {
      setCommentLoading(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedReport || !userId) return

    const commentText = newComment.trim()
    setNewComment('') // Clear immediately for snappy UI

    const { error } = await supabase
      .from('report_comments')
      .insert([{
        report_id: selectedReport.id,
        user_id: userId,
        comment: commentText
      }])

    if (!error) {
      fetchComments(selectedReport.id)
    } else {
      setNewComment(commentText) // Restore if failed
      alert("Gagal hantar komen: " + error.message)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Adakah anda pasti ingin memadam komen ini?')) return

    const { error } = await supabase
      .from('report_comments')
      .delete()
      .eq('id', commentId)

    if (!error) {
      if (selectedReport) fetchComments(selectedReport.id)
    } else {
      alert("Gagal memadam komen: " + error.message)
    }
  }

  useEffect(() => {
    if (selectedReport) {
      fetchComments(selectedReport.id)
    } else {
      setComments([])
    }
  }, [selectedReport])

  // Filtered reports based on tab
  const filteredReports = reports.filter(r => {
    if (reportTypeTab === 'all') return true
    return r.type === reportTypeTab
  })

  // Refetch when filter changes
  useEffect(() => {
    if (!loading) fetchProjectData()
  }, [selectedStaffId])

  // --- LOCAL STORAGE PERSISTENCE (DRAFT) ---
  const STORAGE_KEY = `draft_report_${projectId}`

  // 1. Load Draft on Mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY)
    if (savedDraft && !editingReport) {
      setFormData(JSON.parse(savedDraft))
      // Optional: Auto-open form if draft exists? Let's just keep data ready.
      // setShowForm(true) // Maybe user finds it annoying if it auto-opens. Let's leave it closed but data populated.
    }
  }, [projectId]) // Run once per project ID change

  // 2. Save Draft on Change
  useEffect(() => {
    if (!editingReport && showForm) {
      const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
      }, 500) // Debounce 500ms
      return () => clearTimeout(timer)
    }
  }, [formData, editingReport, showForm, projectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      let finalAttachmentUrl = formData.attachment_url
      let finalAttachmentName = formData.attachment_name

      // 1. Handle File Upload if exists
      if (file) {
        // Limit 100MB check
        if (file.size > 100 * 1024 * 1024) {
          throw new Error("File terlalu besar. Had maksimum ialah 100MB.")
        }

        let fileToUpload = file

        // Image Compression for space optimization
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 1, // Compress target to ~1MB
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          }
          try {
            fileToUpload = await imageCompression(file, options)
          } catch (err) {
            console.error("Compression error:", err)
            // If compression fails, we just upload original
          }
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${projectId}/${userId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, fileToUpload)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(filePath)
        finalAttachmentUrl = publicUrlData.publicUrl
        finalAttachmentName = file.name
      }

      // 2. Sanitasi data: Tukar string kosong kepada null untuk kolum jenis DATE
      const cleanData = {
        ...formData,
        attachment_url: finalAttachmentUrl,
        attachment_name: finalAttachmentName,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        task_date: formData.task_date || null,
      }

      if (editingReport) {
        const { error } = await supabase.from('reports').update(cleanData).eq('id', editingReport.id)

        if (!error) {
          setShowForm(false)
          setEditingReport(null)
          setFormData({ title: '', status: 'In Progress', type: 'project', working_location: 'Office', start_date: '', end_date: '', task_date: '', outcome: '', issues: '', next_action: '', attachment_url: '', attachment_name: '' })
          setFile(null)
          await fetchProjectData()
        } else {
          throw error
        }
      } else {
        const { error } = await supabase.from('reports').insert([{
          project_id: projectId,
          user_id: userId,
          ...cleanData
        }])

        if (!error) {
          // Clear Draft
          localStorage.removeItem(STORAGE_KEY)

          setShowForm(false)
          setFormData({ title: '', status: 'In Progress', type: 'project', working_location: 'Office', start_date: '', end_date: '', task_date: '', outcome: '', issues: '', next_action: '', attachment_url: '', attachment_name: '' })
          setFile(null)
          await fetchProjectData()

          // Auto-scroll ke senarai laporan
          setTimeout(() => {
            listRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        } else {
          throw error
        }
      }
    } catch (error: any) {
      alert("Error: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleEditReport = (report: Report) => {
    setEditingReport(report)
    setFormData({
      title: report.title,
      status: report.status,
      type: report.type || 'project',
      working_location: report.working_location || 'Office',
      start_date: report.start_date || '',
      end_date: report.end_date || '',
      task_date: report.task_date || '',
      outcome: report.outcome,
      issues: report.issues || '',
      next_action: report.next_action || '',
      attachment_url: report.attachment_url || '',
      attachment_name: report.attachment_name || ''
    })
    setFile(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteReport = async (id: number) => {
    if (!confirm("Padam laporan ini?")) return
    const { error } = await supabase.from('reports').delete().eq('id', id)
    if (!error) fetchProjectData()
    if (!error) fetchProjectData()
    else alert("Gagal padam: " + error.message)
  }

  // --- MANUAL NOTES LOGIC ---
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteForm.content.trim()) return

    if (editingNote) {
      const { error } = await supabase.from('project_notes').update({
        type: noteForm.type,
        content: noteForm.content
      }).eq('id', editingNote.id)
      if (error) alert("Error: " + error.message)
    } else {
      const { error } = await supabase.from('project_notes').insert([{
        project_id: projectId,
        type: noteForm.type,
        content: noteForm.content
      }])
      if (error) {
        // Fallback friendly message if table doesn't exist yet
        if (error.message.includes('relation') || error.message.includes('project_notes')) {
          alert("Sila jalankan SQL Update di Supabase Dashboard untuk mengaktifkan ciri ini.")
        } else {
          alert("Error: " + error.message)
        }
      }
    }

    setShowNoteModal(false)
    setEditingNote(null)
    setNoteForm({ type: 'issue', content: '' })
    fetchProjectData()
  }

  const handleDeleteNote = async (id: number) => {
    if (!confirm("Padam nota ini?")) return
    const { error } = await supabase.from('project_notes').delete().eq('id', id)
    if (error) alert("Error: " + error.message)
    else fetchProjectData()
  }

  const openNoteModal = (note?: Note) => {
    if (note) {
      setEditingNote(note)
      setNoteForm({ type: note.type, content: note.content })
    } else {
      setEditingNote(null)
      setNoteForm({ type: 'issue', content: '' })
    }
    setShowNoteModal(true)
  }

  // Fungsi Cari Permohonan Lokasi yang Sah
  const findApprovedRequest = (userId: string, date: string, location: string) => {
    if (location === 'Office') return null; // Office tak perlukan permohonan

    return workingRequests.find(req => {
      const isUser = req.user_id === userId;
      const isType = req.type.toLowerCase() === location.toLowerCase();
      const reportDate = new Date(date);
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);

      // Set hours to 0 to compare dates accurately
      reportDate.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      return isUser && isType && reportDate >= start && reportDate <= end;
    });
  }

  // Fungsi Warna Badge
  const getStatusColor = (status: string) => {
    if (status === 'Done') return 'bg-green-300'
    if (status === 'Blocked') return 'bg-red-300'
    return 'bg-yellow-300'
  }

  // Explicitly map colors to classes so Tailwind JIT picks them up (Copied from dashboard)
  const baseColorMap: Record<string, string> = {
    'neo-yellow': 'bg-neo-yellow',
    'neo-primary': 'bg-neo-primary',
    'blue-400': 'bg-blue-400',
    'green-400': 'bg-green-400',
    'purple-400': 'bg-purple-400',
    'orange-400': 'bg-orange-400',
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    // Generate text summary for sharing
    const reportSummary = filteredReports.map(r => `- [${r.type.toUpperCase()}] ${r.title}: ${r.outcome}`).join('\n')
    const issueSummary = notes.filter(n => n.type === 'issue').map(n => `- [ISU] ${n.content}`).join('\n')
    const suggestionSummary = notes.filter(n => n.type === 'suggestion').map(n => `- [CADANGAN] ${n.content}`).join('\n')

    const fullText = `Laporan Projek: ${projectName}\n\nTASKS:\n${reportSummary}\n\n${issueSummary ? `ISSUES:\n${issueSummary}\n\n` : ''}${suggestionSummary ? `SUGGESTIONS:\n${suggestionSummary}` : ''}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Laporan Projek: ${projectName}`,
          text: fullText,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Share canceled')
      }
    } else {
      navigator.clipboard.writeText(fullText + '\n\n' + window.location.href)
      alert('Laporan diringkaskan dan pautan disalin ke papan keratan!')
    }
  }

  if (loading) return <div className="p-10 font-bold">Loading Reports...</div>

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto pb-10 font-sans text-black">

      {/* PRINT HEADER ONLY */}
      <div className="hidden print:block mb-8 border-b-4 border-black pb-4 text-black">
        <div className="flex justify-between items-start text-black">
          <div className="flex flex-col text-black">
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none text-black">Laporan Kemajuan Kerja</h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-2 text-black">Vibrant Staff App — Ringkasan Eksekutif Projek</p>
          </div>
          <div className="text-right text-black">
            <h2 className="text-2xl font-black uppercase leading-none text-black">{projectName || 'Loading...'}</h2>
            <div className="flex flex-col text-[10px] font-bold text-zinc-600 mt-2 leading-tight uppercase tracking-wider text-black">
              <span>Projek ID: #{projectId}</span>
              <span>Tarikh Cetakan: {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="mb-8 text-black">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-black">

          {/* LEFT: Project Meta & Actions (Compact Sidebar) - HIDDEN ON PRINT */}
          <div className="lg:col-span-4 flex flex-col gap-4 print:hidden text-black">
            {/* Header Actions: Back, Theme, Logout */}
            <div className="flex gap-2 print:hidden w-full sm:w-auto text-black">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 sm:flex-none group flex items-center justify-center gap-3 font-black uppercase text-xs tracking-wider bg-white hover:bg-black hover:text-neo-yellow border-2 border-black px-4 py-3 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all dark:bg-zinc-900 dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black text-black"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Kembali
              </button>

              <button
                onClick={toggleTheme}
                className="bg-white text-black border-2 border-black p-2 rounded-lg hover:bg-neo-yellow transition-colors flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:bg-zinc-900 dark:text-white dark:border-white text-black"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button
                onClick={handleLogout}
                className="bg-white text-black border-2 border-black p-2 rounded-lg hover:bg-neo-primary hover:text-white transition-colors flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:bg-zinc-900 dark:text-white dark:border-white text-black"
              >
                <LogOut size={20} />
              </button>
            </div>

            {/* Share & Print Actions */}
            <div className="flex gap-2 print:hidden text-black">
              <button onClick={handlePrint} className="flex-1 bg-white border-2 border-black p-2.5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase hover:bg-zinc-100 dark:bg-zinc-900 dark:border-white dark:text-white dark:hover:bg-zinc-800 text-black">
                <Printer size={16} /> Cetak / PDF
              </button>
              <button onClick={handleShare} className="flex-1 bg-white border-2 border-black p-2.5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase hover:bg-zinc-100 dark:bg-zinc-900 dark:border-white dark:text-white dark:hover:bg-zinc-800 text-black">
                <Share2 size={16} /> Kongsi
              </button>
            </div>

            {/* Project Info Card */}
            {/* Project Info Card */}
            <div className="neo-card bg-white dark:bg-zinc-800 border-2 border-black dark:border-white p-0 relative overflow-hidden flex-grow flex flex-col justify-between min-h-[250px] group text-black">
              {/* Colored Top Strip */}
              <div className={`h-4 w-full ${baseColorMap[projectColor] || 'bg-neo-yellow'} hover-stripes flex items-center justify-end px-2 border-b-2 border-black dark:border-white text-black`}>
                <div className="w-20 h-full bg-white/20 transform -skew-x-12"></div>
              </div>

              <div className="p-6 flex flex-col justify-between h-full relative text-black">
                <div className="absolute top-10 right-0 p-4 opacity-5 dark:opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-500 text-black">
                  <ClipboardList size={120} className="text-black dark:text-white text-black" />
                </div>

                <div className="relative z-10 text-black">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 border border-black dark:border-zinc-700 text-black dark:text-white px-2 py-0.5 inline-block mb-3 rounded text-black">
                    Project ID: #{projectId}
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase italic leading-[0.9] tracking-tighter mb-4 break-words text-black dark:text-white text-black">
                    {projectName || 'Loading...'}
                  </h1>
                </div>

                <div className="relative z-10 pt-4 border-t-2 border-black/10 dark:border-white/10 mt-4 text-black">
                  <div className="flex items-center gap-2 mb-4 text-black">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse text-black"></div>
                    <span className="font-bold text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-300 text-black">Status: Active</span>
                  </div>

                  <button
                    onClick={() => {
                      if (showForm) {
                        setShowForm(false);
                        setEditingReport(null);
                        setFormData({ title: '', status: 'In Progress', type: 'project', working_location: 'Office', start_date: '', end_date: '', task_date: '', outcome: '', issues: '', next_action: '', attachment_url: '', attachment_name: '' });
                      } else {
                        setShowForm(true);
                      }
                    }}
                    className={`w-full py-2.5 px-6 flex items-center justify-center gap-2 font-black uppercase tracking-wide border-2 border-black dark:border-white rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group text-black ${showForm ? 'bg-zinc-800 text-white dark:bg-zinc-700 text-black' : 'bg-neo-primary text-white hover:brightness-110 text-black'}`}
                  >
                    {showForm ? (
                      <><X size={18} className="group-hover:rotate-90 transition-transform text-black" /> Tutup Borang</>
                    ) : (
                      <><PlusCircle size={18} className="group-hover:rotate-12 transition-transform text-black" /> Tambah Laporan</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Reports List & Form (Main Content) */}
          <div className="lg:col-span-8 flex flex-col gap-6 text-black">

            {/* FORM AREA */}
            {showForm && (
              <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] p-6 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden text-black text-black">

                {/* Decorative Form Header */}
                <div className="flex items-center justify-between mb-6 border-b-4 border-black dark:border-white pb-4 text-black text-black text-black">
                  <div className="flex items-center gap-3 text-black">
                    <div className="bg-neo-primary text-white p-2.5 border-2 border-black dark:border-white shadow-neo-sm transform -rotate-3 text-black">
                      <FileText size={24} />
                    </div>
                    <h3 className="font-black text-3xl uppercase italic tracking-tighter transform -skew-x-6 dark:text-white text-black">
                      {editingReport ? 'Kemaskini Laporan' : 'Laporan Baru'}
                    </h3>
                  </div>

                  {/* Close Button Inside Form */}
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingReport(null);
                      setFormData({ title: '', status: 'In Progress', type: 'project', working_location: 'Office', start_date: '', end_date: '', task_date: '', outcome: '', issues: '', next_action: '', attachment_url: '', attachment_name: '' });
                    }}
                    className="bg-black text-white dark:bg-white dark:text-black p-2 rounded-lg border-2 border-black dark:border-white hover:scale-110 active:scale-95 transition-all shadow-neo-sm"
                    title="Tutup Borang"
                  >
                    <X size={20} className="text-white dark:text-black" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 text-black">
                  {/* SECTION 1: DASAR & MAKLUMAT UTAMA */}
                  <div className="space-y-6 text-black text-black text-black">
                    <div className="flex items-center justify-between border-b-2 border-zinc-100 dark:border-zinc-800 pb-3 text-black text-black text-black text-black">
                      <div className="flex items-center gap-3 text-black">
                        <div className="p-2 bg-neo-primary/10 rounded-lg text-black">
                          <ClipboardList size={20} className="text-neo-primary text-black" />
                        </div>
                        <div className="text-black">
                          <h4 className="font-black text-sm uppercase tracking-widest dark:text-white text-black text-black">Maklumat Utama</h4>
                          <p className="text-[10px] font-medium text-zinc-400 uppercase text-black">Input asas untuk laporan anda</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black text-black text-black">
                      <div className="md:col-span-2 space-y-2 text-black text-black text-black">
                        <label className="flex items-center gap-2 font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black">
                          <FileText size={14} className="text-zinc-400" /> Tajuk Laporan / Tugasan
                        </label>
                        <input
                          required
                          autoFocus
                          className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-sm outline-none focus:shadow-neo-sm focus:-translate-y-0.5 transition-all dark:text-white text-black text-black"
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="cth: Reka bentuk UI Dashboard fasa 2..."
                        />
                      </div>

                      <div className="space-y-2 text-black text-black text-black">
                        <label className="flex items-center gap-2 font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black">
                          <Filter size={14} className="text-zinc-400" /> Jenis Laporan
                        </label>
                        <div className="flex gap-2 text-black text-black">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'project' })}
                            className={`flex-1 py-2.5 rounded-lg border-2 font-bold text-[10px] uppercase tracking-wider transition-all text-black ${formData.type === 'project' ? 'bg-blue-500 text-white border-black shadow-neo-sm -translate-y-0.5 text-black' : 'bg-zinc-50 text-zinc-400 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 text-black'}`}
                          >
                            Projek Utama
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'task' })}
                            className={`flex-1 py-2.5 rounded-lg border-2 font-bold text-[10px] uppercase tracking-wider transition-all text-black ${formData.type === 'task' ? 'bg-orange-500 text-white border-black shadow-neo-sm -translate-y-0.5 text-black' : 'bg-zinc-50 text-zinc-400 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 text-black'}`}
                          >
                            Tugasan Ad-hoc
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-black text-black">
                        <label className="flex items-center gap-2 font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black">
                          <MapPin size={14} className="text-zinc-400" /> Lokasi Bekerja
                        </label>
                        <div className="flex flex-wrap gap-2 text-black">
                          {['Office', 'WFH', 'Lapangan', 'Remote'].map((loc) => (
                            <label key={loc} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border-2 transition-all ${formData.working_location === loc ? 'border-black bg-neo-yellow dark:border-white shadow-neo-sm -translate-y-0.5' : 'border-zinc-100 bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                              <input type="radio" value={loc} checked={formData.working_location === loc} onChange={() => setFormData({ ...formData, working_location: loc as any })} className="hidden" />
                              <span className={`font-bold text-[10px] uppercase ${formData.working_location === loc ? 'text-black' : 'text-black dark:text-white'}`}>{loc}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: MASA & PROGRES */}
                  <div className="space-y-6 text-black text-black text-black text-black">
                    <div className="flex items-center justify-between border-b-2 border-zinc-100 dark:border-zinc-800 pb-3 text-black text-black">
                      <div className="flex items-center gap-3 text-black text-black">
                        <div className="p-2 bg-neo-primary/10 rounded-lg">
                          <Calendar size={20} className="text-neo-primary" />
                        </div>
                        <div className="text-black">
                          <h4 className="font-black text-sm uppercase tracking-widest dark:text-white text-black">Masa & Progres</h4>
                          <p className="text-[10px] font-medium text-zinc-400 uppercase text-black">Tempoh masa dan status semasa</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-black">
                      <div className="space-y-2 text-black">
                        <label className="flex items-center gap-2 font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black">Tarikh Mula</label>
                        <input
                          type="date"
                          className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-sm outline-none focus:shadow-neo-sm transition-all dark:text-white text-black text-black text-black text-black"
                          value={formData.start_date}
                          onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 text-black">
                        <label className="flex items-center gap-2 font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black">Sasaran Siap</label>
                        <input
                          type="date"
                          className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-sm outline-none focus:shadow-neo-sm transition-all dark:text-white text-black text-black text-black text-black text-black"
                          value={formData.end_date}
                          onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 text-black">
                        <label className="flex items-center gap-2 font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black text-black">Status</label>
                        <div className="relative text-black">
                          <select
                            className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-sm outline-none appearance-none cursor-pointer focus:shadow-neo-sm transition-all dark:text-white text-black text-black"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                            <option value="Blocked">Blocked</option>
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-3.5 pointer-events-none text-zinc-400 text-black text-black" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: HASIL & LAMPIRAN */}
                  <div className="space-y-6 text-black text-black text-black text-black">
                    <div className="flex items-center justify-between border-b-2 border-zinc-100 dark:border-zinc-800 pb-3 text-black text-black text-black">
                      <div className="flex items-center gap-3 text-black">
                        <div className="p-2 bg-neo-primary/10 rounded-lg text-black text-black text-black">
                          <Rocket size={20} className="text-neo-primary text-black" />
                        </div>
                        <div className="text-black">
                          <h4 className="font-black text-sm uppercase tracking-widest dark:text-white text-black text-black">Hasil & Lampiran</h4>
                          <p className="text-[10px] font-medium text-zinc-400 uppercase text-black text-black">Impak kerja dan fail rujukan</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 text-black text-black text-black">
                      <div className="space-y-2 text-black">
                        <label className="font-black text-xs uppercase tracking-wide ml-1 flex items-center gap-2 dark:text-white text-black text-black">
                          <CheckCircle2 size={14} className="text-green-500 text-black text-black" /> Hasil / Outcome (Hasil Kerja)
                        </label>
                        <textarea
                          required
                          className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-4 font-medium text-sm outline-none h-32 resize-none focus:shadow-neo-sm focus:-translate-y-0.5 transition-all dark:text-white scrollbar-hide text-black text-black text-black"
                          value={formData.outcome}
                          onChange={e => setFormData({ ...formData, outcome: e.target.value })}
                          placeholder="Terangkan secara ringkas apa yang telah disiapkan..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black text-black text-black">
                        <div className="space-y-2 text-black">
                          <label className="font-black text-xs uppercase tracking-wide ml-1 text-red-600 dark:text-red-400 flex items-center gap-1.5 text-black">
                            <AlertCircle size={14} /> Isu / Halangan
                          </label>
                          <textarea
                            className="w-full bg-red-50/50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/40 rounded-lg p-4 font-medium text-sm outline-none h-24 resize-none focus:border-red-500 transition-all dark:text-red-100 dark:placeholder:text-red-200/50 text-black text-black"
                            value={formData.issues}
                            onChange={e => setFormData({ ...formData, issues: e.target.value })}
                            placeholder="Ada sebarang masalah?"
                          />
                        </div>
                        <div className="space-y-2 text-black">
                          <label className="font-black text-xs uppercase tracking-wide ml-1 text-green-700 dark:text-green-400 flex items-center gap-1.5 text-black">
                            <Rocket size={14} /> Tindakan Seterusnya
                          </label>
                          <textarea
                            className="w-full bg-green-50/50 dark:bg-green-900/10 border-2 border-green-100 dark:border-green-900/40 rounded-lg p-4 font-medium text-sm outline-none h-24 resize-none focus:border-green-500 transition-all dark:text-green-100 dark:placeholder:text-green-200/50 text-black text-black"
                            value={formData.next_action}
                            onChange={e => setFormData({ ...formData, next_action: e.target.value })}
                            placeholder="Apa plan seterusnya?"
                          />
                        </div>
                      </div>

                      {/* LAMPIRAN FIELDS */}
                      <div className="bg-neo-yellow/10 border-2 border-neo-yellow/30 p-4 rounded-xl mb-2 text-black text-black">
                        <p className="text-[10px] font-black uppercase text-neo-primary flex items-center gap-2 text-black">
                          <AlertCircle size={14} /> Nota Penting: Penjimatan Ruang
                        </p>
                        <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase leading-relaxed text-black text-black">
                          Sangat disarankan untuk menggunakan <span className="text-black dark:text-white underline text-black">Google Drive, Canva, atau Figma</span> dan letak <span className="text-black dark:text-white underline text-black">Pautan (Link)</span> sahaja bagi menjimatkan ruang simpanan sistem.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-zinc-100 dark:border-zinc-800 text-black text-black">
                        <div className="space-y-2 text-black text-black">
                          <label className="flex items-center gap-2 font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black">
                            <Paperclip size={14} className="text-zinc-400 text-black" /> Upload File
                          </label>
                          <div className="relative group text-black">
                            <input
                              type="file"
                              className="hidden text-black"
                              id="report-file"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setFile(e.target.files[0])
                                  setFormData({ ...formData, attachment_url: '' })
                                }
                              }}
                            />
                            <label
                              htmlFor="report-file"
                              className="flex items-center justify-center gap-3 w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-black dark:border-zinc-700 py-6 rounded-xl cursor-pointer group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700 transition-all text-black text-black"
                            >
                              {file ? (
                                <div className="flex flex-col items-center gap-1 text-black">
                                  <CheckCircle2 size={24} className="text-green-500 text-black" />
                                  <span className="text-[10px] font-black uppercase text-zinc-500 max-w-[150px] truncate text-black">{file.name}</span>
                                  <button type="button" onClick={(e) => { e.preventDefault(); setFile(null); }} className="text-[8px] font-bold text-red-500 uppercase hover:underline text-black">Padam</button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-black text-black">
                                  <PlusCircle size={24} className="text-zinc-300 text-black" />
                                  <span className="text-[10px] font-black uppercase text-zinc-400 text-black text-black">Pilih File...</span>
                                </div>
                              )}
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2 text-black text-black">
                          <label className="flex items-center gap-2 font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black">
                            <Link size={14} className="text-zinc-400 text-black text-black" /> Ataupun Letak Link
                          </label>
                          <div className="relative text-black">
                            <input
                              className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg pl-3 pr-3 py-3 font-bold text-sm outline-none focus:shadow-neo-sm transition-all dark:text-white text-black text-black text-black"
                              placeholder="https://..."
                              value={formData.attachment_url}
                              disabled={!!file}
                              onChange={e => setFormData({ ...formData, attachment_url: e.target.value, attachment_name: e.target.value ? 'Link' : '' })}
                            />
                          </div>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase italic px-1 text-black">Drive, Figma, YouTube, dll.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t-4 border-black/10 dark:border-white/10 text-black">
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="bg-neo-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white border-2 border-black dark:border-white font-black uppercase tracking-wide px-8 py-3.5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2 text-black"
                    >
                      {isUploading ? (
                        <><RefreshCw size={18} className="animate-spin text-black" /> Sedang Menyimpan...</>
                      ) : (
                        <><Save size={18} className="text-black" /> Simpan Laporan</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* LIST AREA */}
            <div ref={listRef} className="flex flex-col gap-6 text-black text-black">
              {/* List Header - HIDDEN ON PRINT */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black dark:border-white pb-3 print:hidden text-black">
                <div className="flex items-center gap-3 text-black">
                  <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter dark:text-white text-black text-black">Timeline Laporan</h2>
                  <div className="bg-black text-neo-yellow border-2 border-black dark:border-white px-3 py-1 font-black shadow-neo text-xs sm:text-sm transform -rotate-1 text-black">
                    {reports.length} ITEMS
                  </div>
                </div>

                {userRole === 'admin' && (
                  <div className="relative group w-full sm:w-64 text-black text-black text-black">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-black dark:text-white">
                      <Filter size={14} className="text-black dark:text-white" />
                    </div>
                    <select
                      className="appearance-none w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 pl-10 pr-10 py-2.5 font-bold text-xs uppercase rounded-lg cursor-pointer hover:bg-neo-yellow transition-colors outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:text-white text-black text-black text-black text-black text-black"
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                    >
                      <option value="all">Semua Staff</option>
                      <option disabled>----------------</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>{staff.full_name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-black dark:text-white">
                      <ChevronDown size={14} className="text-black dark:text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs Filtering - HIDDEN ON PRINT */}
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full sm:w-fit border-2 border-black dark:border-white shadow-neo-sm print:hidden overflow-x-auto scrollbar-hide text-black">
                <button
                  onClick={() => setReportTypeTab('all')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all text-black ${reportTypeTab === 'all' ? 'bg-black text-white dark:bg-white dark:text-black shadow-neo-sm text-black' : 'text-zinc-500 hover:text-black dark:hover:text-white text-black'}`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setReportTypeTab('project')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all text-black ${reportTypeTab === 'project' ? 'bg-blue-500 text-white shadow-neo-sm border-2 border-black text-black' : 'text-zinc-500 hover:text-blue-500 text-black'}`}
                >
                  Projek
                </button>
                <button
                  onClick={() => setReportTypeTab('task')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all text-black ${reportTypeTab === 'task' ? 'bg-orange-500 text-white shadow-neo-sm border-2 border-black text-black' : 'text-zinc-500 hover:text-orange-500 text-black text-black'}`}
                >
                  Ad-hoc
                </button>
              </div>

              {/* View Switcher - HIDDEN ON PRINT */}
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full sm:w-fit border-2 border-black dark:border-white shadow-neo-sm mt-2 print:hidden overflow-x-auto scrollbar-hide text-black text-black">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all text-black ${viewMode === 'list' ? 'bg-black text-white dark:bg-white dark:text-black shadow-neo-sm text-black' : 'text-zinc-500 hover:text-black dark:hover:text-white text-black'}`}
                >
                  <LayoutList size={14} className="text-black" /> Senarai
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all text-black ${viewMode === 'board' ? 'bg-black text-white dark:bg-white dark:text-black shadow-neo-sm text-black' : 'text-zinc-500 hover:text-black dark:hover:text-white text-black'}`}
                >
                  <LayoutGrid size={14} className="text-black" /> Papan (Board)
                </button>
              </div>

              {/* PRINT ONLY: STRUCTURED REPORT LAYOUT */}
              <div className="hidden print:block space-y-10 text-black text-black">
                {/* 1. SECTION: TASKS/PROJECTS */}
                <div className="space-y-6 text-black text-black">
                  <h2 className="text-2xl font-black uppercase border-b-4 border-black pb-2 mb-6 text-black text-black">BAHAGIAN 1: LAPORAN TUGASAN</h2>
                  {filteredReports.length === 0 ? (
                    <p className="text-zinc-400 italic text-black">Tiada laporan tugasan.</p>
                  ) : (
                    filteredReports.map((report) => (
                      <div key={'print-' + report.id} className="border-b border-zinc-200 pb-6 last:border-0 page-break-inside-avoid text-black text-black">
                        <div className="flex justify-between items-start mb-3 text-black">
                          <div className="text-black">
                            <div className="flex items-center gap-2 mb-1 text-black text-black">
                              <span className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5 rounded text-black text-black">
                                {report.type}
                              </span>
                              <span className="text-[9px] font-bold text-zinc-400 text-black">#{report.id}</span>
                            </div>
                            <h3 className="text-lg font-black uppercase text-black leading-tight text-black text-black text-black">{report.title}</h3>
                          </div>
                          <div className="text-right flex flex-col items-end text-black text-black">
                            <span className="text-[10px] font-black text-black text-black">
                              {report.start_date ? new Date(report.start_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(report.task_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight text-black">{report.working_location}</span>
                            <span className="text-[9px] font-black text-neo-primary uppercase text-black">Status: {report.status}</span>
                          </div>
                        </div>

                        <div className="space-y-3 text-black text-black">
                          <div className="text-black text-black">
                            <h4 className="text-[9px] font-black uppercase text-zinc-400 tracking-widest text-black text-black">Outcome:</h4>
                            <p className="text-[11px] text-black leading-relaxed whitespace-pre-wrap text-black text-black">{report.outcome}</p>
                          </div>
                          {(report.issues || report.next_action) && (
                            <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-2 rounded border border-zinc-100 text-black text-black">
                              {report.issues && (
                                <div className="text-black">
                                  <h4 className="text-[8px] font-black uppercase text-red-500 tracking-tighter text-black">Isu:</h4>
                                  <p className="text-[10px] text-red-900 leading-tight italic text-black">{report.issues}</p>
                                </div>
                              )}
                              {report.next_action && (
                                <div className="text-black">
                                  <h4 className="text-[8px] font-black uppercase text-green-600 tracking-tighter text-black">Plan:</h4>
                                  <p className="text-[10px] text-green-900 leading-tight text-black">{report.next_action}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 2. SECTION: ISSUES (MANUAL) */}
                {notes.some(n => n.type === 'issue') && (
                  <div className="space-y-6 mt-12 page-break-before-always text-black text-black">
                    <h2 className="text-2xl font-black uppercase border-b-4 border-black pb-2 mb-6 text-red-600 text-black">BAHAGIAN 2: RUMUSAN ISU & HALANGAN</h2>
                    <div className="grid grid-cols-1 gap-4 text-black text-black">
                      {notes.filter(n => n.type === 'issue').map((note) => (
                        <div key={'print-note-' + note.id} className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm text-black text-black">
                          <p className="text-xs font-black text-red-800 uppercase mb-1 text-black">ISU #{note.id}</p>
                          <p className="text-sm text-red-950 font-medium leading-relaxed text-black text-black">{note.content}</p>
                          <p className="text-[9px] text-red-400 mt-2 font-bold uppercase text-black">{new Date(note.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. SECTION: SUGGESTIONS (MANUAL) */}
                {notes.some(n => n.type === 'suggestion') && (
                  <div className="space-y-6 mt-12 text-black text-black text-black text-black">
                    <h2 className="text-2xl font-black uppercase border-b-4 border-black pb-2 mb-6 text-green-600 text-black text-black">BAHAGIAN 3: CADANGAN & PENAMBAHBAIKAN</h2>
                    <div className="grid grid-cols-1 gap-4 text-black text-black text-black">
                      {notes.filter(n => n.type === 'suggestion').map((note) => (
                        <div key={'print-note-' + note.id} className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm text-black text-black text-black text-black">
                          <p className="text-xs font-black text-green-800 uppercase mb-1 text-black text-black">CADANGAN #{note.id}</p>
                          <p className="text-sm text-green-950 font-medium leading-relaxed text-black text-black text-black text-black">{note.content}</p>
                          <p className="text-[9px] text-green-400 mt-2 font-bold uppercase text-black text-black">{new Date(note.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-20 pt-8 border-t-2 border-black flex justify-between items-end text-black text-black">
                  <div className="flex flex-col gap-10 text-black text-black">
                    <div className="w-48 border-b border-black text-black text-black"></div>
                    <p className="text-[10px] font-black uppercase text-black text-black">Tandatangan Pegawai</p>
                  </div>
                  <div className="text-right text-black text-black text-black">
                    <p className="text-[9px] font-medium text-zinc-300 italic text-black text-black text-black">Vibrant Staff System — Auto Generated Report</p>
                  </div>
                </div>
              </div>

              {/* SCREEN ONLY VIEWS */}
              <div className="print:hidden text-black text-black">
                {filteredReports.length === 0 ? (
                  <div className="bg-zinc-100 dark:bg-zinc-900 border-4 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl py-20 text-center flex flex-col items-center justify-center opacity-70 text-black">
                    <ClipboardList size={64} className="mb-4 text-zinc-400 dark:text-zinc-600 text-black text-black" />
                    <p className="font-black text-xl text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-black text-black text-black text-black">Tiada rekod dijumpai.</p>
                    <p className="font-bold text-sm text-zinc-400 dark:text-zinc-600 mt-2 text-black text-black text-black text-black text-black text-black">Sila pilih kategori lain atau tambah rekod baru.</p>
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-white rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[255,255,255,0.5)] text-black text-black text-black">
                    {filteredReports.map((report, index) => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`group flex flex-col sm:flex-row items-start gap-2 py-2 sm:py-3 px-3 sm:px-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-black ${index !== filteredReports.length - 1 ? 'border-b border-zinc-200 dark:border-zinc-700 text-black text-black' : 'text-black text-black text-black'}`}
                      >
                        {/* 1. Avatar (Desktop Only) */}
                        <div className="hidden sm:flex shrink-0 mt-1 text-black text-black">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-black bg-zinc-100 overflow-hidden flex items-center justify-center shadow-neo-sm text-black text-black text-black">
                            {(Array.isArray(report.profiles) ? report.profiles[0]?.avatar_url : report.profiles?.avatar_url) ? (
                              <img src={Array.isArray(report.profiles) ? report.profiles[0].avatar_url : report.profiles?.avatar_url} alt="Staff" className="w-full h-full object-cover text-black text-black text-black" />
                            ) : (
                              <User size={14} className="text-zinc-400 text-black text-black text-black" />
                            )}
                          </div>
                        </div>

                        {/* 2. ID & Date Section (Desktop Only) */}
                        <div className="hidden sm:flex sm:w-[65px] text-right flex-col justify-between items-end shrink-0 sm:mt-1 gap-0.5 text-black text-black">
                          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 text-black text-black">
                            #{report.id}
                          </span>
                          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider leading-none text-black text-black text-black text-black">
                            {report.start_date ? new Date(report.start_date).toLocaleDateString('default', { day: '2-digit', month: 'short' }) : report.task_date ? new Date(report.task_date).toLocaleDateString('default', { day: '2-digit', month: 'short' }) : '--'}
                          </span>
                        </div>

                        {/* 3. Content Area */}
                        <div className="flex-grow min-w-0 text-black text-black text-black">
                          {/* Title & Badge */}
                          <div className="flex items-start gap-1.5 mb-1 text-black text-black">
                            <span className={`shrink-0 mt-0.5 px-2.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase border border-black text-black ${report.type === 'task' ? 'bg-orange-400 text-black text-black' : 'bg-blue-400 text-black text-black'}`}>
                              {report.type === 'task' ? 'AD-HOC' : 'PROJEK'}
                            </span>
                            <h3 className="flex-grow font-black text-sm uppercase leading-tight dark:text-white break-words pt-0.5 text-black text-black text-black text-black">
                              {report.title}
                            </h3>
                          </div>

                          {/* Meta Information Row */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1 px-0.5 text-black text-black text-black">
                            <span className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700/50 text-black text-black">
                              <MapPin size={8} className="text-neo-primary text-black text-black" /> {report.working_location || 'Office'}
                            </span>
                            <span className={`text-[8px] font-black uppercase tracking-tight px-2.5 py-0.5 rounded border text-black ${report.status === 'Done' ? 'bg-green-100 text-green-700 border-green-200 text-black' : report.status === 'Blocked' ? 'bg-red-100 text-red-700 border-red-200 text-black' : 'bg-yellow-100 text-yellow-700 border-yellow-200 text-black text-black text-black'}`}>
                              {report.status}
                            </span>
                            {/* Icons only for verified/attachment to save space */}
                            {(() => {
                              const req = findApprovedRequest(report.user_id, report.task_date || report.start_date, report.working_location);
                              if (req) {
                                return (
                                  <span
                                    onMouseEnter={() => setTooltipData({ text: 'Lokasi kerja telah dibenarkan.', reason: req.reason })}
                                    onMouseLeave={() => setTooltipData(null)}
                                    onMouseMove={(e) => {
                                      if (tooltipRef.current) {
                                        const x = e.clientX + 15;
                                        const y = e.clientY + 15;
                                        // Basic overflow protection
                                        const isRightOverflow = x + 200 > window.innerWidth;
                                        tooltipRef.current.style.left = isRightOverflow ? `${e.clientX - 215}px` : `${x}px`;
                                        tooltipRef.current.style.top = `${y}px`;
                                      }
                                    }}
                                    className="flex items-center gap-1 text-[7px] font-black uppercase bg-green-500 text-white px-2 py-0.5 rounded-full border border-black/10 animate-pulse shadow-neo-sm cursor-help select-none"
                                  >
                                    <ShieldCheck size={10} className="text-black" /> VERIFIED
                                  </span>
                                )
                              }
                              return null;
                            })()}
                            {report.attachment_url && <Paperclip size={10} className="text-neo-primary text-black text-black" />}
                          </div>

                          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap break-words leading-relaxed px-0.5 text-black text-black text-black text-black">
                            {report.outcome}
                          </p>
                        </div>

                        {/* Actions & Mobile Metadata */}
                        <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-zinc-100 dark:border-zinc-800 sm:border-0 text-black text-black">
                          {/* Mobile Only: Avatar + Date + ID */}
                          <div className="sm:hidden flex items-center gap-2 text-black text-black">
                            <div className="w-5 h-5 rounded-full border border-black bg-zinc-100 overflow-hidden shrink-0 text-black text-black">
                              {(Array.isArray(report.profiles) ? report.profiles[0]?.avatar_url : report.profiles?.avatar_url) ? (
                                <img src={Array.isArray(report.profiles) ? report.profiles[0].avatar_url : report.profiles?.avatar_url} alt="Staff" className="w-full h-full object-cover text-black text-black" />
                              ) : (
                                <User size={8} className="text-zinc-400 m-auto text-black text-black" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter text-black text-black text-black">
                              <span>#{report.id}</span>
                              <span className="text-zinc-300 dark:text-zinc-700 text-black text-black text-black">•</span>
                              <span>{report.start_date ? new Date(report.start_date).toLocaleDateString('default', { day: '2-digit', month: 'short' }) : report.task_date ? new Date(report.task_date).toLocaleDateString('default', { day: '2-digit', month: 'short' }) : '--'}</span>
                            </div>
                          </div>

                          <div className="flex gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-black text-black">
                            {(userRole === 'admin' || report.user_id === userId) && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleEditReport(report); }} className="p-1 px-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 sm:border-0" title="Edit"><Edit3 size={12} className="text-zinc-500 dark:text-zinc-400" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }} className="p-1 px-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-300 hover:text-red-500 border border-zinc-200 dark:border-zinc-700 sm:border-0" title="Padam"><Trash2 size={12} className="text-red-400 dark:text-red-400" /></button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* BOARD VIEW (TRELLO STYLE) */
                  <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-6 scrollbar-hide min-h-[500px] text-black text-black text-black">
                    {['In Progress', 'Done', 'Blocked'].map((status) => {
                      const statusReports = filteredReports.filter(r => r.status === status)
                      return (
                        <div key={status} className="flex-1 min-w-[300px] flex flex-col gap-4 text-black text-black">
                          {/* Column Header */}
                          <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border-2 border-black dark:border-white p-3 rounded-lg shadow-neo-sm text-black text-black text-black text-black text-black text-black">
                            <div className="flex items-center gap-2 text-black text-black">
                              <span className={`w-3 h-3 rounded-full border border-black text-black text-black ${status === 'Done' ? 'bg-green-400' : status === 'Blocked' ? 'bg-red-400' : 'bg-yellow-400 text-black text-black'}`}></span>
                              <h4 className="font-black text-xs uppercase tracking-widest dark:text-white text-black text-black text-black">{status}</h4>
                            </div>
                            <span className="font-bold text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 dark:text-white text-black text-black text-black text-black">{statusReports.length}</span>
                          </div>

                          {/* Column Cards */}
                          <div className="flex flex-col gap-3 min-h-[100px] text-black text-black text-black">
                            {statusReports.map((report) => (
                              <div
                                key={report.id}
                                onClick={() => setSelectedReport(report)}
                                className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 p-4 rounded-xl shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer group relative overflow-hidden text-black text-black text-black text-black text-black"
                              >
                                {/* Type Tag Overlay */}
                                <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black uppercase border-b-2 border-l-2 border-black flex items-center gap-1 text-black text-black ${report.type === 'task' ? 'bg-orange-400 text-black text-black' : 'bg-blue-400 text-black text-black text-black text-black'}`}>
                                  {report.type}
                                </div>

                                <div className="flex items-start gap-3 mb-3 text-black text-black text-black">
                                  <div className="w-8 h-8 rounded-full border-2 border-black overflow-hidden shrink-0 shadow-neo-sm text-black text-black text-black text-black">
                                    {(Array.isArray(report.profiles) ? report.profiles[0]?.avatar_url : report.profiles?.avatar_url) ? (
                                      <img src={Array.isArray(report.profiles) ? report.profiles[0].avatar_url : report.profiles?.avatar_url} alt="Staff" className="w-full h-full object-cover text-black text-black text-black text-black text-black" />
                                    ) : (
                                      <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-black text-black text-black text-black text-black"><User size={14} className="text-zinc-400 text-black text-black text-black" /></div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-grow text-black text-black text-black text-black text-black">
                                    <h5 className="font-black text-xs uppercase dark:text-white leading-tight break-words pr-6 text-black text-black text-black text-black text-black">{report.title}</h5>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-black text-black text-black text-black">
                                      <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-black text-black">
                                        <MapPin size={8} className="text-neo-primary text-black text-black" /> {report.working_location || 'Office'}
                                      </span>
                                      <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-black text-black">
                                        <User size={8} className="text-blue-500 text-black text-black" /> {Array.isArray(report.profiles) ? report.profiles[0]?.full_name?.split(' ')[0] : report.profiles?.full_name?.split(' ')[0] || 'Staff'}
                                      </span>
                                      {(() => {
                                        const approvedReq = findApprovedRequest(report.user_id, report.task_date || report.start_date, report.working_location);
                                        if (approvedReq) {
                                          return (
                                            <span
                                              onMouseEnter={() => setTooltipData({ text: 'Lokasi kerja telah dibenarkan.', reason: approvedReq.reason })}
                                              onMouseLeave={() => setTooltipData(null)}
                                              onMouseMove={(e) => {
                                                if (tooltipRef.current) {
                                                  const x = e.clientX + 15;
                                                  const y = e.clientY + 15;
                                                  const isRightOverflow = x + 150 > window.innerWidth;
                                                  tooltipRef.current.style.left = isRightOverflow ? `${e.clientX - 165}px` : `${x}px`;
                                                  tooltipRef.current.style.top = `${y}px`;
                                                }
                                              }}
                                              className="flex items-center gap-1 text-[7px] font-black uppercase bg-green-500 text-white px-1.5 py-0.5 rounded-full animate-pulse border border-black/10 cursor-help select-none"
                                            >
                                              <ShieldCheck size={8} className="text-black" /> Verified
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                      {report.attachment_url && (
                                        <span className="flex items-center gap-1 text-[7px] font-black uppercase bg-neo-yellow text-black px-1.5 py-0.5 rounded-full border border-black shadow-neo-sm text-black text-black">
                                          <Paperclip size={8} className="text-black text-black" /> {report.attachment_name === 'Link' ? 'LINK' : 'FILE'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300 line-clamp-3 mb-4 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700/50 text-black text-black text-black text-black text-black">
                                  {report.outcome}
                                </p>

                                <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-700 pt-3 text-black text-black text-black text-black">
                                  <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-black text-black text-black">
                                    <Calendar size={12} className="text-black text-black" />
                                    <span className="text-[9px] font-black uppercase text-black text-black text-black text-black">{report.start_date ? new Date(report.start_date).toLocaleDateString('default', { day: '2-digit', month: 'short' }) : 'No Date'}</span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-black text-black">
                                    {(userRole === 'admin' || report.user_id === userId) && (
                                      <>
                                        <button onClick={(e) => { e.stopPropagation(); handleEditReport(report); }} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 dark:text-zinc-400"><Edit3 size={12} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-300 hover:text-red-500"><Trash2 size={12} /></button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* SUMMARY SECTION (ISSUES & SUGGESTIONS) - HIDDEN ON PRINT */}
              <div className="mt-8 print:hidden text-black text-black">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-2 border-b-2 border-black dark:border-white text-black text-black text-black">
                  <div className="flex items-center gap-3 text-black text-black text-black">
                    <span className="bg-neo-primary text-white p-1.5 border border-black shadow-neo-sm text-black text-black">
                      <AlertCircle size={16} className="text-black text-black" />
                    </span>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter dark:text-white text-black text-black text-black text-black text-black text-black text-black">Rumusan Isu & Cadangan</h2>
                  </div>
                  <button
                    onClick={() => openNoteModal()}
                    className="bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black text-[10px] font-black uppercase px-4 py-2 rounded-lg shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-2 text-black text-black text-black text-black text-black text-black"
                  >
                    <PlusCircle size={14} className="text-black text-black" /> Tambah Manual
                  </button>
                </div>

                <div className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-white rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[255,255,255,0.5] text-black text-black text-black text-black text-black">
                  {/* ISSUES SUBSECTION */}
                  {(notes.some(n => n.type === 'issue') || reports.some(r => r.issues)) && (
                    <>
                      <div className="border-b-4 border-black bg-red-50/30 p-3 text-black text-black">
                        <h3 className="font-black text-xs uppercase tracking-widest text-red-600 flex items-center gap-2 text-black text-black text-black text-black text-black">
                          <AlertCircle size={14} className="text-black text-black" /> Bahagian 1: Isu & Masalah
                        </h3>
                      </div>

                      {/* 1. Mapped Report Issues */}
                      {reports.filter(r => r.issues).map((report) => (
                        <div key={'summary-issue-' + report.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 text-black text-black text-black text-black text-black text-black text-black text-black">
                          <div className="w-full sm:w-auto min-w-[80px] sm:text-right shrink-0 text-black text-black text-black">
                            <div className="text-xs font-black text-zinc-400 uppercase tracking-wider text-black text-black text-black text-black">#{report.id}</div>
                          </div>
                          <div className="flex-grow min-w-0 text-black text-black text-black">
                            <h4 className="font-black text-xs uppercase text-zinc-500 mb-1 text-black text-black text-black text-black text-black">Berkenaan: {report.title}</h4>
                            <p className="text-sm font-medium text-red-700 leading-relaxed italic text-black text-black text-black text-black text-black">{report.issues}</p>
                          </div>
                        </div>
                      ))}
                      {/* 2. Manual Issues */}
                      {notes.filter(n => n.type === 'issue').map((note) => (
                        <div key={'note-issue-' + note.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 text-black text-black text-black text-black text-black text-black text-black">
                          <div className="w-full sm:w-auto min-w-[80px] sm:text-right shrink-0 text-black text-black text-black text-black text-black">
                            <div className="text-xs font-black text-zinc-400 uppercase tracking-wider text-black text-black text-black text-black text-black text-black">MANUAL</div>
                          </div>
                          <div className="flex-grow min-w-0 text-black text-black text-black">
                            <p className="text-sm font-medium text-red-700 leading-relaxed italic text-black text-black text-black text-black text-black text-black">{note.content}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openNoteModal(note)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 dark:text-zinc-400"><Edit3 size={14} /></button>
                            <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-400 dark:text-red-400"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* SUGGESTIONS SUBSECTION */}
                  {(notes.some(n => n.type === 'suggestion') || reports.some(r => r.next_action)) && (
                    <>
                      <div className="border-y-4 border-black bg-green-50/30 p-3 text-black text-black text-black text-black text-black">
                        <h3 className="font-black text-xs uppercase tracking-widest text-green-600 flex items-center gap-2 text-black text-black text-black text-black text-black text-black">
                          <Rocket size={14} className="text-black text-black" /> Bahagian 2: Cadangan & Penambahbaikan
                        </h3>
                      </div>

                      {/* 1. Mapped Report Suggestions */}
                      {reports.filter(r => r.next_action).map((report) => (
                        <div key={'summary-suggest-' + report.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 text-black text-black text-black text-black text-black text-black text-black text-black text-black">
                          <div className="w-full sm:w-auto min-w-[80px] sm:text-right shrink-0 text-black text-black text-black text-black">
                            <div className="text-xs font-black text-zinc-400 uppercase tracking-wider text-black text-black text-black text-black text-black">#{report.id}</div>
                          </div>
                          <div className="flex-grow min-w-0 text-black text-black text-black text-black">
                            <h4 className="font-black text-xs uppercase text-zinc-500 mb-1 text-black text-black text-black text-black text-black text-black">Plan: {report.title}</h4>
                            <p className="text-sm font-medium text-green-700 leading-relaxed text-black text-black text-black text-black text-black text-black text-black">{report.next_action}</p>
                          </div>
                        </div>
                      ))}
                      {/* 2. Manual Suggestions */}
                      {notes.filter(n => n.type === 'suggestion').map((note) => (
                        <div key={'note-suggest-' + note.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 text-black text-black text-black text-black text-black text-black text-black text-black">
                          <div className="w-full sm:w-auto min-w-[80px] sm:text-right shrink-0 text-black text-black text-black text-black">
                            <div className="text-xs font-black text-zinc-400 uppercase tracking-wider text-black text-black text-black text-black text-black text-black">MANUAL</div>
                          </div>
                          <div className="flex-grow min-w-0 text-black text-black text-black text-black">
                            <p className="text-sm font-medium text-green-700 leading-relaxed text-black text-black text-black text-black text-black text-black">{note.content}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openNoteModal(note)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 dark:text-zinc-400"><Edit3 size={14} /></button>
                            <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-400 dark:text-red-400"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {!notes.length && !reports.some(r => r.issues || r.next_action) && (
                    <p className="text-zinc-400 dark:text-zinc-600 font-bold text-center py-8 italic border-t-2 border-black/5 text-black">Tiada isu atau cadangan dilaporkan setakat ini.</p>
                  )}
                </div>
              </div>

              {/* DETAILED REPORT MODAL */}
              {selectedReport && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 text-black text-black text-black">
                  <div className="bg-white dark:bg-zinc-800 w-full max-w-2xl border-4 border-black dark:border-white rounded-2xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[255,255,255,0.4] overflow-hidden animate-in zoom-in-95 duration-300 text-black text-black text-black text-black text-black text-black">
                    {/* Modal Header */}
                    <div className={`p-6 border-b-4 border-black dark:border-white flex justify-between items-start gap-4 text-black text-black text-black ${selectedReport.status === 'Done' ? 'bg-green-400' : selectedReport.status === 'Blocked' ? 'bg-red-400' : 'bg-yellow-400 text-black text-black'}`}>
                      <div className="text-black text-black text-black">
                        <div className="flex items-center gap-2 mb-2 text-black text-black text-black text-black">
                          <span className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-black text-black text-black">
                            {selectedReport.type}
                          </span>
                          <span className="bg-white/50 text-black px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-black/10 text-black text-black text-black">ID: #{selectedReport.id}</span>
                        </div>
                        <h3 className="text-3xl font-black uppercase italic leading-none tracking-tighter text-black text-black text-black text-black text-black text-black">{selectedReport.title}</h3>
                      </div>
                      <button onClick={() => setSelectedReport(null)} className="bg-black text-white dark:bg-white dark:text-black p-2 rounded-lg hover:scale-110 active:scale-90 transition-transform"><X size={24} className="text-white dark:text-black" /></button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 md:p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar dark:text-white text-black text-black text-black text-black text-black">
                      {/* Meta Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-black text-black text-black text-black">
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border-2 border-black/5 dark:border-white/5 text-black text-black text-black">
                          <p className="text-[10px] font-black text-zinc-400 uppercase mb-1 text-black text-black text-black">Disediakan Oleh</p>
                          <div className="flex items-center gap-2 text-black text-black text-black text-black text-black text-black">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-black text-black text-black text-black text-black">
                              {(Array.isArray(selectedReport.profiles) ? selectedReport.profiles[0]?.avatar_url : selectedReport.profiles?.avatar_url) ? <img src={Array.isArray(selectedReport.profiles) ? selectedReport.profiles[0].avatar_url : selectedReport.profiles?.avatar_url} className="w-full h-full object-cover text-black text-black text-black text-black text-black" /> : <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-black text-black text-black text-black text-black"><User size={12} className="text-black text-black text-black" /></div>}
                            </div>
                            <span className="text-xs font-bold text-black dark:text-white">{Array.isArray(selectedReport.profiles) ? selectedReport.profiles[0]?.full_name : selectedReport.profiles?.full_name}</span>
                          </div>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border-2 border-black/5 dark:border-white/5 text-black text-black text-black">
                          <p className="text-[10px] font-black text-zinc-400 uppercase mb-1 text-black text-black text-black text-black">Status Semasa</p>
                          <span className="text-xs font-black uppercase text-black dark:text-white">{selectedReport.status}</span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border-2 border-black/5 dark:border-white/5 text-black text-black text-black text-black text-black">
                          <p className="text-[10px] font-black text-zinc-400 uppercase mb-1 text-black text-black text-black text-black text-black">Tarikh Mula</p>
                          <span className="text-xs font-black text-black dark:text-white">{selectedReport.start_date || selectedReport.task_date || '--'}</span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border-2 border-black/5 dark:border-white/5 text-black text-black text-black text-black text-black text-black">
                          <p className="text-[10px] font-black text-zinc-400 uppercase mb-1 text-black text-black text-black text-black text-black text-black">Sasaran Siap</p>
                          <span className="text-xs font-black text-black dark:text-white">{selectedReport.end_date || '--'}</span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border-2 border-black/5 dark:border-white/5 text-black text-black text-black text-black text-black text-black text-black">
                          <p className="text-[10px] font-black text-zinc-400 uppercase mb-1 text-black text-black text-black text-black">Lokasi</p>
                          <div className="flex items-center gap-1 text-xs font-black text-black dark:text-white">
                            <MapPin size={12} className="text-neo-primary" />
                            {selectedReport.working_location || 'Office'}
                          </div>
                        </div>
                      </div>

                      {/* Main Content Sections */}
                      <div className="space-y-6 text-black text-black text-black text-black text-black">
                        <div className="relative p-6 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl text-black text-black text-black">
                          <div className="absolute -top-3 left-4 bg-blue-500 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm text-black text-black text-black">Hasil / Outcome</div>
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-black dark:text-white">{selectedReport.outcome}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black text-black text-black text-black">
                          <div className="relative p-6 bg-red-50/50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 rounded-2xl text-black text-black text-black text-black">
                            <div className="absolute -top-3 left-4 bg-red-500 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm text-black text-black text-black">Isu / Halangan</div>
                            <p className="text-sm font-medium italic text-red-900 dark:text-red-200 text-black text-black text-black text-black text-black">{selectedReport.issues || 'Tiada isu dilaporkan.'}</p>
                          </div>
                          <div className="relative p-6 bg-green-50/50 dark:bg-green-900/10 border-2 border-green-100 dark:border-green-900/30 rounded-2xl text-black text-black text-black text-black">
                            <div className="absolute -top-3 left-4 bg-green-600 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm text-black text-black text-black text-black">Pelan Seterusnya</div>
                            <p className="text-sm font-medium text-green-900 dark:text-green-200 text-black text-black text-black text-black text-black">{selectedReport.next_action || 'Tiada pelan tindakan lanjut.'}</p>
                          </div>
                        </div>

                        {selectedReport.attachment_url && (
                          <div className="relative p-6 bg-zinc-50 dark:bg-zinc-800 border-4 border-black dark:border-white rounded-2xl shadow-neo-sm text-black text-black text-black text-black">
                            <div className="absolute -top-3 left-4 bg-black text-white dark:bg-white dark:text-black px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-black text-black text-black text-black text-black">Lampiran Fail / Pautan</div>
                            <div className="flex items-center justify-between gap-4 text-black text-black text-black text-black text-black text-black">
                              <div className="flex items-center gap-3 text-black text-black text-black">
                                <div className="p-3 bg-neo-yellow border-2 border-black rounded-xl text-black text-black text-black">
                                  {selectedReport.attachment_name === 'Link' ? <Link size={20} className="text-black" /> : <FileText size={20} className="text-black" />}
                                </div>
                                <div className="min-w-0 text-black text-black text-black text-black">
                                  <p className="text-xs font-black uppercase dark:text-white truncate text-black text-black text-black text-black">{selectedReport.attachment_name || 'Lampiran Kerja'}</p>
                                  <p className="text-[10px] font-bold text-zinc-400 truncate max-w-[200px] text-black text-black text-black text-black text-black">{selectedReport.attachment_url}</p>
                                </div>
                              </div>
                              <a
                                href={selectedReport.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-black text-white dark:bg-white dark:text-black px-5 py-2 rounded-lg font-black text-xs uppercase flex items-center gap-2 hover:translate-x-1 transition-transform text-black text-black text-black text-black text-black"
                              >
                                Buka <ExternalLink size={14} className="text-black text-black" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* COMMENTS SECTION */}
                      <div className="pt-6 border-t-2 border-zinc-100 dark:border-zinc-800 text-black text-black text-black text-black">
                        <div className="flex items-center gap-2 mb-4 text-black text-black text-black text-black text-black">
                          <MessageSquare size={18} className="text-neo-primary text-black text-black" />
                          <h4 className="font-black text-sm uppercase tracking-wider dark:text-white text-black text-black text-black text-black">Perbincangan / Komen</h4>
                        </div>

                        <div className="space-y-4 mb-6 text-black text-black text-black text-black text-black text-black text-black text-black">
                          {comments.length === 0 ? (
                            <p className="text-xs text-zinc-400 dark:text-zinc-600 italic py-4 text-center text-black text-black text-black text-black text-black">Tiada komen buat masa ini.</p>
                          ) : (
                            comments.map((comment) => (
                              <div key={comment.id} className="flex gap-3 text-black text-black text-black text-black">
                                <div className="w-8 h-8 rounded-full border border-black overflow-hidden shrink-0 text-black text-black text-black">
                                  {comment.profiles?.avatar_url ? (
                                    <img src={comment.profiles.avatar_url} className="w-full h-full object-cover text-black text-black text-black" />
                                  ) : (
                                    <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-black text-black text-black text-black text-black text-black"><User size={14} className="text-zinc-400 text-black text-black" /></div>
                                  )}
                                </div>
                                <div className="flex-grow text-black text-black text-black text-black text-black">
                                  <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700 text-black text-black text-black">
                                    <div className="flex items-center gap-2 text-black text-black text-black text-black text-black">
                                      <span className="text-[10px] font-black uppercase dark:text-white text-black text-black text-black text-black text-black text-black text-black">
                                        {comment.profiles && !Array.isArray(comment.profiles) ? comment.profiles.full_name : 'Staff'}
                                      </span>
                                      {userRole === 'admin' && (
                                        <button
                                          onClick={() => handleDeleteComment(comment.id)}
                                          className="text-red-400 hover:text-red-500 transition-colors p-0.5 text-black text-black text-black"
                                          title="Padam Komen"
                                        >
                                          <Trash2 size={10} className="text-black" />
                                        </button>
                                      )}
                                    </div>
                                    <span className="text-[8px] font-medium text-zinc-400 text-black text-black text-black">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-300 text-black text-black text-black">{comment.comment}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <form onSubmit={handleAddComment} className="relative text-black text-black text-black text-black">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Tulis komen atau beri maklum balas..."
                            className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-xl p-3 pr-12 text-xs font-medium outline-none focus:shadow-neo-sm transition-all dark:text-white text-black text-black text-black text-black text-black text-black text-black"
                          />
                          <button
                            type="submit"
                            disabled={!newComment.trim()}
                            className="absolute right-2 top-1.5 p-1.5 bg-neo-primary text-white rounded-lg border border-black disabled:opacity-50 transition-opacity text-black text-black text-black text-black text-black"
                          >
                            <Send size={16} className="text-black text-black text-black" />
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t-4 border-black dark:border-white flex justify-end gap-3 text-black text-black text-black text-black text-black">
                      {(userRole === 'admin' || selectedReport.user_id === userId) && (
                        <>
                          <button
                            onClick={() => { setSelectedReport(null); handleEditReport(selectedReport); }}
                            className="px-6 py-2.5 bg-white dark:bg-zinc-700 border-2 border-black dark:border-white rounded-lg font-black text-xs uppercase shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-black dark:text-white"
                          >
                            Edit Laporan
                          </button>
                          <button
                            onClick={() => { if (confirm('Padam?')) { handleDeleteReport(selectedReport.id); setSelectedReport(null); } }}
                            className="px-6 py-2.5 bg-red-500 text-white border-2 border-black rounded-lg font-black text-xs uppercase shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-black text-black text-black text-black text-black"
                          >
                            Padam
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* NOTE MODAL */}
              {showNoteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-black text-black text-black">
                  <div className="bg-white dark:bg-zinc-800 w-full max-w-md border-4 border-black dark:border-white rounded-xl shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] animate-in zoom-in-95 overflow-hidden text-black text-black text-black text-black text-black text-black text-black">
                    <div className="flex justify-between items-center p-4 border-b-4 border-black dark:border-white bg-neo-yellow text-black text-black text-black text-black text-black">
                      <h3 className="text-xl font-black uppercase italic tracking-tighter text-black text-black text-black text-black">{editingNote ? 'Kemaskini Nota' : 'Tambah Manual'}</h3>
                      <button onClick={() => setShowNoteModal(false)} className="bg-black/10 hover:bg-black hover:text-white p-1 rounded transition-colors text-black text-black text-black text-black text-black text-black text-black text-black text-black text-black"><X size={18} /></button>
                    </div>
                    <form onSubmit={handleSaveNote} className="p-6 space-y-4 text-black text-black text-black text-black text-black text-black text-black text-black">
                      <div className="space-y-2 text-black text-black text-black text-black text-black text-black text-black text-black text-black">
                        <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black text-black text-black text-black text-black text-black text-black text-black">Jenis Nota</label>
                        <div className="flex gap-4 text-black text-black text-black text-black text-black">
                          <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-black dark:has-[:checked]:border-white has-[:checked]:bg-red-50 dark:has-[:checked]:bg-red-900/20 flex-1 transition-all text-black text-black text-black text-black text-black text-black text-black text-black">
                            <input type="radio" name="noteType" value="issue" checked={noteForm.type === 'issue'} onChange={() => setNoteForm({ ...noteForm, type: 'issue' })} className="accent-red-500 w-4 h-4 text-black text-black text-black text-black text-black text-black text-black" />
                            <span className="font-bold text-xs uppercase dark:text-white text-black text-black text-black text-black text-black text-black text-black text-black">Isu / Masalah</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-black dark:has-[:checked]:border-white has-[:checked]:bg-green-50 dark:has-[:checked]:bg-green-900/20 flex-1 transition-all text-black text-black text-black text-black text-black text-black text-black text-black">
                            <input type="radio" name="noteType" value="suggestion" checked={noteForm.type === 'suggestion'} onChange={() => setNoteForm({ ...noteForm, type: 'suggestion' })} className="accent-green-500 w-4 h-4 text-black text-black text-black text-black text-black text-black text-black text-black" />
                            <span className="font-bold text-xs uppercase dark:text-white text-black text-black text-black text-black text-black text-black text-black text-black">Cadangan</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2 text-black text-black text-black text-black text-black text-black text-black text-black text-black">
                        <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white text-black text-black text-black text-black text-black text-black text-black text-black">Butiran</label>
                        <textarea
                          required
                          autoFocus
                          className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-sm outline-none h-32 resize-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[255,255,255,0.5] focus:-translate-y-1 transition-all dark:text-white text-black text-black text-black text-black text-black text-black text-black text-black"
                          placeholder="Tulis isu atau cadangan anda di sini..."
                          value={noteForm.content}
                          onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                        />
                      </div>
                      <div className="pt-2 text-black text-black text-black text-black text-black text-black text-black text-black">
                        <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-black uppercase py-3 rounded-lg hover:-translate-y-1 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-black text-black text-black text-black text-black text-black text-black text-black">
                          <Save size={16} className="text-black text-black" /> {editingNote ? 'Simpan Perubahan' : 'Tambah Nota'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* CUSTOM CURSOR TOOLTIP */}
      <div
        ref={tooltipRef}
        className={`fixed z-[9999] pointer-events-none transition-opacity duration-150 ${tooltipData ? 'opacity-100' : 'opacity-0'}`}
        style={{ left: 0, top: 0 }}
      >
        {tooltipData && (
          <div className="bg-black text-white p-3 rounded-lg shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] max-w-[200px] border border-white/20">
            <p className="text-[10px] font-bold leading-tight break-words text-white">{tooltipData.text}</p>
            {tooltipData.reason && (
              <p className="text-[9px] font-medium text-zinc-400 mt-1.5 pt-1.5 border-t border-zinc-700 italic leading-tight">
                "{tooltipData.reason}"
              </p>
            )}
          </div>
        )}
      </div>
    </div >
  )
}
