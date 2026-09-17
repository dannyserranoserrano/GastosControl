import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { sendMobile } from "./mobileNotify";

const NOTIF_KEY = "gastocontrol:notif_prefs";

const DEFAULT_PREFS = {
  budget_over: true,
  budget_warn: true,
  projection_over: true,
  projection_warn: true,
  daily_reminder: false,
  reminder_hour: 18,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
}

function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window && window.isSecureContext;
}

function currentPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return Notification.permission;
}

function requestPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve("unsupported");
  }
  if (!window.isSecureContext) return Promise.resolve("insecure");
  if (Notification.permission === "default") {
    return Notification.requestPermission().catch(() => "denied");
  }
  return Promise.resolve(Notification.permission);
}

function sendBrowserNotif(title, body, tag) {
  if (notificationsSupported() && Notification.permission === "granted") {
    try {
      return new Notification(title, { body, tag, icon: "/favicon.svg" });
    } catch {
      return null;
    }
  }
  return null;
}

/** Preferencias de notificación y permiso del navegador (compartido por la UI y el motor de avisos). */
export function useNotificationPrefs() {
  const [prefs, setPrefsState] = useState(loadPrefs);
  const [perm, setPerm] = useState(currentPermission);

  const setPrefs = useCallback((p) => {
    setPrefsState(p);
    savePrefs(p);
  }, []);

  const requestNotif = useCallback(async () => {
    const p = await requestPermission();
    setPerm(p);
    if (p === "denied") {
      toast.error("El navegador bloqueó las notificaciones", {
        description:
          "Ábrelas manualmente: candado en la barra de direcciones → Notificaciones → Permitir, y recarga la página.",
      });
    } else if (p === "insecure") {
      toast.error("Notificaciones no disponibles", {
        description: "El navegador solo permite notificaciones en conexiones seguras (HTTPS o localhost).",
      });
    } else if (p === "unsupported") {
      toast.error("Este navegador no soporta notificaciones");
    } else if (p === "granted") {
      toast.success("Notificaciones activadas");
    }
    return p;
  }, []);

  return { prefs, setPrefs, perm, requestNotif };
}

/** Motor de avisos: lanza notificaciones/avisos según el estado del presupuesto. */
export function useNotifications(stats) {
  const { prefs } = useNotificationPrefs();
  const firedRef = useRef(new Set());

  useEffect(() => {
    if (!stats) return;

    const alertAt = stats.alert_at > 0 ? stats.alert_at : 80;
    const periodSpent = stats.period_spent ?? stats.total_spent;
    const periodLabel = stats.period_label || "mes";
    const elapsed = stats.period_elapsed_days || new Date().getDate();
    const totalDays = stats.period_days || 30;
    const overBudget = Number(stats.remaining) < 0 && Number(stats.budget) > 0;
    const cb = stats.category_budgets || {};
    const spentMap = {};
    (stats.period_by_category || stats.by_category || []).forEach((c) => {
      spentMap[c.category] = c.total;
    });

    const fireNotif = (title, body, tag, eventKey) => {
      if (firedRef.current.has(tag)) return;
      firedRef.current.add(tag);
      const sent = sendBrowserNotif(title, body, tag);
      if (!sent) {
        toast.warning(title, { description: body, id: tag });
      }
      if (eventKey) sendMobile(eventKey, title, body).catch(() => {});
    };

    if (overBudget && prefs.budget_over) {
      fireNotif("Presupuesto excedido", `Has gastado ${periodSpent}€ de ${stats.budget}€ este ${periodLabel}`, "budget_over", "budget_over");
    } else if (stats.progress >= alertAt && prefs.budget_warn) {
      fireNotif("Aviso de presupuesto", `Has alcanzado el ${stats.progress.toFixed(1)}% de tu presupuesto (${periodLabel})`, "budget_warn", "budget_warn");
    }

    const issues = Object.entries(cb)
      .filter(([, lim]) => Number(lim) > 0)
      .map(([cat, lim]) => {
        const limit = Number(lim);
        const spent = spentMap[cat] || 0;
        return { cat, limit, spent, over: spent > limit, warn: spent <= limit && spent >= (limit * alertAt) / 100 };
      });

    for (const issue of issues) {
      if (issue.over && prefs.budget_over) {
        fireNotif(`Presupuesto excedido: ${issue.cat}`, `${issue.spent}€ de ${issue.limit}€ este ${periodLabel}`, `cat_over_${issue.cat}`, "budget_over");
      } else if (issue.warn && prefs.budget_warn) {
        fireNotif(`Aviso: ${issue.cat}`, `Cerca del límite (${issue.spent}€ de ${issue.limit}€)`, `cat_warn_${issue.cat}`, "budget_warn");
      }
    }

    if (elapsed > 1) {
      const dailyAvg = periodSpent / elapsed;
      const forecast = Math.round(dailyAvg * totalDays * 100) / 100;
      const budgetTotal = Number(stats.budget || 0);
      if (budgetTotal > 0 && forecast > budgetTotal && prefs.projection_over) {
        fireNotif("Proyección alarmante", `Ritmo actual: ${forecast}€ estimado para el ${periodLabel} (tope: ${budgetTotal}€)`, "proj_over", "projection_over");
      } else if (budgetTotal > 0 && forecast >= budgetTotal * (alertAt / 100) && prefs.projection_warn) {
        fireNotif("Proyección en alerta", `Estimación del ${periodLabel}: ${forecast}€ (${alertAt}%+ del presupuesto)`, "proj_warn", "projection_warn");
      }
    }
  }, [stats, prefs]);
}

/** Panel de configuración de notificaciones (embebible, sin modal). */
export function NotificationSettingsPanel({ prefs, setPrefs, perm, requestNotif }) {
  const update = (key, val) => setPrefs({ ...prefs, [key]: val });

  return (
    <div>
      <div className="space-y-3">
        <Toggle label="Presupuesto excedido" desc="Aviso cuando se supere el total o un tope de categoría" value={prefs.budget_over} onChange={(v) => update("budget_over", v)} />
        <Toggle label="Aviso de presupuesto" desc="Al acercarse al umbral del presupuesto" value={prefs.budget_warn} onChange={(v) => update("budget_warn", v)} />
        <Toggle label="Proyección excedida" desc="Si el ritmo actual supera el presupuesto" value={prefs.projection_over} onChange={(v) => update("projection_over", v)} />
        <Toggle label="Proyección en alerta" desc="Si la proyección supera el umbral de aviso" value={prefs.projection_warn} onChange={(v) => update("projection_warn", v)} />
        <Toggle label="Recordatorio diario" desc="Aviso diario a la hora configurada" value={prefs.daily_reminder} onChange={(v) => update("daily_reminder", v)} />

        {prefs.daily_reminder && (
          <div className="pl-2">
            <label className="text-sm text-[#5C626A]">Hora del recordatorio</label>
            <input
              type="number"
              min="8"
              max="22"
              value={prefs.reminder_hour}
              onChange={(e) => update("reminder_hour", Math.min(22, Math.max(8, Number(e.target.value))))}
              className="ml-2 w-16 rounded-xl border border-[#E2DDD3] p-1 text-center bg-white"
            />
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#E2DDD3]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-[#5C626A]">
            Estado del navegador:{" "}
            <span
              className={`font-mono ${
                perm === "granted"
                  ? "text-emerald-700"
                  : perm === "denied"
                    ? "text-red-700"
                    : perm === "default"
                      ? "text-amber-700"
                      : "text-[#5C626A]"
              }`}
            >
              {perm === "default" ? "sin solicitar" : perm}
            </span>
          </div>
          {perm === "granted" ? (
            <span className="text-sm text-emerald-700 font-medium">✓ Activadas</span>
          ) : perm === "denied" ? (
            <button onClick={requestNotif} className="text-sm text-[#D95D39] hover:underline">
              ¿Cómo activarlas?
            </button>
          ) : perm === "unsupported" || perm === "insecure" ? (
            <span className="text-sm text-[#5C626A]">No disponible aquí</span>
          ) : (
            <button data-testid="btn-request-notif" onClick={requestNotif} className="text-sm text-[#D95D39] hover:underline">
              Solicitar permiso
            </button>
          )}
        </div>

        {perm === "denied" && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            El navegador tiene las notificaciones <strong>bloqueadas</strong> para este sitio. Para activarlas:
            pulsa el <strong>candado</strong> (o el icono a la izquierda de la URL) → <strong>Notificaciones</strong> →{" "}
            <strong>Permitir</strong>, y recarga la página. Mientras tanto, los avisos aparecen dentro de la app.
          </div>
        )}

        {perm === "insecure" && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            El navegador solo permite notificaciones en <strong>HTTPS</strong> o <strong>localhost</strong>. Los avisos
            aparecerán dentro de la app.
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E2DDD3]">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-medium text-[#1A1D20]">{label}</p>
        <p className="text-xs text-[#5C626A]">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-[#D95D39]" : "bg-[#E2DDD3]"} relative`}
        role="switch"
        aria-checked={value}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}
