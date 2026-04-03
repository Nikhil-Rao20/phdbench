// src/components/ApplicationDetailPanel.jsx
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Plus, Trash2, CheckSquare, Square, MessageSquare, Clock, FileText } from 'lucide-react'
import { getFollowups, addFollowup, deleteFollowup, getActivityLog, addActivityEntry, getDocuments } from '../lib/db'
import StatusBadge from './StatusBadge'
import { format } from 'date-fns'

function DocsPill({ done, label }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${
      done ? 'bg-sage-100 text-sage-700' : 'bg-ink-100 text-ink-400 line-through'
    }`}>
      {done ? <CheckSquare size={10} /> : <Square size={10} />}
      {label}
    </span>
  )
}

export default function ApplicationDetailPanel({ app, uid, onClose, onEdit }) {
  const [followups, setFollowups] = useState([])
  const [activity, setActivity]   = useState([])
  const [documents, setDocuments] = useState([])
  const [fuText, setFuText]       = useState('')
  const [fuDate, setFuDate]       = useState('')
  const [actNote, setActNote]     = useState('')
  const [tab, setTab]             = useState('overview') // overview | followups | log

  useEffect(() => {
    if (!app) return
    getFollowups(uid, app.id).then(setFollowups)
    getActivityLog(uid, app.id).then(setActivity)
    getDocuments(uid).then(setDocuments)
  }, [app, uid])

  if (!app) return null

  const handleAddFollowup = async () => {
    if (!fuText.trim()) return
    await addFollowup(uid, app.id, { note: fuText, date: fuDate || new Date().toISOString().split('T')[0], replied: false })
    setFuText(''); setFuDate('')
    getFollowups(uid, app.id).then(setFollowups)
  }

  const handleDeleteFollowup = async (fid) => {
    await deleteFollowup(uid, app.id, fid)
    getFollowups(uid, app.id).then(setFollowups)
  }

  const handleAddActivity = async () => {
    if (!actNote.trim()) return
    await addActivityEntry(uid, app.id, actNote)
    setActNote('')
    getActivityLog(uid, app.id).then(setActivity)
  }

  const requiredDocList = documents.filter(doc => (app.requiredDocs || []).includes(doc.id))
  const docsReady   = requiredDocList.filter(doc => app.submittedDocs?.[doc.id] || app.docs?.[doc.id]).length
  const docsTotal   = requiredDocList.length

  return (
    <AnimatePresence>
      {app && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-white border-l border-ink-200 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start gap-3 p-5 border-b border-ink-100">
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg text-ink-900 leading-tight">{app.university}</div>
                <div className="text-ink-500 text-sm truncate">{app.labName} {app.labName && app.professor ? '·' : ''} {app.professor}</div>
              </div>
              <StatusBadge status={app.status} />
              <button onClick={onClose} className="btn-ghost p-1.5 ml-1">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-ink-100 px-5">
              {[
                { id: 'overview',  label: 'Overview',   icon: FileText },
                { id: 'followups', label: `Follow-ups (${followups.length})`, icon: MessageSquare },
                { id: 'log',       label: 'Activity log', icon: Clock },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 py-3 px-3 text-xs font-medium border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-ink-900 text-ink-900'
                      : 'border-transparent text-ink-400 hover:text-ink-700'
                  }`}
                >
                  <t.icon size={13} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* ── OVERVIEW TAB ── */}
              {tab === 'overview' && (
                <div className="space-y-5">
                  {/* Quick links */}
                  <div className="flex flex-wrap gap-2">
                    {app.labUrl && (
                      <a href={app.labUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50">
                        <ExternalLink size={11} /> Lab site
                      </a>
                    )}
                    {app.professorProfile && (
                      <a href={app.professorProfile} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50">
                        <ExternalLink size={11} /> Professor
                      </a>
                    )}
                    {app.appUrl && (
                      <a href={app.appUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-sage-200 text-sage-700 hover:bg-sage-50">
                        <ExternalLink size={11} /> Apply portal
                      </a>
                    )}
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: 'Type',         value: app.applicationType || '—' },
                      { label: 'Research area', value: app.researchArea    || '—' },
                      { label: 'Department',    value: app.department       || '—' },
                      { label: 'Funding',       value: app.fundingNote      || '—' },
                    ].map(r => (
                      <div key={r.label} className="bg-ink-50 rounded-xl p-3">
                        <div className="text-xs text-ink-400 mb-0.5">{r.label}</div>
                        <div className="text-ink-800 capitalize">{r.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Deadlines */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-ink-500 uppercase tracking-wider">Deadlines</div>
                    {[
                      { label: 'Application',    v: app.deadline },
                      { label: 'LOR request',    v: app.lorDeadline },
                      { label: 'Decision expected', v: app.expectedDecision },
                    ].map(d => d.v && (
                      <div key={d.label} className="flex items-center justify-between text-sm">
                        <span className="text-ink-500">{d.label}</span>
                        <span className="font-medium text-ink-800">{d.v}</span>
                      </div>
                    ))}
                    {!app.deadline && !app.lorDeadline && !app.expectedDecision && (
                      <p className="text-ink-400 text-xs">No deadlines set</p>
                    )}
                  </div>

                  {/* Email info */}
                  {(app.applicationType === 'email' || app.applicationType === 'both') && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-ink-500 uppercase tracking-wider">Email outreach</div>
                      {app.emailSentDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-ink-500">Sent on</span>
                          <span className="text-ink-800">{app.emailSentDate}</span>
                        </div>
                      )}
                      {app.emailSubject && (
                        <div className="bg-ink-50 rounded-xl p-3 text-xs text-ink-600 font-mono">
                          {app.emailSubject}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-ink-500">Reply received:</span>
                        <span className={app.emailReplied ? 'text-sage-600 font-medium' : 'text-ink-400'}>
                          {app.emailReplied ? '✓ Yes' : 'Not yet'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Docs checklist */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-ink-500 uppercase tracking-wider">Documents</div>
                      <span className="text-xs text-ink-400">{docsReady} / {docsTotal}</span>
                    </div>
                    {docsTotal === 0 ? (
                      <p className="text-xs text-ink-400">
                        No required documents for this application
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {requiredDocList.map(doc => (
                          <DocsPill
                            key={doc.id}
                            done={!!(app.submittedDocs?.[doc.id] || app.docs?.[doc.id])}
                            label={doc.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {app.whyThisLab && (
                    <div>
                      <div className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-1.5">Why this lab</div>
                      <p className="text-sm text-ink-700 bg-ink-50 rounded-xl p-3 leading-relaxed">{app.whyThisLab}</p>
                    </div>
                  )}
                  {app.sopAngle && (
                    <div>
                      <div className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-1.5">SOP angle</div>
                      <p className="text-sm text-ink-700 bg-ink-50 rounded-xl p-3 leading-relaxed">{app.sopAngle}</p>
                    </div>
                  )}
                  {app.interviewNotes && (
                    <div>
                      <div className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-1.5">Interview notes</div>
                      <p className="text-sm text-ink-700 bg-ink-50 rounded-xl p-3 leading-relaxed">{app.interviewNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── FOLLOW-UPS TAB ── */}
              {tab === 'followups' && (
                <div className="space-y-4">
                  {/* Add followup */}
                  <div className="card p-4 space-y-3">
                    <div className="text-xs font-medium text-ink-600">Log a follow-up</div>
                    <textarea
                      className="textarea"
                      rows={2}
                      placeholder="Sent follow-up email, mentioned paper XYZ…"
                      value={fuText}
                      onChange={e => setFuText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input className="input" type="date" value={fuDate}
                        onChange={e => setFuDate(e.target.value)} />
                      <button className="btn-primary" onClick={handleAddFollowup}>
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  {followups.length === 0 ? (
                    <p className="text-center text-ink-400 text-sm py-6">No follow-ups logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {followups.map(fu => (
                        <div key={fu.id} className="flex gap-3 items-start p-3 rounded-xl bg-ink-50">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-ink-700">{fu.note}</p>
                            {fu.date && <p className="text-xs text-ink-400 mt-1">{fu.date}</p>}
                          </div>
                          <button className="text-ink-300 hover:text-rose-500 transition-colors"
                            onClick={() => handleDeleteFollowup(fu.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── ACTIVITY LOG TAB ── */}
              {tab === 'log' && (
                <div className="space-y-4">
                  <div className="card p-4 space-y-3">
                    <div className="text-xs font-medium text-ink-600">Add a note to the log</div>
                    <textarea
                      className="textarea"
                      rows={2}
                      placeholder="Application submitted, heard back from…"
                      value={actNote}
                      onChange={e => setActNote(e.target.value)}
                    />
                    <button className="btn-primary w-full" onClick={handleAddActivity}>
                      <Plus size={14} /> Log entry
                    </button>
                  </div>

                  {activity.length === 0 ? (
                    <p className="text-center text-ink-400 text-sm py-6">No activity logged yet.</p>
                  ) : (
                    <div className="relative pl-4 space-y-4">
                      <div className="absolute left-0 top-2 bottom-2 w-px bg-ink-200" />
                      {activity.map(a => (
                        <div key={a.id} className="relative">
                          <div className="absolute -left-[17px] w-2 h-2 rounded-full bg-ink-400 top-1.5" />
                          <p className="text-sm text-ink-700">{a.note}</p>
                          <p className="text-xs text-ink-400 mt-0.5">
                            {a.createdAt?.seconds
                              ? format(new Date(a.createdAt.seconds * 1000), 'MMM d, yyyy · h:mm a')
                              : 'just now'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-ink-100 flex gap-2">
              <button className="btn-secondary flex-1" onClick={onEdit}>
                ✏️ Edit application
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
