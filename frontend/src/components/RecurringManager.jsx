import { useState } from "react";
import { useCategories } from "../lib/categoriesContext";
import { useProjects } from "../lib/projectsContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { loadTemplates, saveTemplates, templateId, ymOf, FREQUENCIES, freqLabel } from "../lib/recurring";
import { generateRecurringNow } from "../lib/useRecurring";
import { toast } from "sonner";
import { Repeat, Plus, Trash2, Zap, Pencil, Check, X } from "lucide-react";

export default function RecurringManager({ onChanged }) {
  const { categories } = useCategories();
  const { activeProject } = useProjects();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState(() => loadTemplates());
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    vendor: "",
    amount: "",
    category: "General",
    project: "",
    notes: "",
    day: "1",
    freqChoice: "1",
    freqMonths: "5",
    start: ymOf(),
  });

  const persist = (next) => {
    setTemplates(next);
    saveTemplates(next);
  };

  const emptyForm = () => ({
    vendor: "",
    amount: "",
    category: "General",
    project: "",
    notes: "",
    day: "1",
    freqChoice: "1",
    freqMonths: "5",
    start: ymOf(),
  });

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const startEdit = (t) => {
    const freq = Number(t.freq) || 1;
    const isPreset = FREQUENCIES.some((f) => f.value === freq);
    setEditingId(t.id);
    setForm({
      vendor: t.vendor || "",
      amount: t.amount != null ? String(t.amount) : "",
      category: t.category || "General",
      project: t.project || "",
      notes: t.notes || "",
      day: String(t.day || 1),
      freqChoice: isPreset ? String(freq) : "custom",
      freqMonths: isPreset ? "5" : String(freq),
      start: t.start || ymOf(),
    });
  };

  const save = () => {
    if (!form.vendor.trim()) {
      toast.error("Indica el proveedor o concepto");
      return;
    }
    const amount = Number(form.amount || 0);
    if (!(amount > 0)) {
      toast.error("Indica un importe mayor que 0");
      return;
    }
    const day = Math.min(Math.max(1, Number(form.day) || 1), 31);
    const freq =
      form.freqChoice === "custom"
        ? Math.min(120, Math.max(1, Number(form.freqMonths) || 1))
        : Math.max(1, Number(form.freqChoice) || 1);
    const base = {
      vendor: form.vendor.trim(),
      amount,
      category: form.category,
      project: form.project.trim() || activeProject || "",
      notes: form.notes.trim(),
      day,
      freq,
      start: form.start || ymOf(),
    };

    if (editingId) {
      persist(templates.map((t) => (t.id === editingId ? { ...t, ...base } : t)));
      toast.success("Recurrente actualizado");
      cancelEdit();
    } else {
      const tpl = {
        id: templateId(),
        ...base,
        active: true,
        generated: [],
        created_at: new Date().toISOString(),
      };
      persist([...templates, tpl]);
      setForm(emptyForm());
      toast.success("Gasto recurrente añadido");
    }
  };

  const remove = (id) => persist(templates.filter((t) => t.id !== id));

  const toggle = (id) =>
    persist(templates.map((t) => (t.id === id ? { ...t, active: !t.active } : t)));

  const generateNow = async (t) => {
    try {
      const res = await generateRecurringNow(t);
      if (res === "exists") {
        toast.info("Ya se generó este periodo para esta plantilla");
        return;
      }
      if (res === "not-due") {
        toast.info("Este recurrente no toca este mes");
        return;
      }
      setTemplates(loadTemplates());
      toast.success("Gasto generado");
      onChanged?.();
    } catch {
      toast.error("No se pudo generar el gasto");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) cancelEdit();
      }}
    >
      <DialogTrigger asChild>
        <Button
          data-testid="btn-recurring"
          variant="outline"
          className="rounded-xl border-[#E2DDD3]"
        >
          <Repeat className="w-4 h-4 mr-2" /> Recurrentes
          {templates.length > 0 && (
            <span className="ml-2 text-xs rounded-full bg-[#1E293B] text-white px-1.5">
              {templates.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Gastos recurrentes</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#5C626A] -mt-1">
          Se generan automáticamente al abrir la app, según su frecuencia (mensual, bimestral,
          trimestral…), a partir del mes de inicio.
        </p>

        <div className="mt-2 rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Proveedor / concepto</Label>
              <Input
                data-testid="input-rec-vendor"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="Ej. Alquiler, Netflix…"
                className="rounded-xl bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Importe (€)</Label>
              <Input
                data-testid="input-rec-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
                className="rounded-xl bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="select-rec-category" className="rounded-xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frecuencia</Label>
              <Select
                value={form.freqChoice}
                onValueChange={(v) => setForm({ ...form, freqChoice: v })}
              >
                <SelectTrigger data-testid="select-rec-freq" className="rounded-xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={String(f.value)}>
                      {f.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Personalizada…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.freqChoice === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Cada cuántos meses</Label>
                <Input
                  data-testid="input-rec-freq-months"
                  type="number"
                  min="1"
                  max="120"
                  value={form.freqMonths}
                  onChange={(e) => setForm({ ...form, freqMonths: e.target.value })}
                  className="rounded-xl bg-white"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Mes de inicio</Label>
              <Input
                data-testid="input-rec-start"
                type="month"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                className="rounded-xl bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Día del mes (1-31)</Label>
              <Input
                data-testid="input-rec-day"
                type="number"
                min="1"
                max="31"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
                className="rounded-xl bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Proyecto (opcional)</Label>
              <Input
                data-testid="input-rec-project"
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                placeholder="Ej. Reforma cocina"
                className="rounded-xl bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas (opcional)</Label>
              <Input
                data-testid="input-rec-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="rounded-xl bg-white"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {editingId ? (
              <span className="text-xs text-[#D95D39] inline-flex items-center gap-1">
                <Pencil className="w-3.5 h-3.5" /> Editando una plantilla
              </span>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {editingId && (
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  data-testid="btn-cancel-recurring"
                  className="rounded-xl border-[#E2DDD3]"
                >
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
              )}
              <Button
                data-testid="btn-add-recurring"
                onClick={save}
                className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
              >
                {editingId ? (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Guardar
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> Añadir
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A] mb-2">
            Plantillas ({templates.length})
          </p>
          {templates.length === 0 ? (
            <p className="text-sm text-[#5C626A]">Aún no hay gastos recurrentes.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-auto">
              {templates.map((t) => (
                <li
                  key={t.id}
                  data-testid={`recurring-row-${t.id}`}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    editingId === t.id
                      ? "border-[#D95D39] bg-[#FFF8F4]"
                      : t.active
                        ? "border-[#E2DDD3] bg-white"
                        : "border-[#E2DDD3] bg-[#FAF8F5] opacity-70"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1A1D20] truncate">
                      {t.vendor} · {Number(t.amount).toFixed(2)}€
                    </p>
                    <p className="text-xs text-[#5C626A] mt-0.5">
                      {freqLabel(t.freq)} · día {t.day} · {t.category}
                      {t.project ? ` · ${t.project}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(t.id)}
                    data-testid={`btn-toggle-recurring-${t.id}`}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      t.active
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                        : "border-[#E2DDD3] text-[#5C626A]"
                    }`}
                    title={t.active ? "Activo" : "Pausado"}
                  >
                    {t.active ? "Activo" : "Pausado"}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`btn-edit-recurring-${t.id}`}
                    onClick={() => (editingId === t.id ? cancelEdit() : startEdit(t))}
                    className="rounded-lg text-[#5C626A]"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`btn-generate-recurring-${t.id}`}
                    onClick={() => generateNow(t)}
                    className="rounded-lg"
                    title="Generar el periodo actual"
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`btn-delete-recurring-${t.id}`}
                    onClick={() => remove(t.id)}
                    className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
