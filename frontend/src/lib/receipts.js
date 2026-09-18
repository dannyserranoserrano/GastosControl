import { supabase, isConfigured } from "./supabase";
import { toBackendUrl, USE_REMOTE } from "./api";

const OCR_KEY = import.meta.env.VITE_OCR_KEY;
const SIGNED_TTL = 3600;
const signedCache = new Map();
const blobCache = new Map();

function isSupabaseStorageUrl(s) {
  return typeof s === "string" && /\/storage\/v1\/object\/(public|sign)\/receipts\//.test(s);
}

function supabasePathFromUrl(s) {
  const m = s.match(/\/storage\/v1\/object\/(?:public|sign)\/receipts\/(.+?)(?:\?|$)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function looksLikeStoragePath(s) {
  return (
    typeof s === "string" &&
    !s.startsWith("data:") &&
    !s.startsWith("http") &&
    !s.startsWith("/") &&
    s.includes("/")
  );
}

// Extrae la ruta de storage de un recibo (tanto de una URL pública antigua como
// de un `{ path }` nuevo). Devuelve null si no es un objeto de Supabase Storage.
export function receiptStoragePath(r) {
  const raw = (r && (r.path || r.url)) || null;
  if (!raw) return null;
  if (isSupabaseStorageUrl(raw)) return supabasePathFromUrl(raw);
  if (looksLikeStoragePath(raw)) return raw;
  return null;
}

// Devuelve una URL mostrable para un recibo: data-URL tal cual, URL firmada de
// Supabase (bucket privado) o la URL del backend OCR (con cabecera X-App-Key si
// se configura). Cachea los resultados.
export async function resolveReceiptSrc(r) {
  const raw = (r && (r.url || r.path)) || null;
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;

  const sp = receiptStoragePath(r);
  if (sp && isConfigured && supabase) {
    const now = Date.now();
    const cached = signedCache.get(sp);
    if (cached && cached.exp > now + 60000) return cached.url;
    try {
      const { data, error } = await supabase.storage.from("receipts").createSignedUrl(sp, SIGNED_TTL);
      if (!error && data?.signedUrl) {
        signedCache.set(sp, { url: data.signedUrl, exp: now + SIGNED_TTL * 1000 });
        return data.signedUrl;
      }
    } catch {
      /* sin sesión o sin permiso: se intenta la vía del backend */
    }
  }

  const backendUrl = toBackendUrl(raw);
  if (USE_REMOTE && OCR_KEY && backendUrl && backendUrl.includes("/api/files/")) {
    const cached = blobCache.get(backendUrl);
    if (cached) return cached;
    try {
      const res = await fetch(backendUrl, { headers: { "X-App-Key": OCR_KEY } });
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        blobCache.set(backendUrl, url);
        return url;
      }
    } catch {
      /* ignore */
    }
  }
  return backendUrl;
}
