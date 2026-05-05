// src/pages/ApplicationsPage.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getApplications, addApplication, updateApplication, deleteApplication, getDocuments } from '../lib/db'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '../components/Modal'
import ApplicationForm from '../components/ApplicationForm'
import ApplicationDetailPanel from '../components/ApplicationDetailPanel'
import StatusBadge from '../components/StatusBadge'
import { Plus, FileText, Search, ExternalLink, Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import { differenceInDays, isPast } from 'date-fns'

const STATUSES = ['All', 'applied', 'emailed', 'interview', 'offer', 'rejected']
const APP_TYPES = ['All', 'portal', 'email', 'both']

function DocsBar({ app, documents }) {
  const requiredDocsForApp = app.requiredDocs || []
  const required = requiredDocsForApp.length
  if (required === 0) return <span className="text-xs text-ink-400">No required docs</span>
  const done = Object.entries(app.submittedDocs || app.docs || {})
    .filter(([docId, submitted]) => submitted && requiredDocsForApp.includes(docId))
    .length
  const pct = Math.round((done / required) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-sage-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-ink-400 shrink-0">{done}/{required}</span>
    </div>
  )
}

function DeadlinePill({ date }) {
  if (!date) return null
  const d = new Date(date)
  const days = differenceInDays(d, new Date())
  const past = isPast(d)
  if (past) return <span className="text-xs text-ink-400 line-through">{date}</span>
  return (
    <span className={`text-xs font-medium ${days <= 7 ? 'text-rose-600' : days <= 21 ? 'text-amber-600' : 'text-ink-500'}`}>
      {days === 0 ? '⚠️ Today!' : days <= 7 ? `⚠️ ${days}d` : `${days}d`}
    </span>
  )
}

function OpensPill({ date }) {
  if (!date) return null
  const d = new Date(date)
  const days = differenceInDays(d, new Date())
  const past = isPast(d)
  if (past) return <span className="text-xs text-sage-600">Opened: {date}</span>
  return (
    <span className={`text-xs font-medium text-sky-600`}>
      {days === 0 ? 'Opens Today!' : `Opens in ${days}d`}
    </span>
  )
}

export default function ApplicationsPage() {
  const { user } = useAuth()
  const [apps, setApps] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('All')
  const [typeF, setTypeF] = useState('All')
  const [view, setView] = useState('cards') // cards | table

  const reload = async () => {
    const [app_data, doc_data] = await Promise.all([
      getApplications(user.uid),
      getDocuments(user.uid)
    ])
    setApps(app_data)
    setDocuments(doc_data)
    setLoading(false)
  }

  useEffect(() => { if (user) reload() }, [user])

  const handleAdd = async data => {
    setSaving(true)
    await addApplication(user.uid, data)
    await reload()
    setSaving(false)
    setAddOpen(false)
  }

  const handleEdit = async data => {
    setSaving(true)
    await updateApplication(user.uid, editTarget.id, data)
    await reload()
    setSaving(false)
    setEditTarget(null)
    // refresh detail panel
    if (detailTarget?.id === editTarget.id) {
      setDetailTarget(apps.find(a => a.id === editTarget.id) || null)
    }
  }

  const handleDelete = async () => {
    await deleteApplication(user.uid, deleteTarget.id)
    if (detailTarget?.id === deleteTarget.id) setDetailTarget(null)
    setDeleteTarget(null)
    await reload()
  }

  const filtered = apps
    .filter(a => statusF === 'All' || a.status === statusF)
    .filter(a => typeF === 'All' || a.applicationType === typeF)
    .filter(a => {
      const q = search.toLowerCase()
      return !q || [a.university, a.labName, a.professor, a.researchArea]
        .some(s => s?.toLowerCase().includes(q))
    })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Applications</h1>
          <p className="text-ink-500 text-sm mt-0.5">{apps.length} total</p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add application
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusF(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${statusF === s ? 'bg-ink-900 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="w-px bg-ink-200 mx-1 self-stretch" />
          {APP_TYPES.map(t => (
            <button key={t} onClick={() => setTypeF(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${typeF === t ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}>
              {t === 'All' ? 'All types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-ink-200 border-t-ink-800 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <FileText size={32} className="mx-auto mb-3 text-ink-300" />
          <p className="text-ink-500 text-sm">
            {search || statusF !== 'All' || typeF !== 'All'
              ? 'No applications match your filters.'
              : 'No applications yet. Add one or convert a lead!'}
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((app, i) => (
            <motion.div
              key={app.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ delay: i * 0.04 }}
              className={`card p-5 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow ${detailTarget?.id === app.id ? 'ring-2 ring-ink-900' : ''
                } ${app.status === 'offer' ? 'border-sage-300 bg-sage-50/40' : ''}
                ${app.status === 'rejected' ? 'opacity-60' : ''}`}
              onClick={() => setDetailTarget(app)}
            >
              {/* Top */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-ink-900 text-sm truncate">{app.university}</div>
                  <div className="text-ink-500 text-xs truncate">{app.labName || app.department || '—'}</div>
                </div>
                <StatusBadge status={app.status} />
              </div>

              {/* Professor + type */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-600">
                {app.professor && <span>👤 {app.professor}</span>}
                {app.researchArea && <span>🔬 {app.researchArea}</span>}
                <span className="capitalize">📋 {app.applicationType || 'portal'}</span>
              </div>

              {/* Docs bar */}
              <DocsBar app={app} documents={documents} />

              {/* Deadlines & Dates */}
              {app.startDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-400">Opens On</span>
                  <OpensPill date={app.startDate} />
                </div>
              )}
              {app.deadline && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-400">Deadline</span>
                  <DeadlinePill date={app.deadline} />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-ink-100"
                onClick={e => e.stopPropagation()}>
                {app.appUrl && (
                  <a href={app.appUrl} target="_blank" rel="noreferrer" className="btn-ghost py-1 px-2 text-xs">
                    <ExternalLink size={12} /> Portal
                  </a>
                )}
                {app.driveLink && (
                  <a href={app.driveLink} target="_blank" rel="noreferrer" className="btn-ghost py-1 px-2 text-xs text-sky-600 hover:bg-sky-50">
                    <ExternalLink size={12} /> Documents
                  </a>
                )}
                <div className="flex-1" />
                <button className="btn-ghost py-1 px-2"
                  onClick={() => { setEditTarget(app); setDetailTarget(null) }}>
                  <Pencil size={13} />
                </button>
                <button className="btn-ghost py-1 px-2 text-rose-500 hover:bg-rose-50"
                  onClick={() => setDeleteTarget(app)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail panel */}
      <ApplicationDetailPanel
        app={detailTarget}
        uid={user?.uid}
        onClose={() => setDetailTarget(null)}
        onEdit={() => { setEditTarget(detailTarget); setDetailTarget(null) }}
      />

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add application" wide>
        <ApplicationForm
          uid={user?.uid}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
          loading={saving}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit application" wide>
        {editTarget && (
          <ApplicationForm
            uid={user?.uid}
            initial={editTarget}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={saving}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete application?">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-ink-600 text-sm">
              Delete application to <strong>{deleteTarget.university}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
