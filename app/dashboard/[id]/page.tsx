'use client'
import { useEffect, useState, use, useRef } from 'react' // Import 'use' for params handling in Next 15/14
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft, PlusCircle, Save, Calendar, CheckCircle2, AlertCircle, Rocket, X, FileText, ClipboardList, Edit3, Trash2, Printer, Share2 } from 'lucide-react'

// Types
type Report = { id: number; title: string; status: string; task_date: string; outcome: string; issues: string; next_action: string; user_id: string }
type Note = { id: number; project_id: number; type: 'issue' | 'suggestion'; content: string; created_at: string }

export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  // React.use() untuk unwrap params (Syntax baru Next.js)
  const resolvedParams = use(params)
  const projectId = resolvedParams.id



  const [projectName, setProjectName] = useState('')
  const [projectColor, setProjectColor] = useState('neo-yellow') // Default color
  const [reports, setReports] = useState<Report[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  // Form State
  const [showForm, setShowForm] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [formData, setFormData] = useState({
    title: '', status: 'In Progress', task_date: '', outcome: '', issues: '', next_action: ''
  })

  // Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [noteForm, setNoteForm] = useState({ type: 'issue', content: '' })

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProjectData()
  }, [])

  const fetchProjectData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // 1. Get Project Name & Color
    const { data: proj } = await supabase.from('projects').select('name, color').eq('id', projectId).single()
    if (proj) {
      setProjectName(proj.name)
      if (proj.color) setProjectColor(proj.color)
    }

    // 2. Get Reports (RLS will handle Admin vs User visibility)
    // 2. Get Reports
    const { data: reportList } = await supabase.from('reports').select('*').eq('project_id', projectId).order('created_at', { ascending: false })

    // 3. Get Manual Notes
    const { data: noteList } = await supabase.from('project_notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false })

    setReports(reportList || [])
    setNotes(noteList || [])
    setLoading(false)
  }

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

    if (editingReport) {
      const { error } = await supabase.from('reports').update({
        ...formData
      }).eq('id', editingReport.id)

      if (!error) {
        setShowForm(false)
        setEditingReport(null)
        setFormData({ title: '', status: 'In Progress', task_date: '', outcome: '', issues: '', next_action: '' })
        await fetchProjectData()
      } else {
        alert("Error: " + error.message)
      }
    } else {
      const { error } = await supabase.from('reports').insert([{
        project_id: projectId,
        user_id: userId,
        ...formData
      }])

      if (!error) {
        // Clear Draft
        localStorage.removeItem(STORAGE_KEY)

        setShowForm(false)
        setFormData({ title: '', status: 'In Progress', task_date: '', outcome: '', issues: '', next_action: '' })
        await fetchProjectData()

        // Auto-scroll ke senarai laporan
        setTimeout(() => {
          listRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        alert("Error: " + error.message)
      }
    }
  }

  const handleEditReport = (report: Report) => {
    setEditingReport(report)
    setFormData({
      title: report.title,
      status: report.status,
      task_date: report.task_date || '',
      outcome: report.outcome,
      issues: report.issues || '',
      next_action: report.next_action || ''
    })
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Laporan Projek: ${projectName}`,
          text: 'Semak laporan terkini projek ini.',
          url: window.location.href,
        })
      } catch (err) {
        console.log('Share canceled')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Pautan disalin ke papan keratan!')
    }
  }

  if (loading) return <div className="p-10 font-bold">Loading Reports...</div>

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto pb-10 font-sans">

      {/* PRINT HEADER ONLY */}
      <div className="hidden print:block mb-4 border-b-2 border-black pb-2">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none dark:text-black">Laporan Kemajuan</h1>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Vibrant Staff App Management System</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black uppercase leading-none dark:text-black">{projectName || 'Loading...'}</h2>
            <div className="flex flex-col text-[10px] font-bold text-zinc-600 mt-1 leading-tight">
              <span>ID: #{projectId} — {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Project Meta & Actions (Compact Sidebar) - HIDDEN ON PRINT */}
          <div className="lg:col-span-4 flex flex-col gap-4 print:hidden">
            {/* Back Button */}
            <button
              onClick={() => router.push('/dashboard')}

              className="w-full sm:w-fit group flex items-center justify-center sm:justify-start gap-3 font-black uppercase text-xs tracking-wider bg-white hover:bg-black hover:text-neo-yellow border-2 border-black px-5 py-3 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all dark:bg-zinc-900 dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Kembali ke Dashboard
            </button>

            {/* Share & Print Actions */}
            <div className="flex gap-2 print:hidden">
              <button onClick={handlePrint} className="flex-1 bg-white border-2 border-black p-2.5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase hover:bg-zinc-100 dark:bg-zinc-900 dark:border-white dark:text-white dark:hover:bg-zinc-800">
                <Printer size={16} /> Cetak / PDF
              </button>
              <button onClick={handleShare} className="flex-1 bg-white border-2 border-black p-2.5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase hover:bg-zinc-100 dark:bg-zinc-900 dark:border-white dark:text-white dark:hover:bg-zinc-800">
                <Share2 size={16} /> Kongsi
              </button>
            </div>

            {/* Project Info Card */}
            {/* Project Info Card */}
            <div className="neo-card bg-white dark:bg-zinc-900 border-2 border-black dark:border-white p-0 relative overflow-hidden flex-grow flex flex-col justify-between min-h-[250px] group">
              {/* Colored Top Strip */}
              <div className={`h-4 w-full ${baseColorMap[projectColor] || 'bg-neo-yellow'} hover-stripes flex items-center justify-end px-2 border-b-2 border-black dark:border-white`}>
                <div className="w-20 h-full bg-white/20 transform -skew-x-12"></div>
              </div>

              <div className="p-6 flex flex-col justify-between h-full relative">
                <div className="absolute top-10 right-0 p-4 opacity-5 dark:opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-500">
                  <ClipboardList size={120} className="text-black dark:text-white" />
                </div>

                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 border border-black dark:border-zinc-700 text-black dark:text-white px-2 py-0.5 inline-block mb-3 rounded">
                    Project ID: #{projectId}
                  </span>
                  <h1 className="text-4xl font-black uppercase italic leading-[0.9] tracking-tighter mb-4 break-words text-black dark:text-white">
                    {projectName || 'Loading...'}
                  </h1>
                </div>

                <div className="relative z-10 pt-4 border-t-2 border-black/10 dark:border-white/10 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-bold text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Status: Active</span>
                  </div>

                  <button
                    onClick={() => {
                      if (showForm) {
                        setShowForm(false);
                        setEditingReport(null);
                        setFormData({ title: '', status: 'In Progress', task_date: '', outcome: '', issues: '', next_action: '' });
                      } else {
                        setShowForm(true);
                      }
                    }}
                    className={`w-full py-2.5 px-6 flex items-center justify-center gap-2 font-black uppercase tracking-wide border-2 border-black dark:border-white rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group ${showForm ? 'bg-zinc-800 text-white dark:bg-zinc-700' : 'bg-neo-primary text-white hover:brightness-110'}`}
                  >
                    {showForm ? (
                      <><X size={18} className="group-hover:rotate-90 transition-transform" /> Tutup Borang</>
                    ) : (
                      <><PlusCircle size={18} className="group-hover:rotate-12 transition-transform" /> Tambah Laporan</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Reports List & Form (Main Content) */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* FORM AREA */}
            {showForm && (
              <div className="bg-white dark:bg-zinc-900 border-4 border-black dark:border-white rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] p-6 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">

                {/* Decorative Form Header */}
                <div className="flex items-center gap-3 mb-6 border-b-4 border-black dark:border-white pb-4">
                  <div className="bg-neo-primary text-white p-2.5 border-2 border-black dark:border-white shadow-neo-sm transform -rotate-3">
                    <FileText size={24} />
                  </div>
                  <h3 className="font-black text-3xl uppercase italic tracking-tighter transform -skew-x-6 dark:text-white">
                    {editingReport ? 'Kemaskini Laporan' : 'Laporan Baru'}
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Tajuk Laporan / Tugasan</label>
                      <input
                        required
                        autoFocus
                        className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] focus:-translate-y-1 transition-all dark:text-white"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="cth: Reka bentuk UI Dashboard fasa 2..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Status</label>
                      <select
                        className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-sm outline-none appearance-none cursor-pointer focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] focus:-translate-y-1 transition-all dark:text-white"
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="In Progress">⏳ In Progress</option>
                        <option value="Done">✅ Done</option>
                        <option value="Blocked">🚫 Blocked</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Tarikh Laporan</label>
                      <input
                        type="date"
                        className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] focus:-translate-y-1 transition-all dark:text-white"
                        value={formData.task_date}
                        onChange={e => setFormData({ ...formData, task_date: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="font-black text-xs uppercase tracking-wide ml-1 flex items-center gap-2 dark:text-white">
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 border border-black dark:border-zinc-400 rounded text-[10px]">PENTING</span> Hasil / Outcome
                      </label>
                      <textarea
                        required
                        className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-medium text-sm outline-none h-32 resize-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] focus:-translate-y-1 transition-all dark:text-white"
                        value={formData.outcome}
                        onChange={e => setFormData({ ...formData, outcome: e.target.value })}
                        placeholder="Terangkan secara ringkas apa yang telah disiapkan..."
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="font-black text-xs uppercase tracking-wide ml-1 text-red-600 dark:text-red-400 flex items-center gap-1.5">
                          <AlertCircle size={14} /> Isu / Halangan
                        </label>
                        <textarea
                          className="w-full bg-red-50 dark:bg-red-900/10 border-2 border-black dark:border-red-800/50 rounded-lg p-3 font-medium text-sm outline-none h-24 resize-none focus:shadow-[4px_4px_0px_0px_rgba(239,68,68,0.5)] focus:border-red-500 focus:-translate-y-1 transition-all dark:text-red-100 dark:placeholder:text-red-200/50"
                          value={formData.issues}
                          onChange={e => setFormData({ ...formData, issues: e.target.value })}
                          placeholder="Ada sebarang masalah?"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="font-black text-xs uppercase tracking-wide ml-1 text-green-700 dark:text-green-400 flex items-center gap-1.5">
                          <Rocket size={14} /> Tindakan Seterusnya
                        </label>
                        <textarea
                          className="w-full bg-green-50 dark:bg-green-900/10 border-2 border-black dark:border-green-800/50 rounded-lg p-3 font-medium text-sm outline-none h-24 resize-none focus:shadow-[4px_4px_0px_0px_rgba(34,197,94,0.5)] focus:border-green-500 focus:-translate-y-1 transition-all dark:text-green-100 dark:placeholder:text-green-200/50"
                          value={formData.next_action}
                          onChange={e => setFormData({ ...formData, next_action: e.target.value })}
                          placeholder="Apa plan seterusnya?"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t-4 border-black/10 dark:border-white/10">
                    <button type="submit" className="bg-neo-primary hover:brightness-110 text-white border-2 border-black dark:border-white font-black uppercase tracking-wide px-8 py-3.5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2">
                      <Save size={18} /> Simpan Laporan
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* LIST AREA */}
            <div ref={listRef} className="flex flex-col gap-6">
              {/* List Header */}
              <div className="flex items-center justify-between border-b-4 border-black dark:border-white pb-3">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white">Timeline Laporan</h2>
                <div className="bg-black text-neo-yellow border-2 border-black dark:border-white px-4 py-1 font-black shadow-neo text-sm transform -rotate-1">
                  {reports.length} ITEMS
                </div>
              </div>

              {reports.length === 0 ? (
                <div className="bg-zinc-100 dark:bg-zinc-900 border-4 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl py-20 text-center flex flex-col items-center justify-center opacity-70">
                  <ClipboardList size={64} className="mb-4 text-zinc-400 dark:text-zinc-600" />
                  <p className="font-black text-xl text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Tiada laporan dijumpai.</p>
                  <p className="font-bold text-sm text-zinc-400 dark:text-zinc-600 mt-2">Sila tambah laporan pertama anda.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)]">
                  {reports.map((report, index) => (
                    <div
                      key={report.id}
                      className={`group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${index !== reports.length - 1 ? 'border-b border-zinc-200 dark:border-zinc-700' : ''}`}
                    >
                      {/* Left: Date & ID */}
                      <div className="min-w-[80px] sm:text-right">
                        <div className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          {report.task_date ? new Date(report.task_date).toLocaleDateString('default', { day: '2-digit', month: 'short' }) : '--'}
                        </div>
                        <div className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600">
                          #{report.id}
                        </div>
                      </div>

                      {/* Middle: Content */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-sm uppercase leading-none dark:text-white truncate">
                            {report.title}
                          </h3>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 line-clamp-1">
                          {report.outcome}
                        </p>
                      </div>

                      {/* Right: Status & Actions */}
                      <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-end sm:justify-end shrink-0">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditReport(report)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 dark:text-zinc-400" title="Edit"><Edit3 size={14} /></button>
                          <button onClick={() => handleDeleteReport(report.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-400 hover:text-red-500" title="Padam"><Trash2 size={14} /></button>
                        </div>

                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border border-black dark:border-transparent ${report.status === 'Done' ? 'bg-green-400 text-black' : report.status === 'Blocked' ? 'bg-red-400 text-black' : 'bg-yellow-400 text-black'} min-w-[80px] text-center`}>
                          {report.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SUMMARY SECTION (ISSUES & SUGGESTIONS) */}
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-2 border-b-2 border-black dark:border-white">
                <div className="flex items-center gap-3">
                  <span className="bg-neo-primary text-white p-1.5 border border-black shadow-neo-sm">
                    <AlertCircle size={16} />
                  </span>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter dark:text-white">Rumusan Isu & Cadangan</h2>
                </div>
                <button
                  onClick={() => openNoteModal()}
                  className="bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black text-[10px] font-black uppercase px-4 py-2 rounded-lg shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-2"
                >
                  <PlusCircle size={14} /> Tambah Manual
                </button>
              </div>

              {(!notes.length && !reports.some(r => r.issues || r.next_action)) && (
                <p className="text-zinc-400 dark:text-zinc-600 font-bold text-center py-8 italic">Tiada isu atau cadangan dilaporkan setakat ini.</p>
              )}

              <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)]">
                {/* 1. Mapped Report Issues (Read Only Link) */}
                {reports.map((report) => {
                  if (!report.issues && !report.next_action) return null;
                  return (
                    <div key={'summary-' + report.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-200 dark:border-zinc-700 last:border-b-0">
                      {/* Left: Ref & Date */}
                      <div className="min-w-[80px] sm:text-right shrink-0">
                        <div className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          {report.task_date ? new Date(report.task_date).toLocaleDateString('default', { day: '2-digit', month: 'short' }) : '--'}
                        </div>
                        <div className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600">
                          Ref: Task #{report.id}
                        </div>
                      </div>

                      {/* Middle: Content */}
                      <div className="flex-grow min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm uppercase dark:text-white line-clamp-1">{report.title}</h4>
                        </div>

                        {report.issues && (
                          <div className="flex gap-2 items-start">
                            <div className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2"><span className="font-bold text-red-500 text-[10px] uppercase mr-1">Isu:</span>{report.issues}</p>
                          </div>
                        )}
                        {report.next_action && (
                          <div className="flex gap-2 items-start">
                            <div className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2"><span className="font-bold text-green-600 dark:text-green-400 text-[10px] uppercase mr-1">Cadangan:</span>{report.next_action}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Type Badge */}
                      <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-end sm:justify-end shrink-0">
                        <div className="px-2 py-0.5 rounded text-[10px] font-black uppercase border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 min-w-[80px] text-center">
                          Laporan
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* 2. Manual Notes (Editable) */}
                {notes.map((note) => (
                  <div key={'note-' + note.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-200 dark:border-zinc-700 last:border-b-0">
                    {/* Left: Ref & Date */}
                    <div className="min-w-[80px] sm:text-right shrink-0">
                      <div className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {new Date(note.created_at).toLocaleDateString('default', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600">
                        Manual
                      </div>
                    </div>

                    {/* Middle: Content */}
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white leading-relaxed line-clamp-2">
                        {note.content}
                      </p>
                    </div>

                    {/* Right: Status & Actions */}
                    <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-end sm:justify-end shrink-0">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openNoteModal(note)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 dark:text-zinc-400" title="Edit"><Edit3 size={14} /></button>
                        <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-400 hover:text-red-500" title="Padam"><Trash2 size={14} /></button>
                      </div>

                      <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border border-black dark:border-transparent ${note.type === 'issue' ? 'bg-red-400 text-black' : 'bg-green-400 text-black'} min-w-[80px] text-center`}>
                        {note.type === 'issue' ? 'Isu' : 'Cadangan'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NOTE MODAL */}
            {showNoteModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 w-full max-w-md border-4 border-black dark:border-white rounded-xl shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] animate-in zoom-in-95 overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b-4 border-black dark:border-white bg-neo-yellow">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-black">{editingNote ? 'Kemaskini Nota' : 'Tambah Manual'}</h3>
                    <button onClick={() => setShowNoteModal(false)} className="bg-black/10 hover:bg-black hover:text-white p-1 rounded transition-colors"><X size={18} /></button>
                  </div>
                  <form onSubmit={handleSaveNote} className="p-6 space-y-4">
                    <div className="space-y-2">
                      <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Jenis Nota</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-black dark:has-[:checked]:border-white has-[:checked]:bg-red-50 dark:has-[:checked]:bg-red-900/20 flex-1">
                          <input type="radio" name="noteType" value="issue" checked={noteForm.type === 'issue'} onChange={() => setNoteForm({ ...noteForm, type: 'issue' })} className="accent-red-500 w-4 h-4" />
                          <span className="font-bold text-xs uppercase dark:text-white">Isu / Masalah</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg border-2 border-transparent has-[:checked]:border-black dark:has-[:checked]:border-white has-[:checked]:bg-green-50 dark:has-[:checked]:bg-green-900/20 flex-1">
                          <input type="radio" name="noteType" value="suggestion" checked={noteForm.type === 'suggestion'} onChange={() => setNoteForm({ ...noteForm, type: 'suggestion' })} className="accent-green-500 w-4 h-4" />
                          <span className="font-bold text-xs uppercase dark:text-white">Cadangan</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block font-black text-xs uppercase tracking-wide ml-1 dark:text-white">Butiran</label>
                      <textarea
                        required
                        autoFocus
                        className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg p-3 font-bold text-sm outline-none h-32 resize-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] focus:-translate-y-1 transition-all dark:text-white"
                        placeholder="Tulis isu atau cadangan anda di sini..."
                        value={noteForm.content}
                        onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                      />
                    </div>
                    <div className="pt-2">
                      <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white font-black uppercase py-3 rounded-lg hover:-translate-y-1 hover:shadow-lg transition-all flex items-center justify-center gap-2">
                        <Save size={16} /> {editingNote ? 'Simpan Perubahan' : 'Tambah Nota'}
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
  )
}
