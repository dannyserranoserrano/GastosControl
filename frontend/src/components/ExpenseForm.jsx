import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useCategories } from "../lib/categoriesContext";
import { api } from "../lib/api";
import ReceiptImage from "./ReceiptImage";
import { fileToDataUrl } from "../lib/localBackend";
import { loadRules, suggestFor } from "../lib/autoRules";
import { Sparkles, Plus } from "lucide-react";

const receiptsOf = (obj) => {
  if (Array.isArray(obj?.receipts) && obj.receipts.length) return obj.receipts;
  if (obj?.receipt_path) {
    return [{ path: obj.receipt_path, url: obj.receipt_url || obj.receipt_path }];
  }
  return [];
};

export default function ExpenseForm({ initial, onSubmit, submitLabel = "Guardar", extra, defaultProject }) {
	const { categories } = useCategories();
  const today = new Date().toISOString().slice(0, 10);
  const editing = !!initial;
  const [form, setForm] = useState({
    vendor: "",
    date: today,
    amount: "",
    category: "General",
    project: defaultProject || "",
    notes: "",
    ...initial,
    receipts: receiptsOf(initial),
  });
  const [history, setHistory] = useState([]);
  const rulesRef = useRef(loadRules());
  const touchedRef = useRef({ category: editing, project: editing });

  useEffect(() => {
    if (initial) setForm((f) => ({ ...f, ...initial, receipts: receiptsOf(initial) }));
  }, [initial]);

  useEffect(() => {
    if (editing) return;
    let alive = true;
    api
      .get("/expenses")
      .then((r) => { if (alive) setHistory(r.data || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [editing]);

  const suggestion = useMemo(() => {
    if (editing) return null;
    return suggestFor(form.vendor, history, rulesRef.current);
  }, [editing, form.vendor, history]);

  useEffect(() => {
    if (!suggestion) return;
    setForm((f) => {
      let next = f;
      if (
        !touchedRef.current.category &&
        suggestion.category &&
        categories.some((c) => c.name === suggestion.category) &&
        f.category !== suggestion.category
      ) {
        next = { ...next, category: suggestion.category };
      }
      if (
        !touchedRef.current.project &&
        suggestion.project &&
        !String(next.project || "").trim()
      ) {
        next = { ...next, project: suggestion.project };
      }
      return next;
    });
  }, [suggestion, categories]);

  const set = (k, v) => {
    if (k === "category" || k === "project") touchedRef.current[k] = true;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const addReceipts = async (files) => {
    const list = [];
    for (const file of Array.from(files || [])) {
      try {
        const dataUrl = await fileToDataUrl(file);
        if (dataUrl) list.push({ path: dataUrl, url: dataUrl });
      } catch {
        /* ignore */
      }
    }
    if (list.length) setForm((f) => ({ ...f, receipts: [...(f.receipts || []), ...list] }));
  };

  const removeReceipt = (i) =>
    setForm((f) => ({ ...f, receipts: (f.receipts || []).filter((_, k) => k !== i) }));

  const handle = (e) => {
    e.preventDefault();
    const receipts = form.receipts || [];
    const payload = {
      ...form,
      amount: Number(form.amount || 0),
      receipts,
      receipt_path: receipts[0]?.path || null,
      receipt_url: receipts[0]?.url || receipts[0]?.path || null,
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Proyecto / Obra <span className="text-[#8A8F96]">(opcional)</span></Label>
          <Input
            data-testid="input-project"
            value={form.project || ""}
            onChange={(e) => set("project", e.target.value)}
            placeholder="Ej. Reforma cocina, Obra centro…"
            maxLength={80}
          />
        </div>
      </div>

      {suggestion && (suggestion.category || suggestion.project) && (
        <p
          data-testid="autocat-hint"
          className="text-xs text-[#5C626A] flex items-start gap-1.5 rounded-xl bg-[#FAF8F5] border border-[#E2DDD3] p-2.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D95D39] mt-0.5 shrink-0" />
          <span>
            Sugerencia por {suggestion.source}
            {suggestion.category ? <> · categoría <strong>{suggestion.category}</strong></> : null}
            {suggestion.project ? <> · proyecto <strong>{suggestion.project}</strong></> : null}
            {" "}— puedes cambiarla si no encaja.
          </span>
        </p>
      )}

      <div className="space-y-1.5">
        <Label>
          Tickets / imágenes <span className="text-[#8A8F96]">(opcional, varias)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {(form.receipts || []).map((r, i) => (
            <div
              key={i}
              className="relative w-16 h-16 rounded-lg border border-[#E2DDD3] overflow-hidden bg-[#F2EFE9]"
            >
              <ReceiptImage
                receipt={r}
                alt="ticket"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeReceipt(i)}
                data-testid={`btn-remove-receipt-${i}`}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
                title="Quitar imagen"
              >
                ×
              </button>
            </div>
          ))}
          <label
            className="w-16 h-16 rounded-lg border-2 border-dashed border-[#E2DDD3] flex items-center justify-center cursor-pointer text-[#5C626A] hover:bg-[#FAF8F5]"
            title="Añadir imágenes"
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              data-testid="input-receipts"
              onChange={(e) => {
                addReceipts(e.target.files);
                e.target.value = "";
              }}
            />
            <Plus className="w-4 h-4" />
          </label>
        </div>
        <p className="text-[11px] text-[#5C626A]">
          Puedes adjuntar varias imágenes o PDFs del mismo gasto (ticket, factura, justificante…).
        </p>
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
