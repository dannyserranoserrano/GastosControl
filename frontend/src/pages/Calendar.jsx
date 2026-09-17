import { useEffect, useState } from "react";
import { api, eur } from "../lib/api";
import { useProjects } from "../lib/projectsContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import MonthCalendar from "../components/MonthCalendar";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const pad = (n) => String(n).padStart(2, "0");
const monthKey = (y, m) => `${y}-${pad(m + 1)}`;

function getMonthName(ym) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function prevMonth(ym) {
  let [y, m] = ym.split("-").map(Number);
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return monthKey(y, m - 1);
}

function nextMonth(ym) {
  let [y, m] = ym.split("-").map(Number);
  m += 1;
  if (m === 13) {
    m = 1;
    y += 1;
  }
  return monthKey(y, m - 1);
}

export default function Calendar() {
  const { activeProject } = useProjects();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return monthKey(d.getFullYear(), d.getMonth());
  });
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { start: `${selectedMonth}-01`, end: `${selectedMonth}-31` };
      if (activeProject) params.project = activeProject;
      const { data } = await api.get("/expenses", { params });
      setExpenses(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedMonth, activeProject]); // eslint-disable-line

  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const daysWithExpenses = new Set(
    expenses.map((e) => String(e.date || "").slice(0, 10)).filter((d) => d.startsWith(selectedMonth))
  ).size;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#5C626A]">
            Calendario{activeProject ? ` · ${activeProject}` : ""}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#1A1D20] mt-1">
            {getMonthName(selectedMonth)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-[#E2DDD3]"
            onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger data-testid="calendar-select-month" className="w-[180px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(() => {
                const now = new Date();
                const opts = [];
                for (let i = 0; i < 24; i++) {
                  let y = now.getFullYear();
                  let m = now.getMonth() - i;
                  while (m < 0) {
                    m += 12;
                    y -= 1;
                  }
                  const key = monthKey(y, m);
                  opts.push(
                    <SelectItem key={key} value={key}>
                      {getMonthName(key)}
                    </SelectItem>
                  );
                }
                return opts;
              })()}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-[#E2DDD3]"
            onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total del mes" value={eur(total)} />
        <Stat label="Nº gastos" value={expenses.length} />
        <Stat label="Días con gasto" value={daysWithExpenses} />
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#5C626A]">Cargando calendario…</div>
      ) : (
        <MonthCalendar month={selectedMonth} expenses={expenses} />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card className="p-4 rounded-2xl border-[#E2DDD3] bg-white">
      <p className="text-xs font-mono text-[#5C626A]">{label}</p>
      <p className="font-heading font-bold text-xl mt-1 text-[#1A1D20]">{value}</p>
    </Card>
  );
}
