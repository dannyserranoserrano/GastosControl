const RULES_KEY = "gastocontrol:auto_rules";

function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function loadRules() {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRules(rules) {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    /* ignore */
  }
}

function mostFrequent(items) {
  const counts = new Map();
  items.forEach((v) => {
    if (!v) return;
    counts.set(v, (counts.get(v) || 0) + 1);
  });
  let best = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Devuelve una sugerencia { category, project, source } para un proveedor.
 * 1) Reglas explícitas (el patrón está contenido en el proveedor normalizado).
 * 2) Historial: gastos con el mismo proveedor normalizado (o coincidencia parcial).
 */
export function suggestFor(vendor, expenses, rules) {
  const v = normalize(vendor);
  if (!v) return null;

  for (const r of rules || []) {
    const m = normalize(r.match);
    if (m && v.includes(m)) {
      const s = { source: "regla", ruleId: r.id };
      if (r.category) s.category = r.category;
      if (r.project) s.project = r.project;
      if (s.category || s.project) return s;
    }
  }

  const list = expenses || [];
  let matches = list.filter((e) => normalize(e.vendor) === v);
  let partial = false;
  if (matches.length === 0) {
    matches = list.filter((e) => {
      const n = normalize(e.vendor);
      return n.length >= 3 && (n.includes(v) || v.includes(n));
    });
    partial = matches.length > 0;
  }
  if (matches.length === 0) return null;

  const recent = [...matches].sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || ""))
  );
  const category = mostFrequent(recent.map((e) => e.category).filter(Boolean));
  const project = mostFrequent(recent.map((e) => String(e.project || "").trim()).filter(Boolean));

  const s = { source: partial ? "historial parcial" : "historial", count: matches.length };
  if (category) s.category = category;
  if (project) s.project = project;
  return s.category || s.project ? s : null;
}

export function ruleId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "rule-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
