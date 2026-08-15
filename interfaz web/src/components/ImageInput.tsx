import { useRef } from "react"
import { compressImage } from "../store"

interface ImageInputProps {
  value?: string
  onChange: (b64: string | undefined) => void
  /** En móvil abre la cámara directamente (capture=environment). */
  capture?: boolean
}

export default function ImageInput({ value, onChange, capture }: ImageInputProps) {
  const ref = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { alert("La imagen no puede superar 4MB"); return }
    try {
      const b64 = await compressImage(file)
      onChange(b64)
    } catch {
      alert("No se pudo procesar la imagen")
    }
  }

  return (
    <div>
      {value ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={value} alt="Vista previa" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #e1e4e9" }} />
          <button
            onClick={() => { onChange(undefined); if (ref.current) ref.current.value = "" }}
            style={{ position: "absolute", top: -6, right: -6, background: "#CE1126", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 12, cursor: "pointer", lineHeight: 1 }}
          >✕</button>
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          style={{ border: "1.5px dashed #e1e4e9", borderRadius: 8, padding: "20px", textAlign: "center", cursor: "pointer", color: "#9AA0AC", fontSize: "0.85rem", transition: "border-color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#003893")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#e1e4e9")}
        >
          📷 {capture ? 'Tomar foto o subir imagen' : 'Agregar foto (opcional)'}
          <div style={{ fontSize: "0.75rem", marginTop: 4 }}>JPG, PNG, WEBP · máx. 4MB</div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" capture={capture ? 'environment' : undefined} style={{ display: "none" }} onChange={handleFile} />
    </div>
  )
}
