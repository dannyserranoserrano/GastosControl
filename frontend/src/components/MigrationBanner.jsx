import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MigrationBanner() {
  const { pendingMigration, runMigration, dismissMigration } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!pendingMigration) return null;

  const onImport = async () => {
    setBusy(true);
    try {
      await runMigration();
    } catch (err) {
      const msg = err?.message || err?.error?.message || "No se pudieron importar los datos";
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-2xl border border-[#E2DDD3] bg-[#FFF8F4] p-4">
        <div className="text-sm text-[#1A1D20]">
          Tienes <strong>{pendingMigration.count}</strong> gasto(s) guardados en este
          dispositivo. ¿Quieres importarlos a tu cuenta?
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            disabled={busy}
            onClick={onImport}
            data-testid="btn-migrate"
            className="bg-[#D95D39] hover:bg-[#C24C2A] text-white rounded-xl"
          >
            {busy ? "Importando…" : "Importar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={dismissMigration}
            className="rounded-xl border-[#E2DDD3]"
          >
            No, gracias
          </Button>
        </div>
      </div>
    </div>
  );
}