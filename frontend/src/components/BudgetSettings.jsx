import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useProjects } from "../lib/projectsContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Wallet, Save } from "lucide-react";
import { PERIODS, periodLabel, normalizePeriod } from "../lib/period";

export default function BudgetSettings() {
  const { activeProject } = useProjects();
  const [total, setTotal] = useState("");
  const [alertAt, setAlertAt] = useState("80");
  const [period, setPeriod] = useState("monthly");
  const [catBudgetsRaw, setCatBudgetsRaw] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const params = activeProject ? { project: activeProject } : {};
    const { data } = await api.get("/budget", { params });
    setTotal(String(data.total || ""));
    setAlertAt(String(data.alert_at > 0 ? data.alert_at : 80));
    setPeriod(normalizePeriod(data.period));
    setCatBudgetsRaw(data.category_budgets || {});
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
        category_budgets: catBudgetsRaw,
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
        <h3 className="font-heading font-bold text-lg">Topes por categoría</h3>
        <p className="text-sm text-[#5C626A] mt-1">
          Los topes por categoría se configuran ahora en{" "}
          <span className="font-semibold text-[#1A1D20]">Ajustes → Categorías</span>, junto a cada
          categoría.
        </p>
      </Card>
    </div>
  );
}
