import { useRef, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { exportBackupFile, importBackup } from "../lib/backup";
import { useAuth } from "../lib/authContext";
import { Database, Download, Upload, TriangleAlert } from "lucide-react";

export default function BackupManager() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);

  const doExport = async () => {
    setBusy(true);
    try {
      await exportBackupFile();
      toast.success("Copia de seguridad descargada");
    } catch {
      toast.error("No se pudo generar la copia");
    } finally {
      setBusy(false);
    }
  };

  const onPick = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      setPending({ text, name: file.name });
    } catch {
      toast.error("No se pudo leer el archivo");
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await importBackup(pending.text);
      setSummary(res);
      toast.success("Copia restaurada correctamente");
      setPending(null);
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      toast.error(err?.message || "No se pudo importar la copia");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white" data-testid="backup-manager">
      <div className="flex items-center gap-2 mb-1">
        <Database className="w-5 h-5 text-[#D95D39]" />
        <h3 className="font-heading font-bold text-lg">Copia de seguridad</h3>
      </div>
      <p className="text-sm text-[#5C626A] mb-4">
        Exporta o restaura <strong>todos los datos locales</strong> (gastos, presupuestos, categorías,
        proyectos, objetivos, recurrentes, reglas y preferencias) en un archivo JSON.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          data-testid="btn-export-backup"
          onClick={doExport}
          disabled={busy}
          className="bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-xl"
        >
          <Download className="w-4 h-4 mr-2" /> Descargar copia (JSON)
        </Button>
        <Button
          data-testid="btn-import-backup"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-xl border-[#E2DDD3]"
        >
          <Upload className="w-4 h-4 mr-2" /> Restaurar desde archivo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          data-testid="input-backup-file"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
        <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        <span>
          La restauración <strong>reemplaza</strong> los datos locales por los del archivo.
          {user
            ? " Al tener sesión iniciada, la app usa datos en la nube (Supabase); esta copia solo afecta al almacenamiento local del dispositivo."
            : " Haz una copia antes si no estás seguro."}
        </span>
      </div>

      {summary && (
        <p className="mt-3 text-sm text-emerald-700" data-testid="backup-summary">
          Restaurados: {summary.expenses} gasto(s), {summary.categories} categoría(s),{" "}
          {summary.projects} proyecto(s), {summary.goals} objetivo(s).
        </p>
      )}

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar esta copia?</AlertDialogTitle>
            <AlertDialogDescription>
              Se reemplazarán los datos locales actuales por los del archivo
              {pending?.name ? ` «${pending.name}»` : ""}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="btn-confirm-import-backup"
              onClick={confirmImport}
              className="bg-red-600 hover:bg-red-700"
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
