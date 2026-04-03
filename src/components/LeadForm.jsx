// src/components/LeadForm.jsx
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

const SOURCES = ['LinkedIn', 'Twitter/X', 'Lab website', 'Email list', 'Conference', 'Friend/Referral', 'Other']
const AREAS   = ['Computer Vision', 'NLP / LLM', 'Medical Imaging', 'Robotics', 'ML Theory', 'Multimodal AI', 'Reinforcement Learning', 'Other']

export default function LeadForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    university:   initial.university   || '',
    labName:      initial.labName      || '',
    professor:    initial.professor    || '',
    labUrl:       initial.labUrl       || '',
    linkedinPost: initial.linkedinPost || '',
    source:       initial.source       || 'LinkedIn',
    researchArea: initial.researchArea || '',
    notes:        initial.notes        || '',
    fundingNote:  initial.fundingNote  || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = e => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">University *</label>
          <input className="input" required value={form.university}
            onChange={e => set('university', e.target.value)}
            placeholder="MIT, Stanford, CMU…" />
        </div>
        <div>
          <label className="label">Lab / Group name</label>
          <input className="input" value={form.labName}
            onChange={e => set('labName', e.target.value)}
            placeholder="CSAIL, SAIL, LTI…" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Professor *</label>
          <input className="input" required value={form.professor}
            onChange={e => set('professor', e.target.value)}
            placeholder="Prof. Jane Smith" />
        </div>
        <div>
          <label className="label">Research area</label>
          <select className="select" value={form.researchArea}
            onChange={e => set('researchArea', e.target.value)}>
            <option value="">— Select —</option>
            {AREAS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Lab URL</label>
        <div className="relative">
          <input className="input pr-10" value={form.labUrl}
            onChange={e => set('labUrl', e.target.value)}
            placeholder="https://lab.cs.university.edu" />
          {form.labUrl && (
            <a href={form.labUrl} target="_blank" rel="noreferrer"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600">
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>

      <div>
        <label className="label">LinkedIn / Tweet post URL</label>
        <input className="input" value={form.linkedinPost}
          onChange={e => set('linkedinPost', e.target.value)}
          placeholder="https://linkedin.com/posts/…" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Found via</label>
          <select className="select" value={form.source}
            onChange={e => set('source', e.target.value)}>
            {SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Funding / Stipend note</label>
          <input className="input" value={form.fundingNote}
            onChange={e => set('fundingNote', e.target.value)}
            placeholder="RA/TA/Fellowship available…" />
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="textarea" rows={3} value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Why this lab interests you, keywords from their recent papers…" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial.id ? 'Save changes' : 'Save lead'}
        </button>
      </div>
    </form>
  )
}
