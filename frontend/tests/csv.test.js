import { describe, it, expect } from "vitest";
import {
  parseAmount,
  parseDate,
  mapRowsToExpenses,
  parseOfx,
  looksLikeOfx,
  csvSafe,
} from "../src/lib/csv.js";

describe("parseAmount", () => {
  it("interpreta formatos ES y EN", () => {
    expect(parseAmount("1.234,56")).toBeCloseTo(1234.56);
    expect(parseAmount("1,234.56")).toBeCloseTo(1234.56);
    expect(parseAmount("42,50")).toBeCloseTo(42.5);
    expect(parseAmount("12,30 €")).toBeCloseTo(12.3);
    expect(parseAmount("")).toBeNaN();
  });
});

describe("parseDate", () => {
  it("normaliza fechas ES/ISO", () => {
    expect(parseDate("2026-09-03")).toBe("2026-09-03");
    expect(parseDate("03/09/2026")).toBe("2026-09-03");
    expect(parseDate("3-9-26")).toBe("2026-09-03");
  });
});

describe("csvSafe", () => {
  it("neutraliza fórmulas", () => {
    expect(csvSafe("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvSafe("Mercadona")).toBe("Mercadona");
  });
});

describe("mapRowsToExpenses (extracto con Importe)", () => {
  it("toma los cargos (negativos) y omite ingresos", () => {
    const rows = [
      ["Fecha", "Concepto", "Importe"],
      ["2026-09-03", "Supermercado", "-42,50"],
      ["2026-09-04", "Nomina", "1500,00"],
    ];
    const { records } = mapRowsToExpenses(rows);
    expect(records).toHaveLength(2);
    expect(records[0].errors).toHaveLength(0);
    expect(records[0].data.amount).toBeCloseTo(42.5);
    expect(records[0].data.vendor).toBe("Supermercado");
    expect(records[1].errors.join(" ")).toMatch(/ingreso/i);
  });
});

describe("mapRowsToExpenses (Debe/Haber)", () => {
  it("usa Debe como gasto y omite Haber", () => {
    const rows = [
      ["Fecha", "Concepto", "Debe", "Haber"],
      ["01/09/2026", "Farmacia", "12,30", ""],
      ["02/09/2026", "Transferencia", "", "100,00"],
    ];
    const { records } = mapRowsToExpenses(rows);
    expect(records[0].data.amount).toBeCloseTo(12.3);
    expect(records[0].errors).toHaveLength(0);
    expect(records[1].errors.join(" ")).toMatch(/ingreso/i);
  });
});

describe("parseOfx", () => {
  const ofx = `OFXHEADER:100
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260903120000<TRNAMT>-42.50<NAME>SUPERMERCADO</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260904<TRNAMT>1500.00<NAME>NOMINA</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

  it("detecta OFX y parsea sus movimientos", () => {
    expect(looksLikeOfx(ofx)).toBe(true);
    const { records } = parseOfx(ofx);
    expect(records).toHaveLength(2);
    expect(records[0].data.date).toBe("2026-09-03");
    expect(records[0].data.amount).toBeCloseTo(42.5);
    expect(records[0].data.vendor).toBe("SUPERMERCADO");
    expect(records[1].errors.join(" ")).toMatch(/ingreso/i);
  });
});
