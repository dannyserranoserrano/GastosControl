const KEY = "gastocontrol:theme";

export function getStoredMode() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

export function resolveMode(mode) {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function applyMode(mode) {
  const resolved = resolveMode(mode);
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
  }
  return resolved;
}

export function setStoredMode(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  return applyMode(mode);
}
