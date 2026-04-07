let analyticsInitialized = false

const getMeasurementId = () => {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID
  return typeof id === 'string' ? id.trim() : ''
}

export function initAnalytics() {
  const measurementId = getMeasurementId()
  if (!measurementId || analyticsInitialized) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }

  window.gtag = window.gtag || gtag
  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  })

  analyticsInitialized = true
}

export function trackPageView(path, title) {
  const measurementId = getMeasurementId()
  if (!measurementId || typeof window.gtag !== 'function') return

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  })
}

export function trackEvent(eventName, params = {}) {
  const measurementId = getMeasurementId()
  if (!measurementId || typeof window.gtag !== 'function') return

  window.gtag('event', eventName, params)
}
