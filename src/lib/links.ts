const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'drive.google.com', 'photos.google.com', 'photos.app.goo.gl']

/**
 * Videos are never stored in the app (spec §9 extended to video: large blobs risk IndexedDB
 * eviction and bloat the JSON backup) — they live as links to the user's gallery/cloud instead.
 * This just recognizes common video hosts to label a resource link as a video in the UI.
 */
export function isVideoLink(url?: string): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}
