import { eur, COLOR_MAP } from "../lib/api";
import { Card } from "./ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";

// Gráficas del Panel (extraídas de pages/Dashboard.jsx).
export default function DashboardCharts({ stats, categories, allExpenses }) {
  const colorOf = (cat) => {
    const meta = categories.find((x) => x.name === cat);
    return (COLOR_MAP[meta?.color || "stone"] || COLOR_MAP.stone).dot;
  };

  // --- Evolución por categoría + comparativa (calculado en cliente) ---
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

  const catTotals = {};
  months.forEach((m) => {
    Object.entries(byMonthCat[m]).forEach(([c, v]) => {
      catTotals[c] = (catTotals[c] || 0) + v;
    });
  });
  const cats = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
  const advData = months.map((m) => {
    const row = { month: m };
    cats.forEach((c) => {
      row[c] = Math.round((byMonthCat[m][c] || 0) * 100) / 100;
    });
    return row;
  });

  const comparison = allMonths.map((m, i) => {
    const total = Object.values(byMonthCat[m]).reduce((s, v) => s + v, 0);
    const prev =
      i > 0 ? Object.values(byMonthCat[allMonths[i - 1]]).reduce((s, v) => s + v, 0) : null;
    return {
      month: m,
      total: Math.round(total * 100) / 100,
      delta: prev !== null ? Math.round((total - prev) * 100) / 100 : null,
      pct: prev ? ((total - prev) / prev) * 100 : null,
    };
  });
  const recentComparison = comparison.slice(-6).reverse();

  return (
    <>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-lg">Gasto por categoría</h3>
            <span className="text-xs font-mono text-[#5C626A]">EUR</span>
          </div>
          <div className="h-64 w-full min-w-0" data-testid="chart-categories">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_category} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE9DF" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#5C626A" }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "#5C626A" }} />
                <Tooltip formatter={(v) => eur(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2DDD3" }} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {stats.by_category.map((c, i) => (
                    <Cell key={i} fill={colorOf(c.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
          <h3 className="font-heading font-bold text-lg mb-4">Evolución mensual</h3>
          <div className="h-64 w-full min-w-0" data-testid="chart-monthly">
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
      {months.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
            <h3 className="font-heading font-bold text-lg mb-4">Evolución por categoría</h3>
            <div className="h-72 w-full min-w-0" data-testid="chart-stacked">
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
      )}
    </>
  );
}
