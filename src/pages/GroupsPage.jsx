// src/pages/GroupsPage.jsx
// Create groups, invite people, leave or delete.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, UserPlus, Trash2, Crown, Mail, LogOut, ShieldCheck, Pencil, Check, X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGroups } from '../hooks/useGroups'
import { useMutation, useToast } from '../hooks/useToast'
import {
  createGroup, renameGroup, inviteMember, removeMember, deleteGroup, leaveGroup,
} from '../lib/groupsDb'
import { isGroupAdmin, LIMITS } from '../lib/access'
import Modal from '../components/Modal'
import { Button, Badge, EmptyState, Tooltip, cn } from '../components/ui'
import { Field, Input } from '../components/form'
import { CardGridSkeleton } from '../components/Skeleton'

function MemberRow({ group, email, member, isMe, canManage, onRemove }) {
  const isOwner = group.createdByEmail === email || member?.role === 'admin'
  const joined = Boolean(member)

  return (
    <li className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ink-50
                   transition-colors duration-120">
      <span className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-medium',
        isOwner ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-500',
      )}>
        {(member?.name || email || '?').charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-ink-800 truncate">
            {member?.name || email}
          </span>
          {isMe && <Badge tone="sky">you</Badge>}
          {isOwner && <Badge tone="amber" icon={Crown}>runs this</Badge>}
          {/* An invitation before first sign-in is a real, visible state —
              otherwise an invited person looks identical to a joined one. */}
          {!joined && <Badge tone="ink" icon={Mail}>invited</Badge>}
        </div>
        {member?.name && <p className="text-xs text-ink-400 truncate">{email}</p>}
      </div>

      {canManage && !isOwner && (
        <Tooltip label={isMe ? 'Leave this group' : 'Remove from group'}>
          <button
            onClick={() => onRemove({ email, uid: member?.uid })}
            aria-label={isMe ? 'Leave group' : `Remove ${email}`}
            className="shrink-0 p-2 rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600
                       opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                       active:scale-90 transition-all duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            {isMe ? <LogOut size={13} aria-hidden="true" /> : <Trash2 size={13} aria-hidden="true" />}
          </button>
        </Tooltip>
      )}
    </li>
  )
}

function GroupCard({ group, index, user, onInvite, onRename, onRemoveMember, onDelete }) {
  const canManage = isGroupAdmin(group, user)
  const emails = group.memberEmails || []
  const byEmail = Object.entries(group.members || {}).reduce((map, [uid, m]) => {
    if (m?.email) map[m.email] = { ...m, uid }
    return map
  }, {})

  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(group.name)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.25 }}
      className="bg-white rounded-2xl border border-ink-100 shadow-surface p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 flex items-center
                           justify-center shrink-0">
            <Users size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {renaming ? (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onRename(group, name); setRenaming(false) }
                    if (e.key === 'Escape') { setName(group.name); setRenaming(false) }
                  }}
                  className="py-1.5 text-sm"
                  aria-label="Group name"
                />
                <button onClick={() => { onRename(group, name); setRenaming(false) }}
                  aria-label="Save name"
                  className="p-1.5 rounded-lg text-sage-600 hover:bg-sage-50">
                  <Check size={14} aria-hidden="true" />
                </button>
                <button onClick={() => { setName(group.name); setRenaming(false) }}
                  aria-label="Cancel"
                  className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100">
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <h2 className="font-display text-lg text-ink-900 leading-tight truncate">
                {group.name}
              </h2>
            )}
            <p className="text-xs text-ink-400 mt-0.5">
              {emails.length} of {LIMITS.membersPerGroup} members
            </p>
          </div>
        </div>

        {canManage && !renaming && (
          <Tooltip label="Rename">
            <button
              onClick={() => setRenaming(true)}
              aria-label="Rename group"
              className="shrink-0 p-2 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700
                         active:scale-90 transition-all duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400"
            >
              <Pencil size={14} aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>

      <ul className="space-y-0.5 -mx-1">
        {emails.map(email => (
          <MemberRow
            key={email}
            group={group}
            email={email}
            member={byEmail[email]}
            isMe={email === String(user?.email || '').toLowerCase()}
            canManage={canManage || email === String(user?.email || '').toLowerCase()}
            onRemove={(who) => onRemoveMember(group, who)}
          />
        ))}
      </ul>

      {canManage && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-ink-100">
          <Button size="sm" variant="secondary" icon={UserPlus}
            onClick={() => onInvite(group)}
            disabled={emails.length >= LIMITS.membersPerGroup}
            disabledReason={`A group can hold at most ${LIMITS.membersPerGroup} people.`}>
            Invite someone
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" icon={Trash2}
            onClick={() => onDelete(group)}
            className="text-rose-600 hover:bg-rose-50">
            Delete group
          </Button>
        </div>
      )}
    </motion.article>
  )
}

export default function GroupsPage() {
  const { user } = useAuth()
  const { groups, groupsLoading, switchGroup } = useGroups()
  const mutate = useMutation()
  const toast = useToast()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [inviteTarget, setInviteTarget] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    const r = await mutate(() => createGroup(user, newName.trim()),
      { failure: 'Could not create that group.' })
    setBusy(false)
    if (r.ok) {
      toast.success(`“${newName.trim()}” created. Invite people to share leads with them.`)
      switchGroup(r.data)
      setNewName('')
      setCreating(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setBusy(true)
    const r = await mutate(() => inviteMember(inviteTarget.id, inviteEmail),
      { failure: 'Could not send that invitation.' })
    setBusy(false)
    if (r.ok) {
      toast.success(
        `${inviteEmail.trim().toLowerCase()} is in. They will see the board once they sign in — they need their own approved account first.`,
      )
      setInviteEmail('')
      setInviteTarget(null)
    }
  }

  const handleRename = (group, name) => {
    if (!name.trim() || name.trim() === group.name) return
    mutate(() => renameGroup(group.id, name), { failure: 'Could not rename that group.' })
  }

  const handleRemoveMember = (group, who) => {
    const myEmail = String(user?.email || '').toLowerCase()
    const leaving = who.email === myEmail

    // Leaving is a different write from removing someone else — a member is
    // only permitted to take their own address out — so it uses its own call.
    mutate(
      () => (leaving ? leaveGroup(group.id, user) : removeMember(group.id, who)),
      {
        success: leaving
          ? 'You have left the group. Leads you added stay on the board.'
          : 'Removed. Their leads stay on the board.',
        failure: leaving ? 'Could not leave that group.' : 'Could not remove them.',
      },
    )
  }

  const handleDelete = async () => {
    const group = deleteTarget
    setDeleteTarget(null)
    await mutate(() => deleteGroup(group.id), {
      success: `“${group.name}” and its leads have been deleted.`,
      failure: 'Could not delete that group.',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Groups</h1>
          <p className="text-ink-500 text-sm mt-1 max-w-prose leading-relaxed">
            A group shares one board of leads. What each of you decides about a
            lead — applied, ruled out, how badly you want it — stays yours.
            Your applications are never shared.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}
          disabled={groups.length >= LIMITS.groups}
          disabledReason={`You can be in at most ${LIMITS.groups} groups.`}>
          New group
        </Button>
      </div>

      {groupsLoading ? (
        <CardGridSkeleton count={2} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Create one to start a shared board. You can use it alone — a group of one works perfectly well — and invite people whenever you want."
          action={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Create a group</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {groups.map((group, i) => (
              <GroupCard
                key={group.id}
                group={group}
                index={i}
                user={user}
                onInvite={setInviteTarget}
                onRename={handleRename}
                onRemoveMember={handleRemoveMember}
                onDelete={setDeleteTarget}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New group"
        description="Give it a name you will recognise in the switcher.">
        <form onSubmit={handleCreate} className="space-y-5">
          <Field label="Group name" required>
            <Input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="RGUKT PhD hunt" maxLength={120} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!newName.trim()}
              disabledReason="Give the group a name first.">
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!inviteTarget} onClose={() => setInviteTarget(null)} title="Invite someone"
        description="They need their own approved PhDBench account before they can see anything.">
        <form onSubmit={handleInvite} className="space-y-5">
          <Field label="Their email" required
            hint="The Google address they sign in with">
            <Input autoFocus type="email" value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="friend@gmail.com" maxLength={200} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setInviteTarget(null)}>Cancel</Button>
            <Button type="submit" variant="primary" icon={UserPlus} loading={busy}
              disabled={!inviteEmail.trim()} disabledReason="Enter their email address.">
              Invite
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete this group?">
        {deleteTarget && (
          <div className="space-y-5">
            <p className="text-sm text-ink-600 leading-relaxed">
              <strong>{deleteTarget.name}</strong> and every lead on its board will be
              permanently removed, for all {(deleteTarget.memberEmails || []).length} members.
              Applications people created from those leads are theirs and stay untouched.
            </p>
            <p className="text-sm text-ink-500">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Keep it</Button>
              <Button variant="danger" icon={Trash2} onClick={handleDelete}>Delete the group</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
