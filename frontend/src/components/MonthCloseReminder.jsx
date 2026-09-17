import { useEffect, useRef, useState } from "react";
import { useProjects } from "../lib/projectsContext";
import { isMonthClosed, isDismissed, dismissMonth, toggleMonth } from "../lib/closedMonths";
import { sendMobile } from "../lib/mobileNotify";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Lock, X } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

function monthName(ym) {
  const [y, m] = ym.split("-").map(Number);
  const names = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${names[m - 1]} ${y}`;
}

export default function MonthCloseReminder() {
  const { activeProject } = useProjects();
  const firedRef = useRef(new Set());
  const [, force] = useState(0);

  const today = new Date();
  const ym = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevYm = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;

  let target = null;
  if (today.getDate() >= lastDay - 1) target = ym;
  else if (today.getDate() <= 5) target = prevYm;

  const visible =
    target && !isMonthClosed(activeProject, target) && !isDismissed(activeProject, target);

  useEffect(() => {
    if (!visible) return;
    const tag = `close_month_${activeProject || "general"}_${target}`;
    if (firedRef.current.has(tag)) return;
    firedRef.current.add(tag);
    const body = `El mes de ${monthName(target)}${activeProject ? ` (${activeProject})` : ""} no está cerrado.`;
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Cierre de mes pendiente", { body, tag, icon: "/favicon.svg" });
      }
    } catch {
      /* ignore */
    }
    sendMobile("month_close", "Cierre de mes pendiente", body).catch(() => {});
  }, [visible, activeProject, target]);

  if (!visible) return null;

  const close = () => {
    toggleMonth(activeProject, target);
    toast.success(`Mes de ${monthName(target)} cerrado`);
    force((n) => n + 1);
  };

  const later = () => {
    dismissMonth(activeProject, target);
    force((n) => n + 1);
  };

  return (
    <div
      data-testid="month-close-reminder"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3"
    >
      <Lock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-amber-900">Cierre de mes pendiente</p>
        <p className="text-sm text-amber-800 mt-0.5">
          El mes de {monthName(target)}
          {activeProject ? ` (proyecto «${activeProject}»)` : ""} no está cerrado. Ciérralo para
          bloquear cambios una vez revisado.
        </p>
        <div className="flex gap-2 mt-3">
          <Button
            data-testid="btn-close-month-reminder"
            size="sm"
            onClick={close}
            className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
          >
            <Lock className="w-4 h-4 mr-1" /> Cerrar mes
          </Button>
          <Button
            data-testid="btn-dismiss-month-reminder"
            size="sm"
            variant="outline"
            onClick={later}
            className="rounded-xl border-amber-300 text-amber-900"
          >
            Ahora no
          </Button>
        </div>
      </div>
      <button
        onClick={later}
        className="text-amber-700 hover:text-amber-900 shrink-0"
        title="Descartar"
        aria-label="Descartar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
