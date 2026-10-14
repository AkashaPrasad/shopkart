import { create } from 'zustand'
type Theme = 'light' | 'dark'
function initial(): Theme { try { return (localStorage.getItem('sk_theme') as Theme) || 'light' } catch { return 'light' } }
export const useTheme = create<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>((set) => ({
  theme: initial(),
  set(t) { document.documentElement.classList.toggle('dark', t === 'dark'); try { localStorage.setItem('sk_theme', t) } catch { /* noop */ }; set({ theme: t }) },
  toggle() { set(s => { const t = s.theme === 'dark' ? 'light' : 'dark'; document.documentElement.classList.toggle('dark', t === 'dark'); try { localStorage.setItem('sk_theme', t) } catch { /* noop */ }; return { theme: t } }) },
}))
