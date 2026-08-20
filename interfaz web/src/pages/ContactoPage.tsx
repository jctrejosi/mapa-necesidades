import logoDsi from '../../assets/logo-dsi.png'
import { registrarClic } from '../api'

const TELEFONOS = [
  { numero: '310 381 7213', raw: '3103817213', label: 'Coordinación general' },
  { numero: '314 885 4358', raw: '3148854358', label: 'Línea de apoyo' },
]

export default function ContactoPage() {
  const wa = (raw: string) => `57${raw}`

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div className="page-container" style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f2430', margin: 0 }}>📞 Contáctanos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
            Estamos para ayudarte. Llámanos o escríbenos por WhatsApp.
          </p>
        </div>

        {/* Teléfonos */}
        <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
          {TELEFONOS.map(t => (
            <div key={t.raw} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, flexWrap: 'wrap' }}>
              <div style={{
                width: 46, height: 46, borderRadius: 999, background: '#e8eeff', color: '#003893',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
              }}>
                📞
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: '#1f2430', letterSpacing: 0.5 }}>{t.numero}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }} href={`tel:+57${t.raw}`}>Llamar</a>
                <a className="btn btn-green btn-sm" style={{ textDecoration: 'none' }} href={`https://wa.me/${wa(t.raw)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </div>
          ))}
        </div>

        {/* Franjas de créditos */}
        <a
          href="https://dsi-software.co/"
          target="_blank"
          rel="noreferrer"
          onClick={() => { registrarClic('dsi').catch(() => {}) }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 16px', background: '#fff', border: '1px solid #e1e4e9', borderRadius: 10, textDecoration: 'none', marginBottom: 10 }}
        >
          <span style={{ fontSize: 12.5, color: '#6b7280' }}>Con el respaldo de</span>
          <img src={logoDsi} alt="DSI" style={{ height: 20, objectFit: 'contain' }} />
        </a>
        <a
          href="https://www.jcti.xyz"
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: '#fff', border: '1px solid #e1e4e9', borderRadius: 10, textDecoration: 'none' }}
        >
          <span style={{ fontSize: 12.5, color: '#6b7280' }}>Colaborador</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#003893' }}>www.jcti.xyz</span>
        </a>
      </div>
    </div>
  )
}
