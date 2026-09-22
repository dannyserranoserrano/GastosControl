import { useState } from "react";
import { useProjects } from "../lib/projectsContext";
import { ALLOWED_ICONS, ALLOWED_COLORS, COLOR_MAP } from "../lib/constants";
import { ICONS, iconFor } from "../lib/icons";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Check, Pencil, X } from "lucide-react";

function ColorDot({ color }) {
  const dot = (COLOR_MAP[color] || COLOR_MAP.stone).dot;
  return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dot }} aria-hidden />;
}

export default function ProjectSettings() {
  const {
    projects,
    projectMeta,
    activeProject,
    setActiveProject,
    addProject,
    removeProject,
    renameProject,
    updateProject,
  } = useProjects();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", color: "indigo", icon: "Package" });
  const [busy, setBusy] = useState(false);

  const create = () => {
    const n = addProject(name);
    if (!n) {
      toast.error("Escribe un nombre de proyecto");
      return;
    }
    setName("");
    setActiveProject(n);
    toast.success(`Proyecto «${n}» seleccionado`);
  };

  const startEdit = (p) => {
    const meta = projectMeta[p] || {};
    setEditing(p);
    setForm({
      name: p,
      description: meta.description || "",
      color: meta.color || "indigo",
      icon: meta.icon || "Package",
    });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    const dst = form.name.trim();
    if (!dst) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    setBusy(true);
    try {
      const finalName = dst === editing ? editing : await renameProject(editing, dst);
      updateProject(finalName, {
        description: form.description.trim(),
        color: form.color,
        icon: form.icon,
      });
      toast.success("Proyecto actualizado");
      cancelEdit();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const PreviewIcon = iconFor(form.icon);
  const previewCls = (COLOR_MAP[form.color] || COLOR_MAP.stone).cls;

  return (
    <div className="space-y-5">
      <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <h3 className="font-heading font-bold text-lg">Proyecto activo</h3>
        <p className="text-sm text-[#5C626A] mt-1 mb-4">
          Todo lo que hagas (gastos, presupuesto, categorías, estadísticas) se aplica al proyecto seleccionado.
        </p>
        {projects.length === 0 ? (
          <p className="text-sm text-[#5C626A]">Aún no hay proyectos. Crea el primero más abajo.</p>
        ) : (
          <Select value={activeProject} onValueChange={setActiveProject}>
            <SelectTrigger data-testid="select-project" className="rounded-xl w-full sm:w-[280px]">
              <SelectValue placeholder="Selecciona un proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => {
                const Icon = iconFor(projectMeta[p]?.icon);
                return (
                  <SelectItem key={p} value={p} data-testid={`project-opt-${p}`}>
                    <span className="inline-flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <ColorDot color={projectMeta[p]?.color} />
                      {p}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </Card>

      <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <h3 className="font-heading font-bold text-lg">Gestionar proyectos</h3>
        <p className="text-sm text-[#5C626A] mt-1 mb-4">Crea, edita la ficha o elimina proyectos.</p>

        <div className="flex gap-2">
          <Input
            data-testid="input-new-project"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), create())}
            placeholder="Ej. Reforma cocina, Obra centro…"
            className="rounded-xl"
            maxLength={80}
          />
          <Button
            data-testid="btn-create-project"
            onClick={create}
            className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" /> Crear
          </Button>
        </div>

        <div className="mt-4">
          {projects.length === 0 ? (
            <p className="text-sm text-[#5C626A]">Aún no hay proyectos. Crea el primero arriba.</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => {
                const meta = projectMeta[p] || {};
                const Icon = iconFor(meta.icon);
                const cls = (COLOR_MAP[meta.color] || COLOR_MAP.stone).cls;
                return (
                  <li
                    key={p}
                    data-testid={`project-row-${p}`}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      activeProject === p ? "border-[#D95D39] bg-[#FFF8F4]" : "border-[#E2DDD3] bg-white"
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${cls}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <button className="flex-1 min-w-0 text-left" onClick={() => setActiveProject(p)} data-testid={`btn-use-project-${p}`}>
                      <span className="block text-sm font-medium text-[#1A1D20] truncate flex items-center gap-2">
                        {p}
                        {activeProject === p && (
                          <span className="text-xs text-[#D95D39] inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> activo
                          </span>
                        )}
                      </span>
                      {meta.description && (
                        <span className="block text-xs text-[#5C626A] truncate">{meta.description}</span>
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`btn-edit-project-${p}`}
                      onClick={() => (editing === p ? cancelEdit() : startEdit(p))}
                      className="rounded-lg text-[#5C626A] shrink-0"
                      title="Editar ficha"
                    >
                      {editing === p ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`btn-delete-project-${p}`}
                      onClick={() => removeProject(p)}
                      className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                      title="Eliminar proyecto (no borra sus gastos)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {editing && (
          <div className="mt-4 rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-4 space-y-3">
            <p className="text-sm font-semibold text-[#1A1D20]">Editar ficha</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre</Label>
              <Input
                data-testid="input-project-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-xl bg-white"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción (opcional)</Label>
              <Textarea
                data-testid="input-project-description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl bg-white"
                maxLength={200}
                placeholder="Notas del proyecto…"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Icono</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALLOWED_ICONS.map((n) => {
                  const Ic = ICONS[n];
                  const activeIcon = form.icon === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      data-testid={`project-icon-${n}`}
                      onClick={() => setForm({ ...form, icon: n })}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                        activeIcon ? "bg-[#1E293B] text-white border-[#1E293B]" : "bg-white text-[#1A1D20] border-[#E2DDD3]"
                      }`}
                      title={n}
                    >
                      <Ic className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALLOWED_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    data-testid={`project-color-${c}`}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-lg border-2 ${form.color === c ? "border-[#1A1D20] scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: COLOR_MAP[c].dot }}
                    title={c}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-[#5C626A] flex items-center gap-1">
                Vista previa:
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${previewCls}`}>
                  <PreviewIcon className="w-3.5 h-3.5" /> {form.name.trim() || "Proyecto"}
                </span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl border-[#E2DDD3]" onClick={cancelEdit} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  data-testid="btn-save-project"
                  onClick={saveEdit}
                  disabled={busy}
                  className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
