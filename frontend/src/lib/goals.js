const KEY = "gastocontrol:goals";

const pad = (n) => String(n).padStart(2, "0");

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function scopeKey(project) {
  return String(project || "").trim();
}

function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function loadGoals(project) {
  const all = readAll();
  const list = all[scopeKey(project)];
  return Array.isArray(list) ? list : [];
}

export function saveGoals(project, goals) {
  const all = readAll();
  all[scopeKey(project)] = goals;
  writeAll(all);
}

export function goalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "goal-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function contributionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "ap-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function goalSummary(goal) {
  const target = Number(goal?.target || 0);
  const contributions = goal?.contributions || [];
  const saved = contributions.reduce((s, c) => s + Number(c.amount || 0), 0);
  const pct = target > 0 ? (saved / target) * 100 : 0;
  const remaining = Math.max(target - saved, 0);
  const done = target > 0 && saved >= target;

  // Ritmo de ahorro real (últimos 90 días) para estimar la fecha de consecución.
  const sorted = [...contributions].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  let monthlyRate = 0;
  if (sorted.length >= 2) {
    const first = new Date(sorted[0].date);
    const last = new Date(sorted[sorted.length - 1].date);
    const days = Math.max(1, Math.round((last - first) / 86400000));
    const span = Math.max(days, 1);
    monthlyRate = Math.round((saved / span) * 30 * 100) / 100;
  }
  const monthsToGoal = monthlyRate > 0 && !done ? Math.ceil(remaining / monthlyRate) : null;

  return { target, saved: Math.round(saved * 100) / 100, pct, remaining: Math.round(remaining * 100) / 100, done, monthlyRate, monthsToGoal };
}
