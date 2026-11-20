// Achica una imagen en el navegador antes de subirla.
//
// Vercel rechaza cualquier request de más de 4,5 MB antes de que llegue a la
// ruta (respuesta 413 en texto plano), y el cliente lo mostraba como "Error de
// conexión". Una captura de iPhone en PNG pasa ese límite con facilidad (y en
// base64 pesa un 33% más). Se reescala a 1600 px de lado máximo y se exporta
// como JPEG: queda en unos cientos de KB y se sigue leyendo perfecto.

const MAX_SIDE = 1600;
const QUALITY = 0.85;
const SKIP_BELOW = 900 * 1024; // las imágenes chicas se suben tal cual

async function loadImage(file: Blob): Promise<{ img: CanvasImageSource; w: number; h: number; done: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { img: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close() };
    } catch { /* algunos Safari viejos: se cae al <img> */ }
  }
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });
  return { img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}

/** Devuelve un File JPEG más liviano, o el original si ya es chico o si algo falla. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= SKIP_BELOW) return file;
  try {
    const { img, w, h, done } = await loadImage(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) { done(); return file; }
    ctx.fillStyle = "#FFFFFF"; // PNG con transparencia → fondo blanco en JPEG
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    done();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => resolve(rd.result as string);
    rd.onerror = reject;
    rd.readAsDataURL(file);
  });
}
