import { useRef } from "react"
import { compressImage } from "../store"

interface Props {
  value?: string
  onChange: (b64: string | undefined) => void
}

/** Subida de imagen para el admin: comprime en el navegador y devuelve base64. */
export default function ImageInput({ value, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { alert("La imagen es demasiado grande (máx. 25MB)"); return }
    try {
      const b64 = await compressImage(file)
      if (b64.length > 6 * 1024 * 1024) { alert("La imagen sigue siendo muy pesada después de comprimirla."); return }
      onChange(b64)
    } catch {
      alert("No se pudo procesar la imagen")
    }
  }

  return (
    <div>
      {value ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={value} alt="Vista previa" style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #e1e4e9" }} />
          <button
            type="button"
            onClick={() => { onChange(undefined); if (ref.current) ref.current.value = "" }}
            style={{ position: "absolute", top: -6, right: -6, background: "#CE1126", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 12, cursor: "pointer", lineHeight: 1 }}
          >✕</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => ref.current?.click()}>📁 Subir imagen</button>
          <span style={{ fontSize: 12, color: "#9AA0AC" }}>JPG, PNG, WEBP · se sube a Cloudinary al guardar</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFile} />
    </div>
  )
}
