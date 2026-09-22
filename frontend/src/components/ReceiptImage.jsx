import { useEffect, useRef, useState } from "react";
import { resolveReceiptSrc, receiptIsPdf } from "../lib/receipts";
import { FileText } from "lucide-react";

// Miniatura de un ticket. La URL (firmada en Supabase, data-URL o fichero local)
// se resuelve de forma diferida, solo cuando la imagen entra en pantalla, para no
// disparar N peticiones al montar una lista larga. Los PDF se muestran como ficha.
export default function ReceiptImage({ receipt, alt = "ticket", width, height, className = "", ...rest }) {
  const pdf = receiptIsPdf(receipt);
  const initial = receipt?.url || receipt?.path;
  const [src, setSrc] = useState(() => (initial && initial.startsWith("data:") ? initial : null));
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || src) return undefined;
    let alive = true;
    resolveReceiptSrc(receipt).then((url) => {
      if (alive) setSrc(url || null);
    });
    return () => {
      alive = false;
    };
  }, [visible, src, receipt?.path, receipt?.url]); // eslint-disable-line

  if (pdf) {
    return (
      <div
        ref={ref}
        {...rest}
        className={`flex flex-col items-center justify-center gap-0.5 bg-[#F2EFE9] text-[#5C626A] ${className}`}
        title="PDF adjunto"
      >
        <FileText className="w-1/3 h-1/3 max-w-6 max-h-6" />
        <span className="text-[10px] font-mono uppercase">PDF</span>
      </div>
    );
  }
  if (!src) {
    return <div ref={ref} {...rest} className={`bg-[#F2EFE9] ${className}`} aria-label={alt} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      {...rest}
    />
  );
}
