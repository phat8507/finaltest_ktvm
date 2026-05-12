const GA_MEASUREMENT_ID = 'G-JYVVHP0X6X'

export function trackPageView(path) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: path,
      })
    }
  } catch {
    // Ignore analytics failures, including blocked third-party scripts.
  }
}

export function trackEvent(action, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', action, params)
    }
  } catch {
    // Ignore analytics failures, including blocked third-party scripts.
  }
}
