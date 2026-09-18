import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";
import Turnstile, { turnstileEnabled } from "@/components/Turnstile";

const PROVIDERS = [
  { id: "google", label: "Continuar con Google", Icon: GoogleIcon },
  { id: "github", label: "Continuar con GitHub", Icon: GithubIcon },
];

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
      />
    </svg>
  );
}

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38s1.95.13 2.86.38c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function traducirError(msg) {
  const m = String(msg || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos";
  if (m.includes("email not confirmed")) return "Debes confirmar tu correo antes de entrar";
  if (m.includes("user already registered")) return "Ya existe una cuenta con ese correo";
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "El correo no es válido";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos, espera un momento";
  if (m.includes("captcha")) {
    return "CAPTCHA no válido: revisa que la Site Key (frontend) y la Secret Key (Supabase) sean del mismo widget de Turnstile";
  }
  return msg || "No se pudo completar la operación";
}

export default function Login() {
  const {
    user,
    isConfigured,
    signIn,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
  } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [providerBusy, setProviderBusy] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (turnstileEnabled && !captchaToken) {
      toast.error("Completa la verificación de seguridad");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const data = await signUpWithPassword(email.trim(), password, captchaToken);
        if (!data?.session) {
          toast.info("Revisa tu correo para confirmar la cuenta");
        } else {
          toast.success("Cuenta creada");
        }
      } else {
        await signInWithPassword(email.trim(), password, captchaToken);
        toast.success("Bienvenido");
      }
    } catch (err) {
      toast.error(traducirError(err?.message));
    } finally {
      setBusy(false);
      // El token de Turnstile es de un solo uso: se descarta y se pinta uno nuevo.
      setCaptchaToken(null);
      setTurnstileNonce((n) => n + 1);
    }
  };

  const forgot = async () => {
    const mail = email.trim();
    if (!mail) {
      toast.error("Escribe tu correo para enviarte el enlace");
      return;
    }
    if (turnstileEnabled && !captchaToken) {
      toast.error("Completa la verificación de seguridad");
      return;
    }
    setResetBusy(true);
    try {
      await sendPasswordReset(mail, captchaToken);
      toast.success("Te hemos enviado un correo para restablecer la contraseña");
    } catch (err) {
      toast.error(traducirError(err?.message));
    } finally {
      setResetBusy(false);
      setCaptchaToken(null);
      setTurnstileNonce((n) => n + 1);
    }
  };

  const doSignIn = async (provider) => {
    setProviderBusy(provider);
    try {
      await signIn(provider);
    } catch {
      toast.error("No se pudo iniciar sesión");
      setProviderBusy(null);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
      <Card className="p-8 rounded-2xl border-[#E2DDD3] bg-white">
        <div className="text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Cuenta</p>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#1A1D20] mt-1">
            {mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
          </h1>
          <p className="text-[#5C626A] mt-2">
            Entra con tu correo y contraseña para guardar tus gastos en la nube.
          </p>
        </div>

        {!isConfigured ? (
          <div className="mt-8 text-sm text-[#5C626A] bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl p-4">
            La autenticación aún no está configurada. Define{" "}
            <code className="font-mono text-xs">VITE_SUPABASE_URL</code> y{" "}
            <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> en{" "}
            <code className="font-mono text-xs">.env</code>.
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label>Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C626A]" />
                  <Input
                    data-testid="input-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C626A]" />
                  <Input
                    data-testid="input-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>

              {turnstileEnabled && (
                <div className="flex justify-center pt-1">
                  <Turnstile key={turnstileNonce} onVerify={setCaptchaToken} />
                </div>
              )}

              <Button
                type="submit"
                disabled={busy}
                data-testid="btn-password-submit"
                className="w-full h-11 bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
              >
                {mode === "signup" ? (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" /> {busy ? "Creando…" : "Crear cuenta"}
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" /> {busy ? "Entrando…" : "Entrar"}
                  </>
                )}
              </Button>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={forgot}
                  disabled={resetBusy}
                  data-testid="btn-forgot-password"
                  className="w-full text-xs text-[#5C626A] hover:text-[#1A1D20] disabled:opacity-50"
                >
                  {resetBusy ? "Enviando…" : "¿Olvidaste tu contraseña?"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                data-testid="btn-toggle-mode"
                className="w-full text-sm text-[#5C626A] hover:text-[#1A1D20]"
              >
                {mode === "signup"
                  ? "¿Ya tienes cuenta? Inicia sesión"
                  : "¿No tienes cuenta? Crear una"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <span className="h-px flex-1 bg-[#E2DDD3]" />
              <span className="text-xs uppercase tracking-widest text-[#5C626A]">o</span>
              <span className="h-px flex-1 bg-[#E2DDD3]" />
            </div>

            <div className="space-y-3">
              {PROVIDERS.map((p) => (
                <Button
                  key={p.id}
                  data-testid={`btn-login-${p.id}`}
                  variant="outline"
                  disabled={providerBusy !== null || busy}
                  onClick={() => doSignIn(p.id)}
                  className="w-full h-12 justify-start gap-3 rounded-xl border-[#E2DDD3] bg-white hover:bg-[#FAF8F5] text-[#1A1D20] text-sm font-semibold"
                >
                  <span className="w-8 h-8 shrink-0 flex items-center justify-center">
                    <p.Icon className="w-5 h-5" />
                  </span>
                  {providerBusy === p.id ? "Conectando…" : p.label}
                </Button>
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full text-sm text-[#5C626A] hover:text-[#1A1D20] pt-6"
        >
          Volver sin iniciar sesión
        </button>
      </Card>
    </div>
  );
}