import { useEffect, useState } from "react";
import { api, eur } from "../lib/api";
import { useCategories } from "../lib/categoriesContext";
import { COLOR_MAP } from "../lib/api";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import CategoryBadge from "../components/CategoryBadge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { Wallet, TrendingUp, Receipt, Sparkles, Plus, ScanLine, AlertTriangle } from "lucide-react";

export default function Dashboard() {
	const { categories } = useCategories();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState(false);

  const load = async () => {
    try {
      const [s, r] = await Promise.all([
        api.get("/stats"),
        api.get("/expenses"),
      ]);
      setStats(s.data);
      setRecent(r.data.slice(0, 6));
    } catch {
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1E293B]/10 flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-[#1E293B]" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-[#1A1D20]">
          No se pudo conectar con el backend
        </h1>
        <p className="text-[#5C626A] mt-2 max-w-md mx-auto">
          Verifica que la API esté en marcha y que <code className="font-mono text-xs">VITE_BACKEND_URL</code> apunte a su dirección.
        </p>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-[#5C626A]">Cargando…</div>;
  }

  const progress = Math.min(stats.progress || 0, 200);
  const overBudget = stats.remaining < 0 && stats.budget > 0;
  const alertAt = stats.alert_at > 0 ? stats.alert_at : 80;
  const progressPct = stats.progress || 0;
  const warnBudget =
    stats.budget > 0 && !overBudget && progressPct >= alertAt && progressPct < 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Panel de control</p>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1D20] mt-1">
            Tus gastos, bajo control
          </h1>
          <p className="text-[#5C626A] mt-2 max-w-xl">
            Escanea tickets, controla tu presupuesto y consulta gráficos en tiempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/escanear">
            <Button data-testid="btn-scan-hero" className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-xl">
              <ScanLine className="w-4 h-4 mr-2" /> Escanear ticket
            </Button>
          </Link>
          <Link to="/gastos">
            <Button data-testid="btn-add-hero" variant="outline" className="rounded-xl border-[#E2DDD3]">
              <Plus className="w-4 h-4 mr-2" /> Añadir gasto
            </Button>
          </Link>
        </div>
      </div>

      {stats.budget > 0 && (overBudget || warnBudget) && (
        <div
          data-testid="budget-alert"
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            overBudget
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 mt-0.5 shrink-0 ${overBudget ? "text-red-600" : "text-amber-600"}`}
          />
          <div>
            <p className="font-semibold">
              {overBudget ? "Presupuesto excedido" : "Aviso de presupuesto"}
            </p>
            <p className="text-sm mt-0.5">
              {overBudget
                ? `Has gastado ${eur(stats.total_spent)} de ${eur(stats.budget)} (${progressPct.toFixed(1)}%).`
                : `Has gastado el ${progressPct.toFixed(1)}% de tu presupuesto (${eur(stats.total_spent)} de ${eur(stats.budget)}).`}
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          testid="kpi-budget"
          icon={<Wallet className="w-5 h-5" />}
          label="Presupuesto total"
          value={eur(stats.budget)}
          tint="bg-[#1E293B] text-white"
        />
        <KpiCard
          testid="kpi-spent"
          icon={<TrendingUp className="w-5 h-5" />}
          label="Gastado"
          value={eur(stats.total_spent)}
          sub={
            <div className="mt-2">
              <Progress value={Math.min(progress, 100)} className="h-2" />
              <div className="text-xs mt-1 text-[#5C626A]">
                {progress.toFixed(1)}% del presupuesto
              </div>
            </div>
          }
        />
        <KpiCard
          testid="kpi-remaining"
          icon={<Sparkles className="w-5 h-5" />}
          label={overBudget ? "Excedido" : "Disponible"}
          value={eur(Math.abs(stats.remaining))}
          tint={overBudget ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}
        />
        <KpiCard
          testid="kpi-count"
          icon={<Receipt className="w-5 h-5" />}
          label="Nº tickets"
          value={stats.count}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-lg">Gasto por categoría</h3>
            <span className="text-xs font-mono text-[#5C626A]">EUR</span>
          </div>
          <div className="h-64" data-testid="chart-categories">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_category} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE9DF" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#5C626A" }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "#5C626A" }} />
                <Tooltip formatter={(v) => eur(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2DDD3" }} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>   
                  {stats.by_category.map((c, i) => {
                    const meta = categories.find((x) => x.name === c.category);
                    const color = (COLOR_MAP[meta?.color || "stone"] || COLOR_MAP.stone).dot;
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
          <h3 className="font-heading font-bold text-lg mb-4">Evolución mensual</h3>
          <div className="h-64" data-testid="chart-monthly">
            {stats.monthly.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[#5C626A]">
                Aún no hay datos suficientes
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE9DF" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5C626A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#5C626A" }} />
                  <Tooltip formatter={(v) => eur(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2DDD3" }} />
                  <Line type="monotone" dataKey="total" stroke="#D95D39" strokeWidth={3} dot={{ r: 4, fill: "#D95D39" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent */}
      <Card className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg">Últimos gastos</h3>
          <Link to="/gastos" className="text-sm text-[#D95D39] hover:underline" data-testid="link-all-expenses">
            Ver todos →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-[#5C626A]">Aún no hay gastos. Empieza escaneando un ticket o añade uno manualmente.</p>
        ) : (
          <ul className="divide-y divide-[#E2DDD3]">
            {recent.map((e) => (
              <li key={e.id} className="py-3 flex items-center justify-between gap-3" data-testid={`recent-item-${e.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1A1D20] truncate">{e.vendor || "Sin proveedor"}</p>
                    <CategoryBadge category={e.category} />
                  </div>
                  <p className="text-xs text-[#5C626A] mt-1 font-mono">{e.date}</p>
                </div>
                <div className="font-heading font-bold text-lg text-[#1A1D20]">{eur(e.amount)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function KpiCard({ testid, icon, label, value, sub, tint }) {
  return (
    <Card
      data-testid={testid}
      className={`p-5 rounded-2xl border-[#E2DDD3] ${tint || "bg-white"} shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest opacity-80">{label}</span>
        <span className="opacity-90">{icon}</span>
      </div>
      <div className="font-heading font-extrabold text-2xl sm:text-3xl mt-2">{value}</div>
      {sub}
    </Card>
  );
}
