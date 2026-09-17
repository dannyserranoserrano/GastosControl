import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useCategories } from "../lib/categoriesContext";

export default function ExpenseForm({ initial, onSubmit, submitLabel = "Guardar", extra }) {
	const { categories } = useCategories();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    vendor: "",
    date: today,
    amount: "",
    category: "General",
    notes: "",
    ...initial,
  });

  useEffect(() => {
    if (initial) setForm((f) => ({ ...f, ...initial }));
  }, [initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handle = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      amount: Number(form.amount || 0),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handle} className="space-y-4" data-testid="expense-form">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Proveedor / Comercio</Label>
          <Input
            data-testid="input-vendor"
            value={form.vendor}
            onChange={(e) => set("vendor", e.target.value)}
            placeholder="Ej. Supermercado"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input
            data-testid="input-date"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Importe total (€)</Label>
          <Input
            data-testid="input-amount"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0,00"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Select value={form.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.name} value={c.name} data-testid={`cat-opt-${c.name}`}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Textarea
          data-testid="input-notes"
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Detalles adicionales (opcional)"
        />
      </div>
      {extra}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          data-testid="btn-submit-expense"
          className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
