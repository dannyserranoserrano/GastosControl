import { useState } from "react";
import { useProjects } from "../lib/projectsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { FolderKanban, Plus, Trash2, Check, Pencil, X } from "lucide-react";

const ALL = "__all__";

export default function ProjectSwitcher() {
  const { projects, activeProject, setActiveProject, addProject, removeProject, renameProject } = useProjects();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
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
    setEditing(p);
    setEditValue(p);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    const dst = editValue.trim();
    if (!dst || dst === editing) {
      cancelEdit();
      return;
    }
    setBusy(true);
    try {
      await renameProject(editing, dst);
      toast.success(`Proyecto renombrado a «${dst}»`);
      cancelEdit();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "No se pudo renombrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Select value={activeProject || ALL} onValueChange={(v) => setActiveProject(v === ALL ? "" : v)}>
        <SelectTrigger
          data-testid="select-project"
          className="w-[150px] sm:w-[190px] rounded-xl"
          title="Proyecto activo"
        >
          <SelectValue placeholder="Todos los proyectos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} data-testid="project-opt-all">
            Todos los proyectos
          </SelectItem>
          {projects.map((p) => (
            <SelectItem key={p} value={p} data-testid={`project-opt-${p}`}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            data-testid="btn-manage-projects"
            className="rounded-xl border-[#E2DDD3]"
            title="Gestionar proyectos"
          >
            <FolderKanban className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Proyectos</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#5C626A] -mt-1">
            Cada proyecto tiene sus propios gastos, presupuesto y estadísticas. Selecciona uno para
            trabajar solo con sus datos.
          </p>

          <div className="mt-2 flex gap-2">
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

          <div className="mt-3">
            <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A] mb-2">
              Tus proyectos ({projects.length})
            </p>
            {projects.length === 0 ? (
              <p className="text-sm text-[#5C626A]">Aún no hay proyectos. Crea el primero arriba.</p>
            ) : (
              <ul className="space-y-1.5 max-h-60 overflow-auto">
                {projects.map((p) => (
                  <li
                    key={p}
                    data-testid={`project-row-${p}`}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 ${
                      activeProject === p ? "border-[#D95D39] bg-[#FFF8F4]" : "border-[#E2DDD3] bg-white"
                    }`}
                  >
                    {editing === p ? (
                      <>
                        <Input
                          data-testid={`input-rename-project-${p}`}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveEdit();
                            } else if (e.key === "Escape") {
                              cancelEdit();
                            }
                          }}
                          className="flex-1 rounded-lg h-8"
                          maxLength={80}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`btn-save-rename-${p}`}
                          onClick={saveEdit}
                          disabled={busy}
                          className="rounded-lg text-emerald-700 hover:bg-emerald-50"
                          title="Guardar"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEdit}
                          disabled={busy}
                          className="rounded-lg text-[#5C626A]"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          className="flex-1 text-left text-sm font-medium text-[#1A1D20] truncate"
                          onClick={() => setActiveProject(p)}
                          data-testid={`btn-use-project-${p}`}
                        >
                          {p}
                        </button>
                        {activeProject === p && (
                          <span className="text-xs text-[#D95D39] inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> activo
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`btn-rename-project-${p}`}
                          onClick={() => startEdit(p)}
                          className="rounded-lg text-[#5C626A]"
                          title="Renombrar proyecto"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`btn-delete-project-${p}`}
                          onClick={() => removeProject(p)}
                          className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar proyecto (no borra sus gastos)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
