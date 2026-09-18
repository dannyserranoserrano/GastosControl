import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Mail, ShieldCheck, ExternalLink, AlertTriangle } from "lucide-react";
import Turnstile, { turnstileEnabled } from "@/components/Turnstile";

const PROVIDER_INFO = {
  google: { label: "Google", url: "https://myaccount.google.com/security" },
  github: { label: "GitHub", url: "https://github.com/settings/security" },
  gitlab: { label: "GitLab", url: "https://gitlab.com/-/user_settings/password/edit" },
  azure: { label: "Microsoft", url: "https://account.microsoft.com/security" },
};

function traducir(msg) {
  const m = String(msg || "").toLowerCase();
  if (m.includes("at least")) return "La contraseña debe tener al menos 6 caracteres";
  if (m.includes("should be different") || m.includes("different from")) {
    return "La nueva contraseña debe ser distinta de la actual";
  }
  if (m.includes("reaut") || m.includes("nonce")) {
    return "Por seguridad, vuelve a iniciar sesión e inténtalo de nuevo";
  }
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos, espera un momento";
  if (m.includes("no captcha_token")) return "El CAPTCHA no llegó al servidor. Vuelve a intentarlo.";
  if (m.includes("invalid-input-response")) return "El CAPTCHA caducó o ya se usó. Resuélvelo de nuevo e inténtalo.";
  if (m.includes("captcha")) return "Verificación de seguridad fallida. Inténtalo de nuevo.";
  return msg || "No se pudo completar la operación";
}

export default function AccountDialog({ open, onOpenChange }) {
  const { user, updatePassword, sendPasswordReset, passwordRecovery } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [turnstileNonce, setTurnstileNonce] = useState(0);

  useEffect(() => {
    if (!open) {
      setPw("");
      setPw2("");
    }
  }, [open]);

  if (!user) return null;

  const identities = Array.isArray(user.identities) ? user.identities : [];
  const hasPassword = identities.some((i) => i.provider === "email");
  const oauth = identities.filter((i) => i.provider !== "email");

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (pw !== pw2) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(pw);
      toast.success("Contraseña actualizada");
      setPw("");
      setPw2("");
    } catch (err) {
      toast.error(traducir(err?.message));
    } finally {
      setBusy(false);
    }
  };

  const recover = async () => {
    if (turnstileEnabled && !captchaToken) {
      toast.error("Completa la verificación de seguridad");
      return;
    }
    setResetBusy(true);
    try {
      await sendPasswordReset(user.email, captchaToken);
      toast.success("Te hemos enviado un correo para restablecer la contraseña");
    } catch (err) {
      toast.error(traducir(err?.message));
    } finally {
      setResetBusy(false);
      setCaptchaToken(null);
      setTurnstileNonce((n) => n + 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Mi cuenta</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <span className="w-11 h-11 rounded-full bg-[#1E293B] text-white flex items-center justify-center font-semibold">
              {(user.email?.[0] || "U").toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-[#1A1D20] truncate">
              {user.user_metadata?.name || user.email}
            </p>
            <p className="text-xs text-[#5C626A] truncate">{user.email}</p>
          </div>
        </div>

        {passwordRecovery && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Estás restableciendo la contraseña. Escribe una nueva y guárdala.</span>
          </div>
        )}

        {hasPassword && (
          <form onSubmit={submit} className="space-y-3 border-t border-[#E2DDD3] pt-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#D95D39]" />
              <p className="font-semibold text-[#1A1D20]">Cambiar contraseña</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nueva contraseña</Label>
              <Input
                data-testid="input-new-password"
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Repite la nueva contraseña</Label>
              <Input
                data-testid="input-confirm-password"
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              data-testid="btn-change-password"
              className="w-full bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
            >
              {busy ? "Guardando…" : "Guardar contraseña"}
            </Button>
            {turnstileEnabled && (
              <div className="flex justify-center">
                <Turnstile key={turnstileNonce} onVerify={setCaptchaToken} />
              </div>
            )}
            <button
              type="button"
              onClick={recover}
              disabled={resetBusy}
              className="w-full text-xs text-[#5C626A] hover:text-[#1A1D20] inline-flex items-center justify-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" />
              {resetBusy ? "Enviando…" : "Enviarme un enlace de recuperación"}
            </button>
          </form>
        )}

        {oauth.length > 0 && (
          <div className="space-y-3 border-t border-[#E2DDD3] pt-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <p className="font-semibold text-[#1A1D20]">Cuentas vinculadas</p>
            </div>
            {oauth.map((i) => {
              const info = PROVIDER_INFO[i.provider] || { label: i.provider, url: null };
              return (
                <div
                  key={i.provider}
                  className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1D20]">{info.label}</p>
                    <p className="text-xs text-[#5C626A]">
                      Tu contraseña y seguridad se gestionan en {info.label}.
                    </p>
                  </div>
                  {info.url && (
                    <a href={info.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <Button type="button" variant="outline" size="sm" className="rounded-xl border-[#E2DDD3]">
                        Abrir <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}
            {!hasPassword && (
              <p className="text-xs text-[#5C626A]">
                Inicias sesión con un proveedor externo, así que no hay contraseña que cambiar aquí.
              </p>
            )}
          </div>
        )}

        <div className="border-t border-[#E2DDD3] pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl border-[#E2DDD3]"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
