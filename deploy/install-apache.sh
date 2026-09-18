#!/usr/bin/env bash
# Instala los vhosts de GastoControl sustituyendo __DOMAIN__ y __OCR_PORT__,
# valida la configuración y recarga Apache. NO toca otros sitios (villadeciria, etc.):
# solo escribe gastoscontrol.conf y gastoscontrol-le-ssl.conf.
#
# Uso:
#   ./deploy/install-apache.sh [DOMINIO] [PUERTO_OCR]
#   DOMAIN=otro.dominio OCR_PORT=8020 ./deploy/install-apache.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$APP_DIR/deploy"
DEST="/etc/apache2/sites-available"
DOMAIN="${1:-${DOMAIN:-gastoscontrolapp.duckdns.org}}"
OCR_PORT="${2:-${OCR_PORT:-8010}}"

echo "==> Instalando vhosts para ${DOMAIN} (OCR 127.0.0.1:${OCR_PORT})"
sed -e "s/__DOMAIN__/${DOMAIN}/g" -e "s/__OCR_PORT__/${OCR_PORT}/g" \
  "$SRC/apache-gastoscontrol-le-ssl.conf" | sudo tee "$DEST/gastoscontrol-le-ssl.conf" >/dev/null
sed -e "s/__DOMAIN__/${DOMAIN}/g" \
  "$SRC/apache-gastoscontrol.conf" | sudo tee "$DEST/gastoscontrol.conf" >/dev/null

echo "==> Validando configuración (configtest)"
sudo apache2ctl configtest
echo "==> Recargando Apache"
sudo systemctl reload apache2
echo "==> Listo. Vhosts de GastoControl actualizados; el resto de sitios intactos."
