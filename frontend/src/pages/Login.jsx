import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";

const PROVIDERS = [
  { id: "google", label: "Continuar con Google", color: "#4285F4", letter: "G" },
  { id: "azure", label: "Continuar con Microsoft", color: "#2F2F2F", letter: "M" },
  { id: "github", label: "Continuar con GitHub", color: "#1F2328", letter: "GH" },
];

function traducirError(msg) {
  const m = String(msg || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos";
  if (m.includes("email not confirmed")) return "Debes confirmar tu correo antes de entrar";
  if (m.includes("user already registered")) return "Ya existe una cuenta con ese correo";
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "El correo no es válido";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos, espera un momento";
  return msg || "No se pudo completar la operación";
}

export default function Login() {
  const {
    user,
    isConfigured,
    signIn,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [providerBusy, setProviderBusy] = useState(null);
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const data = await signUpWithPassword(email.trim(), password);
        if (!data?.session) {
          toast.info("Revisa tu correo para confirmar la cuenta");
        } else {
          toast.success("Cuenta creada");
        }
      } else {
        await signInWithPassword(email.trim(), password);
        toast.success("Bienvenido");
      }
    } catch (err) {
      toast.error(traducirError(err?.message));
    } finally {
      setBusy(false);
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
                  <span
                    className="w-7 h-7 rounded-full text-white flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.id === "github" ? "GH" : p.letter}
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