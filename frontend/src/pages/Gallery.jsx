import { useEffect, useState } from "react";
import { api, eur, toBackendUrl } from "../lib/api";
import { useCategories } from "../lib/categoriesContext";
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
    const m = src.match(/^data:(image\/[a-zA-Z-]+);/);
    if (m) return m[1].replace("image/", "").replace("jpeg", "jpg");
    return "jpg";
  }
  const m = src && src.match(/\.(\w+)(\?|$)/);
  return m ? m[1].replace("jpeg", "jpg") : "jpg";
}

function slug(text) {
  return (text || "ticket").trim().replace(/\s+/g, "-").toLowerCase();
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
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);
  const [zoomed, setZoomed] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (category && category !== "all") params.category = category;
      const { data } = await api.get("/expenses", { params });
      setItems(data.filter((e) => e.receipt_path));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [category, q]);

  const open = (e) => {
    setActive(e);
    setZoomed(false);
  };

  const onDownload = (e) => {
    const src = toBackendUrl(e.receipt_path);
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C626A]" />
            <Input
              data-testid="gallery-search"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="gallery-grid">
          {items.map((e) => (
            <button
              key={e.id}
              data-testid={`gallery-item-${e.id}`}
              onClick={() => open(e)}
              className="text-left rounded-2xl border border-[#E2DDD3] bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[4/3] bg-[#F2EFE9]">
                <img
                  src={toBackendUrl(e.receipt_path)}
                  alt="ticket"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
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
          ))}
        </div>
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
              </div>

              <div className="relative rounded-xl overflow-hidden border border-[#E2DDD3] bg-[#F2EFE9]">
                <img
                  data-testid="gallery-preview"
                  src={toBackendUrl(active.receipt_path)}
                  alt="ticket"
                  className={`w-full ${zoomed ? "max-h-none" : "max-h-[70vh] object-contain"} cursor-zoom-in`}
                  onClick={() => setZoomed((z) => !z)}
                />
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