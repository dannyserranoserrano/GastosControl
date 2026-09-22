import { eur } from "../lib/api";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Wallet, TrendingUp, Sparkles, Receipt } from "lucide-react";

// Bloque de KPIs + "Estado actual" del Panel (extraído de pages/Dashboard.jsx).
export default function DashboardKpis({ stats, overBudget, progress, progressPct, activeProject }) {
  return (
    <>
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
            <div className="text-xs mt-1 text-[#5C626A]">{eur(stats.total_spent)} en total</div>
          }
        />
        <KpiCard
          testid="kpi-remaining"
          icon={<Sparkles className="w-5 h-5" />}
          label={overBudget ? "Excedido" : "Disponible"}
          value={eur(Math.abs(stats.remaining))}
          tint={
            overBudget
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }
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
    </>
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
