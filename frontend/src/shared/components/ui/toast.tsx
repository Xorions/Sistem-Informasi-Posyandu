import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' }
type Ctx = { show: (msg: string, type?: Toast['type']) => void }

const ToastContext = createContext<Ctx | null>(null)
let idCounter = 0

type ToastListener = (msg: string, type?: Toast['type']) => void
let toastDispatcher: ToastListener | null = null
let lastToastMessage = ''
let lastToastTime = 0

/**
 * Pemicu toast imperatif dari luar pohon React (misalnya interceptor Axios).
 */
export function showToast(message: string, type: Toast['type'] = 'info') {
  if (toastDispatcher) {
    toastDispatcher(message, type)
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = (message: string, type: Toast['type'] = 'success') => {
    const now = Date.now()
    // Cegah duplikasi toast yang sama dalam rentang 1.5 detik
    if (message === lastToastMessage && now - lastToastTime < 1500) {
      return
    }
    lastToastMessage = message
    lastToastTime = now

    const id = ++idCounter
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  useEffect(() => {
    toastDispatcher = show
    return () => {
      toastDispatcher = null
    }
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium border flex items-center gap-2 min-w-[280px] ${
              t.type === 'success'
                ? 'bg-white border-emerald-200 text-emerald-800'
                : t.type === 'error'
                  ? 'bg-white border-red-200 text-red-800'
                  : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                t.type === 'success'
                  ? 'bg-emerald-500'
                  : t.type === 'error'
                    ? 'bg-red-500'
                    : 'bg-slate-500'
              }`}
            />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside provider')
  return ctx
}
