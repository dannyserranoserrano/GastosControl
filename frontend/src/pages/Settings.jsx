import { useSearchParams } from "react-router-dom";
import { FolderKanban, Wallet, Tag, PiggyBank, Bell, Database, BellRing } from "lucide-react";
import ProjectSettings from "../components/ProjectSettings";
import BudgetSettings from "../components/BudgetSettings";
import CategoryManager from "../components/CategoryManager";
import GoalsManager from "../components/GoalsManager";
import BackupManager from "../components/BackupManager";
import MobileAlertSettings from "../components/MobileAlertSettings";
import { useNotificationPrefs, NotificationSettingsPanel } from "../lib/useNotifications.jsx";

const TABS = [
  { id: "proyecto", label: "Proyecto", icon: FolderKanban },
  { id: "presupuesto", label: "Presupuesto", icon: Wallet },
  { id: "categorias", label: "Categorías", icon: Tag },
  { id: "ahorro", label: "Ahorro", icon: PiggyBank },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
  { id: "alertas", label: "Alertas", icon: BellRing },
  { id: "datos", label: "Datos", icon: Database },
];

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const active = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "proyecto";
  const setTab = (id) => setParams({ tab: id }, { replace: true });
  const notif = useNotificationPrefs();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Ajustes</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">Configuración</h1>
        <p className="text-[#5C626A] mt-2">
          Proyecto, presupuesto, categorías, ahorro, notificaciones y datos.
        </p>
      </div>

      <div className="md:grid md:grid-cols-[210px_1fr] md:gap-6 md:items-start">
        {/* Navegación de secciones */}
        <nav
          data-testid="settings-tabs"
          className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 mb-2 md:mb-0 md:sticky md:top-24"
        >
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`settings-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[#1E293B] text-white shadow-sm"
                    : "text-[#5C626A] hover:text-[#1A1D20] hover:bg-white border border-transparent hover:border-[#E2DDD3]"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Contenido */}
        <div className="min-w-0">
          {active === "proyecto" && <ProjectSettings />}
          {active === "presupuesto" && <BudgetSettings />}
          {active === "categorias" && <CategoryManager />}
          {active === "ahorro" && <GoalsManager />}
          {active === "notificaciones" && (
            <div className="rounded-2xl border border-[#E2DDD3] bg-white p-6" data-testid="settings-notifications">
              <h3 className="font-heading font-bold text-lg mb-1">Notificaciones</h3>
              <p className="text-sm text-[#5C626A] mb-4">Configura cuándo recibir avisos.</p>
              <NotificationSettingsPanel
                prefs={notif.prefs}
                setPrefs={notif.setPrefs}
                perm={notif.perm}
                requestNotif={notif.requestNotif}
              />
            </div>
          )}
          {active === "alertas" && <MobileAlertSettings />}
          {active === "datos" && <BackupManager />}
        </div>
      </div>
    </div>
  );
}
