// src/components/ApplicationForm.jsx
import { useState, useEffect } from 'react'
import { ExternalLink, CheckSquare, Square } from 'lucide-react'
import { getDocuments } from '../lib/db'

const AREAS    = ['Computer Vision', 'Medical Imaging', 'Multimodal AI', 'Reinforcement Learning', 'Computational Biology', 'Other']
const STATUSES = ['applied', 'emailed', 'interview', 'offer', 'rejected']

function Checkbox({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-ink-50 transition-colors w-full text-left"
    >
      {checked
        ? <CheckSquare size={16} className="text-sage-600 shrink-0" />
        : <Square      size={16} className="text-ink-300 shrink-0" />
      }
      <span className={`text-sm ${checked ? 'text-ink-800 line-through decoration-ink-300' : 'text-ink-600'}`}>
        {label}
      </span>
    </button>
  )
}

export default function ApplicationForm({ initial = {}, uid = null, onSubmit, onCancel, loading }) {
  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [form, setForm] = useState({
    // Lab info
    university:       initial.university       || '',
    department:       initial.department       || '',
    labName:          initial.labName          || '',
    professor:        initial.professor        || '',
    professor2:       initial.professor2       || '',
    researchArea:     initial.researchArea     || '',
    labUrl:           initial.labUrl           || '',
    professorProfile: initial.professorProfile || '',
    fundingNote:      initial.fundingNote      || '',
    // Application
    applicationType:  initial.applicationType  || 'portal',
    appUrl:           initial.appUrl           || '',
    status:           initial.status           || 'applied',
    startDate:        initial.startDate        || '',
    deadline:         initial.deadline         || '',
    lorDeadline:      initial.lorDeadline      || '',
    expectedDecision: initial.expectedDecision || '',
    // Email fields
    emailSentDate:    initial.emailSentDate    || '',
    emailSubject:     initial.emailSubject     || '',
    emailReplied:     initial.emailReplied     || false,
    // Docs — which are required and which are submitted
    requiredDocs:     initial.requiredDocs     || [],
    submittedDocs:    initial.submittedDocs    || initial.docs || {},
    driveLink:        initial.driveLink        || '',
    // Notes
    whyThisLab:       initial.whyThisLab       || '',
    sopAngle:         initial.sopAngle         || '',
    interviewNotes:   initial.interviewNotes   || '',
  })

  useEffect(() => {
    if (!uid) return
    getDocuments(uid).then(docs => {
      setDocuments(docs)
      setDocsLoading(false)
    })
  }, [uid])

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setRequired = (docId, v) => setForm(f => ({
    ...f,
    requiredDocs: v ? [...f.requiredDocs, docId] : f.requiredDocs.filter(id => id !== docId)
  }))
  const setDoc = (docId, v) => setForm(f => ({
    ...f,
    submittedDocs: { ...f.submittedDocs, [docId]: v }
  }))

  const handleSubmit = e => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* ── Section 1: Lab info ── */}
      <section>
        <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3 pb-2 border-b border-ink-100">
          Lab & University
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">University *</label>
            <input className="input" required value={form.university}
              onChange={e => set('university', e.target.value)} placeholder="MIT, Stanford…" />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input" value={form.department}
              onChange={e => set('department', e.target.value)} placeholder="EECS, CS, BME…" />
          </div>
          <div>
            <label className="label">Lab / Group</label>
            <input className="input" value={form.labName}
              onChange={e => set('labName', e.target.value)} placeholder="CSAIL, SAIL…" />
          </div>
          <div>
            <label className="label">Research area</label>
            <select className="select" value={form.researchArea}
              onChange={e => set('researchArea', e.target.value)}>
              <option value="">— Select —</option>
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Primary Professor *</label>
            <input className="input" required value={form.professor}
              onChange={e => set('professor', e.target.value)} placeholder="Prof. Jane Smith" />
          </div>
          <div>
            <label className="label">2nd Professor (optional)</label>
            <input className="input" value={form.professor2}
              onChange={e => set('professor2', e.target.value)} placeholder="Co-advisor, collaborator…" />
          </div>
          <div>
            <label className="label">Lab URL</label>
            <div className="relative">
              <input className="input pr-9" value={form.labUrl}
                onChange={e => set('labUrl', e.target.value)} placeholder="https://…" />
              {form.labUrl && <a href={form.labUrl} target="_blank" rel="noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600">
                <ExternalLink size={14} /></a>}
            </div>
          </div>
          <div>
            <label className="label">Professor profile URL</label>
            <div className="relative">
              <input className="input pr-9" value={form.professorProfile}
                onChange={e => set('professorProfile', e.target.value)} placeholder="https://…" />
              {form.professorProfile && <a href={form.professorProfile} target="_blank" rel="noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600">
                <ExternalLink size={14} /></a>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Funding / Stipend note</label>
          <input className="input" value={form.fundingNote}
            onChange={e => set('fundingNote', e.target.value)}
            placeholder="RA, TA, fellowship info…" />
        </div>
      </section>

      {/* ── Section 2: Application type ── */}
      <section>
        <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3 pb-2 border-b border-ink-100">
          Application type & Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Application type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'portal', label: '🌐 Portal' },
                { v: 'email',  label: '✉️ Email' },
                { v: 'both',   label: '🔀 Both' },
              ].map(opt => (
                <button key={opt.v} type="button"
                  onClick={() => set('applicationType', opt.v)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                    form.applicationType === opt.v
                      ? 'bg-ink-900 text-white border-ink-900'
                      : 'bg-white text-ink-700 border-ink-200 hover:border-ink-400'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status}
              onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Portal fields */}
        {(form.applicationType === 'portal' || form.applicationType === 'both') && (
          <div className="mt-4">
            <label className="label">Application portal URL</label>
            <div className="relative">
              <input className="input pr-9" value={form.appUrl}
                onChange={e => set('appUrl', e.target.value)} placeholder="https://apply.university.edu…" />
              {form.appUrl && <a href={form.appUrl} target="_blank" rel="noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600">
                <ExternalLink size={14} /></a>}
            </div>
          </div>
        )}

        {/* Email fields */}
        {(form.applicationType === 'email' || form.applicationType === 'both') && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email sent date</label>
              <input className="input" type="date" value={form.emailSentDate}
                onChange={e => set('emailSentDate', e.target.value)} />
            </div>
            <div>
              <label className="label">Email subject line</label>
              <input className="input" value={form.emailSubject}
                onChange={e => set('emailSubject', e.target.value)}
                placeholder="PhD inquiry — Nikhil Rao (RGUKT)" />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button type="button"
                onClick={() => set('emailReplied', !form.emailReplied)}
                className="flex items-center gap-2 text-sm text-ink-700">
                {form.emailReplied
                  ? <CheckSquare size={16} className="text-sage-600" />
                  : <Square      size={16} className="text-ink-300" />}
                Professor replied
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 3: Deadlines ── */}
      <section>
        <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3 pb-2 border-b border-ink-100">
          Deadlines
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Opens On</label>
            <input className="input" type="date" value={form.startDate}
              onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <label className="label">Application deadline</label>
            <input className="input" type="date" value={form.deadline}
              onChange={e => set('deadline', e.target.value)} />
          </div>
          <div>
            <label className="label">LOR request deadline</label>
            <input className="input" type="date" value={form.lorDeadline}
              onChange={e => set('lorDeadline', e.target.value)} />
          </div>
          <div>
            <label className="label">Expected decision</label>
            <input className="input" type="date" value={form.expectedDecision}
              onChange={e => set('expectedDecision', e.target.value)} />
          </div>
        </div>
      </section>

      {/* ── Section 4: Documents checklist ── */}
      <section>
        <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3 pb-2 border-b border-ink-100">
          Documents required & submitted
        </h3>
        {docsLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-ink-200 border-t-ink-800 rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-ink-400 py-4">
            No documents configured yet.{' '}
            <a href="/settings" className="text-sage-600 hover:underline">
              Set up your documents in Settings
            </a>
          </p>
        ) : (
          <>
            {/* Drive Link */}
            <div className="mb-6">
              <label className="label">Google Drive Folder URL</label>
              <div className="relative">
                <input className="input pr-9" value={form.driveLink}
                  onChange={e => set('driveLink', e.target.value)} 
                  placeholder="https://drive.google.com/drive/folders/…" />
                {form.driveLink && (
                  <a href={form.driveLink} target="_blank" rel="noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <p className="text-xs text-ink-400 mt-1">Link to the folder containing your tailored SOP, CV, and other documents for this application.</p>
            </div>

            {/* Step 1: Select required documents */}
            <div className="mb-6">
              <label className="label">Which documents does this application require?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {documents.map(doc => (
                  <Checkbox
                    key={doc.id}
                    label={doc.name}
                    checked={form.requiredDocs.includes(doc.id)}
                    onChange={v => setRequired(doc.id, v)}
                  />
                ))}
              </div>
              <div className="mt-2 text-xs text-ink-400">
                {form.requiredDocs.length} document{form.requiredDocs.length !== 1 ? 's' : ''} required for this app
              </div>
            </div>

            {/* Step 2: Mark submitted documents (only required ones) */}
            {form.requiredDocs.length > 0 && (
              <div>
                <label className="label">Which required documents have you submitted?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {documents
                    .filter(doc => form.requiredDocs.includes(doc.id))
                    .map(doc => (
                      <Checkbox
                        key={doc.id}
                        label={doc.name}
                        checked={!!form.submittedDocs[doc.id]}
                        onChange={v => setDoc(doc.id, v)}
                      />
                    ))}
                </div>
                <div className="mt-2 text-xs text-ink-400">
                  {Object.values(form.submittedDocs).filter(Boolean).length} / {form.requiredDocs.length} submitted
                </div>
              </div>
            )}

            {form.requiredDocs.length === 0 && (
              <p className="text-sm text-ink-400 py-4">Select required documents above to mark submission status.</p>
            )}
          </>
        )}
      </section>

      {/* ── Section 5: Notes ── */}
      <section>
        <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3 pb-2 border-b border-ink-100">
          Notes & Strategy
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label">Why this lab?</label>
            <textarea className="textarea" rows={3} value={form.whyThisLab}
              onChange={e => set('whyThisLab', e.target.value)}
              placeholder="Alignment with your research, their recent papers you loved, specific project…" />
          </div>
          <div>
            <label className="label">SOP angle / Key points</label>
            <textarea className="textarea" rows={2} value={form.sopAngle}
              onChange={e => set('sopAngle', e.target.value)}
              placeholder="What to emphasize — Stanford internship, IIT KGP collab, medical imaging work…" />
          </div>
          <div>
            <label className="label">Interview notes</label>
            <textarea className="textarea" rows={2} value={form.interviewNotes}
              onChange={e => set('interviewNotes', e.target.value)}
              placeholder="Questions asked, things to follow up on…" />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-ink-100">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial.id ? 'Save changes' : 'Add application'}
        </button>
      </div>
    </form>
  )
}
