'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // En dev, pas de cache : sinon le navigateur ressert l'ancien JS après chaque modif
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
      if ('caches' in window) caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] Enregistré, scope:', reg.scope)
      })
      .catch(err => {
        console.warn('[SW] Échec enregistrement:', err)
      })
  }, [])

  return null
}
