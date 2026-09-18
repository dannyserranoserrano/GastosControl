import { useEffect, useState } from "react";
import { resolveReceiptSrc } from "../lib/receipts";

// Renderiza la imagen de un ticket resolviendo su URL (firmada en Supabase,
// data-URL o backend OCR con cabecera). Mientras no hay src no pinta nada, así
// los contenedores mantienen su tamaño.
export default function ReceiptImage({ receipt, alt = "ticket", ...imgProps }) {
  const initial = receipt?.url || receipt?.path;
  const [src, setSrc] = useState(() => (initial && initial.startsWith("data:") ? initial : null));

  useEffect(() => {
    let alive = true;
    resolveReceiptSrc(receipt).then((url) => {
      if (alive) setSrc(url || null);
    });
    return () => {
      alive = false;
    };
  }, [receipt?.path, receipt?.url]);

  if (!src) return null;
  return <img src={src} alt={alt} {...imgProps} />;
}
