import { useEffect, useMemo, useState } from 'react'
import type { Store } from '../store'
import { fmtFecha } from '../store'
import Modal from '../components/Modal'
import ImageInput from '../components/ImageInput'
import { restablecerPin, verPin, cityId, CITIES, listVisitas, visitasResumen, listAuditoria, clicsResumen, verifyAdmin } from '../api'
import { getAdminRol } from '../api/client'
import type { Necesidad, ReporteDano } from '../api/types'

interface Props { store: Store }

// ── Utilidades de fecha / orden ──────────────────────────────────────────────

function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/** Timestamp de una fecha 'YYYY-MM-DD' o ISO. */
const dateTs = (iso?: string | null): number => {
  if (!iso) return 0
  const t = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).getTime()
  return Number.isFinite(t) ? t : 0
}

/** Filtra por rango de fechas (desde/hasta, inclusivo). */
const inDateRange = (iso: string | null | undefined, from: string, to: string): boolean => {
  if (!from && !to) return true
  const t = dateTs(iso)
  if (from && t < dateTs(from)) return false
  if (to && t > dateTs(to) + 86_399_999) return false
  return true
}

/** Ordena del más reciente al más antiguo (empate por id desc). */
function byDateDesc<T extends { id: number }>(rows: T[], dateOf: (r: T) => string | null | undefined): T[] {
  return [...rows].sort((a, b) => dateTs(dateOf(b)) - dateTs(dateOf(a)) || b.id - a.id)
}

const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

// ── Componentes visuales ─────────────────────────────────────────────────────

const TAG: Record<string, string> = {
  requiere: 'tag-red', urgente: 'tag-red', pendiente: 'tag-red', perdido: 'tag-red', colapso: 'tag-red', severo: 'tag-red',
  en_proceso: 'tag-orange', reservado: 'tag-orange', visita_programada: 'tag-orange', moderado: 'tag-orange', alquiler: 'tag-orange',
  atendida: 'tag-green', disponible: 'tag-green', encontrado: 'tag-green', abierto: 'tag-green', gratis: 'tag-green', visitado: 'tag-green',
  cerrado: 'tag-gray', entregado: 'tag-gray', ocupado: 'tag-gray', leve: 'tag-gray', activo: 'tag-green',
}

const StatusTag = ({ v }: { v: string }) => <span className={`tag ${TAG[v] ?? 'tag-gray'}`}>{v.replace(/_/g, ' ')}</span>

const TIPOS_PUNTO_APOYO = [
  'Farmacia / Dispensario', 'Banco de sangre', 'Veterinaria', 'Ancianato', 'Albergue',
  'Fundación', 'Centro de acopio', 'Líder de barrio', 'Hospital', 'ONG', 'Otro',
]

/** Paleta de colores para los marcadores de puntos de apoyo (aleatorio por defecto). */
const MARKER_COLORS = ['#003893', '#CE1126', '#E08E00', '#2E9E5B', '#7C3AED', '#0D9488', '#BE123C']
const randomColor = () => MARKER_COLORS[Math.floor(Math.random() * MARKER_COLORS.length)]

const TIPOS_NECESIDAD_GRUPOS: { group: string; items: string[] }[] = [
  { group: '🍞 Alimentación', items: ['Comida y agua'] },
  { group: '🩺 Salud y bienestar', items: ['Servicios médicos', 'Atención psicosocial'] },
  { group: '🏠 Hogar y reconstrucción', items: ['Refugio y abrigo', 'Escombros', 'Maquinaria y rescate'] },
  { group: '🚗 Movilidad', items: ['Transporte'] },
  { group: '🤝 Apoyo comunitario', items: ['Voluntariado'] },
  { group: '🐾 Mascotas', items: ['Mascotas'] },
  { group: 'Otros', items: ['Otro'] },
]

const CATEGORIAS_OFRECIMIENTO = [
  'Comida y agua', 'Servicios médicos', 'Atención psicosocial', 'Mascotas',
  'Transporte', 'Voluntariado', 'Refugio y abrigo', 'Escombros', 'Maquinaria y rescate', 'Otros',
]

const TIPOS_ANIMAL = ['Perro', 'Gato', 'Ave', 'Conejo', 'Equino', 'Bovino', 'Cerdo', 'Otro']

/** ISO → valor para <input type="datetime-local">. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input datetime-local> → ISO (o null si está vacío/inválido). */
const fromLocalInput = (s: string) => {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function KpiCard({ icon, label, value, tone = 'blue', sub, onClick }: { icon: string; label: string; value: number; tone?: string; sub?: string; onClick?: () => void }) {
  const clickable = !!onClick
  return (
    <div
      className="kpi-card"
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}
      title={clickable ? 'Ver estos reportes' : undefined}
      style={clickable ? { cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' } : undefined}
      onMouseEnter={clickable ? (e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,56,147,0.18)'; e.currentTarget.style.transform = 'translateY(-1px)' } : undefined}
      onMouseLeave={clickable ? (e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' } : undefined}
    >
      <div className="kpi-icon" style={{ background: `var(--kpi-${tone})` }}>{icon}</div>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {sub && <div style={{ fontSize: 10.5, color: '#9AA0AC', marginTop: 2 }}>{sub}</div>}
        {clickable && <div style={{ fontSize: 10.5, color: '#003893', fontWeight: 800, marginTop: 4 }}>Ver reportes →</div>}
      </div>
    </div>
  )
}

function Chips({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="chips-row">
      {options.map(o => (
        <button key={o.id} className={`chip ${value === o.id ? 'active' : ''}`} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}

/** Barra de herramientas de una sección: búsqueda + chips de estado + rango de fechas. */
function Toolbar(props: {
  search: string; setSearch: (s: string) => void; placeholder?: string
  chips?: { id: string; label: string }[]; chip?: string; setChip?: (id: string) => void
  dateFrom: string; setDateFrom: (s: string) => void
  dateTo: string; setDateTo: (s: string) => void
  extra?: React.ReactNode
}) {
  return (
    <div className="admin-toolbar">
      <input
        className="form-input admin-search"
        value={props.search}
        onChange={e => props.setSearch(e.target.value)}
        placeholder={props.placeholder ?? 'Buscar…'}
      />
      {props.chips && props.chip !== undefined && props.setChip && (
        <Chips options={props.chips} value={props.chip} onChange={props.setChip} />
      )}
      <div className="date-filters">
        <input className="form-input" type="date" value={props.dateFrom} onChange={e => props.setDateFrom(e.target.value)} title="Desde" aria-label="Desde" />
        <span className="date-sep">→</span>
        <input className="form-input" type="date" value={props.dateTo} onChange={e => props.setDateTo(e.target.value)} title="Hasta" aria-label="Hasta" />
        {(props.dateFrom || props.dateTo) && (
          <button className="btn btn-xs btn-outline" onClick={() => { props.setDateFrom(''); props.setDateTo('') }}>✕ Limpiar</button>
        )}
      </div>
      {props.extra}
    </div>
  )
}

function Section({ title, icon, count, onExport, toolbar, children }: {
  title: string; icon: string; count: number
  onExport?: () => void; toolbar?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="card admin-section">
      <div className="section-head">
        <h2><span className="section-icon">{icon}</span>{title}</h2>
        <span className="count-pill">{count}</span>
        {onExport && <button className="btn btn-outline btn-xs" onClick={onExport}>⬇ Exportar CSV</button>}
      </div>
      {toolbar}
      <div className="table-wrap">{children}</div>
    </div>
  )
}

const Td = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <td style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13, verticalAlign: 'top', ...style }}>{children}</td>
)
const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: '9px 14px', background: '#f8f9fb', borderBottom: '1px solid #e1e4e9', fontSize: 11.5, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#6b7280' }}>{children}</th>
)

const Empty = ({ text }: { text: string }) => (
  <tr><td colSpan={99} style={{ padding: '28px 16px', textAlign: 'center', color: '#9AA0AC', fontSize: 13 }}>{text}</td></tr>
)

/** Select inline para cambiar el tipo de un reporte desde la tabla (con confirmación). */
const TipoSelect = ({ value, options, groups, onPick }: { value: string; options?: string[]; groups?: { group: string; items: string[] }[]; onPick: (v: string) => void }) => {
  const flat = groups ? groups.flatMap(g => g.items) : (options ?? [])
  return (
    <select
      className="form-select"
      value={value}
      onChange={e => { if (window.confirm(`¿Cambiar el tipo a "${e.target.value}"?`)) onPick(e.target.value) }}
      style={{ padding: '3px 6px', fontSize: 12, fontWeight: 700, width: 'auto', maxWidth: 190, display: 'inline-block' }}
    >
      {!flat.includes(value) && <option value={value}>{value}</option>}
      {groups ? (
        groups.map(g => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
        ))
      ) : (
        options?.map(t => <option key={t} value={t}>{t}</option>)
      )}
    </select>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function AdminPage({ store }: Props) {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('cr_admin') === '1')
  const [rol, setRol] = useState<'owner' | 'admin'>(() => getAdminRol())
  const [loginError, setLoginError] = useState(false)

  const {
    ciudad, sectores, necesidades, ofrecimientos, mascotas, centros, puntosApoyo, eventos, noticias, viviendas, danos,
    updateSector, deleteSector, updateNecesidad, deleteNecesidad,
    updateOfrecimiento, deleteOfrecimiento, deleteMascota, updateMascota,
    addCentro, updateCentro, deleteCentro,
    addPuntoApoyo, updatePuntoApoyo, deletePuntoApoyo,
    addEvento, updateEvento, deleteEvento,
    addNoticia, updateNoticia, deleteNoticia,
    deleteVivienda, updateDano, deleteDano, loginAdmin, logoutAdmin
  } = store

  const [section, setSection] = useState('resumen')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [nChip, setNChip] = useState('urgentes')
  const [oChip, setOChip] = useState('todos')
  const [mChip, setMChip] = useState('todos')
  const [cChip, setCChip] = useState('todos')
  const [vChip, setVChip] = useState('todos')
  const [dChip, setDChip] = useState('pendientes')
  const [visitas, setVisitas] = useState<any[]>([])
  const [visitasLoading, setVisitasLoading] = useState(false)
  const [visitasKpi, setVisitasKpi] = useState<{ total: number; hoy: number; unicos: number; ultima_visita: string | null }>({ total: 0, hoy: 0, unicos: 0, ultima_visita: null })
  const [clics, setClics] = useState<{ total: number; porEnlace: { enlace: string; total: number }[] }>({ total: 0, porEnlace: [] })
  const [auditoria, setAuditoria] = useState<any[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditDetail, setAuditDetail] = useState<any | null>(null)

  // Confirmación de acciones destructivas: pide la contraseña de admin antes de eliminar.
  const [confirmDel, setConfirmDel] = useState<{ label: string; fn: () => Promise<unknown> | unknown } | null>(null)
  const [confirmPass, setConfirmPass] = useState('')
  const [confirmError, setConfirmError] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [showPinModal, setShowPinModal] = useState<{ pin: string | null; id: number; type: string } | null>(null)
  const [pinLoading, setPinLoading] = useState(false)
  const [showCentroForm, setShowCentroForm] = useState<any>(null)
  const [showPuntoForm, setShowPuntoForm] = useState<any>(null)
  const [showNoticiaForm, setShowNoticiaForm] = useState<any>(null)
  const [showDanoGestionar, setShowDanoGestionar] = useState<any>(null)
  const [showAddNeed, setShowAddNeed] = useState<number | null>(null)
  const [newNeedForm, setNewNeedForm] = useState({ tipo: 'Agua potable', cantidad: '', prioridad: 'alta' as const, descripcion: '', reportado_por: '', telefono_reporta: '' })
  const [centroForm, setCentroForm] = useState<{ nombre: string; organizacion: string; es_acopio: boolean; es_sangre: boolean; es_alojamiento: boolean; que_recibe: string; direccion: string; telefono: string; horario: string; lat: number; lng: number; estado: 'abierto' | 'cerrado'; imagen: string | null }>({ nombre: '', organizacion: '', es_acopio: true, es_sangre: false, es_alojamiento: false, que_recibe: '', direccion: '', telefono: '', horario: '', lat: 5.07, lng: -75.51, estado: 'abierto', imagen: null })
  const [puntoForm, setPuntoForm] = useState<{ nombre: string; tipo: string; direccion: string; telefono: string; imagen: string | null; color: string; lat: number; lng: number }>({ nombre: '', tipo: 'Centro de acopio', direccion: '', telefono: '', imagen: null, color: randomColor(), lat: 5.07, lng: -75.51 })
  const [showEventoForm, setShowEventoForm] = useState<any>(null)
  const [eventoForm, setEventoForm] = useState<{ punto_id: number; titulo: string; descripcion: string; direccion: string; lat: number; lng: number; fechaInicio: string; fechaFin: string; activo: boolean }>({ punto_id: 0, titulo: '', descripcion: '', direccion: '', lat: 5.07, lng: -75.51, fechaInicio: '', fechaFin: '', activo: true })
  const [noticiaForm, setNoticiaForm] = useState({ titulo: '', contenido: '', autor: '', ciudad_noticia: '' as string | null })
  const [danoForm, setDanoForm] = useState<{ estado: 'pendiente' | 'visita_programada' | 'visitado'; fecha_visita: string; resultado_visita: string; notas_admin: string }>({ estado: 'pendiente', fecha_visita: '', resultado_visita: '', notas_admin: '' })

  const handleLogin = async () => {
    const ok = await loginAdmin(password)
    if (ok) {
      sessionStorage.setItem('cr_admin', '1')
      setRol(getAdminRol())
      setAuthed(true)
    } else {
      setLoginError(true)
    }
  }

  const handleLogout = async () => {
    sessionStorage.removeItem('cr_admin')
    await logoutAdmin()
    setRol('admin')
    setAuthed(false)
  }

  /** Abre el modal que pide la contraseña de admin antes de ejecutar la acción destructiva. */
  const requireAdmin = (label: string, fn: () => Promise<unknown> | unknown) => {
    setConfirmPass('')
    setConfirmError(false)
    setConfirmLoading(false)
    setConfirmDel({ label, fn })
  }

  /** Verifica la contraseña contra el backend y, si es válida, ejecuta el borrado. */
  const confirmDelExecute = async () => {
    if (!confirmDel) return
    if (!confirmPass.trim()) { setConfirmError(true); return }
    setConfirmLoading(true)
    try {
      const { ok } = await verifyAdmin(confirmPass.trim())
      if (!ok) { setConfirmError(true); setConfirmLoading(false); return }
      await confirmDel.fn()
      setConfirmDel(null)
    } catch {
      setConfirmError(true)
    }
    setConfirmLoading(false)
  }

  const loadVisitas = async () => {
    setVisitasLoading(true)
    try { setVisitas(await listVisitas(100)) } catch (e) { alert(e instanceof Error ? e.message : String(e)) }
    setVisitasLoading(false)
  }

  const loadClics = async () => {
    try { setClics(await clicsResumen()) } catch (e) { alert(e instanceof Error ? e.message : String(e)) }
  }

  const loadAuditoria = async () => {
    setAuditLoading(true)
    try { setAuditoria(await listAuditoria(200)) } catch (e) { alert(e instanceof Error ? e.message : String(e)) }
    setAuditLoading(false)
  }

  useEffect(() => { if (authed && section === 'visitas') { loadVisitas(); loadClics() } }, [authed, section])
  useEffect(() => { if (authed && section === 'auditoria') loadAuditoria() }, [authed, section])
  // Contador de visitas para el resumen (se refresca al entrar y al visitar la sección)
  useEffect(() => {
    if (!authed) return
    visitasResumen().then(setVisitasKpi).catch(() => { /* silencioso */ })
  }, [authed])

  // ── Datos filtrados por ciudad ──
  const cSectores = sectores.filter(s => s.ciudad === ciudad)
  const cOfrecimientos = ofrecimientos.filter(o => o.ciudad === ciudad)
  const cMascotas = mascotas.filter(m => m.ciudad === ciudad)
  const cCentros = centros.filter(c => c.ciudad === ciudad)
  const cNoticias = noticias.filter(n => n.ciudad === null || n.ciudad === ciudad)
  const cViviendas = viviendas.filter(v => v.ciudad === ciudad)
  const cDanos = danos.filter(d => d.ciudad === ciudad)
  const cNecesidades = necesidades.filter(n => cSectores.some(s => s.id === n.sector_id))

  const sectorOf = (sectorId: number) => sectores.find(s => s.id === sectorId)

  // ── KPIs ──
  const kpis = useMemo(() => ({
    urgentes: cNecesidades.filter(n => n.estado === 'requiere' && !n.responsable).length,
    enProceso: cNecesidades.filter(n => n.estado === 'requiere' && n.responsable).length,
    atendidas: cNecesidades.filter(n => n.estado === 'atendida').length,
    disponibles: cOfrecimientos.filter(o => o.estado === 'disponible' && !o.reservado_por).length,
    danosPendientes: cDanos.filter(d => d.estado === 'pendiente').length,
    viviendas: cViviendas.filter(v => v.estado === 'disponible').length,
  }), [cNecesidades, cOfrecimientos, cDanos, cViviendas])

  // ── Búsqueda y filtros por sección ──
  const q = search.trim().toLowerCase()
  const hasDate = !!(dateFrom || dateTo)

  const needsRows = useMemo(() => {
    const rows = cNecesidades.filter(n => {
      if (nChip === 'urgentes' && !(n.estado === 'requiere' && !n.responsable)) return false
      if (nChip === 'en_proceso' && !(n.estado === 'requiere' && n.responsable)) return false
      if (nChip === 'atendidas' && n.estado !== 'atendida') return false
      if (hasDate && !inDateRange(n.fecha, dateFrom, dateTo)) return false
      if (q) {
        const s = sectorOf(n.sector_id)
        const text = `${n.tipo} ${n.descripcion} ${n.cantidad} ${n.reportado_por} ${n.telefono_reporta} ${s?.nombre ?? ''}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
    return byDateDesc(rows, n => n.fecha)
  }, [cNecesidades, nChip, q, hasDate, dateFrom, dateTo, sectores])

  const ofsRows = useMemo(() => {
    const rows = cOfrecimientos.filter(o => {
      if (oChip === 'disponibles' && !(o.estado === 'disponible' && !o.reservado_por)) return false
      if (oChip === 'reservados' && !(o.estado === 'disponible' && o.reservado_por)) return false
      if (oChip === 'entregados' && o.estado !== 'entregado') return false
      if (hasDate && !inDateRange(o.fecha, dateFrom, dateTo)) return false
      if (q && `${o.tipo} ${o.descripcion} ${o.nombre_ofrece} ${o.telefono_ofrece}`.toLowerCase().includes(q) === false) return false
      return true
    })
    return byDateDesc(rows, o => o.fecha)
  }, [cOfrecimientos, oChip, q, hasDate, dateFrom, dateTo])

  const petsRows = useMemo(() => {
    const rows = cMascotas.filter(m => {
      if (mChip === 'perdidas' && m.estado !== 'perdido') return false
      if (mChip === 'encontradas' && m.estado !== 'encontrado') return false
      if (hasDate && !inDateRange(m.fecha_visto, dateFrom, dateTo)) return false
      if (q && `${m.nombre} ${m.tipo_animal} ${m.senas} ${m.lugar_visto} ${m.nombre_reporta}`.toLowerCase().includes(q) === false) return false
      return true
    })
    return byDateDesc(rows, m => m.fecha_visto)
  }, [cMascotas, mChip, q, hasDate, dateFrom, dateTo])

  const centrosRows = useMemo(() => {
    const rows = cCentros.filter(c => {
      if (cChip === 'abiertos' && c.estado !== 'abierto') return false
      if (cChip === 'cerrados' && c.estado !== 'cerrado') return false
      if (q && `${c.nombre} ${c.organizacion} ${c.direccion} ${c.que_recibe}`.toLowerCase().includes(q) === false) return false
      return true
    })
    return byDateDesc(rows, () => null)
  }, [cCentros, cChip, q])

  const viviendasRows = useMemo(() => {
    const rows = cViviendas.filter(v => {
      if (vChip === 'disponibles' && v.estado !== 'disponible') return false
      if (vChip === 'ocupadas' && v.estado !== 'ocupado') return false
      if (hasDate && !inDateRange((v as any).fecha, dateFrom, dateTo)) return false
      if (q && `${v.sector_referencia} ${v.descripcion} ${v.nombre_ofrece} ${v.telefono_ofrece}`.toLowerCase().includes(q) === false) return false
      return true
    })
    return byDateDesc(rows, v => (v as any).fecha)
  }, [cViviendas, vChip, q, hasDate, dateFrom, dateTo])

  const danosRows = useMemo(() => {
    const rows = cDanos.filter(d => {
      if (dChip === 'pendientes' && d.estado !== 'pendiente') return false
      if (dChip === 'visita' && d.estado !== 'visita_programada') return false
      if (dChip === 'visitados' && d.estado !== 'visitado') return false
      if (hasDate && !inDateRange(d.fecha, dateFrom, dateTo)) return false
      if (q && `${d.radicado} ${d.tipo_inmueble} ${d.direccion} ${d.descripcion} ${d.nombre_reportante} ${d.telefono_reportante} ${d.cedula ?? ''}`.toLowerCase().includes(q) === false) return false
      return true
    })
    return byDateDesc(rows, d => d.fecha)
  }, [cDanos, dChip, q, hasDate, dateFrom, dateTo])

  const noticiasRows = useMemo(() => {
    const rows = cNoticias.filter(n => {
      if (hasDate && !inDateRange(n.fecha, dateFrom, dateTo)) return false
      if (q && `${n.titulo} ${n.contenido} ${n.autor}`.toLowerCase().includes(q) === false) return false
      return true
    })
    return byDateDesc(rows, n => n.fecha)
  }, [cNoticias, q, hasDate, dateFrom, dateTo])

  const sectoresRows = useMemo(() => {
    const rows = cSectores.filter(s => {
      if (hasDate && !inDateRange((s as any).created_at, dateFrom, dateTo)) return false
      if (q && `${s.nombre} ${s.barrio} ${s.descripcion}`.toLowerCase().includes(q) === false) return false
      return true
    })
    return byDateDesc(rows, s => (s as any).created_at)
  }, [cSectores, q, hasDate, dateFrom, dateTo])

  // Actividad reciente (todas las entidades, más reciente primero)
  const actividad = useMemo(() => {
    const items: { key: string; icon: string; titulo: string; detalle: string; fecha: string }[] = []
    cNecesidades.forEach(n => {
      const s = sectorOf(n.sector_id)
      items.push({ key: `n${n.id}`, icon: '🆘', titulo: `${n.tipo}${n.cantidad ? ` — ${n.cantidad}` : ''}`, detalle: `📍 ${s?.nombre ?? 'Sector'} · ${n.reportado_por}`, fecha: n.fecha })
    })
    cOfrecimientos.forEach(o => items.push({ key: `o${o.id}`, icon: '🤝', titulo: o.tipo, detalle: `Ofrece: ${o.nombre_ofrece}`, fecha: o.fecha }))
    cMascotas.forEach(m => items.push({ key: `m${m.id}`, icon: '🐾', titulo: `${m.nombre || m.tipo_animal}`, detalle: `📍 ${m.lugar_visto || 'Sin lugar'}`, fecha: m.fecha_visto }))
    cViviendas.forEach(v => items.push({ key: `v${v.id}`, icon: '🏠', titulo: v.sector_referencia || 'Vivienda', detalle: `Ofrece: ${v.nombre_ofrece}`, fecha: (v as any).fecha ?? '' }))
    cDanos.forEach(d => items.push({ key: `d${d.id}`, icon: '🏚️', titulo: `${d.tipo_inmueble} — ${d.direccion}`, detalle: `Radicado ${d.radicado}`, fecha: d.fecha }))
    cNoticias.forEach(n => items.push({ key: `i${n.id}`, icon: '📰', titulo: n.titulo, detalle: `✍️ ${n.autor || 'Equipo'}`, fecha: n.fecha }))
    return items.sort((a, b) => dateTs(b.fecha) - dateTs(a.fecha)).slice(0, 15)
  }, [cNecesidades, cOfrecimientos, cMascotas, cViviendas, cDanos, cNoticias, sectores])

  // ── Acciones (se conserva la funcionalidad existente) ──
  const pinTabla = (type: string) =>
    type === 'necesidad' ? 'necesidades' : type === 'ofrecimiento' ? 'ofrecimientos' : type === 'mascota' ? 'mascotas_perdidas' : type === 'punto' ? 'puntos_apoyo' : 'viviendas'

  const showPin = (pin: string | null, id: number, type: string) => {
    setShowPinModal({ pin, id, type })
    // El PIN ya no viaja en los listados: se consulta por el endpoint protegido.
    if (!pin) {
      setPinLoading(true)
      verPin(pinTabla(type), id)
        .then(r => setShowPinModal(p => (p && p.id === id ? { ...p, pin: r.pin } : p)))
        .catch(() => setShowPinModal(p => (p && p.id === id ? { ...p, pin: '(sin código)' } : p)))
        .finally(() => setPinLoading(false))
    }
  }
  const resetPin = async (id: number, type: string) => {
    const tabla = pinTabla(type)
    const { pin } = await restablecerPin(tabla, id)
    setShowPinModal(prev => prev ? { ...prev, pin } : null)
  }

  const submitCentro = async () => {
    const r = showCentroForm?.id
      ? await updateCentro(showCentroForm.id, centroForm)
      : await addCentro({ ...centroForm, ciudad })
    if (!r) return
    setShowCentroForm(null)
  }

  /** Geocodifica la dirección del punto de apoyo (Nominatim/OSM). */
  const geocodePunto = async () => {
    const q = `${puntoForm.direccion}, ${ciudad}`.trim()
    if (!q) { alert('Escribe primero la dirección'); return }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length) {
        setPuntoForm(p => ({ ...p, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }))
      } else {
        alert('No se encontraron coordenadas para esa dirección. Ajusta la dirección o ingresa lat/lng manualmente.')
      }
    } catch {
      alert('No se pudo consultar el geocodificador. Ingresa lat/lng manualmente.')
    }
  }

  const submitPunto = async () => {
    if (!puntoForm.nombre.trim()) { alert('El nombre es obligatorio'); return }
    if (!puntoForm.direccion.trim()) { alert('La dirección es obligatoria'); return }
    const r = showPuntoForm?.id
      ? await updatePuntoApoyo(showPuntoForm.id, puntoForm)
      : await addPuntoApoyo({ ...puntoForm, ciudad })
    if (!r) return
    setShowPuntoForm(null)
    setPuntoForm({ nombre: '', tipo: 'Centro de acopio', direccion: '', telefono: '', imagen: null, color: randomColor(), lat: 5.07, lng: -75.51 })
  }

  // ── Eventos (edición con la llave de admin, sin PIN) ──
  const openEventoAdd = () => {
    const defInicio = toLocalInput(new Date().toISOString())
    const defFin = toLocalInput(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString())
    setEventoForm({
      punto_id: (puntosApoyo.find(p => p.ciudad === ciudad)?.id) ?? 0,
      titulo: '', descripcion: '', direccion: '', lat: 5.07, lng: -75.51,
      fechaInicio: defInicio, fechaFin: defFin, activo: true,
    })
    setShowEventoForm({})
  }

  const openEventoEdit = (e: any) => {
    setEventoForm({
      punto_id: e.punto?.id ?? 0,
      titulo: e.titulo, descripcion: e.descripcion, direccion: e.direccion,
      lat: e.lat, lng: e.lng,
      fechaInicio: toLocalInput(e.fecha_inicio), fechaFin: toLocalInput(e.fecha_fin),
      activo: e.activo,
    })
    setShowEventoForm(e)
  }

  const geocodeEvento = async () => {
    const q = `${eventoForm.direccion}, ${ciudad}`.trim()
    if (!q) { alert('Escribe primero la dirección'); return }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length) {
        setEventoForm(p => ({ ...p, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }))
      } else {
        alert('No se encontraron coordenadas para esa dirección. Ajusta la dirección o ingresa lat/lng manualmente.')
      }
    } catch {
      alert('No se pudo consultar el geocodificador. Ingresa lat/lng manualmente.')
    }
  }

  const submitEvento = async () => {
    if (!eventoForm.titulo.trim()) { alert('El título del evento es obligatorio'); return }
    if (!eventoForm.punto_id) { alert('Selecciona el punto de apoyo al que se asocia el evento'); return }
    const fecha_inicio = fromLocalInput(eventoForm.fechaInicio)
    if (!fecha_inicio) { alert('Indica la fecha de inicio del evento'); return }
    const fecha_fin = fromLocalInput(eventoForm.fechaFin)
    const base = {
      titulo: eventoForm.titulo.trim(),
      descripcion: eventoForm.descripcion.trim(),
      direccion: eventoForm.direccion.trim(),
      lat: eventoForm.lat, lng: eventoForm.lng,
      activo: eventoForm.activo,
      fecha_inicio, fecha_fin,
    }
    const r = showEventoForm?.id
      ? await updateEvento(showEventoForm.id, base)
      : await addEvento({ ...base, punto_apoyo_id: eventoForm.punto_id })
    if (!r) return
    setShowEventoForm(null)
  }

  const submitNoticia = async () => {
    if (!noticiaForm.titulo.trim()) { alert('El título es obligatorio'); return }
    const ciudadIdNoticia = noticiaForm.ciudad_noticia ? cityId(noticiaForm.ciudad_noticia) : null
    const r = showNoticiaForm?.id
      ? await updateNoticia(showNoticiaForm.id, {
          titulo: noticiaForm.titulo, contenido: noticiaForm.contenido,
          autor: noticiaForm.autor, ciudad: ciudadIdNoticia
        })
      : await addNoticia({
          titulo: noticiaForm.titulo, contenido: noticiaForm.contenido,
          autor: noticiaForm.autor, ciudad: ciudadIdNoticia,
          imagen: null, fecha: new Date().toISOString()
        })
    if (!r) return
    setShowNoticiaForm(null)
  }

  const submitDanoGestionar = async () => {
    if (!showDanoGestionar) return
    const r = await updateDano(showDanoGestionar.id, {
      estado: danoForm.estado,
      fecha_visita: danoForm.fecha_visita || null,
      resultado_visita: danoForm.resultado_visita || null,
      notas_admin: danoForm.notas_admin || null,
    })
    if (!r) return
    setShowDanoGestionar(null)
  }

  const submitAddNeed = async () => {
    if (!showAddNeed) return
    if (!newNeedForm.reportado_por.trim()) { alert('El nombre es obligatorio'); return }
    const pin = await store.addNecesidad({
      sector_id: showAddNeed, tipo: newNeedForm.tipo, descripcion: newNeedForm.descripcion,
      cantidad: newNeedForm.cantidad, prioridad: newNeedForm.prioridad, estado: 'requiere',
      responsable: null, reportado_por: newNeedForm.reportado_por,
      telefono_reporta: newNeedForm.telefono_reporta, fecha: new Date().toISOString(), imagen: null
    })
    if (!pin) return
    setShowAddNeed(null)
    setNewNeedForm({ tipo: 'Agua potable', cantidad: '', prioridad: 'alta', descripcion: '', reportado_por: '', telefono_reporta: '' })
  }

  const NAV: { id: string; icon: string; label: string }[] = [
    { id: 'resumen', icon: '📊', label: 'Resumen' },
    { id: 'necesidades', icon: '🆘', label: 'Necesidades' },
    { id: 'ofrecimientos', icon: '🤝', label: 'Ofrecimientos' },
    { id: 'sectores', icon: '📍', label: 'Sectores' },
    { id: 'danos', icon: '🏚️', label: 'Daños' },
    { id: 'viviendas', icon: '🏠', label: 'Viviendas' },
    { id: 'centros', icon: '📦', label: 'Centros' },
    { id: 'puntos', icon: '🏪', label: 'Puntos de apoyo' },
    { id: 'eventos', icon: '📅', label: 'Eventos' },
    { id: 'noticias', icon: '📰', label: 'Noticias' },
    { id: 'visitas', icon: '👥', label: 'Visitas' },
    { id: 'auditoria', icon: '🧾', label: 'Auditoría' },
    // Visitas y auditoría son solo para el rol owner.
  ].filter(n => (n.id !== 'visitas' && n.id !== 'auditoria') || rol === 'owner')

  const renderSection = () => {
    // Aunque los tabs estén ocultos, blindamos las secciones por si se navega directo.
    if ((section === 'auditoria' || section === 'visitas') && rol !== 'owner') {
      return (
        <Section title={section === 'auditoria' ? 'Auditoría' : 'Visitas'} icon="🔒" count={0}>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            🔒 Esta sección solo está disponible para el rol <strong>owner</strong>.
          </p>
        </Section>
      )
    }
    if (section === 'necesidades') {
      return (
        <Section title="Necesidades reportadas" icon="🆘" count={needsRows.length} toolbar={
          <Toolbar search={search} setSearch={setSearch} placeholder="Buscar por tipo, descripción, sector o teléfono…"
            chips={[
              { id: 'urgentes', label: '🔴 Urgentes' },
              { id: 'en_proceso', label: '🟠 En proceso' },
              { id: 'atendidas', label: '✅ Atendidas' },
              { id: 'todos', label: 'Todas' },
            ]} chip={nChip} setChip={setNChip}
            dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Fecha</Th><Th>Necesidad</Th><Th>Estado</Th><Th>Prioridad</Th><Th>Reporta</Th><Th>Sector</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {needsRows.length === 0 && <Empty text="Sin necesidades con estos filtros." />}
              {needsRows.map((n: Necesidad) => (
                <tr key={n.id} className="row-hover">
                  <Td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtFecha(n.fecha)}</Td>
                  <Td>
                    <TipoSelect value={n.tipo} groups={TIPOS_NECESIDAD_GRUPOS} onPick={v => updateNecesidad(n.id, { tipo: v })} />
                    {n.cantidad && <><br /><span style={{ color: '#6b7280', fontSize: 12 }}>{n.cantidad}</span></>}
                    <br /><span style={{ fontSize: 12, color: '#6b7280' }}>{n.descripcion?.slice(0, 90)}</span>
                  </Td>
                  <Td>{n.responsable ? <StatusTag v="en_proceso" /> : n.estado === 'atendida' ? <StatusTag v="atendida" /> : <StatusTag v="urgente" />}</Td>
                  <Td><span className={`tag ${n.prioridad === 'alta' ? 'tag-red' : n.prioridad === 'media' ? 'tag-orange' : 'tag-gray'}`}>{n.prioridad}</span></Td>
                  <Td>{n.reportado_por}<br /><span style={{ fontSize: 12, color: '#6b7280' }}>{n.telefono_reporta}</span></Td>
                  <Td style={{ fontSize: 12.5 }}>{sectorOf(n.sector_id)?.nombre ?? '—'}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {n.responsable ? (
                        <button className="btn btn-xs btn-outline" onClick={() => updateNecesidad(n.id, { responsable: null })}>Liberar</button>
                      ) : n.estado !== 'atendida' ? (
                        <button className="btn btn-xs btn-green" onClick={() => updateNecesidad(n.id, { estado: 'atendida' })}>✓ Atendida</button>
                      ) : (
                        <button className="btn btn-xs btn-outline" onClick={() => updateNecesidad(n.id, { estado: 'requiere' })}>Reabrir</button>
                      )}
                      {n.responsable && <span style={{ fontSize: 11, color: '#2E9E5B' }}>🙋 {n.responsable.nombre}</span>}
                      <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(n.pin, n.id, 'necesidad')}>🔑 PIN</button>
                      <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar esta necesidad? Esta acción no se puede deshacer.', () => deleteNecesidad(n.id))}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'ofrecimientos') {
      return (
        <Section title="Ofrecimientos de ayuda" icon="🤝" count={ofsRows.length} toolbar={
          <Toolbar search={search} setSearch={setSearch} placeholder="Buscar por tipo, descripción o nombre…"
            chips={[
              { id: 'disponibles', label: '🟢 Disponibles' },
              { id: 'reservados', label: '🟠 Reservados' },
              { id: 'entregados', label: '✅ Entregados' },
              { id: 'todos', label: 'Todos' },
            ]} chip={oChip} setChip={setOChip}
            dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Fecha</Th><Th>Estado</Th><Th>Tipo</Th><Th>Ofrece</Th><Th>Reservado por</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {ofsRows.length === 0 && <Empty text="Sin ofrecimientos con estos filtros." />}
              {ofsRows.map(o => (
                <tr key={o.id} className="row-hover">
                  <Td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtFecha(o.fecha)}</Td>
                  <Td>{o.estado === 'entregado' ? <StatusTag v="entregado" /> : o.reservado_por ? <StatusTag v="reservado" /> : <StatusTag v="disponible" />}</Td>
                  <Td>
                    <TipoSelect value={o.tipo} options={CATEGORIAS_OFRECIMIENTO} onPick={v => updateOfrecimiento(o.id, { tipo: v })} />
                    {o.cantidad && <><br /><span style={{ color: '#6b7280', fontSize: 12 }}>{o.cantidad}</span></>}
                    <br /><span style={{ fontSize: 12, color: '#6b7280' }}>{o.descripcion?.slice(0, 80)}</span>
                  </Td>
                  <Td>{o.nombre_ofrece}<br /><span style={{ color: '#6b7280', fontSize: 12 }}>{o.telefono_ofrece}</span></Td>
                  <Td>{o.reservado_por ? <span>{o.reservado_por.nombre}<br /><span style={{ color: '#6b7280', fontSize: 12 }}>{o.reservado_por.telefono}</span></span> : '—'}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {o.reservado_por && <button className="btn btn-xs btn-outline" onClick={() => updateOfrecimiento(o.id, { reservado_por: null })}>Liberar</button>}
                      {o.estado === 'disponible' && !o.reservado_por && (
                        <button className="btn btn-xs btn-green" onClick={() => updateOfrecimiento(o.id, { estado: 'entregado' })}>✓ Entregado</button>
                      )}
                      <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(o.pin, o.id, 'ofrecimiento')}>🔑 PIN</button>
                      <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar este ofrecimiento? Esta acción no se puede deshacer.', () => deleteOfrecimiento(o.id))}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'sectores') {
      return (
        <Section title="Sectores reportados" icon="📍" count={sectoresRows.length}
          onExport={() => exportCSV(
            sectoresRows.flatMap(s => necesidades.filter(n => n.sector_id === s.id).map(n => ({
              sector: s.nombre, barrio: s.barrio, nivel: s.nivel_afectacion,
              necesidad: n.tipo, cantidad: n.cantidad, prioridad: n.prioridad,
              estado: n.estado, responsable: n.responsable?.nombre || '', fecha: n.fecha
            }))),
            `sectores-${ciudad}.csv`
          )}
          toolbar={
            <Toolbar search={search} setSearch={setSearch} placeholder="Buscar sector o barrio…"
              dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
          }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Sector</Th><Th>Nivel</Th><Th>Estado</Th><Th>Necesidades</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {sectoresRows.length === 0 && <Empty text="Sin sectores con estos filtros." />}
              {sectoresRows.map(s => {
                const ns = byDateDesc(necesidades.filter(n => n.sector_id === s.id), n => n.fecha)
                return (
                  <tr key={s.id} className="row-hover">
                    <Td><span style={{ fontWeight: 600 }}>{s.nombre}</span><br /><span style={{ color: '#6b7280', fontSize: 12 }}>{s.barrio}</span></Td>
                    <Td><span className={`tag ${s.nivel_afectacion === 'severo' ? 'tag-red' : s.nivel_afectacion === 'moderado' ? 'tag-orange' : 'tag-gray'}`}>{s.nivel_afectacion.toUpperCase()}</span></Td>
                    <Td><StatusTag v={s.estado} /></Td>
                    <Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {ns.map(n => (
                          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <span style={{ flex: 1 }}>{n.tipo} {n.cantidad ? `(${n.cantidad})` : ''} · <span style={{ color: '#9AA0AC' }}>{fmtFecha(n.fecha)}</span></span>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                              <input type="checkbox" checked={n.estado === 'atendida'} onChange={e => updateNecesidad(n.id, { estado: e.target.checked ? 'atendida' : 'requiere' })} />
                              atendida
                            </label>
                            <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(n.pin, n.id, 'necesidad')}>🔑</button>
                            {n.responsable && <button className="btn btn-xs btn-outline" onClick={() => updateNecesidad(n.id, { responsable: null })}>Liberar</button>}
                            <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar esta necesidad? Esta acción no se puede deshacer.', () => deleteNecesidad(n.id))}>✕</button>
                          </div>
                        ))}
                        <button className="btn btn-xs btn-outline" style={{ marginTop: 4, width: 'fit-content' }} onClick={() => setShowAddNeed(s.id)}>+ Agregar necesidad</button>
                      </div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-xs btn-outline" onClick={() => {
                          const name = prompt('Nuevo nombre del sector:', s.nombre)
                          if (name) updateSector(s.id, { nombre: name })
                        }}>✎ Nombre</button>
                        <button className="btn btn-xs" style={{ background: '#f0f4ff', color: '#003893' }} onClick={() => updateSector(s.id, { estado: s.estado === 'activo' ? 'cerrado' : 'activo' })}>
                          {s.estado === 'activo' ? 'Cerrar' : 'Reactivar'}
                        </button>
                        <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar este sector y sus necesidades? Esta acción no se puede deshacer.', () => deleteSector(s.id))}>✕</button>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'danos') {
      return (
        <Section title="Reportes de daños estructurales" icon="🏚️" count={danosRows.length}
          onExport={() => exportCSV(
            danosRows.map(d => ({
              radicado: d.radicado, tipo: d.tipo_inmueble, direccion: d.direccion,
              nivel: d.nivel_percibido, habitado: d.habitado, estado: d.estado,
              nombre: d.nombre_reportante, telefono: d.telefono_reportante, cedula: d.cedula || '',
              fecha: d.fecha, fecha_visita: d.fecha_visita || '', resultado: d.resultado_visita || ''
            })),
            `danos-${ciudad}.csv`
          )}
          toolbar={
            <Toolbar search={search} setSearch={setSearch} placeholder="Buscar por radicado, dirección o reportante…"
              chips={[
                { id: 'pendientes', label: '🔴 Pendientes' },
                { id: 'visita', label: '🟠 Con visita' },
                { id: 'visitados', label: '✅ Visitados' },
                { id: 'todos', label: 'Todos' },
              ]} chip={dChip} setChip={setDChip}
              dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
          }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Fecha</Th><Th>Estado</Th><Th>Radicado</Th><Th>Inmueble</Th><Th>Nivel</Th><Th>Reportante</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {danosRows.length === 0 && <Empty text="Sin reportes con estos filtros." />}
              {danosRows.map((d: ReporteDano) => (
                <tr key={d.id} className="row-hover">
                  <Td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtFecha(d.fecha)}</Td>
                  <Td><StatusTag v={d.estado} /></Td>
                  <Td><code style={{ fontSize: 12, background: '#f1f3f5', padding: '2px 6px', borderRadius: 6 }}>{d.radicado}</code></Td>
                  <Td><span style={{ fontWeight: 600 }}>{d.tipo_inmueble}</span><br /><span style={{ fontSize: 12, color: '#6b7280' }}>{d.direccion.slice(0, 40)}</span></Td>
                  <Td><span className={`tag ${d.nivel_percibido === 'colapso' || d.nivel_percibido === 'severo' ? 'tag-red' : d.nivel_percibido === 'moderado' ? 'tag-orange' : 'tag-gray'}`}>{d.nivel_percibido}</span></Td>
                  <Td>{d.nombre_reportante}<br /><span style={{ fontSize: 12, color: '#6b7280' }}>{d.telefono_reportante}</span>{d.cedula && <span style={{ fontSize: 11, color: '#9AA0AC', display: 'block' }}>CC: {d.cedula}</span>}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-xs btn-outline" onClick={() => {
                        setDanoForm({ estado: d.estado, fecha_visita: d.fecha_visita || '', resultado_visita: d.resultado_visita || '', notas_admin: d.notas_admin || '' })
                        setShowDanoGestionar(d)
                      }}>✎ Gestionar</button>
                      <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar este reporte de daños? Esta acción no se puede deshacer.', () => deleteDano(d.id))}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'mascotas') {
      return (
        <Section title="Mascotas reportadas" icon="🐾" count={petsRows.length} toolbar={
          <Toolbar search={search} setSearch={setSearch} placeholder="Buscar por nombre, raza o señas…"
            chips={[
              { id: 'perdidas', label: '🔴 Perdidas' },
              { id: 'encontradas', label: '✅ Encontradas' },
              { id: 'todos', label: 'Todas' },
            ]} chip={mChip} setChip={setMChip}
            dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Fecha</Th><Th>Estado</Th><Th>Animal</Th><Th>Señas</Th><Th>Reporta</Th><Th>Avistado por</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {petsRows.length === 0 && <Empty text="Sin mascotas con estos filtros." />}
              {petsRows.map(m => (
                <tr key={m.id} className="row-hover">
                  <Td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtFecha(m.fecha_visto)}</Td>
                  <Td><StatusTag v={m.estado} /></Td>
                  <Td><span style={{ fontWeight: 600 }}>{m.nombre || 'S/N'}</span> ·{' '}
                    <TipoSelect value={m.tipo_animal} options={TIPOS_ANIMAL} onPick={v => updateMascota(m.id, { tipo_animal: v })} />
                  </Td>
                  <Td style={{ maxWidth: 180 }}><span style={{ fontSize: 12, color: '#6b7280' }}>{m.senas.slice(0, 60)}</span></Td>
                  <Td>{m.nombre_reporta}<br /><span style={{ fontSize: 12, color: '#6b7280' }}>{m.telefono_reporta}</span></Td>
                  <Td>{m.avistado_por ? `${m.avistado_por.nombre}` : '—'}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {m.estado === 'perdido' && (
                        <button className="btn btn-xs btn-green" onClick={() => { if (confirm('¿Marcar como encontrada?')) updateMascota(m.id, { estado: 'encontrado' }) }}>✓ Encontrada</button>
                      )}
                      <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(m.pin, m.id, 'mascota')}>🔑 PIN</button>
                      <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar este registro de mascota? Esta acción no se puede deshacer.', () => deleteMascota(m.id))}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'viviendas') {
      return (
        <Section title="Ofertas de vivienda" icon="🏠" count={viviendasRows.length} toolbar={
          <Toolbar search={search} setSearch={setSearch} placeholder="Buscar por sector o nombre…"
            chips={[
              { id: 'disponibles', label: '🟢 Disponibles' },
              { id: 'ocupadas', label: '⚪ Ocupadas' },
              { id: 'todos', label: 'Todas' },
            ]} chip={vChip} setChip={setVChip}
            dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Fecha</Th><Th>Estado</Th><Th>Tipo</Th><Th>Sector</Th><Th>Ofrece</Th><Th>Interesado</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {viviendasRows.length === 0 && <Empty text="Sin viviendas con estos filtros." />}
              {viviendasRows.map(v => (
                <tr key={v.id} className="row-hover">
                  <Td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtFecha((v as any).fecha)}</Td>
                  <Td><StatusTag v={v.estado} /></Td>
                  <Td>{v.tipo === 'alquiler' ? `💰 ${v.precio}` : '🏠 Gratis'}</Td>
                  <Td>{v.sector_referencia}</Td>
                  <Td>{v.nombre_ofrece}<br /><span style={{ fontSize: 12, color: '#6b7280' }}>{v.telefono_ofrece}</span></Td>
                  <Td>{v.interesado ? `${v.interesado.nombre}` : '—'}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(v.pin, v.id, 'vivienda')}>🔑 PIN</button>
                      <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar esta vivienda? Esta acción no se puede deshacer.', () => deleteVivienda(v.id))}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'centros') {
      return (
        <Section title="Centros de acopio" icon="📦" count={centrosRows.length} toolbar={
          <Toolbar search={search} setSearch={setSearch} placeholder="Buscar por nombre, dirección o qué recibe…"
            chips={[
              { id: 'abiertos', label: '🟢 Abiertos' },
              { id: 'cerrados', label: '⚪ Cerrados' },
              { id: 'todos', label: 'Todos' },
            ]} chip={cChip} setChip={setCChip}
            dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
            extra={<button className="btn btn-primary btn-sm" onClick={() => {
              setCentroForm({ nombre: '', organizacion: '', es_acopio: true, es_sangre: false, es_alojamiento: false, que_recibe: '', direccion: '', telefono: '', horario: '', lat: 5.07, lng: -75.51, estado: 'abierto', imagen: null })
              setShowCentroForm({})
            }}>+ Agregar centro</button>} />
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Estado</Th><Th>Nombre</Th><Th>Tipos</Th><Th>Recibe</Th><Th>Dirección</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {centrosRows.length === 0 && <Empty text="Sin centros con estos filtros." />}
              {centrosRows.map(c => (
                <tr key={c.id} className="row-hover">
                  <Td><StatusTag v={c.estado} /></Td>
                  <Td><span style={{ fontWeight: 600 }}>{c.nombre}</span><br /><span style={{ fontSize: 12, color: '#6b7280' }}>{c.organizacion}</span></Td>
                  <Td>{[c.es_acopio && '📦', c.es_sangre && '🩸', c.es_alojamiento && '🏠'].filter(Boolean).join(' ')}</Td>
                  <Td style={{ maxWidth: 160 }}><span style={{ fontSize: 12 }}>{c.que_recibe.slice(0, 50)}</span></Td>
                  <Td style={{ fontSize: 12 }}>{c.direccion}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-xs btn-outline" onClick={() => { setCentroForm({ ...c }); setShowCentroForm(c) }}>✎ Editar</button>
                      <button className="btn btn-xs" style={{ background: '#f0f4ff', color: '#003893' }} onClick={() => updateCentro(c.id, { estado: c.estado === 'abierto' ? 'cerrado' : 'abierto' })}>
                        {c.estado === 'abierto' ? 'Cerrar' : 'Abrir'}
                      </button>
                      <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar este centro? Esta acción no se puede deshacer.', () => deleteCentro(c.id))}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'puntos') {
      const pts = puntosApoyo
        .filter(p => p.ciudad === ciudad)
        .filter(p => !q || `${p.nombre} ${p.tipo} ${p.direccion} ${p.telefono}`.toLowerCase().includes(q))
      return (
        <Section title="Puntos de apoyo" icon="🏪" count={pts.length} toolbar={
          <div className="admin-toolbar">
            <input className="form-input admin-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, tipo, dirección o teléfono…" />
            <button className="btn btn-primary btn-sm" onClick={() => {
              setPuntoForm({ nombre: '', tipo: 'Centro de acopio', direccion: '', telefono: '', imagen: null, color: randomColor(), lat: 5.07, lng: -75.51 })
              setShowPuntoForm({})
            }}>+ Agregar punto de apoyo</button>
          </div>
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Imagen</Th><Th>Nombre</Th><Th>Tipo</Th><Th>Dirección</Th><Th>Teléfono</Th><Th>PIN</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {pts.length === 0 && <Empty text="Sin puntos de apoyo. Agrega el primero." />}
              {pts.map(p => (
                <tr key={p.id} className="row-hover">
                  <Td>
                    {p.imagen
                      ? <img src={p.imagen} alt={p.nombre} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                      : <span style={{ fontSize: 22 }}>🏪</span>}
                  </Td>
                  <Td><span style={{ fontWeight: 600 }}>{p.nombre}</span></Td>
                  <Td>
                    <TipoSelect value={p.tipo || 'Otro'} options={TIPOS_PUNTO_APOYO} onPick={v => updatePuntoApoyo(p.id, { tipo: v })} />
                  </Td>
                  <Td style={{ fontSize: 12.5 }}>{p.direccion}</Td>
                  <Td style={{ fontSize: 12.5 }}>{p.telefono || '—'}</Td>
                  <Td>
                    <button className="btn btn-xs" style={{ background: '#e8eeff', color: '#003893' }} onClick={() => showPin(p.pin, p.id, 'punto')}>🔑 PIN</button>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-xs btn-outline" onClick={() => { setPuntoForm({ nombre: p.nombre, tipo: p.tipo || 'Otro', direccion: p.direccion, telefono: p.telefono, imagen: p.imagen, color: p.color || randomColor(), lat: p.lat, lng: p.lng }); setShowPuntoForm(p) }}>✎ Editar</button>
                      <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar este punto de apoyo? Esta acción no se puede deshacer.', () => deletePuntoApoyo(p.id))}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'eventos') {
      const evs = eventos
        .filter(e => e.ciudad === ciudad)
        .filter(e => !q || `${e.titulo} ${e.descripcion} ${e.direccion} ${e.punto?.nombre ?? ''}`.toLowerCase().includes(q))
      return (
        <Section title="Eventos" icon="📅" count={evs.length} toolbar={
          <div className="admin-toolbar">
            <input className="form-input admin-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título, descripción, dirección o punto…" />
            <button className="btn btn-primary btn-sm" onClick={openEventoAdd}>+ Crear evento</button>
          </div>
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Estado</Th><Th>Evento</Th><Th>Punto de apoyo</Th><Th>Período</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {evs.length === 0 && <Empty text="Sin eventos registrados." />}
              {evs.map(e => (
                <tr key={e.id} className="row-hover">
                  <Td>
                    <span className={`tag ${e.activo ? (e.vigente ? 'tag-green' : 'tag-orange') : 'tag-gray'}`} style={{ fontSize: 11 }}>
                      {e.activo ? (e.vigente ? '🟢 Vigente' : '🟠 Activo (fuera de período)') : '⚪ Inactivo'}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 600 }}>{e.titulo}</span>
                    {e.descripcion && <div style={{ fontSize: 12, color: '#6b7280' }}>{e.descripcion}</div>}
                  </Td>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.punto?.color ?? '#003893', border: '1px solid #e1e4e9', flexShrink: 0 }} />
                      {e.punto?.nombre ?? '—'}
                    </span>
                    {e.punto?.tipo && <div style={{ fontSize: 11.5, color: '#6b7280' }}>{e.punto.tipo}</div>}
                  </Td>
                  <Td style={{ fontSize: 12 }}>
                    {e.fecha_inicio ? fmtFecha(e.fecha_inicio) : '—'}{e.fecha_fin ? ` → ${fmtFecha(e.fecha_fin)}` : ''}
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-xs btn-outline" onClick={() => openEventoEdit(e)}>✎ Editar</button>
                      <button className="btn btn-xs btn-outline" onClick={() => updateEvento(e.id, { activo: !e.activo })}>{e.activo ? '⏸ Desactivar' : '▶ Activar'}</button>
                      <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar este evento? Esta acción no se puede deshacer.', () => deleteEvento(e.id))}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'noticias') {
      return (
        <Section title="Noticias y comunicados" icon="📰" count={noticiasRows.length} toolbar={
          <Toolbar search={search} setSearch={setSearch} placeholder="Buscar por título, contenido o autor…"
            dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
            extra={<button className="btn btn-primary btn-sm" onClick={() => {
              setNoticiaForm({ titulo: '', contenido: '', autor: '', ciudad_noticia: ciudad })
              setShowNoticiaForm({})
            }}>+ Publicar noticia</button>} />
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Fecha</Th><Th>Título</Th><Th>Visible en</Th><Th>Autor</Th><Th>Acciones</Th></tr></thead>
            <tbody>
              {noticiasRows.length === 0 && <Empty text="Sin comunicados con estos filtros." />}
              {noticiasRows.map(n => (
                <tr key={n.id} className="row-hover">
                  <Td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtFecha(n.fecha)}</Td>
                  <Td style={{ maxWidth: 240 }}><span style={{ fontWeight: 600 }}>{n.titulo.slice(0, 60)}</span></Td>
                  <Td>{n.ciudad === null ? <span className="tag tag-yellow">Todas</span> : n.ciudad}</Td>
                  <Td>{n.autor}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-xs btn-outline" onClick={() => { setNoticiaForm({ titulo: n.titulo, contenido: n.contenido, autor: n.autor, ciudad_noticia: n.ciudad }); setShowNoticiaForm(n) }}>✎ Editar</button>
                      <button className="btn btn-xs btn-red" onClick={() => requireAdmin('¿Eliminar esta noticia? Esta acción no se puede deshacer.', () => deleteNoticia(n.id))}>✕</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'visitas') {
      return (
        <Section title="Visitas al sitio" icon="👥" count={visitas.length} toolbar={
          <div className="admin-toolbar" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" onClick={loadVisitas} disabled={visitasLoading}>↻ Actualizar</button>
          </div>
        }>
          {/* 👇 Clics en enlaces (ej. DSI) dentro del módulo de visitas */}
          <div style={{ background: '#f8f9fb', border: '1px solid #e1e4e9', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1f2430' }}>🔗 Clics en enlaces</h3>
              <button className="btn btn-outline btn-sm" onClick={loadClics}>↻</button>
            </div>
            {clics.porEnlace.length === 0 ? (
              <p style={{ fontSize: 12.5, color: '#6b7280', margin: '8px 0 0' }}>Sin clics registrados todavía.</p>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {clics.porEnlace.map(c => (
                  <div key={c.enlace} style={{ flex: 1, minWidth: 130, background: '#fff', border: c.enlace === 'dsi' ? '1.5px solid #003893' : '1px solid #e1e4e9', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: c.enlace === 'dsi' ? '#003893' : '#1f2430' }}>{c.total}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{c.enlace === 'dsi' ? '🏢 DSI' : c.enlace}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Fecha</Th><Th>Hora</Th><Th>Página</Th><Th>Ciudad</Th><Th>Idioma</Th><Th>Referrer</Th></tr></thead>
            <tbody>
              {visitas.length === 0 && <Empty text="Sin visitas registradas." />}
              {visitas.map((v, i) => (
                <tr key={v.id ?? i} className="row-hover">
                  <Td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtDate(v.createdAt)}</Td>
                  <Td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtTime(v.createdAt)}</Td>
                  <Td><code style={{ fontSize: 12 }}>{v.path ?? '/'}</code></Td>
                  <Td>{v.ciudad ?? '—'}</Td>
                  <Td style={{ fontSize: 12 }}>{v.lang ?? '—'}</Td>
                  <Td style={{ maxWidth: 160, fontSize: 12, color: '#6b7280' }}>{v.referrer ? v.referrer.slice(0, 60) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    if (section === 'auditoria') {
      return (
        <Section title="Auditoría (rastro de modificaciones)" icon="🧾" count={auditoria.length} toolbar={
          <div className="admin-toolbar" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" onClick={loadAuditoria} disabled={auditLoading}>↻ Actualizar</button>
          </div>
        }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><Th>Fecha</Th><Th>Tabla</Th><Th>Registro</Th><Th>Acción</Th><Th>Quién</Th><Th>Código</Th><Th>Cambios</Th></tr></thead>
            <tbody>
              {auditoria.length === 0 && <Empty text="Sin modificaciones registradas todavía." />}
              {auditoria.map(a => (
                <tr key={a.id} className="row-hover">
                  <Td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtDateTime(a.createdAt)}</Td>
                  <Td><code style={{ fontSize: 12 }}>{a.tabla}</code></Td>
                  <Td>#{a.registro_id}</Td>
                  <Td>
                    <span className={`tag ${a.accion === 'create' ? 'tag-green' : a.accion === 'update' ? 'tag-orange' : 'tag-red'}`}>
                      {a.accion === 'create' ? 'creado' : a.accion === 'update' ? 'editado' : 'borrado'}
                    </span>
                  </Td>
                  <Td>{a.autor === 'admin' ? '🔐 Admin' : a.autor === 'usuario' ? '👤 Usuario' : '⚙️ Sistema'}</Td>
                  <Td><code style={{ fontSize: 12 }}>{a.codigo ?? '—'}</code></Td>
                  <Td>
                    <button className="btn btn-xs btn-outline" onClick={() => setAuditDetail(a)}>Ver cambios</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )
    }

    // ── Resumen ──
    return (
      <>
        <div className="kpi-grid">
          <KpiCard icon="🔴" label="Urgentes (sin ayuda)" value={kpis.urgentes} tone="red" onClick={() => { setSearch(''); setNChip('urgentes'); setSection('necesidades') }} />
          <KpiCard icon="🟠" label="En proceso" value={kpis.enProceso} tone="orange" onClick={() => { setSearch(''); setNChip('en_proceso'); setSection('necesidades') }} />
          <KpiCard icon="✅" label="Atendidas" value={kpis.atendidas} tone="green" onClick={() => { setSearch(''); setNChip('atendidas'); setSection('necesidades') }} />
          <KpiCard icon="🤝" label="Ofrecimientos libres" value={kpis.disponibles} tone="blue" onClick={() => { setSearch(''); setOChip('disponibles'); setSection('ofrecimientos') }} />
          <KpiCard icon="🏚️" label="Daños pendientes" value={kpis.danosPendientes} tone="red" onClick={() => { setSearch(''); setDChip('pendientes'); setSection('danos') }} />
          <KpiCard icon="🏠" label="Viviendas disponibles" value={kpis.viviendas} tone="blue" onClick={() => { setSearch(''); setVChip('disponibles'); setSection('viviendas') }} />
          {rol === 'owner' && (
            <KpiCard icon="👥" label="Visitas al sitio" value={visitasKpi.total} tone="yellow" sub={`hoy ${visitasKpi.hoy} · ${visitasKpi.unicos} visitantes únicos`} onClick={() => { setSearch(''); setSection('visitas') }} />
          )}
        </div>

        <div className="card admin-section">
          <div className="section-head">
            <h2><span className="section-icon">🔥</span>Últimos reportes (más recientes primero)</h2>
            <span className="count-pill">{actividad.length}</span>
          </div>
          <div style={{ padding: '4px 8px 12px' }}>
            {actividad.length === 0 && <div className="empty-state" style={{ padding: '24px 12px' }}><p>Sin actividad todavía.</p></div>}
            {actividad.map(a => (
              <div key={a.key} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderBottom: '1px solid #f0f0f0', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1f2430' }}>{a.titulo}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{a.detalle}</p>
                </div>
                <span style={{ fontSize: 11.5, color: '#9AA0AC', whiteSpace: 'nowrap' }}>{fmtFecha(a.fecha)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card admin-section">
          <div className="section-head">
            <h2><span className="section-icon">🆘</span>Necesidades urgentes</h2>
            <span className="count-pill">{kpis.urgentes}</span>
          </div>
          <div style={{ padding: '4px 8px 12px' }}>
            {byDateDesc(cNecesidades.filter(n => n.estado === 'requiere' && !n.responsable), n => n.fecha).slice(0, 8).map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>🆘</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1f2430' }}>{n.tipo}{n.cantidad ? ` — ${n.cantidad}` : ''}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>📍 {sectorOf(n.sector_id)?.nombre ?? 'Sector'} · {n.reportado_por} · {n.telefono_reporta}</p>
                </div>
                <button className="btn btn-xs btn-green" onClick={() => updateNecesidad(n.id, { estado: 'atendida' })}>✓ Atendida</button>
              </div>
            ))}
            {kpis.urgentes === 0 && <div className="empty-state" style={{ padding: '24px 12px' }}><p>¡Sin necesidades urgentes pendientes! 🎉</p></div>}
          </div>
        </div>
      </>
    )
  }

  if (!authed) {
    return (
      <div className="login-wrap">
        <div className="tricolor-band" />
        <div className="card login-card">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Acceso administrador</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Ingresa la contraseña de administración</p>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              value={password}
              autoFocus
              onChange={e => { setPassword(e.target.value); setLoginError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ textAlign: 'center', letterSpacing: 4 }}
            />
            {loginError && <p style={{ color: '#CE1126', fontSize: 12, margin: '4px 0 0' }}>Contraseña incorrecta.</p>}
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleLogin}>Ingresar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">
          <span style={{ fontSize: 18 }}>🛠️</span>
          <div>
            <strong>Administración</strong>
            <span style={{ fontSize: 11, color: '#9AA0AC', display: 'block' }}>Estamos contigo</span>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map(item => (
            <button key={item.id} className={`admin-nav-btn ${section === item.id ? 'active' : ''}`} onClick={() => setSection(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1>{NAV.find(n => n.id === section)?.icon} {NAV.find(n => n.id === section)?.label}</h1>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: '2px 0 0' }}>Ciudad: <strong>{ciudad}</strong></p>
          </div>
          <select className="form-select" style={{ width: 'auto', fontSize: 13, padding: '5px 8px', maxWidth: 170 }} value={ciudad} onChange={e => store.setCiudad(e.target.value)} aria-label="Ciudad">
            {CITIES.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
          </select>
        </div>
        {renderSection()}
      </main>

      {/* Detalle de auditoría */}
      {auditDetail && (
        <Modal title={`🧾 Cambios — ${auditDetail.tabla} #${auditDetail.registro_id}`} onClose={() => setAuditDetail(null)} hideCancel wide>
          <p style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 10px' }}>
            {auditDetail.accion === 'create' ? 'Creado' : auditDetail.accion === 'update' ? 'Editado' : 'Borrado'} ·{' '}
            {auditDetail.autor === 'admin' ? '🔐 Admin' : auditDetail.autor === 'usuario' ? '👤 Usuario' : '⚙️ Sistema'} ·{' '}
            {fmtDateTime(auditDetail.createdAt)}
          </p>
          {auditDetail.datos_previos && (
            <div className="form-group">
              <label className="form-label">Antes</label>
              <pre style={{ background: '#f8f9fb', border: '1px solid #e1e4e9', borderRadius: 8, padding: 10, fontSize: 11.5, overflow: 'auto', maxHeight: 200, margin: 0 }}>
                {JSON.stringify(auditDetail.datos_previos, null, 2)}
              </pre>
            </div>
          )}
          {auditDetail.datos_nuevos && (
            <div className="form-group">
              <label className="form-label">Después</label>
              <pre style={{ background: '#f8f9fb', border: '1px solid #e1e4e9', borderRadius: 8, padding: 10, fontSize: 11.5, overflow: 'auto', maxHeight: 200, margin: 0 }}>
                {JSON.stringify(auditDetail.datos_nuevos, null, 2)}
              </pre>
            </div>
          )}
        </Modal>
      )}

      {/* PIN modal */}
      {showPinModal && (
        <Modal title="🔑 Código de edición" onClose={() => setShowPinModal(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ background: '#e8eeff', border: '2px dashed #003893', borderRadius: 10, padding: '16px 24px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#003893', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Código actual</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#003893', letterSpacing: 10, margin: 0 }}>
                {pinLoading ? '···' : (showPinModal.pin ?? '(sin código)')}
              </p>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Restablecer genera un código nuevo — el anterior deja de funcionar.</p>
            <button className="btn btn-outline btn-sm" onClick={() => resetPin(showPinModal.id, showPinModal.type)}>🔄 Restablecer código</button>
          </div>
        </Modal>
      )}

      {/* Centro form */}
      {showCentroForm !== null && (
        <Modal title={showCentroForm.id ? '✎ Editar centro' : '+ Agregar centro de acopio'} onClose={() => setShowCentroForm(null)} onConfirm={submitCentro} confirmLabel="Guardar" wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nombre <span className="req">*</span></label>
              <input className="form-input" value={centroForm.nombre} onChange={e => setCentroForm(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Organización</label>
              <input className="form-input" value={centroForm.organizacion} onChange={e => setCentroForm(p => ({ ...p, organizacion: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={centroForm.estado} onChange={e => setCentroForm(p => ({ ...p, estado: e.target.value as any }))}>
                <option value="abierto">Abierto</option>
                <option value="cerrado">Cerrado temporalmente</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Tipo</label>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[{ field: 'es_acopio', label: '📦 Acopio' }, { field: 'es_sangre', label: '🩸 Sangre' }, { field: 'es_alojamiento', label: '🏠 Alojamiento' }].map(t => (
                  <label key={t.field} style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={(centroForm as any)[t.field]} onChange={e => setCentroForm(p => ({ ...p, [t.field]: e.target.checked }))} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Qué recibe</label>
              <textarea className="form-input" value={centroForm.que_recibe} onChange={e => setCentroForm(p => ({ ...p, que_recibe: e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Dirección</label>
              <input className="form-input" value={centroForm.direccion} onChange={e => setCentroForm(p => ({ ...p, direccion: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={centroForm.telefono} onChange={e => setCentroForm(p => ({ ...p, telefono: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Horario</label>
              <input className="form-input" value={centroForm.horario} onChange={e => setCentroForm(p => ({ ...p, horario: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Latitud</label>
              <input className="form-input" type="number" value={centroForm.lat} onChange={e => setCentroForm(p => ({ ...p, lat: parseFloat(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Longitud</label>
              <input className="form-input" type="number" value={centroForm.lng} onChange={e => setCentroForm(p => ({ ...p, lng: parseFloat(e.target.value) }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Punto de apoyo form */}
      {showPuntoForm !== null && (
        <Modal title={showPuntoForm.id ? '✎ Editar punto de apoyo' : '+ Agregar punto de apoyo'} onClose={() => setShowPuntoForm(null)} onConfirm={submitPunto} confirmLabel="Guardar" wide>
          <div className="form-group">
            <label className="form-label">Nombre <span className="req">*</span></label>
            <input className="form-input" value={puntoForm.nombre} onChange={e => setPuntoForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Punto solidario La Linda" />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo <span className="req">*</span></label>
            <select className="form-select" value={puntoForm.tipo} onChange={e => setPuntoForm(p => ({ ...p, tipo: e.target.value }))}>
              {TIPOS_PUNTO_APOYO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección <span className="req">*</span></label>
            <input className="form-input" value={puntoForm.direccion} onChange={e => setPuntoForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Ej. Carrera 23 # 45-67, Barrio La Linda" />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="form-input" type="tel" value={puntoForm.telefono} onChange={e => setPuntoForm(p => ({ ...p, telefono: e.target.value }))} placeholder="300 123 4567" />
          </div>
          <div className="form-group">
            <label className="form-label">Imagen (aparece en el marcador del mapa)</label>
            <ImageInput value={puntoForm.imagen ?? undefined} onChange={v => setPuntoForm(p => ({ ...p, imagen: v ?? null }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label">Latitud</label>
              <input className="form-input" type="number" step="any" value={puntoForm.lat} onChange={e => setPuntoForm(p => ({ ...p, lat: parseFloat(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Longitud</label>
              <input className="form-input" type="number" step="any" value={puntoForm.lng} onChange={e => setPuntoForm(p => ({ ...p, lng: parseFloat(e.target.value) }))} />
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={geocodePunto}>📍 Buscar coordenadas por la dirección</button>
        </Modal>
      )}

      {/* Evento form (edición con la llave de admin) */}
      {showEventoForm !== null && (
        <Modal title={showEventoForm.id ? '✎ Editar evento' : '+ Crear evento'} onClose={() => setShowEventoForm(null)} onConfirm={submitEvento} confirmLabel="Guardar" wide>
          <div className="form-group">
            <label className="form-label">Punto de apoyo <span className="req">*</span></label>
            <select className="form-select" value={eventoForm.punto_id} onChange={e => setEventoForm(p => ({ ...p, punto_id: Number(e.target.value) }))} disabled={!!showEventoForm.id}>
              <option value={0}>— Selecciona el punto de apoyo —</option>
              {puntosApoyo.filter(p => p.ciudad === ciudad).map(p => <option key={p.id} value={p.id}>{p.nombre} · {p.tipo}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Título del evento <span className="req">*</span></label>
            <input className="form-input" value={eventoForm.titulo} onChange={e => setEventoForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej. Jornada de vacunación de mascotas" />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-input" rows={3} value={eventoForm.descripcion} onChange={e => setEventoForm(p => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección del evento</label>
            <input className="form-input" value={eventoForm.direccion} onChange={e => setEventoForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Ej. Carrera 23 # 45-67, Manizales" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label">Latitud</label>
              <input className="form-input" type="number" step="any" value={eventoForm.lat} onChange={e => setEventoForm(p => ({ ...p, lat: parseFloat(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Longitud</label>
              <input className="form-input" type="number" step="any" value={eventoForm.lng} onChange={e => setEventoForm(p => ({ ...p, lng: parseFloat(e.target.value) }))} />
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={geocodeEvento}>📍 Buscar coordenadas por la dirección</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginTop: 14 }}>
            <div className="form-group">
              <label className="form-label">Inicio <span className="req">*</span></label>
              <input className="form-input" type="datetime-local" value={eventoForm.fechaInicio} onChange={e => setEventoForm(p => ({ ...p, fechaInicio: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fin (opcional)</label>
              <input className="form-input" type="datetime-local" value={eventoForm.fechaFin} onChange={e => setEventoForm(p => ({ ...p, fechaFin: e.target.value }))} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            <input type="checkbox" checked={eventoForm.activo} onChange={e => setEventoForm(p => ({ ...p, activo: e.target.checked }))} style={{ width: 18, height: 18 }} />
            Evento activo (visible en el mapa dentro del período)
          </label>
        </Modal>
      )}

      {/* Noticia form */}
      {showNoticiaForm !== null && (
        <Modal title={showNoticiaForm.id ? '✎ Editar noticia' : '+ Publicar noticia'} onClose={() => setShowNoticiaForm(null)} onConfirm={submitNoticia} confirmLabel="Publicar" wide>
          <div className="form-group">
            <label className="form-label">Título <span className="req">*</span></label>
            <input className="form-input" value={noticiaForm.titulo} onChange={e => setNoticiaForm(p => ({ ...p, titulo: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Visible en</label>
            <select className="form-select" value={noticiaForm.ciudad_noticia ?? ''} onChange={e => setNoticiaForm(p => ({ ...p, ciudad_noticia: e.target.value || null }))}>
              <option value="">📢 Todas las ciudades</option>
              {CITIES.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Contenido</label>
            <textarea className="form-input" style={{ minHeight: 140 }} value={noticiaForm.contenido} onChange={e => setNoticiaForm(p => ({ ...p, contenido: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Autor</label>
            <input className="form-input" value={noticiaForm.autor} onChange={e => setNoticiaForm(p => ({ ...p, autor: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* Gestionar daño */}
      {showDanoGestionar && (
        <Modal title={`✎ Gestionar reporte ${showDanoGestionar.radicado}`} onClose={() => setShowDanoGestionar(null)} onConfirm={submitDanoGestionar} confirmLabel="Guardar">
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={danoForm.estado} onChange={e => setDanoForm(p => ({ ...p, estado: e.target.value as any }))}>
              <option value="pendiente">🔴 Pendiente</option>
              <option value="visita_programada">🟠 Visita programada</option>
              <option value="visitado">✅ Visitado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha de visita</label>
            <input className="form-input" type="date" value={danoForm.fecha_visita} onChange={e => setDanoForm(p => ({ ...p, fecha_visita: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Resultado de la visita</label>
            <textarea className="form-input" value={danoForm.resultado_visita} onChange={e => setDanoForm(p => ({ ...p, resultado_visita: e.target.value }))} placeholder="Resultado del ingeniero..." />
          </div>
          <div className="form-group">
            <label className="form-label">Notas internas</label>
            <textarea className="form-input" value={danoForm.notas_admin} onChange={e => setDanoForm(p => ({ ...p, notas_admin: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* Add need */}
      {showAddNeed && (
        <Modal title="+ Agregar necesidad" onClose={() => setShowAddNeed(null)} onConfirm={submitAddNeed} confirmLabel="Agregar">
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={newNeedForm.tipo} onChange={e => setNewNeedForm(p => ({ ...p, tipo: e.target.value }))}>
              {['Agua potable','Alimentos','Refugio/Carpas','Medicamentos','Atención médica','Ropa/Cobijas','Maquinaria/Rescate','Mascotas','Otro'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cantidad</label>
            <input className="form-input" value={newNeedForm.cantidad} onChange={e => setNewNeedForm(p => ({ ...p, cantidad: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-input" value={newNeedForm.descripcion} onChange={e => setNewNeedForm(p => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Reportado por <span className="req">*</span></label>
            <input className="form-input" value={newNeedForm.reportado_por} onChange={e => setNewNeedForm(p => ({ ...p, reportado_por: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="form-input" type="tel" value={newNeedForm.telefono_reporta} onChange={e => setNewNeedForm(p => ({ ...p, telefono_reporta: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* Confirmar eliminación: pide la contraseña de admin */}
      {confirmDel && (
        <Modal
          title="🗑 Confirmar eliminación"
          onClose={() => setConfirmDel(null)}
          onConfirm={confirmDelExecute}
          confirmLabel={confirmLoading ? 'Verificando...' : 'Eliminar'}
          confirmClass="btn btn-red"
        >
          <p style={{ fontSize: 14, color: '#1f2430', margin: '0 0 14px' }}>{confirmDel.label}</p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contraseña de administrador</label>
            <input
              className="form-input"
              type="password"
              value={confirmPass}
              autoFocus
              disabled={confirmLoading}
              onChange={e => { setConfirmPass(e.target.value); setConfirmError(false) }}
              onKeyDown={e => { if (e.key === 'Enter') confirmDelExecute() }}
              placeholder="••••••••"
            />
            {confirmError && (
              <p style={{ color: '#CE1126', fontSize: 12, margin: '6px 0 0' }}>Contraseña incorrecta. Verifica e intenta de nuevo.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
