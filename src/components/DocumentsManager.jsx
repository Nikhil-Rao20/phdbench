import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, GripVertical, Edit2, Check, X } from 'lucide-react'
import { getDocuments, addDocument, updateDocument, deleteDocument } from '../lib/db'

export default function DocumentsManager({ uid }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newDocName, setNewDocName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState(null)

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const docs = await getDocuments(uid)
      setDocuments(docs)
      setError(null)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (uid) loadDocuments()
  }, [uid])

  const handleAdd = async () => {
    if (!newDocName.trim()) return
    try {
      await addDocument(uid, { name: newDocName })
      setNewDocName('')
      await loadDocuments()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleUpdate = async (id) => {
    if (!editingName.trim()) return
    try {
      await updateDocument(uid, id, { name: editingName })
      setEditingId(null)
      await loadDocuments()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteDocument(uid, id)
      await loadDocuments()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-ink-600 uppercase tracking-wider mb-3">
          Your Documents
        </h3>
        <p className="text-xs text-ink-400 mb-4">
          Define the documents you typically submit. These will appear as checkboxes when adding applications.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Add new document */}
      <div className="flex gap-2">
        <input
          type="text"
          className="input"
          placeholder="Add a new document type (e.g., 'Portfolio', 'GitHub')"
          value={newDocName}
          onChange={e => setNewDocName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          className="btn-primary shrink-0"
          onClick={handleAdd}
          disabled={!newDocName.trim()}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-20">
          <div className="w-5 h-5 border-2 border-ink-200 border-t-ink-800 rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-center text-ink-400 text-sm py-6">No documents yet. Add one to get started.</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100"
              >
                <div className="text-ink-300 cursor-grab">
                  <GripVertical size={14} />
                </div>

                {editingId === doc.id ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      className="input flex-1 text-sm"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdate(doc.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <button
                      className="btn-ghost p-1.5 text-sage-600"
                      onClick={() => handleUpdate(doc.id)}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="btn-ghost p-1.5 text-ink-400"
                      onClick={() => setEditingId(null)}
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-ink-800">{doc.name}</span>
                    <button
                      className="btn-ghost p-1.5"
                      onClick={() => {
                        setEditingId(doc.id)
                        setEditingName(doc.name)
                      }}
                    >
                      <Edit2 size={13} className="text-ink-400" />
                    </button>
                    <button
                      className="btn-ghost p-1.5 text-rose-500 hover:bg-rose-50"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
