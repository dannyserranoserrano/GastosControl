import { useEffect, useState, useMemo, useRef } from "react";
import { api, eur, exportCsv, budgetCrossing, verifyExpenseSaved } from "../lib/api";
import { findDuplicates } from "../lib/findDuplicates";
import { useCategories } from "../lib/categoriesContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import ReceiptViewer from "../components/ReceiptViewer";
import ExpenseRow from "../components/ExpenseRow";
import ExpenseForm from "../components/ExpenseForm";
import AutoRulesManager from "../components/AutoRulesManager";
import CsvImportDialog from "../components/CsvImportDialog";
import RecurringManager from "../components/RecurringManager";
import { useRecurring } from "../lib/useRecurring";
import { useProjects } from "../lib/projectsContext";
import { loadClosed } from "../lib/closedMonths";
import { useIncrementalList } from "../lib/useIncrementalList";
import { toast } from "sonner";
import { Plus, Download, Search, Copy, Calendar, X } from "lucide-react";

import { pad } from "@/lib/dates";
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function datePresets(today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const firstThis = new Date(y, m, 1);
  const lastThis = new Date(y, m + 1, 0);
  const firstPrev = new Date(y, m - 1, 1);
  const lastPrev = new Date(y, m, 0);
  const last30 = new Date(y, m, today.getDate() - 29);
  return [
    { label: "Este mes", start: ymd(firstThis), end: ymd(lastThis) },
    { label: "Mes pasado", start: ymd(firstPrev), end: ymd(lastPrev) },
    { label: "Últimos 30 días", start: ymd(last30), end: ymd(today) },
    { label: "Este año", start: `${y}-01-01`, end: `${y}-12-31` },
  ];
}

export default function Expenses() {
  const { categories } = useCategories();
  const { activeProject, refreshFromExpenses } = useProjects();
  const [allExpenses, setAllExpenses] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [projectBudget, setProjectBudget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [sort, setSort] = useState("date-desc");

  // El listado se obtiene una sola vez por proyecto y se filtra en cliente
  // (antes se hacían dos peticiones: filtrada + todas).
  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allExpenses.filter((e) => {
      if (term) {
        const hay = `${e.vendor || ""} ${e.notes || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (category && category !== "all" && e.category !== category) return false;
      const d = String(e.date || "");
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [allExpenses, q, category, start, end]);

  const duplicates = useMemo(() => findDuplicates(allExpenses), [allExpenses]);

  const sortedItems = useMemo(() => {
    const hasReceipt = (e) =>
      (Array.isArray(e.receipts) && e.receipts.length > 0) || !!e.receipt_path;
    const byDate = (a, b) => String(a.date || "").localeCompare(String(b.date || ""));
    const byCat = (a, b) =>
      String(a.category || "Otros").localeCompare(String(b.category || "Otros"));
    const list = [...items].filter((e) => !showDuplicatesOnly || duplicates.has(e.id));
    switch (sort) {
      case "date-asc":
        list.sort(byDate);
        break;
      case "category-asc":
        list.sort((a, b) => byCat(a, b) || byDate(b, a));
        break;
      case "receipt-first":
        list.sort((a, b) => (hasReceipt(b) ? 1 : 0) - (hasReceipt(a) ? 1 : 0) || byDate(b, a));
        break;
      case "no-receipt-first":
        list.sort((a, b) => (hasReceipt(a) ? 1 : 0) - (hasReceipt(b) ? 1 : 0) || byDate(b, a));
        break;
      default:
        list.sort((a, b) => byDate(b, a));
    }
    return list;
  }, [items, duplicates, showDuplicatesOnly, sort]);

  const { visible: visibleItems, hasMore, showMore, total: totalItems } =
    useIncrementalList(sortedItems, 40);
  const closedMonths = loadClosed(activeProject);
  const isLocked = (date) => closedMonths.includes(String(date || "").slice(0, 7));

  const load = async () => {
    setLoading(true);
    try {
      const allParams = activeProject ? { project: activeProject } : {};
      const budgetParams = activeProject ? { params: { project: activeProject } } : {};
      const [allResponse, budgetResponse] = await Promise.all([
        api.get("/expenses", { params: allParams }),
        api.get("/budget", budgetParams),
      ]);
      const all = allResponse.data || [];
      setAllExpenses(all);
      refreshFromExpenses(all);
      setProjectBudget(budgetResponse.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeProject]); // eslint-disable-line

  useRecurring(load);

  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const handler = () => loadRef.current?.();
    window.addEventListener("expenses:changed", handler);
    return () => window.removeEventListener("expenses:changed", handler);
  }, []);

  const create = async (payload) => {
    if (isLocked(payload.date)) {
      toast.error("El mes está cerrado. Reábrelo en el Informe para añadir gastos.");
      return;
    }
    try {
      const params = activeProject ? { project: activeProject } : {};
      const beforeStats = (await api.get("/stats", { params })).data || {};
      const created = (await api.post("/expenses", { ...payload, project: payload.project || activeProject || "" })).data;
      const afterStats = (await api.get("/stats", { params })).data || {};
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
      const createdDate = String(payload.date || "");
      if ((start && createdDate && createdDate < start) || (end && createdDate && createdDate > end)) {
        setStart("");
        setEnd("");
        toast.info("Se quitaron los filtros de fecha para mostrar el gasto.");
      }
      load();
      if (created?.id) {
        const v = await verifyExpenseSaved(created.id, activeProject);
        if (!v.found) {
          toast.error("El gasto no se guardó realmente. Revisa la conexión o la migración de Supabase.");
        } else if (!v.projectOk) {
          toast.warning("El gasto se guardó sin el proyecto activo. Ejecuta supabase/schema.sql (columnas project/receipts).");
        }
      }
    } catch (e) {
      toast.error("No se pudo añadir el gasto");
    }
  };

  const update = async (payload) => {
    if (isLocked(editItem?.date) || isLocked(payload.date)) {
      toast.error("El mes está cerrado. Reábrelo en el Informe para editarlo.");
      return;
    }
    try {
      const params = activeProject ? { project: activeProject } : {};
      const beforeStats = (await api.get("/stats", { params })).data || {};
      await api.patch(`/expenses/${editItem.id}`, payload);
      const afterStats = (await api.get("/stats", { params })).data || {};
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
    const target = items.find((e) => e.id === id) || allExpenses.find((e) => e.id === id);
    if (target && isLocked(target.date)) {
      toast.error("El mes está cerrado. Reábrelo en el Informe para eliminar.");
      return;
    }
    try {
      await api.delete(`/expenses/${id}`);
      load();
      if (target) {
        toast.success("Gasto eliminado", {
          duration: 8000,
          action: {
            label: "Deshacer",
            onClick: async () => {
              try {
                const { id: _omit, created_at: _created_at, ...rest } = target;
                await api.post("/expenses", rest);
                toast.success("Gasto restaurado");
                load();
              } catch {
                toast.error("No se pudo restaurar");
              }
            },
          },
        });
      } else {
        toast.success("Gasto eliminado");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const [duplicateItem, setDuplicateItem] = useState(null);
  const duplicate = (e) => {
    const today = new Date().toISOString().slice(0, 10);
    setDuplicateItem({
      vendor: e.vendor || "",
      date: today,
      amount: e.amount ?? "",
      category: e.category || "General",
      project: e.project || activeProject || "",
      notes: e.notes || "",
    });
  };
  const createDuplicate = async (payload) => {
    await create(payload);
    setDuplicateItem(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Gastos</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">Todos los gastos</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 [&>*]:shrink-0">
          <AutoRulesManager />
          <RecurringManager onChanged={load} />
          <CsvImportDialog existing={allExpenses} onDone={load} defaultProject={activeProject} closedMonths={closedMonths} />
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
              <ExpenseForm onSubmit={create} submitLabel="Guardar gasto" defaultProject={activeProject} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {duplicates.size > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="font-semibold text-amber-800">
              {duplicates.size} posible(s) duplicado(s) detectado(s)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`rounded-xl shrink-0 ${showDuplicatesOnly ? "bg-amber-100 border-amber-300" : "border-amber-300"}`}
            onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
          >
            {showDuplicatesOnly ? "Ver todos" : "Ver duplicados"}
          </Button>
        </div>
      )}

      <Card className="p-4 sm:p-5 rounded-2xl border-[#E2DDD3] bg-white">
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C626A]" />
            <Input
              data-testid="input-search"
              aria-label="Buscar por proveedor o notas"
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
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger data-testid="select-sort" className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Fecha (recientes)</SelectItem>
              <SelectItem value="date-asc">Fecha (antiguos)</SelectItem>
              <SelectItem value="category-asc">Categoría (A-Z)</SelectItem>
              <SelectItem value="receipt-first">Con ticket primero</SelectItem>
              <SelectItem value="no-receipt-first">Sin ticket primero</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#5C626A]">Desde</Label>
            <Input
              data-testid="input-date-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-[#5C626A]">Hasta</Label>
            <Input
              data-testid="input-date-end"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs text-[#5C626A] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Rangos rápidos
            </Label>
            <div className="flex flex-wrap gap-2">
              {datePresets().map((p) => {
                const active = start === p.start && end === p.end;
                return (
                  <button
                    key={p.label}
                    type="button"
                    data-testid={`preset-${p.label}`}
                    onClick={() => {
                      if (active) {
                        setStart("");
                        setEnd("");
                      } else {
                        setStart(p.start);
                        setEnd(p.end);
                      }
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? "bg-[#1E293B] text-white border-[#1E293B]"
                        : "bg-white text-[#5C626A] border-[#E2DDD3] hover:bg-[#F2EFE9]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
              {(start || end) && (
                <button
                  type="button"
                  data-testid="preset-clear"
                  onClick={() => { setStart(""); setEnd(""); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#E2DDD3] text-[#D95D39] hover:bg-[#FAF8F5] inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#E2DDD3] flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[#5C626A]" data-testid="filter-summary">
            <span className="font-semibold text-[#1A1D20]">{items.length}</span> gasto(s)
            {(start || end) && (
              <span className="font-mono text-xs ml-1">
                ({start || "inicio"} → {end || "hoy"})
              </span>
            )}
          </p>
          <p className="text-sm text-[#5C626A]">
            Total: <span className="font-heading font-bold text-[#1A1D20]" data-testid="filter-total">
              {eur(items.reduce((sum, e) => sum + Number(e.amount || 0), 0))}
            </span>
          </p>
        </div>
      </Card>

      {activeProject && (() => {
        const total = items.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const today = new Date();
        const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
        const monthTotal = items
          .filter((e) => String(e.date || "").startsWith(ym))
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const forecast = today.getDate() > 0
          ? (monthTotal / today.getDate()) * new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
          : 0;
        const limit = Number(projectBudget?.total || 0);
        const pct = limit > 0 ? (total / limit) * 100 : null;
        return (
          <Card data-testid="project-summary" className="p-5 rounded-2xl border-[#E2DDD3] bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Proyecto activo</p>
                <h2 className="font-heading text-2xl font-bold text-[#1A1D20] mt-1">{activeProject}</h2>
              </div>
              {limit > 0 && (
                <div className="text-left sm:text-right">
                  <p className="text-xs text-[#5C626A]">Presupuesto del proyecto</p>
                  <p className={`font-heading text-xl font-bold ${pct > 100 ? "text-red-700" : "text-[#1A1D20]"}`}>
                    {eur(total)} de {eur(limit)}
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <ProjectMetric label="Gastado" value={eur(total)} />
              <ProjectMetric label="Tickets" value={items.length} />
              <ProjectMetric label="Este mes" value={eur(monthTotal)} />
              <ProjectMetric label="Proyección mensual" value={eur(forecast)} />
            </div>
          </Card>
        );
      })()}

      <Card className="rounded-2xl border-[#E2DDD3] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#5C626A]">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[#5C626A]">No hay gastos que coincidan.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E2DDD3]">
            {visibleItems.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                dupes={duplicates.get(e.id)}
                locked={isLocked(e.date)}
                onPreview={setPreviewImages}
                onEdit={setEditItem}
                onDuplicate={duplicate}
                onRemove={remove}
              />
            ))}
          </ul>
        )}
        {!loading && items.length > 0 && hasMore && (
          <div className="p-4 text-center border-t border-[#E2DDD3]">
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

      {/* Duplicate dialog */}
      <Dialog open={!!duplicateItem} onOpenChange={(o) => !o && setDuplicateItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Duplicar gasto</DialogTitle>
          </DialogHeader>
          {duplicateItem && (
            <ExpenseForm
              initial={duplicateItem}
              onSubmit={createDuplicate}
              submitLabel="Guardar copia"
              defaultProject={activeProject}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Image preview */}
      <Dialog open={previewImages.length > 0} onOpenChange={(o) => !o && setPreviewImages([])}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Ticket{previewImages.length > 1 ? `s (${previewImages.length})` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[75vh] overflow-auto">
            {previewImages.map((r, i) => (
              <ReceiptViewer key={i} receipt={r} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3">
      <p className="text-xs text-[#5C626A]">{label}</p>
      <p className="font-heading font-bold text-lg text-[#1A1D20] mt-1">{value}</p>
    </div>
  );
}
