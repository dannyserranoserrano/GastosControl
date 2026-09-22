import { describe, it, expect } from "vitest";
import { isDueMonth, freqLabel, normalizeFreq } from "../src/lib/recurring.js";

describe("recurrentes: frecuencia", () => {
  it("mensual toca todos los meses desde el inicio", () => {
    const t = { start: "2026-01", freq: 1 };
    expect(isDueMonth(t, "2026-01")).toBe(true);
    expect(isDueMonth(t, "2026-02")).toBe(true);
    expect(isDueMonth(t, "2026-05")).toBe(true);
  });

  it("trimestral toca cada 3 meses", () => {
    const t = { start: "2026-01", freq: 3 };
    expect(isDueMonth(t, "2026-01")).toBe(true);
    expect(isDueMonth(t, "2026-02")).toBe(false);
    expect(isDueMonth(t, "2026-03")).toBe(false);
    expect(isDueMonth(t, "2026-04")).toBe(true);
    expect(isDueMonth(t, "2026-07")).toBe(true);
    expect(isDueMonth(t, "2025-12")).toBe(false); // antes del inicio
  });

  it("frecuencia personalizada", () => {
    const t = { start: "2026-01", freq: 5 };
    expect(isDueMonth(t, "2026-06")).toBe(true);
    expect(isDueMonth(t, "2026-07")).toBe(false);
    expect(freqLabel(5)).toBe("Cada 5 meses");
    expect(normalizeFreq(undefined)).toBe(1);
  });
});
