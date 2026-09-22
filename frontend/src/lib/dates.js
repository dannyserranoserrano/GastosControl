// Utilidades de fecha centralizadas (antes duplicadas en ~10 archivos).

export const pad = (n) => String(n).padStart(2, "0");

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Fecha local en formato YYYY-MM-DD
export function ymd(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Mes (m es 0-based) en formato YYYY-MM
export function monthKey(y, m) {
  return `${y}-${pad(m + 1)}`;
}

// Mes actual en formato YYYY-MM
export function ym(date = new Date()) {
  return monthKey(date.getFullYear(), date.getMonth());
}
