import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type ToastType = 'info' | 'success' | 'error'

type Toast = {
  id: number
  message: string
  type: ToastType
}

type ToastContextValue = {
  show: (message: string, type?: ToastType, durationMs?: number) => void
  info: (message: string, durationMs?: number) => void
  success: (message: string, durationMs?: number) => void
  error: (message: string | Error, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(1)

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message: string, type: ToastType = 'info', durationMs = 4000) => {
    const id = counter.current++
    setToasts(prev => [...prev, { id, message, type }])
    window.setTimeout(() => remove(id), durationMs)
  }, [remove])

  const info = useCallback((message: string, durationMs = 4000) => show(message, 'info', durationMs), [show])
  const success = useCallback((message: string, durationMs = 4000) => show(message, 'success', durationMs), [show])
  const error = useCallback((message: string | Error, durationMs = 5000) => {
    const msg = typeof message === 'string' ? message : (message?.message ?? String(message))
    show(msg, 'error', durationMs)
  }, [show])

  const value = useMemo(() => ({ show, info, success, error }), [error, info, show, success])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container overlay */}
      <div
        style={{ position: 'fixed', top: 8, right: 8, pointerEvents: 'none', zIndex: 9999 }}
        className="grid justify-end gap-2"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className="rounded-md shadow-md px-3 py-2 text-sm"
            style={{
              maxWidth: 640,
              background: t.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : t.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(37, 99, 235, 0.95)',
              color: '#fff',
              pointerEvents: 'auto'
            }}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">{t.message}</div>
              <button
                aria-label="Dismiss"
                onClick={() => remove(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  padding: '0 4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
