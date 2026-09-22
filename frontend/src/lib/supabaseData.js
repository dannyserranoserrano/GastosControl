import { supabase } from "./supabase";
import { DEFAULT_CATEGORIES } from "./constants";
import { downloadCsv } from "./localBackend";
import { fileToDataUrl, dataUrlToBlob } from "./imageFile";
import { normalizePeriod, periodRange } from "./period";

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function fail(status, detail) {
  const err = new Error(detail || "Error");
  err.response = { status, data: { detail } };
  return err;
}

// Detecta si un error de PostgREST se debe a una columna inexistente concreta
// (p. ej. `project`/`receipts` cuando no se ha ejecutado el schema actualizado).
// Debe ser específico: el error nombra la columna, así no confundimos una columna
// inexistente con otra (lo que provocaba guardar filas sin `project`, etc.).
function missingColumn(error, column) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  const col = String(column).toLowerCase();
  return msg.includes(col);
}

const sortOtrosLast = (a, b) => {
  if (a.name === "Otros") return 1;
  if (b.name === "Otros") return -1;
  return a.name.localeCompare(b.name);
};

function matchExpenseId(url) {
  const m = url.match(/^\/expenses\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function matchCategoryName(url) {
  const m = url.match(/^\/categories\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function requireUser() {
  if (!supabase) throw fail(401, "Supabase no configurado");
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw fail(401, "No autenticado");
  return data.user;
}

function cleanExpense(e) {
  const { user_id: _user_id, ...rest } = e || {};
  return { ...rest, amount: Number(e.amount || 0) };
}

async function getCategories(user, project) {
  const proj = String(project || "").trim();
  const run = async (withProject) => {
    let q = supabase
      .from("categories")
      .select("name,icon,color")
      .eq("user_id", user.id);
    if (withProject && proj) q = q.eq("project", proj);
    return q.order("name");
  };
  let { data, error } = await run(true);
  if (error && missingColumn(error, "project")) {
    ({ data, error } = await run(false));
  }
  if (error) throw fail(500, error.message);
  if (data && data.length > 0) return data;

  const rows = DEFAULT_CATEGORIES.map((c) => ({ user_id: user.id, project: proj, ...c }));
  let { error: seedErr } = await supabase.from("categories").insert(rows);
  if (seedErr && missingColumn(seedErr, "project")) {
    const rows2 = DEFAULT_CATEGORIES.map((c) => ({ user_id: user.id, ...c }));
    ({ error: seedErr } = await supabase.from("categories").insert(rows2));
  }
  if (seedErr) {
    // P. ej. constraint unique(user_id, name) antiguo: no es fatal, se usan las por defecto.
    if (seedErr.code === "23505") return DEFAULT_CATEGORIES;
    throw fail(500, seedErr.message);
  }
  return DEFAULT_CATEGORIES;
}

async function listExpenses(user) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(2000);
  if (error) throw fail(500, error.message);
  return (data || []).map(cleanExpense);
}

export async function uploadReceiptToStorage(userId, dataUrl) {
  try {
    const { blob, ext } = dataUrlToBlob(dataUrl);
    const path = `${userId}/${uid()}.${ext}`;
    const { error } = await supabase.storage
      .from("receipts")
      .upload(path, blob, { upsert: false, contentType: blob.type });
    if (error) throw error;
    // Bucket privado: se guarda la ruta de storage y se sirve con URL firmada
    // (ver resolveReceiptSrc en lib/receipts.js).
    return path;
  } catch {
    return dataUrl;
  }
}

async function postCategory(user, body) {
  const project = String((body && body.project) || "").trim();
  const cats = await getCategories(user, project);
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
  let { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, project, ...doc });
  if (error && missingColumn(error, "project")) {
    ({ error } = await supabase.from("categories").insert({ user_id: user.id, ...doc }));
  }
  if (error) throw fail(500, error.message);
  return doc;
}

async function deleteCategory(user, catName, project) {
  if (catName === "Otros") throw fail(400, "La categoría 'Otros' no se puede borrar");
  const proj = String(project || "").trim();
  const cats = await getCategories(user, proj);
  if (!cats.some((c) => c.name === catName)) {
    throw fail(404, "Categoría no encontrada");
  }
  const expenses = await listExpenses(user);
  const used = expenses.filter(
    (e) => e.category === catName && (e.project || "") === proj
  ).length;
  if (used > 0) {
    throw fail(400, `No se puede borrar: hay ${used} gasto(s) en esta categoría`);
  }
  let q = supabase
    .from("categories")
    .delete()
    .eq("user_id", user.id)
    .eq("name", catName);
  if (proj) q = q.eq("project", proj);
  let { error } = await q;
  if (error && missingColumn(error, "project")) {
    ({ error } = await supabase
      .from("categories")
      .delete()
      .eq("user_id", user.id)
      .eq("name", catName));
  }
  if (error) throw fail(500, error.message);
  return { ok: true };
}

async function renameProject(user, body) {
  const from = String((body && body.from) || "").trim();
  const to = String((body && body.to) || "").trim().slice(0, 80);
  if (!from || !to) throw fail(400, "Nombre inválido");
  if (from === to) return { ok: true, project: to, expenses: 0 };
  const norm = (s) => String(s || "").trim().toLowerCase();

  const { data: candidates } = await supabase
    .from("expenses")
    .select("project")
    .eq("user_id", user.id)
    .ilike("project", to);
  const clash = (candidates || []).some(
    (e) => norm(e.project) === norm(to) && norm(e.project) !== norm(from)
  );
  if (clash) throw fail(409, "Ya existe un proyecto con ese nombre");

  const { error: expErr } = await supabase
    .from("expenses")
    .update({ project: to })
    .eq("user_id", user.id)
    .ilike("project", from);
  if (expErr && missingColumn(expErr, "project")) throw fail(500, expErr.message);
  if (expErr) throw fail(500, expErr.message);

  const { data: row } = await supabase
    .from("budget")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (row && row.projects) {
    const projects = { ...row.projects };
    let changed = false;
    for (const k of Object.keys(projects)) {
      if (norm(k) === norm(from) && k !== to) {
        projects[to] = projects[k];
        delete projects[k];
        changed = true;
      }
    }
    if (changed) await upsertBudgetRow({ ...row, projects });
  }

  await supabase
    .from("categories")
    .update({ project: to })
    .eq("user_id", user.id)
    .ilike("project", from);

  return { ok: true, project: to };
}

async function uploadReceiptList(userId, rawList) {
  const out = [];
  for (const r of rawList || []) {
    let path = (r && (r.path || r.url)) || null;
    let url = (r && (r.url || r.path)) || null;
    if (path && path.startsWith("data:")) {
      const publicUrl = await uploadReceiptToStorage(userId, path);
      path = publicUrl;
      url = publicUrl;
    }
    if (path || url) out.push({ path, url });
  }
  return out;
}

async function insertExpense(user, body) {
  const cats = await getCategories(user, body && body.project);
  const category = cats.some((c) => c.name === (body && body.category))
    ? body.category
    : "Otros";

  let receipts = Array.isArray(body && body.receipts)
    ? await uploadReceiptList(user.id, body.receipts)
    : [];
  if (receipts.length === 0 && body && body.receipt_path) {
    receipts = await uploadReceiptList(user.id, [
      { path: body.receipt_path, url: body.receipt_url || body.receipt_path },
    ]);
  }
  const receipt_path = receipts[0]?.path || null;
  const receipt_url = receipts[0]?.url || null;

  const row = {
    id: uid(),
    user_id: user.id,
    vendor: (body && body.vendor) || "",
    date: (body && body.date) || today(),
    amount: Number((body && body.amount) || 0),
    category: category || "Otros",
    project: String((body && body.project) || "").trim().slice(0, 80),
    notes: (body && body.notes) || "",
    items: (body && body.items) || [],
    receipts,
    receipt_path,
    receipt_url,
  };
  let { error } = await supabase.from("expenses").insert(row);
  if (error && (missingColumn(error, "receipts") || missingColumn(error, "project"))) {
    const { receipts: _r, project: _p, ...rest } = row;
    if (!missingColumn(error, "receipts")) rest.receipts = receipts;
    if (!missingColumn(error, "project")) rest.project = row.project;
    ({ error } = await supabase.from("expenses").insert(rest));
  }
  if (error) throw fail(500, error.message);
  return {
    id: row.id,
    vendor: row.vendor,
    date: row.date,
    amount: row.amount,
    category: row.category,
    project: row.project,
    notes: row.notes,
    items: row.items,
    receipts,
    receipt_path,
    receipt_url,
    created_at: new Date().toISOString(),
  };
}

async function patchExpense(user, id, body) {
  const updates = {};
  ["vendor", "date", "amount", "category", "project", "notes", "items"].forEach((k) => {
    if (body && body[k] !== undefined) updates[k] = body[k];
  });
  if (body && body.receipts !== undefined) {
    updates.receipts = await uploadReceiptList(user.id, body.receipts);
    updates.receipt_path = updates.receipts[0]?.path || null;
    updates.receipt_url = updates.receipts[0]?.url || null;
  }
  if (updates.project !== undefined) updates.project = String(updates.project || "").trim().slice(0, 80);
  const cats = await getCategories(user, updates.project);
  if (updates.category !== undefined) {
    updates.category = cats.some((c) => c.name === updates.category)
      ? updates.category
      : "Otros";
  }
  let { data, error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error && (missingColumn(error, "receipts") || missingColumn(error, "project"))) {
    const rest = { ...updates };
    if (missingColumn(error, "receipts")) {
      delete rest.receipts;
      delete rest.receipt_path;
      delete rest.receipt_url;
    }
    if (missingColumn(error, "project")) delete rest.project;
    ({ data, error } = await supabase
      .from("expenses")
      .update(rest)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle());
  }
  if (error) throw fail(500, error.message);
  if (!data) throw fail(404, "Not found");
  return cleanExpense(data);
}

async function getBudget(user, project) {
  const { data, error } = await supabase
    .from("budget")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw fail(500, error.message);
  const proj = String(project || "").trim();
  const row = data || {};
  const src = proj ? ((row.projects || {})[proj] || {}) : row;
  const alertRaw = Number(src.alert_at);
  return {
    total: Number(src.total || 0),
    alert_at: alertRaw > 0 ? alertRaw : 80,
    updated_at: src.updated_at || row.updated_at || null,
    category_budgets: src.category_budgets || {},
    project_budgets: row.project_budgets || {},
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

async function upsertBudgetRow(doc, { requireProjects = false } = {}) {
  const optional = ["project_budgets", "period"];
  if (!requireProjects) optional.unshift("projects");
  let attempt = { ...doc };
  for (let i = 0; i <= optional.length; i++) {
    const { error } = await supabase.from("budget").upsert(attempt, { onConflict: "user_id" });
    if (!error) return null;
    const missing = optional.find((k) => k in attempt && missingColumn(error, k));
    if (!missing) return error;
    const { [missing]: _omit, ...rest } = attempt;
    attempt = rest;
  }
  return null;
}

async function putBudget(user, body) {
  const total = Number((body && body.total) || 0);
  const alertRaw = Number((body && body.alert_at) || 0);
  const project = String((body && body.project) || "").trim();
  const entry = {
    total,
    alert_at: alertRaw > 0 ? alertRaw : 80,
    updated_at: new Date().toISOString(),
    category_budgets: sanitizeCategoryBudgets(body && body.category_budgets),
    period: normalizePeriod(body && body.period),
  };

  const { data: existing } = await supabase
    .from("budget")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const row = existing || {};

  const doc = {
    user_id: user.id,
    total: project ? Number(row.total || 0) : total,
    alert_at: project ? Number(row.alert_at || 80) : entry.alert_at,
    updated_at: entry.updated_at,
    category_budgets: project ? row.category_budgets || {} : entry.category_budgets,
    period: project ? normalizePeriod(row.period) : entry.period,
  };
  if (project) doc.projects = { ...(row.projects || {}), [project]: entry };

  const error = await upsertBudgetRow(doc, { requireProjects: !!project });
  if (error) {
    const msg = missingColumn(error, "projects")
      ? "Falta actualizar la base de datos de Supabase: ejecuta supabase/schema.sql (columna budget.projects)."
      : error.message;
    throw fail(500, msg);
  }

  return {
    ...entry,
    total: project ? Number(row.total || 0) : total,
    project,
  };
}

async function stats(user, project) {
  const projectFilter = String(project || "").trim();
  let list = await listExpenses(user);
  if (projectFilter) {
    list = list.filter((e) => (e.project || "") === projectFilter);
  }
  const cats = await getCategories(user, projectFilter);
  const budget = await getBudget(user, projectFilter);

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

async function scan(user, body) {
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

async function dispatch(method, url, body, config) {
  const user = await requireUser();
  const params = (config && config.params) || {};

  if (url === "/categories") {
    if (method === "get") {
      const cats = await getCategories(user, params.project);
      return { categories: [...cats].sort(sortOtrosLast) };
    }
    if (method === "post") return postCategory(user, body);
  }

  const catName = matchCategoryName(url);
  if (catName != null && method === "delete") {
    return deleteCategory(user, catName, params.project);
  }

  if (url === "/expenses") {
    if (method === "get") {
      let list = await listExpenses(user);
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
      return list;
    }
    if (method === "post") return insertExpense(user, body);
  }

  const expId = matchExpenseId(url);
  if (expId != null) {
    if (method === "get") {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", expId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw fail(500, error.message);
      if (!data) throw fail(404, "Not found");
      return cleanExpense(data);
    }
    if (method === "patch") return patchExpense(user, expId, body);
    if (method === "delete") {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expId)
        .eq("user_id", user.id);
      if (error) throw fail(500, error.message);
      return { ok: true };
    }
  }

  if (url === "/projects/rename" && method === "post") return renameProject(user, body);
  if (url === "/stats") return stats(user, params.project);
  if (url === "/budget") {
    if (method === "get") return getBudget(user, params.project);
    if (method === "put") return putBudget(user, body);
  }
  if (url === "/receipts/scan" && method === "post") return scan(user, body);

  throw fail(404, "Not found");
}

export function createSupabaseApi() {
  return {
    get: (url, config) => dispatch("get", url, null, config).then((data) => ({ data })),
    post: (url, data, config) => dispatch("post", url, data, config).then((data) => ({ data })),
    patch: (url, data, config) => dispatch("patch", url, data, config).then((data) => ({ data })),
    put: (url, data, config) => dispatch("put", url, data, config).then((data) => ({ data })),
    delete: (url, config) => dispatch("delete", url, null, config).then((data) => ({ data })),
  };
}

export async function supabaseExportCsv() {
  const user = await requireUser();
  return downloadCsv(await listExpenses(user));
}
