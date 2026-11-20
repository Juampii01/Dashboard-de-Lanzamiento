/**
 * Descarga un Blob como archivo de forma compatible con todos los navegadores.
 *
 * Problemas que evita (casos reales: "no puedo descargar el PDF del Día 1/2"):
 * - Revocar la URL justo después de `a.click()` cancela la descarga en Safari
 *   y en algunos Chrome: se revoca recién después de un rato.
 * - Firefox necesita que el <a> esté en el documento.
 * - iPhone/iPad no respetan el atributo `download` con URLs blob: ahí se abre
 *   el archivo (el visor de iOS permite guardarlo o compartirlo).
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  if (isIOS) {
    window.location.assign(url);
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
