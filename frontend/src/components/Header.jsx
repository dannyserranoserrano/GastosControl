import { NavLink, Link } from "react-router-dom";
import { Home, Receipt, ScanLine, Wallet, Compass, LogIn, LogOut, Images } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";

const tabs = [
  { to: "/", label: "Panel", icon: Home, tid: "nav-dashboard" },
  { to: "/gastos", label: "Gastos", icon: Receipt, tid: "nav-expenses" },
  { to: "/escanear", label: "Escanear", icon: ScanLine, tid: "nav-scan" },
  { to: "/galeria", label: "Tickets", icon: Images, tid: "nav-gallery" },
  { to: "/presupuesto", label: "Presupuesto", icon: Wallet, tid: "nav-budget" },
];

export default function Header() {
  const { user, isConfigured, signOut, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FAF8F5]/85 border-b border-[#E2DDD3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E293B] flex items-center justify-center text-white shadow-sm">
            <Compass className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-lg sm:text-xl font-extrabold">GastoControl</div>
            <div className="text-[11px] uppercase tracking-widest text-[#5C626A]">Controla tus gastos</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 bg-white border border-[#E2DDD3] rounded-xl p-1 shadow-sm">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === "/"}
              data-testid={t.tid}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#1E293B] text-white shadow"
                    : "text-[#5C626A] hover:text-[#1A1D20] hover:bg-[#F2EFE9]"
                }`
              }
            >
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sincronizado
          </div>

          {isConfigured &&
            (loading ? null : user ? (
              <div className="flex items-center gap-2">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="avatar"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xs font-semibold">
                    {(user.email?.[0] || "U").toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:block text-sm text-[#1A1D20] max-w-[120px] truncate">
                  {user.user_metadata?.name || user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  data-testid="btn-logout"
                  className="rounded-xl border-[#E2DDD3]"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button
                  size="sm"
                  data-testid="btn-login"
                  className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
                >
                  <LogIn className="w-4 h-4 mr-1" /> Entrar
                </Button>
              </Link>
            ))}
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden overflow-x-auto border-t border-[#E2DDD3] bg-white">
        <div className="flex min-w-max">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === "/"}
              data-testid={`${t.tid}-mobile`}
              className={({ isActive }) =>
                `flex-1 min-w-[25%] flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium ${
                  isActive ? "text-[#D95D39] border-t-2 border-[#D95D39]" : "text-[#5C626A]"
                }`
              }
            >
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}