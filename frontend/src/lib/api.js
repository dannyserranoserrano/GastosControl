import axios from "axios";
import { createLocalApi, localExportCsv } from "./localBackend";
import { createSupabaseApi, supabaseExportCsv } from "./supabaseData";
import { supabase, isConfigured } from "./supabase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const USE_REMOTE = Boolean(BACKEND_URL);

export const API = USE_REMOTE ? `${BACKEND_URL}/api` : null;

const localApi = createLocalApi();
const supabaseApi = createSupabaseApi();
const remoteApi = USE_REMOTE ? axios.create({ baseURL: API }) : null;

async function pickBackend() {
  if (isConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return supabaseApi;
    return localApi;
  }
  if (remoteApi) return remoteApi;
  return localApi;
}

// El escaneo de tickets siempre usa el backend OCR (FastAPI) cuando está configurado.
// Los datos (gastos/presupuesto) van a Supabase si hay sesión, o al modo local si no.
export async function scanReceipt(formData) {
  const headers = { "Content-Type": "multipart/form-data" };
  // Cabecera opcional si el backend exige APP_API_KEY (ver backend/.env).
  const ocrKey = import.meta.env.VITE_OCR_KEY;
  if (ocrKey) headers["X-App-Key"] = ocrKey;
  if (remoteApi) {
    const { data } = await remoteApi.post("/receipts/scan", formData, { headers });
    return data;
  }
  const backend = await pickBackend();
  const { data } = await backend.post("/receipts/scan", formData, { headers });
  return data;
}

function proxied(method) {
  return async (url, a, b) => {
    const backend = await pickBackend();
    return backend[method](url, a, b);
  };
}

export const api = {
  get: proxied("get"),
  post: proxied("post"),
  patch: proxied("patch"),
  put: proxied("put"),
  delete: proxied("delete"),
};

export async function exportCsv() {
  const backend = await pickBackend();
  if (backend === supabaseApi) {
    return supabaseExportCsv();
  }
  if (backend === remoteApi) {
    window.open(`${API}/expenses/export`, "_blank");
    return;
  }
  return localExportCsv();
}

export function toBackendUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http") || pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith("/api")) return `${BACKEND_URL}${pathOrUrl}`;
  if (!USE_REMOTE) return pathOrUrl;
  return `${API}/files/${pathOrUrl}`;
}

export function budgetCrossing(beforeProgress, afterProgress, alertAt) {
  const before = Number(beforeProgress || 0);
  const after = Number(afterProgress || 0);
  const at = alertAt > 0 ? alertAt : 80;
  if (before < 100 && after >= 100) return "over";
  if (before < at && after >= at) return "warn";
  return null;
}

/**
 * Verifica que un gasto recién creado existe realmente y quedó asociado al proyecto esperado.
 * Sirve para detectar el caso de Supabase sin las columnas migradas (se guardaba sin `project`).
 */
export async function verifyExpenseSaved(createdId, expectedProject) {
  if (!createdId) return { found: false };
  try {
    const { data } = await api.get("/expenses");
    const row = (data || []).find((e) => e.id === createdId);
    if (!row) return { found: false };
    const proj = String(row.project || "");
    const exp = String(expectedProject || "");
    return { found: true, project: proj, projectOk: !exp || proj === exp };
  } catch {
    return { found: false, error: true };
  }
}

export {
  COLOR_MAP,
  ALLOWED_ICONS,
  ALLOWED_COLORS,
  DEFAULT_CATEGORIES,
  eur,
} from "./constants";