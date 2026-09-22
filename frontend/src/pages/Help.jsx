import { useMemo, useState } from "react";
import { HELP_ITEMS } from "../lib/helpContent";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  HelpCircle, Search, UserCog, FolderKanban, Receipt, Repeat, ShieldCheck,
  LayoutDashboard, ScanLine, Images, Wallet, Tags, BarChart3, CalendarDays,
  Lock, PiggyBank, Upload, Sparkles, Copy, Bell, Database, Moon,
} from "lucide-react";

const ICONS = {
  UserCog, FolderKanban, Receipt, Repeat, ShieldCheck, LayoutDashboard, ScanLine,
  Images, Wallet, Tags, BarChart3, CalendarDays, Lock, PiggyBank, Upload,
  Sparkles, Copy, Bell, Database, Moon,
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDate(ymd) {
  const [y, m, d] = String(ymd || "").split("-");
  if (!y || !m || !d) return ymd || "";
  return `${d} ${MESES[Number(m) - 1] || m} ${y}`;
}

export default function Help() {
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const sorted = [...HELP_ITEMS].sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
    const term = q.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter(
      (it) =>
        it.title.toLowerCase().includes(term) ||
        (it.body || []).some((b) => String(b).toLowerCase().includes(term))
    );
  }, [q]);

  const latest = HELP_ITEMS.reduce((mx, it) => (it.updated > mx ? it.updated : mx), "");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">Ayuda</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">
          Cómo funciona GastoControl
        </h1>
        <p className="text-[#5C626A] mt-2">
          Todas las funciones de la app, ordenadas por fecha de actualización: lo más reciente
          aparece primero.
        </p>
        <p className="text-xs text-[#5C626A] mt-1">
          Última actualización: <span className="font-mono">{formatDate(latest)}</span>
        </p>
      </div>

      <Card className="p-4 rounded-2xl border-[#E2DDD3] bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C626A]" />
          <Input
            data-testid="help-search"
            placeholder="Buscar en la ayuda…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </Card>

      {items.length === 0 ? (
        <div className="p-10 text-center text-[#5C626A]">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay resultados para «{q}».</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => {
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
      )}
    </div>
  );
}
