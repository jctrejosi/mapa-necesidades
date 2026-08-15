import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * Limpieza de caché al ingresar:
 * - Si el bundle cambió respecto a la última visita (nuevo despliegue),
 *   se limpian las cachés locales de la app y se recarga una sola vez.
 * - Se recarga también al volver con "atrás" (bfcache) para no mostrar una
 *   versión vieja.
 */
try {
  const bundleVersion = import.meta.url
  const prev = localStorage.getItem('cr_bundle_ver')
  if (prev && prev !== bundleVersion) {
    try { localStorage.removeItem('cr_notificaciones') } catch { /* noop */ }
    try { localStorage.removeItem('cr_ciudad') } catch { /* noop */ }
    localStorage.setItem('cr_bundle_ver', bundleVersion)
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => { /* noop */ })
    }
    window.location.reload()
  } else {
    localStorage.setItem('cr_bundle_ver', bundleVersion)
  }
} catch { /* noop */ }

window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
