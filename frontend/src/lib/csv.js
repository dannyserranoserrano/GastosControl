export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Evita inyección de fórmulas al abrir un CSV exportado en Excel/LibreOffice.
const CSV_FORMULA_PREFIX = ["=", "+", "-", "@", "\t", "\r"];

export function csvSafe(value) {
  const s = String(value ?? "");
  return s && CSV_FORMULA_PREFIX.includes(s[0]) ? `'${s}` : s;
}

export function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const counts = [
    { d: ";", n: (firstLine.match(/;/g) || []).length },
    { d: ",", n: (firstLine.match(/,/g) || []).length },
    { d: "\t", n: (firstLine.match(/\t/g) || []).length },
  ];
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

export function parseCsv(text, delimiter) {
  const src = stripBom(String(text || ""));
  const delim = delimiter || detectDelimiter(src);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      /* ignore */
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((v) => String(v).trim() !== ""));
}

import { normalizeText as norm } from "./text";

const ALIASES = {
  date: ["fecha", "date", "dia", "fechagasto", "fechavalor", "fechaoperacion", "fechamovimiento", "fechacontable"],
  vendor: ["proveedor", "vendor", "comercio", "establecimiento", "tienda", "merchant", "concepto", "descripcion", "detalle", "movimiento", "beneficiario", "descripcionoperacion"],
  amount: ["importe", "amount", "total", "precio", "coste", "importeeur", "importeuro", "cuantia", "importeeuros"],
  debit: ["debe", "cargo", "cargoimporte", "debito", "salida", "importecargo", "pagado"],
  credit: ["haber", "abono", "credito", "entrada", "ingreso", "importeabono"],
  category: ["categoria", "category"],
  project: ["proyecto", "project", "obra", "proyectoobra", "proyectosobra"],
  notes: ["notas", "notes", "nota", "observaciones", "descripcion", "detalle", "concepto"],
};

function findColumn(headers, key) {
  const wanted = ALIASES[key].map(norm);
  return headers.findIndex((h) => wanted.includes(norm(h)));
}

export function parseAmount(value) {
  if (value === null || value === undefined) return NaN;
  let s = String(value).trim().replace(/[€$\s]/g, "");
  if (!s) return NaN;
  s = s.replace(/[^0-9.,-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    s = decimals > 0 && decimals <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (lastDot > -1) {
    const parts = s.split(".");
    const decimals = s.length - lastDot - 1;
    if (parts.length > 2 || decimals > 2) {
      s = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseDate(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const p = (n) => String(n).padStart(2, "0");
    return `${parsed.getFullYear()}-${p(parsed.getMonth() + 1)}-${p(parsed.getDate())}`;
  }
  return "";
}

/**
 * Convierte filas crudas de CSV en registros de gasto con validación.
 * Devuelve { hasHeader, records }.
 */
export function mapRowsToExpenses(rows) {
  if (rows.length === 0) return { hasHeader: false, records: [] };
  const first = rows[0].map((c) => String(c));
  const hasHeader =
    findColumn(first, "date") > -1 ||
    findColumn(first, "amount") > -1 ||
    findColumn(first, "debit") > -1 ||
    findColumn(first, "credit") > -1 ||
    findColumn(first, "vendor") > -1 ||
    findColumn(first, "category") > -1;

  const dataRows = hasHeader ? rows.slice(1) : rows;
  let idx;
  // Formato propio (export de GastoControl o posición fija): el importe siempre es
  // un gasto aunque sea positivo. En un extracto con "Importe" con signo, el
  // positivo es un ingreso (se omite).
  const ownFormat = !hasHeader || findColumn(first, "category") > -1;
  if (hasHeader) {
    idx = {
      date: findColumn(first, "date"),
      vendor: findColumn(first, "vendor"),
      amount: findColumn(first, "amount"),
      debit: findColumn(first, "debit"),
      credit: findColumn(first, "credit"),
      category: findColumn(first, "category"),
      project: findColumn(first, "project"),
      notes: findColumn(first, "notes"),
    };
  } else {
    idx = { date: 0, vendor: 1, amount: 2, debit: -1, credit: -1, category: 3, project: 4, notes: 5 };
  }
  const hasDebitCredit = idx.debit > -1 || idx.credit > -1;

  const records = dataRows.map((raw, i) => {
    const get = (k) => (idx[k] > -1 && raw[idx[k]] !== undefined ? String(raw[idx[k]]).trim() : "");
    const date = parseDate(get("date"));
    let amount = parseAmount(get("amount"));
    let income = false;
    if (!Number.isFinite(amount)) {
      // Extractos con columnas Debe/Haber o Cargo/Abono
      const debit = parseAmount(get("debit"));
      const credit = parseAmount(get("credit"));
      if (Number.isFinite(debit) && debit !== 0) amount = Math.abs(debit);
      else if (Number.isFinite(credit) && credit !== 0) {
        amount = Math.abs(credit);
        income = true;
      }
    } else if (amount < 0) {
      // Importe negativo = cargo
      amount = Math.abs(amount);
    } else if (amount > 0 && !ownFormat && !hasDebitCredit) {
      // Extracto con importe con signo: positivo = ingreso
      income = true;
    }
    const errors = [];
    if (!date) errors.push("fecha inválida");
    if (!Number.isFinite(amount) || amount === 0) errors.push("importe inválido");
    if (income) errors.push("ingreso (se omite)");
    return {
      line: i + (hasHeader ? 2 : 1),
      data: {
        date,
        vendor: get("vendor"),
        amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
        category: get("category"),
        project: get("project"),
        notes: get("notes"),
      },
      errors,
    };
  });

  return { hasHeader, records };
}

/**
 * Parser de extractos OFX (SGML/XML). En OFX los cargos son negativos.
 * Devuelve { hasHeader, records } con el mismo formato que mapRowsToExpenses.
 */
export function parseOfx(text) {
  const src = stripBom(String(text || ""));
  const blocks = src.split(/<STMTTRN>/i).slice(1);
  const records = blocks.map((b, i) => {
    const pick = (tag) => {
      const m = b.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
      return m ? m[1].trim() : "";
    };
    const amt = parseAmount(pick("TRNAMT"));
    const dt = pick("DTPOSTED");
    let date = "";
    const dm = dt.match(/^(\d{4})(\d{2})(\d{2})/);
    if (dm) date = `${dm[1]}-${dm[2]}-${dm[3]}`;
    const vendor = pick("NAME") || pick("MEMO");
    const income = Number.isFinite(amt) && amt > 0;
    const errors = [];
    if (!date) errors.push("fecha inválida");
    if (!Number.isFinite(amt) || amt === 0) errors.push("importe inválido");
    if (income) errors.push("ingreso (se omite)");
    return {
      line: i + 1,
      data: {
        date,
        vendor,
        amount: Number.isFinite(amt) ? Math.abs(amt) : 0,
        category: "",
        project: "",
        notes: pick("MEMO"),
      },
      errors,
    };
  });
  return { hasHeader: true, records };
}

export function looksLikeOfx(text) {
  return /OFXHEADER|<OFX>/i.test(String(text || "").slice(0, 4000));
}

export function makeTemplateCsv() {
  return (
    "Fecha;Proveedor;Categoría;Proyecto / Obra;Importe (€);Notas\r\n" +
    "2026-01-15;Supermercado;Compras;Reforma cocina;42,50;Compra semanal\r\n" +
    "2026-01-16;Ferretería;Compras;Reforma cocina;18,90;Tornillos y cables\r\n"
  );
}
