import { supabase } from "./supabase";
import { readLocalStore } from "./localBackend";
import { DEFAULT_CATEGORIES } from "./constants";
import { uploadReceiptToStorage } from "./supabaseData";
import { dbGet, dbSet } from "./storage";

const flagKey = (userId) => `gastocontrol:migrated:${userId}`;

export async function isMigratedFor(userId) {
  return Boolean(await dbGet(flagKey(userId)));
}

export async function markMigratedFor(userId) {
  await dbSet(flagKey(userId), true);
}

export async function localDataSummary() {
  const { expenses, budget } = await readLocalStore();
  return { count: expenses.length, budget };
}

export async function importLocalToCloud(userId) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { categories, expenses, budget } = await readLocalStore();

  // 1) Categorías: unión por nombre
  const { data: cloudCats, error: catsErr } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", userId);
  if (catsErr) throw catsErr;
  const existingNames = new Set((cloudCats || []).map((c) => c.name));
  const catRows = [];
  const localCats = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  for (const c of localCats) {
    if (c.name && !existingNames.has(c.name)) {
      catRows.push({
        user_id: userId,
        name: c.name,
        icon: c.icon || "MoreHorizontal",
        color: c.color || "stone",
      });
      existingNames.add(c.name);
    }
  }
  if (catRows.length > 0) {
    const { error } = await supabase.from("categories").insert(catRows);
    if (error) throw error;
  }

  // 2) Gastos: insertar los que no existan (por id)
  const { data: cloudIds, error: idsErr } = await supabase
    .from("expenses")
    .select("id")
    .eq("user_id", userId);
  if (idsErr) throw idsErr;
  const idSet = new Set((cloudIds || []).map((e) => e.id));
  const expenseRows = [];
  for (const e of expenses) {
    if (idSet.has(e.id)) continue;
    idSet.add(e.id);

    let receipt_path = e.receipt_path || null;
    let receipt_url = e.receipt_url || null;
    if (receipt_path && receipt_path.startsWith("data:")) {
      const publicUrl = await uploadReceiptToStorage(userId, receipt_path);
      receipt_path = publicUrl;
      receipt_url = publicUrl;
    }

    expenseRows.push({
      id: e.id,
      user_id: userId,
      vendor: e.vendor || "",
      date: e.date || "",
      amount: Number(e.amount || 0),
      category: e.category || "Otros",
      notes: e.notes || "",
      items: e.items || [],
      receipt_path,
      receipt_url,
      created_at: e.created_at || new Date().toISOString(),
    });
  }
  for (let i = 0; i < expenseRows.length; i += 500) {
    const chunk = expenseRows.slice(i, i + 500);
    const { error } = await supabase.from("expenses").insert(chunk);
    if (error) throw error;
  }

  // 3) Presupuesto: solo si la nube no tiene uno definido
  if (budget > 0) {
    const { data: b, error: bErr } = await supabase
      .from("budget")
      .select("total")
      .eq("user_id", userId)
      .maybeSingle();
    if (bErr) throw bErr;
    if (!b || Number(b.total || 0) <= 0) {
      const { error } = await supabase
        .from("budget")
        .upsert(
          { user_id: userId, total: budget, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    }
  }

  return { imported: expenseRows.length, categories: catRows.length };
}