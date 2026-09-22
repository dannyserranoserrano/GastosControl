import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createLocalApi } from "../src/lib/localBackend.js";
import { resolveReceiptSrc, receiptIsPdf } from "../src/lib/receipts.js";
import { buildBackup } from "../src/lib/backup.js";
import { dbClear, dbKeys } from "../src/lib/storage.js";

// localStorage mínimo para node
const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: (k) => ls.delete(k),
  clear: () => ls.clear(),
  key: (i) => Array.from(ls.keys())[i] ?? null,
  get length() {
    return ls.size;
  },
};

const IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PDF = "data:application/pdf;base64,JVBERi0xLjQKJcfs";

const api = createLocalApi();
const fileKeys = async () =>
  (await dbKeys()).filter((k) => String(k).startsWith("gastocontrol:file:"));

beforeEach(async () => {
  ls.clear();
  await dbClear();
});

describe("modo local: ficheros de tickets", () => {
  it("guarda la imagen aparte y el gasto solo referencia un id", async () => {
    await api.post("/expenses", {
      vendor: "Mercadona",
      date: "2026-09-03",
      amount: 10,
      category: "Otros",
      receipts: [{ path: IMG, url: IMG }],
    });
    const { data } = await api.get("/expenses");
    expect(data).toHaveLength(1);
    expect(data[0].receipt_path).toMatch(/^local:/);
    expect(data[0].receipts[0].path).toMatch(/^local:/);
    expect(JSON.stringify(data[0])).not.toContain("base64");
    expect(await fileKeys()).toHaveLength(1);
    expect(await resolveReceiptSrc(data[0].receipts[0])).toBe(IMG);
  });

  it("detecta y resuelve PDF", async () => {
    await api.post("/expenses", {
      date: "2026-09-03",
      amount: 1,
      category: "Otros",
      receipts: [{ path: PDF, url: PDF }],
    });
    const { data } = await api.get("/expenses");
    const r = data[0].receipts[0];
    expect(r.path).toMatch(/^localpdf:/);
    expect(receiptIsPdf(r)).toBe(true);
    expect(await resolveReceiptSrc(r)).toBe(PDF);
  });

  it("borra el fichero al eliminar el gasto", async () => {
    await api.post("/expenses", {
      date: "2026-09-03",
      amount: 1,
      category: "Otros",
      receipts: [{ path: IMG, url: IMG }],
    });
    const { data } = await api.get("/expenses");
    await api.delete(`/expenses/${data[0].id}`);
    expect(await fileKeys()).toHaveLength(0);
    const after = await api.get("/expenses");
    expect(after.data).toHaveLength(0);
  });

  it("el backup incluye los ficheros", async () => {
    await api.post("/expenses", {
      date: "2026-09-03",
      amount: 1,
      category: "Otros",
      receipts: [{ path: IMG, url: IMG }],
    });
    const b = await buildBackup();
    expect(Object.keys(b.files || {})).toHaveLength(1);
    expect(Object.values(b.files)[0]).toBe(IMG);
  });
});
