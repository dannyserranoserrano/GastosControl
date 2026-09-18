import { useEffect, useState } from "react";
import { useAuth } from "./authContext";
import { isConfigured } from "./supabase";
import { USE_REMOTE } from "./api";

export const TONES = {
  green: {
    wrap: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dot: "bg-emerald-500",
  },
  sky: {
    wrap: "bg-sky-50 border-sky-200 text-sky-800",
    dot: "bg-sky-500",
  },
  slate: {
    wrap: "bg-[#F2EFE9] border-[#E2DDD3] text-[#5C626A]",
    dot: "bg-[#94A3B8]",
  },
  amber: {
    wrap: "bg-amber-50 border-amber-200 text-amber-800",
    dot: "bg-amber-500",
  },
};

function currentStatus(online, user) {
  if (!online) {
    return {
      key: "offline",
      label: "Sin conexión",
      tone: "amber",
      title: "Sin conexión: los cambios se guardan en este dispositivo.",
    };
  }
  if (isConfigured && user) {
    return {
      key: "cloud",
      label: "En la nube",
      tone: "green",
      title: `Sincronizado con Supabase como ${user.email || "usuario"}.`,
    };
  }
  if (USE_REMOTE) {
    return {
      key: "server",
      label: "Servidor",
      tone: "sky",
      title: "Guardando en el servidor configurado (VITE_BACKEND_URL).",
    };
  }
  return {
    key: "local",
    label: "Solo en este dispositivo",
    tone: "slate",
    title: "Modo local: los datos se guardan en este navegador (IndexedDB).",
  };
}

export function useSyncStatus() {
  const { user } = useAuth();
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return { ...currentStatus(online, user), online };
}
