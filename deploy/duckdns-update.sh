#!/usr/bin/env bash
# Actualiza la IP pública de un subdominio DuckDNS.
# Sustituye __SUBDOMAIN__ y __TOKEN__ (o pasa el token por variable de entorno DUCKDNS_TOKEN).
SUBDOMAIN="${DUCKDNS_SUBDOMAIN:-__SUBDOMAIN__}"
TOKEN="${DUCKDNS_TOKEN:-__TOKEN__}"
RESP=$(curl -s "https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${TOKEN}&ip=")
echo "$(date -Is) DuckDNS(${SUBDOMAIN}): ${RESP}"
