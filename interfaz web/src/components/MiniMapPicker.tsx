import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/** Mini-mapa para colocar el punto del reporte manualmente (clic o arrastrando). */
export default function MiniMapPicker({ initial, onPick }: {
  initial: [number, number]
  onPick: (lat: number, lng: number) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    const map = L.map(mapRef.current, { zoomControl: true }).setView(initial, 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    const place = (lat: number, lng: number) => {
      if (markerRef.current) markerRef.current.setLatLng([lat, lng])
      else {
        const mk = L.marker([lat, lng], { draggable: true }).addTo(map)
        mk.on('dragend', () => {
          const p = mk.getLatLng()
          setPoint({ lat: p.lat, lng: p.lng })
          onPick(p.lat, p.lng)
        })
        markerRef.current = mk
      }
      setPoint({ lat, lng })
      onPick(lat, lng)
    }
    map.on('click', (e: L.LeafletMouseEvent) => place(e.latlng.lat, e.latlng.lng))
    mapInst.current = map
    setTimeout(() => map.invalidateSize(), 120)
    return () => { map.remove(); mapInst.current = null; markerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ border: '1.5px solid #e1e4e9', borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
      <div ref={mapRef} style={{ height: 210, width: '100%' }} />
      <div style={{ padding: 10, background: '#f8f9fb', fontSize: 11.5, color: '#6b7280' }}>
        {point ? `📍 ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : 'Haz clic en el mapa para colocar el marcador'}
      </div>
    </div>
  )
}
