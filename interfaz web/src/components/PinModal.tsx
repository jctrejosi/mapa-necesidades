interface Props {
  pin?: string
  radicado?: string
  onClose: () => void
}

export default function PinModal({ pin, radicado, onClose }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 380, textAlign: 'center' }}>
        <div style={{ padding: '32px 28px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#2E9E5B', marginBottom: 8 }}>¡Publicado con éxito!</h3>
          {pin && (
            <>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                Guarda este código — es el único modo de editar tu publicación. Nadie más podrá modificarla sin él.
              </p>
              <div style={{
                background: '#e8eeff', border: '2px dashed #003893', borderRadius: 12,
                padding: '16px 24px', marginBottom: 20
              }}>
                <p style={{ fontSize: 12, color: '#003893', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Tu código de edición
                </p>
                <p style={{ fontSize: 40, fontWeight: 800, color: '#003893', letterSpacing: 12, margin: 0 }}>{pin}</p>
              </div>
            </>
          )}
          {radicado && (
            <>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                Guarda este número de radicado para consultar el estado de tu reporte.
              </p>
              <div style={{
                background: '#e6f5ec', border: '2px dashed #2E9E5B', borderRadius: 12,
                padding: '16px 24px', marginBottom: 20
              }}>
                <p style={{ fontSize: 12, color: '#2E9E5B', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Número de radicado
                </p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#2E9E5B', letterSpacing: 4, margin: 0 }}>{radicado}</p>
              </div>
            </>
          )}
          <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>Entendido, ya lo guardé</button>
        </div>
      </div>
    </div>
  )
}
