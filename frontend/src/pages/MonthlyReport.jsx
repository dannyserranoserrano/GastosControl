import { useEffect, useState } from "react";
import { api, eur } from "../lib/api";
import { csvSafe } from "../lib/csv";
import { useProjects } from "../lib/projectsContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import CategoryBadge from "../components/CategoryBadge";
import { Download, ChevronLeft, ChevronRight, TrendingUp, Receipt, BarChart3, Printer, Lock, Unlock } from "lucide-react";
import { loadClosed, toggleMonth } from "../lib/closedMonths";
import { normalizePeriod } from "../lib/period";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function monthKey(y, m) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function getMonthName(ym) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function prevMonth(ym) {
  let [y, m] = ym.split("-").map(Number);
  m -= 1;
  if (m === 0) { m = 12; y -= 1; }
  return monthKey(y, m - 1);
}

function nextMonth(ym) {
  let [y, m] = ym.split("-").map(Number);
  m += 1;
  if (m === 13) { m = 1; y += 1; }
  return monthKey(y, m - 1);
}

const COLORS = ["#D95D39", "#1E293B", "#F59E0B", "#10B981", "#6366F1", "#EC4899", "#8B5CF6", "#14B8A6"];

export default function MonthlyReport() {
  const { activeProject, projects } = useProjects();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return monthKey(d.getFullYear(), d.getMonth());
  });
  const [expenses, setExpenses] = useState([]);
  const [yearExpenses, setYearExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [projectBudgets, setProjectBudgets] = useState({});
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(() => loadClosed(activeProject));

  useEffect(() => {
    setClosed(loadClosed(activeProject));
  }, [activeProject]);

  const monthClosed = closed.includes(selectedMonth);

  const onToggleClose = () => {
    const next = toggleMonth(activeProject, selectedMonth);
    setClosed(next);
    const nowClosed = next.includes(selectedMonth);
    toast.success(nowClosed ? "Mes cerrado: no se podrá modificar" : "Mes reabierto");
  };

  const load = async () => {
    setLoading(true);
    try {
      const year = selectedMonth.slice(0, 4);
      const params = { start: `${year}-01-01`, end: `${selectedMonth}-31` };
      if (activeProject) params.project = activeProject;
      const budgetParams = activeProject ? { params: { project: activeProject } } : {};
      const [expResp, budResp] = await Promise.all([
        api.get("/expenses", { params }),
        api.get("/budget", budgetParams),
      ]);
      const all = expResp.data || [];
      setYearExpenses(all);
      setExpenses(all.filter((e) => String(e.date || "").startsWith(selectedMonth)));
      setBudget(budResp.data || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedMonth, activeProject]); // eslint-disable-line

  useEffect(() => {
    let alive = true;
    if (activeProject || projects.length === 0) {
      setProjectBudgets({});
      return () => { alive = false; };
    }
    (async () => {
      const entries = await Promise.all(
        projects.map(async (p) => {
          try {
            const { data } = await api.get("/budget", { params: { project: p } });
            return [p, { total: Number(data.total || 0), period: normalizePeriod(data.period) }];
          } catch {
            return [p, { total: 0, period: "monthly" }];
          }
        })
      );
      if (alive) setProjectBudgets(Object.fromEntries(entries));
    })();
    return () => { alive = false; };
  }, [activeProject, projects]);

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const yearTotal = yearExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const avgTicket = expenses.length > 0 ? total / expenses.length : 0;
  const budgetPeriod = normalizePeriod(budget?.period);
  const isYearlyBudget = budgetPeriod === "yearly";
  const budgetSpent = isYearlyBudget ? yearTotal : total;
  const budgetTotal = Number(budget?.total || 0);
  const budgetPct = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;
  const overBudget = budgetTotal > 0 && budgetSpent > budgetTotal;

  const byCategory = {};
  expenses.forEach((e) => {
    const cat = e.category || "Otros";
    byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount || 0);
  });
  const categoryRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({ cat, amount: Math.round(amount * 100) / 100, pct: total > 0 ? (amount / total) * 100 : 0 }));

  const byVendor = {};
  expenses.forEach((e) => {
    const v = e.vendor || "Sin proveedor";
    byVendor[v] = (byVendor[v] || 0) + Number(e.amount || 0);
  });
  const topVendors = Object.entries(byVendor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([vendor, amount]) => ({ vendor, amount: Math.round(amount * 100) / 100 }));

  const byProject = {};
  expenses.forEach((e) => {
    const p = e.project || "Sin proyecto";
    byProject[p] = (byProject[p] || 0) + Number(e.amount || 0);
  });
  const projectRows = Object.entries(byProject)
    .sort((a, b) => b[1] - a[1])
    .map(([project, amount]) => ({ project, amount: Math.round(amount * 100) / 100 }));

  const deviationPeriodLabel = isYearlyBudget
    ? `enero–${getMonthName(selectedMonth)} (acumulado del año)`
    : getMonthName(selectedMonth);

  const catBudgetsRaw = budget?.category_budgets || {};
  const alertThreshold = Number(budget?.alert_at || 80) || 80;

  const deviationSource = isYearlyBudget ? yearExpenses : expenses;
  const byCategoryDev = {};
  deviationSource.forEach((e) => {
    const cat = e.category || "Otros";
    byCategoryDev[cat] = (byCategoryDev[cat] || 0) + Number(e.amount || 0);
  });
  const deviationCatRows = Object.entries(byCategoryDev)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({ cat, amount: Math.round(amount * 100) / 100 }));

  const deviationRows = deviationCatRows
    .map((r) => {
      const limit = Number(catBudgetsRaw[r.cat] || 0);
      return {
        cat: r.cat,
        spent: r.amount,
        limit,
        dev: Math.round((r.amount - limit) * 100) / 100,
        pct: limit > 0 ? (r.amount / limit) * 100 : null,
      };
    })
    .filter((r) => r.limit > 0 || r.spent > 0);
  const devTotLimit = deviationRows.reduce((s, r) => s + r.limit, 0);
  const devTotSpent = deviationRows.reduce((s, r) => s + r.spent, 0);
  const devTotDev = Math.round((devTotSpent - devTotLimit) * 100) / 100;
  const devTotOver = devTotLimit > 0 && devTotSpent > devTotLimit;

  const byProjectYtd = {};
  yearExpenses.forEach((e) => {
    const p = e.project || "Sin proyecto";
    byProjectYtd[p] = (byProjectYtd[p] || 0) + Number(e.amount || 0);
  });

  const projectDevRows = projectRows.map((r) => {
    const isGeneral = r.project === "Sin proyecto";
    const meta = projectBudgets[r.project];
    const limit = isGeneral ? budgetTotal : Number(meta?.total || 0);
    const rowPeriod = isGeneral ? budgetPeriod : normalizePeriod(meta?.period);
    const yearly = rowPeriod === "yearly";
    const spent = yearly
      ? Math.round((byProjectYtd[r.project] || 0) * 100) / 100
      : r.amount;
    return {
      project: r.project,
      spent,
      budget: limit,
      dev: Math.round((spent - limit) * 100) / 100,
      over: limit > 0 && spent > limit,
      noBudget: limit <= 0,
      yearly,
    };
  });

  const exportMonth = () => {
    const lines = ['"Fecha";"Proveedor";"Categoría";"Proyecto / Obra";"Importe (€)";"Notas"'];
    [...expenses]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .forEach((e) => {
        const row = [
          csvSafe(e.date || ""),
          csvSafe(e.vendor || ""),
          csvSafe(e.category || ""),
          csvSafe(e.project || ""),
          Number(e.amount || 0).toFixed(2),
          csvSafe(e.notes || ""),
        ];
        lines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
      });
    const content = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gastos-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const chartData = categoryRows.map((r) => ({ name: r.cat, total: r.amount }));

  const exportPdf = () => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    if (wasDark) root.classList.remove("dark");
    document.body.classList.add("printing-report");
    const restore = () => {
      if (wasDark) root.classList.add("dark");
      document.body.classList.remove("printing-report");
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
    setTimeout(restore, 5000);
  };

  return (
    <div id="print-area" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">
            Informe mensual{activeProject ? ` · ${activeProject}` : ""}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">
            {getMonthName(selectedMonth)}
          </h1>
          {monthClosed && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-[#D95D39]">
              <Lock className="w-3.5 h-3.5" /> Mes cerrado (no editable)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 no-print overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 [&>*]:shrink-0">
          <Button variant="outline" size="sm" className="rounded-xl border-[#E2DDD3]" onClick={() => setSelectedMonth(prevMonth(selectedMonth))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger data-testid="select-month" className="w-[180px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(() => {
                const now = new Date();
                const opts = [];
                for (let i = 0; i < 24; i++) {
                  let y = now.getFullYear();
                  let m = now.getMonth() - i;
                  while (m < 0) { m += 12; y -= 1; }
                  const key = monthKey(y, m);
                  opts.push(<SelectItem key={key} value={key}>{getMonthName(key)}</SelectItem>);
                }
                return opts;
              })()}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="rounded-xl border-[#E2DDD3]" onClick={() => setSelectedMonth(nextMonth(selectedMonth))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button data-testid="btn-export-report" variant="outline" className="rounded-xl border-[#E2DDD3]" onClick={exportMonth}>
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
          <Button
            data-testid="btn-export-pdf"
            variant="outline"
            className="rounded-xl border-[#E2DDD3]"
            onClick={exportPdf}
          >
            <Printer className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button
            data-testid="btn-toggle-month-lock"
            variant="outline"
            className={`rounded-xl border-[#E2DDD3] ${monthClosed ? "text-[#D95D39]" : ""}`}
            onClick={onToggleClose}
            title={monthClosed ? "Reabrir mes" : "Cerrar mes (bloquear cambios)"}
          >
            {monthClosed ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            {monthClosed ? "Reabrir mes" : "Cerrar mes"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#5C626A]">Cargando informe…</div>
      ) : expenses.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-[#5C626A]">No hay gastos en este mes.</p>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total gastado" value={eur(total)} accent={overBudget ? "text-red-700" : "text-[#1A1D20]"} />
            <KpiCard label="Nº tickets" value={expenses.length} />
            <KpiCard label="Ticket medio" value={eur(avgTicket)} />
            <KpiCard
              label={isYearlyBudget ? "Presupuesto anual" : "Presupuesto"}
              value={budgetTotal > 0 ? `${eur(budgetSpent)} / ${eur(budgetTotal)}` : "Sin definir"}
              accent={overBudget ? "text-red-700" : "text-emerald-700"}
            />
          </div>

          {budgetTotal > 0 && (
            <Card className="p-5 rounded-2xl border-[#E2DDD3] bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-[#5C626A]">
                  Consumo del presupuesto{isYearlyBudget ? " (acumulado del año)" : ""}
                </span>
                <span className={`font-heading font-bold text-lg ${overBudget ? "text-red-700" : "text-[#1A1D20]"}`}>
                  {budgetPct.toFixed(1)}%
                </span>
              </div>
              <Progress value={Math.min(budgetPct, 100)} indicatorClassName={overBudget ? "bg-red-500" : budgetPct > 80 ? "bg-amber-500" : ""} className="h-3" />
            </Card>
          )}

          {/* Category breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 rounded-2xl border-[#E2DDD3] bg-white">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[#D95D39]" /> Por categoría
              </h3>
              <div className="space-y-3">
                {categoryRows.map((r) => (
                  <div key={r.cat}>
                    <div className="flex items-center justify-between mb-1">
                      <CategoryBadge category={r.cat} />
                      <span className="text-sm font-mono">{eur(r.amount)} ({r.pct.toFixed(1)}%)</span>
                    </div>
                    <Progress value={r.pct} indicatorClassName="bg-[#D95D39]" className="h-2" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-[#E2DDD3] bg-white">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[#1E293B]" /> Distribución
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(v) => eur(v)} />
                  <Bar dataKey="total">
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top vendors + projects */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 rounded-2xl border-[#E2DDD3] bg-white">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-[#D95D39]" /> Top proveedores
              </h3>
              <ul className="space-y-2">
                {topVendors.map((r, i) => (
                  <li key={r.vendor} className="flex items-center gap-3 p-2 rounded-lg bg-[#FAF8F5]">
                    <span className="w-6 h-6 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">{r.vendor}</span>
                    <span className="font-heading font-bold text-sm">{eur(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 rounded-2xl border-[#E2DDD3] bg-white">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#10B981]" /> Por proyecto
              </h3>
              {projectRows.length === 0 ? (
                <p className="text-sm text-[#5C626A]">Sin proyectos en este mes.</p>
              ) : (
                <ul className="space-y-2">
                  {projectRows.map((r) => (
                    <li key={r.project} className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5]">
                      <span className="text-sm font-medium truncate">{r.project}</span>
                      <span className="font-heading font-bold text-sm">{eur(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Desviación presupuesto vs real */}
          <Card data-testid="deviations-card" className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
            <h3 className="font-heading font-bold text-lg">Desviación presupuesto vs real</h3>
            <p className="text-sm text-[#5C626A] mt-1">
              Comparativa de {deviationPeriodLabel}
              {activeProject ? ` para «${activeProject}»` : ""}.
            </p>

            {deviationRows.length === 0 ? (
              <p className="text-sm text-[#5C626A] mt-3">
                Define topes por categoría o registra gastos para ver la comparativa.
              </p>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-[#5C626A] text-[11px] font-mono uppercase tracking-widest">
                      <th className="pb-2">Categoría</th>
                      <th className="pb-2 text-right">Presupuesto</th>
                      <th className="pb-2 text-right">Real</th>
                      <th className="pb-2 text-right">Desviación</th>
                      <th className="pb-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviationRows.map((r) => {
                      const over = r.limit > 0 && r.spent > r.limit;
                      const warn = r.limit > 0 && !over && r.spent >= (r.limit * alertThreshold) / 100;
                      return (
                        <tr key={r.cat} className="border-t border-[#E2DDD3]">
                          <td className="py-2"><CategoryBadge category={r.cat} /></td>
                          <td className="py-2 text-right font-mono">{r.limit > 0 ? eur(r.limit) : "—"}</td>
                          <td className="py-2 text-right font-mono">{eur(r.spent)}</td>
                          <td className={`py-2 text-right font-mono font-semibold ${over ? "text-red-700" : r.limit > 0 && r.spent < r.limit ? "text-emerald-700" : ""}`}>
                            {r.limit > 0 ? (r.dev > 0 ? `+${eur(r.dev)}` : eur(r.dev)) : "—"}
                          </td>
                          <td className={`py-2 text-right font-mono ${over ? "text-red-700" : warn ? "text-amber-700" : "text-[#5C626A]"}`}>
                            {r.pct !== null ? `${r.pct.toFixed(0)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#E2DDD3] font-heading font-bold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right font-mono">{eur(devTotLimit)}</td>
                      <td className="py-2 text-right font-mono">{eur(devTotSpent)}</td>
                      <td className={`py-2 text-right font-mono ${devTotOver ? "text-red-700" : "text-emerald-700"}`}>
                        {devTotDev > 0 ? `+${eur(devTotDev)}` : eur(devTotDev)}
                      </td>
                      <td className="py-2 text-right font-mono text-[#5C626A]">
                        {devTotLimit > 0 ? `${((devTotSpent / devTotLimit) * 100).toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {!activeProject && projectDevRows.length > 0 && (
              <div className="mt-6">
                <h4 className="font-heading font-bold">Por proyecto</h4>
                <p className="text-xs text-[#5C626A] mt-1">
                  Presupuesto y gasto de {deviationPeriodLabel} por proyecto. Los proyectos con
                  presupuesto anual muestran el acumulado del año.
                </p>
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-left text-[#5C626A] text-[11px] font-mono uppercase tracking-widest">
                        <th className="pb-2">Proyecto</th>
                        <th className="pb-2 text-right">Presupuesto</th>
                        <th className="pb-2 text-right">Real</th>
                        <th className="pb-2 text-right">Desviación</th>
                        <th className="pb-2 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectDevRows.map((r) => (
                        <tr key={r.project} className="border-t border-[#E2DDD3]">
                          <td className="py-2 font-medium text-[#1A1D20] max-w-[200px]">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate">{r.project}</span>
                              {r.yearly && (
                                <span className="shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1E293B]/10 text-[#1E293B]">
                                  anual
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono">{r.noBudget ? "—" : eur(r.budget)}</td>
                          <td className="py-2 text-right font-mono">{eur(r.spent)}</td>
                          <td className={`py-2 text-right font-mono font-semibold ${r.over ? "text-red-700" : r.noBudget ? "text-[#5C626A]" : "text-emerald-700"}`}>
                            {r.noBudget ? "—" : r.dev > 0 ? `+${eur(r.dev)}` : eur(r.dev)}
                          </td>
                          <td className={`py-2 text-right text-xs ${r.over ? "text-red-700" : r.noBudget ? "text-[#5C626A]" : "text-emerald-700"}`}>
                            {r.noBudget ? "Sin presupuesto" : r.over ? "Excedido" : "Dentro"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent }) {
  return (
    <Card className="p-4 rounded-2xl border-[#E2DDD3] bg-white">
      <p className="text-xs font-mono text-[#5C626A]">{label}</p>
      <p className={`font-heading font-bold text-xl mt-1 ${accent || "text-[#1A1D20]"}`}>{value}</p>
    </Card>
  );
}
