// Service Worker NOMA — Cache des assets statiques
const CACHE_NAME = 'noma-v1'

// En local (dev), le cache ressert l'ancien JS : on vide tout et on se désinstalle
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(self.location.hostname)

if (IS_LOCAL) {
  self.addEventListener('install', () => self.skipWaiting())
  self.addEventListener('activate', event => {
    event.waitUntil((async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach(client => client.navigate(client.url))
    })())
  })
}

// Assets à mettre en cache au démarrage
const PRECACHE_URLS = ['/', '/bar', '/historique', '/stats']

self.addEventListener('install', event => {
  if (IS_LOCAL) return
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently fail if some pages can't be cached (auth redirect etc.)
      })
    )
  )
})

self.addEventListener('activate', event => {
  if (IS_LOCAL) return
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (IS_LOCAL) return
  const { request } = event
  const url = new URL(request.url)

  // Laisser passer : non-GET, Supabase API, Next.js internals
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase.co')) return
  if (url.pathname.startsWith('/_next/')) {
    // Cache-first pour les assets Next.js (JS, CSS)
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first pour les navigations (pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/').then(r => r || fetch(request)))
    )
    return
  }
})
