import { useEffect, useState } from "react";
import { api, eur } from "../lib/api";
import { useProjects } from "../lib/projectsContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import CategoryBadge from "../components/CategoryBadge";
import { Download, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Receipt, BarChart3 } from "lucide-react";
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
  const { activeProject } = useProjects();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return monthKey(d.getFullYear(), d.getMonth());
  });
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [start, end] = [`${selectedMonth}-01`, `${selectedMonth}-31`];
      const params = { start, end };
      if (activeProject) params.project = activeProject;
      const budgetParams = activeProject ? { params: { project: activeProject } } : {};
      const [expResp, budResp] = await Promise.all([
        api.get("/expenses", { params }),
        api.get("/budget", budgetParams),
      ]);
      setExpenses(expResp.data || []);
      setBudget(budResp.data || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedMonth, activeProject]); // eslint-disable-line

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const avgTicket = expenses.length > 0 ? total / expenses.length : 0;
  const budgetTotal = Number(budget?.total || 0);
  const budgetPct = budgetTotal > 0 ? (total / budgetTotal) * 100 : 0;
  const overBudget = budgetTotal > 0 && total > budgetTotal;

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

  const exportMonth = () => {
    const lines = ['"Fecha";"Proveedor";"Categoría";"Proyecto / Obra";"Importe (€)";"Notas"'];
    [...expenses]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .forEach((e) => {
        const row = [
          e.date || "",
          e.vendor || "",
          e.category || "",
          e.project || "",
          Number(e.amount || 0).toFixed(2),
          e.notes || "",
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">
            Informe mensual{activeProject ? ` · ${activeProject}` : ""}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">
            {getMonthName(selectedMonth)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
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
              label="Presupuesto"
              value={budgetTotal > 0 ? `${eur(total)} / ${eur(budgetTotal)}` : "Sin definir"}
              accent={overBudget ? "text-red-700" : "text-emerald-700"}
            />
          </div>

          {budgetTotal > 0 && (
            <Card className="p-5 rounded-2xl border-[#E2DDD3] bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-[#5C626A]">Consumo del presupuesto</span>
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
                {categoryRows.map((r, i) => (
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
