import { useState } from "react";
import { api } from "../lib/api";
import { useCategories } from "../lib/categoriesContext";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { parseCsv, mapRowsToExpenses, makeTemplateCsv, parseOfx, looksLikeOfx } from "../lib/csv";
import { suggestFor, loadRules } from "../lib/autoRules";
import { toast } from "sonner";
import { Upload, FileDown, CheckCircle2, AlertTriangle, XCircle, Loader2, Wand2 } from "lucide-react";

import { normalizeText as normVendor } from "../lib/text";

function downloadTemplate() {
  const blob = new Blob(["\uFEFF" + makeTemplateCsv()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla-gastos.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CsvImportDialog({ existing = [], onDone, defaultProject = "", closedMonths = [] }) {
  const { categories } = useCategories();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [records, setRecords] = useState([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoCat, setAutoCat] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const catNames = new Set(categories.map((c) => c.name));

  const reset = () => {
    setFileName("");
    setRecords([]);
    setResult(null);
    setImporting(false);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setResult(null);
    try {
      const text = await file.text();
      const isOfx = looksLikeOfx(text) || /\.ofx$/i.test(file.name || "");
      const { records: recs } = isOfx
        ? parseOfx(text)
        : mapRowsToExpenses(parseCsv(text));

      // Auto-categorización por reglas e historial
      const rules = loadRules();
      recs.forEach((r) => {
        if (!r.data.category && autoCat) {
          const s = suggestFor(r.data.vendor, existing, rules);
          if (s?.category) {
            r.data.category = s.category;
            r.auto = s.category;
          }
          if (s?.project && !r.data.project) r.data.project = s.project;
        }
        if (!r.data.category) r.data.category = "Otros";
      });

      const existingKeys = new Set(
        (existing || []).map(
          (e) => `${e.date}|${Number(e.amount || 0).toFixed(2)}|${normVendor(e.vendor)}`
        )
      );
      const seen = new Set();
      const enriched = recs.map((r) => {
        const key = `${r.data.date}|${Number(r.data.amount || 0).toFixed(2)}|${normVendor(r.data.vendor)}`;
        const dupExisting = r.errors.length === 0 && existingKeys.has(key);
        const dupInFile = r.errors.length === 0 && seen.has(key);
        seen.add(key);
        const warnings = [];
        if (r.data.category && !catNames.has(r.data.category)) {
          warnings.push(`categoría «${r.data.category}» no existe (se usará Otros)`);
        }
        const errors = [...r.errors];
        const ym = String(r.data.date || "").slice(0, 7);
        if (errors.length === 0 && (closedMonths || []).includes(ym)) {
          errors.push(`mes ${ym} cerrado (reábrelo para importar)`);
        }
        return { ...r, errors, warnings, duplicate: dupExisting || dupInFile, dupInFile };
      });

      setFileName(file.name);
      setRecords(enriched);
      if (enriched.length === 0) toast.error("El archivo no contiene filas de datos");
    } catch (e) {
      toast.error("No se pudo leer el archivo");
    }
  };

  const valid = records.filter((r) => r.errors.length === 0);
  const invalidCount = records.length - valid.length;
  const duplicateCount = valid.filter((r) => r.duplicate).length;
  const toImport = valid.filter((r) => !(skipDuplicates && r.duplicate));

  const doImport = async () => {
    setImporting(true);
    let ok = 0;
    let failed = 0;
    for (const r of toImport) {
      try {
        await api.post("/expenses", {
          ...r.data,
          project: r.data.project || defaultProject || "",
        });
        ok++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setResult({ ok, failed, total: toImport.length });
    if (ok > 0) {
      toast.success(`${ok} gasto(s) importado(s)`);
      onDone?.();
    }
    if (failed > 0) toast.error(`${failed} gasto(s) no se pudieron importar`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          data-testid="btn-import"
          variant="outline"
          className="rounded-xl border-[#E2DDD3]"
        >
          <Upload className="w-4 h-4 mr-2" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Importar gastos o extracto bancario</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-[#5C626A] -mt-1">
          Acepta <strong>CSV</strong> (separador <code className="font-mono">;</code>,{" "}
          <code className="font-mono">,</code> o tabulador) y extractos <strong>OFX</strong>. Detecta
          columnas de fecha, concepto/descripción, importe o Debe/Haber. Los ingresos se omiten.
          <button
            type="button"
            onClick={downloadTemplate}
            className="ml-1 text-[#D95D39] hover:underline inline-flex items-center gap-1"
          >
            <FileDown className="w-3.5 h-3.5" /> Descargar plantilla CSV
          </button>
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-[#1A1D20]">
          <input
            type="checkbox"
            checked={autoCat}
            onChange={(e) => setAutoCat(e.target.checked)}
            data-testid="chk-auto-categorize"
          />
          <Wand2 className="w-4 h-4 text-[#D95D39]" /> Auto-categorizar por reglas e historial
        </label>

        <div className="mt-3">
          <label
            className="block rounded-xl border-2 border-dashed border-[#E2DDD3] bg-[#FAF8F5] p-4 text-center cursor-pointer hover:bg-[#F2EFE9]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              type="file"
              accept=".csv,.ofx,.txt,text/csv,application/x-ofx"
              className="hidden"
              data-testid="input-csv-file"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Upload className="w-5 h-5 mx-auto text-[#5C626A]" />
            <p className="mt-1 text-sm text-[#1A1D20] font-medium">
              {fileName || "Selecciona un archivo CSV"}
            </p>
            <p className="text-xs text-[#5C626A]">o arrástralo aquí…</p>
          </label>
        </div>

        {records.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> {valid.length} válidos
              </span>
              {duplicateCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" /> {duplicateCount} posible(s) duplicado(s)
                </span>
              )}
              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1 text-red-700">
                  <XCircle className="w-3.5 h-3.5" /> {invalidCount} con errores
                </span>
              )}
              {duplicateCount > 0 && (
                <label className="inline-flex items-center gap-1.5 ml-auto text-[#1A1D20]">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    data-testid="chk-skip-duplicates"
                  />
                  Omitir duplicados
                </label>
              )}
            </div>

            <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-[#E2DDD3]">
              <table className="w-full text-xs">
                <thead className="bg-[#FAF8F5] sticky top-0">
                  <tr className="text-left text-[#5C626A]">
                    <th className="px-2 py-2 font-mono">Línea</th>
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2">Proveedor</th>
                    <th className="px-2 py-2">Categoría</th>
                    <th className="px-2 py-2">Proyecto</th>
                    <th className="px-2 py-2 text-right">Importe</th>
                    <th className="px-2 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr
                      key={i}
                      data-testid={`csv-row-${i}`}
                      className={`border-t border-[#E2DDD3] ${
                        r.errors.length > 0 ? "bg-red-50" : r.duplicate ? "bg-amber-50" : ""
                      }`}
                    >
                      <td className="px-2 py-1.5 font-mono text-[#5C626A]">{r.line}</td>
                      <td className="px-2 py-1.5 font-mono">{r.data.date || "—"}</td>
                      <td className="px-2 py-1.5 truncate max-w-[140px]">{r.data.vendor || "—"}</td>
                      <td className="px-2 py-1.5">
                        {r.data.category}
                        {r.auto ? (
                          <span className="text-[#D95D39]"> · auto</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 truncate max-w-[120px]">{r.data.project || "—"}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {Number.isFinite(r.data.amount) ? r.data.amount.toFixed(2) : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {r.errors.length > 0 ? (
                          <span className="text-red-700">{r.errors.join(", ")}</span>
                        ) : r.duplicate ? (
                          <span className="text-amber-700">
                            duplicado{r.dupInFile ? " (en el archivo)" : ""}
                          </span>
                        ) : r.warnings.length > 0 ? (
                          <span className="text-amber-700">{r.warnings.join(", ")}</span>
                        ) : (
                          <span className="text-emerald-700">ok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[#5C626A]" data-testid="csv-summary">
                Se importarán <strong>{toImport.length}</strong> de {records.length} fila(s).
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl border-[#E2DDD3]"
                  onClick={reset}
                  disabled={importing}
                >
                  Limpiar
                </Button>
                <Button
                  data-testid="btn-confirm-import"
                  onClick={doImport}
                  disabled={importing || toImport.length === 0}
                  className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando…
                    </>
                  ) : (
                    `Importar ${toImport.length}`
                  )}
                </Button>
              </div>
            </div>

            {result && (
              <div
                data-testid="csv-result"
                className={`mt-2 rounded-xl border p-3 text-sm ${
                  result.failed > 0
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                Importados {result.ok} de {result.total}
                {result.failed > 0 ? ` · ${result.failed} con error` : ""}.
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
