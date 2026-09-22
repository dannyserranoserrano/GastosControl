import { useEffect, useRef } from "react";
import { api } from "./api";
import { toast } from "sonner";
import { loadTemplates, saveTemplates, pendingFor, isDueMonth } from "./recurring";

import { pad } from "@/lib/dates";

/**
 * Genera el recurrente para el mes actual si le toca y no se ha generado ya.
 * Devuelve "created" | "exists" | "not-due".
 */
export async function generateRecurringNow(template) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  if (!isDueMonth(template, ym)) return "not-due";
  const generated = new Set(template.generated || []);
  if (generated.has(ym)) return "exists";

  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const day = Math.min(Math.max(1, Number(template.day) || 1), dim);

  await api.post("/expenses", {
    vendor: template.vendor || "",
    amount: Number(template.amount || 0),
    category: template.category || "Otros",
    project: template.project || "",
    notes: template.notes || "",
    date: `${ym}-${pad(day)}`,
  });

  const tpls = loadTemplates();
  saveTemplates(
    tpls.map((t) =>
      t.id === template.id
        ? { ...t, generated: [...new Set([...(t.generated || []), ym])] }
        : t
    )
  );
  return "created";
}

/**
 * Genera los gastos recurrentes pendientes al montar. Se ejecuta una sola vez por montaje
 * y marca cada periodo generado para no duplicar.
 */
export function useRecurring(onGenerated) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const templates = loadTemplates();
    if (templates.length === 0) return;

    const created = pendingFor(templates);
    if (created.length === 0) return;

    (async () => {
      const byTemplate = new Map();
      let ok = 0;
      for (const c of created) {
        try {
          await api.post("/expenses", c.data);
          ok++;
          if (!byTemplate.has(c.templateId)) byTemplate.set(c.templateId, []);
          byTemplate.get(c.templateId).push(c.ym);
        } catch {
          /* se reintentará en el próximo arranque */
        }
      }
      if (ok > 0) {
        const next = templates.map((t) =>
          byTemplate.has(t.id)
            ? {
                ...t,
                generated: [...new Set([...(t.generated || []), ...byTemplate.get(t.id)])],
              }
            : t
        );
        saveTemplates(next);
        toast.success(`${ok} gasto(s) recurrente(s) generado(s)`);
        onGenerated?.();
      }
    })();
  }, [onGenerated]);
}
