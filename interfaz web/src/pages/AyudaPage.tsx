interface Props { setPage: (p: string) => void }

const Step = ({ n, text }: { n: number; text: string }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
    <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#003893', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{n}</span>
    <span style={{ fontSize: 14, color: '#1f2430', lineHeight: 1.6 }}>{text}</span>
  </div>
)

const Block = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
  <div className="card" style={{ padding: 24, marginBottom: 16 }}>
    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1f2430', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 22 }}>{icon}</span> {title}
    </h2>
    {children}
  </div>
)

export default function AyudaPage({ setPage }: Props) {
  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px', width: '100%' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">❓ Cómo usar la plataforma</h1>
            <p className="page-subtitle">Guía rápida para coordinar ayuda tras el terremoto</p>
          </div>
        </div>

        <Block icon="🔑" title="Tu código de edición (PIN)">
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 10px' }}>Cada vez que publicas una necesidad, ofrecimiento, mascota o vivienda, se genera un <strong>código de 4 dígitos</strong>.</p>
          <Step n={1} text="Guarda el código que aparece en la pantalla después de publicar. Es el único modo de editar tu publicación." />
          <Step n={2} text="Si lo pierdes, pide al administrador que lo consulte o restablezca." />
          <div className="alert-yellow">⚠️ Nadie más puede modificar tu publicación sin este código.</div>
        </Block>

        <Block icon="🗺️" title="El mapa de necesidades">
          <Step n={1} text="Elige tu ciudad en el selector del encabezado — solo verás los datos de esa ciudad." />
          <Step n={2} text="Los puntos en el mapa indican sectores afectados. 🔴 Rojo = urgente · 🟠 Naranja = en proceso · 🟢 Verde = atendido · ⚪ Gris = sin reportes." />
          <Step n={3} text="Toca un punto para ver las necesidades de ese sector y sus contactos." />
        </Block>

        <Block icon="➕" title="Reportar una necesidad">
          <Step n={1} text='Toca el botón "+ Reportar necesidad" en el mapa.' />
          <Step n={2} text="Haz clic en el mapa sobre la ubicación del sector afectado." />
          <Step n={3} text="Completa el formulario con el tipo de necesidad, cantidad y tu información de contacto. Se generará un código PIN." />
        </Block>

        <Block icon="🙋" title="Ayudar con una necesidad">
          <Step n={1} text='Abre el popup del sector y haz clic en "Yo puedo ayudar con esto" en la necesidad que quieres atender.' />
          <Step n={2} text="Ingresa tu nombre y teléfono. Quedarán visibles para coordinar." />
          <div className="alert-yellow" style={{ marginTop: 10 }}>⚠️ Importante: cuando la necesidad sea resuelta, actualízala a "Ya fue atendida" para liberar el registro.</div>
        </Block>

        <Block icon="🤝" title="Ofrecimientos de ayuda">
          <Step n={1} text='Ve a "Ofrecimientos" y toca "+ Publicar ofrecimiento".' />
          <Step n={2} text="Elige el tipo (comida, transporte, voluntariado...), describe lo que ofreces y deja tu contacto." />
          <Step n={3} text="Cualquier persona puede coordinar/reservar tu ofrecimiento. Cuando se entregue, actualiza el estado con tu PIN." />
        </Block>

        <Block icon="📊" title="Estadísticas">
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Ve a "Estadísticas" para ver los datos en tiempo real: porcentaje de necesidades atendidas, avance por tipo y por sector. Se actualiza automáticamente cada 30 segundos.</p>
        </Block>

        <Block icon="📸" title="Fotos en necesidades y ofrecimientos">
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Puedes adjuntar una foto (JPG, PNG, WEBP, máx. 4MB). La imagen se comprime automáticamente para ahorrar datos. Al hacer clic en una foto se abre en pantalla completa.</p>
        </Block>

        <Block icon="🐾" title="Mascotas perdidas">
          <Step n={1} text='Ve a "Mascotas" y toca "🐾 Reportar mascota".' />
          <Step n={2} text="Haz clic en el mapa donde fue vista por última vez y completa el formulario con las señas." />
          <Step n={3} text='Si viste o tienes la mascota, toca "Yo la vi / la tengo" para dejar tu contacto al dueño.' />
        </Block>

        <Block icon="🏠" title="Vivienda y alojamiento">
          <Step n={1} text='Ve a "Vivienda" y toca "+ Publicar oferta" si tienes espacio disponible.' />
          <Step n={2} text="Solo se publica el sector de referencia, nunca la dirección exacta." />
          <Step n={3} text='Si necesitas alojamiento, toca "Estoy interesado" y coordina directamente. Verifica bien la identidad antes de dar datos o acudir a un lugar.' />
        </Block>

        <Block icon="🏚️" title="Reporte de daños estructurales">
          <div className="alert-red" style={{ marginBottom: 12 }}>
            <strong>Este NO es un canal de emergencia.</strong> Si hay riesgo de colapso o personas atrapadas, llama al <strong>📞 123</strong>.
          </div>
          <Step n={1} text="Solo disponible en Manizales (convenio con ingenieros)." />
          <Step n={2} text="Haz clic en el mapa sobre tu inmueble, completa el formulario. Se genera un número de radicado." />
          <Step n={3} text='Con el radicado puedes consultar el estado en "Consultar mi reporte". Tus datos de contacto son privados.' />
        </Block>

        <Block icon="📦🩸" title="Centros de acopio y bancos de sangre">
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Los centros de acopio aparecen en el mapa como puntos azules. Solo el administrador los publica — son verificados y oficiales. Activa el toggle "Mostrar centros" en la barra lateral del mapa.</p>
        </Block>

        <Block icon="🛠️" title="Panel de administración">
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>El administrador puede gestionar todos los registros, publicar noticias, crear centros de acopio, ver y restablecer PINs, gestionar visitas técnicas y exportar CSV. Accede con el botón "🔑 Admin" en el encabezado.</p>
        </Block>

        {/* Quick access buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
          {[
            { icon: '🗺️', label: 'Ir al mapa', page: 'mapa' },
            { icon: '🤝', label: 'Ver ofrecimientos', page: 'ofrecimientos' },
            { icon: '🐾', label: 'Ver mascotas', page: 'mascotas' },
            { icon: '🏚️', label: 'Reportar daño', page: 'danos' },
            { icon: '📊', label: 'Ver estadísticas', page: 'dashboard' },
          ].map(b => (
            <button key={b.page} className="btn btn-primary" onClick={() => setPage(b.page)}>
              {b.icon} {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
