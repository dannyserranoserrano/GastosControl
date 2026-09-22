import { useEffect, useState } from "react";
import { eur } from "../lib/api";
import { useProjects } from "../lib/projectsContext";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { loadTemplates, isDueMonth, freqLabel } from "../lib/recurring";
import { Repeat, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

import { pad } from "@/lib/dates";

export default function RecurringForecast({ reloadKey }) {
  const { activeProject } = useProjects();
  const [templates, setTemplates] = useState(() => loadTemplates());

  useEffect(() => {
    setTemplates(loadTemplates());
  }, [activeProject, reloadKey]);

  const today = new Date();
  const ym = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const scoped = templates.filter(
    (t) => t.active && isDueMonth(t, ym) && (!activeProject || (t.project || "") === activeProject)
  );
  if (scoped.length === 0) return null;

  const rows = scoped
    .map((t) => {
      const day = Math.min(Math.max(1, Number(t.day) || 1), dim);
      const generated = (t.generated || []).includes(ym);
      const overdue = !generated && today.getDate() > day;
      return { ...t, day, generated, overdue, date: `${ym}-${pad(day)}` };
    })
    .sort((a, b) => a.day - b.day);

  const totalExpected = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const paid = rows.filter((r) => r.generated).reduce((s, r) => s + Number(r.amount || 0), 0);
  const pending = Math.round((totalExpected - paid) * 100) / 100;
  const pct = totalExpected > 0 ? (paid / totalExpected) * 100 : 0;

  return (
    <Card data-testid="recurring-forecast" className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
      <h3 className="font-heading font-bold text-lg flex items-center gap-2">
        <Repeat className="w-4 h-4 text-[#D95D39]" /> Previsión de recurrentes del mes
      </h3>
      <p className="text-sm text-[#5C626A] mt-1">
        {activeProject ? `Recurrentes del proyecto «${activeProject}».` : "Todos los recurrentes activos."}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Total del mes" value={eur(totalExpected)} />
        <Stat label="Registrado" value={eur(paid)} tone="text-emerald-700" />
        <Stat label="Pendiente" value={eur(pending)} tone={pending > 0 ? "text-amber-700" : "text-[#5C626A]"} />
      </div>

      <Progress
        value={Math.min(pct, 100)}
        indicatorClassName={pct >= 100 ? "bg-emerald-500" : ""}
        className="h-2 mt-3"
      />

      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            data-testid={`recurring-forecast-${r.id}`}
            className="flex items-center gap-3 rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-2.5"
          >
            <span className="w-9 h-9 rounded-lg bg-white border border-[#E2DDD3] flex items-center justify-center text-xs font-mono text-[#5C626A] shrink-0">
              {r.day}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#1A1D20] truncate">{r.vendor}</p>
              <p className="text-xs text-[#5C626A] font-mono">
                {freqLabel(r.freq)} · {r.date}
                {r.project ? ` · ${r.project}` : ""}
              </p>
            </div>
            <span className="font-heading font-bold text-sm text-[#1A1D20]">{eur(r.amount)}</span>
            {r.generated ? (
              <span className="text-xs text-emerald-700 inline-flex items-center gap-1 w-[88px] justify-end">
                <CheckCircle2 className="w-3.5 h-3.5" /> Registrado
              </span>
            ) : r.overdue ? (
              <span className="text-xs text-red-700 inline-flex items-center gap-1 w-[88px] justify-end">
                <AlertTriangle className="w-3.5 h-3.5" /> Vencido
              </span>
            ) : (
              <span className="text-xs text-amber-700 inline-flex items-center gap-1 w-[88px] justify-end">
                <Clock className="w-3.5 h-3.5" /> Pendiente
              </span>
            )}
          </li>
        ))}
      </ul>
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
