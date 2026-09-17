import { useEffect, useState } from "react";
import { api, eur } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { Wallet, Save } from "lucide-react";
import CategoryManager from "../components/CategoryManager";

export default function BudgetPage() {
  const [total, setTotal] = useState("");
  const [alertAt, setAlertAt] = useState("80");
  const [stats, setStats] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [b, s] = await Promise.all([api.get("/budget"), api.get("/stats")]);
    setTotal(String(b.data.total || ""));
    setAlertAt(String(b.data.alert_at > 0 ? b.data.alert_at : 80));
    setStats(s.data);
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/budget", {
        total: Number(total || 0),
        alert_at: Number(alertAt || 80),
      });
      toast.success("Presupuesto actualizado");
      load();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const progress = Math.min(stats?.progress || 0, 100);
  const overBudget = stats && stats.remaining < 0 && stats.budget > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Presupuesto</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">
          Tu presupuesto total
        </h1>
        <p className="text-[#5C626A] mt-2">Define un importe global objetivo para tus gastos.</p>
      </div>

      <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <form onSubmit={save} className="space-y-4">
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

          <div className="space-y-1.5">
            <Label>Avisar al alcanzar el (% del presupuesto)</Label>
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
        </form>
      </Card>

      {stats && (
        <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
          <h3 className="font-heading font-bold text-lg mb-4">Estado actual</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Row label="Presupuesto" value={eur(stats.budget)} />
            <Row label="Gastado" value={eur(stats.total_spent)} />
            <Row
              label={overBudget ? "Excedido" : "Disponible"}
              value={eur(Math.abs(stats.remaining))}
              tone={overBudget ? "text-red-700" : "text-emerald-700"}
            />
            <Row label="Nº tickets" value={stats.count} />
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-[#5C626A] mt-2 font-mono">
            {progress.toFixed(1)}% del presupuesto consumido
          </p>
        </Card>
      )}
	   <CategoryManager />
    </div>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3">
      <div className="text-[11px] font-mono uppercase tracking-widest text-[#5C626A]">{label}</div>
      <div className={`font-heading font-bold text-xl ${tone || "text-[#1A1D20]"}`}>{value}</div>
    </div>
  );
}
