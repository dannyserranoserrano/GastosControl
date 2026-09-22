const NORMALIZE_RE = /[\s\-_.,/]/g;

function normalize(str) {
  return String(str || "").toLowerCase().replace(NORMALIZE_RE, "");
}

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const max = Math.max(na.length, nb.length);
  return max === 0 ? 1 : 1 - levenshtein(na, nb) / max;
}

export function findDuplicates(expenses, { dateToleranceDays = 0, vendorMinSim = 0.92 } = {}) {
  const dupes = new Map();
  const byAmount = new Map();

  expenses.forEach((e) => {
    const key = Number(e.amount || 0).toFixed(2);
    if (!byAmount.has(key)) byAmount.set(key, []);
    byAmount.get(key).push(e);
  });

  for (const [, group] of byAmount) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const dayDiff = Math.abs((dateB - dateA) / (1000 * 60 * 60 * 24));
        if (dayDiff > dateToleranceDays) continue;
        const vendorSim = similarity(a.vendor, b.vendor);
        if (vendorSim < vendorMinSim) continue;
        if (!dupes.has(a.id)) dupes.set(a.id, []);
        if (!dupes.has(b.id)) dupes.set(b.id, []);
        dupes.get(a.id).push({ matched: b.id, score: Math.round(vendorSim * 100), reason: dayDiff === 0 ? "Mismo día" : `${dayDiff} día(s) diferencia` });
        dupes.get(b.id).push({ matched: a.id, score: Math.round(vendorSim * 100), reason: dayDiff === 0 ? "Mismo día" : `${dayDiff} día(s) diferencia` });
      }
    }
  }

  return dupes;
}
