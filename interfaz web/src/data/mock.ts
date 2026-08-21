/** Constantes de la interfaz (listas de ciudades, tipos y categorías). */

export const CITIES = ['Colombia', 'Manizales', 'Riosucio', 'Pereira', 'Cali', 'Quibdó', 'Norte del Valle', 'Armenia']

/** Tipos de necesidad organizados por familia para los dropdowns (con ícono). */
export const TIPOS_NECESIDAD_GRUPOS: { group: string; items: { value: string; icon: string }[] }[] = [
  { group: '🍞 Alimentación', items: [{ value: 'Comida y agua', icon: '🍞' }] },
  { group: '🩺 Salud y bienestar', items: [
    { value: 'Servicios médicos', icon: '🏥' },
    { value: 'Atención psicosocial', icon: '🧠' },
  ] },
  { group: '🏠 Hogar y reconstrucción', items: [
    { value: 'Refugio y abrigo', icon: '🛏️' },
    { value: 'Escombros', icon: '🧱' },
    { value: 'Maquinaria y rescate', icon: '🚜' },
  ] },
  { group: '🚗 Movilidad', items: [{ value: 'Transporte', icon: '🚗' }] },
  { group: '🤝 Apoyo comunitario', items: [{ value: 'Voluntariado', icon: '🤝' }] },
  { group: '🐾 Mascotas', items: [{ value: 'Mascotas', icon: '🐾' }] },
  { group: 'Otros', items: [{ value: 'Otro', icon: '🏪' }] },
]

/** Lista plana (mismo orden) para usos que no necesitan agrupar. */
export const TIPOS_NECESIDAD: string[] = TIPOS_NECESIDAD_GRUPOS.flatMap(g => g.items.map(i => i.value))

export const CATEGORIAS_OFRECIMIENTO = [
  'Comida y agua', 'Servicios médicos', 'Atención psicosocial', 'Mascotas', 'Transporte',
  'Voluntariado', 'Refugio y abrigo', 'Escombros', 'Maquinaria y rescate', 'Otros'
]

export const TIPOS_PUNTO_APOYO = [
  'Farmacia / Dispensario', 'Banco de sangre', 'Veterinaria', 'Ancianato', 'Albergue',
  'Fundación', 'Centro de acopio', 'Líder de barrio', 'Hospital', 'ONG', 'Otro'
]

/** Ícono para cada tipo de punto de apoyo (se usa en marcadores sin imagen y en listados). */
export const ICONO_PUNTO_APOYO: Record<string, string> = {
  'Farmacia / Dispensario': '💊',
  'Banco de sangre': '🩸',
  'Veterinaria': '🐾',
  'Ancianato': '👵',
  'Albergue': '🛏️',
  'Fundación': '🏛️',
  'Centro de acopio': '📦',
  'Líder de barrio': '👤',
  'Hospital': '🏥',
  'ONG': '🤝',
  'Otro': '🏪',
}

// ── Necesidades: capas del mapa + clasificadores compartidos ──────────────

/** Capas de marcadores por tipo de necesidad (orden y etiquetas de los toggles). */
export const NEED_LAYERS = [
  { key: 'agua', icon: '💧', label: '💧 Agua' },
  { key: 'alimentos', icon: '🍞', label: '🍞 Comida y agua' },
  { key: 'refugio', icon: '⛺', label: '⛺ Refugio y abrigo' },
  { key: 'medicamentos', icon: '💊', label: '💊 Medicamentos' },
  { key: 'salud', icon: '🩺', label: '🩺 Servicios médicos' },
  { key: 'ropa', icon: '🧥', label: '🧥 Ropa / Cobijas' },
  { key: 'maquinaria', icon: '🚜', label: '🚜 Maquinaria y rescate' },
  { key: 'escombros', icon: '🧱', label: '🧱 Escombros' },
  { key: 'otro', icon: '🆘', label: '🆘 Otros' },
]

/**
 * Capa del mapa a la que pertenece un tipo de necesidad.
 * Soporta los tipos legacy ('Agua potable', 'Alimentos', ...) y los nuevos
 * ('Comida y agua', 'Farmacia / Dispensario', ...).
 */
export function needKey(tipo: string): string {
  const t = (tipo || '').toLowerCase()
  if (t.includes('agua') && !t.includes('comida') && !t.includes('aliment')) return 'agua'
  if (t.includes('aliment') || t.includes('comida')) return 'alimentos'
  if (t.includes('refugio') || t.includes('carpa') || t.includes('albergue') || t.includes('ancianato')) return 'refugio'
  if (t.includes('medicament') || t.includes('farmacia') || t.includes('dispensario')) return 'medicamentos'
  if (t.includes('médic') || t.includes('medic') || t.includes('salud') || t.includes('psico') || t.includes('sangre') || t.includes('hospital')) return 'salud'
  if (t.includes('ropa') || t.includes('cobija') || t.includes('abrigo')) return 'ropa'
  if (t.includes('maquinaria') || t.includes('rescate') || t.includes('herramienta')) return 'maquinaria'
  if (t.includes('escombro') || t.includes('cascajo') || t.includes('derrumbe') || t.includes('remoci')) return 'escombros'
  if (t.includes('mascota') || t.includes('veterinaria')) return 'mascotas'
  return 'otro'
}

/** Emoji específico para popups y detalle, según el texto crudo del tipo. */
export function needIcon(tipo: string): string {
  const t = (tipo || '').toLowerCase()
  const specific: [string, string][] = [
    ['farmacia', '💊'], ['dispensario', '💊'], ['sangre', '🩸'], ['veterinaria', '🐾'],
    ['ancianato', '👵'], ['albergue', '🛏️'], ['fundaci', '🏛️'], ['acopio', '📦'],
    ['líder', '👤'], ['lider', '👤'], ['hospital', '🏥'], ['ong', '🤝'],
    ['transporte', '🚗'], ['voluntariado', '🤝'], ['psico', '🧠'],
    ['comida', '🍞'], ['rescate', '🚜'], ['maquinaria', '🚜'],
    ['escombro', '🧱'], ['cascajo', '🧱'], ['derrumbe', '🧱'], ['remoci', '🧱'],
  ]
  for (const [k, icon] of specific) if (t.includes(k)) return icon
  return NEED_LAYERS.find(l => l.key === needKey(t))?.icon ?? '🆘'
}

/** Categoría canónica para estadísticas (agrupa tipos legacy y nuevos). */
export function needLabel(tipo: string): string {
  const t = (tipo || '').toLowerCase()
  if (t.includes('agua') || t.includes('aliment') || t.includes('comida')) return 'Comida y agua'
  if (t.includes('medicament') || t.includes('farmacia') || t.includes('dispensario') || t.includes('médic') || t.includes('medic') || t.includes('salud') || t.includes('psico') || t.includes('sangre') || t.includes('hospital')) return 'Servicios médicos'
  if (t.includes('refugio') || t.includes('carpa') || t.includes('albergue') || t.includes('ancianato') || t.includes('abrigo') || t.includes('ropa') || t.includes('cobija')) return 'Refugio y abrigo'
  if (t.includes('mascota') || t.includes('veterinaria')) return 'Mascotas'
  if (t.includes('transporte')) return 'Transporte'
  if (t.includes('voluntariado')) return 'Voluntariado'
  if (t.includes('maquinaria') || t.includes('rescate') || t.includes('herramienta')) return 'Maquinaria y rescate'
  if (t.includes('escombro') || t.includes('cascajo') || t.includes('derrumbe') || t.includes('remoci')) return 'Escombros'
  return 'Otro'
}

/**
 * Selector del modal "NECESITO AYUDA": todas las formas de pedir ayuda,
 * organizadas en grupos. 'Mascotas perdidas' y 'Daños' se guardan como
 * sus propias entidades; el resto se guarda como necesidad (tipo libre).
 */
export const TIPOS_AYUDA: { group: string; items: { value: string; icon: string }[] }[] = [
  // Necesidades divididas por familia
  ...TIPOS_NECESIDAD_GRUPOS,
  {
    group: 'Puntos de apoyo',
    items: [
      { value: 'Farmacia / Dispensario', icon: '💊' },
      { value: 'Banco de sangre', icon: '🩸' },
      { value: 'Veterinaria', icon: '🐾' },
      { value: 'Ancianato', icon: '👵' },
      { value: 'Albergue', icon: '🛏️' },
      { value: 'Fundación', icon: '🏛️' },
      { value: 'Centro de acopio', icon: '📦' },
      { value: 'Líder de barrio', icon: '👤' },
      { value: 'Hospital', icon: '🏥' },
      { value: 'ONG', icon: '🤝' },
    ],
  },
  {
    group: 'Otros reportes',
    items: [
      { value: 'Mascotas perdidas', icon: '🐾' },
      { value: 'Daños', icon: '🏚️' },
    ],
  },
]
