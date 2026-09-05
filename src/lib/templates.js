// src/lib/templates.js
// Cold-outreach email templates with merge fields.
//
// Writing the same email to forty professors by hand is where personalisation
// quietly degrades. A template keeps the structure fixed and makes the
// lab-specific parts the only thing you actually have to think about.

export const MERGE_FIELDS = [
  { token: 'professor',  label: 'Professor',        from: 'professor' },
  { token: 'lab',        label: 'Lab / group',      from: 'labName' },
  { token: 'university', label: 'University',       from: 'university' },
  { token: 'department', label: 'Department',       from: 'department' },
  { token: 'area',       label: 'Research area',    from: 'researchArea' },
  { token: 'intake',     label: 'Intake',           from: 'intake' },
  { token: 'deadline',   label: 'Deadline',         from: null },
  { token: 'paper',      label: 'Their paper',      from: null, manual: true },
  { token: 'date',       label: 'Today',            from: null },
  { token: 'me',         label: 'Your name',        from: null },
]

const TOKEN_RE = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g

/**
 * Fill a template from an application.
 *
 * Unresolved tokens are deliberately left in place rather than blanked. A
 * template that silently renders "I read your work on ." reads as careless; one
 * that still shows {{paper}} is obviously unfinished and cannot be sent by
 * accident.
 */
export function fillTemplate(text, { application = {}, profile = null, now = new Date() } = {}) {
  if (!text) return ''

  const values = {
    professor:  application.professor,
    lab:        application.labName,
    university: application.university,
    department: application.department,
    area:       application.researchArea,
    intake:     application.intake,
    deadline:   typeof application.deadline === 'string'
                  ? application.deadline
                  : application.deadline?.date,
    date:       now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    me:         profile?.displayName || '',
  }

  return text.replace(TOKEN_RE, (match, token) => {
    const value = values[token]
    return value ? String(value) : match
  })
}

/** Which tokens a filled template still has outstanding. */
export function unresolvedTokens(filled) {
  const found = new Set()
  let match
  const re = new RegExp(TOKEN_RE.source, 'g')
  while ((match = re.exec(filled)) !== null) found.add(match[1])
  return [...found]
}

export const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-cold',
    name: 'Cold outreach — first contact',
    subject: 'PhD inquiry ({{intake}}) — {{area}} — {{me}}',
    body: `Dear {{professor}},

I am a final-year undergraduate at RGUKT Nuzvid writing to ask whether {{lab}} will be taking PhD students for {{intake}}.

My work is in {{area}}, and I read your paper on {{paper}} closely — [one specific, concrete sentence about what you took from it and how it connects to your own work].

Briefly: [one sentence on your strongest result or experience].

I have attached my CV and transcript. I would be glad to send a longer research statement if that would be useful.

Thank you for your time,
{{me}}`,
  },
  {
    id: 'tpl-followup',
    name: 'Follow-up after silence',
    subject: 'Re: PhD inquiry — {{me}}',
    body: `Dear {{professor}},

I wrote on [date] about PhD openings in {{lab}} for {{intake}}, and I appreciate this is a busy period.

If you are not taking students this cycle, I would be grateful to know so — it helps me plan. If it would help, I am happy to send a short research statement.

Thank you,
{{me}}`,
  },
  {
    id: 'tpl-thanks',
    name: 'After an interview',
    subject: 'Thank you — {{university}} interview',
    body: `Dear {{professor}},

Thank you for the conversation today. [One specific thing discussed that you found genuinely interesting.]

[Answer anything you did not answer well on the call, or send the thing you promised.]

I remain very interested in joining {{lab}}, and I am glad to provide anything further.

Best regards,
{{me}}`,
  },
]
