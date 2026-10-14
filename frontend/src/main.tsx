import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

// After a new deploy, a tab that still holds the previous index.html will fail to load renamed lazy chunks.
// Reload once (guarded by sessionStorage) so the visitor transparently picks up the fresh build.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  try {
    if (sessionStorage.getItem('sk_reloaded_for_chunk') === '1') return
    sessionStorage.setItem('sk_reloaded_for_chunk', '1')
  } catch { /* ignore */ }
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
        <Toaster position="bottom-center" richColors closeButton toastOptions={{ className: 'font-sans', duration: 3500 }} />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
