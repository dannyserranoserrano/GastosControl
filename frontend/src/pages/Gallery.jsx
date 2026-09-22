import { useEffect, useMemo, useState } from "react";
import { api, eur } from "../lib/api";
import { resolveReceiptSrc } from "../lib/receipts";
import { useIncrementalList } from "../lib/useIncrementalList";
import ReceiptImage from "../components/ReceiptImage";
import ReceiptViewer from "../components/ReceiptViewer";
import { useCategories } from "../lib/categoriesContext";
import { useProjects } from "../lib/projectsContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import CategoryBadge from "../components/CategoryBadge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Search, Download, Images, ZoomIn, ZoomOut } from "lucide-react";

function extOf(src) {
  if (src && src.startsWith("data:")) {
    const m = src.match(/^data:([a-zA-Z-]+\/[a-zA-Z0-9.+-]+)[;,]/);
    if (m) {
      const mime = m[1];
      if (mime === "application/pdf") return "pdf";
      if (mime.startsWith("image/")) return mime.slice(6).replace("jpeg", "jpg");
    }
    return "jpg";
  }
  const m = src && src.match(/\.(\w+)(\?|$)/);
  return m ? m[1].replace("jpeg", "jpg") : "jpg";
}

function slug(text) {
  return (text || "ticket").trim().replace(/\s+/g, "-").toLowerCase();
}

function receiptsOf(e) {
  if (Array.isArray(e?.receipts) && e.receipts.length) return e.receipts;
  if (e?.receipt_path) return [{ path: e.receipt_path, url: e.receipt_url || e.receipt_path }];
  return [];
}

async function downloadImage(src, filename) {
  if (src.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = src;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.open(src, "_blank");
  }
}

export default function Gallery() {
  const { categories } = useCategories();
  const { activeProject } = useProjects();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);
  const [zoomed, setZoomed] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (category && category !== "all") params.category = category;
      if (activeProject) params.project = activeProject;
      const { data } = await api.get("/expenses", { params });
      setItems(
        data.filter(
          (e) => (Array.isArray(e.receipts) && e.receipts.length > 0) || e.receipt_path
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [category, q, activeProject]); // eslint-disable-line

  const sortedItems = useMemo(() => {
    const list = [...items];
    const byDate = (a, b) => String(a.date || "").localeCompare(String(b.date || ""));
    if (sort === "date-asc") list.sort(byDate);
    else if (sort === "category-asc")
      list.sort((a, b) => {
        const ca = String(a.category || "Otros").localeCompare(String(b.category || "Otros"));
        return ca !== 0 ? ca : byDate(b, a);
      });
    else list.sort((a, b) => byDate(b, a));
    return list;
  }, [items, sort]);

  const { visible: visibleItems, hasMore, showMore, total: totalItems } =
    useIncrementalList(sortedItems, 24);

  const open = (e) => {
    setActive(e);
    setZoomed(false);
  };

  const onDownload = async (e) => {
    const rs = receiptsOf(e);
    const src = await resolveReceiptSrc(rs[0]);
    if (!src) {
      toast.error("No se pudo obtener la imagen");
      return;
    }
    const filename = `ticket-${slug(e.vendor)}-${e.date || ""}.${extOf(src)}`;
    downloadImage(src, filename);
    toast.success("Descargando…");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Galería</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">
            Tickets
          </h1>
          <p className="text-[#5C626A] mt-2">Todos tus tickets escaneados, en un solo lugar.</p>
        </div>
      </div>

      <Card className="p-4 sm:p-5 rounded-2xl border-[#E2DDD3] bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C626A]" />
            <Input
              data-testid="gallery-search"
              aria-label="Buscar tickets por proveedor o notas"
              placeholder="Buscar por proveedor o notas…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="gallery-filter" className="rounded-xl">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger data-testid="gallery-sort" className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Fecha (recientes)</SelectItem>
              <SelectItem value="date-asc">Fecha (antiguos)</SelectItem>
              <SelectItem value="category-asc">Categoría (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="p-10 text-center text-[#5C626A]">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="p-14 text-center text-[#5C626A]">
          <Images className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay tickets todavía. Escanea uno para verlo aquí.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="gallery-grid">
          {visibleItems.map((e) => {
            const rs = receiptsOf(e);
            return (
            <button
              key={e.id}
              data-testid={`gallery-item-${e.id}`}
              onClick={() => open(e)}
              className="text-left rounded-2xl border border-[#E2DDD3] bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[4/3] bg-[#F2EFE9] relative">
                <ReceiptImage
                  receipt={rs[0]}
                  alt="ticket"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {rs.length > 1 && (
                  <span className="absolute bottom-1 right-1 px-1.5 rounded bg-[#1E293B]/80 text-white text-[10px] font-mono">
                    {rs.length}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-[#1A1D20] truncate">
                  {e.vendor || "Sin proveedor"}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-mono text-[#5C626A]">{e.date}</span>
                  <span className="text-sm font-bold text-[#1A1D20]">{eur(e.amount)}</span>
                </div>
              </div>
            </button>
            );
          })}
        </div>
        {hasMore && (
          <div className="text-center">
            <Button
              variant="outline"
              data-testid="btn-show-more"
              onClick={showMore}
              className="rounded-xl border-[#E2DDD3]"
            >
              Mostrar más ({visibleItems.length} de {totalItems})
            </Button>
          </div>
        )}
        </>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-heading">{active?.vendor || "Sin proveedor"}</DialogTitle>
          </DialogHeader>

          {active && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap text-sm text-[#5C626A] font-mono">
                <span>{active.date}</span>
                <span className="font-heading font-bold text-[#1A1D20]">{eur(active.amount)}</span>
                <CategoryBadge category={active.category} />
                {receiptsOf(active).length > 1 && (
                  <span className="text-xs">{receiptsOf(active).length} imágenes</span>
                )}
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-auto">
                {receiptsOf(active).map((r, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl overflow-hidden border border-[#E2DDD3] bg-[#F2EFE9]"
                  >
                    <ReceiptViewer
                      receipt={r}
                      data-testid={i === 0 ? "gallery-preview" : `gallery-preview-${i}`}
                      alt={`ticket ${i + 1}`}
                      className={`${zoomed ? "max-h-none" : "max-h-[70vh] object-contain"} cursor-zoom-in`}
                      onClick={() => setZoomed((z) => !z)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomed((z) => !z)}
                  className="rounded-xl border-[#E2DDD3]"
                >
                  {zoomed ? <ZoomOut className="w-4 h-4 mr-1" /> : <ZoomIn className="w-4 h-4 mr-1" />}
                  {zoomed ? "Reducir" : "Ampliar"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(active)}
                  data-testid="btn-download-ticket"
                  className="rounded-xl border-[#E2DDD3]"
                >
                  <Download className="w-4 h-4 mr-1" /> Descargar
                </Button>
                <Link to="/gastos">
                  <Button size="sm" className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl">
                    Ver en gastos
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}