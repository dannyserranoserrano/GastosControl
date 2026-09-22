import { useEffect, useState } from "react";
import { resolveReceiptSrc, receiptIsPdf } from "../lib/receipts";
import { dataUrlToBlobUrl } from "../lib/imageFile";
import { ExternalLink } from "lucide-react";

// Visor a tamaño completo: imagen o PDF. Para PDFs usa un iframe (convierte las
// data-URL a blob para que el navegador pueda previsualizarlas) y ofrece abrirlo.
export default function ReceiptViewer({ receipt, className = "", ...rest }) {
  const pdf = receiptIsPdf(receipt);
  const rawInit = receipt?.url || receipt?.path;
  const [src, setSrc] = useState(() => (rawInit && rawInit.startsWith("data:") ? rawInit : null));

  useEffect(() => {
    let alive = true;
    let blobUrl = null;
    resolveReceiptSrc(receipt).then((url) => {
      if (!alive || !url) return;
      if (url.startsWith("data:")) {
        blobUrl = dataUrlToBlobUrl(url);
        setSrc(blobUrl || url);
      } else {
        setSrc(url);
      }
    });
    return () => {
      alive = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [receipt?.path, receipt?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!src) return null;

  if (pdf) {
    return (
      <div {...rest} className={`w-full ${className}`}>
        <iframe
          src={src}
          title="PDF del ticket"
          className="w-full h-[70vh] rounded-xl border border-[#E2DDD3] bg-white"
        />
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-[#5C626A] hover:text-[#1A1D20]"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Abrir PDF en una pestaña
        </a>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="ticket"
      decoding="async"
      {...rest}
      className={`w-full object-contain rounded-xl border border-[#E2DDD3] ${className}`}
    />
  );
}
