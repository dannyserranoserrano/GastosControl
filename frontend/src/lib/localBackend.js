import { DEFAULT_CATEGORIES } from "./constants";
import { dbGet, dbSet, dbDel, localFileKey } from "./storage";
import { normalizePeriod, periodRange } from "./period";
import { csvSafe } from "./csv";
import { fileToDataUrl } from "./imageFile";

const K = {
  categories: "gastocontrol:categories",
  projectCategories: "gastocontrol:project_categories",
  expenses: "gastocontrol:expenses",
  budget: "gastocontrol:budget",
};

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fail(status, detail) {
  const err = new Error(detail || "Error");
  err.response = { status, data: { detail } };
  return err;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function readCategories(project) {
  const proj = String(project || "").trim();
  if (!proj) {
    const cats = await dbGet(K.categories);
    if (cats && cats.length > 0) return cats;
    await dbSet(K.categories, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  const map = (await dbGet(K.projectCategories)) || {};
  if (map[proj] && map[proj].length > 0) return map[proj];
  map[proj] = DEFAULT_CATEGORIES;
  await dbSet(K.projectCategories, map);
  return map[proj];
}

async function persistCategories(cats, project) {
  const proj = String(project || "").trim();
  if (!proj) {
    await dbSet(K.categories, cats);
    return cats;
  }
  const map = (await dbGet(K.projectCategories)) || {};
  map[proj] = cats;
  await dbSet(K.projectCategories, map);
  return cats;
}

async function readExpenses() {
  return (await dbGet(K.expenses)) || [];
}

async function persistExpenses(list) {
  await dbSet(K.expenses, list);
  return list;
}

async function readBudget(project) {
  const b = (await dbGet(K.budget)) || { total: 0 };
  const proj = String(project || "").trim();
  const src = proj ? ((b.projects || {})[proj] || {}) : b;
  const alertRaw = Number(src.alert_at);
  return {
    total: Number(src.total || 0),
    alert_at: alertRaw > 0 ? alertRaw : 80,
    updated_at: src.updated_at || b.updated_at || null,
    category_budgets: src.category_budgets || {},
    project_budgets: b.project_budgets || {},
    period: normalizePeriod(src.period),
    project: proj,
  };
}

function sanitizeCategoryBudgets(raw) {
  const out = {};
  if (raw && typeof raw === "object") {
    for (const [name, value] of Object.entries(raw)) {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) out[name] = round2(n);
    }
  }
  return out;
}

const sortOtrosLast = (a, b) => {
  if (a.name === "Otros") return 1;
  if (b.name === "Otros") return -1;
  return a.name.localeCompare(b.name);
};

async function normalizeCategory(cat, cats) {
  return cats.some((c) => c.name === cat) ? cat : "Otros";
}

// Guarda el fichero (data-URL) aparte en IndexedDB y devuelve una referencia
// ligera `local:<id>` (o `localpdf:<id>`). Las rutas no-data (backend OCR) se
// conservan tal cual.
async function storeReceipt(r) {
  const raw = (r && (r.path || r.url)) || null;
  if (!raw) return null;
  if (raw.startsWith("data:")) {
    const id = uid();
    await dbSet(localFileKey(id), raw);
    const ref = `${raw.startsWith("data:application/pdf") ? "localpdf:" : "local:"}${id}`;
    return { path: ref, url: ref };
  }
  return { path: raw, url: (r.url || raw) };
}

function receiptFileRefs(exp) {
  const refs = new Set();
  const list = [...(exp.receipts || []), { path: exp.receipt_path, url: exp.receipt_url }];
  list.forEach((r) => {
    const raw = (r && (r.path || r.url)) || "";
    if (raw.startsWith("local:") || raw.startsWith("localpdf:")) {
      refs.add(raw.slice(raw.indexOf(":") + 1));
    }
  });
  return refs;
}

async function deleteReceiptFiles(exp) {
  for (const id of receiptFileRefs(exp)) {
    try {
      await dbDel(localFileKey(id));
    } catch {
      /* ignore */
    }
  }
}

async function buildExpense(body, cats) {
  const rawList = Array.isArray(body && body.receipts) ? body.receipts : [];
  const receipts = (await Promise.all(rawList.map(storeReceipt))).filter(Boolean);
  return {
    id: uid(),
    vendor: (body && body.vendor) || "",
    date: (body && body.date) || today(),
    amount: Number((body && body.amount) || 0),
    category: await normalizeCategory((body && body.category) || "Otros", cats),
    project: String((body && body.project) || "").trim().slice(0, 80),
    notes: (body && body.notes) || "",
    items: (body && body.items) || [],
    receipts,
    receipt_path: receipts[0]?.path || (body && body.receipt_path) || null,
    receipt_url: receipts[0]?.url || (body && body.receipt_url) || null,
    created_at: new Date().toISOString(),
  };
}

function matchExpenseId(url) {
  const m = url.match(/^\/expenses\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function matchCategoryName(url) {
  const m = url.match(/^\/categories\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function dispatch(method, url, body, config) {
  const params = (config && config.params) || {};

  if (url === "/categories") {
    if (method === "get") {
      const cats = await readCategories(params.project);
      return { categories: [...cats].sort(sortOtrosLast) };
    }
    if (method === "post") {
      const project = String((body && body.project) || "").trim();
      const cats = await readCategories(project);
      const name = String((body && body.name) || "").trim();
      if (!name) throw fail(400, "El nombre no puede estar vacío");
      if (name.length > 40) throw fail(400, "Nombre demasiado largo (máx 40)");
      if (cats.some((c) => c.name === name)) {
        throw fail(409, "Ya existe una categoría con ese nombre");
      }
      const doc = {
        name,
        icon: (body && body.icon) || "MoreHorizontal",
        color: (body && body.color) || "stone",
      };
      await persistCategories([...cats, doc], project);
      return doc;
    }
  }

  const catName = matchCategoryName(url);
  if (catName != null && method === "delete") {
    const project = String(params.project || "").trim();
    const cats = await readCategories(project);
    if (catName === "Otros") throw fail(400, "La categoría 'Otros' no se puede borrar");
    const expenses = await readExpenses();
    const used = expenses.filter(
      (e) => e.category === catName && (e.project || "") === project
    ).length;
    if (used > 0) {
      throw fail(400, `No se puede borrar: hay ${used} gasto(s) en esta categoría`);
    }
    const next = cats.filter((c) => c.name !== catName);
    if (next.length === cats.length) throw fail(404, "Categoría no encontrada");
    await persistCategories(next, project);
    return { ok: true };
  }

  if (url === "/expenses") {
    if (method === "get") {
      let list = await readExpenses();
      const { q, category, project, start, end } = params;
      if (category && category !== "all") {
        list = list.filter((e) => e.category === category);
      }
      if (project && project !== "all") {
        list = list.filter((e) => (e.project || "") === project);
      }
      if (q) {
        const re = new RegExp(String(q), "i");
        list = list.filter(
          (e) => re.test(e.vendor || "") || re.test(e.notes || "")
        );
      }
      if (start || end) {
        list = list.filter((e) => {
          const d = e.date || "";
          if (start && d < start) return false;
          if (end && d > end) return false;
          return true;
        });
      }
      return [...list].sort((a, b) =>
        String(b.date).localeCompare(String(a.date))
      );
    }
    if (method === "post") {
      const cats = await readCategories(body && body.project);
      const list = await readExpenses();
      const expense = await buildExpense(body, cats);
      await persistExpenses([...list, expense]);
      return expense;
    }
  }

  const expId = matchExpenseId(url);
  if (expId != null) {
    const list = await readExpenses();
    const idx = list.findIndex((e) => e.id === expId);

    if (method === "get") {
      if (idx === -1) throw fail(404, "Not found");
      return list[idx];
    }
    if (method === "patch") {
      if (idx === -1) throw fail(404, "Not found");
      const prev = list[idx];
      const next = { ...prev };
      ["vendor", "date", "amount", "category", "project", "notes", "items", "receipts"].forEach((k) => {
        if (body && body[k] !== undefined) next[k] = body[k];
      });
      next.project = String(next.project || "").trim().slice(0, 80);
      if (Array.isArray(next.receipts)) {
        next.receipts = (await Promise.all(next.receipts.map(storeReceipt))).filter(Boolean);
        next.receipt_path = next.receipts[0]?.path || null;
        next.receipt_url = next.receipts[0]?.url || null;
        const kept = receiptFileRefs(next);
        for (const id of receiptFileRefs(prev)) {
          if (!kept.has(id)) {
            try {
              await dbDel(localFileKey(id));
            } catch {
              /* ignore */
            }
          }
        }
      } else if (body && body.receipt_path !== undefined) {
        next.receipt_path = body.receipt_path;
        next.receipt_url = body.receipt_url || body.receipt_path;
      }
      const cats = await readCategories(next.project);
      next.category = await normalizeCategory(next.category, cats);
      list[idx] = next;
      await persistExpenses(list);
      return next;
    }
    if (method === "delete") {
      if (idx === -1) throw fail(404, "Not found");
      await deleteReceiptFiles(list[idx]);
      list.splice(idx, 1);
      await persistExpenses(list);
      return { ok: true };
    }
  }

  if (url === "/projects/rename" && method === "post") {
    const from = String((body && body.from) || "").trim();
    const to = String((body && body.to) || "").trim().slice(0, 80);
    if (!from || !to) throw fail(400, "Nombre inválido");
    if (from === to) return { ok: true, project: to, expenses: 0 };
    const norm = (s) => String(s || "").trim().toLowerCase();

    const list = await readExpenses();
    const clash = list.some(
      (e) => norm(e.project) === norm(to) && norm(e.project) !== norm(from)
    );
    if (clash) throw fail(409, "Ya existe un proyecto con ese nombre");

    let changed = 0;
    list.forEach((e) => {
      if (norm(e.project) === norm(from)) {
        e.project = to;
        changed++;
      }
    });
    if (changed) await persistExpenses(list);

    const b = (await dbGet(K.budget)) || {};
    if (b.projects) {
      let budgetChanged = false;
      for (const k of Object.keys(b.projects)) {
        if (norm(k) === norm(from) && k !== to) {
          b.projects[to] = b.projects[k];
          delete b.projects[k];
          budgetChanged = true;
        }
      }
      if (budgetChanged) await dbSet(K.budget, b);
    }

    const map = (await dbGet(K.projectCategories)) || {};
    let catChanged = false;
    for (const k of Object.keys(map)) {
      if (norm(k) === norm(from) && k !== to) {
        map[to] = map[k];
        delete map[k];
        catChanged = true;
      }
    }
    if (catChanged) await dbSet(K.projectCategories, map);

    return { ok: true, project: to, expenses: changed };
  }

  if (url === "/stats") {
    const projectFilter = String(params.project || "").trim();
    const cats = await readCategories(projectFilter);
    let list = await readExpenses();
    if (projectFilter) {
      list = list.filter((e) => (e.project || "") === projectFilter);
    }
    const budget = await readBudget(projectFilter);

    const total = list.reduce((s, e) => s + Number(e.amount || 0), 0);

    const byCat = {};
    cats.forEach((c) => {
      byCat[c.name] = 0;
    });
    list.forEach((e) => {
      const cat = Object.prototype.hasOwnProperty.call(byCat, e.category)
        ? e.category
        : "Otros";
      byCat[cat] = (byCat[cat] || 0) + Number(e.amount || 0);
    });
    const order = [...cats].sort(sortOtrosLast).map((c) => c.name);
    const by_category = order.map((name) => ({
      category: name,
      total: round2(byCat[name] || 0),
    }));

    const monthly = {};
    list.forEach((e) => {
      const d = e.date || "";
      if (d.length >= 7) {
        const m = d.slice(0, 7);
        monthly[m] = (monthly[m] || 0) + Number(e.amount || 0);
      }
    });
    const monthlyList = Object.keys(monthly)
      .sort()
      .map((m) => ({ month: m, total: round2(monthly[m]) }));

    const period = normalizePeriod(budget.period);
    const range = periodRange(period);
    const inPeriod = list.filter((e) => {
      const d = e.date || "";
      return d >= range.start && d <= range.end;
    });
    const periodTotal = inPeriod.reduce((s, e) => s + Number(e.amount || 0), 0);
    const periodByCat = {};
    cats.forEach((c) => {
      periodByCat[c.name] = 0;
    });
    inPeriod.forEach((e) => {
      const cat = Object.prototype.hasOwnProperty.call(periodByCat, e.category)
        ? e.category
        : "Otros";
      periodByCat[cat] = (periodByCat[cat] || 0) + Number(e.amount || 0);
    });
    const period_by_category = order.map((name) => ({
      category: name,
      total: round2(periodByCat[name] || 0),
    }));

    const budgetTotal = budget.total;
    const progress = budgetTotal > 0 ? (periodTotal / budgetTotal) * 100 : 0;

    return {
      total_spent: round2(total),
      count: list.length,
      budget: budgetTotal,
      remaining: round2(budgetTotal - periodTotal),
      progress: round2(progress),
      alert_at: budget.alert_at,
      category_budgets: budget.category_budgets,
      project_budgets: budget.project_budgets,
      by_category,
      period,
      period_label: range.label,
      period_start: range.start,
      period_end: range.end,
      period_days: range.days,
      period_elapsed_days: range.elapsedDays,
      period_spent: round2(periodTotal),
      period_by_category,
      monthly: monthlyList,
    };
  }

  if (url === "/budget") {
    if (method === "get") {
      return readBudget(params.project);
    }
    if (method === "put") {
      const alertRaw = Number((body && body.alert_at) || 0);
      const project = String((body && body.project) || "").trim();
      const existing = (await dbGet(K.budget)) || { total: 0 };
      const entry = {
        total: Number((body && body.total) || 0),
        alert_at: alertRaw > 0 ? alertRaw : 80,
        updated_at: new Date().toISOString(),
        category_budgets: sanitizeCategoryBudgets(body && body.category_budgets),
        period: normalizePeriod(body && body.period),
      };
      let doc;
      if (project) {
        doc = { ...existing, projects: { ...(existing.projects || {}), [project]: entry } };
      } else {
        doc = { ...existing, ...entry };
      }
      await dbSet(K.budget, doc);
      return project ? { ...entry, project } : doc;
    }
  }

  if (url === "/receipts/scan" && method === "post") {
    const file = body && typeof body.get === "function" ? body.get("file") : null;
    const dataUrl = file ? await fileToDataUrl(file) : null;
    if (!dataUrl) throw fail(400, "Empty file");
    const ref = await storeReceipt({ path: dataUrl, url: dataUrl });
    return {
      receipt_path: ref.path,
      receipt_url: ref.url,
      extracted: {
        vendor: "",
        date: today(),
        amount: 0,
        category: "General",
        items: [],
        notes: "",
      },
    };
  }

  throw fail(404, "Not found");
}

export async function readLocalStore() {
  const categories = (await dbGet(K.categories)) || [];
  const expenses = (await dbGet(K.expenses)) || [];
  const b = (await dbGet(K.budget)) || { total: 0 };
  return { categories, expenses, budget: Number(b.total || 0) };
}

export function createLocalApi() {
  return {
    get: (url, config) => dispatch("get", url, null, config).then((data) => ({ data })),
    post: (url, data, config) => dispatch("post", url, data, config).then((data) => ({ data })),
    patch: (url, data, config) => dispatch("patch", url, data, config).then((data) => ({ data })),
    put: (url, data, config) => dispatch("put", url, data, config).then((data) => ({ data })),
    delete: (url, config) => dispatch("delete", url, null, config).then((data) => ({ data })),
  };
}

export async function downloadCsv(list) {
  const sorted = [...list].sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );
  const lines = ['"Fecha";"Proveedor";"Categoría";"Proyecto / Obra";"Importe (€)";"Notas"'];
  sorted.forEach((e) => {
    const row = [
      csvSafe(e.date || ""),
      csvSafe(e.vendor || ""),
      csvSafe(e.category || ""),
      csvSafe(e.project || ""),
      round2(e.amount).toFixed(2),
      csvSafe(e.notes || ""),
    ];
    lines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
  });
  const content = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gastos.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function localExportCsv() {
  return downloadCsv(await readExpenses());
}
