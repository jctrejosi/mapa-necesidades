import { type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  onConfirm?: () => void
  confirmLabel?: string
  confirmClass?: string
  children: ReactNode
  wide?: boolean
  hideCancel?: boolean
}

export default function Modal({ title, onClose, onConfirm, confirmLabel = 'Guardar', confirmClass = 'btn btn-primary', children, wide, hideCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth: wide ? 600 : 460 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1f2430', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9AA0AC', padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm && (
          <div className="modal-footer">
            {!hideCancel && <button onClick={onClose} className="btn btn-outline">Cancelar</button>}
            <button onClick={onConfirm} className={confirmClass}>{confirmLabel}</button>
          </div>
        )}
      </div>
    </div>
  )
}
