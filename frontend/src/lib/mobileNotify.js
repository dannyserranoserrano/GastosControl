const KEY = "gastocontrol:mobile_notify";

const t = (s) => String(s ?? "").trim();

function cleanTelegram(tg) {
  let token = t(tg.token);
  // Si pegaron la URL completa, extrae el token.
  const m = token.match(/bot(\d+:[A-Za-z0-9_-]+)/);
  if (m) token = m[1];
  token = token.replace(/^bot/i, "");
  return { enabled: !!tg.enabled, token, chatId: t(tg.chatId) };
}

function cleanEmail(em) {
  return {
    enabled: !!em.enabled,
    serviceId: t(em.serviceId),
    templateId: t(em.templateId),
    publicKey: t(em.publicKey),
    to: t(em.to),
  };
}

export const DEFAULT_EVENTS = {
  budget_over: true,
  budget_warn: true,
  projection_over: true,
  projection_warn: true,
  recurring_overdue: true,
  month_close: true,
};

const DEFAULT_CONFIG = {
  telegram: { enabled: false, token: "", chatId: "" },
  email: { enabled: false, serviceId: "", templateId: "", publicKey: "", to: "" },
  events: { ...DEFAULT_EVENTS },
};

export function loadMobileConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      telegram: cleanTelegram({ ...DEFAULT_CONFIG.telegram, ...(raw.telegram || {}) }),
      email: cleanEmail({ ...DEFAULT_CONFIG.email, ...(raw.email || {}) }),
      events: { ...DEFAULT_EVENTS, ...(raw.events || {}) },
    };
  } catch {
    return { telegram: { ...DEFAULT_CONFIG.telegram }, email: { ...DEFAULT_CONFIG.email }, events: { ...DEFAULT_EVENTS } };
  }
}

export function saveMobileConfig(cfg) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        telegram: cleanTelegram(cfg.telegram || {}),
        email: cleanEmail(cfg.email || {}),
        events: { ...DEFAULT_EVENTS, ...(cfg.events || {}) },
      })
    );
  } catch {
    /* ignore */
  }
}

async function sendTelegram(tg, text) {
  const token = t(tg.token);
  const chatId = t(tg.chatId);
  if (!token || !chatId) throw new Error("Faltan el token del bot o el chat ID");
  const base = `https://api.telegram.org/bot${token}`;
  try {
    const res = await fetch(`${base}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.description || `HTTP ${res.status}`);
    return { ok: true };
  } catch (err) {
    // Fallback sin CORS (no se puede confirmar la entrega)
    try {
      await fetch(
        `${base}/sendMessage?chat_id=${encodeURIComponent(chatId)}&text=${encodeURIComponent(text)}`,
        { mode: "no-cors" }
      );
      return { ok: true, warning: "Enviado sin confirmación (CORS)" };
    } catch {
      throw err;
    }
  }
}

async function sendEmailJS(em, subject, message) {
  const { serviceId, templateId, publicKey, to } = cleanEmail(em);
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        subject,
        title: subject,
        message,
        name: "GastoControl",
        to,
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return { ok: true };
}

/**
 * Envía un aviso a los canales móviles activados (Telegram y/o EmailJS)
 * si el evento está seleccionado. No lanza: devuelve el resultado por canal.
 */
export async function sendMobile(eventKey, title, body) {
  const cfg = loadMobileConfig();
  const results = [];
  if (cfg.events?.[eventKey] === false) return results;
  const text = body ? `${title}\n${body}` : title;

  if (cfg.telegram.enabled && cfg.telegram.token && cfg.telegram.chatId) {
    try {
      const r = await sendTelegram(cfg.telegram, text);
      results.push({ channel: "telegram", ...r });
    } catch (e) {
      results.push({ channel: "telegram", ok: false, error: e.message || String(e) });
    }
  }

  if (
    cfg.email.enabled &&
    cfg.email.serviceId &&
    cfg.email.templateId &&
    cfg.email.publicKey
  ) {
    try {
      const r = await sendEmailJS(cfg.email, title, body || "");
      results.push({ channel: "email", ...r });
    } catch (e) {
      results.push({ channel: "email", ok: false, error: e.message || String(e) });
    }
  }

  return results;
}

export async function sendMobileTest(channel) {
  const cfg = loadMobileConfig();
  const title = "GastoControl — prueba";
  const body = "Si ves este mensaje, el canal está configurado correctamente.";
  if (channel === "telegram") {
    if (!cfg.telegram.token || !cfg.telegram.chatId) throw new Error("Faltan token y chat ID");
    return sendTelegram(cfg.telegram, `${title}\n${body}`);
  }
  if (channel === "email") {
    if (!cfg.email.serviceId || !cfg.email.templateId || !cfg.email.publicKey) {
      throw new Error("Faltan service ID, template ID y public key");
    }
    return sendEmailJS(cfg.email, title, body);
  }
  throw new Error("Canal desconocido");
}
