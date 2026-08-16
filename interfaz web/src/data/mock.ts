/** Constantes de la interfaz (listas de ciudades, tipos y categorías). */

export const CITIES = ['Colombia', 'Manizales', 'Pereira', 'Cali', 'Quibdó', 'Norte del Valle', 'Armenia']

export const TIPOS_NECESIDAD = [
  'Agua potable', 'Alimentos', 'Refugio/Carpas', 'Medicamentos',
  'Atención médica', 'Ropa/Cobijas', 'Maquinaria/Rescate', 'Mascotas', 'Otro'
]

export const CATEGORIAS_OFRECIMIENTO = [
  'Comida y agua', 'Servicios médicos', 'Atención psicosocial', 'Mascotas', 'Transporte',
  'Voluntariado', 'Refugio y abrigo', 'Maquinaria y rescate', 'Otros'
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
