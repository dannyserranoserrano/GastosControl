const KEY = "gastocontrol:recurring";

const pad = (n) => String(n).padStart(2, "0");

// Cada cuánto se repite el recibo (intervalo en meses).
export const FREQUENCIES = [
  { value: 1, label: "Mensual" },
  { value: 2, label: "Bimestral" },
  { value: 3, label: "Trimestral" },
  { value: 4, label: "Cuatrimestral" },
  { value: 6, label: "Semestral" },
  { value: 12, label: "Anual" },
];

export function normalizeFreq(freq) {
  const n = Math.round(Number(freq));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 120) : 1;
}

export function freqLabel(freq) {
  const n = normalizeFreq(freq);
  const preset = FREQUENCIES.find((f) => f.value === n);
  return preset ? preset.label : `Cada ${n} meses`;
}

function monthIndex(ym) {
  const [y, m] = String(ym).split("-").map(Number);
  return y * 12 + (m - 1);
}

// ¿Le toca generar en el mes `ym`? (a partir del mes de inicio, cada `freq` meses)
export function isDueMonth(t, ym) {
  const start = (t && t.start) || ym;
  const freq = normalizeFreq(t && t.freq);
  const diff = monthIndex(ym) - monthIndex(start);
  return diff >= 0 && diff % freq === 0;
}

export function ymOf(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function templateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "rec-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function loadTemplates() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates) {
  try {
    localStorage.setItem(KEY, JSON.stringify(templates));
  } catch {
    /* ignore */
  }
}

/**
 * Devuelve los gastos pendientes de generar para las plantillas activas.
 * Cada item: { templateId, ym, data }
 */
export function pendingFor(templates, today = new Date()) {
  const curYM = ymOf(today);
  const created = [];

  for (const t of templates || []) {
    if (!t.active) continue;
    const generated = new Set(t.generated || []);
    const start = t.start || curYM;
    if (start > curYM) continue;

    let [y, m] = start.split("-").map(Number);
    const [cy, cm] = curYM.split("-").map(Number);

    while (y < cy || (y === cy && m <= cm)) {
      const ym = `${y}-${pad(m)}`;
      if (isDueMonth(t, ym) && !generated.has(ym)) {
        const dim = new Date(y, m, 0).getDate();
        const day = Math.min(Math.max(1, Number(t.day) || 1), dim);
        const isCurrent = ym === curYM;
        if (!isCurrent || today.getDate() >= day) {
          created.push({
            templateId: t.id,
            ym,
            data: {
              vendor: t.vendor || "",
              amount: Number(t.amount || 0),
              category: t.category || "Otros",
              project: t.project || "",
              notes: t.notes || "",
              date: `${ym}-${pad(day)}`,
            },
          });
        }
      }
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }

  return created;
}

export function yearMonths(count = 24, today = new Date()) {
  const opts = [];
  let y = today.getFullYear();
  let m = today.getMonth();
  for (let i = 0; i < count; i++) {
    opts.push(`${y}-${pad(m + 1)}`);
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
  }
  return opts;
}
