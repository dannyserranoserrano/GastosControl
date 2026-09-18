import { useEffect, useRef } from "react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
export const turnstileEnabled = Boolean(SITE_KEY);

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Widget de Cloudflare Turnstile. Solo se pinta si VITE_TURNSTILE_SITE_KEY está
// definido. Emite el token por `onVerify` (null si caduca/falla).
export default function Turnstile({ onVerify }) {
  const ref = useRef(null);
  const widgetId = useRef(null);
  const cb = useRef(onVerify);
  cb.current = onVerify;

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let alive = true;
    loadScript()
      .then(() => {
        if (!alive || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          callback: (token) => cb.current?.(token),
          "expired-callback": () => cb.current?.(null),
          "error-callback": () => cb.current?.(null),
        });
      })
      .catch(() => cb.current?.(null));
    return () => {
      alive = false;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="flex justify-center" data-testid="turnstile" />;
}
