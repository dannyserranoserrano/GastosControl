import { useEffect, useState } from "react";
import { resolveReceiptSrc, receiptIsPdf } from "../lib/receipts";
import { FileText } from "lucide-react";

// Renderiza la miniatura de un ticket resolviendo su URL (firmada en Supabase,
// data-URL o backend OCR con cabecera). Los PDF se muestran como una ficha con
// icono. Mientras no hay src no pinta nada, así los contenedores mantienen su tamaño.
export default function ReceiptImage({ receipt, alt = "ticket", ...imgProps }) {
  const pdf = receiptIsPdf(receipt);
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

  if (!pdf && !src) return null;
  if (pdf) {
    const { className = "", ...rest } = imgProps;
    return (
      <div
        {...rest}
        className={`flex flex-col items-center justify-center gap-0.5 bg-[#F2EFE9] text-[#5C626A] ${className}`}
        title="PDF adjunto"
      >
        <FileText className="w-1/3 h-1/3 max-w-6 max-h-6" />
        <span className="text-[10px] font-mono uppercase">PDF</span>
      </div>
    );
  }
  return <img src={src} alt={alt} {...imgProps} />;
}
