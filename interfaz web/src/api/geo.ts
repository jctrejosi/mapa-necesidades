/**
 * Geocodificación inversa: lat/lng → dirección legible (calle/carrera/número,
 * barrio, ciudad). Prioriza Nominatim (detalle de vía y número); BigDataCloud
 * queda como respaldo (sin API key).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es&addressdetails=1`
    )
    if (res.ok) {
      const d = await res.json()
      if (d.display_name) return d.display_name
      const a = d.address ?? {}
      const street = [a.road, a.house_number].filter(Boolean).join(' ')
      const parts = [street, a.neighbourhood || a.suburb, a.city || a.town || a.village, a.state, a.country].filter(Boolean)
      if (parts.length) return parts.join(', ')
    }
  } catch { /* probar fallback */ }
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`
    )
    if (res.ok) {
      const d = await res.json()
      const parts = [d.locality || d.city, d.principalSubdivision, d.countryName].filter(Boolean)
      if (parts.length) return parts.join(', ')
    }
  } catch { /* sin conexión */ }
  return null
}
