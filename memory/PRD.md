# GastoControl — Gestor de Gastos

## Problem Statement
Los usuarios necesitan controlar sus gastos, tanto personales como de un proyecto, registrando cada gasto de forma manual o escaneando tickets y facturas con IA. La app extrae automáticamente los datos de los tickets, controla un presupuesto global, muestra estadísticas y permite exportar a CSV.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async)
- **Frontend**: React 19 + Tailwind + Shadcn UI + Recharts + Sonner
- **AI**: Gemini 3.1 Pro (vía Emergent Universal LLM Key) para OCR de tickets
- **Storage**: Emergent Object Storage para imágenes de tickets
- **Auth**: Opcional, Supabase Auth (login con Google, Microsoft y GitHub)

## User Personas
1. **Usuario principal**: móvil, sube fotos de tickets
2. **Colaborador/co-titular**: consulta gastos, controla presupuesto

## Core Requirements (static)
- Añadir gasto manual con: proveedor, fecha, importe, categoría, notas
- Escanear ticket con IA (Gemini 3.1 Pro): extraer proveedor, fecha, importe, categoría, items
- Categorías: General, Compras, Facturas, Otros
- Panel con KPIs: presupuesto total, gastado, disponible, nº tickets
- Gráfico de gastos por categoría y evolución mensual
- Configurar presupuesto total
- Exportar CSV
- Filtros de búsqueda (proveedor/notas) y por categoría
- Editar / eliminar gastos
- Preview imagen de ticket

## Implemented (2026-02)
- [x] Backend endpoints: /api/expenses (CRUD), /api/stats, /api/budget, /api/receipts/scan, /api/files/{path}, /api/expenses/export CSV
- [x] Object storage para tickets
- [x] Gemini 3.1 Pro para OCR
- [x] Dashboard con KPIs y 2 gráficos recharts
- [x] Página Gastos con filtros y tabla
- [x] Página Escanear con drag&drop + cámara
- [x] Página Presupuesto
- [x] Exportar CSV
- [x] Diseño mobile-first, tema cálido (terracota + slate)
- [x] Modo local-first (IndexedDB, sin servidor) + backend opcional (FastAPI)
- [x] Supabase Auth (login Google/Microsoft/GitHub) y persistencia por usuario (Postgres + Storage)
- [x] Alertas de presupuesto (umbral configurable y aviso al exceder)
- [x] Presupuesto por categoría (tope por categoría con alertas al exceder)
- [x] Proyección de gasto a fin de mes (ritmo diario actual sobre el presupuesto)
- [x] Proyección por categoría (ritmo actual vs tope de cada categoría)
- [x] Gastos por proyecto/obra (filtro, resumen, proyección y presupuesto por proyecto)
- [x] Informe mensual exportable (por categoría, top proveedores, por proyecto, CSV)
- [x] Detección de duplicados (mismo importe + fecha + proveedor similar, badge + aviso Dashboard)
- [x] Filtro por rango de fechas en `/gastos` (desde/hasta, rangos rápidos y total del resultado)
- [x] Orden de la lista de gastos: fecha (recientes/antiguos), categoría (A-Z) y con/sin ticket adjunto
- [x] Auto-categorización por proveedor (aprende del historial + reglas explícitas gestionables)
- [x] Importar gastos desde CSV (parseo flexible, previsualización, validación y omisión de duplicados)
- [x] Gastos recurrentes (plantillas que se generan automáticamente, con pausa y generación manual)
- [x] Frecuencia de los recurrentes: mensual, bimestral, trimestral, cuatrimestral, semestral, anual y personalizada (cada X meses), con mes de inicio elegible
- [x] Modo oscuro (toggle en el header, persistente y con opción de seguir al sistema)
- [x] Presupuestos por periodo (semanal/mensual/anual): progreso, alertas y proyecciones sobre el periodo activo
- [x] Proyectos como espacios de trabajo: selector global; cada proyecto tiene sus propios gastos, presupuesto (total, categorías y periodo) y estadísticas
- [x] Categorías por proyecto: cada proyecto gestiona sus propias categorías; borrar una en un proyecto no afecta a los demás
- [x] Renombrar proyectos: al cambiar el nombre se actualizan gastos, presupuesto, categorías y plantillas recurrentes
- [x] Objetivos de ahorro: objetivo e importe, aportaciones con fecha/nota, progreso, fecha límite y ritmo estimado (por proyecto)
- [x] Desviación presupuesto vs real (en el Informe mensual): por categoría (tope vs gasto del mes) y por proyecto, con desviación absoluta y estado
- [x] Copia de seguridad: exportar/importar todos los datos locales en JSON (gastos, presupuestos, categorías, proyectos, objetivos, recurrentes, reglas y preferencias)
- [x] Exportar el informe mensual a PDF (impresión del navegador con estilos de impresión)
- [x] Previsión de gastos recurrentes del mes (total, registrado vs pendiente y estado por plantilla)
- [x] Varios tickets por gasto (adjuntar, ver y descargar varias imágenes o PDFs del mismo gasto)
- [x] Ficha de proyecto ampliada: nombre, descripción, color e icono (editables)
- [x] Gráficos avanzados en el Panel: evolución por categoría (barras apiladas) y comparativa mes a mes
- [x] Cierre de mes: bloquear/reabrir un mes (por proyecto); no se pueden añadir/editar/eliminar gastos de un mes cerrado
- [x] Recordatorio de cierre de mes: aviso (banner + notificación) cuando el mes está por terminar o el anterior sigue abierto
- [x] Vista de calendario (sección propia `/calendario`): gastos por día del mes con total y detalle al pulsar
- [x] Ajustes (`/ajustes`): página única con pestañas para Proyecto (selección y gestión), Presupuesto, Categorías, Ahorro, Notificaciones y Datos. La configuración de notificaciones sale del Panel y el selector de proyecto sale de la cabecera.
- [x] Alertas de recurrentes vencidos: aviso en el Panel (con notificación opcional) y acciones para generar el recurrente o todos de una vez
- [x] Notificaciones al móvil (gratuitas): canales **Telegram** (Bot API) y **correo EmailJS**, configurables en Ajustes → Alertas, con selección de avisos y prueba por canal
- [x] Deshacer al eliminar, duplicar gasto y botón flotante en móvil (abre el escáner)
- [x] Detección real de guardado: verificación tras crear (existe en BD y con el proyecto correcto)
- [x] Notificaciones proactivas (browser notifications + panel de configuración, avisos de presupuesto y proyección)
- [x] PWA: instalable, offline (shell precacheado) y manifest con iconos
- [x] Instalación como app: banner «Instalar» (Android/escritorio) e indicaciones para Safari en iOS (con iconos apple-touch multi-tamaño)
- [x] Plantillas de despliegue en `deploy/` (Apache + HTTPS + systemd del OCR + DuckDNS) sin secretos
- [x] Galería dedicada de tickets (con orden por fecha o categoría)
- [x] Cabecera con el proyecto activo y estado real de los datos (nube/servidor/local/offline)
- [x] Filtro de proyectos retirado de `/gastos` (el proyecto activo es global)
- [x] Desviación y consumo del presupuesto acumulados (enero→mes) cuando el presupuesto es anual
- [x] Topes por categoría movidos a Ajustes → Categorías
- [x] Botones de cabecera con scroll horizontal en móvil (Gastos e Informe)
- [x] Logout con limpieza total del almacenamiento local del dispositivo (sin dejar rastro)
- [x] Gestión de cuenta: cambiar contraseña (pidiendo la actual), enlace de recuperación (email/contraseña), ajustes del proveedor (Google/GitHub) y **cerrar sesión** desde el mismo menú
- [x] Proyecto activo permanente (último usado): se eliminó «Todos los proyectos»
- [x] Selector de proyecto en la cabecera (al pulsar el nombre): cambia de proyecto y abre el Panel
- [x] Sección de Ayuda (`/ayuda`) con dos pestañas: **Manual de uso** paso a paso (con capturas reales e iconos por paso) y **Novedades y mejoras** (ordenadas por fecha de actualización, lo más reciente primero), con buscador

## Seguridad (2026-09)
- [x] HTTPS obligatorio: el vhost `:80` redirige (301) y `:443` envía HSTS
- [x] Cabeceras de seguridad: CSP (Supabase, Google Fonts, Telegram, EmailJS, Turnstile), X-Frame-Options, X-Content-Type-Options, Referrer-Policy y Permissions-Policy
- [x] Supabase RLS verificado: sin sesión, `expenses`/`budget`/`categories` devuelven vacío
- [x] Bucket `receipts`: sin listado anónimo, **privado** y servido con URLs firmadas (`ReceiptImage`/`receipts.js`)
- [x] Backend OCR: límite de tamaño (`MAX_UPLOAD_BYTES`), validación de tipo de imagen, rate limit por IP (`OCR_RATE_LIMIT`) y clave `APP_API_KEY`/`X-App-Key`
- [x] `/api/files` protegido (clave/rate limit) y rechazo de rutas inseguras
- [x] Exportaciones CSV saneadas contra inyección de fórmulas
- [x] `yarn audit` sin vulnerabilidades (react-router-dom, postcss, plugin-kit actualizados)
- [x] fail2ban para abusar del OCR (401/413/429 en `/api/receipts/scan` y `/api/files`)
- [x] CAPTCHA opcional con Cloudflare Turnstile en login/registro (`VITE_TURNSTILE_SITE_KEY`)
- [x] Supabase Auth: confirmación de email activa y validación con CAPTCHA
- [x] Sin secretos en repo ni en el bundle; sin source maps; el SPA fallback no filtra archivos
- [x] Scripts de despliegue `deploy/deploy.sh` (frontend) y `deploy/install-apache.sh` (vhosts)

## Backlog (sugerencias para más adelante)
Pequeñas:
- Editar plantillas recurrentes existentes (hoy solo crear/borrar/pausar)
- Estado de pago en facturas (pagado/pendiente) + fecha de vencimiento y recordatorio
- Duplicar/plantilla de gasto y edición masiva (categoría/proyecto a varios gastos)
- Exportar a Excel (XLSX) además de CSV

Medianas:
- Etiquetas (tags) además de categorías, con filtros y presupuesto por etiqueta
- Importar extractos bancarios (CSV/OFX) con auto-categorización
- Recurrentes semanales/quincenales (además de por meses)
- Web Share Target: compartir foto desde otra app → escáner
- Atajo rápido / añadir gasto en 1 toque (PWA)
- Comparativa interanual y ticket medio por proveedor en el Informe
- Enviar el informe mensual automáticamente por email/Telegram

Grandes:
- Compartir un proyecto con otra persona (invitación y permisos; RLS por proyecto)
- Gastos compartidos / reparto (quién pagó y quién debe)
- Sincronización real local↔nube con resolución de conflictos y "última sincronización"
- Auth del backend OCR con JWT de Supabase (en vez de clave compartida) y Web Push
- Tests automatizados + CI (GitHub Actions)

Extra de calidad:
- i18n (ahora solo español) y accesibilidad (foco/ARIA/contraste)
- Multi-divisa (€ por defecto)
- Alertas de errores (Sentry) y backups automáticos de Supabase
