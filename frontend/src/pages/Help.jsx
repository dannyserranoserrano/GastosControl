import { useMemo, useState } from "react";
import { HELP_ITEMS } from "../lib/helpContent";
import { MANUAL } from "../lib/manualContent";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  HelpCircle, Search, BookOpen, Sparkles as SparklesIcon,
  Rocket, UserCog, FolderKanban, Receipt, Repeat, ShieldCheck,
  LayoutDashboard, ScanLine, Images, Wallet, Tags, BarChart3, CalendarDays,
  Lock, PiggyBank, Upload, Sparkles, Copy, Bell, Database, Moon,
  LogIn, ChevronDown, Plus, Type, Save, Check, Layers, Target, Percent,
  Zap, Pause, Download, ZoomIn, KeyRound, Unlock, WifiOff, FileText, Pencil, Share2,
} from "lucide-react";

const ICONS = {
  Rocket, UserCog, FolderKanban, Receipt, Repeat, ShieldCheck, LayoutDashboard,
  ScanLine, Images, Wallet, Tags, BarChart3, CalendarDays, Lock, PiggyBank,
  Upload, Sparkles, Copy, Bell, Database, Moon,
  LogIn, ChevronDown, Plus, Type, Save, Check, Layers, Target, Percent,
  Zap, Pause, Download, ZoomIn, KeyRound, Unlock, WifiOff, FileText, Pencil, Share2,
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDate(ymd) {
  const [y, m, d] = String(ymd || "").split("-");
  if (!y || !m || !d) return ymd || "";
  return `${d} ${MESES[Number(m) - 1] || m} ${y}`;
}

const TABS = [
  { id: "manual", label: "Manual de uso", icon: BookOpen },
  { id: "novedades", label: "Novedades y mejoras", icon: SparklesIcon },
];

export default function Help() {
  const [tab, setTab] = useState("manual");
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const manual = useMemo(() => {
    if (!term) return MANUAL;
    return MANUAL.filter(
      (it) =>
        it.title.toLowerCase().includes(term) ||
        (it.steps || []).some((s) => String(s).toLowerCase().includes(term))
    );
  }, [term]);

  const novedades = useMemo(() => {
    const sorted = [...HELP_ITEMS].sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
    if (!term) return sorted;
    return sorted.filter(
      (it) =>
        it.title.toLowerCase().includes(term) ||
        (it.body || []).some((b) => String(b).toLowerCase().includes(term))
    );
  }, [term]);

  const latest = HELP_ITEMS.reduce((mx, it) => (it.updated > mx ? it.updated : mx), "");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Ayuda</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">
          Manual y novedades
        </h1>
        <p className="text-[#5C626A] mt-2">
          Guía paso a paso para empezar, y todas las funciones con su fecha de actualización.
        </p>
      </div>

      {/* Pestañas */}
      <nav data-testid="help-tabs" aria-label="Secciones de ayuda" className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              data-testid={`help-tab-${t.id}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
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

      <Card className="p-4 rounded-2xl border-[#E2DDD3] bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C626A]" />
          <Input
            data-testid="help-search"
            aria-label="Buscar en la ayuda"
            placeholder={tab === "manual" ? "Buscar en el manual…" : "Buscar en las novedades…"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </Card>

      {tab === "manual" ? (
        manual.length === 0 ? (
          <Empty q={q} />
        ) : (
          <div className="space-y-4">
            {manual.map((it) => {
              const Icon = ICONS[it.icon] || BookOpen;
              return (
                <Card
                  key={it.id}
                  data-testid={`manual-item-${it.id}`}
                  className="p-5 rounded-2xl border-[#E2DDD3] bg-white"
                >
                  <h2 className="font-heading font-bold text-lg text-[#1A1D20] flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[#D95D39]/10 text-[#D95D39] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    {it.title}
                  </h2>
                  <ol className="mt-3 space-y-2">
                    {(it.steps || []).map((s, i) => {
                      const step = typeof s === "string" ? { t: s, i: null } : s;
                      const StepIcon = ICONS[step.i] || Check;
                      return (
                        <li key={i} className="text-sm text-[#1A1D20] flex gap-3">
                          <span className="w-7 h-7 rounded-lg bg-[#F2EFE9] border border-[#E2DDD3] text-[#D95D39] flex items-center justify-center shrink-0 mt-0.5">
                            <StepIcon className="w-3.5 h-3.5" />
                          </span>
                          <span>{step.t}</span>
                        </li>
                      );
                    })}
                  </ol>
                  {it.image && (
                    <img
                      src={it.image}
                      alt={`Captura: ${it.title}`}
                      loading="lazy"
                      className="mt-4 w-full rounded-xl border border-[#E2DDD3] bg-[#F2EFE9]"
                    />
                  )}
                </Card>
              );
            })}
          </div>
        )
      ) : novedades.length === 0 ? (
        <Empty q={q} />
      ) : (
        <>
          <p className="text-xs text-[#5C626A]">
            Última actualización: <span className="font-mono">{formatDate(latest)}</span>. Lo más
            reciente aparece primero.
          </p>
          <div className="space-y-4">
            {novedades.map((it) => {
              const Icon = ICONS[it.icon] || HelpCircle;
              return (
                <Card
                  key={it.id}
                  data-testid={`help-item-${it.id}`}
                  className="p-5 rounded-2xl border-[#E2DDD3] bg-white"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#1E293B] text-white flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-heading font-bold text-lg text-[#1A1D20]">{it.title}</h2>
                        <span className="text-[11px] font-mono uppercase tracking-widest text-[#5C626A] bg-[#F2EFE9] border border-[#E2DDD3] rounded-full px-2 py-0.5">
                          {formatDate(it.updated)}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {(it.body || []).map((b, i) => (
                          <li key={i} className="text-sm text-[#1A1D20] flex gap-2">
                            <span className="text-[#D95D39] mt-0.5">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Empty({ q }) {
  return (
    <div className="p-10 text-center text-[#5C626A]">
      <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>No hay resultados para «{q}».</p>
    </div>
  );
}
