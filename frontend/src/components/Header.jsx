import { useEffect, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  Home, Receipt, ScanLine, Compass, LogIn, Images, BarChart3,
  CalendarDays, Settings, ChevronDown, Menu, X, HelpCircle,
  Cloud, CloudOff, Server, HardDrive,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useSyncStatus, TONES } from "@/lib/useSyncStatus";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import AccountDialog from "@/components/AccountDialog";
import ProjectMenu from "@/components/ProjectMenu";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { label: "Panel", to: "/", icon: Home, tid: "nav-dashboard" },
  {
    label: "Gastos",
    icon: Receipt,
    tid: "nav-expenses-group",
    children: [
      { label: "Todos los gastos", to: "/gastos", icon: Receipt, tid: "nav-expenses" },
      { label: "Escanear", to: "/escanear", icon: ScanLine, tid: "nav-scan" },
      { label: "Tickets", to: "/galeria", icon: Images, tid: "nav-gallery" },
    ],
  },
  {
    label: "Análisis",
    icon: BarChart3,
    tid: "nav-analysis-group",
    children: [
      { label: "Informe mensual", to: "/informe", icon: BarChart3, tid: "nav-report" },
      { label: "Calendario", to: "/calendario", icon: CalendarDays, tid: "nav-calendar" },
    ],
  },
  {
    label: "Ajustes",
    to: "/ajustes",
    icon: Settings,
    tid: "nav-settings",
  },
  {
    label: "Ayuda",
    to: "/ayuda",
    icon: HelpCircle,
    tid: "nav-help",
  },
];

function matchPath(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

const itemCls = (active) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
    active
      ? "bg-[#1E293B] text-white shadow"
      : "text-[#5C626A] hover:text-[#1A1D20] hover:bg-[#F2EFE9]"
  }`;

const STATUS_ICON = { offline: CloudOff, cloud: Cloud, server: Server, local: HardDrive };

function StatusPill({ status, className = "" }) {
  const tone = TONES[status.tone] || TONES.slate;
  const Icon = STATUS_ICON[status.key] || HardDrive;
  return (
    <div
      className={`items-center gap-2 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${tone.wrap} ${className}`}
      title={status.title}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="font-medium">{status.label}</span>
    </div>
  );
}

export default function Header() {
  const { user, isConfigured, loading, passwordRecovery } = useAuth();
  const sync = useSyncStatus();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (passwordRecovery) setAccountOpen(true);
  }, [passwordRecovery]);

  const authBlock = (
    <>
      {isConfigured &&
        (loading ? null : user ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              data-testid="btn-account"
              title="Mi cuenta"
              className="flex items-center gap-2 rounded-full pl-0.5 pr-1 py-0.5 hover:bg-[#F2EFE9] transition-colors"
            >
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
            </button>
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
    </>
  );

  return (
    <>
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FAF8F5]/85 border-b border-[#E2DDD3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        {/* Logotipo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#1E293B] flex items-center justify-center text-white shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="font-heading text-lg sm:text-xl font-extrabold">GastoControl</div>
              <div className="text-[11px] uppercase tracking-widest text-[#5C626A]">Controla tus gastos</div>
            </div>
          </Link>
        </div>

        {/* Navegación principal */}
        <div className="hidden lg:flex flex-1 justify-center">
          <nav aria-label="Navegación principal" className="flex items-center gap-1 bg-white border border-[#E2DDD3] rounded-xl p-1 shadow-sm">
          {NAV.map((item) =>
            item.children ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    data-testid={item.tid}
                    className={itemCls(item.children.some((c) => matchPath(location.pathname, c.to)))}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {item.children.map((c) => (
                    <DropdownMenuItem key={c.to} asChild>
                      <Link
                        to={c.to}
                        data-testid={c.tid}
                        className={matchPath(location.pathname, c.to) ? "bg-[#F2EFE9]" : ""}
                      >
                        <c.icon className="w-4 h-4 text-[#5C626A]" />
                        {c.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                data-testid={item.tid}
                className={({ isActive }) => itemCls(isActive)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          )}
          </nav>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          <ProjectMenu className="hidden md:flex" />
          <StatusPill status={sync} className="hidden xl:flex" />

          <Link to="/escanear" className="hidden sm:block">
            <Button
              size="sm"
              data-testid="btn-scan-cta"
              className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
            >
              <ScanLine className="w-4 h-4 mr-1.5" /> Escanear
            </Button>
          </Link>

          <ThemeToggle />
          <div className="hidden sm:block">{authBlock}</div>

          {/* Hamburguesa móvil / tablet */}
          <Button
            variant="outline"
            size="icon"
            data-testid="btn-mobile-menu"
            className="lg:hidden rounded-xl border-[#E2DDD3]"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>

      {/* Menú móvil (drawer) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={closeMobile} />
          <div className="absolute right-0 top-0 h-full w-[84%] max-w-xs bg-white border-l border-[#E2DDD3] overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#1E293B] flex items-center justify-center text-white">
                  <Compass className="w-4 h-4" />
                </div>
                <span className="font-heading text-lg font-extrabold">GastoControl</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-lg" onClick={closeMobile} aria-label="Cerrar">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <nav aria-label="Navegación principal" className="space-y-1">
              {NAV.map((item) =>
                item.children ? (
                  <div key={item.label} className="pt-1">
                    <p className="px-2 py-1 text-[11px] font-mono uppercase tracking-widest text-[#5C626A] flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                    </p>
                    {item.children.map((c) => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        onClick={closeMobile}
                        data-testid={`${c.tid}-mobile`}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                            isActive ? "bg-[#1E293B] text-white" : "text-[#1A1D20] hover:bg-[#F2EFE9]"
                          }`
                        }
                      >
                        <c.icon className="w-4 h-4" />
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={closeMobile}
                    data-testid={`${item.tid}-mobile`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                        isActive ? "bg-[#1E293B] text-white" : "text-[#1A1D20] hover:bg-[#F2EFE9]"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                )
              )}
            </nav>

            <div className="border-t border-[#E2DDD3] pt-3 space-y-3">
              <div>
                <p className="px-1 mb-2 text-[11px] font-mono uppercase tracking-widest text-[#5C626A]">
                  Contexto
                </p>
                <div className="flex flex-col gap-2">
                  <ProjectMenu className="flex" />
                  <StatusPill status={sync} className="flex" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <ThemeToggle />
                <div className="flex-1 flex justify-end">{authBlock}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
}
