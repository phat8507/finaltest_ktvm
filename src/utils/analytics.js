const GA_MEASUREMENT_ID = 'G-JYVVHP0X6X'
const CLIENT_ID_KEY = 'macro_ga_client_id'

export function getCurrentPagePath() {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function getCommonParams() {
  if (typeof window === 'undefined') return {}
  return {
    send_to: GA_MEASUREMENT_ID,
    transport_type: 'beacon',
    debug_mode: new URLSearchParams(window.location.search).has('ga_debug'),
  }
}

function getClientId() {
  if (typeof window === 'undefined') return '555.555'
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY)
    if (existing) return existing
    const id = `${Date.now()}.${Math.floor(Math.random() * 1000000000)}`
    localStorage.setItem(CLIENT_ID_KEY, id)
    return id
  } catch {
    return `${Date.now()}.${Math.floor(Math.random() * 1000000000)}`
  }
}

function collectFallback(eventName, params = {}) {
  try {
    if (typeof window === 'undefined') return
    const search = new URLSearchParams({
      v: '2',
      tid: GA_MEASUREMENT_ID,
      cid: getClientId(),
      en: eventName,
      dl: window.location.href,
      dt: document.title,
      ul: navigator.language || 'vi-vn',
      sr: `${window.screen.width}x${window.screen.height}`,
      _p: String(Date.now()),
    })

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && typeof value !== 'object') {
        search.set(`ep.${key}`, String(value))
      }
    })

    const url = `https://www.google-analytics.com/g/collect?${search.toString()}`
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url)
    } else {
      fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => {})
    }
  } catch {
    // Ignore analytics fallback failures.
  }
}

function isGoogleTagLoaded() {
  return typeof window !== 'undefined' && Boolean(window.google_tag_manager)
}

export function trackPageView(path) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('config', GA_MEASUREMENT_ID, {
        ...getCommonParams(),
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      })
      window.gtag('event', 'page_view', {
        ...getCommonParams(),
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      })
      window.setTimeout(() => {
        if (!isGoogleTagLoaded()) {
          collectFallback('page_view', {
            page_path: path,
            app: 'macro_quiz',
          })
        }
      }, 1500)
    } else {
      collectFallback('page_view', {
        page_path: path,
        app: 'macro_quiz',
      })
    }
  } catch {
    // Ignore analytics failures, including blocked third-party scripts.
  }
}

export function trackEvent(action, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', action, {
        ...getCommonParams(),
        ...params,
      })
      window.setTimeout(() => {
        if (!isGoogleTagLoaded()) {
          collectFallback(action, params)
        }
      }, 1500)
    } else {
      collectFallback(action, params)
    }
  } catch {
    // Ignore analytics failures, including blocked third-party scripts.
  }
}
