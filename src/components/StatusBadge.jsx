// src/components/StatusBadge.jsx
const CONFIG = {
  lead:      { label: 'Lead',      cls: 'badge-lead' },
  converted: { label: 'Converted', cls: 'badge-converted' },
  applied:   { label: 'Applied',   cls: 'badge-applied' },
  emailed:   { label: 'Emailed',   cls: 'badge-emailed' },
  interview: { label: 'Interview', cls: 'badge-interview' },
  offer:     { label: 'Offer 🎉',  cls: 'badge bg-green-100 text-green-700' },
  rejected:  { label: 'Rejected',  cls: 'badge-rejected' },
}

export default function StatusBadge({ status }) {
  const c = CONFIG[status] || { label: status, cls: 'badge bg-ink-100 text-ink-500' }
  return <span className={`badge ${c.cls}`}>{c.label}</span>
}
