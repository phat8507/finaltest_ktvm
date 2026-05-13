const GA_MEASUREMENT_ID = 'G-JYVVHP0X6X'

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
    }
  } catch {
    // Ignore analytics failures, including blocked third-party scripts.
  }
}
