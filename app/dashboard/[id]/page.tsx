'use client'
import { useEffect, useState, use, useRef } from 'react' // Import 'use' for params handling in Next 15/14
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft, PlusCircle, Save, Calendar, CheckCircle2, AlertCircle, Rocket, X, FileText, ClipboardList, Edit3, Trash2 } from 'lucide-react'

// Types
type Report = { id: number; title: string; status: string; task_date: string; outcome: string; issues: string; next_action: string; user_id: string }

export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  // React.use() untuk unwrap params (Syntax baru Next.js)
  const resolvedParams = use(params)
  const projectId = resolvedParams.id

  const [projectName, setProjectName] = useState('')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  // Form State
  const [showForm, setShowForm] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [formData, setFormData] = useState({
    title: '', status: 'In Progress', task_date: '', outcome: '', issues: '', next_action: ''
  })
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProjectData()
  }, [])

  const fetchProjectData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // 1. Get Project Name
    const { data: proj } = await supabase.from('projects').select('name').eq('id', projectId).single()
    if (proj) setProjectName(proj.name)

    // 2. Get Reports (RLS will handle Admin vs User visibility)
    const { data: reportList } = await supabase.from('reports').select('*').eq('project_id', projectId).order('created_at', { ascending: false })

    setReports(reportList || [])
    setLoading(false)
  }

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
    else alert("Gagal padam: " + error.message)
  }

  // Fungsi Warna Badge
  const getStatusColor = (status: string) => {
    if (status === 'Done') return 'bg-green-300'
    if (status === 'Blocked') return 'bg-red-300'
    return 'bg-yellow-300'
  }

  if (loading) return <div className="p-10 font-bold">Loading Reports...</div>

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto pb-10 font-sans">

      {/* HEADER SECTION - Split Grid Concept */}
      <header className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Project Meta & Actions (Compact Sidebar) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Back Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full sm:w-fit group flex items-center justify-center sm:justify-start gap-3 font-black uppercase text-xs tracking-wider bg-white hover:bg-black hover:text-neo-yellow border-2 border-black px-5 py-3 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Kembali ke Dashboard
            </button>

            {/* Project Info Card */}
            <div className="neo-card bg-neo-yellow p-6 relative overflow-hidden flex-grow flex flex-col justify-between min-h-[250px] group">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-500">
                <ClipboardList size={120} />
              </div>

              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 inline-block mb-3">
                  Project ID: #{projectId}
                </span>
                <h1 className="text-4xl font-black uppercase italic leading-[0.9] tracking-tighter mb-4 break-words">
                  {projectName || 'Loading...'}
                </h1>
              </div>

              <div className="relative z-10 pt-4 border-t-2 border-black/20 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="font-bold text-xs uppercase tracking-wide">Status: Active</span>
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
                  className={`w-full py-2.5 px-6 flex items-center justify-center gap-2 font-black uppercase tracking-wide border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all group ${showForm ? 'bg-zinc-800 text-white' : 'bg-neo-primary text-white'}`}
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

          {/* RIGHT: Reports List & Form (Main Content) */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* FORM AREA */}
            {showForm && (
              <div className="bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">

                {/* Decorative Form Header */}
                <div className="flex items-center gap-3 mb-6 border-b-4 border-black pb-4">
                  <div className="bg-neo-primary text-white p-2.5 border-2 border-black shadow-neo-sm transform -rotate-3">
                    <FileText size={24} />
                  </div>
                  <h3 className="font-black text-3xl uppercase italic tracking-tighter transform -skew-x-6">
                    {editingReport ? 'Kemaskini Laporan' : 'Laporan Baru'}
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="block font-black text-xs uppercase tracking-wide ml-1">Tajuk Laporan / Tugasan</label>
                      <input
                        required
                        autoFocus
                        className="w-full bg-white border-2 border-black rounded-lg p-3 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="cth: Reka bentuk UI Dashboard fasa 2..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-black text-xs uppercase tracking-wide ml-1">Status</label>
                      <select
                        className="w-full bg-white border-2 border-black rounded-lg p-3 font-bold text-sm outline-none appearance-none cursor-pointer focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all"
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="In Progress">⏳ In Progress</option>
                        <option value="Done">✅ Done</option>
                        <option value="Blocked">🚫 Blocked</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-black text-xs uppercase tracking-wide ml-1">Tarikh Laporan</label>
                      <input
                        type="date"
                        className="w-full bg-white border-2 border-black rounded-lg p-3 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all"
                        value={formData.task_date}
                        onChange={e => setFormData({ ...formData, task_date: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="font-black text-xs uppercase tracking-wide ml-1 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 border border-black rounded text-[10px]">PENTING</span> Hasil / Outcome
                      </label>
                      <textarea
                        required
                        className="w-full bg-white border-2 border-black rounded-lg p-3 font-medium text-sm outline-none h-32 resize-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all"
                        value={formData.outcome}
                        onChange={e => setFormData({ ...formData, outcome: e.target.value })}
                        placeholder="Terangkan secara ringkas apa yang telah disiapkan..."
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="font-black text-xs uppercase tracking-wide ml-1 text-red-600 flex items-center gap-1.5">
                          <AlertCircle size={14} /> Isu / Halangan
                        </label>
                        <textarea
                          className="w-full bg-red-50 border-2 border-black rounded-lg p-3 font-medium text-sm outline-none h-24 resize-none focus:shadow-[4px_4px_0px_0px_rgba(239,68,68,0.5)] focus:border-red-500 focus:-translate-y-1 transition-all"
                          value={formData.issues}
                          onChange={e => setFormData({ ...formData, issues: e.target.value })}
                          placeholder="Ada sebarang masalah?"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="font-black text-xs uppercase tracking-wide ml-1 text-green-700 flex items-center gap-1.5">
                          <Rocket size={14} /> Tindakan Seterusnya
                        </label>
                        <textarea
                          className="w-full bg-green-50 border-2 border-black rounded-lg p-3 font-medium text-sm outline-none h-24 resize-none focus:shadow-[4px_4px_0px_0px_rgba(34,197,94,0.5)] focus:border-green-500 focus:-translate-y-1 transition-all"
                          value={formData.next_action}
                          onChange={e => setFormData({ ...formData, next_action: e.target.value })}
                          placeholder="Apa plan seterusnya?"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t-4 border-black/10">
                    <button type="submit" className="bg-neo-primary hover:brightness-110 text-white border-2 border-black font-black uppercase tracking-wide px-8 py-3.5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-2">
                      <Save size={18} /> Simpan Laporan
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* LIST AREA */}
            <div ref={listRef} className="flex flex-col gap-5">
              {/* List Header */}
              <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-2">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Timeline Laporan</h2>
                <div className="bg-black text-neo-yellow border-2 border-black px-4 py-1 font-black shadow-neo text-sm transform -rotate-1">
                  {reports.length} ITEMS
                </div>
              </div>

              {reports.length === 0 ? (
                <div className="bg-zinc-100 border-4 border-dashed border-zinc-300 rounded-xl py-20 text-center flex flex-col items-center justify-center opacity-70">
                  <ClipboardList size={64} className="mb-4 text-zinc-400" />
                  <p className="font-black text-xl text-zinc-400 uppercase tracking-widest">Tiada laporan dijumpai.</p>
                  <p className="font-bold text-sm text-zinc-400 mt-2">Sila tambah laporan pertama anda.</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="group relative bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">

                    {/* Decorative Strip */}
                    <div className="h-2 w-full bg-black group-hover:bg-neo-primary transition-colors duration-300"></div>

                    {/* Floating Actions Overlay */}
                    <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button onClick={() => handleEditReport(report)} className="p-2 bg-white border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] rounded-lg transition-all text-black hover:bg-neo-yellow" title="Edit"><Edit3 size={16} /></button>
                      <button onClick={() => handleDeleteReport(report.id)} className="p-2 bg-white border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] rounded-lg transition-all text-red-500 hover:bg-red-500 hover:text-white" title="Padam"><Trash2 size={16} /></button>
                    </div>

                    <div className="flex flex-col md:flex-row">
                      {/* Left: Date Strip */}
                      <div className="bg-zinc-50 p-5 md:w-36 flex flex-col items-center justify-start border-b-2 md:border-b-0 md:border-r-2 border-black/10 pt-8">
                        <span className="text-4xl font-black text-zinc-300 mb-0 leading-none group-hover:text-black transition-colors">
                          {report.task_date ? new Date(report.task_date).getDate() : '--'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                          {report.task_date ? new Date(report.task_date).toLocaleString('default', { month: 'short' }) : 'DATE'}
                        </span>

                        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase border border-black ${report.status === 'Done' ? 'bg-green-400' : report.status === 'Blocked' ? 'bg-red-400' : 'bg-yellow-400'}`}>
                          {report.status}
                        </div>
                      </div>

                      {/* Right: Content */}
                      <div className="p-6 flex-grow ">
                        <h3 className="text-2xl font-black uppercase italic leading-none mb-4 pr-16 group-hover:text-neo-primary transition-colors">{report.title}</h3>
                        <div className="text-sm font-medium text-zinc-600 leading-relaxed mb-6 bg-zinc-50 p-3 rounded border border-zinc-200">{report.outcome}</div>

                        {(report.issues || report.next_action) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-2 border-dashed border-zinc-200">
                            {report.issues && (
                              <div className="bg-red-50 p-3 rounded border border-red-100">
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500 mb-1">
                                  <AlertCircle size={10} /> Isu Berbangkit
                                </span>
                                <p className="text-xs font-bold text-zinc-700 leading-snug">{report.issues}</p>
                              </div>
                            )}
                            {report.next_action && (
                              <div className="bg-green-50 p-3 rounded border border-green-100">
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-green-600 mb-1">
                                  <Rocket size={10} /> Tindakan Lanjut
                                </span>
                                <p className="text-xs font-bold text-zinc-700 leading-snug">{report.next_action}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </header>
    </div>
  )
}
