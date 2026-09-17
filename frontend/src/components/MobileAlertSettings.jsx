import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Send, SendHorizonal, Loader2, MessageCircle, Mail } from "lucide-react";
import { loadMobileConfig, saveMobileConfig, sendMobileTest, DEFAULT_EVENTS } from "../lib/mobileNotify";

const EVENT_LABELS = {
  budget_warn: "Aviso de presupuesto (cerca del umbral)",
  budget_over: "Presupuesto excedido",
  projection_warn: "Proyección en alerta",
  projection_over: "Proyección excedida",
  recurring_overdue: "Recurrentes vencidos",
  month_close: "Cierre de mes pendiente",
};

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-[#D95D39]" : "bg-[#E2DDD3]"} relative`}
      role="switch"
      aria-checked={value}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : ""}`} />
    </button>
  );
}

export default function MobileAlertSettings() {
  const [cfg, setCfg] = useState(loadMobileConfig);
  const [testing, setTesting] = useState(null);

  const persist = (next) => {
    setCfg(next);
    saveMobileConfig(next);
  };

  const setChannel = (ch, key, value) =>
    persist({ ...cfg, [ch]: { ...cfg[ch], [key]: value } });

  const setEvent = (key, value) =>
    persist({ ...cfg, events: { ...cfg.events, [key]: value } });

  const test = async (channel) => {
    setTesting(channel);
    try {
      await sendMobileTest(channel);
      if (!cfg[channel].enabled) {
        toast.success("Mensaje de prueba enviado", {
          description: "Activa el interruptor del canal para recibir avisos automáticos.",
        });
      } else {
        toast.success("Mensaje de prueba enviado");
      }
    } catch (err) {
      toast.error(err?.message || "No se pudo enviar la prueba");
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#229ED9]" />
            <h3 className="font-heading font-bold text-lg">Telegram</h3>
          </div>
          <Toggle value={cfg.telegram.enabled} onChange={(v) => setChannel("telegram", "enabled", v)} />
        </div>
        <p className="text-sm text-[#5C626A] mt-1 mb-4">
          Gratis y sin límite práctico. Requiere un bot propio.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Bot token</Label>
            <Input
              type="password"
              value={cfg.telegram.token}
              onChange={(e) => setChannel("telegram", "token", e.target.value)}
              placeholder="123456:ABC-DEF…"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Chat ID</Label>
            <Input
              value={cfg.telegram.chatId}
              onChange={(e) => setChannel("telegram", "chatId", e.target.value)}
              placeholder="Ej. 123456789"
              className="rounded-xl"
            />
          </div>
        </div>

        <details className="mt-3 text-xs text-[#5C626A]">
          <summary className="cursor-pointer">¿Cómo obtener el token y el chat ID?</summary>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>En Telegram, busca <strong>@BotFather</strong> → <code>/newbot</code> y copia el <strong>token</strong>.</li>
            <li>Envía un mensaje a tu bot (p. ej. «hola»).</li>
            <li>Abre <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> y copia <code>result[0].message.chat.id</code>.</li>
            <li>Pega ambos datos arriba.</li>
          </ol>
        </details>

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            data-testid="btn-test-telegram"
            className="rounded-xl border-[#E2DDD3]"
            onClick={() => test("telegram")}
            disabled={testing === "telegram" || !cfg.telegram.token || !cfg.telegram.chatId}
          >
            {testing === "telegram" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar prueba
          </Button>
        </div>
      </Card>

      <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#D95D39]" />
            <h3 className="font-heading font-bold text-lg">Correo (EmailJS)</h3>
          </div>
          <Toggle value={cfg.email.enabled} onChange={(v) => setChannel("email", "enabled", v)} />
        </div>
        <p className="text-sm text-[#5C626A] mt-1 mb-4">
          Gratis hasta 200 envíos/mes. Envía el aviso a tu correo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Service ID</Label>
            <Input
              value={cfg.email.serviceId}
              onChange={(e) => setChannel("email", "serviceId", e.target.value)}
              placeholder="service_xxx"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Template ID</Label>
            <Input
              value={cfg.email.templateId}
              onChange={(e) => setChannel("email", "templateId", e.target.value)}
              placeholder="template_xxx"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Public key</Label>
            <Input
              type="password"
              value={cfg.email.publicKey}
              onChange={(e) => setChannel("email", "publicKey", e.target.value)}
              placeholder="abcdEFGH…"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Destinatario (opcional)</Label>
            <Input
              type="email"
              value={cfg.email.to}
              onChange={(e) => setChannel("email", "to", e.target.value)}
              placeholder="tu@correo.com"
              className="rounded-xl"
            />
          </div>
        </div>

        <details className="mt-3 text-xs text-[#5C626A]">
          <summary className="cursor-pointer">¿Cómo configurar EmailJS?</summary>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Crea una cuenta en <strong>emailjs.com</strong> y conecta tu correo (Email Services).</li>
            <li>Crea una plantilla (Email Templates) que use <code>{`{{subject}}`}</code> y <code>{`{{message}}`}</code>.</li>
            <li>Copia <strong>Service ID</strong>, <strong>Template ID</strong> y <strong>Public Key</strong> → pégalos arriba.</li>
          </ol>
        </details>

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            data-testid="btn-test-email"
            className="rounded-xl border-[#E2DDD3]"
            onClick={() => test("email")}
            disabled={
              testing === "email" ||
              !cfg.email.serviceId ||
              !cfg.email.templateId ||
              !cfg.email.publicKey
            }
          >
            {testing === "email" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <SendHorizonal className="w-4 h-4 mr-2" />}
            Enviar prueba
          </Button>
        </div>
      </Card>

      <Card className="p-6 rounded-2xl border-[#E2DDD3] bg-white">
        <h3 className="font-heading font-bold text-lg">Avisos a enviar</h3>
        <p className="text-sm text-[#5C626A] mt-1 mb-4">
          Elige qué notificaciones se envían a los canales móviles activados.
        </p>
        <div className="space-y-2">
          {Object.keys(DEFAULT_EVENTS).map((key) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E2DDD3]">
              <span className="text-sm text-[#1A1D20]">{EVENT_LABELS[key] || key}</span>
              <Toggle value={cfg.events[key] !== false} onChange={(v) => setEvent(key, v)} />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#5C626A] mt-3">
          Los datos de configuración se guardan solo en este dispositivo. En Telegram, si el navegador
          bloquea la petición, se intenta un envío sin confirmación.
        </p>
      </Card>
    </div>
  );
}
