export const COLOR_MAP = {
  orange:  { cls: "bg-orange-100 text-orange-800 border-orange-200",   dot: "#EA580C" },
  amber:   { cls: "bg-amber-100 text-amber-800 border-amber-200",      dot: "#D97706" },
  blue:    { cls: "bg-blue-100 text-blue-800 border-blue-200",         dot: "#2563EB" },
  emerald: { cls: "bg-emerald-100 text-emerald-800 border-emerald-200",dot: "#059669" },
  purple:  { cls: "bg-purple-100 text-purple-800 border-purple-200",   dot: "#7C3AED" },
  stone:   { cls: "bg-stone-100 text-stone-800 border-stone-200",      dot: "#57534E" },
  rose:    { cls: "bg-rose-100 text-rose-800 border-rose-200",         dot: "#E11D48" },
  cyan:    { cls: "bg-cyan-100 text-cyan-800 border-cyan-200",         dot: "#0891B2" },
  indigo:  { cls: "bg-indigo-100 text-indigo-800 border-indigo-200",   dot: "#4F46E5" },
  lime:    { cls: "bg-lime-100 text-lime-800 border-lime-200",         dot: "#65A30D" },
  teal:    { cls: "bg-teal-100 text-teal-800 border-teal-200",         dot: "#0D9488" },
  pink:    { cls: "bg-pink-100 text-pink-800 border-pink-200",         dot: "#DB2777" },
};

export const ALLOWED_ICONS = [
  "Hammer", "Wrench", "FileText", "Users", "Truck", "MoreHorizontal",
  "Paintbrush", "Zap", "Home", "Package", "ShoppingCart", "Trees",
  "Droplet", "Flame", "Bolt", "Lightbulb", "PiggyBank", "Sparkles",
];

export const ALLOWED_COLORS = Object.keys(COLOR_MAP);

export const DEFAULT_CATEGORIES = [
  { name: "General", icon: "Package", color: "indigo" },
  { name: "Compras", icon: "ShoppingCart", color: "orange" },
  { name: "Facturas", icon: "FileText", color: "blue" },
  { name: "Otros", icon: "MoreHorizontal", color: "stone" },
];

export function eur(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(v);
}