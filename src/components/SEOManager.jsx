import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, trackPageView } from '../lib/analytics'

const BASE_URL = import.meta.env.BASE_URL || '/'
const SITE_NAME = 'PhDBench'

const ROUTE_META = {
  '/': {
    title: 'PhD Application Management System',
    description: 'Track PhD applications, leads, deadlines, documents, follow-ups, and progress in one clean dashboard by PhDBench.',
  },
  '/leads': {
    title: 'PhD Leads Tracker',
    description: 'Save and manage PhD leads from professors, labs, and university pages with structured notes and status updates.',
  },
  '/applications': {
    title: 'PhD Applications Tracker',
    description: 'Manage your PhD applications with statuses, required documents, follow-ups, and timeline visibility.',
  },
  '/deadlines': {
    title: 'PhD Deadlines Manager',
    description: 'Never miss application, LOR, or decision deadlines with a deadline-first planner designed for PhD applicants.',
  },
  '/stats': {
    title: 'PhD Application Analytics',
    description: 'Analyze your application pipeline with insights for statuses, documents, response rates, and research focus trends.',
  },
  '/settings': {
    title: 'PhD Tracker Settings',
    description: 'Customize your document workflow and application tracking preferences in PhDBench settings.',
  },
}

function upsertMeta(attr, value, content) {
  let el = document.head.querySelector(`meta[${attr}="${value}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, value)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

function upsertStructuredData(data) {
  let script = document.head.querySelector('script#seo-webpage-schema')
  if (!script) {
    script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'seo-webpage-schema'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(data)
}

export default function SEOManager({ isAuthenticated }) {
  const { pathname } = useLocation()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    const fallback = {
      title: 'Nikhil Rao\'s PhD Application Manager',
      description: 'PhDBench helps track PhD leads, applications, deadlines, and documents with a focused workflow for higher-study applicants.',
    }

    const routeMeta = isAuthenticated ? (ROUTE_META[pathname] || fallback) : fallback
    const fullTitle = `${routeMeta.title} | ${SITE_NAME}`

    const baseClean = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL
    const routePath = pathname === '/' ? '' : pathname
    const canonicalUrl = new URL(`${baseClean}${routePath}`, window.location.origin).toString()
    const imageUrl = new URL(`${baseClean}/NikhilRao.png`, window.location.origin).toString()

    document.title = fullTitle

    upsertMeta('name', 'description', routeMeta.description)
    upsertMeta('name', 'keywords', 'PhdBench, PhD Application Management System, Nikhil Rao, PhD tracker, graduate application tracker')
    upsertMeta('name', 'robots', 'index, follow')
    upsertMeta('name', 'author', 'Nikhil Rao')

    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', routeMeta.description)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:image', imageUrl)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', routeMeta.description)
    upsertMeta('name', 'twitter:image', imageUrl)

    upsertCanonical(canonicalUrl)

    upsertStructuredData({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: fullTitle,
      description: routeMeta.description,
      url: canonicalUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: new URL(baseClean || '/', window.location.origin).toString(),
      },
      creator: {
        '@type': 'Person',
        name: 'Nikhil Rao',
      },
    })

    trackPageView(pathname, fullTitle)
  }, [pathname, isAuthenticated])

  return null
}
