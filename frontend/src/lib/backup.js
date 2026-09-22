import { dbGet, dbSet, dbClear, dbKeys, LOCAL_FILE_PREFIX } from "./storage";

export const BACKUP_VERSION = 1;

// Nota: NO incluir aquí claves con secretos (p. ej. `gastocontrol:mobile_notify`,
// que guarda el token de Telegram y las claves de EmailJS) para no filtrarlos en el backup.
const LS_KEYS = [
  "gastocontrol:projects",
  "gastocontrol:active_project",
  "gastocontrol:goals",
  "gastocontrol:recurring",
  "gastocontrol:auto_rules",
  "gastocontrol:theme",
  "gastocontrol:notif_prefs",
];

const DB_KEYS = [
  "gastocontrol:categories",
  "gastocontrol:project_categories",
  "gastocontrol:expenses",
  "gastocontrol:budget",
];

function safeParse(v) {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export async function buildBackup() {
  const localStorageData = {};
  for (const k of LS_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) localStorageData[k] = safeParse(v);
  }
  const indexeddb = {};
  for (const k of DB_KEYS) {
    const v = await dbGet(k);
    if (v !== undefined) indexeddb[k] = v;
  }
  // Ficheros locales de tickets (imágenes/PDF) guardados aparte
  const files = {};
  try {
    for (const k of await dbKeys()) {
      if (String(k).startsWith(LOCAL_FILE_PREFIX)) files[String(k)] = await dbGet(k);
    }
  } catch {
    /* ignore */
  }
  return {
    app: "GastoControl",
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    localStorage: localStorageData,
    indexeddb,
    files,
  };
}

export function backupFilename() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `gastocontrol-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

export async function exportBackupFile() {
  const data = await buildBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return data;
}

export async function importBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es un JSON válido");
  }
  if (!data || data.app !== "GastoControl" || (!data.localStorage && !data.indexeddb)) {
    throw new Error("El archivo no es una copia de seguridad de GastoControl");
  }

  const ls = data.localStorage || {};
  for (const k of LS_KEYS) {
    if (k in ls) {
      const v = ls[k];
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }

  const db = data.indexeddb || {};
  for (const k of DB_KEYS) {
    if (k in db) await dbSet(k, db[k]);
  }

  const files = data.files || {};
  for (const [k, v] of Object.entries(files)) {
    if (String(k).startsWith(LOCAL_FILE_PREFIX)) await dbSet(k, v);
  }

  return {
    expenses: (db["gastocontrol:expenses"] || []).length,
    categories: (db["gastocontrol:categories"] || []).length,
    projects: (ls["gastocontrol:projects"] || []).length,
    goals: Object.values(ls["gastocontrol:goals"] || {}).reduce(
      (s, l) => s + (Array.isArray(l) ? l.length : 0),
      0
    ),
    exported_at: data.exported_at || null,
  };
}

/**
 * Borra TODOS los datos locales del dispositivo (IndexedDB completo + claves
 * `gastocontrol:` de localStorage) para no dejar rastro en un equipo compartido.
 * Se usa al cerrar sesión. Conserva el tema claro/oscuro salvo que se pase
 * `{ keepTheme: false }`.
 */
export async function clearLocalData({ keepTheme = true } = {}) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("gastocontrol:")) keys.push(k);
    }
    for (const k of keys) {
      if (keepTheme && k === "gastocontrol:theme") continue;
      localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
  await dbClear();
}
