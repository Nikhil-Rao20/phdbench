// src/hooks/useInfiniteScroll.js
import { useEffect, useRef } from 'react'

/**
 * Call `onLoadMore` when a sentinel element nears the viewport.
 *
 * An IntersectionObserver rather than a scroll listener: scroll fires on every
 * frame and needs throttling to stay smooth, while the observer only wakes when
 * the sentinel actually crosses the threshold.
 *
 * `rootMargin` starts the fetch 400px before the sentinel is visible, so the
 * next page usually arrives before the reader reaches the bottom and the list
 * never visibly stalls.
 */
export function useInfiniteScroll({ onLoadMore, enabled = true, rootMargin = '400px' }) {
  const sentinelRef = useRef(null)
  const callbackRef = useRef(onLoadMore)

  // Held in a ref so a caller passing an inline arrow does not tear down and
  // rebuild the observer on every render.
  useEffect(() => { callbackRef.current = onLoadMore }, [onLoadMore])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !enabled) return undefined

    // Old browsers, and jsdom in tests, have no IntersectionObserver. Without
    // this guard the whole list would fail to render rather than merely lose
    // automatic paging.
    if (typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) callbackRef.current?.() },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, rootMargin])

  return sentinelRef
}
