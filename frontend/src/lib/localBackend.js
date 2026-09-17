import { DEFAULT_CATEGORIES } from "./constants";
import { dbGet, dbSet } from "./storage";

const K = {
  categories: "gastocontrol:categories",
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

async function readCategories() {
  const cats = await dbGet(K.categories);
  if (cats && cats.length > 0) return cats;
  await dbSet(K.categories, DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
}

async function persistCategories(cats) {
  await dbSet(K.categories, cats);
  return cats;
}

async function readExpenses() {
  return (await dbGet(K.expenses)) || [];
}

async function persistExpenses(list) {
  await dbSet(K.expenses, list);
  return list;
}

async function readBudget() {
  const b = (await dbGet(K.budget)) || { total: 0 };
  const alertRaw = Number(b.alert_at);
  return {
    total: Number(b.total || 0),
    alert_at: alertRaw > 0 ? alertRaw : 80,
    updated_at: b.updated_at || null,
  };
}

const sortOtrosLast = (a, b) => {
  if (a.name === "Otros") return 1;
  if (b.name === "Otros") return -1;
  return a.name.localeCompare(b.name);
};

async function normalizeCategory(cat, cats) {
  return cats.some((c) => c.name === cat) ? cat : "Otros";
}

async function buildExpense(body, cats) {
  return {
    id: uid(),
    vendor: (body && body.vendor) || "",
    date: (body && body.date) || today(),
    amount: Number((body && body.amount) || 0),
    category: await normalizeCategory((body && body.category) || "Otros", cats),
    notes: (body && body.notes) || "",
    items: (body && body.items) || [],
    receipt_path: (body && body.receipt_path) || null,
    receipt_url: (body && body.receipt_url) || null,
    created_at: new Date().toISOString(),
  };
}

// --- image utils (attach photo without AI) ---
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load error"));
    img.src = src;
  });
}

export async function fileToDataUrl(file) {
  const original = await blobToDataUrl(file);
  if (!/^image\//.test(file && file.type)) return original;
  try {
    const img = await loadImage(original);
    const width = img.naturalWidth || img.width || 0;
    const height = img.naturalHeight || img.height || 0;
    const max = 1600;
    if (width <= max && height <= max) return original;
    const scale = Math.min(max / width, max / height);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return original;
  }
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
      const cats = await readCategories();
      return { categories: [...cats].sort(sortOtrosLast) };
    }
    if (method === "post") {
      const cats = await readCategories();
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
      await persistCategories([...cats, doc]);
      return doc;
    }
  }

  const catName = matchCategoryName(url);
  if (catName != null && method === "delete") {
    const cats = await readCategories();
    if (catName === "Otros") throw fail(400, "La categoría 'Otros' no se puede borrar");
    const expenses = await readExpenses();
    const used = expenses.filter((e) => e.category === catName).length;
    if (used > 0) {
      throw fail(400, `No se puede borrar: hay ${used} gasto(s) en esta categoría`);
    }
    const next = cats.filter((c) => c.name !== catName);
    if (next.length === cats.length) throw fail(404, "Categoría no encontrada");
    await persistCategories(next);
    return { ok: true };
  }

  if (url === "/expenses") {
    if (method === "get") {
      let list = await readExpenses();
      const { q, category, start, end } = params;
      if (category && category !== "all") {
        list = list.filter((e) => e.category === category);
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
      const cats = await readCategories();
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
      const cats = await readCategories();
      const next = { ...list[idx] };
      ["vendor", "date", "amount", "category", "notes", "items"].forEach((k) => {
        if (body && body[k] !== undefined) next[k] = body[k];
      });
      next.category = await normalizeCategory(next.category, cats);
      list[idx] = next;
      await persistExpenses(list);
      return next;
    }
    if (method === "delete") {
      if (idx === -1) throw fail(404, "Not found");
      list.splice(idx, 1);
      await persistExpenses(list);
      return { ok: true };
    }
  }

  if (url === "/stats") {
    const list = await readExpenses();
    const cats = await readCategories();
    const budget = await readBudget();

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

    const budgetTotal = budget.total;
    const progress = budgetTotal > 0 ? (total / budgetTotal) * 100 : 0;

    return {
      total_spent: round2(total),
      count: list.length,
      budget: budgetTotal,
      remaining: round2(budgetTotal - total),
      progress: round2(progress),
      alert_at: budget.alert_at,
      by_category,
      monthly: monthlyList,
    };
  }

  if (url === "/budget") {
    if (method === "get") {
      return readBudget();
    }
    if (method === "put") {
      const alertRaw = Number((body && body.alert_at) || 0);
      const doc = {
        total: Number((body && body.total) || 0),
        alert_at: alertRaw > 0 ? alertRaw : 80,
        updated_at: new Date().toISOString(),
      };
      await dbSet(K.budget, doc);
      return doc;
    }
  }

  if (url === "/receipts/scan" && method === "post") {
    const file = body && typeof body.get === "function" ? body.get("file") : null;
    const dataUrl = file ? await fileToDataUrl(file) : null;
    if (!dataUrl) throw fail(400, "Empty file");
    return {
      receipt_path: dataUrl,
      receipt_url: dataUrl,
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
  const lines = ['"Fecha";"Proveedor";"Categoría";"Importe (€)";"Notas"'];
  sorted.forEach((e) => {
    const row = [
      e.date || "",
      e.vendor || "",
      e.category || "",
      round2(e.amount).toFixed(2),
      e.notes || "",
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