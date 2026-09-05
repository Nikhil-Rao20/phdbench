import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, Check, X, ArrowUp, ArrowDown } from 'lucide-react'
import { useData, useUid } from '../hooks/useData'
import { useToast, useMutation } from '../hooks/useToast'
import { addDocument, updateDocument, deleteDocument, reorderDocuments } from '../lib/db'
import { Button, Tooltip, cn } from './ui'
import { Input } from './form'

export default function DocumentsManager() {
  const uid = useUid()
  const { documents } = useData()
  const toast = useToast()
  const mutate = useMutation()

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    const r = await mutate(() => addDocument(uid, { name }), {
      success: `Added “${name}”.`,
      failure: 'Could not add that document type.',
    })
    if (r.ok) setNewName('')
  }

  const handleUpdate = async (id) => {
    const name = editingName.trim()
    if (!name) return
    const r = await mutate(() => updateDocument(uid, id, { name }), {
      failure: 'Could not rename that document.',
    })
    if (r.ok) setEditingId(null)
  }

  /**
   * Deleting a document type also strips its id from every application, so a
   * progress bar can never end up counting a document that no longer exists.
   * The count of affected applications is reported, because silently rewriting
   * records is exactly the kind of thing a user should be told about.
   */
  const handleDelete = async (doc) => {
    const r = await mutate(() => deleteDocument(uid, doc.id), {
      failure: 'Could not delete that document type.',
    })
    if (!r.ok) return
    const affected = r.data
    toast.success(
      affected > 0
        ? `“${doc.name}” removed, and cleared from ${affected} application${affected === 1 ? '' : 's'}.`
        : `“${doc.name}” removed.`,
    )
  }

  const move = (index, direction) => {
    const next = [...documents]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    mutate(() => reorderDocuments(uid, next.map(d => d.id)), {
      failure: 'Could not reorder your documents.',
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-500 leading-relaxed max-w-prose">
        The documents you submit. These become the checklist on every application,
        so you can mark which ones each university requires and which you have sent.
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="Add a document type — Portfolio, GitHub, Research proposal…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          aria-label="New document name"
        />
        <Button
          variant="primary" icon={Plus} onClick={handleAdd}
          disabled={!newName.trim()} disabledReason="Type a name first."
        >
          Add
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className="text-center text-ink-400 text-sm py-8">
          Setting up your default checklist…
        </p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {documents.map((doc, i) => (
              <motion.li
                key={doc.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="group flex items-center gap-2 p-2.5 rounded-xl bg-ink-50 border border-ink-100"
              >
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => move(i, -1)} disabled={i === 0}
                    aria-label="Move up"
                    className="p-0.5 text-ink-300 hover:text-ink-700 disabled:opacity-25
                               disabled:cursor-not-allowed transition-colors duration-120"
                  >
                    <ArrowUp size={12} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => move(i, 1)} disabled={i === documents.length - 1}
                    aria-label="Move down"
                    className="p-0.5 text-ink-300 hover:text-ink-700 disabled:opacity-25
                               disabled:cursor-not-allowed transition-colors duration-120"
                  >
                    <ArrowDown size={12} aria-hidden="true" />
                  </button>
                </div>

                {editingId === doc.id ? (
                  <>
                    <Input
                      autoFocus value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleUpdate(doc.id) }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 py-1.5"
                      aria-label="Document name"
                    />
                    <Tooltip label="Save">
                      <button onClick={() => handleUpdate(doc.id)} aria-label="Save"
                        className="p-1.5 rounded-lg text-sage-600 hover:bg-sage-50 transition-colors duration-120">
                        <Check size={14} aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Cancel">
                      <button onClick={() => setEditingId(null)} aria-label="Cancel"
                        className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 transition-colors duration-120">
                        <X size={14} aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-ink-800 truncate">{doc.name}</span>
                    <Tooltip label="Rename">
                      <button
                        onClick={() => { setEditingId(doc.id); setEditingName(doc.name) }}
                        aria-label={`Rename ${doc.name}`}
                        className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-200 hover:text-ink-700
                                   opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                                   transition-all duration-150"
                      >
                        <Edit2 size={13} aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Delete — also clears it from every application">
                      <button
                        onClick={() => handleDelete(doc)}
                        aria-label={`Delete ${doc.name}`}
                        className="p-1.5 rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600
                                   opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                                   transition-all duration-150"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
