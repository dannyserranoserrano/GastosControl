import { describe, it, expect } from "vitest";
import { findDuplicates } from "../src/lib/findDuplicates.js";

const e = (id, amount, date, vendor) => ({ id, amount, date, vendor });

describe("findDuplicates", () => {
  it("marca mismo importe + fecha + proveedor similar", () => {
    const list = [
      e("1", 42.5, "2026-09-03", "Mercadona"),
      e("2", 42.5, "2026-09-03", "Mercadona"),
      e("3", 10, "2026-09-05", "Repsol"),
    ];
    const dupes = findDuplicates(list);
    expect(dupes.has("1")).toBe(true);
    expect(dupes.has("2")).toBe(true);
    expect(dupes.has("3")).toBe(false);
  });

  it("no marca importes distintos", () => {
    const list = [e("1", 10, "2026-09-03", "A"), e("2", 11, "2026-09-03", "A")];
    expect(findDuplicates(list).size).toBe(0);
  });
});
