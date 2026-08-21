import logoDsi from '../../assets/logo-dsi.png'
import logoWater from '../../assets/logo-water.png'
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
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5.46, color: '#3f4550', whiteSpace: 'nowrap' }}>
        Desarrollo respaldado por
        {/* DSI: misma redirección y mismo contador de clics que Contáctanos */}
        <a href="https://dsi-software.co/" target="_blank" rel="noreferrer" onClick={() => { registrarClic('dsi').catch(() => {}) }} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <img src={logoDsi} alt="DSI" style={{ height: 12.02, objectFit: 'contain' }} />
        </a>
        <span>&</span>
        {/* Pure Water: misma redirección y mismo contador de clics que Contáctanos */}
        <a href="https://purewater.com.co/" target="_blank" rel="noreferrer" onClick={() => { registrarClic('water').catch(() => {}) }} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <img src={logoWater} alt="Pure Water" style={{ height: 15, objectFit: 'contain' }} />
        </a>
      </span>
    </footer>
  )
}
