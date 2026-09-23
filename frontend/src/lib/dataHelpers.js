// Helpers comunes de la capa de datos (local y Supabase).

export function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function fail(status, detail) {
  const err = new Error(detail || "Error");
  err.response = { status, data: { detail } };
  return err;
}

// Detecta si un error de PostgREST se debe a una columna inexistente concreta.
export function missingColumn(error, column) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  const col = String(column).toLowerCase();
  return msg.includes(col);
}

export const sortOtrosLast = (a, b) => {
  if (a.name === "Otros") return 1;
  if (b.name === "Otros") return -1;
  return a.name.localeCompare(b.name);
};

export function matchExpenseId(url) {
  const m = url.match(/^\/expenses\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function matchCategoryName(url) {
  const m = url.match(/^\/categories\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}
