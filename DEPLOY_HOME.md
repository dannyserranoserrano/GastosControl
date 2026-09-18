# Desplegar GastoControl en producción (servidor local con Apache)

Dominio de producción: **https://gastocontrol.villadeciria.com**

Prompt para pegar en la aplicación opencode del servidor de casa:

```
# Tarea: Desplegar GastoControl en producción en este servidor (Apache) con el dominio gastocontrol.villadeciria.com

Eres opencode trabajando en el servidor local de casa (Apache corriendo en Linux).
Vas a desplegar el proyecto GastoControl, presente en https://github.com/dannyserranoserrano/GastosControl
(rama main), en modo "Opción C":

- Datos por usuario: Supabase (sesión) o modo local del navegador (invitado). El frontend es estático.
- OCR de tickets: backend FastAPI en este servidor (MongoDB NO es requerido; debe arrancar en modo OCR-only).
- Lee SIEMPRE el archivo AGENTS.md del repo y respeta sus convenciones.

## Paso 1: Preparación del entorno
1. Instala lo que falte: git, Node 18+ (Vite 6), Python 3.10+, pip, apache2, certbot. No rompas una web
   existente que pueda haber en Apache (p. ej. villadeciria.com): crea un vhost NUEVO, nunca toques los
   actuales salvo lo imprescindible.
2. Clona el repo en, p. ej., ~/GastosControl  ->  git clone https://github.com/dannyserranoserrano/GastosControl.git
3. Lee AGENTS.md, design_guidelines.json y memory/PRD.md para contexto.

## Paso 2: Dominio y DNS
El dominio es gastocontrol.villadeciria.com. El DNS lo gestiona el proveedor del dominio (No-IP/niip) y
YA incluye un comodín que resuelve el subdominio:
    @                        A       <IP pública>
    www                      A       <IP pública>
    *.villadeciria.com       CNAME   www.villadeciria.com
- No hace falta crear un registro nuevo para gastocontrol.villadeciria.com (lo cubre `*`).
- Verifica la IP pública (curl ifconfig.me) y que el subdominio resuelve (getent hosts o consulta DNS).
- INDICA claramente al usuario (tarea manual, no la puedes hacer tú): abrir en el router los puertos TCP 80 y
  443 hacia la IP LAN del servidor.

## Paso 3: Frontend estático
1. En frontend/, crea frontend/.env (NO lo subas a git; ver .gitignore) con:
   - VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (las de su proyecto Supabase)
   - VITE_BACKEND_URL=https://gastocontrol.villadeciria.com
   - Opcional: VITE_OCR_KEY (misma que APP_API_KEY del backend) y VITE_TURNSTILE_SITE_KEY (CAPTCHA)
2. Compila y publica con el script del repo:
       ./deploy/deploy.sh
   (hace el build con VITE_BACKEND_URL y sincroniza dist/ en /var/www/gastoscontrol con el propietario web).

## Paso 4: Apache vhost + SPA fallback + reverse proxy + cabeceras
1. Instala los vhosts con el script (sustituye el dominio y valida antes de recargar, sin tocar otros sitios):
       ./deploy/install-apache.sh
   Incluye: redirección :80 -> :443, SPA fallback (`FallbackResource /index.html`), proxy solo de /api hacia
   http://127.0.0.1:8010/api y cabeceras de seguridad (HSTS, CSP, X-Frame-Options, etc.).

## Paso 5: HTTPS con Let's Encrypt (OBLIGATORIO: Supabase solo permite OAuth a https, salvo localhost)
1. Emite el certificado por HTTP-01 (el dominio ya resuelve y el puerto 80 está abierto):
       sudo certbot certonly --webroot -w /var/www/html -d gastocontrol.villadeciria.com
2. Certbot programa la renovación automática; no se necesita hook de DNS.
3. Verifica que /api sigue funcionando tras el TLS.

## Paso 6: Backend OCR (FastAPI, OCR-only)
1. En backend/, crea backend/.env (NO subir a git) con GEMINI_API_KEY (o EMERGENT_LLM_KEY) y SIN MONGO_URL
   (así arranca en modo OCR-only). Nunca muestres ni registres la clave. Añade APP_API_KEY para exigir la
   cabecera X-App-Key en el OCR y CORS_ORIGINS con el dominio.
2. Crea un venv de Python, instala requirements.txt y haz un smoke test:
   GET localhost:8010/api/ y GET localhost:8010/api/files/... (las rutas de datos dan 503 -> correcto).
3. Crea una unidad systemd (gastocontrol-ocr.service) que ejecute uvicorn server:app --host 127.0.0.1
   --port 8010 con el venv, habilítala en boot y deja que solo escuche en localhost (Apache hace de proxy).

## Paso 7: Endurecimiento
Sigue `deploy/README.md` (§6): cabeceras ya incluidas en el vhost, bucket de Supabase privado
(`supabase/fix_receipts_policies.sql` y `supabase/private_receipts.sql`), clave del OCR, fail2ban
(`deploy/fail2ban-gastoscontrol-*.conf`) y, opcionalmente, CAPTCHA con Cloudflare Turnstile
(añadir el hostname gastocontrol.villadeciria.com al widget).

## Paso 8: Verificación final
1. curl -I http://gastocontrol.villadeciria.com/   -> 301 a https
2. curl -I https://gastocontrol.villadeciria.com/  -> 200
3. curl -I https://gastocontrol.villadeciria.com/gastos -> 200 (SPA fallback)
4. curl https://gastocontrol.villadeciria.com/api/ -> {"message":"GastoControl API",...}
5. El usuario debe añadir en Supabase Dashboard (Authentication → URL Configuration) la Redirect URL
   https://gastocontrol.villadeciria.com/**

## Reglas de la tarea
- Nunca subas .env ni claves a GitHub. No cometas nada en el repositorio salvo que el usuario lo pida.
- Pide la interacción manual solo cuando sea imprescindible (router, claves, Supabase redirect, router).
- Al terminar, entrega un resumen: qué quedó hecho, URL pública, tareas manuales pendientes y cómo comprobar
  el escaneo de un ticket (curl con una imagen contra /api/receipts/scan, con cabecera X-App-Key si aplica).
```

## Marcadores y datos que se piden al usuario

- Dominio: `gastocontrol.villadeciria.com` (cubierto por el comodín `*.villadeciria.com`).
- IP pública/LAN del servidor y reenvío de puertos 80/443 en el router.
- Claves (Supabase `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`/`EMERGENT_LLM_KEY`,
  `APP_API_KEY`/`VITE_OCR_KEY`, `VITE_TURNSTILE_SITE_KEY`) → se piden al usuario en el servidor; no las guardes aquí.
