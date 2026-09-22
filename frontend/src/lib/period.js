import { pad } from "@/lib/dates";
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const PERIODS = [
  { value: "weekly", label: "Semanal", short: "semana" },
  { value: "monthly", label: "Mensual", short: "mes" },
  { value: "yearly", label: "Anual", short: "año" },
];

export function normalizePeriod(period) {
  return PERIODS.some((p) => p.value === period) ? period : "monthly";
}

/**
 * Rango del periodo actual (lunes-domingo para semanal; mes natural; año natural).
 * Devuelve { start, end, label, labelFull, days, elapsedDays }.
 */
export function periodRange(period, today = new Date()) {
  const p = normalizePeriod(period);
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  let start;
  let end;
  let label;

  if (p === "weekly") {
    const dow = (today.getDay() + 6) % 7;
    start = new Date(y, m, d - dow);
    end = new Date(y, m, d - dow + 6);
    label = "semana";
  } else if (p === "yearly") {
    start = new Date(y, 0, 1);
    end = new Date(y, 11, 31);
    label = "año";
  } else {
    start = new Date(y, m, 1);
    end = new Date(y, m + 1, 0);
    label = "mes";
  }

  const days = Math.round((end - start) / 86400000) + 1;
  const elapsedDays = Math.min(Math.max(1, Math.round((today - start) / 86400000) + 1), days);

  return {
    start: ymd(start),
    end: ymd(end),
    label,
    days,
    elapsedDays,
    period: p,
  };
}

export function periodLabel(period) {
  return PERIODS.find((p) => p.value === normalizePeriod(period))?.label || "Mensual";
}
