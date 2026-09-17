import { useEffect, useState } from "react";
import { api, eur } from "../lib/api";
import { useCategories } from "../lib/categoriesContext";
import { useProjects } from "../lib/projectsContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Wallet, Save } from "lucide-react";
import { PERIODS, periodLabel, normalizePeriod } from "../lib/period";
import CategoryBadge from "./CategoryBadge";

function buildCatBudgets(raw) {
  const out = {};
  for (const [name, value] of Object.entries(raw || {})) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) out[name] = n;
  }
  return out;
}

export default function BudgetSettings() {
  const { categories } = useCategories();
  const { activeProject } = useProjects();
  const [total, setTotal] = useState("");
  const [alertAt, setAlertAt] = useState("80");
  const [period, setPeriod] = useState("monthly");
  const [catBudgets, setCatBudgets] = useState({});
  const [stats, setStats] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const params = activeProject ? { project: activeProject } : {};
    const [b, s] = await Promise.all([
      api.get("/budget", { params }),
      api.get("/stats", { params }),
    ]);
    setTotal(String(b.data.total || ""));
    setAlertAt(String(b.data.alert_at > 0 ? b.data.alert_at : 80));
    setPeriod(normalizePeriod(b.data.period));
    const cb = {};
    for (const [name, value] of Object.entries(b.data.category_budgets || {})) {
      cb[name] = String(value || "");
    }
    setCatBudgets(cb);
    setStats(s.data);
  };

  useEffect(() => {
    load();
  }, [activeProject]); // eslint-disable-line

  const persist = async (msg) => {
    setSaving(true);
    try {
      const payload = {
        total: Number(total || 0),
        alert_at: Number(alertAt || 80),
        category_budgets: buildCatBudgets(catBudgets),
        period,
        project: activeProject,
      };
      await api.put("/budget", payload);
      const params = activeProject ? { project: activeProject } : {};
      const { data } = await api.get("/budget", { params });
      if (Number(data.total || 0) === payload.total) toast.success(msg);
      else toast.error("El importe no se guardó. Si usas Supabase, ejecuta supabase/schema.sql (columna budget.projects).");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    persist(activeProject ? `Presupuesto de «${activeProject}» actualizado` : "Presupuesto actualizado");
  };

  const spentByCat = {};
  (stats?.period_by_category || stats?.by_category || []).forEach((c) => {
    spentByCat[c.category] = c.total;
  });
  const alertThreshold = stats?.alert_at > 0 ? stats.alert_at : 80;
  const activePeriodLabel = periodLabel(stats?.period || period);

  return (
    <div className="space-y-5">
      <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <h3 className="font-heading font-bold text-lg">Presupuesto</h3>
        <p className="text-sm text-[#5C626A] mt-1 mb-4">
          {activeProject
            ? `Configura el presupuesto del proyecto «${activeProject}».`
            : "Configura el presupuesto general (sin proyecto)."}
        </p>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Importe total del presupuesto (€)</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C626A]" />
                <Input
                  data-testid="input-budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="Ej. 85000"
                  className="pl-9 rounded-xl"
                />
              </div>
              <Button
                data-testid="btn-save-budget"
                type="submit"
                disabled={saving}
                className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" /> Guardar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Periodo</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger data-testid="select-budget-period" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Avisar al alcanzar (%)</Label>
              <Input
                data-testid="input-alert-at"
                type="number"
                step="1"
                min="1"
                max="100"
                value={alertAt}
                onChange={(e) => setAlertAt(e.target.value)}
                placeholder="80"
                className="rounded-xl"
              />
            </div>
          </div>
          <p className="text-xs text-[#5C626A]">
            El progreso y las alertas se calculan sobre el {periodLabel(period).toLowerCase()} en curso.
          </p>
        </form>
      </Card>

      <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-lg">Topes por categoría</h3>
            <p className="text-sm text-[#5C626A] mt-1">
              Define un tope por categoría. Déjalo en 0 o vacío para no limitarla.
            </p>
          </div>
          <Button
            data-testid="btn-save-category-budgets"
            onClick={() => persist("Topes por categoría actualizados")}
            disabled={saving}
            className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" /> Guardar topes
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {categories.length === 0 && <p className="text-sm text-[#5C626A]">No hay categorías todavía.</p>}
          {categories.map((c) => {
            const limit = Number(catBudgets[c.name] || 0);
            const spent = spentByCat[c.name] || 0;
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const over = limit > 0 && spent > limit;
            const warn = limit > 0 && !over && spent >= (limit * alertThreshold) / 100;
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
                    onChange={(e) => setCatBudgets((prev) => ({ ...prev, [c.name]: e.target.value }))}
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
                    <p className={`text-xs mt-1 font-mono ${over ? "text-red-700" : warn ? "text-amber-700" : "text-[#5C626A]"}`}>
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
    </div>
  );
}
