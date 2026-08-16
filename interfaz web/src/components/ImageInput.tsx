import { useRef } from "react"
import { compressImage } from "../store"

interface ImageInputProps {
  value?: string
  onChange: (b64: string | undefined) => void
  /** En móvil/reportes muestra dos botones: tomar foto (cámara) y subir imagen. */
  capture?: boolean
}

export default function ImageInput({ value, onChange, capture }: ImageInputProps) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Las fotos de cámara suelen pesar varios MB: comprimimos primero y
    // validamos el tamaño del RESULTADO (el backend acepta hasta 5 MB).
    if (file.size > 25 * 1024 * 1024) { alert("La imagen es demasiado grande (máx. 25MB)"); return }
    try {
      const b64 = await compressImage(file)
      if (b64.length > 6 * 1024 * 1024) { alert("La imagen sigue siendo muy pesada después de comprimirla. Intenta con otra foto."); return }
      onChange(b64)
    } catch {
      alert("No se pudo procesar la imagen")
    }
  }

  function clear() {
    onChange(undefined)
    if (galleryRef.current) galleryRef.current.value = ""
    if (cameraRef.current) cameraRef.current.value = ""
  }

  return (
    <div>
      {value ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={value} alt="Vista previa" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #e1e4e9" }} />
          <button
            onClick={clear}
            style={{ position: "absolute", top: -6, right: -6, background: "#CE1126", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 12, cursor: "pointer", lineHeight: 1 }}
          >✕</button>
        </div>
      ) : capture ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => cameraRef.current?.click()} className="btn btn-sm btn-outline">📷 Tomar foto</button>
          <button type="button" onClick={() => galleryRef.current?.click()} className="btn btn-sm btn-outline">📁 Subir imagen</button>
          <div style={{ width: "100%", fontSize: "0.75rem", color: "#9AA0AC" }}>JPG, PNG, WEBP · máx. 4MB</div>
        </div>
      ) : (
        <div
          onClick={() => galleryRef.current?.click()}
          style={{ border: "1.5px dashed #e1e4e9", borderRadius: 8, padding: "20px", textAlign: "center", cursor: "pointer", color: "#9AA0AC", fontSize: "0.85rem", transition: "border-color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#003893")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#e1e4e9")}
        >
          📷 Agregar foto (opcional)
          <div style={{ fontSize: "0.75rem", marginTop: 4 }}>JPG, PNG, WEBP · máx. 4MB</div>
        </div>
      )}

      {/* Cargar desde galería */}
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFile} />
      {/* Tomar foto con cámara (capture). accept explícito para que iOS
          convierta a JPEG en lugar de HEIC. */}
      <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style={{ display: "none" }} onChange={handleFile} />
    </div>
  )
}
