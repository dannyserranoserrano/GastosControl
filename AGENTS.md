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
        │   └── ui/              (button, card, input, label, textarea, progress, select, dialog, alert-dialog)
        └── pages/
            ├── Dashboard.jsx    (/)
            ├── Expenses.jsx     (/gastos)
            ├── Scan.jsx         (/escanear)
            ├── Budget.jsx       (/presupuesto)
            ├── Gallery.jsx       (/galeria)
            └── Login.jsx        (/login)
```

## 5. Capa de datos (local vs. remoto)

La app expone un objeto `api` con la misma interfaz que axios (`get/post/patch/put/delete`).
- **Modo local** (por defecto): `localBackend.js` implementa las rutas sobre IndexedDB (colecciones `gastocontrol:categories|expenses|budget`). Semilla de categorías: General, Compras, Facturas, Otros. El escáner adjunta la imagen como data-URL (se redimensiona) sin OCR.
- **Modo Supabase** (sesión activa): `api` usa `supabaseData.js` contra Postgres/Storage. Precedencia actual: Supabase (sesión) > local (invitado) > FastAPI (solo si Supabase no está configurado).
- **Modo FastAPI** (si `VITE_BACKEND_URL` está definido): solo las rutas de datos se redirigen al backend si Supabase está desactivado; el escaneo `scanReceipt()` **siempre** usa el backend OCR si está configurado.

Rutas soportadas (ambos modos): `GET/POST /categories`, `DELETE /categories/{name}`,
`GET/POST /expenses`, `GET/PATCH/DELETE /expenses/{id}`, `GET /stats`, `GET/PUT /budget`,
`POST /receipts/scan` (solo remoto con OCR; local adjunta imagen), `GET /expenses/export` (CSV).

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
- **Galería de tickets** (`/galeria`): grid de boletos escaneados con búsqueda, filtro por categoría, vista previa con zoom y descarga.
- El backend FastAPI (opcional) pasó un smoke test previo (ver `test_reports/iteration_1.json`).

### Pendiente
- Presupuesto por categoría; proyección de gasto.

## 10. Backlog (de `memory/PRD.md`)

- P2: Presupuesto por categoría (no solo global).
- P2: Proyección de gasto final basada en tendencia.