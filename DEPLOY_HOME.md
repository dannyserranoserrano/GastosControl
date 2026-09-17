# Desplegar GastoControl en producción (servidor local con Apache + DuckDNS)

Prompt para pegar en la aplicación opencode del servidor de casa:

```
# Tarea: Desplegar GastoControl en producción en este servidor (Apache) con dominio gratuito DuckDNS

Eres opencode trabajando en el servidor local de casa (Apache corriendo en Linux).
Vas a desplegar el proyecto GastoControl, presencial en https://github.com/dannyserranoserrano/GastosControl
(rama main), en modo "Opción C":

- Datos por usuario: Supabase (sesión) o modo local del navegador (invitado). El frontend es estático.
- OCR de tickets: backend FastAPI en este servidor (MongoDB NO es requerido; debe arrancar en modo OCR-only).
- Lee SIEMPRE el archivo AGENTS.md del repo y respeta sus convenciones.

## Paso 1: Preparación del entorno
1. Instala lo que falte: git, Node 18+ (Vite 6), Python 3.10+, pip, apache2, certbot. No rompas una web
   existente que pueda haber en Apache: crea un vhost NUEVO, nunca toques los actuales salvo lo imprescindible.
2. Clona el repo en, p. ej., ~/GastosControl  ->  git clone https://github.com/dannyserranoserrano/GastosControl.git
3. Lee AGENTS.md, design_guidelines.json y memory/PRD.md para contexto.

## Paso 2: Dominio gratuito DuckDNS
PREGUNTA al usuario y no inventes valores: 1) subdominio elegido (ej. gastoscontrol), 2) el token de DuckDNS,
3) la IP LAN de este servidor (puedes deducirla con hostname -I pero confírmala).
- Averigua la IP pública actual (curl ifconfig.me o similar) y muéstrala.
- Crea un script /usr/local/bin/duckdns-update.sh que haga:
    echo url="https://www.duckdns.org/update?domains=SUBDOMINIO&token=TOKEN&ip=" | curl -k -o /dev/null -s -w "OK\n" https://www.duckdns.org/update?domains=SUBDOMINIO&token=TOKEN&ip=
  hazlo ejecutable, pruébalo y añade un cronjob cada 5 minutos.
- INDICA claramente al usuario (tarea manual, no la puedes hacer tú): abrir en el router los puertos TCP 80 y
  443 hacia la IP LAN del servidor, y esperar a que el DNS de DuckDNS resuelva.

## Paso 3: Frontend estático
1. En frontend/, crea frontend/.env (NO lo subas a git; ver .gitignore) pidiendo al usuario:
   - VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (¿las tiene de su proyecto Supabase?), o déjalas como en .env.example
   - VITE_BACKEND_URL=https://[SUBDOMINIO].duckdns.org
2. Instala dependencias (yarn si existe, si no npm install) y ejecuta el build de producción.
3. Copia el contenido de dist/ a /var/www/gastoscontrol/ (o ruta equivalente).

## Paso 4: Apache vhost + SPA fallback + reverse proxy
1. Crea /etc/apache2/sites-available/gastoscontrol.conf con:
   - ServerName [SUBDOMINIO].duckdns.org
   - DocumentRoot al directorio del paso 3
   - SPA fallback (React Router): RewriteEngine On y servir index.html para rutas que no existan como archivo
     (p.ej. FallbackResource /index.html o RewriteCond %{REQUEST_FILENAME} !-f -> RewriteRule .* /index.html [L])
   - Reverse proxy solo para /api/ hacia el backend: ProxyPass /api http://127.0.0.1:8000/api y
     ProxyPassReverse /api http://127.0.0.1:8000/api
2. Habilita módulos (rewrite, proxy, proxy_http, headers) si no están, habilita el sitio y recarga Apache.
3. (Pendiente manual) Informa al usuario: una vez el DNS resuelva, hay que usar el dominio, no la IP.

## Paso 5: HTTPS con Let's Encrypt (OBLIGATORIO: Supabase solo permite OAuth a https, salvo localhost)
1. Ejecuta certbot con certificado por HTTP-01 si el dominio ya resuelve y el puerto 80 está abierto.
   Si aún no resuelve, usa un hook de DuckDNS para DNS-01 (TXT record [SUBDOMINIO].duckdns.org con el token).
2. Configura renovación automática (systemd timer o cron) y redirección HTTP -> HTTPS en el vhost.
3. Verifica que /api sigue funcionando tras el TLS.

## Paso 6: Backend OCR (FastAPI, OCR-only)
1. En backend/, crea backend/.env (NO subir a git) con EMERGENT_LLM_KEY pedida al usuario y SIN MONGO_URL
   (sin variante se debe encender en modo OCR-only). Nunca muestres ni registres la clave.
2. Crea un venv de Python, instala requirements.txt y haz un smoke test: GET localhost:8000/api/ y
   GET localhost:8000/api/files/... no debe haber rutas de datos (dan 503 → correcto).
3. Crea una unidad systemd (gastocontrol-ocr.service) que ejecute uvicorn server:app --host 127.0.0.1
   --port 8000 con el venv, Activate, habilita en boot y endurel (solo escucha en localhost; Apache hace de proxy).

## Paso 7: Verificación final
1. curl -I https://[SUBDOMINIO].duckdns.org/ -> 200
2. curl -I https://[SUBDOMINIO].duckdns.org/gastos -> 200 (SPA fallback funciona)
3. curl https://[SUBDOMINIO].duckdns.org/api/ -> {"message":"GastoControl API",...}
4. Si el usuario ya tiene autorizados los proveedores de login en Supabase, indica QUE ÉL debe añadir en
   Supabase Dashboard (Authentication → URL Configuration) la Redirect URL https://[SUBDOMINIO].duckdns.org/**

## Reglas de la tarea
- Nunca subas .env ni claves a GitHub. No cometas nada en el repositorio salvo que el usuario lo pida.
- Pide la interacción manual solo cuando sea imprescindible (router, DuckDNS token, claves, Supabase redir).
- Al terminar, entrega un resumen: qué quedó hecho, URL pública, qué tareas manuales quedan pendientes
  y cómo comprobar el escaneo de un ticket (curl con un archivo de imagen contra /api/receipts/scan).
```

## Marcadores a rellenar antes de usarlo

- `[SUBDOMINIO]` → subdominio elegido en DuckDNS (ej. `gastoscontrol`).
- `[TOKEN]` → token de tu cuenta DuckDNS.
- IP LAN del servidor y claves (Supabase `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, `EMERGENT_LLM_KEY`) → se
  piden al usuario en el servidor; no las guardes aquí.