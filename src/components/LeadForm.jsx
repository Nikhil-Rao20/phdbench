// src/components/LeadForm.jsx
import { useMemo, useState } from 'react'
import { ExternalLink, AlertTriangle, Star, Target, Shield } from 'lucide-react'
import { useData } from '../hooks/useData'
import { knownEntities, findDuplicate } from '../lib/derive'
import { DEFAULT_RESEARCH_AREAS, PRIORITY, currencyForCountry } from '../lib/model'
import { Field, Input, TextArea, Select, Combobox, CountrySelect, Segmented, DeadlineInput } from './form'
import { Button, cn } from './ui'

const SOURCES = ['LinkedIn', 'Twitter/X', 'Lab website', 'Email list', 'Conference', 'Friend/Referral', 'Cold search', 'Other']

const PRIORITY_OPTIONS = [
  { value: PRIORITY.DREAM,  label: 'Dream',  icon: Star,   help: 'A stretch, and worth it anyway.' },
  { value: PRIORITY.TARGET, label: 'Target', icon: Target, help: 'A realistic, well-matched fit.' },
  { value: PRIORITY.SAFE,   label: 'Safe',   icon: Shield, help: 'Strong chance of admission.' },
]

export default function LeadForm({ initial = {}, onSubmit, onCancel, loading }) {
  const { applications, leads } = useData()
  const entities = useMemo(() => knownEntities(applications, leads), [applications, leads])

  const [form, setForm] = useState({
    university:   initial.university   || '',
    labName:      initial.labName      || '',
    professor:    initial.professor    || '',
    country:      initial.country      || '',
    labUrl:       initial.labUrl       || '',
    linkedinPost: initial.linkedinPost || '',
    // Charter #1: the most common answer, pre-selected and one tap from changing.
    source:       initial.source       || 'LinkedIn',
    researchArea: initial.researchArea || '',
    priority:     initial.priority     || PRIORITY.TARGET,
    startDate:    initial.startDate    || null,
    deadline:     initial.deadline     || null,
    notes:        initial.notes        || '',
    fundingNote:  initial.fundingNote  || '',
  })

  const [touched, setTouched] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Warn before creating a second card for a lab already tracked, rather than
  // discovering the duplicate weeks later.
  const duplicate = useMemo(
    () => findDuplicate(form, applications, leads, initial.id),
    [form.university, form.professor, applications, leads, initial.id],
  )

  const errors = {
    university: !form.university.trim() ? 'A university name is needed to identify this lead.' : null,
    professor: !form.professor.trim() ? 'Who is the professor or contact?' : null,
  }
  const valid = !errors.university && !errors.professor

  const handleSubmit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {duplicate && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-amber-900 leading-relaxed">
            You already have <strong>{duplicate.university}</strong>
            {duplicate.professor ? ` with ${duplicate.professor}` : ''} saved. Adding this
            creates a second, separate record — fine if it is a different position,
            worth checking if not.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="University" required error={touched ? errors.university : null}>
          <Combobox
            value={form.university}
            onChange={v => set('university', v)}
            options={entities.universities}
            placeholder="MIT, ETH Zürich, NUS…"
            invalid={touched && !!errors.university}
          />
        </Field>

        <Field label="Country" hint="Sets the default timezone and currency for this lead's deadlines and fees.">
          <CountrySelect value={form.country} onChange={v => set('country', v)} />
        </Field>

        <Field label="Lab / Group">
          <Input
            value={form.labName}
            onChange={e => set('labName', e.target.value)}
            placeholder="CSAIL, BMIC, Vector Institute…"
          />
        </Field>

        <Field label="Professor" required error={touched ? errors.professor : null}>
          <Combobox
            value={form.professor}
            onChange={v => set('professor', v)}
            options={entities.professors}
            placeholder="Prof. Jane Smith"
            invalid={touched && !!errors.professor}
          />
        </Field>

        <Field label="Research area">
          <Combobox
            value={form.researchArea}
            onChange={v => set('researchArea', v)}
            options={[...new Set([...entities.researchAreas, ...DEFAULT_RESEARCH_AREAS])]}
            placeholder="Medical Imaging…"
          />
        </Field>

        <Field label="Found via">
          <Select value={form.source} onChange={e => set('source', e.target.value)}>
            {SOURCES.map(s => <option key={s}>{s}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="How badly do you want this?" hint="Used to sort your list so the ones that matter most stay visible.">
        <Segmented value={form.priority} onChange={v => set('priority', v)} options={PRIORITY_OPTIONS} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DeadlineInput
          label="Applications open"
          value={form.startDate}
          onChange={v => set('startDate', v)}
          countryCode={form.country}
          hint="If the portal is not open yet, when does it open?"
        />
        <DeadlineInput
          label="Deadline"
          value={form.deadline}
          onChange={v => set('deadline', v)}
          countryCode={form.country}
          hint="The university's own cut-off. PhDBench converts it to your time."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Lab URL">
          <div className="relative">
            <Input
              className="pr-10"
              value={form.labUrl}
              onChange={e => set('labUrl', e.target.value)}
              placeholder="https://lab.university.edu"
            />
            {form.labUrl && (
              <a
                href={form.labUrl} target="_blank" rel="noreferrer"
                title="Open the lab site in a new tab"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600
                           transition-colors duration-120"
              >
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            )}
          </div>
        </Field>

        <Field label="Post / advert URL">
          <Input
            value={form.linkedinPost}
            onChange={e => set('linkedinPost', e.target.value)}
            placeholder="https://linkedin.com/posts/…"
          />
        </Field>
      </div>

      <Field label="Funding / stipend" hint="Whether it is funded is often the single most decisive detail.">
        <Input
          value={form.fundingNote}
          onChange={e => set('fundingNote', e.target.value)}
          placeholder="Fully funded, TV-L E13, RA/TA, self-funded…"
        />
      </Field>

      <Field label="Notes">
        <TextArea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Why this lab interests you, papers of theirs you liked, who to mention…"
        />
      </Field>

      <div className="flex justify-end gap-3 pt-2 border-t border-ink-100">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={touched && !valid}
          disabledReason="Fill in the university and professor first."
        >
          {initial.id ? 'Save changes' : 'Save lead'}
        </Button>
      </div>
    </form>
  )
}
