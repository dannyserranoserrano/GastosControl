# AGENTS.md — GastoControl (Gestor de Gastos)

Contexto del proyecto para agentes de IA que trabajen en este repositorio.

## 1. Resumen del proyecto

GastoControl es una aplicación web genérica para controlar gastos, tanto personales como de
un proyecto. El usuario registra gastos manualmente o escaneando tickets/facturas, controla
un presupuesto global, consulta KPIs y gráficas, y exporta los datos a CSV.

- **Idioma de la UI**: español (Gasto, Ticket, Presupuesto, Exportar CSV).
- **Target**: móvil y escritorio → diseño **mobile-first**.
- **Datos**: por defecto **local-first** (se guardan en el navegador del dispositivo vía IndexedDB, sin servidor). Opcionalmente se puede conectar un backend para guardar/sincronizar en un servidor.
- **Auth**: opcional, **Supabase Auth** (login con Google, Microsoft y GitHub). Sin login la app funciona igual en modo local.
- Los requisitos de producto detallados están en `memory/PRD.md` y el diseño visual en `design_guidelines.json`.

## 2. Arquitectura

Modo local (por defecto, sin config):

```
[React SPA] --(sin red)--> IndexedDB (localStorage-compatible, datos del dispositivo)
```

Modo con backend (opcional, si se define `VITE_BACKEND_URL`):

```
[React SPA] --HTTP/JSON--> [FastAPI] --Motor (async)--> [MongoDB] (opcional)
                              |
                              |--> Emergent Object Storage (imágenes de tickets)
                              |--> Gemini 3.1 Pro vía Emergent LLM Key (OCR de tickets)
```

`MONGO_URL` es **opcional**: si no está definida, el backend arranca en modo **OCR-only**
(solo `/api/receipts/scan` y `/api/files/*`), apto para desplegar gratis en Render/Railway.
Las rutas de datos (`/categories`, `/expenses`, `/budget`, `/stats`) devuelven 503 sin Mongo.
El escaneo desde el frontend se enruta siempre al backend OCR (`scanReceipt()` en `api.js`),
mientras que los datos van a Supabase (sesión) o al modo local (invitado).

Auth (opcional):

```
[React SPA] --OAuth (PKCE)--> Supabase Auth --> sesión JWT + usuario
```

- **Frontend**: React 19 SPA con **Vite 6** (`@vitejs/plugin-react`).
- **Backend** (opcional): FastAPI + MongoDB (Motor async), en `backend/`.
- **IA/OCR** (solo con backend): Gemini 3.1 Pro (`gemini-3.1-pro-preview`) vía `emergentintegrations.llm.chat.LlmChat`.
- **Storage** (solo con backend): Emergent Object Storage.
- **Auth**: Supabase Auth (`@supabase/supabase-js`) en el cliente.
- **Datos en la nube (opcional)**: con sesión de Supabase, los gastos/categorías/presupuesto se guardan en Postgres (tablas `categories`, `expenses`, `budget`) y las imágenes en Supabase Storage, con RLS por usuario.

## 3. Stack tecnológico y versiones

### Frontend (`frontend/`)
- `react` / `react-dom` **19.0.0`
- `vite` **^6** + `@vitejs/plugin-react` **^4** (scripts = `vite` / `vite build` / `vite preview`)
- `react-router-dom` **7.15.0**
- `@tanstack/react-query` **5.56.2**
- `@supabase/supabase-js` **^2** (auth Google/Microsoft/GitHub)
- `tailwindcss` **3.4.17** + `tailwindcss-animate` **1.0.7** + `autoprefixer` + `postcss`
- UI shadcn/ui: Radix primitives (`@radix-ui/*`) + `class-variance-authority` + `clsx` + `tailwind-merge` + `cmdk` + `lucide-react` **0.516.0**
- `recharts` **3.6.0** (gráficas), `sonner` **2.0.3** (toasts)
- HTTP: `axios` **1.18.0** (solo en modo remoto)
- Gestor de paquetes: **yarn 1.22.22** (ver campo `packageManager`)

### Backend (`backend/`) — opcional
- Python 3.10+ (sin versión fijada; compatible con FastAPI 0.110).
- Requisitos exactos en `backend/requirements.txt`. Claves:
  - `fastapi==0.110.1`, `uvicorn==0.25.0`
  - `motor==3.3.1`, `pymongo==4.6.3`
  - `pydantic>=2.6.4`, `python-multipart>=0.0.9`
  - `emergentintegrations==0.2.0` (SDK para LLM/almacenamiento de Emergent)
- Archivo principal: `backend/server.py` (toda la API en un único archivo).

## 4. Estructura del proyecto

```
GastosApp/
├── AGENTS.md                    (este archivo)
├── design_guidelines.json       (tema visual / pautas de diseño)
├── image_testing.md             (reglas del agente de pruebas para imágenes)
├── memory/
│   └── PRD.md                   (requisitos + backlog)
├── test_reports/
│   └── iteration_1.json         (resultado smoke test backend)
├── supabase/
│   └── schema.sql               (tablas + RLS + bucket de Storage)
├── backend/                     (opcional: API + OCR + sincronización)
│   ├── .env                     (MONGO_URL, DB_NAME, CORS_ORIGINS, EMERGENT_LLM_KEY)
│   ├── requirements.txt
│   └── server.py                (API completa: modelos, rutas, storage, OCR)
└── frontend/
    ├── .env                     (VITE_BACKEND_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    ├── index.html               (entry HTML de Vite, en la raíz)
    ├── vite.config.js           (alias `@` → `src`, puerto 3000)
    ├── tailwind.config.js / postcss.config.js / jsconfig.json
    ├── package.json
    ├── public/                  (manifest.json, favicon.svg)
    └── src/
        ├── index.jsx            (entry; QueryClientProvider)
        ├── App.jsx              (rutas + AuthProvider + Header + Toaster)
        ├── index.css            (Tailwind + fuentes + animaciones)
        ├── lib/
        │   ├── api.js           (api local/remoto, exportCsv, toBackendUrl, helpers re-export)
        │   ├── constants.js     (COLOR_MAP, ALLOWED_ICONS/COLORS, DEFAULT_CATEGORIES, eur)
        │   ├── findDuplicates.js (detección de gastos duplicados por importe/fecha/proveedor)
        │   ├── autoRules.js     (sugerencia de categoría/proyecto por historial y reglas)
        │   ├── csv.js           (parseo/validación de CSV para importación)
        │   ├── recurring.js     (plantillas y cálculo de gastos recurrentes pendientes)
        │   ├── period.js        (rangos de periodo del presupuesto: semanal/mensual/anual)
        │   ├── projectsContext.jsx (proyectos y proyecto activo)
        │   ├── theme.js         (modo claro/oscuro: almacenamiento y aplicación)
        │   ├── useRecurring.js  (genera gastos recurrentes pendientes al montar)
        │   ├── useNotifications.jsx (hook + modal de notificaciones proactivas)
        │   ├── localBackend.js  (implementación local de las rutas sobre IndexedDB)
        │   ├── storage.js       (wrapper de IndexedDB)
        │   ├── supabase.js      (cliente Supabase / isConfigured)
        │   ├── supabaseData.js  (rutas sobre Postgres + Storage de tickets)
        │   ├── authContext.jsx  (AuthProvider + useAuth)
        │   ├── migrate.js       (migración de datos locales → cuenta)
        │   ├── categoriesContext.jsx
        │   └── utils.js         (cn)
        ├── components/
        │   ├── Header.jsx       (navegación + login/usuario)
        │   ├── ExpenseForm.jsx
        │   ├── CategoryManager.jsx
        │   ├── CategoryBadge.jsx
        │   ├── AutoRulesManager.jsx
        │   ├── CsvImportDialog.jsx
        │   ├── RecurringManager.jsx
        │   ├── ThemeToggle.jsx
        │   ├── ProjectSwitcher.jsx
        │   └── ui/              (button, card, input, label, textarea, progress, select, dialog, alert-dialog)
        └── pages/
            ├── Dashboard.jsx    (/)
            ├── Expenses.jsx     (/gastos)
            ├── Scan.jsx         (/escanear)
            ├── Budget.jsx       (/presupuesto)
            ├── Gallery.jsx       (/galeria)
            ├── MonthlyReport.jsx (/informe)
            └── Login.jsx        (/login)
```

## 5. Capa de datos (local vs. remoto)

La app expone un objeto `api` con la misma interfaz que axios (`get/post/patch/put/delete`).
- **Modo local** (por defecto): `localBackend.js` implementa las rutas sobre IndexedDB (colecciones `gastocontrol:categories|expenses|budget`). Semilla de categorías: General, Compras, Facturas, Otros. El escáner adjunta la imagen como data-URL (se redimensiona) sin OCR.
- **Modo Supabase** (sesión activa): `api` usa `supabaseData.js` contra Postgres/Storage. Precedencia actual: Supabase (sesión) > local (invitado) > FastAPI (solo si Supabase no está configurado).
- **Modo FastAPI** (si `VITE_BACKEND_URL` está definido): solo las rutas de datos se redirigen al backend si Supabase está desactivado; el escaneo `scanReceipt()` **siempre** usa el backend OCR si está configurado.

Rutas soportadas (ambos modos): `GET/POST /categories`, `DELETE /categories/{name}`,
`GET/POST /expenses`, `GET/PATCH/DELETE /expenses/{id}`, `GET /stats`, `GET/PUT /budget`,
`POST /projects/rename`, `POST /receipts/scan` (solo remoto con OCR; local adjunta imagen), `GET /expenses/export` (CSV).

### Variables de entorno (frontend/.env)
- `VITE_BACKEND_URL` — vacío = modo local. Con URL = usa el backend (API + OCR).
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — credenciales de Supabase (vacías = login desactivado).

## 6. Cómo ejecutar

**Frontend**
```bash
cd frontend
yarn install
yarn dev        # servidor de desarrollo (http://localhost:3000)
yarn build      # build de producción a dist/
yarn preview    # sirve el build
```
- Requiere **Node >= 18** (Vite 6). Verificado OK con Node 24.
- El alias `@/` se resuelve en `vite.config.js` (alias `@` → `src`) y en `jsconfig.json` (IDE).

**Backend (opcional)**
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn server:app --reload
```

## 7. Configuración de Supabase Auth

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia `Project URL` y `anon public key` a `frontend/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. En el dashboard: **Authentication → Providers** y habilita `Google`, `Azure` (Microsoft) y `GitHub` (Google/Azure piden crear su app OAuth; GitHub funciona con la app por defecto de Supabase).
4. En **Authentication → URL Configuration**, añade a *Redirect URLs* el origen de la app (p.ej. `http://localhost:3000/**` y la URL de producción). La app usa `window.location.origin/login` como callback.
5. Para guardar los datos por usuario, ejecuta `supabase/schema.sql` en **SQL Editor** (crea tablas `categories`, `expenses`, `budget` con RLS y el bucket `receipts`).
6. El hosting estático debe soportar SPA fallback (servir `index.html` para `/login`) — p.ej. Netlify/Vercel/Cloudflare Pages o un `_redirects`/404 en GitHub Pages.

## 8. Convenciones de código y diseño

- Rutas de import usan alias `@/`.
- Componentes shadcn/ui desde `@/components/ui/*`.
- **Tema "Warm Masonry"**: terracota `#D95D39`, slate `#1E293B`, fondo `#FAF8F5`, bordes `#E2DDD3` (ver `design_guidelines.json` e `index.css`).
- Fuentes: Outfit (headings), Manrope (body), JetBrains Mono (datos/números).
- Iconos: `lucide-react`. Feedback: `sonner` (`toast`).
- Ids de test: `data-testid` en botones, inputs, modales, filtros, tarjetas y filas.
- Formato moneda: helper `eur()` (locale es-ES, EUR).

## 9. Estado actual

- Frontend migrado a **Vite** (antes CRA/CRACO). El build de producción compila OK.
- Añadido **modo local-first** (datos en el navegador) y **Supabase Auth** (login Google/Microsoft/GitHub) en el cliente.
- Persistencia por usuario en Supabase (Postgres + Storage) y **migración opcional de datos locales → cuenta** al iniciar sesión.
- **Arquitectura "Opción C"**: datos por usuario en Supabase (con sesión) o local (invitado); el escaneo de tickets va siempre al backend FastAPI OCR (`scanReceipt` en `api.js`). MongoDB en el backend es opcional (modo OCR-only sin Mongo desplegable gratis).
- **Alertas de presupuesto**: umbral configurable (default 80%, campo `alert_at`) y aviso al exceder (banner en Dashboard + toast al cruzar el umbral).
- **Presupuesto por categoría**: tope por categoría (mapa `category_budgets` en el registro de presupuesto) editable en `/presupuesto`, con barras de progreso y alertas por categoría en el Dashboard.
- **Proyección de gasto a fin de mes**: en el Dashboard, estimación del gasto mensual según el ritmo diario actual (gasto del mes / días transcurridos × días del mes), con comparativa frente al presupuesto.
- **Gastos por proyecto/obra**: cada gasto puede asociarse a un proyecto; `/gastos` permite filtrar y muestra resumen/proyección, y `/presupuesto` permite definir topes por proyecto.
- **Informe mensual** (`/informe`): selector de mes, KPIs (total, tickets, ticket medio), desglose por categoría con gráfico de barras, top proveedores, resumen por proyecto y exportación CSV del mes.
- **Detección de duplicados**: compara importe, fecha y similitud de proveedor (Levenshtein); badge en cada gasto sospechoso, filtro "ver duplicados" en `/gastos`, y aviso en Dashboard con enlace.
- **Notificaciones proactivas**: `useNotifications` hook con `NotificationSettings` modal; envía browser notifications al exceder presupuesto, por categoría, o por proyecciones alarmantes; panel de configuración accesible desde Dashboard (icono campana) con toggles por tipo y hora de recordatorio diario opcional.
- **Filtro por rango de fechas** en `/gastos`: campos desde/hasta (parámetros `start`/`end` de `GET /expenses`), rangos rápidos (este mes, mes pasado, últimos 30 días, este año) y barra con nº de resultados y total.
- **Auto-categorización** (`autoRules.js` + `AutoRulesManager.jsx`): al crear un gasto, sugiere categoría/proyecto por historial de proveedor (frecuencia + coincidencia parcial) y por reglas explícitas (texto contenido en el proveedor), gestionables desde el botón «Reglas» en `/gastos`; el usuario puede sobrescribir la sugerencia.
- **Importar CSV** (`csv.js` + `CsvImportDialog.jsx`): botón «Importar CSV» en `/gastos`; detecta delimitador (`;`, `,`, tab), admite cabeceras o posición fija, parsea importes/fechas en formatos ES/EN, previsualiza con validación, marca duplicados (contra existentes y dentro del archivo) y permite omitirlos; incluye descarga de plantilla.
- **Gastos recurrentes** (`recurring.js` + `useRecurring.js` + `RecurringManager.jsx`): plantillas en `localStorage` (proveedor, importe, categoría, proyecto, día del mes); `useRecurring` genera los gastos pendientes al montar `/` y `/gastos` (una vez por mes, con catch-up), y el gestor permite crear, pausar, eliminar y generar manualmente. Las plantillas son locales al dispositivo; los gastos generados se guardan en el backend activo.
- **Modo oscuro** (`theme.js` + `ThemeToggle.jsx`): toggle claro/oscuro en el Header con persistencia en `localStorage` (`gastocontrol:theme`), respeta `prefers-color-scheme` cuando no hay preferencia guardada y aplica la clase `.dark` en `<html>` (script inline anti-parpadeo en `index.html`). Los tokens shadcn (`--background`, `--card`, etc.) y los colores hex fijos usados en la app se redefinen bajo `.dark` en `index.css`.
- **Presupuestos por periodo** (`period.js`): el presupuesto tiene `period` (`weekly`/`monthly`/`yearly`, por defecto mensual) editable en `/presupuesto`. `stats` calcula `period_spent`, `period_by_category`, `period_start/end`, `period_days` y `period_elapsed_days`; `progress`, `remaining` y las alertas/proyecciones (Dashboard, notificaciones) se basan en el periodo en curso.
- **Proyectos como espacios de trabajo** (`projectsContext.jsx` + `ProjectSwitcher.jsx`): lista de proyectos (localStorage `gastocontrol:projects`) y proyecto activo (`gastocontrol:active_project`), seleccionable desde el Header o desde el filtro de `/gastos`. Cuando hay un proyecto activo, `GET /expenses`, `GET /stats` y `GET/PUT /budget` reciben `project=<nombre>` y devuelven solo sus datos. Cada proyecto guarda su propio presupuesto (total, `alert_at`, `category_budgets`, `period`) en `budget.projects[nombre]` (jsonb en Supabase, `projects` dict en Mongo/local); los gastos nuevos se etiquetan con el proyecto activo. «Todos los proyectos» = sin filtro y presupuesto general.
- **Categorías por proyecto**: las categorías también son por proyecto. `GET/POST /categories` y `DELETE /categories/{name}` aceptan `project`; al borrar solo se comprueban los gastos de ese proyecto. Local: `gastocontrol:categories` (general) + `gastocontrol:project_categories`; Supabase: columna `project` en `categories` con unique `(user_id, project, name)`; Mongo: campo `project`. `CategoriesProvider` recarga al cambiar de proyecto (por eso `ProjectsProvider` lo envuelve en `App.jsx`).
- **Renombrar proyectos**: `POST /projects/rename` `{ from, to }` (valida duplicados) reetiqueta los gastos, la clave de `budget.projects`, las categorías del proyecto y las plantillas recurrentes (estas en cliente). Desde `ProjectSwitcher` (botón lápiz) se edita el nombre en línea; `renameProject` del contexto actualiza la lista, el proyecto activo y los recurrentes.
- **Galería de tickets** (`/galeria`): grid de boletos escaneados con búsqueda, filtro por categoría, vista previa con zoom y descarga.
- El backend FastAPI (opcional) pasó un smoke test previo (ver `test_reports/iteration_1.json`).

### Pendiente
- (ninguno)

## 10. Backlog (de `memory/PRD.md`)

- (vacío)
