import { useEffect, useState } from "react";
import { api, eur, toBackendUrl, exportCsv, budgetCrossing } from "../lib/api";
import { useCategories } from "../lib/categoriesContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import CategoryBadge from "../components/CategoryBadge";
import ExpenseForm from "../components/ExpenseForm";
import { toast } from "sonner";
import { Plus, Download, Search, Trash2, Pencil, ImageIcon } from "lucide-react";

export default function Expenses() {
  const { categories } = useCategories();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (category && category !== "all") params.category = category;
      const { data } = await api.get("/expenses", { params });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [category, q]);

  const submitDebounce = () => { const t = setTimeout(load, 300); return () => clearTimeout(t); };
  useEffect(submitDebounce, [q]); // eslint-disable-line

  const create = async (payload) => {
    try {
      const beforeStats = (await api.get("/stats")).data || {};
      await api.post("/expenses", payload);
      const afterStats = (await api.get("/stats")).data || {};
      const cross = budgetCrossing(
        beforeStats.progress,
        afterStats.progress,
        afterStats.alert_at
      );
      if (cross === "over") toast.error("Has superado el presupuesto total");
      else if (cross === "warn") {
        toast.warning(`Has superado el ${Math.round(afterStats.alert_at > 0 ? afterStats.alert_at : 80)}% de tu presupuesto`);
      }
      toast.success("Gasto añadido");
      setOpenAdd(false);
      load();
    } catch (e) {
      toast.error("No se pudo añadir el gasto");
    }
  };

  const update = async (payload) => {
    try {
      const beforeStats = (await api.get("/stats")).data || {};
      await api.patch(`/expenses/${editItem.id}`, payload);
      const afterStats = (await api.get("/stats")).data || {};
      const cross = budgetCrossing(
        beforeStats.progress,
        afterStats.progress,
        afterStats.alert_at
      );
      if (cross === "over") toast.error("Has superado el presupuesto total");
      else if (cross === "warn") {
        toast.warning(`Has superado el ${Math.round(afterStats.alert_at > 0 ? afterStats.alert_at : 80)}% de tu presupuesto`);
      }
      toast.success("Gasto actualizado");
      setEditItem(null);
      load();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Gasto eliminado");
      load();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Gastos</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">Todos los gastos</h1>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="btn-export"
            variant="outline"
            className="rounded-xl border-[#E2DDD3]"
            onClick={exportCsv}
          >
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button data-testid="btn-open-add" className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> Añadir gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading">Nuevo gasto</DialogTitle>
              </DialogHeader>
              <ExpenseForm onSubmit={create} submitLabel="Guardar gasto" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4 sm:p-5 rounded-2xl border-[#E2DDD3] bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C626A]" />
            <Input
              data-testid="input-search"
              placeholder="Buscar por proveedor o notas…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-filter-cat" className="rounded-xl">
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

      <Card className="rounded-2xl border-[#E2DDD3] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#5C626A]">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[#5C626A]">No hay gastos que coincidan.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E2DDD3]">
            {items.map((e) => (
              <li
                key={e.id}
                data-testid={`expense-row-${e.id}`}
                className="p-4 sm:p-5 flex items-center gap-3 hover:bg-[#FAF8F5] transition-colors"
              >
                <button
                  className="w-14 h-14 rounded-xl bg-[#F2EFE9] border border-[#E2DDD3] flex items-center justify-center overflow-hidden shrink-0"
                  onClick={() => e.receipt_path && setPreviewUrl(toBackendUrl(e.receipt_path))}
                  data-testid={`btn-preview-${e.id}`}
                  title={e.receipt_path ? "Ver ticket" : "Sin imagen"}
                >
                  {e.receipt_path ? (
                    <img
                      src={toBackendUrl(e.receipt_path)}
                      alt="ticket"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#5C626A]" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1A1D20] truncate">{e.vendor || "Sin proveedor"}</p>
                    <CategoryBadge category={e.category} />
                  </div>
                  <div className="text-xs text-[#5C626A] mt-1 font-mono flex gap-3 flex-wrap">
                    <span>{e.date}</span>
                    {e.notes && <span className="truncate max-w-[240px]">{e.notes}</span>}
                  </div>
                </div>
                <div className="font-heading font-bold text-lg text-[#1A1D20]">{eur(e.amount)}</div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`btn-edit-${e.id}`}
                    onClick={() => setEditItem(e)}
                    className="rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`btn-delete-${e.id}`}
                        className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este gasto?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          data-testid={`btn-confirm-delete-${e.id}`}
                          onClick={() => remove(e.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar gasto</DialogTitle>
          </DialogHeader>
          {editItem && (
            <ExpenseForm initial={editItem} onSubmit={update} submitLabel="Guardar cambios" />
          )}
        </DialogContent>
      </Dialog>

      {/* Image preview */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Ticket</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="ticket" className="w-full max-h-[75vh] object-contain rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
