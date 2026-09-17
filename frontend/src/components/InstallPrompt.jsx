import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

const CLOSED_KEY = "gastocontrol:install_closed";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(() => window.__bipEvent || null);
  const [visible, setVisible] = useState(() => !!window.__bipEvent);
  const [ios, setIos] = useState(null);
  const [closed, setClosed] = useState(() => {
    try {
      return localStorage.getItem(CLOSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return;

    const onBip = (e) => {
      e.preventDefault();
      window.__bipEvent = e;
      setDeferred(e);
      setVisible(true);
    };
    const onInstalled = () => {
      window.__bipEvent = null;
      setDeferred(null);
      setVisible(false);
      try {
        localStorage.setItem(CLOSED_KEY, "1");
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    const ua = navigator.userAgent || "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isOtherBrowserOnIOS = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    if (isIOS) setIos({ otherBrowser: isOtherBrowserOnIOS });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (closed) return null;
  if (!visible && !ios) return null;

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    window.__bipEvent = null;
    setDeferred(null);
    setVisible(false);
  };

  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(CLOSED_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
      <div
        data-testid="install-prompt"
        className="rounded-2xl border border-[#E2DDD3] bg-white p-3 flex items-center gap-3 shadow-sm"
      >
        <Download className="w-5 h-5 text-[#D95D39] shrink-0" />
        <div className="flex-1 text-sm text-[#1A1D20]">
          {ios ? (
            ios.otherBrowser ? (
              <span>
                En iPhone, para instalar la app usa <strong>Safari</strong>:{" "}
                <strong>Compartir → Añadir a pantalla de inicio</strong>. (Chrome/Firefox en iPhone no lo permiten).
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                Instala la app: pulsa <Share className="w-3.5 h-3.5 inline" />
                <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>.
              </span>
            )
          ) : (
            <>Instala GastoControl para abrirla a pantalla completa y usarla sin conexión.</>
          )}
        </div>
        {!ios && (
          <button
            type="button"
            data-testid="btn-install-pwa"
            onClick={install}
            className="rounded-xl bg-[#D95D39] hover:bg-[#C24C2A] text-white px-3 py-1.5 text-sm font-medium shrink-0"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={close}
          className="text-[#5C626A] hover:text-[#1A1D20] shrink-0"
          title="Cerrar"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
