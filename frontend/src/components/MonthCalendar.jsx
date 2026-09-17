import { useState } from "react";
import { eur } from "../lib/api";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import CategoryBadge from "./CategoryBadge";
import { CalendarDays } from "lucide-react";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const pad = (n) => String(n).padStart(2, "0");

export default function MonthCalendar({ month, expenses }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes = 0
  const todayStr = new Date().toISOString().slice(0, 10);

  const byDay = {};
  const dayList = {};
  (expenses || []).forEach((e) => {
    const d = String(e.date || "").slice(0, 10);
    if (!d.startsWith(month)) return;
    byDay[d] = (byDay[d] || 0) + Number(e.amount || 0);
    (dayList[d] = dayList[d] || []).push(e);
  });

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${month}-${pad(d)}`;
    cells.push({ d, key, total: byDay[key] || 0, count: (dayList[key] || []).length });
  }

  return (
    <>
      <Card data-testid="month-calendar" className="p-5 sm:p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <h3 className="font-heading font-bold text-lg flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-[#D95D39]" /> Calendario
        </h3>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-mono uppercase tracking-widest text-[#5C626A] mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) =>
            c === null ? (
              <div key={`empty-${i}`} />
            ) : (
              <button
                key={c.key}
                type="button"
                disabled={c.count === 0}
                onClick={() => c.count > 0 && setSelectedDay(c.key)}
                data-testid={`cal-day-${c.key}`}
                className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-center text-xs transition-colors ${
                  c.key === todayStr ? "border-[#D95D39]" : "border-[#E2DDD3]"
                } ${c.count > 0 ? "bg-[#FFF8F4] hover:bg-[#F2EFE9] cursor-pointer" : "bg-white cursor-default"}`}
              >
                <span
                  className={`font-mono ${
                    c.key === todayStr ? "text-[#D95D39] font-bold" : "text-[#1A1D20]"
                  }`}
                >
                  {c.d}
                </span>
                {c.total > 0 && (
                  <span className="text-[10px] font-semibold text-[#D95D39] truncate w-full text-center">
                    {eur(c.total)}
                  </span>
                )}
              </button>
            )
          )}
        </div>
        <p className="text-[11px] text-[#5C626A] mt-3">
          Toca un día con gastos para ver el detalle.
        </p>
      </Card>

      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{selectedDay}</DialogTitle>
          </DialogHeader>
          <ul className="divide-y divide-[#E2DDD3] max-h-[60vh] overflow-auto">
            {(dayList[selectedDay] || []).map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2">
                <span className="flex-1 min-w-0 truncate text-sm text-[#1A1D20]">
                  {e.vendor || "Sin proveedor"}
                </span>
                <CategoryBadge category={e.category} />
                <span className="font-heading font-bold text-sm">{eur(e.amount)}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
