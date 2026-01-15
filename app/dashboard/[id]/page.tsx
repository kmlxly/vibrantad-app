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
    if(status === 'Done') return 'bg-green-300'
    if(status === 'Blocked') return 'bg-red-300'
    return 'bg-yellow-300'
  }

  if (loading) return <div className="p-10 font-bold">Loading Reports...</div>

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto pb-10">
      {/* HEADER - Compact */}
      <button 
        onClick={() => router.push('/dashboard')} 
        className="mb-6 flex items-center gap-2 font-black uppercase text-[10px] bg-white border-2 border-black px-3 py-1.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
      >
        <ArrowLeft size={14} /> KEMBALI
      </button>
      
      <div className="neo-card bg-neo-yellow mb-8 p-0 overflow-hidden relative border-4">
        {/* Decorative dynamic background elements */}
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-neo-primary border-4 border-black rounded-full opacity-20 pointer-events-none"></div>
        <div className="absolute right-10 top-0 w-20 h-20 bg-white border-4 border-black rotate-12 opacity-20 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-stretch relative z-10">
          {/* Brand/Icon Section */}
          <div className="bg-neo-dark text-white p-6 flex items-center justify-center border-b-4 md:border-b-0 md:border-r-4 border-black">
            <div className="bg-white p-3 border-2 border-black shadow-neo-sm rotate-3 group">
              <ClipboardList size={32} className="text-neo-dark group-hover:-rotate-6 transition-transform" />
            </div>
          </div>

          {/* Project Info Section */}
          <div className="flex-grow p-6 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/50 backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-neo-primary text-white text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 border-2 border-black shadow-neo-sm">
                  ACTIVE PROJECT
                </span>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">ID: #{projectId}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black uppercase italic leading-none tracking-tighter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">{projectName}</h1>
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
              className={`neo-btn py-2 px-5 text-xs ${showForm ? 'bg-neo-dark text-white' : 'bg-neo-yellow text-neo-dark'}`}
            >
              {showForm ? (
                <><X size={16} /> BATAL</>
              ) : (
                <><PlusCircle size={16} /> TAMBAH LAPORAN</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* FORM INPUT LAPORAN - Compact */}
      {showForm && (
        <div className="neo-card mb-10 bg-white border-2 p-5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-6 border-b-2 border-black pb-3">
            <h3 className="font-black text-lg uppercase italic">
              {editingReport ? 'Kemaskini Laporan' : 'Borang Laporan'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block font-black uppercase text-[10px] mb-1.5 ml-0.5 text-zinc-500">Tajuk Tugasan</label>
                <input 
                  required 
                  className="neo-input py-2 text-sm" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  placeholder="cth: Update UI Dashboard" 
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[10px] mb-1.5 ml-0.5 text-zinc-500">Status</label>
                <select 
                  className="neo-input py-2 text-sm appearance-none cursor-pointer" 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="In Progress">⏳ In Progress</option>
                  <option value="Done">✅ Done</option>
                  <option value="Blocked">🚫 Blocked</option>
                </select>
              </div>

              <div>
                <label className="block font-black uppercase text-[10px] mb-1.5 ml-0.5 text-zinc-500">Tarikh</label>
                <input 
                  type="date" 
                  className="neo-input py-2 text-sm" 
                  value={formData.task_date} 
                  onChange={e => setFormData({...formData, task_date: e.target.value})} 
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-black uppercase text-[10px] mb-1.5 ml-0.5 text-blue-800 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Outcome
                </label>
                <textarea 
                  required 
                  className="neo-input h-24 text-sm" 
                  value={formData.outcome} 
                  onChange={e => setFormData({...formData, outcome: e.target.value})} 
                  placeholder="Apa hasil kerja anda?" 
                />
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black uppercase text-[10px] mb-1.5 ml-0.5 text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> Isu
                  </label>
                  <textarea 
                    className="neo-input h-20 text-sm border-red-200" 
                    value={formData.issues} 
                    onChange={e => setFormData({...formData, issues: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block font-black uppercase text-[10px] mb-1.5 ml-0.5 text-green-700 flex items-center gap-1">
                    <Rocket size={12} /> Next
                  </label>
                  <textarea 
                    className="neo-input h-20 text-sm border-green-200" 
                    value={formData.next_action} 
                    onChange={e => setFormData({...formData, next_action: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="neo-btn py-2.5 px-8 text-xs bg-neo-dark text-white font-black">
                <Save size={16} className="mr-1.5"/> SIMPAN LAPORAN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SENARAI LAPORAN - Compact Cards */}
      <div ref={listRef} className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-black uppercase italic border-b-2 border-black">Arkib Laporan</h2>
          <span className="bg-neo-dark text-white text-[10px] font-black px-1.5 py-0.5">{reports.length}</span>
        </div>

        {reports.length === 0 ? (
          <div className="neo-box text-center py-10 bg-zinc-50 border-dashed opacity-60">
            <p className="font-bold text-zinc-400 uppercase text-[10px]">Tiada laporan lagi.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="neo-card p-4 hover:-translate-y-0.5 transition-all group bg-white border-2 relative">
              {/* Report Actions */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button 
                  onClick={() => handleEditReport(report)}
                  className="bg-neo-yellow p-1.5 border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  title="Kemaskini"
                >
                  <Edit3 size={12} />
                </button>
                <button 
                  onClick={() => handleDeleteReport(report.id)}
                  className="bg-neo-primary text-white p-1.5 border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  title="Padam"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start gap-2 mb-3 pr-20">
                <div>
                  <div className="flex items-center gap-1.5 text-zinc-400 font-black text-[9px] uppercase mb-0.5">
                    <Calendar size={10} />
                    <span>{report.task_date || 'N/A'}</span>
                  </div>
                  <h3 className="text-lg font-black uppercase leading-tight group-hover:text-neo-primary transition-colors italic tracking-tighter">
                    {report.title}
                  </h3>
                </div>
                <div className={`neo-badge ${getStatusColor(report.status)} px-3 py-0.5 text-[10px] uppercase italic border-2`}>
                  {report.status}
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-zinc-50 border-2 border-zinc-100 p-3 shadow-neo-sm">
                  <p className="text-xs font-bold leading-relaxed text-zinc-700">{report.outcome}</p>
                </div>
                
                {(report.issues || report.next_action) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.issues && (
                      <div className="bg-red-50 border-2 border-red-100 p-3 shadow-neo-sm">
                        <span className="text-[9px] font-black uppercase text-red-400 block mb-1">Isu:</span>
                        <p className="text-[11px] font-bold text-red-900">{report.issues}</p>
                      </div>
                    )}
                    
                    {report.next_action && (
                      <div className="bg-green-50 border-2 border-green-100 p-3 shadow-neo-sm">
                        <span className="text-[9px] font-black uppercase text-green-500 block mb-1">Next:</span>
                        <p className="text-[11px] font-bold text-green-900">{report.next_action}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
