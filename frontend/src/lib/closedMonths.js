const KEY = "gastocontrol:closed_months";

const scope = (project) => String(project || "").trim();

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

export function loadClosed(project) {
  const all = readAll();
  const list = all[scope(project)];
  return Array.isArray(list) ? list : [];
}

export function isMonthClosed(project, ym) {
  return loadClosed(project).includes(ym);
}

export function toggleMonth(project, ym) {
  const all = readAll();
  const key = scope(project);
  const set = new Set(all[key] || []);
  if (set.has(ym)) set.delete(ym);
  else set.add(ym);
  all[key] = [...set].sort();
  writeAll(all);
  return all[key];
}

const DISMISS_KEY = "gastocontrol:month_close_dismissed";

function readDismissed() {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function isDismissed(project, ym) {
  const all = readDismissed();
  return !!((all[scope(project)] || {})[ym]);
}

export function dismissMonth(project, ym) {
  const all = readDismissed();
  const key = scope(project);
  all[key] = { ...(all[key] || {}), [ym]: true };
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
