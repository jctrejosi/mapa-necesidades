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
            <p className="page-subtitle">Todo lo que necesitas saber para pedir y ofrecer ayuda</p>
          </div>
        </div>

        <div className="alert-red" style={{ marginBottom: 16 }}>
          <strong>⚠️ Esta plataforma NO es un canal de emergencia.</strong> Si hay riesgo de colapso, personas atrapadas o una urgencia, llama al <strong>📞 123</strong>.
        </div>

        <Block icon="🆘" title="Reportar una necesidad (el flujo principal)">
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 10px' }}>
            El botón <strong>🆘 NECESITO AYUDA</strong> está en el mapa (y también puedes usar <strong>📋 Reportes</strong> en el menú). Así funciona:
          </p>
          <Step n={1} text='Toca "🆘 NECESITO AYUDA". El navegador te pedirá permiso de ubicación.' />
          <Step n={2} text="Si das el permiso, tu ubicación se captura y el formulario se abre con la dirección ya llenada (verás «📍 Ubicación capturada correctamente»)." />
          <Step n={3} text="Si no das el permiso o falla, verás un aviso… pero puedes continuar igual: escribe la dirección a mano, coloca el marcador en el mini-mapa (clic o arrastra) o usa «📍 Usar mi ubicación»." />
          <Step n={4} text="La dirección y el marcador del mapa van sincronizados: si mueves el marcador se actualiza la dirección, y si corriges la dirección se mueve el marcador." />
          <Step n={5} text="Elige el tipo de ayuda (opcional, por defecto «Otro»): Comida y agua, Servicios médicos, Atención psicosocial, Mascotas, Transporte, Voluntariado, Refugio y abrigo, Maquinaria y rescate… también tipos de puntos de apoyo (farmacia, banco de sangre, hospital…) y «Mascotas perdidas» o «Daños», que tienen su propio flujo." />
          <Step n={6} text="Escribe la descripción y tu teléfono (obligatorios) y, si quieres, adjunta una foto." />
          <Step n={7} text='Toca "Publicar". Recibirás un código de 4 dígitos (PIN) que debes guardar para editar o borrar tu reporte. Si elegiste «Daños», en su lugar se genera un radicado.' />
        </Block>

        <Block icon="🔑" title="Tu código de edición (PIN)">
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 10px' }}>
            Cada vez que publicas una necesidad, un ofrecimiento, una mascota, una vivienda, un punto de apoyo o un evento, se genera un <strong>código de 4 dígitos</strong>. Los reportes de daños usan un <strong>número de radicado</strong> (ej. DA482913).
          </p>
          <Step n={1} text="Guarda el código que aparece en la pantalla al publicar. Es el único modo de editar o eliminar tu publicación." />
          <Step n={2} text="Si lo pierdes, el administrador de la plataforma tiene una llave general y puede ayudarte." />
          <div className="alert-yellow">⚠️ Nadie más puede modificar tu publicación sin este código.</div>
        </Block>

        <Block icon="✏️" title="Editar o eliminar un reporte">
          <Step n={1} text="Abre el detalle del reporte: desde el marcador del mapa (botón «Ver detalle»), desde la lista de reportes o desde la actividad reciente." />
          <Step n={2} text='Toca "✎ Editar reporte". Primero te pedirá el código (PIN) o el radicado; luego podrás corregir la dirección, la descripción, la foto y el estado.' />
          <Step n={3} text="Al guardar verás un aviso de «Reporte actualizado» y el cambio se refleja al instante en el mapa." />
          <Step n={4} text='Toca "🗑 Eliminar" y escribe el mismo código para borrar tu reporte.' />
        </Block>

        <Block icon="🤝" title="Ofrecer ayuda">
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 10px' }}>Tienes dos formas de ayudar:</p>
          <Step n={1} text='Desde el detalle de cualquier reporte toca "🤝 Yo te ayudo": deja tu nombre y teléfono. Queda registrado quién va a ayudar, el reporte cambia de estado (por ejemplo, la necesidad pasa a «En proceso») y quien publicó recibe tu contacto.' />
          <Step n={2} text='O publica un ofrecimiento: ve a "🤝 Ofrecimientos" y toca "+ Publicar ofrecimiento". Elige el tipo (comida, transporte, atención psicosocial, alojamiento…), la cantidad, la descripción, tu nombre y teléfono, una foto opcional y, si quieres, ubícalo en el mapa con "🗺️ Ubicación".' />
          <Step n={3} text="Cualquier persona puede «Coordinar / reservar» tu ofrecimiento. Cuando ya se entregó, actualízalo a «Entregado» con tu PIN." />
        </Block>

        <Block icon="🗺️" title="El mapa y sus capas">
          <Step n={1} text="Elige la ciudad en el selector del encabezado. «Colombia» muestra todas las ciudades en un solo mapa." />
          <Step n={2} text="Hay marcadores de: sectores con necesidades, mascotas perdidas, daños, puntos de apoyo (con su imagen y color) y eventos activos (marcador que titila)." />
          <Step n={3} text="Con los botones de capas puedes mostrar u ocultar cada tipo. Si todas están activas, tocar una deja visible SOLO esa; si ya hay algunas ocultas, tocar una la activa o desactiva individualmente. «Ver todos» las reactiva todas." />
          <Step n={4} text="Arriba del mapa hay un buscador: escribe el PIN de un reporte o un número de teléfono para encontrarlo." />
          <Step n={5} text="Toca un marcador para ver su popup y, desde ahí, «Ver detalle» para abrir el reporte completo." />
        </Block>

        <Block icon="🔔" title="Reportes y actividad reciente">
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            El panel <strong>📋 Reportes</strong> (botón sobre el mapa) muestra la <strong>actividad reciente</strong>: los últimos 10 reportes de la plataforma (necesidades, ofrecimientos, mascotas, viviendas, daños, noticias y eventos) en tiempo real, sin importar hace cuánto se publicaron. Al tocar uno se abre su detalle. También llegará una notificación cuando alguien publique algo nuevo.
          </p>
        </Block>

        <Block icon="🤖" title="El bot Anay">
          <Step n={1} text="Toca el botón flotante con la imagen del bot (abajo a la derecha) para abrir el chat." />
          <Step n={2} text="Debajo del chat hay dos botones rápidos: «📝 Reportar una necesidad» y «🤝 Buscar ayuda». Son exactamente lo que Anay sabe hacer: crear un reporte de necesidad (te pedirá la descripción y tu teléfono, y al final te da el PIN) o buscar quién puede ayudarte (ofrecimientos y centros de acopio)." />
          <Step n={3} text="Anay solo responde sobre esas dos funciones: si le preguntas por otra cosa, te lo dirá y te invitará a usar el mapa o las secciones de la plataforma." />
        </Block>

        <Block icon="🏪" title="Puntos de apoyo">
          <Step n={1} text='Ve a "🏪 Puntos de apoyo" y toca "+ Agregar punto". No necesitas contraseña: cualquier persona puede publicar.' />
          <Step n={2} text="Completa nombre, tipo (farmacia / dispensario, banco de sangre, veterinaria, ancianato, albergue, fundación, centro de acopio, líder de barrio, hospital, ONG u otro), dirección, teléfono, una imagen y un color (por defecto azul)." />
          <Step n={3} text="En el formulario, la dirección y el marcador del mapa se sincronizan: escribe la dirección para que el marcador se ubique, o arrastra el marcador hasta el punto exacto." />
          <Step n={4} text="Al guardar, el punto aparece en el mapa como un marcador con su imagen. Recibirás un código de 4 dígitos para editar o eliminar tu punto." />
        </Block>

        <Block icon="📅" title="Eventos">
          <Step n={1} text='Ve a "📅 Eventos" y toca "+ Crear evento". Para crearlo necesitas el PIN del punto de apoyo que lo organiza (el que recibiste al publicar ese punto).' />
          <Step n={2} text="Escribe el título, la descripción, ubica el evento en el mapa y define el período en que estará activo (inicio y fin), además de si arranca activado o no." />
          <Step n={3} text="Mientras el evento esté activo, en el mapa se ve un marcador titilando con un círculo alrededor, en el color configurado del punto de apoyo." />
          <Step n={4} text="Para editarlo o eliminarlo se pide el código (PIN) que se te dio al crearlo." />
        </Block>

        <Block icon="🐾" title="Mascotas perdidas">
          <Step n={1} text='Ve a "🐾 Mascotas perdidas" y toca "🐾 Reportar mascota".' />
          <Step n={2} text="Indica el tipo de animal, el nombre si lo sabes, las señas (obligatorias), el lugar donde se perdió, la fecha, tu nombre y tu teléfono, y una foto opcional." />
          <Step n={3} text='Con el botón "🗺️ Ubicación" (junto a Publicar) puedes marcar en el mapa el punto exacto donde se perdió; si no lo marcas, queda una ubicación aproximada de la ciudad.' />
          <Step n={4} text='Si viste o tienes la mascota, toca "Yo la vi / la tengo" para dejar tu contacto al dueño. Con tu PIN puedes marcarla como «Encontrada».' />
        </Block>

        <Block icon="🏠" title="Vivienda y alojamiento">
          <Step n={1} text='Ve a "🏠 Vivienda" y toca "+ Publicar oferta" si tienes espacio disponible (gratis o en arriendo).' />
          <Step n={2} text="Solo se publica el sector de referencia, nunca la dirección exacta, para proteger tu seguridad." />
          <Step n={3} text='Si necesitas alojamiento, toca "Estoy interesado" para dejar tu contacto y coordinar directamente. Verifica bien la identidad antes de dar datos o acudir a un lugar.' />
          <Step n={4} text="Con tu PIN puedes actualizar el estado (disponible / ocupada)." />
        </Block>

        <Block icon="🏚️" title="Reporte de daños de vivienda">
          <div className="alert-red" style={{ marginBottom: 12 }}>
            <strong>Este NO es un canal de emergencia.</strong> Si hay riesgo de colapso o personas atrapadas, llama al <strong>📞 123</strong>.
          </div>
          <Step n={1} text='Ve a "🏚️ Daños" y toca "+ Reportar daño". Disponible para Manizales (y en la vista «Colombia»).' />
          <Step n={2} text="Completa el tipo de inmueble, la dirección, si está habitado, el nivel de afectación, la descripción, tus datos de contacto y una foto opcional." />
          <Step n={3} text="Al publicar se genera un radicado (ej. DA482913) que debes guardar." />
          <Step n={4} text='Con "🔎 Consultar radicado" puedes ver el estado de tu reporte: pendiente, visita programada o visitado.' />
        </Block>

        <Block icon="📊" title="Impacto">
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Ve a <strong>📊 Impacto</strong> para ver los datos de la ciudad en tiempo real (se actualiza cada 30 segundos): sectores activos, necesidades reportadas, sin asignar, en proceso y atendidas, ofrecimientos disponibles, y un desglose por tipo de necesidad y por sector.
          </p>
        </Block>

        <Block icon="📞" title="Noticias y contacto">
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            En <strong>📰 Noticias</strong> se publican los comunicados oficiales. En <strong>📞 Contáctanos</strong> están las líneas de apoyo (314 885 4358 — línea de apoyo solidario y 310 381 7213 — coordinación general) con botones para llamar o escribir por WhatsApp, y una sección «Invítanos un café» para apoyar la plataforma.
          </p>
        </Block>

        {/* Quick access buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
          {[
            { icon: '🗺️', label: 'Ir al mapa', page: 'mapa' },
            { icon: '🆘', label: 'Reportar', page: 'mapa' },
            { icon: '🤝', label: 'Ofrecer ayuda', page: 'ofrecimientos' },
            { icon: '🏪', label: 'Puntos de apoyo', page: 'puntos' },
            { icon: '📅', label: 'Eventos', page: 'eventos' },
            { icon: '🐾', label: 'Mascotas perdidas', page: 'mascotas' },
            { icon: '🏠', label: 'Vivienda', page: 'vivienda' },
            { icon: '🏚️', label: 'Reportar daño', page: 'danos' },
            { icon: '📊', label: 'Ver impacto', page: 'dashboard' },
            { icon: '📞', label: 'Contáctanos', page: 'contacto' },
          ].map(b => (
            <button key={b.page + b.label} className="btn btn-primary" onClick={() => setPage(b.page)}>
              {b.icon} {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
