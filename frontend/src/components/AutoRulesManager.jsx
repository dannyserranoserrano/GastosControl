import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useCategories } from "../lib/categoriesContext";
import { loadRules, saveRules, ruleId } from "../lib/autoRules";
import { toast } from "sonner";
import { Wand2, Plus, Trash2 } from "lucide-react";

export default function AutoRulesManager() {
  const { categories } = useCategories();
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState(() => loadRules());
  const [match, setMatch] = useState("");
  const [category, setCategory] = useState("General");
  const [project, setProject] = useState("");

  const persist = (next) => {
    setRules(next);
    saveRules(next);
  };

  const addRule = () => {
    const pattern = match.trim();
    if (!pattern) {
      toast.error("Indica un texto a buscar (ej. el nombre del proveedor)");
      return;
    }
    if (rules.some((r) => r.match.toLowerCase() === pattern.toLowerCase())) {
      toast.error("Ya existe una regla con ese texto");
      return;
    }
    const next = [...rules, { id: ruleId(), match: pattern, category, project: project.trim() }];
    persist(next);
    setMatch("");
    setProject("");
    toast.success("Regla añadida");
  };

  const removeRule = (id) => {
    persist(rules.filter((r) => r.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="btn-auto-rules"
          variant="outline"
          className="rounded-xl border-[#E2DDD3]"
        >
          <Wand2 className="w-4 h-4 mr-2" /> Reglas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Reglas de auto-categorización</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#5C626A] -mt-1">
          Cuando un proveedor contenga el texto de una regla, se asignará automáticamente la categoría
          y el proyecto. Además, la app aprende de tus gastos anteriores por proveedor.
        </p>

        <div className="mt-2 rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Si el proveedor contiene…</Label>
            <Input
              data-testid="input-rule-match"
              value={match}
              onChange={(e) => setMatch(e.target.value)}
              placeholder="Ej. Mercadona, Iberdrola…"
              className="rounded-xl bg-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-rule-category" className="rounded-xl bg-white">
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
              <Label className="text-xs">Proyecto (opcional)</Label>
              <Input
                data-testid="input-rule-project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Ej. Reforma cocina"
                className="rounded-xl bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              data-testid="btn-add-rule"
              onClick={addRule}
              className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" /> Añadir regla
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A] mb-2">
            Reglas activas ({rules.length})
          </p>
          {rules.length === 0 ? (
            <p className="text-sm text-[#5C626A]">Aún no tienes reglas. Añade la primera arriba.</p>
          ) : (
            <ul className="space-y-2">
              {rules.map((r) => (
                <li
                  key={r.id}
                  data-testid={`rule-row-${r.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[#E2DDD3] bg-white p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1A1D20] truncate">
                      contiene «{r.match}»
                    </p>
                    <p className="text-xs text-[#5C626A] mt-0.5">
                      → categoría <strong>{r.category}</strong>
                      {r.project ? <> · proyecto <strong>{r.project}</strong></> : null}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`btn-delete-rule-${r.id}`}
                    onClick={() => removeRule(r.id)}
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
