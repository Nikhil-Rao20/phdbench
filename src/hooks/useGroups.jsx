// src/hooks/useGroups.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The groups you belong to, which one you are looking at, and its leads.
//
// Leads are paginated rather than subscribed wholesale. A live subscription to
// an entire collection is fine at twenty records and ruinous at two thousand —
// it downloads every document on every visit, for every member. Here the first
// page is live (so a teammate's new lead appears immediately) and further pages
// are fetched on demand as you scroll.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import { useAuth } from './useAuth'
import { useAccess } from './useAccess'
import { useToast, describeError } from './useToast'
import {
  subscribeMyGroups, subscribeLeadPage, fetchMoreLeads, claimMembership,
} from '../lib/groupsDb'
import { ACCESS, isMember, personalView, isArchivedFor } from '../lib/access'
import { UI_HARNESS } from '../lib/config'
import { harnessGroups, harnessGroupLeads } from '../lib/harnessData'

const GroupsContext = createContext(null)

const STORAGE_KEY = 'phdbench:active-group'
const PAGE_SIZE = 25

const readStoredGroup = () => {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}
const storeGroup = (id) => {
  try { id ? localStorage.setItem(STORAGE_KEY, id) : localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

export function GroupsProvider({ children }) {
  const { user } = useAuth()
  const { state: accessStatus } = useAccess()
  const toast = useToast()

  const [groups, setGroups] = useState(UI_HARNESS ? harnessGroups() : null)
  const [activeId, setActiveId] = useState(() => readStoredGroup())

  const [leads, setLeads] = useState([])
  const [cursor, setCursor] = useState(null)
  const [exhausted, setExhausted] = useState(false)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  // ── Groups ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (UI_HARNESS) return undefined
    if (!user || accessStatus !== ACCESS.APPROVED) { setGroups(null); return undefined }

    return subscribeMyGroups(
      user,
      (list) => setGroups(list),
      (err) => {
        setGroups([])
        toastRef.current.error(
          describeError(err, 'Could not load your groups.'),
          { key: 'load-groups' },
        )
      },
    )
  }, [user, accessStatus])

  const active = useMemo(() => {
    if (!groups?.length) return null
    return groups.find(g => g.id === activeId) || groups[0]
  }, [groups, activeId])

  useEffect(() => {
    if (active?.id && active.id !== activeId) setActiveId(active.id)
  }, [active, activeId])

  /**
   * A stable identity for "which groups am I in".
   *
   * `subscribeMyGroups` delivers a brand-new array on every snapshot, so using
   * `groups` itself in a dependency array re-runs the effect whenever anyone
   * touches any group document — not only when the membership actually changes.
   */
  const groupIds = useMemo(() => (groups || []).map(g => g.id).sort().join('|'), [groups])
  const groupsLoaded = groups !== null

  // An email-only invitation has no uid attached until the invitee first
  // arrives. Doing it here means they never have to be told to "accept" anything.
  //
  // Attempted at most once per group per session. Claiming WRITES to the group
  // document, which produces a new snapshot, which — when this effect depended
  // on the whole `groups` array — re-entered the effect and re-ran every other
  // subscription with it. That feedback loop was the flicker, and it only
  // affected people invited by email: whoever created the group already has
  // their uid attached and never enters this path at all.
  const claimedRef = useRef(new Set())
  useEffect(() => {
    if (UI_HARNESS || !user || !groups?.length) return
    for (const group of groups) {
      if (claimedRef.current.has(group.id)) continue
      if (group.members?.[user.uid] || !isMember(group, user)) continue
      claimedRef.current.add(group.id)
      claimMembership(group.id, user).catch(() => {
        // Let a genuine failure be retried on the next sign-in, not this render.
      })
    }
  }, [groupIds, user])

  // ── Leads, first page live ────────────────────────────────────────────────
  //
  // Keyed on the active group id ONLY. Depending on the groups array rebuilt
  // this subscription every time any group document changed — including the
  // write this hook performs itself when claiming an invitation — and each
  // rebuild flipped leadsLoading back to true, which is what flickered.
  const activeGroupId = active?.id || null
  const groupsLoadedRef = useRef(false)
  useEffect(() => { groupsLoadedRef.current = groupsLoaded }, [groupsLoaded])

  useEffect(() => {
    if (UI_HARNESS) {
      setLeads(harnessGroupLeads())
      setLeadsLoading(false)
      setExhausted(true)
      return undefined
    }

    if (!activeGroupId) {
      setLeads([])
      // Still loading only while the group list itself has not arrived; with no
      // groups at all this is a settled, empty state rather than a pending one.
      setLeadsLoading(!groupsLoadedRef.current)
      setExhausted(true)
      return undefined
    }

    setLeadsLoading(true)
    setCursor(null)
    setExhausted(false)

    return subscribeLeadPage(
      activeGroupId,
      { pageSize: PAGE_SIZE },
      ({ leads: page, cursor: next, exhausted: done }) => {
        // Replaces rather than merges: this is the first page, and a lead
        // deleted by a teammate must disappear rather than linger.
        setLeads(prev => {
          const beyond = prev.filter(l => !page.some(p => p.id === l.id) && l.__page > 0)
          return [...page.map(l => ({ ...l, __page: 0 })), ...beyond]
        })
        setCursor(next)
        setExhausted(done)
        setLeadsLoading(false)
      },
      (err) => {
        setLeads([])
        setLeadsLoading(false)
        toastRef.current.error(
          describeError(err, 'Could not load this group’s leads.'),
          { key: 'load-leads' },
        )
      },
    )
  }, [activeGroupId])

  const loadMore = useCallback(async () => {
    if (!active?.id || exhausted || loadingMore || !cursor) return
    setLoadingMore(true)
    try {
      const { leads: page, cursor: next, exhausted: done } = await fetchMoreLeads(
        active.id, { pageSize: PAGE_SIZE, after: cursor },
      )
      setLeads(prev => {
        const seen = new Set(prev.map(l => l.id))
        const fresh = page.filter(l => !seen.has(l.id)).map(l => ({ ...l, __page: 1 }))
        return [...prev, ...fresh]
      })
      setCursor(next)
      setExhausted(done)
    } catch (err) {
      toastRef.current.error(describeError(err, 'Could not load more leads.'))
    } finally {
      setLoadingMore(false)
    }
  }, [active?.id, cursor, exhausted, loadingMore])

  const switchGroup = useCallback((id) => {
    setActiveId(id)
    storeGroup(id)
  }, [])

  const value = useMemo(() => {
    const uid = user?.uid
    const withMine = leads.map(lead => ({ ...lead, mine: personalView(lead, uid) }))

    return {
      groups: groups || [],
      groupsLoading: groups === null,
      active,
      activeId: active?.id || null,
      switchGroup,

      // Archived is per person, so one member tidying their board never removes
      // a lead from anyone else's.
      leads: withMine.filter(l => !isArchivedFor(l, uid)),
      archivedLeads: withMine.filter(l => isArchivedFor(l, uid)),
      allLeads: withMine,

      leadsLoading,
      loadingMore,
      exhausted,
      loadMore,
      leadById: (id) => withMine.find(l => l.id === id) || null,
    }
  }, [groups, active, leads, leadsLoading, loadingMore, exhausted, loadMore, switchGroup, user?.uid])

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>
}

export function useGroups() {
  const ctx = useContext(GroupsContext)
  if (!ctx) throw new Error('useGroups must be used inside a GroupsProvider')
  return ctx
}
