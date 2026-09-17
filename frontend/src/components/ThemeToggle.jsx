import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Sun, Moon } from "lucide-react";
import { getStoredMode, resolveMode, applyMode, setStoredMode } from "../lib/theme";

export default function ThemeToggle() {
  const [resolved, setResolved] = useState(() => resolveMode(getStoredMode()));

  useEffect(() => {
    applyMode(getStoredMode());
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const onChange = () => {
      if (getStoredMode() === "system") setResolved(applyMode("system"));
    };
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
  }, []);

  const toggle = () => {
    const next = resolved === "dark" ? "light" : "dark";
    setResolved(setStoredMode(next));
  };

  const isDark = resolved === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      data-testid="btn-theme-toggle"
      onClick={toggle}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="rounded-xl border-[#E2DDD3]"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}
