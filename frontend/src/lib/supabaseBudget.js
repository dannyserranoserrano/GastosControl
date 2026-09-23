import { supabase } from "./supabase";
import { normalizePeriod } from "./period";
import { sanitizeCategoryBudgets } from "./budget";
import { fail, missingColumn } from "./dataHelpers";

// Dominio de presupuesto sobre Supabase (extraído de lib/supabaseData.js).

export async function getBudget(user, project) {
  const { data, error } = await supabase
    .from("budget")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw fail(500, error.message);
  const proj = String(project || "").trim();
  const row = data || {};
  const src = proj ? (row.projects || {})[proj] || {} : row;
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

export async function upsertBudgetRow(doc, { requireProjects = false } = {}) {
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

export async function putBudget(user, body) {
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
