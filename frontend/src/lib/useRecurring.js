import { useEffect, useRef } from "react";
import { api } from "./api";
import { toast } from "sonner";
import { loadTemplates, saveTemplates, pendingFor } from "./recurring";

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
