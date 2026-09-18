import { useEffect, useState } from "react";
import { api, eur, ALLOWED_ICONS, ALLOWED_COLORS, COLOR_MAP } from "../lib/api";
import { ICONS, iconFor } from "../lib/icons";
import { useCategories } from "../lib/categoriesContext";
import { useProjects } from "../lib/projectsContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import CategoryBadge from "./CategoryBadge";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Trash2, Plus, Tag, Save } from "lucide-react";

function buildCatBudgets(raw) {
  const out = {};
  for (const [name, value] of Object.entries(raw || {})) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) out[name] = n;
  }
  return out;
}

export default function CategoryManager() {
  const { categories, reload } = useCategories();
  const { activeProject } = useProjects();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Package");
  const [color, setColor] = useState("cyan");
  const [saving, setSaving] = useState(false);
  const [catBudgets, setCatBudgets] = useState({});
  const [budgetMeta, setBudgetMeta] = useState({ total: 0, alert_at: 80, period: "monthly" });
  const [spentByCat, setSpentByCat] = useState({});
  const [savingBudgets, setSavingBudgets] = useState(false);

  const loadBudget = async () => {
    const params = activeProject ? { project: activeProject } : {};
    const [b, s] = await Promise.all([
      api.get("/budget", { params }),
      api.get("/stats", { params }),
    ]);
    setBudgetMeta({
      total: Number(b.data.total || 0),
      alert_at: Number(b.data.alert_at) > 0 ? Number(b.data.alert_at) : 80,
      period: b.data.period || "monthly",
    });
    const cb = {};
    for (const [catName, value] of Object.entries(b.data.category_budgets || {})) {
      cb[catName] = String(value || "");
    }
    setCatBudgets(cb);
    const spent = {};
    (s.data?.period_by_category || s.data?.by_category || []).forEach((c) => {
      spent[c.category] = c.total;
    });
    setSpentByCat(spent);
  };

  useEffect(() => {
    loadBudget();
  }, [activeProject]); // eslint-disable-line

  const saveBudgets = async () => {
    setSavingBudgets(true);
    try {
      await api.put("/budget", {
        total: budgetMeta.total,
        alert_at: budgetMeta.alert_at,
        period: budgetMeta.period,
        category_budgets: buildCatBudgets(catBudgets),
        project: activeProject,
      });
      toast.success("Topes por categoría actualizados");
      loadBudget();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Error al guardar");
    } finally {
      setSavingBudgets(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/categories", { name: name.trim(), icon, color, project: activeProject });
      toast.success("Categoría añadida");
      setName("");
      reload();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al crear";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (n) => {
    try {
      const params = activeProject ? { project: activeProject } : {};
      await api.delete(`/categories/${encodeURIComponent(n)}`, { params });
      toast.success("Categoría eliminada");
      reload();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al borrar";
      toast.error(msg);
    }
  };

  const PreviewIcon = iconFor(icon);
  const previewCls = (COLOR_MAP[color] || COLOR_MAP.stone).cls;

  return (
    <>
    <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white" data-testid="category-manager">
      <div className="flex items-center gap-2 mb-1">
        <Tag className="w-5 h-5 text-[#D95D39]" />
        <h3 className="font-heading font-bold text-lg">Categorías</h3>
      </div>
      <p className="text-sm text-[#5C626A] mb-4">
        {activeProject
          ? `Categorías del proyecto «${activeProject}». Son independientes del resto de proyectos.`
          : "Categorías generales (sin proyecto). Cada proyecto tiene las suyas propias."}
      </p>

      {/* Existing */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => {
          const Icon = iconFor(c.icon);
          const cls = (COLOR_MAP[c.color] || COLOR_MAP.stone).cls;
          const canDelete = c.name !== "Otros";
          return (
            <div
              key={c.name}
              className={`inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border text-sm font-medium ${cls}`}
              data-testid={`cat-chip-${c.name}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{c.name}</span>
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      data-testid={`btn-delete-cat-${c.name}`}
                      className="w-6 h-6 rounded-full hover:bg-white/70 flex items-center justify-center"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                       <AlertDialogTitle>¿Eliminar la categoría &quot;{c.name}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Solo se puede eliminar si no tiene gastos asociados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        data-testid={`btn-confirm-delete-cat-${c.name}`}
                        onClick={() => remove(c.name)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new */}
      <form onSubmit={add} className="space-y-4 border-t border-[#E2DDD3] pt-4">
        <p className="text-sm font-semibold text-[#1A1D20]">Añadir nueva categoría</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              data-testid="input-new-cat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Fontanería"
              maxLength={40}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vista previa</Label>
            <div className="h-10 flex items-center">
              <span
                data-testid="preview-new-cat"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${previewCls}`}
              >
                <PreviewIcon className="w-3.5 h-3.5" />
                {name.trim() || "Nueva categoría"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Icono</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALLOWED_ICONS.map((n) => {
              const Ic = ICONS[n];
              const active = icon === n;
              return (
                <button
                  key={n}
                  type="button"
                  data-testid={`icon-opt-${n}`}
                  onClick={() => setIcon(n)}
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                    active
                      ? "bg-[#1E293B] text-white border-[#1E293B]"
                      : "bg-white text-[#1A1D20] border-[#E2DDD3] hover:border-[#1A1D20]"
                  }`}
                >
                  <Ic className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Color</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALLOWED_COLORS.map((c) => {
              const active = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  data-testid={`color-opt-${c}`}
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-lg border-2 transition-all ${
                    active ? "border-[#1A1D20] scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: COLOR_MAP[c].dot }}
                  title={c}
                />
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving || !name.trim()}
            data-testid="btn-add-cat"
            className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Añadir categoría
          </Button>
        </div>
      </form>
    </Card>

    <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white mt-5" data-testid="category-budgets">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-lg">Topes por categoría</h3>
          <p className="text-sm text-[#5C626A] mt-1">
            {activeProject
              ? `Tope de gasto de cada categoría en «${activeProject}».`
              : "Tope de gasto de cada categoría (general)."}{" "}
            Déjalo en 0 o vacío para no limitarla.
          </p>
        </div>
        <Button
          data-testid="btn-save-category-budgets"
          onClick={saveBudgets}
          disabled={savingBudgets}
          className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl shrink-0"
        >
          <Save className="w-4 h-4 mr-2" /> Guardar topes
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {categories.length === 0 && (
          <p className="text-sm text-[#5C626A]">No hay categorías todavía.</p>
        )}
        {categories.map((c) => {
          const limit = Number(catBudgets[c.name] || 0);
          const spent = spentByCat[c.name] || 0;
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const over = limit > 0 && spent > limit;
          const warn = limit > 0 && !over && spent >= (limit * budgetMeta.alert_at) / 100;
          return (
            <div
              key={c.name}
              data-testid={`cat-budget-row-${c.name}`}
              className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3 sm:p-4"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryBadge category={c.name} />
                <div className="flex-1" />
                <Input
                  data-testid={`input-cat-budget-${c.name}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={catBudgets[c.name] ?? ""}
                  onChange={(e) =>
                    setCatBudgets((prev) => ({ ...prev, [c.name]: e.target.value }))
                  }
                  placeholder="Sin límite"
                  className="w-28 rounded-xl"
                />
              </div>
              {limit > 0 && (
                <div className="mt-2">
                  <Progress
                    value={pct}
                    indicatorClassName={over ? "bg-red-500" : warn ? "bg-amber-500" : ""}
                    className="h-2"
                  />
                  <p
                    className={`text-xs mt-1 font-mono ${
                      over ? "text-red-700" : warn ? "text-amber-700" : "text-[#5C626A]"
                    }`}
                  >
                    {eur(spent)} de {eur(limit)} · {((spent / limit) * 100).toFixed(1)}%
                    {over ? " · Excedido" : warn ? " · Cerca del límite" : ""}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
    </>
  );
}
