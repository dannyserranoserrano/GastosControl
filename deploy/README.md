# Despliegue de GastoControl (servidor propio con Apache + HTTPS)

Plantillas para publicar el frontend estático y el backend OCR (FastAPI) detrás de Apache.
Sustituye los marcadores: `__DOMAIN__`, `__OCR_PORT__` (p. ej. `8010`), `__USER__`, `__APP_DIR__`,
`__SUBDOMAIN__` y `__TOKEN__`.

## Requisitos
- Ubuntu/Debian con **Apache 2.4**, módulos `rewrite`, `proxy`, `proxy_http`, `headers`, `ssl`.
- **Node 18+** y **Python 3.10+**.
- Dominio con **HTTPS** (Supabase OAuth requiere https salvo localhost). Aquí se usa DuckDNS + Let's Encrypt.

## 0) Despliegue rápido (recomendado)

```bash
./deploy/deploy.sh
```

Compila el frontend con `VITE_BACKEND_URL=https://$DOMAIN`, sincroniza `dist/` en
`$WEB_ROOT` y ajusta el propietario. Variables opcionales: `DOMAIN`
(por defecto `gastoscontrolapp.duckdns.org`), `WEB_ROOT` (`/var/www/gastoscontrol`)
y `WEB_USER` (`www-data`). Ejemplo:

```bash
DOMAIN=mi.dominio.com WEB_ROOT=/var/www/gastoscontrol ./deploy/deploy.sh
```

> Solo pide `sudo` para copiar a `WEB_ROOT`; el build se hace como tu usuario.

## 1) Frontend (manual)
```bash
cd frontend
cp .env.example .env     # rellena VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY y VITE_BACKEND_URL
yarn install
VITE_BACKEND_URL=https://__DOMAIN__ yarn build
sudo mkdir -p /var/www/gastoscontrol
sudo rsync -a --delete dist/ /var/www/gastoscontrol/
sudo chown -R www-data:www-data /var/www/gastoscontrol
```

## 2) Backend OCR (modo OCR-only, sin MongoDB)
```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# Crea backend/.env con EMERGENT_LLM_KEY y/o GEMINI_API_KEY (NO subir a git)
```
Instala el servicio (edita antes los marcadores):
```bash
sudo install -m 0644 deploy/gastocontrol-ocr.service /etc/systemd/system/gastocontrol-ocr.service
sudo systemctl daemon-reload
sudo systemctl enable --now gastocontrol-ocr
curl -s http://127.0.0.1:__OCR_PORT__/api/     # -> {"message":"GastoControl API",...}
```

## 3) Apache
```bash
sudo install -m 0644 deploy/apache-gastoscontrol.conf /etc/apache2/sites-available/gastoscontrol.conf
sudo a2ensite gastoscontrol.conf
sudo apache2ctl configtest && sudo systemctl reload apache2
```
> Nota: el vhost incluye `Alias /icons/ /var/www/gastoscontrol/icons/` porque Apache trae un
> `Alias /icons/` global que, si no, provoca 404 en los iconos de la PWA.
> El SPA fallback se hace con `FallbackResource /index.html` (no usar `RewriteRule` genérico:
> reescribiría también los ficheros existentes y el JS/CSS no cargaría).

## 4) HTTPS
```bash
sudo certbot --apache -d __DOMAIN__ --redirect -m TU_EMAIL --agree-tos -n
```

## 5) DNS (DuckDNS, opcional)
```bash
sudo install -m 0755 deploy/duckdns-update.sh /usr/local/bin/duckdns-update.sh
sudo /usr/local/bin/duckdns-update.sh
( sudo crontab -l 2>/dev/null; echo '*/5 * * * * /usr/local/bin/duckdns-update.sh >> /var/log/duckdns-gastos.log 2>&1' ) | sudo crontab -
```

## 6) Endurecimiento (recomendado)
- El vhost `:80` (`apache-gastoscontrol.conf`) redirige a HTTPS; el `:443`
  (`apache-gastoscontrol-le-ssl.conf`) añade `HSTS`, `CSP`, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`. Aplica los
  vhosts y recarga (el script sustituye `__DOMAIN__`/`__OCR_PORT__` y solo toca
  los vhosts de GastoControl):
  ```bash
  ./deploy/install-apache.sh [DOMINIO] [PUERTO_OCR]
  ```
- **Supabase**: ejecuta en el SQL Editor, en este orden:
  `supabase/fix_receipts_policies.sql` (sin listado anónimo, operaciones por carpeta
  de usuario) y `supabase/private_receipts.sql` (bucket privado; el frontend usa URLs
  firmadas).
- **Backend OCR** (`backend/.env`): define `APP_API_KEY` y el mismo valor en
  `frontend/.env` como `VITE_OCR_KEY` (el frontend lo envía en `X-App-Key`). Ajusta
  `MAX_UPLOAD_BYTES` / `OCR_RATE_LIMIT`.
- **fail2ban** (bloquea IPs que abusan del OCR):
  ```bash
  sudo install -m 0644 deploy/fail2ban-gastoscontrol-filter.conf /etc/fail2ban/filter.d/gastoscontrol-ocr.conf
  sudo install -m 0644 deploy/fail2ban-gastoscontrol-jail.conf /etc/fail2ban/jail.d/gastoscontrol.conf
  sudo systemctl restart fail2ban
  sudo fail2ban-client status gastoscontrol-ocr
  ```
- **Supabase Auth** (dashboard → Authentication): revisa que el registro sea el
  deseado, activa la **confirmación por email**, añade **CAPTCHA** si el registro es
  abierto y deshabilita los proveedores que no uses. En *URL Configuration* deja solo
  los orígenes de confianza (`https://__DOMAIN__/**`).
- **CAPTCHA (Cloudflare Turnstile, opcional)**:
  1. Crea un widget en Cloudflare → Turnstile y copia *Site Key* y *Secret Key*.
  2. Supabase → *Authentication → Bot and Abuse Protection*: activa **Turnstile** y pega
     la *Secret Key*.
  3. Pon la *Site Key* en `frontend/.env` como `VITE_TURNSTILE_SITE_KEY` y vuelve a
     desplegar (`./deploy/deploy.sh`). El CSP ya permite `challenges.cloudflare.com`.
  > Para probar sin Cloudflare: site key `1x00000000000000000000AA` y secret
  > `1x0000000000000000000000000000000AA` (siempre pasan).

## 7) Comprobaciones
```bash
curl -I https://__DOMAIN__/
curl -I https://__DOMAIN__/gastos
curl -s https://__DOMAIN__/api/
# El puerto 80 debe redirigir:
curl -I http://__DOMAIN__/
```

## Supabase
En **Authentication → URL Configuration → Redirect URLs**, añade `https://__DOMAIN__/**`.

## PWA (instalar como app)
- Android/Chrome: banner “Instalar” (o menú ⋮ → *Instalar aplicación*).
- iPhone: **Safari** → Compartir → *Añadir a pantalla de inicio* (Chrome en iOS no lo permite).
