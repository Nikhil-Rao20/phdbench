// src/components/EmailComposer.jsx
// Pick a template, see it filled in for this specific application, copy it.

import { useMemo, useState } from 'react'
import { Copy, Mail, AlertTriangle } from 'lucide-react'
import { useData, useCopy } from '../hooks/useData'
import { fillTemplate, unresolvedTokens, DEFAULT_TEMPLATES } from '../lib/templates'
import { Button, CopiedPill, cn } from './ui'
import { Select } from './form'

export default function EmailComposer({ application }) {
  const { profile } = useData()
  const { copied, copy } = useCopy()

  const templates = profile?.emailTemplates?.length ? profile.emailTemplates : DEFAULT_TEMPLATES
  const [templateId, setTemplateId] = useState(templates[0]?.id)

  const template = templates.find(t => t.id === templateId) || templates[0]

  const filled = useMemo(() => ({
    subject: fillTemplate(template?.subject, { application, profile }),
    body: fillTemplate(template?.body, { application, profile }),
  }), [template, application, profile])

  const outstanding = useMemo(
    () => unresolvedTokens(`${filled.subject}\n${filled.body}`),
    [filled],
  )

  const mailto = `mailto:?subject=${encodeURIComponent(filled.subject)}&body=${encodeURIComponent(filled.body)}`

  if (!template) return null

  return (
    <div className="space-y-3">
      <Select
        value={templateId}
        onChange={e => setTemplateId(e.target.value)}
        aria-label="Email template"
        className="text-sm"
      >
        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>

      <div className="rounded-xl border border-ink-200 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 border-b border-ink-200">
          <span className="text-2xs text-ink-400 uppercase tracking-wider shrink-0">Subject</span>
          <span className="text-xs text-ink-800 truncate flex-1">{filled.subject}</span>
          <button
            onClick={() => copy(filled.subject, 'subject')}
            aria-label="Copy subject"
            className="text-ink-400 hover:text-ink-800 transition-colors duration-120 shrink-0"
          >
            <Copy size={12} aria-hidden="true" />
          </button>
        </div>
        <pre className="px-3 py-3 text-xs text-ink-700 whitespace-pre-wrap font-body
                        leading-relaxed max-h-56 overflow-y-auto">
          {filled.body}
        </pre>
      </div>

      {/* Left-in tokens are the point: they mark what still needs your judgement,
          and make it impossible to send a half-finished email by accident. */}
      {outstanding.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50
                      border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Still to fill in yourself: {outstanding.map(t => `{{${t}}}`).join(', ')} — plus
            anything in square brackets. These are the parts that make it not a form letter.
          </span>
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm" variant="primary" icon={Copy}
          onClick={() => copy(`${filled.subject}\n\n${filled.body}`, 'all')}
        >
          Copy the whole email
        </Button>
        <a
          href={mailto}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                     bg-white text-ink-700 border border-ink-200 hover:bg-ink-50
                     active:scale-[0.97] transition-all duration-150"
        >
          <Mail size={13} aria-hidden="true" /> Open in mail app
        </a>
        <CopiedPill show={copied === 'all' || copied === 'subject'} />
      </div>
    </div>
  )
}
