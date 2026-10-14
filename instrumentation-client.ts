import { reportClientError, trackPageView } from '@/lib/monitoring/client'

// Runs once in the browser before hydration: browser errors go to the admin
// console's error log, and page views to its cookieless analytics.

try {
  window.addEventListener('error', (event) => reportClientError(event.error ?? event.message, 'window', event.filename))
  window.addEventListener('unhandledrejection', (event) => reportClientError(event.reason, 'unhandledrejection'))
  trackPageView(window.location.href)
} catch {
  // Monitoring must never stop the app from starting.
}

// "replace" is how the dashboards apply filters (same page, new query): not a new view.
export function onRouterTransitionStart(url: string, navigationType: 'push' | 'replace' | 'traverse') {
  if (navigationType !== 'replace') trackPageView(url)
}
