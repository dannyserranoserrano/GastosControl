import { useEffect, useState } from "react";
import { eur } from "../lib/api";
import { useProjects } from "../lib/projectsContext";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import {
  loadGoals,
  saveGoals,
  goalId,
  contributionId,
  goalSummary,
  todayISO,
} from "../lib/goals";
import { PiggyBank, Plus, Trash2, Target, CheckCircle2, TrendingUp } from "lucide-react";

export default function GoalsManager() {
  const { activeProject } = useProjects();
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: "", target: "", deadline: "", note: "" });
  const [contrib, setContrib] = useState({});

  useEffect(() => {
    setGoals(loadGoals(activeProject));
  }, [activeProject]);

  const persist = (next) => {
    setGoals(next);
    saveGoals(activeProject, next);
  };

  const addGoal = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const target = Number(form.target || 0);
    if (!name) {
      toast.error("Indica un nombre para el objetivo");
      return;
    }
    if (!(target > 0)) {
      toast.error("Indica un importe objetivo mayor que 0");
      return;
    }
    const goal = {
      id: goalId(),
      name,
      target,
      deadline: form.deadline || "",
      note: form.note.trim(),
      contributions: [],
      created_at: new Date().toISOString(),
    };
    persist([...goals, goal]);
    setForm({ name: "", target: "", deadline: "", note: "" });
    toast.success("Objetivo creado");
  };

  const removeGoal = (id) => persist(goals.filter((g) => g.id !== id));

  const setC = (id, key, value) =>
    setContrib((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));

  const addContribution = (id) => {
    const c = contrib[id] || {};
    const amount = Number(c.amount || 0);
    if (!(amount > 0)) {
      toast.error("Indica un importe mayor que 0");
      return;
    }
    const next = goals.map((g) =>
      g.id === id
        ? {
            ...g,
            contributions: [
              ...(g.contributions || []),
              {
                id: contributionId(),
                amount,
                date: c.date || todayISO(),
                note: (c.note || "").trim(),
              },
            ],
          }
        : g
    );
    persist(next);
    setContrib((prev) => ({ ...prev, [id]: { amount: "", date: todayISO(), note: "" } }));
    toast.success("Aportación añadida");
  };

  const removeContribution = (goalId, contribId) => {
    const next = goals.map((g) =>
      g.id === goalId
        ? { ...g, contributions: (g.contributions || []).filter((c) => c.id !== contribId) }
        : g
    );
    persist(next);
  };

  const totals = goals.reduce(
    (acc, g) => {
      const s = goalSummary(g);
      acc.saved += s.saved;
      acc.target += s.target;
      return acc;
    },
    { saved: 0, target: 0 }
  );

  return (
    <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white" data-testid="goals-manager">
      <div className="flex items-center gap-2 mb-1">
        <PiggyBank className="w-5 h-5 text-[#D95D39]" />
        <h3 className="font-heading font-bold text-lg">Objetivos de ahorro</h3>
      </div>
      <p className="text-sm text-[#5C626A] mb-4">
        {activeProject
          ? `Objetivos del proyecto «${activeProject}».`
          : "Objetivos generales (sin proyecto)."}{" "}
        Registra aportaciones y controla tu progreso.
      </p>

      {goals.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat label="Objetivo total" value={eur(totals.target)} />
          <Stat label="Ahorrado" value={eur(totals.saved)} tone="text-emerald-700" />
          <Stat
            label="Progreso"
            value={totals.target > 0 ? `${((totals.saved / totals.target) * 100).toFixed(0)}%` : "—"}
          />
        </div>
      )}

      {/* Nueva objetivo */}
      <form onSubmit={addGoal} className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input
              data-testid="input-goal-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Entrada vivienda, Vacaciones…"
              className="rounded-xl bg-white"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Objetivo (€)</Label>
            <Input
              data-testid="input-goal-target"
              type="number"
              step="0.01"
              min="0"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              placeholder="0,00"
              className="rounded-xl bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha límite (opcional)</Label>
            <Input
              data-testid="input-goal-deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="rounded-xl bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nota (opcional)</Label>
            <Input
              data-testid="input-goal-note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="rounded-xl bg-white"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            data-testid="btn-add-goal"
            className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Crear objetivo
          </Button>
        </div>
      </form>

      {/* Lista */}
      <div className="mt-4 space-y-3">
        {goals.length === 0 ? (
          <p className="text-sm text-[#5C626A]">Aún no hay objetivos. Crea el primero arriba.</p>
        ) : (
          goals.map((g) => {
            const s = goalSummary(g);
            const daysLeft = g.deadline
              ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000)
              : null;
            const c = contrib[g.id] || {};
            return (
              <div
                key={g.id}
                data-testid={`goal-row-${g.id}`}
                className="rounded-xl border border-[#E2DDD3] bg-white p-3 sm:p-4"
              >
                <div className="flex items-start gap-2 flex-wrap">
                  <Target className="w-4 h-4 text-[#D95D39] mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1A1D20] truncate flex items-center gap-2">
                      {g.name}
                      {s.done && (
                        <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> conseguido
                        </span>
                      )}
                    </p>
                    {g.note && <p className="text-xs text-[#5C626A] mt-0.5">{g.note}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`btn-delete-goal-${g.id}`}
                    onClick={() => removeGoal(g.id)}
                    className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Eliminar objetivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mt-2">
                  <Progress
                    value={Math.min(s.pct, 100)}
                    indicatorClassName={s.done ? "bg-emerald-500" : ""}
                    className="h-2"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1 text-xs font-mono text-[#5C626A]">
                    <span>
                      {eur(s.saved)} de {eur(s.target)} · {s.pct.toFixed(1)}%
                    </span>
                    <span>
                      {s.done
                        ? "Objetivo alcanzado"
                        : `Faltan ${eur(s.remaining)}${s.monthsToGoal ? ` · ~${s.monthsToGoal} mes(es)` : ""}`}
                    </span>
                  </div>
                  {g.deadline && (
                    <p className={`text-xs mt-1 ${daysLeft !== null && daysLeft < 0 ? "text-red-700" : "text-[#5C626A]"}`}>
                      Fecha límite: {g.deadline}
                      {daysLeft !== null
                        ? daysLeft < 0
                          ? " · vencida"
                          : ` · ${daysLeft} día(s)`
                        : ""}
                    </p>
                  )}
                </div>

                {/* Aportaciones */}
                <div className="mt-3 rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-[#5C626A]">Importe</Label>
                      <Input
                        data-testid={`input-contrib-amount-${g.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={c.amount ?? ""}
                        onChange={(e) => setC(g.id, "amount", e.target.value)}
                        placeholder="0,00"
                        className="rounded-lg bg-white w-28 h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-[#5C626A]">Fecha</Label>
                      <Input
                        type="date"
                        value={c.date ?? todayISO()}
                        onChange={(e) => setC(g.id, "date", e.target.value)}
                        className="rounded-lg bg-white h-9"
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-[120px]">
                      <Label className="text-[11px] text-[#5C626A]">Nota (opcional)</Label>
                      <Input
                        value={c.note ?? ""}
                        onChange={(e) => setC(g.id, "note", e.target.value)}
                        placeholder="Ej. nómina enero"
                        className="rounded-lg bg-white h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      data-testid={`btn-add-contrib-${g.id}`}
                      onClick={() => addContribution(g.id)}
                      className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-lg h-9"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Aportar
                    </Button>
                  </div>

                  {(g.contributions || []).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {[...(g.contributions || [])]
                        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
                        .map((ap) => (
                          <li key={ap.id} className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-[#5C626A]">{ap.date}</span>
                            <span className="font-semibold text-[#1A1D20]">{eur(ap.amount)}</span>
                            {ap.note && <span className="text-[#5C626A] truncate">{ap.note}</span>}
                            <div className="flex-1" />
                            <button
                              type="button"
                              onClick={() => removeContribution(g.id, ap.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Eliminar aportación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                  {(g.contributions || []).length > 1 && (
                    <p className="text-[11px] text-[#5C626A] mt-1 inline-flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Ritmo estimado: {eur(s.monthlyRate)}/mes
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3">
      <div className="text-[11px] font-mono uppercase tracking-widest text-[#5C626A]">{label}</div>
      <div className={`font-heading font-bold text-lg mt-1 ${tone || "text-[#1A1D20]"}`}>{value}</div>
    </div>
  );
}
