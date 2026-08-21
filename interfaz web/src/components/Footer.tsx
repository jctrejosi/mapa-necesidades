import logoDsi from '../../assets/logo-dsi.png'
import { registrarClic } from '../api'

export default function Footer() {
  return (
    <footer style={{
      background: '#e9ebee',
      color: '#3f4550',
      padding: 0,
      fontSize: 13.11,
      textAlign: 'center',
      lineHeight: 1.4,
      marginTop: 'auto',
      flexShrink: 0,
    }}>
      {/* Créditos DSI: misma redirección y mismo contador de clics que Contáctanos */}
      <a
        href="https://dsi-software.co/"
        target="_blank"
        rel="noreferrer"
        onClick={() => { registrarClic('dsi').catch(() => {}) }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5.46,
          color: '#3f4550',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          fontSize: 13.11,
          lineHeight: 1.4,
        }}
      >
        <span>Desarrollo respaldado por DSI</span>
        <img src={logoDsi} alt="DSI" style={{ height: 12.02, objectFit: 'contain' }} />
      </a>
    </footer>
  )
}
