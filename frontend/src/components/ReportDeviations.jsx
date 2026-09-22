import { eur } from "../lib/api";
import { Card } from "./ui/card";
import CategoryBadge from "./CategoryBadge";

// Tarjeta "Desviación presupuesto vs real" del Informe mensual
// (extraída de pages/MonthlyReport.jsx).
export default function ReportDeviations({
  deviationRows,
  devTotLimit,
  devTotSpent,
  devTotDev,
  devTotOver,
  alertThreshold,
  projectDevRows,
  activeProject,
  deviationPeriodLabel,
}) {
  return (
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
            Presupuesto y gasto de {deviationPeriodLabel} por proyecto. Los proyectos con presupuesto
            anual muestran el acumulado del año.
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
  );
}
