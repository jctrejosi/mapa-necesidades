// ============================================================
// Utilidades compartidas para comprimir y subir imágenes desde
// el navegador antes de enviarlas al servidor.
// ============================================================

// Redimensiona y comprime una imagen en el navegador antes de subirla,
// para no gastar el espacio limitado del hosting ni la señal del usuario.
function comprimirImagen(file, maxAncho = 1000, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen'));
      return;
    }
    const lector = new FileReader();
    lector.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxAncho) {
          h = Math.round(h * (maxAncho / w));
          w = maxAncho;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo procesar la imagen'));
        }, 'image/jpeg', calidad);
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = e.target.result;
    };
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(file);
  });
}

// Comprime y sube la imagen al servidor. Devuelve el nombre de archivo
// guardado, o null si no se seleccionó ninguna imagen.
async function subirImagen(file, apiUrl) {
  if (!file) return null;
  const blob = await comprimirImagen(file);
  const fd = new FormData();
  fd.append('imagen', blob, 'foto.jpg');
  const res = await fetch(`${apiUrl}?action=subir_imagen`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'No se pudo subir la imagen');
  return data.archivo;
}

// Muestra una vista previa del archivo elegido dentro de un contenedor <img>
function previsualizarImagen(inputFile, imgPreview) {
  const archivo = inputFile.files[0];
  if (!archivo) { imgPreview.style.display = 'none'; return; }
  const lector = new FileReader();
  lector.onload = (e) => {
    imgPreview.src = e.target.result;
    imgPreview.style.display = 'block';
  };
  lector.readAsDataURL(archivo);
}
