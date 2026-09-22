// Utilidades de imagen/fichero centralizadas (antes duplicadas en localBackend,
// supabaseData y ReceiptViewer).

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load error"));
    img.src = src;
  });
}

// Convierte un File a data-URL; las imágenes grandes se reducen a 1600 px (JPEG).
export async function fileToDataUrl(file) {
  const original = await blobToDataUrl(file);
  if (!/^image\//.test(file && file.type)) return original;
  try {
    const img = await loadImage(original);
    const width = img.naturalWidth || img.width || 0;
    const height = img.naturalHeight || img.height || 0;
    const max = 1600;
    if (width <= max && height <= max) return original;
    const scale = Math.min(max / width, max / height);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return original;
  }
}

export function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl || "").split(",");
  const head = parts[0] || "";
  const mime = (head.match(/^data:(.*?);base64$/) || [])[1] || "image/jpeg";
  const bin = atob(parts.slice(1).join(","));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const ext = (mime.split("/")[1] || "jpg").replace("jpeg", "jpg");
  return { blob: new Blob([arr], { type: mime }), ext };
}

// Convierte una data-URL en una URL de blob (para previsualizar PDFs en iframe).
export function dataUrlToBlobUrl(dataUrl) {
  try {
    const { blob } = dataUrlToBlob(dataUrl);
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
