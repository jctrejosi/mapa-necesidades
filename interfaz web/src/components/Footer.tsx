export default function Footer() {
  return (
    <footer style={{
      background: '#1f2430',
      color: '#9AA0AC',
      padding: '10px 20px',
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 1.6,
      marginTop: 'auto',
    }}>
      {/* Una sola línea siempre: en responsive se achica la fuente para no partir */}
      <p style={{
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: 'clamp(6.5px, calc((100vw - 44px) / 42), 12px)',
        lineHeight: 1.3,
      }}>
        🌎 Plataforma solidaria · Colaboradores: <a href="mailto:wilmarecheverry@gmail.com" style={{ color: '#FCD116' }}>wilmarecheverry@gmail.com</a> · <a href="https://www.jcti.xyz" style={{ color: '#FCD116' }}>www.jcti.xyz</a>
      </p>
      <p style={{ margin: '4px 0 0' }}>
        ✉️ <a href="mailto:wilmarecheverry@gmail.com" style={{ color: '#FCD116' }}>wilmarecheverry@gmail.com</a>
        &nbsp;·&nbsp; 💬 WhatsApp <a href="https://wa.me/573103817213" style={{ color: '#FCD116' }}>+57 310 381 7213</a>
      </p>
    </footer>
  )
}
