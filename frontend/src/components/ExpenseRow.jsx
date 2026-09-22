import { eur } from "../lib/api";
import { Button } from "./ui/button";
import ReceiptImage from "./ReceiptImage";
import CategoryBadge from "./CategoryBadge";
import { ImageIcon, Copy, Lock, Pencil, CopyPlus, Trash2 } from "lucide-react";

// Fila de la lista de gastos (extraída de pages/Expenses.jsx).
export default function ExpenseRow({
  expense: e,
  dupes,
  locked,
  onPreview,
  onEdit,
  onDuplicate,
  onRemove,
}) {
  const receiptList =
    Array.isArray(e.receipts) && e.receipts.length
      ? e.receipts
      : e.receipt_path
        ? [{ path: e.receipt_path, url: e.receipt_url || e.receipt_path }]
        : [];
  const firstReceipt = receiptList[0];

  return (
    <li
      data-testid={`expense-row-${e.id}`}
      className={`p-4 sm:p-5 flex items-center gap-3 hover:bg-[#FAF8F5] transition-colors ${
        dupes ? "bg-amber-50/50" : ""
      }`}
    >
      <button
        className="w-14 h-14 rounded-xl bg-[#F2EFE9] border border-[#E2DDD3] flex items-center justify-center overflow-hidden shrink-0 relative"
        onClick={() => receiptList.length && onPreview(receiptList)}
        data-testid={`btn-preview-${e.id}`}
        aria-label={receiptList.length ? `Ver ticket(s) (${receiptList.length})` : "Sin imagen"}
        title={receiptList.length ? `Ver ticket(s) (${receiptList.length})` : "Sin imagen"}
      >
        {firstReceipt ? (
          <ReceiptImage
            receipt={firstReceipt}
            alt="ticket"
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-5 h-5 text-[#5C626A]" />
        )}
        {receiptList.length > 1 && (
          <span className="absolute bottom-0 right-0 px-1 rounded-tl-md bg-[#1E293B]/80 text-white text-[10px] font-mono">
            {receiptList.length}
          </span>
        )}
        {dupes && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"
            title="Posible duplicado"
          >
            <Copy className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[#1A1D20] truncate">{e.vendor || "Sin proveedor"}</p>
          <CategoryBadge category={e.category} />
          {e.project && (
            <span className="text-xs rounded-full bg-[#1E293B]/10 text-[#1E293B] px-2 py-0.5 truncate max-w-[180px]">
              {e.project}
            </span>
          )}
          {dupes && (
            <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-mono">
              ~{dupes[0].score}%
            </span>
          )}
          {locked && (
            <span
              className="text-xs rounded-full bg-[#1E293B]/10 text-[#1E293B] px-2 py-0.5 inline-flex items-center gap-1"
              title="Mes cerrado"
            >
              <Lock className="w-3 h-3" /> cerrado
            </span>
          )}
        </div>
        <div className="text-xs text-[#5C626A] mt-1 font-mono flex gap-3 flex-wrap">
          <span>{e.date}</span>
          {e.notes && <span className="truncate max-w-[240px]">{e.notes}</span>}
          {dupes && (
            <span className="text-amber-700 truncate max-w-[200px]">
              ≈ {dupes.map((d) => d.reason).join(", ")}
            </span>
          )}
        </div>
      </div>
      <div className="font-heading font-bold text-lg text-[#1A1D20]">{eur(e.amount)}</div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          data-testid={`btn-edit-${e.id}`}
          onClick={() => onEdit(e)}
          disabled={locked}
          className="rounded-lg disabled:opacity-40"
          aria-label="Editar gasto"
          title={locked ? "Mes cerrado" : "Editar"}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          data-testid={`btn-duplicate-${e.id}`}
          onClick={() => onDuplicate(e)}
          disabled={locked}
          className="rounded-lg disabled:opacity-40"
          aria-label="Duplicar gasto"
          title={locked ? "Mes cerrado" : "Duplicar gasto"}
        >
          <CopyPlus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          data-testid={`btn-delete-${e.id}`}
          onClick={() => onRemove(e.id)}
          disabled={locked}
          className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
          aria-label="Eliminar gasto"
          title={locked ? "Mes cerrado" : "Eliminar"}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </li>
  );
}
