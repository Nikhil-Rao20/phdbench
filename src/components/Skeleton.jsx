// src/components/Skeleton.jsx
// Charter #12: a wait should show the shape of what is coming, not a spinner in
// the void. A skeleton that matches the real layout also stops the page jumping
// when data lands.

export function Shimmer({ className = '' }) {
  return (
    <div
      className={`rounded-lg bg-ink-100 animate-shimmer ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, #eceade 0%, #f6f5f0 50%, #eceade 100%)',
        backgroundSize: '200% 100%',
      }}
      aria-hidden="true"
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Shimmer className="h-4 w-2/3" />
          <Shimmer className="h-3 w-1/2" />
        </div>
        <Shimmer className="h-6 w-20 rounded-lg" />
      </div>
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-1.5 w-full rounded-full" />
      <div className="flex gap-2 pt-2">
        <Shimmer className="h-7 w-24 rounded-lg" />
        <Shimmer className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}

export function RowSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-surface p-4 flex items-center gap-4">
      <Shimmer className="h-3 w-3 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-1/3" />
        <Shimmer className="h-3 w-1/4" />
      </div>
      <Shimmer className="h-8 w-20 rounded-lg" />
    </div>
  )
}

export function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-surface p-5 space-y-3">
      <Shimmer className="h-9 w-9 rounded-xl" />
      <Shimmer className="h-8 w-16" />
      <Shimmer className="h-3 w-24" />
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="space-y-2">
        <Shimmer className="h-8 w-48" />
        <Shimmer className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => <StatSkeleton key={i} />)}
      </div>
      <CardGridSkeleton count={3} />
      <span className="sr-only">Loading your data…</span>
    </div>
  )
}
