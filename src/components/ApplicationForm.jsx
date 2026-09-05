// src/components/ApplicationForm.jsx
import { useMemo, useState } from 'react'
import {
  ExternalLink, AlertTriangle, Star, Target, Shield,
  Globe, Mail, Shuffle, Mails, Wallet,
} from 'lucide-react'
import { useData } from '../hooks/useData'
import { knownEntities, findDuplicate, readiness } from '../lib/derive'
import {
  STAGE, STAGES, STAGE_ORDER, PRIORITY, DEFAULT_RESEARCH_AREAS,
  LOR_STATUS, LOR_STATUSES, CURRENCIES, currencyForCountry, suggestedIntake, intakeOptions,
} from '../lib/model'
import {
  Field, Input, TextArea, Select, Combobox, CountrySelect,
  Segmented, Checkbox, DeadlineInput,
} from './form'
import { Button, SectionTitle, Progress, Tooltip, cn } from './ui'

const PRIORITY_OPTIONS = [
  { value: PRIORITY.DREAM,  label: 'Dream',  icon: Star },
  { value: PRIORITY.TARGET, label: 'Target', icon: Target },
  { value: PRIORITY.SAFE,   label: 'Safe',   icon: Shield },
]

const TYPE_OPTIONS = [
  { value: 'portal', label: 'Portal', icon: Globe },
  { value: 'email',  label: 'Email',  icon: Mail },
  { value: 'both',   label: 'Both',   icon: Shuffle },
]

export default function ApplicationForm({ initial = {}, onSubmit, onCancel, loading }) {
  const { applications, leads, documents, profile } = useData()
  const entities = useMemo(() => knownEntities(applications, leads), [applications, leads])
  const recommenders = profile?.recommenders || []

  const [form, setForm] = useState(() => ({
    university:       initial.university       || '',
    department:       initial.department       || '',
    labName:          initial.labName          || '',
    professor:        initial.professor        || '',
    professor2:       initial.professor2       || '',
    country:          initial.country          || '',
    researchArea:     initial.researchArea     || '',
    labUrl:           initial.labUrl           || '',
    professorProfile: initial.professorProfile || '',
    fundingNote:      initial.fundingNote      || '',

    applicationType:  initial.applicationType  || 'portal',
    appUrl:           initial.appUrl           || '',
    applicationId:    initial.applicationId    || '',
    // A new application has not been sent — the old form defaulted to "applied".
    stage:            initial.stage            || STAGE.NOT_STARTED,
    priority:         initial.priority         || PRIORITY.TARGET,
    fitScore:         initial.fitScore         || 0,
    intake:           initial.intake           || suggestedIntake(),

    startDate:        initial.startDate        || null,
    deadline:         initial.deadline         || null,
    lorDeadline:      initial.lorDeadline      || null,
    expectedDecision: initial.expectedDecision || null,

    emailed:          initial.emailed          || null,

    fee: initial.fee || {
      amount: '', currency: '', inrRate: '',
      waiverRequested: false, waiverGranted: false, paid: false,
    },

    requiredDocs:     initial.requiredDocs     || [],
    submittedDocs:    initial.submittedDocs    || initial.docs || {},
    driveLink:        initial.driveLink        || '',
    recommenders:     initial.recommenders     || [],

    whyThisLab:       initial.whyThisLab       || '',
    sopAngle:         initial.sopAngle         || '',
    interviewNotes:   initial.interviewNotes   || '',
  }))

  const [touched, setTouched] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setFee = (k, v) => setForm(f => ({ ...f, fee: { ...f.fee, [k]: v } }))

  // Picking a country supplies the currency, so it is one less thing to answer.
  const currency = form.fee.currency || (form.country ? currencyForCountry(form.country) : 'USD')

  const setRequired = (docId, required) => setForm(f => {
    const nextRequired = required
      ? [...f.requiredDocs, docId]
      : f.requiredDocs.filter(id => id !== docId)
    // Drop the submitted flag when a document stops being required, so the
    // counter can never read "5 / 3 submitted".
    const nextSubmitted = { ...f.submittedDocs }
    if (!required) delete nextSubmitted[docId]
    return { ...f, requiredDocs: nextRequired, submittedDocs: nextSubmitted }
  })

  const setSubmittedDoc = (docId, done) =>
    setForm(f => ({ ...f, submittedDocs: { ...f.submittedDocs, [docId]: done } }))

  const setRecommender = (recommenderId, patch) => setForm(f => {
    const existing = f.recommenders.find(r => r.recommenderId === recommenderId)
    if (!existing) return { ...f, recommenders: [...f.recommenders, { recommenderId, status: LOR_STATUS.NOT_ASKED, ...patch }] }
    return {
      ...f,
      recommenders: f.recommenders.map(r => r.recommenderId === recommenderId ? { ...r, ...patch } : r),
    }
  })

  const toggleRecommender = (recommenderId, on) => setForm(f => ({
    ...f,
    recommenders: on
      ? [...f.recommenders, { recommenderId, status: LOR_STATUS.NOT_ASKED }]
      : f.recommenders.filter(r => r.recommenderId !== recommenderId),
  }))

  const duplicate = useMemo(
    () => findDuplicate(form, applications, leads, initial.id),
    [form.university, form.professor, applications, leads, initial.id],
  )

  const progress = useMemo(() => readiness(form, documents), [form, documents])

  const errors = {
    university: !form.university.trim() ? 'A university name is required.' : null,
    professor: !form.professor.trim() ? 'Name the professor you are applying to.' : null,
  }
  const valid = !errors.university && !errors.professor

  const handleSubmit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    onSubmit({ ...form, fee: { ...form.fee, currency } })
  }

  const showEmail = form.applicationType === 'email' || form.applicationType === 'both'
  const showPortal = form.applicationType === 'portal' || form.applicationType === 'both'

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* Charter #5: momentum shown honestly — this reflects real completion. */}
      <div className="sticky -top-6 z-10 -mx-6 -mt-6 px-6 py-3 bg-white/95 backdrop-blur border-b border-ink-100">
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-500 shrink-0">Readiness</span>
          <Progress value={progress.percent} max={100} label={`${progress.percent}%`} className="flex-1" />
        </div>
      </div>

      {duplicate && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong>{duplicate.university}</strong> is already tracked. Continue if this
            is a genuinely different position.
          </p>
        </div>
      )}

      {/* Lab */}
      <section>
        <SectionTitle>Lab &amp; university</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="University" required error={touched ? errors.university : null}>
            <Combobox value={form.university} onChange={v => set('university', v)}
              options={entities.universities} placeholder="MIT, ETH Zürich…"
              invalid={touched && !!errors.university} />
          </Field>
          <Field label="Country" hint="Sets the deadline timezone and fee currency.">
            <CountrySelect value={form.country} onChange={v => set('country', v)} />
          </Field>
          <Field label="Department">
            <Combobox value={form.department} onChange={v => set('department', v)}
              options={entities.departments} placeholder="EECS, CS, BME…" />
          </Field>
          <Field label="Lab / Group">
            <Input value={form.labName} onChange={e => set('labName', e.target.value)}
              placeholder="CSAIL, Vector Institute…" />
          </Field>
          <Field label="Primary professor" required error={touched ? errors.professor : null}>
            <Combobox value={form.professor} onChange={v => set('professor', v)}
              options={entities.professors} placeholder="Prof. Jane Smith"
              invalid={touched && !!errors.professor} />
          </Field>
          <Field label="Second professor" hint="Co-advisor or collaborator, if there is one.">
            <Combobox value={form.professor2} onChange={v => set('professor2', v)}
              options={entities.professors} placeholder="Optional" />
          </Field>
          <Field label="Research area">
            <Combobox value={form.researchArea} onChange={v => set('researchArea', v)}
              options={[...new Set([...entities.researchAreas, ...DEFAULT_RESEARCH_AREAS])]} />
          </Field>
          <Field label="Funding / stipend">
            <Input value={form.fundingNote} onChange={e => set('fundingNote', e.target.value)}
              placeholder="Fully funded, RA/TA, TV-L E13…" />
          </Field>
          <Field label="Lab URL">
            <div className="relative">
              <Input className="pr-10" value={form.labUrl} onChange={e => set('labUrl', e.target.value)} placeholder="https://…" />
              {form.labUrl && (
                <a href={form.labUrl} target="_blank" rel="noreferrer" title="Open lab site"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600">
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          </Field>
          <Field label="Professor profile URL">
            <div className="relative">
              <Input className="pr-10" value={form.professorProfile}
                onChange={e => set('professorProfile', e.target.value)} placeholder="https://…" />
              {form.professorProfile && (
                <a href={form.professorProfile} target="_blank" rel="noreferrer" title="Open profile"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600">
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          </Field>
        </div>
      </section>

      {/* Stage & route */}
      <section>
        <SectionTitle>Stage &amp; route</SectionTitle>
        <div className="space-y-4">
          <Field label="Where is this right now?"
            hint="Only Submitted and beyond count as a sent application in your statistics.">
            <Select value={form.stage} onChange={e => set('stage', e.target.value)}>
              {STAGE_ORDER.map(s => (
                <option key={s} value={s}>{STAGES[s].label}</option>
              ))}
            </Select>
            <p className="text-xs text-ink-400 mt-1.5 leading-relaxed">
              {STAGES[form.stage]?.help}
            </p>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="How are you applying?">
              <Segmented value={form.applicationType} onChange={v => set('applicationType', v)} options={TYPE_OPTIONS} />
            </Field>
            <Field label="Priority">
              <Segmented value={form.priority} onChange={v => set('priority', v)} options={PRIORITY_OPTIONS} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Intake" hint="Which admission cycle this application is for.">
              <Select value={form.intake} onChange={e => set('intake', e.target.value)}>
                {[...new Set([form.intake, ...intakeOptions()])].filter(Boolean).map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fit" hint="Your own judgement of how well you match this lab.">
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => set('fitScore', form.fitScore === n ? 0 : n)}
                    aria-label={`Fit ${n} of 5`}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium transition-all duration-150 active:scale-90',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400',
                      n <= form.fitScore
                        ? 'bg-ink-900 text-white'
                        : 'bg-ink-50 text-ink-400 hover:bg-ink-100',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {showPortal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Portal URL">
                <div className="relative">
                  <Input className="pr-10" value={form.appUrl} onChange={e => set('appUrl', e.target.value)}
                    placeholder="https://apply.university.edu…" />
                  {form.appUrl && (
                    <a href={form.appUrl} target="_blank" rel="noreferrer" title="Open portal"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600">
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </Field>
              <Field label="Application / reference number"
                hint="Worth recording — you will need it in every email you send them.">
                <Input value={form.applicationId} onChange={e => set('applicationId', e.target.value)}
                  placeholder="e.g. 2027-004471" />
              </Field>
            </div>
          )}

          {showEmail && (
            <div className="rounded-xl border border-ink-200 p-4 space-y-4">
              <p className="text-xs text-ink-500 leading-relaxed">
                Emailing a professor is an action, not a stage — you can be in
                progress and have emailed at the same time.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email sent on">
                  <Input type="date" value={form.emailed?.sentAt || ''}
                    onChange={e => set('emailed', { ...(form.emailed || {}), sentAt: e.target.value })} />
                </Field>
                <Field label="Subject line">
                  <Input value={form.emailed?.subject || ''}
                    onChange={e => set('emailed', { ...(form.emailed || {}), subject: e.target.value })}
                    placeholder="PhD inquiry — Nikhil Rao" />
                </Field>
              </div>
              <Checkbox
                checked={Boolean(form.emailed?.replied)}
                onChange={v => set('emailed', { ...(form.emailed || {}), replied: v })}
                label="The professor replied"
              />
            </div>
          )}
        </div>
      </section>

      {/* Deadlines */}
      <section>
        <SectionTitle>Deadlines</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DeadlineInput label="Applications open" value={form.startDate}
            onChange={v => set('startDate', v)} countryCode={form.country} />
          <DeadlineInput label="Application deadline" value={form.deadline}
            onChange={v => set('deadline', v)} countryCode={form.country}
            hint="The university's own cut-off — PhDBench shows it in your time too." />
          <DeadlineInput label="Recommendation deadline" value={form.lorDeadline}
            onChange={v => set('lorDeadline', v)} countryCode={form.country}
            hint="Often earlier than the application deadline." />
          <DeadlineInput label="Decision expected / offer reply by" value={form.expectedDecision}
            onChange={v => set('expectedDecision', v)} countryCode={form.country} />
        </div>
      </section>

      {/* Fee */}
      <section>
        <SectionTitle>Application fee</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Amount">
            <Input type="number" min="0" step="1" value={form.fee.amount}
              onChange={e => setFee('amount', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={e => setFee('currency', e.target.value)}>
              {Object.entries(CURRENCIES).map(([code, meta]) => (
                <option key={code} value={code}>{code} — {meta.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Rate to ₹" hint="Roughly what one unit costs in rupees, so totals stay meaningful.">
            <Input type="number" min="0" step="0.01" value={form.fee.inrRate}
              onChange={e => setFee('inrRate', e.target.value)}
              placeholder={currency === 'INR' ? '1' : 'e.g. 88.4'} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-2">
          <Checkbox checked={form.fee.waiverRequested} onChange={v => setFee('waiverRequested', v)} label="Waiver requested" />
          <Checkbox checked={form.fee.waiverGranted} onChange={v => setFee('waiverGranted', v)} label="Waiver granted" />
          <Checkbox checked={form.fee.paid} onChange={v => setFee('paid', v)} label="Paid" />
        </div>
      </section>

      {/* Recommenders */}
      <section>
        <SectionTitle>Recommendation letters</SectionTitle>
        {recommenders.length === 0 ? (
          <p className="text-sm text-ink-400 py-3 leading-relaxed">
            No recommenders saved yet. Add them in Settings and they will appear here
            for every application.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-ink-500 leading-relaxed mb-3">
              A missing letter does not announce itself — the portal simply never
              completes. Tick who is writing for this one.
            </p>
            {recommenders.map(rec => {
              const entry = form.recommenders.find(r => r.recommenderId === rec.id)
              return (
                <div key={rec.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl bg-ink-50">
                  <div className="flex-1 min-w-0">
                    <Checkbox
                      checked={Boolean(entry)}
                      onChange={v => toggleRecommender(rec.id, v)}
                      label={rec.name}
                      className="!px-0 !py-0 hover:!bg-transparent"
                    />
                    <p className="text-xs text-ink-400 pl-7 truncate">{rec.institution}</p>
                  </div>
                  {entry && (
                    <Select
                      value={entry.status}
                      onChange={e => setRecommender(rec.id, { status: e.target.value })}
                      className="sm:w-44 text-xs py-2"
                      aria-label={`Status for ${rec.name}`}
                    >
                      {Object.entries(LOR_STATUSES).map(([value, meta]) => (
                        <option key={value} value={value}>{meta.label}</option>
                      ))}
                    </Select>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Documents */}
      <section>
        <SectionTitle>Documents</SectionTitle>
        <Field label="Google Drive folder"
          hint="Where the tailored SOP and CV for this application live."
          className="mb-5">
          <div className="relative">
            <Input className="pr-10" value={form.driveLink} onChange={e => set('driveLink', e.target.value)}
              placeholder="https://drive.google.com/drive/folders/…" />
            {form.driveLink && (
              <a href={form.driveLink} target="_blank" rel="noreferrer" title="Open folder"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-sage-600">
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </Field>

        {documents.length === 0 ? (
          <p className="text-sm text-ink-400 py-3">Setting up your document checklist…</p>
        ) : (
          <>
            <Field label="Which documents does this application require?">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                {documents.map(doc => (
                  <Checkbox key={doc.id} label={doc.name}
                    checked={form.requiredDocs.includes(doc.id)}
                    onChange={v => setRequired(doc.id, v)} />
                ))}
              </div>
            </Field>

            {form.requiredDocs.length > 0 && (
              <Field label="Which of those have you submitted?" className="mt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                  {documents.filter(d => form.requiredDocs.includes(d.id)).map(doc => (
                    <Checkbox key={doc.id} label={doc.name}
                      checked={Boolean(form.submittedDocs[doc.id])}
                      onChange={v => setSubmittedDoc(doc.id, v)} />
                  ))}
                </div>
              </Field>
            )}
          </>
        )}
      </section>

      {/* Notes */}
      <section>
        <SectionTitle>Notes &amp; strategy</SectionTitle>
        <div className="space-y-4">
          <Field label="Why this lab?">
            <TextArea value={form.whyThisLab} onChange={e => set('whyThisLab', e.target.value)}
              placeholder="Their recent papers, the specific project, why you fit…" />
          </Field>
          <Field label="SOP angle">
            <TextArea rows={2} value={form.sopAngle} onChange={e => set('sopAngle', e.target.value)}
              placeholder="What to lead with for this one specifically…" />
          </Field>
          <Field label="Interview notes">
            <TextArea rows={2} value={form.interviewNotes} onChange={e => set('interviewNotes', e.target.value)}
              placeholder="Questions asked, things to follow up on…" />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4 border-t border-ink-100">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={loading}
          disabled={touched && !valid}
          disabledReason="Fill in the university and professor first.">
          {initial.id ? 'Save changes' : 'Add application'}
        </Button>
      </div>
    </form>
  )
}
