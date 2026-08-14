export default function Footer() {
  return (
    <footer style={{
      background: '#1f2430',
      color: '#9AA0AC',
      padding: '3px 12px',
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 1.3,
      marginTop: 'auto',
    }}>
      {/* Una sola línea siempre: en responsive se achica la fuente para no partir */}
      <p style={{
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: 'clamp(6.5px, calc((100vw - 44px) / 42), 12px)',
        lineHeight: 1.2,
      }}>
        🌎 Plataforma solidaria · Colaboradores: <a href="mailto:wilmarecheverry@gmail.com" style={{ color: '#FCD116' }}>wilmarecheverry@gmail.com</a> · <a href="https://www.jcti.xyz" style={{ color: '#FCD116' }}>www.jcti.xyz</a>
      </p>
    </footer>
  )
}
