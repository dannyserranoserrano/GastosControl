#!/usr/bin/env bash
# Despliega el frontend de GastoControl en producción (sitio estático con Apache).
#
# Uso:
#   ./deploy/deploy.sh
#
# Variables de entorno opcionales:
#   DOMAIN    dominio público (por defecto gastoscontrolapp.duckdns.org)
#   WEB_ROOT  DocumentRoot del vhost (por defecto /var/www/gastoscontrol)
#   WEB_USER  usuario del servidor web (por defecto www-data)
#
# El script compila el frontend con VITE_BACKEND_URL=https://$DOMAIN (el proxy
# /api de Apache apunta al backend OCR en 127.0.0.1) y sincroniza dist/ en WEB_ROOT.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$APP_DIR/frontend"
DOMAIN="${DOMAIN:-gastoscontrolapp.duckdns.org}"
WEB_ROOT="${WEB_ROOT:-/var/www/gastoscontrol}"
WEB_USER="${WEB_USER:-www-data}"

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

if command -v yarn >/dev/null 2>&1; then
  PM="yarn"
elif command -v corepack >/dev/null 2>&1; then
  PM="corepack yarn"
elif command -v npm >/dev/null 2>&1; then
  PM="npm"
else
  echo "ERROR: no se encontró yarn, corepack ni npm." >&2
  exit 1
fi

echo "==> Compilando frontend (${PM}) con VITE_BACKEND_URL=https://${DOMAIN}"
cd "$FRONTEND_DIR"
[ -f .env ] || cp .env.example .env
VITE_BACKEND_URL="https://${DOMAIN}" $PM build

echo "==> Desplegando ${FRONTEND_DIR}/dist -> ${WEB_ROOT}"
$SUDO mkdir -p "$WEB_ROOT"
$SUDO rsync -a --delete --chmod=D755,F644 "${FRONTEND_DIR}/dist/" "${WEB_ROOT}/"
$SUDO chown -R "${WEB_USER}:${WEB_USER}" "$WEB_ROOT"

echo "==> Comprobaciones (informativas)"
curl -fsSI "https://${DOMAIN}/" | head -n 1 || echo "  (no se pudo comprobar /)"
curl -fsS "https://${DOMAIN}/api/" | head -c 200 || echo "  (no se pudo comprobar /api/)"
echo
echo "==> Desplegado en https://${DOMAIN}/"
echo "Nota: la PWA puede requerir un refresco para actualizar el service worker."
