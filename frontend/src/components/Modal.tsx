import { useEffect } from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  contentClassName?: string
}

export default function Modal({ open, onClose, children, contentClassName = 'modal' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        ;(e.currentTarget as any)._downOnOverlay = e.target === e.currentTarget
        ;(e.currentTarget as any)._moved = false
      }}
      onMouseMove={(e) => {
        if ((e.currentTarget as any)._downOnOverlay) {
          ;(e.currentTarget as any)._moved = true
        }
      }}
      onMouseUp={(e) => {
        const startedOnOverlay = (e.currentTarget as any)._downOnOverlay
        const moved = (e.currentTarget as any)._moved
        ;(e.currentTarget as any)._downOnOverlay = false
        ;(e.currentTarget as any)._moved = false
        if (e.target === e.currentTarget && startedOnOverlay && !moved) {
          onClose()
        }
      }}
    >
      <div className={contentClassName} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
