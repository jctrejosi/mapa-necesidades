// ============================================================
// Configuración de ciudades disponibles en la plataforma.
// Para agregar una ciudad nueva, solo agrega un objeto aquí
// (no hay que tocar el resto del código).
// ============================================================
const CIUDADES = [
  { id: 'manizales', nombre: 'Manizales y alrededores', lat: 5.0689, lng: -75.5174, zoom: 13 },
  { id: 'pereira', nombre: 'Pereira y alrededores', lat: 4.8087, lng: -75.6906, zoom: 13 },
  { id: 'cali', nombre: 'Cali y alrededores', lat: 3.4516, lng: -76.5320, zoom: 12 },
  { id: 'quibdo', nombre: 'Quibdó y alrededores', lat: 5.6947, lng: -76.6611, zoom: 13 },
  { id: 'norte_valle', nombre: 'Municipios del Norte del Valle del Cauca', lat: 4.7500, lng: -75.9078, zoom: 10 },
  { id: 'armenia', nombre: 'Armenia y alrededores', lat: 4.5339, lng: -75.6811, zoom: 13 }
];

// Ciudades donde el convenio con la entidad permite recibir reportes
// de daños estructurales para visita técnica. Para habilitar una
// ciudad nueva cuando exista el convenio, solo agrega su id aquí.
const CIUDADES_REPORTE_DANOS = ['manizales'];

function ciudadesConReporteDanos() {
  return CIUDADES.filter(c => CIUDADES_REPORTE_DANOS.includes(c.id));
}

function obtenerCiudadActual() {
  const guardada = localStorage.getItem('ciudad_actual');
  if (guardada && CIUDADES.some(c => c.id === guardada)) return guardada;
  return CIUDADES[0].id;
}

function guardarCiudadActual(id) {
  localStorage.setItem('ciudad_actual', id);
}

function datosCiudad(id) {
  return CIUDADES.find(c => c.id === id) || CIUDADES[0];
}

// Llena cualquier <select> con la lista de ciudades y sincroniza
// la selección con localStorage. Devuelve el <select> ya listo.
function inicializarSelectorCiudad(selectId, onCambiar) {
  const select = document.getElementById(selectId);
  select.innerHTML = CIUDADES.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  select.value = obtenerCiudadActual();
  select.addEventListener('change', () => {
    guardarCiudadActual(select.value);
    onCambiar(select.value);
  });
  return select;
}
