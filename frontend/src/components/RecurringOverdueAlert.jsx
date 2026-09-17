import { useEffect, useRef, useState } from "react";
import { eur } from "../lib/api";
import { useProjects } from "../lib/projectsContext";
import { loadTemplates } from "../lib/recurring";
import { generateRecurringNow } from "../lib/useRecurring";
import { sendMobile } from "../lib/mobileNotify";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { AlertTriangle, Zap } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

export default function RecurringOverdueAlert({ onGenerated }) {
  const { activeProject } = useProjects();
  const [templates, setTemplates] = useState(() => loadTemplates());
  const [busy, setBusy] = useState(false);
  const firedRef = useRef(new Set());

  useEffect(() => {
    setTemplates(loadTemplates());
  }, [activeProject]);

  const today = new Date();
  const ym = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const overdue = templates.filter((t) => {
    if (!t.active) return false;
    if (activeProject && (t.project || "") !== activeProject) return false;
    const day = Math.min(Math.max(1, Number(t.day) || 1), dim);
    const generated = (t.generated || []).includes(ym);
    return !generated && today.getDate() > day;
  });

  useEffect(() => {
    if (overdue.length === 0) return;
    const tag = `overdue_${activeProject || "general"}_${ym}`;
    if (firedRef.current.has(tag)) return;
    firedRef.current.add(tag);
    const body = `Tienes ${overdue.length} gasto(s) recurrente(s) pendiente(s) este mes.`;
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Recurrentes vencidos", { body, tag, icon: "/favicon.svg" });
      }
    } catch {
      /* ignore */
    }
    sendMobile("recurring_overdue", "Recurrentes vencidos", body).catch(() => {});
  }, [overdue.length, activeProject, ym]);

  if (overdue.length === 0) return null;

  const generate = async (t) => {
    setBusy(true);
    try {
      const ok = await generateRecurringNow(t);
      if (ok) toast.success(`Generado: ${t.vendor}`);
      setTemplates(loadTemplates());
      onGenerated?.();
    } catch {
      toast.error("No se pudo generar el gasto");
    } finally {
      setBusy(false);
    }
  };

  const generateAll = async () => {
    setBusy(true);
    let ok = 0;
    for (const t of overdue) {
      try {
        if (await generateRecurringNow(t)) ok++;
      } catch {
        /* sigue con el resto */
      }
    }
    setTemplates(loadTemplates());
    onGenerated?.();
    setBusy(false);
    if (ok > 0) toast.success(`${ok} recurrente(s) generado(s)`);
  };

  return (
    <div data-testid="recurring-overdue-alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-800">
            {overdue.length} gasto(s) recurrente(s) vencido(s) este mes
          </p>
          <p className="text-sm text-red-800/80 mt-0.5">
            Pasó su día y aún no se han registrado. Puedes generarlos ahora.
          </p>
          <ul className="mt-3 space-y-1.5">
            {overdue.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                <span className="flex-1 min-w-0 truncate text-sm text-red-900">
                  {t.vendor} <span className="font-mono text-xs">· día {t.day}</span>
                </span>
                <span className="font-mono text-sm text-red-900">{eur(t.amount)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid={`btn-generate-overdue-${t.id}`}
                  className="rounded-lg border-red-300 text-red-800 hover:bg-red-100 shrink-0"
                  onClick={() => generate(t)}
                  disabled={busy}
                >
                  <Zap className="w-3.5 h-3.5 mr-1" /> Generar
                </Button>
              </li>
            ))}
          </ul>
          {overdue.length > 1 && (
            <Button
              size="sm"
              data-testid="btn-generate-all-overdue"
              className="mt-3 bg-red-600 hover:bg-red-700 text-white rounded-xl"
              onClick={generateAll}
              disabled={busy}
            >
              <Zap className="w-3.5 h-3.5 mr-1" /> Generar todos
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
