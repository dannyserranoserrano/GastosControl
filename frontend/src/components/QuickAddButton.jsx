import { Link } from "react-router-dom";
import { ScanLine } from "lucide-react";

export default function QuickAddButton() {
  return (
    <Link
      to="/escanear"
      data-testid="btn-quick-scan"
      title="Escanear ticket"
      aria-label="Escanear ticket"
      className="fixed bottom-5 right-5 z-30 md:hidden w-14 h-14 rounded-full bg-[#D95D39] hover:bg-[#C24C2A] text-white shadow-lg flex items-center justify-center"
    >
      <ScanLine className="w-6 h-6" />
    </Link>
  );
}
