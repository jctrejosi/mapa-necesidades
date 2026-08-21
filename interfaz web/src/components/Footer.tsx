import logoDsi from '../../assets/logo-dsi.png'
import { registrarClic } from '../api'

export default function Footer() {
  return (
    <footer style={{
      background: '#e9ebee',
      color: 'rgb(154, 160, 172)',
      padding: 0,
      fontSize: 13.8,
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
          gap: 5.75,
          color: 'rgb(154, 160, 172)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          fontSize: 13.8,
          lineHeight: 1.4,
        }}
      >
        <span>Desarrollo respaldado por DSI</span>
        <img src={logoDsi} alt="DSI" style={{ height: 12.65, objectFit: 'contain' }} />
      </a>
    </footer>
  )
}
