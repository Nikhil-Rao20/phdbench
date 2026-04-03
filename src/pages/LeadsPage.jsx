// src/pages/LeadsPage.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getLeads, addLead, updateLead, deleteLead, promoteLeadToApplication } from '../lib/db'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '../components/Modal'
import LeadForm from '../components/LeadForm'
import StatusBadge from '../components/StatusBadge'
import {
  Plus, Lightbulb, ExternalLink, Pencil, Trash2,
  ArrowUpRight, Search, Filter, StickyNote
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const FILTERS = ['All', 'lead', 'converted']

export default function LeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [addOpen, setAddOpen]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [promoteTarget, setPromoteTarget] = useState(null)
  const [deleteTarget, setDeleteTarget]   = useState(null)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('All')

  const reload = () =>
    getLeads(user.uid).then(setLeads).finally(() => setLoading(false))

  useEffect(() => { if (user) reload() }, [user])

  const handleAdd = async data => {
    setSaving(true)
    await addLead(user.uid, data)
    await reload()
    setSaving(false)
    setAddOpen(false)
  }

  const handleEdit = async data => {
    setSaving(true)
    await updateLead(user.uid, editTarget.id, data)
    await reload()
    setSaving(false)
    setEditTarget(null)
  }

  const handleDelete = async () => {
    await deleteLead(user.uid, deleteTarget.id)
    setDeleteTarget(null)
    await reload()
  }

  const handlePromote = async extraData => {
    setSaving(true)
    await promoteLeadToApplication(user.uid, promoteTarget.id, extraData)
    await reload()
    setSaving(false)
    setPromoteTarget(null)
  }

  const filtered = leads
    .filter(l => filter === 'All' || l.status === filter)
    .filter(l => {
      const q = search.toLowerCase()
      return !q || [l.university, l.labName, l.professor, l.researchArea]
        .some(s => s?.toLowerCase().includes(q))
    })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Leads</h1>
          <p className="text-ink-500 text-sm mt-0.5">
            {leads.length} saved · {leads.filter(l => l.status === 'converted').length} converted
          </p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Save new lead
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search university, professor, lab…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-ink-900 text-white'
                  : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'
              }`}
            >
              {f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
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
          <Lightbulb size={32} className="mx-auto mb-3 text-ink-300" />
          <p className="text-ink-500 text-sm">
            {search || filter !== 'All'
              ? 'No leads match your search.'
              : 'No leads yet. Hit "Save new lead" when you spot something on LinkedIn!'}
          </p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((lead, i) => (
            <motion.div
              key={lead.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ delay: i * 0.04 }}
              className={`card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${
                lead.status === 'converted' ? 'border-sage-200 bg-sage-50/30' : ''
              }`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-ink-900 text-sm truncate">{lead.university}</div>
                  <div className="text-ink-500 text-xs truncate">{lead.labName || '—'}</div>
                </div>
                <StatusBadge status={lead.status} />
              </div>

              {/* Professor & area */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                <span>👤 {lead.professor}</span>
                {lead.researchArea && <span>🔬 {lead.researchArea}</span>}
              </div>

              {/* Notes preview */}
              {lead.notes && (
                <p className="text-xs text-ink-500 line-clamp-2 bg-ink-50 rounded-lg p-2.5">
                  {lead.notes}
                </p>
              )}

              {/* Links row */}
              <div className="flex gap-3">
                {lead.labUrl && (
                  <a href={lead.labUrl} target="_blank" rel="noreferrer"
                    className="text-xs text-sage-600 hover:underline flex items-center gap-1">
                    <ExternalLink size={11} /> Lab
                  </a>
                )}
                {lead.linkedinPost && (
                  <a href={lead.linkedinPost} target="_blank" rel="noreferrer"
                    className="text-xs text-sky-600 hover:underline flex items-center gap-1">
                    <ExternalLink size={11} /> Post
                  </a>
                )}
                {lead.source && (
                  <span className="text-xs text-ink-400 ml-auto">via {lead.source}</span>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-ink-100" />

              {/* Actions */}
              <div className="flex items-center gap-2">
                {lead.status !== 'converted' && (
                  <button
                    className="btn-primary text-xs py-1.5 px-3 flex-1"
                    onClick={() => setPromoteTarget(lead)}
                  >
                    <ArrowUpRight size={13} /> Apply to this
                  </button>
                )}
                {lead.status === 'converted' && (
                  <span className="text-xs text-sage-600 flex-1">✓ Converted to application</span>
                )}
                <button className="btn-ghost py-1.5 px-2" onClick={() => setEditTarget(lead)}>
                  <Pencil size={13} />
                </button>
                <button className="btn-ghost py-1.5 px-2 text-rose-500 hover:bg-rose-50" onClick={() => setDeleteTarget(lead)}>
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="text-xs text-ink-400">
                Saved {lead.createdAt?.seconds
                  ? formatDistanceToNow(new Date(lead.createdAt.seconds * 1000), { addSuffix: true })
                  : 'just now'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── MODALS ── */}

      {/* Add lead */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Save new lead">
        <LeadForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} loading={saving} />
      </Modal>

      {/* Edit lead */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit lead">
        {editTarget && (
          <LeadForm
            initial={editTarget}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={saving}
          />
        )}
      </Modal>

      {/* Promote lead → application */}
      <Modal open={!!promoteTarget} onClose={() => setPromoteTarget(null)} title="Convert lead to application">
        {promoteTarget && (
          <PromoteForm lead={promoteTarget} onSubmit={handlePromote} onCancel={() => setPromoteTarget(null)} loading={saving} />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete lead?">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-ink-600 text-sm">
              Are you sure you want to delete the lead for <strong>{deleteTarget.university}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Delete lead</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Mini form for promoting a lead to application
function PromoteForm({ lead, onSubmit, onCancel, loading }) {
  const [type, setType]         = useState('portal')
  const [deadline, setDeadline] = useState('')
  const [appUrl, setAppUrl]     = useState('')
  const [notes, setNotes]       = useState('')

  const handleSubmit = e => {
    e.preventDefault()
    onSubmit({ applicationType: type, deadline, appUrl, promotionNotes: notes })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 rounded-xl bg-ink-50 border border-ink-200 text-sm">
        <div className="font-medium text-ink-800">{lead.university}</div>
        <div className="text-ink-500">{lead.labName} · {lead.professor}</div>
      </div>

      <div>
        <label className="label">Application type *</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: 'portal', label: '🌐 Portal' },
            { v: 'email',  label: '✉️ Email' },
            { v: 'both',   label: '🔀 Both' },
          ].map(opt => (
            <button
              key={opt.v} type="button"
              onClick={() => setType(opt.v)}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                type === opt.v
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-700 border-ink-200 hover:border-ink-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Application deadline</label>
          <input className="input" type="date" value={deadline}
            onChange={e => setDeadline(e.target.value)} />
        </div>
        <div>
          <label className="label">Application portal URL</label>
          <input className="input" value={appUrl}
            onChange={e => setAppUrl(e.target.value)}
            placeholder="https://apply.university.edu/…" />
        </div>
      </div>

      <div>
        <label className="label">Initial notes</label>
        <textarea className="textarea" rows={3} value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Why this lab, what to highlight in SOP…" />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Converting…' : '🚀 Convert to application'}
        </button>
      </div>
    </form>
  )
}
