import { useRef, useState } from "react";
import { api, toBackendUrl, USE_REMOTE, budgetCrossing, scanReceipt } from "../lib/api";
import { useProjects } from "../lib/projectsContext";
import { loadClosed } from "../lib/closedMonths";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import ExpenseForm from "../components/ExpenseForm";
import { toast } from "sonner";
import { Camera, Upload, Sparkles, ScanLine, RefreshCw, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Scan() {
  const { activeProject } = useProjects();
  const [image, setImage] = useState(null);      // File
  const [previewUrl, setPreviewUrl] = useState(null);
  const isPdf = Boolean(
    image && (image.type === "application/pdf" || /\.pdf$/i.test(image.name || ""))
  );
  const [scanning, setScanning] = useState(false);
  const [extracted, setExtracted] = useState(null); // extracted data
  const [receiptPath, setReceiptPath] = useState(null);
  const [scannedReceipt, setScannedReceipt] = useState(null);
  const fileRef = useRef();
  const cameraRef = useRef();
  const navigate = useNavigate();

  const pick = (f) => {
    if (!f) return;
    setImage(f);
    setPreviewUrl(URL.createObjectURL(f));
    setExtracted(null);
    setReceiptPath(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) pick(f);
  };

  const scan = async () => {
    if (!image) return;
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("file", image);
      const data = await scanReceipt(fd);
      setExtracted(data.extracted);
      setReceiptPath(data.receipt_path);
      setScannedReceipt(
        data.receipt_path
          ? { path: data.receipt_path, url: data.receipt_url || data.receipt_path }
          : null
      );
      toast.success(USE_REMOTE ? "Ticket analizado con IA" : "Imagen adjuntada");
    } catch (e) {
      toast.error("No se pudo analizar el ticket");
    } finally {
      setScanning(false);
    }
  };

  const save = async (payload) => {
    if (loadClosed(activeProject).includes(String(payload.date || "").slice(0, 7))) {
      toast.error("El mes está cerrado. Reábrelo en el Informe para guardar.");
      return;
    }
    try {
      const params = activeProject ? { project: activeProject } : {};
      const beforeStats = (await api.get("/stats", { params })).data || {};
      await api.post("/expenses", { ...payload, project: payload.project || activeProject || "", receipt_path: receiptPath });
      const afterStats = (await api.get("/stats", { params })).data || {};
      const cross = budgetCrossing(
        beforeStats.progress,
        afterStats.progress,
        afterStats.alert_at
      );
      if (cross === "over") toast.error("Has superado el presupuesto total");
      else if (cross === "warn") {
        toast.warning(`Has superado el ${Math.round(afterStats.alert_at > 0 ? afterStats.alert_at : 80)}% de tu presupuesto`);
      }
      toast.success("Gasto guardado");
      // reset
      setImage(null);
      setPreviewUrl(null);
      setExtracted(null);
      setReceiptPath(null);
      setScannedReceipt(null);
      navigate("/gastos");
    } catch {
      toast.error("Error al guardar el gasto");
    }
  };

  const reset = () => {
    setImage(null);
    setPreviewUrl(null);
    setExtracted(null);
    setReceiptPath(null);
    setScannedReceipt(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">{USE_REMOTE ? "Escáner con IA" : "Adjuntar ticket"}</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">
          Escanea tu ticket
        </h1>
        <p className="text-[#5C626A] mt-2 max-w-2xl">
          {USE_REMOTE
            ? "Sube o fotografía un ticket. La IA extraerá comercio, fecha, importe, categoría y desglose."
            : "Sube o fotografía un ticket para adjuntarlo y completa los datos manualmente."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <Card
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="p-6 rounded-2xl border-[#E2DDD3] bg-white bp-grid relative overflow-hidden"
        >
          <h3 className="font-heading font-bold text-lg mb-3">1. Sube el ticket</h3>

          {!previewUrl ? (
            <div className="border-2 border-dashed border-[#D95D39]/40 rounded-2xl bg-[#FFF8F4] p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#D95D39]/10 flex items-center justify-center mb-4">
                <ScanLine className="w-8 h-8 text-[#D95D39]" />
              </div>
              <p className="font-semibold text-[#1A1D20]">Arrastra una foto aquí</p>
              <p className="text-sm text-[#5C626A] mt-1">JPG, PNG, WEBP o PDF</p>
              <div className="flex flex-wrap gap-2 justify-center mt-5">
                <Button
                  data-testid="btn-choose-file"
                  onClick={() => fileRef.current?.click()}
                  className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-xl"
                >
                  <Upload className="w-4 h-4 mr-2" /> Elegir archivo
                </Button>
                <Button
                  data-testid="btn-camera"
                  onClick={() => cameraRef.current?.click()}
                  variant="outline"
                  className="rounded-xl border-[#E2DDD3]"
                >
                  <Camera className="w-4 h-4 mr-2" /> Cámara
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                data-testid="input-file"
                onChange={(e) => pick(e.target.files?.[0])}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                data-testid="input-camera"
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-[#E2DDD3]">
              {isPdf ? (
                <div
                  data-testid="img-preview"
                  className="w-full max-h-[420px] min-h-[220px] flex flex-col items-center justify-center gap-2 bg-[#F2EFE9] p-8"
                >
                  <FileText className="w-12 h-12 text-[#D95D39]" />
                  <p className="text-sm font-medium text-[#1A1D20] truncate max-w-full px-4">
                    {image?.name}
                  </p>
                  <p className="text-xs text-[#5C626A]">Documento PDF</p>
                </div>
              ) : (
                <img
                  data-testid="img-preview"
                  src={previewUrl}
                  alt="preview"
                  className="w-full max-h-[420px] object-contain bg-[#F2EFE9]"
                />
              )}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-x-0 laser-line h-1 bg-gradient-to-r from-transparent via-[#D95D39] to-transparent shadow-[0_0_18px_#D95D39]" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="text-white text-sm font-mono uppercase tracking-widest flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> {USE_REMOTE ? "Analizando con IA" : "Adjuntando…"}
                    </div>
                  </div>
                </div>
              )}
              <div className="p-3 flex gap-2 bg-white">
                <Button
                  data-testid="btn-scan"
                  onClick={scan}
                  disabled={scanning}
                  className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> {scanning ? (USE_REMOTE ? "Analizando…" : "Adjuntando…") : (USE_REMOTE ? "Analizar con IA" : "Adjuntar y continuar")}
                </Button>
                <Button
                  data-testid="btn-reset-scan"
                  onClick={reset}
                  variant="outline"
                  className="rounded-xl border-[#E2DDD3]"
                >
                  Cambiar
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Extracted */}
        <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
          <h3 className="font-heading font-bold text-lg mb-3">2. Revisa y guarda</h3>
          {!extracted ? (
            <div className="text-sm text-[#5C626A] p-6 border border-dashed rounded-2xl border-[#E2DDD3] bg-[#FAF8F5]">
              {USE_REMOTE
                ? "Cuando analices un ticket verás aquí los datos extraídos. Podrás editarlos antes de guardar."
                : "Adjunta un ticket y verás aquí el formulario para completar los datos antes de guardar."}
            </div>
          ) : (
            <div className="animate-in space-y-4">
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 w-fit">
                <Sparkles className="w-3.5 h-3.5" /> {USE_REMOTE ? "Datos extraídos por IA" : "Datos del ticket"}
              </div>
              <ExpenseForm
                initial={{
                  vendor: extracted.vendor || "",
                  date: extracted.date || new Date().toISOString().slice(0, 10),
                  amount: extracted.amount || "",
                  category: extracted.category || "General",
                  project: activeProject || "",
                  notes: extracted.notes || "",
                  receipts: scannedReceipt ? [scannedReceipt] : [],
                }}
                onSubmit={save}
                submitLabel="Guardar gasto"
                extra={
                  extracted.items?.length > 0 && (
                    <div className="rounded-xl border border-[#E2DDD3] p-3 bg-[#FAF8F5]">
                      <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A] mb-2">Desglose detectado</p>
                      <ul className="text-sm space-y-1" data-testid="items-list">
                        {extracted.items.slice(0, 10).map((it, i) => (
                          <li key={i} className="flex justify-between gap-3">
                            <span className="truncate">{it.description || it.name || "Ítem"}</span>
                            <span className="font-mono text-[#1A1D20]">
                              {typeof it.price === "number" ? it.price.toFixed(2) + " €" : it.price || ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                }
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
