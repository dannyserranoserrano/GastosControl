import { useEffect, useState, useMemo } from "react";
import { api, eur } from "../lib/api";
import { findDuplicates } from "../lib/findDuplicates";
import { useNotifications, NotificationSettings } from "../lib/useNotifications.jsx";
import { useRecurring } from "../lib/useRecurring";
import { useProjects } from "../lib/projectsContext";
import RecurringForecast from "../components/RecurringForecast";
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
import { Wallet, TrendingUp, Receipt, Sparkles, Plus, ScanLine, AlertTriangle, Copy, Bell } from "lucide-react";

export default function Dashboard() {
	const { categories } = useCategories();
  const { activeProject, refreshFromExpenses } = useProjects();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [error, setError] = useState(false);

  const notif = useNotifications(stats);

  const load = async () => {
    try {
      const params = activeProject ? { project: activeProject } : {};
      const [s, r] = await Promise.all([
        api.get("/stats", { params }),
        api.get("/expenses", { params }),
      ]);
      setStats(s.data);
      setAllExpenses(r.data);
      setRecent(r.data.slice(0, 6));
      refreshFromExpenses(r.data);
    } catch {
      setError(true);
    }
  };

  useEffect(() => { load(); }, [activeProject]); // eslint-disable-line

  const duplicates = useMemo(() => findDuplicates(allExpenses), [allExpenses]);

  useRecurring(load);

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

  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Panel de control</p>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1D20] mt-1">
            {activeProject ? activeProject : "Tus gastos, bajo control"}
          </h1>
          <p className="text-[#5C626A] mt-2 max-w-xl">
            {activeProject
              ? `Viendo los datos del proyecto «${activeProject}». Cambia de proyecto en la barra superior.`
              : "Escanea tickets, controla tu presupuesto y consulta gráficos en tiempo real."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            data-testid="btn-notif-settings"
            onClick={() => notif.setOpenSettings(true)}
            className="p-2.5 rounded-xl border border-[#E2DDD3] bg-white hover:bg-[#FAF8F5] transition-colors relative"
            title="Configurar notificaciones"
          >
            <Bell className="w-4 h-4 text-[#5C626A]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D95D39]" />
          </button>
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
                ? `Has gastado ${eur(stats.period_spent ?? stats.total_spent)} de ${eur(stats.budget)} este ${stats.period_label || "mes"} (${progressPct.toFixed(1)}%).`
                : `Has gastado el ${progressPct.toFixed(1)}% de tu presupuesto este ${stats.period_label || "mes"} (${eur(stats.period_spent ?? stats.total_spent)} de ${eur(stats.budget)}).`}
            </p>
          </div>
        </div>
      )}

      {(() => {
        const cb = stats.category_budgets || {};
        const spentMap = {};
        (stats.period_by_category || stats.by_category || []).forEach((c) => {
          spentMap[c.category] = c.total;
        });
        const issues = Object.entries(cb)
          .filter(([, lim]) => Number(lim) > 0)
          .map(([cat, lim]) => {
            const limit = Number(lim);
            const spent = spentMap[cat] || 0;
            return {
              cat,
              limit,
              spent,
              pct: (spent / limit) * 100,
              over: spent > limit,
              warn: spent <= limit && spent >= (limit * alertAt) / 100,
            };
          })
          .filter((x) => x.over || x.warn);
        if (issues.length === 0) return null;
        return (
          <div className="space-y-2">
            {issues.map((x) => (
              <div
                key={x.cat}
                data-testid={`cat-alert-${x.cat}`}
                className={`rounded-2xl border p-4 flex items-center gap-3 ${
                  x.over ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 mt-0.5 shrink-0 ${x.over ? "text-red-600" : "text-amber-600"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1A1D20] flex items-center gap-2 flex-wrap">
                    Presupuesto de <CategoryBadge category={x.cat} />
                  </p>
                  <p className={`text-sm mt-0.5 ${x.over ? "text-red-800" : "text-amber-800"}`}>
                    {x.over ? "Excedido" : "Cerca del límite"} en el {stats.period_label || "mes"}: {eur(x.spent)} de {eur(x.limit)} (
                    {x.pct.toFixed(1)}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {duplicates.size > 0 && (
        <Card data-testid="duplicates-card" className="p-5 rounded-2xl border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <Copy className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-heading font-bold text-amber-900">
                {duplicates.size} posible(s) duplicado(s)
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                Hemos detectado gastos con el mismo importe, fecha cercana y proveedor similar. Revísalos en la lista de gastos.
              </p>
              <Link to="/gastos">
                <Button variant="outline" size="sm" className="mt-3 rounded-xl border-amber-300 text-amber-900">
                  Ver gastos sospechosos
                </Button>
              </Link>
            </div>
          </div>
        </Card>
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
          label={`Gastado (${stats.period_label || "mes"})`}
          value={eur(stats.period_spent ?? stats.total_spent)}
          sub={
            <div className="text-xs mt-1 text-[#5C626A]">
              {eur(stats.total_spent)} en total
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

      {/* Estado actual */}
      <Card data-testid="status-card" className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <h3 className="font-heading font-bold text-lg mb-4">
          Estado actual{activeProject ? ` · ${activeProject}` : ""}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat label="Presupuesto" value={eur(stats.budget)} />
          <Stat
            label={`Gastado (${stats.period_label || "mes"})`}
            value={eur(stats.period_spent ?? stats.total_spent)}
          />
          <Stat
            label={overBudget ? "Excedido" : "Disponible"}
            value={eur(Math.abs(stats.remaining))}
            tone={overBudget ? "text-red-700" : "text-emerald-700"}
          />
          <Stat label="Nº tickets" value={stats.count} />
        </div>
        <Progress value={Math.min(progress, 100)} className="h-3" />
        <p className="text-xs text-[#5C626A] mt-2 font-mono">
          {progressPct.toFixed(1)}% del presupuesto consumido en el {stats.period_label || "mes"}
        </p>
      </Card>

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

      {/* Gráficos avanzados */}
      {(() => {
        const byMonthCat = {};
        (allExpenses || []).forEach((e) => {
          const m = String(e.date || "").slice(0, 7);
          if (!/^\d{4}-\d{2}$/.test(m)) return;
          const cat = e.category || "Otros";
          byMonthCat[m] = byMonthCat[m] || {};
          byMonthCat[m][cat] = (byMonthCat[m][cat] || 0) + Number(e.amount || 0);
        });
        const allMonths = Object.keys(byMonthCat).sort();
        const months = allMonths.slice(-6);
        if (months.length === 0) return null;

        const catTotals = {};
        months.forEach((m) => {
          Object.entries(byMonthCat[m]).forEach(([c, v]) => {
            catTotals[c] = (catTotals[c] || 0) + v;
          });
        });
        const cats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([c]) => c);
        const colorOf = (cat) => {
          const meta = categories.find((x) => x.name === cat);
          return (COLOR_MAP[meta?.color || "stone"] || COLOR_MAP.stone).dot;
        };
        const advData = months.map((m) => {
          const row = { month: m };
          cats.forEach((c) => {
            row[c] = Math.round((byMonthCat[m][c] || 0) * 100) / 100;
          });
          return row;
        });

        const comparison = allMonths.map((m, i) => {
          const total = Object.values(byMonthCat[m]).reduce((s, v) => s + v, 0);
          const prev = i > 0 ? Object.values(byMonthCat[allMonths[i - 1]]).reduce((s, v) => s + v, 0) : null;
          return {
            month: m,
            total: Math.round(total * 100) / 100,
            delta: prev !== null ? Math.round((total - prev) * 100) / 100 : null,
            pct: prev ? ((total - prev) / prev) * 100 : null,
          };
        });
        const recentComparison = comparison.slice(-6).reverse();

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
              <h3 className="font-heading font-bold text-lg mb-4">Evolución por categoría</h3>
              <div className="h-72" data-testid="chart-stacked">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={advData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEE9DF" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5C626A" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#5C626A" }} />
                    <Tooltip formatter={(v) => eur(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2DDD3" }} />
                    {cats.map((c) => (
                      <Bar key={c} dataKey={c} stackId="a" fill={colorOf(c)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {cats.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 text-xs text-[#5C626A]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorOf(c) }} />
                    {c}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
              <h3 className="font-heading font-bold text-lg mb-4">Comparativa mes a mes</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#5C626A] text-[11px] font-mono uppercase tracking-widest">
                    <th className="pb-2">Mes</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 text-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentComparison.map((r) => (
                    <tr key={r.month} className="border-t border-[#E2DDD3]">
                      <td className="py-2 font-mono">{r.month}</td>
                      <td className="py-2 text-right font-mono">{eur(r.total)}</td>
                      <td
                        className={`py-2 text-right font-mono ${
                          r.delta === null ? "text-[#5C626A]" : r.delta > 0 ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {r.delta === null ? "—" : `${r.delta > 0 ? "+" : ""}${eur(r.delta)}`}
                        {r.pct !== null ? (
                          <span className="block text-[10px] opacity-80">
                            {r.pct > 0 ? "+" : ""}
                            {r.pct.toFixed(0)}%
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        );
      })()}

      {/* Proyección a fin de periodo */}
      {(() => {
        const pLabel = stats.period_label || "mes";
        const elapsed = stats.period_elapsed_days || dayOfMonth;
        const totalDays = stats.period_days || daysInMonth;
        const periodSpent =
          stats.period_spent !== undefined
            ? stats.period_spent
            : (stats.monthly.find((m) => m.month === ym) || {}).total || 0;
        const dailyAvg = elapsed > 0 ? periodSpent / elapsed : 0;
        const forecast = Math.round(dailyAvg * totalDays * 100) / 100;
        const forecastPct =
          stats.budget > 0 ? (forecast / stats.budget) * 100 : null;
        const forecastOver = forecastPct !== null && forecastPct > 100;
        const forecastWarn =
          forecastPct !== null && !forecastOver && forecastPct >= alertAt;

        return (
          <Card
            data-testid="forecast-card"
            className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#D95D39]" /> Proyección a fin de {pLabel}
                </h3>
                <p className="text-sm text-[#5C626A] mt-1">
                  Estimación según el ritmo actual de gasto (día {elapsed} de {totalDays}).
                </p>
              </div>
              <div className="text-right">
                <div className="font-heading font-extrabold text-3xl text-[#1A1D20]">
                  {eur(forecast)}
                </div>
                <div className="text-xs font-mono text-[#5C626A]">
                  gasto estimado del {pLabel}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label={`Gastado este ${pLabel}`} value={eur(periodSpent)} />
              <Stat label="Ritmo diario" value={`${eur(dailyAvg)}/día`} />
              <Stat label="Días transcurridos" value={`${elapsed}/${totalDays}`} />
              <Stat
                label={forecastOver ? "Excedería" : forecastWarn ? "Cerca del límite" : "Presupuesto"}
                value={forecastPct !== null ? `${forecastPct.toFixed(1)}%` : "—"}
                tone={forecastOver ? "text-red-700" : forecastWarn ? "text-amber-700" : ""}
              />
            </div>

            {periodSpent === 0 ? (
              <p className="text-sm text-[#5C626A] mt-4">
                No hay gastos en este {pLabel} todavía; la proyección arrancará al registrar el primero.
              </p>
            ) : forecastPct !== null ? (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${
                  forecastOver
                    ? "bg-red-50 border-red-200 text-red-800"
                    : forecastWarn
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                {forecastOver
                  ? `Al ritmo actual, a fin de ${pLabel} habrías gastado ${eur(forecast)} — un ${forecastPct.toFixed(1)}% de tu presupuesto de ${eur(stats.budget)}.`
                  : forecastWarn
                    ? `Al ritmo actual llegarías al ${forecastPct.toFixed(1)}% de tu presupuesto de ${eur(stats.budget)} (${eur(forecast)}).`
                    : `Al ritmo actual usarías el ${forecastPct.toFixed(1)}% de tu presupuesto de ${eur(stats.budget)}.`}
              </div>
            ) : null}
          </Card>
        );
      })()}

      {/* Proyección por categoría */}
      {(() => {
        const budgets = stats.category_budgets || {};
        const perCat = {};
        const pLabel = stats.period_label || "mes";
        const elapsed = stats.period_elapsed_days || dayOfMonth;
        const totalDays = stats.period_days || daysInMonth;
        const rangeStart = stats.period_start;
        const rangeEnd = stats.period_end;
        (allExpenses || []).forEach((e) => {
          const d = e.date || "";
          const inPeriod = rangeStart && rangeEnd ? d >= rangeStart && d <= rangeEnd : d.startsWith(ym);
          if (inPeriod) {
            const cat = e.category || "Otros";
            perCat[cat] = Math.round(((perCat[cat] || 0) + Number(e.amount || 0)) * 100) / 100;
          }
        });
        const rows = Object.entries(perCat)
          .filter(([, spent]) => spent > 0)
          .map(([cat, spent]) => {
            const limit = Number(budgets[cat] || 0);
            const forecast = Math.round((spent / Math.max(elapsed, 1)) * totalDays * 100) / 100;
            const pctLimit = limit > 0 ? (forecast / limit) * 100 : null;
            return {
              cat,
              spent,
              forecast,
              limit,
              pctLimit,
              over: pctLimit !== null && pctLimit > 100,
              warn: pctLimit !== null && pctLimit <= 100 && pctLimit >= alertAt,
            };
          })
          .sort((a, b) => b.forecast - a.forecast);
        if (rows.length === 0) return null;
        return (
          <Card
            data-testid="forecast-category-card"
            className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white"
          >
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-lg">Proyección por categoría</h3>
            </div>
            <p className="text-sm text-[#5C626A] mt-1">
              Estimación a fin de {pLabel} por categoría, comparada con tu tope si lo has definido.
            </p>
            <ul className="mt-4 space-y-3">
              {rows.map((r) => (
                <li
                  key={r.cat}
                  data-testid={`forecast-cat-row-${r.cat}`}
                  className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3 sm:p-4"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryBadge category={r.cat} />
                    <div className="flex-1" />
                    <span className="text-xs font-mono text-[#5C626A]">
                      {eur(r.spent)} este {pLabel}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {r.pctLimit !== null ? (
                      <Progress
                        value={Math.min(r.pctLimit, 100)}
                        indicatorClassName={
                          r.over ? "bg-red-500" : r.warn ? "bg-amber-500" : ""
                        }
                        className="h-2 flex-1"
                      />
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div className="text-right shrink-0">
                      <div
                        className={`font-heading font-bold text-lg ${
                          r.over ? "text-red-700" : r.warn ? "text-amber-700" : "text-[#1A1D20]"
                        }`}
                      >
                        {eur(r.forecast)}
                      </div>
                      <div className="text-[11px] font-mono text-[#5C626A]">
                        fin de mes
                        {r.pctLimit !== null ? ` · ${r.pctLimit.toFixed(0)}% tope` : ""}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })()}

      <RecurringForecast reloadKey={allExpenses.length} />

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

      <NotificationSettings
        open={notif.openSettings}
        onClose={() => notif.setOpenSettings(false)}
        prefs={notif.prefs}
        setPrefs={notif.setPrefs}
        perm={notif.perm}
        requestNotif={notif.requestNotif}
      />
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

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3">
      <div className="text-[11px] font-mono uppercase tracking-widest text-[#5C626A]">{label}</div>
      <div className={`font-heading font-bold text-lg mt-1 ${tone || "text-[#1A1D20]"}`}>{value}</div>
    </div>
  );
}
