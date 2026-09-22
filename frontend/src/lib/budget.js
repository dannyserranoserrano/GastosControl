// Utilidades numéricas de presupuesto (compartidas por localBackend y supabaseData).

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function sanitizeCategoryBudgets(raw) {
  const out = {};
  if (raw && typeof raw === "object") {
    for (const [name, value] of Object.entries(raw)) {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) out[name] = round2(n);
    }
  }
  return out;
}
