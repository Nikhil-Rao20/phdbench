// src/components/LeadMigration.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Move a private lead list onto a shared board.
//
// Shown only while there is something to move. It states the three guarantees
// plainly before offering the button, because "what exactly is this about to do
// to my data" is the only question that matters here, and a migration that
// cannot answer it should not be run.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRightLeft, CheckCircle2, ShieldCheck, Copy, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGroups } from '../hooks/useGroups'
import { useData } from '../hooks/useData'
import { useMutation, useToast } from '../hooks/useToast'
import { planGroupMigration, migrateLeadsToGroup } from '../lib/migrateToGroups'
import { UI_HARNESS } from '../lib/config'
import { Button, Badge, cn } from '../components/ui'
import { Select } from '../components/form'

const STATE_LABELS = {
  active: 'still active',
  converted: 'already applied',
  not_interested: 'ruled out',
  expired: 'window closed',
}

function Guarantee({ children }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-ink-600 leading-relaxed">
      <ShieldCheck size={15} className="text-sage-600 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

export default function LeadMigration() {
  const { user } = useAuth()
  const { groups, active, switchGroup } = useGroups()
  const { allLeads } = useData()
  const mutate = useMutation()
  const toast = useToast()

  const [plan, setPlan] = useState(null)
  const [targetId, setTargetId] = useState(active?.id || '')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => { if (active?.id && !targetId) setTargetId(active.id) }, [active, targetId])

  /**
   * Whether there is anything at all in the old private collection.
   *
   * Read from the subscription the app already holds rather than a fresh query.
   * This component used to run two `getDocs` every time Settings opened — for
   * most people to discover there was nothing to do.
   */
  const hasLegacyLeads = (allLeads || []).length > 0

  // Look before offering. A migration that has already run has nothing to say,
  // so the section removes itself rather than sitting there permanently
  // announcing a finished job — which is noise on a page you visit for other
  // reasons.
  useEffect(() => {
    if (UI_HARNESS || !user || !targetId || !hasLegacyLeads) { setPlan(null); return undefined }
    let cancelled = false
    planGroupMigration(user.uid, targetId)
      .then(p => { if (!cancelled) setPlan(p) })
      .catch(() => { if (!cancelled) setPlan(null) })
    return () => { cancelled = true }
  }, [user, targetId, hasLegacyLeads, done])

  // Nothing to move, or everything already moved: render nothing at all.
  // `done` keeps the confirmation on screen for the run that just happened, so
  // the panel does not vanish mid-sentence at the moment it succeeds.
  if (!plan || plan.total === 0) return null
  if (plan.toCopy === 0 && !done) return null

  const run = async () => {
    setBusy(true)
    setProgress({ copied: 0, total: plan.toCopy })

    const r = await mutate(
      () => migrateLeadsToGroup(user.uid, targetId, user, { onProgress: setProgress }),
      { failure: 'The copy did not finish. Your original leads are untouched — you can run it again.' },
    )

    setBusy(false)
    setProgress(null)
    if (r.ok) {
      setDone(r.data)
      toast.success(
        `${r.data.copied} lead${r.data.copied === 1 ? '' : 's'} copied to the shared board.`,
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center
                         justify-center shrink-0">
          <ArrowRightLeft size={17} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-ink-900">
            {nothingLeft ? 'Your leads are on the shared board' : 'Move your leads to a shared board'}
          </h3>

          {nothingLeft ? (
            <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">
              All {plan.total} are already there. Your private copies remain where
              they were, untouched, in case you ever want them back.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">
                You have <strong>{plan.toCopy}</strong> lead{plan.toCopy === 1 ? '' : 's'} saved
                privately, from before boards were shared.
                {plan.skipped > 0 && ` ${plan.skipped} have already been copied and will be skipped.`}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {Object.entries(plan.byState).map(([state, count]) => (
                  <Badge key={state} tone={state === 'converted' ? 'sage' : state === 'active' ? 'sky' : 'ink'}>
                    {count} {STATE_LABELS[state] || state}
                  </Badge>
                ))}
              </div>

              <ul className="space-y-2 mt-4">
                <Guarantee>
                  <strong>Your applications are not touched.</strong> Not read, not
                  written, not moved — portal links, fees and notes all stay exactly
                  as they are.
                </Guarantee>
                <Guarantee>
                  <strong>Leads are copied, not moved.</strong> The originals stay in
                  your private space as a fallback.
                </Guarantee>
                <Guarantee>
                  <strong>Your decisions stay yours.</strong> A lead you already
                  applied to shows as applied for you, and as a fresh opportunity for
                  everyone else in the group.
                </Guarantee>
              </ul>

              {groups.length > 1 && (
                <div className="mt-4">
                  <label htmlFor="migrate-target" className="text-xs font-medium text-ink-500
                                                             uppercase tracking-wider">
                    Copy into
                  </label>
                  <Select
                    id="migrate-target"
                    value={targetId}
                    onChange={e => setTargetId(e.target.value)}
                    className="mt-1.5"
                    disabled={busy}
                  >
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-3 mt-4">
                <Button variant="primary" icon={Copy} onClick={run} loading={busy}
                  disabled={!targetId}
                  disabledReason="Create a group first.">
                  {busy
                    ? `Copying ${progress?.copied ?? 0} of ${progress?.total ?? plan.toCopy}…`
                    : `Copy ${plan.toCopy} lead${plan.toCopy === 1 ? '' : 's'}`}
                </Button>
                {!busy && (
                  <span className="text-xs text-ink-400">
                    Safe to run more than once.
                  </span>
                )}
              </div>
            </>
          )}

          {done && (
            <div className="flex items-center gap-2 mt-4 text-sm text-sage-700">
              <CheckCircle2 size={15} aria-hidden="true" />
              Copied {done.copied}, skipped {done.skipped} already there.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
