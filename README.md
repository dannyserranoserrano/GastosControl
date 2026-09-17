# GastoControl

App web (**mobile-first**) para la gestión y control de gastos, tanto **personales** como **por proyectos/obras**. Registra gastos a mano o escaneando tickets con IA, controla presupuestos, consulta KPIs y exporta a CSV.

- **Idioma de la UI**: español.
- **Datos**: por defecto **local-first** (IndexedDB, sin servidor). Opcionalmente **Supabase** (nube) o backend **FastAPI**.
- **Auth opcional**: Supabase Auth (Google, Microsoft, GitHub).

---

## Características

- **Gastos**: alta/edición/borrado, búsqueda, filtro por categoría, **rango de fechas** con rangos rápidos e importe total del resultado.
- **Proyectos como espacios de trabajo**: cada proyecto tiene **sus propios gastos, presupuesto, categorías y estadísticas**. Selector global en la cabecera; permite **crear, renombrar** y eliminar proyectos.
- **Categorías por proyecto**: crear/borrar categorías en un proyecto sin afectar a los demás (se inicializan con las por defecto).
- **Presupuesto**: total, umbral de aviso configurable y **presupuesto por categoría**.
- **Presupuesto por periodo**: semanal / mensual / anual (el progreso y las alertas se calculan sobre el periodo en curso).
- **Proyección**: estimación de gasto a fin de periodo (global y por categoría) según el ritmo actual.
- **Informe mensual** (`/informe`): KPIs, desglose por categoría, top proveedores y resumen por proyecto; **exportable a CSV**.
- **Detección de duplicados**: mismo importe, fecha cercana y proveedor similar; aviso en el panel y badge en la lista.
- **Notificaciones proactivas**: avisos de presupuesto/proyección (notificación del navegador con fallback a toast in-app) y panel de configuración.
- **Importar/Exportar CSV**: importación con previsualización, validación y omisión de duplicados; exportación general y por mes.
- **Auto-categorización**: sugiere categoría/proyecto según el historial de proveedor y **reglas** personalizables.
- **Gastos recurrentes**: plantillas mensuales que se generan automáticamente (con pausa y generación manual).
- **Escaneo de tickets con IA** (con backend): extrae proveedor, fecha, importe, categoría e ítems.
- **Galería de tickets**: grid con búsqueda, filtro, vista previa con zoom y descarga.
- **Modo oscuro** con persistencia y respeto al tema del sistema.
- **PWA**: instalable y con soporte **offline** (service worker, precache del shell).

---

## Pantallas

| Ruta | Descripción |
|------|-------------|
| `/` | Panel: KPIs, alertas, gráficas, proyección y últimos gastos |
| `/gastos` | Lista de gastos, filtros, importar/exportar CSV, recurrentes y reglas |
| `/escanear` | Subir/fotografiar ticket y revisar datos (OCR con IA si hay backend) |
| `/galeria` | Galería de tickets escaneados |
| `/presupuesto` | Presupuesto general o del proyecto activo, periodos y topes por categoría |
| `/informe` | Informe mensual exportable |
| `/login` | Inicio de sesión con Supabase (opcional) |

---

## Cómo funciona (capa de datos)

El frontend usa un objeto `api` con la misma interfaz que `axios`. La precedencia es:

1. **Supabase** (si hay sesión): Postgres + Storage por usuario.
2. **Modo local** (invitado, por defecto): implementado sobre **IndexedDB** en el navegador.
3. **FastAPI** (si `VITE_BACKEND_URL` está definido y Supabase no está configurado): API remota + OCR.

El **escaneo de tickets** siempre va al backend FastAPI OCR cuando está configurado.

```
[React SPA] ──┬─ Supabase (Postgres + Storage)  →  con sesión
              ├─ IndexedDB (local-first)         →  invitado
              └─ FastAPI + Mongo/OCR (opcional)  →  VITE_BACKEND_URL
```

---

## Stack

- **Frontend**: React 19 + Vite 6, React Router 7, Tailwind CSS + shadcn/ui (Radix), Recharts, Sonner, lucide-react.
- **PWA**: `vite-plugin-pwa` (Workbox).
- **Auth/Nube**: `@supabase/supabase-js`.
- **Backend opcional**: FastAPI + Motor (MongoDB), OCR con Gemini vía `emergentintegrations`.

---

## Estructura

```
GastosControl/
├── AGENTS.md                # contexto y convenciones del proyecto
├── DEPLOY_HOME.md           # guía de despliegue (Apache + DuckDNS)
├── memory/PRD.md            # requisitos y backlog
├── design_guidelines.json   # tema visual
├── supabase/schema.sql      # tablas + RLS + Storage + migraciones
├── backend/                 # API opcional (FastAPI): OCR y datos con Mongo
└── frontend/                # SPA React + Vite
    ├── public/              # favicon e iconos PWA
    └── src/
        ├── pages/           # Dashboard, Expenses, Scan, Gallery, Budget, MonthlyReport, Login
        ├── components/      # ExpenseForm, CategoryManager, ProjectSwitcher, …
        └── lib/             # api, backends, contextos y utilidades
```

---

## Puesta en marcha (frontend)

Requisitos: **Node ≥ 18** (verificado con Node 24) y **yarn 1.22**.

```bash
cd frontend
cp .env.example .env      # opcional; vacío = modo local
yarn install
yarn dev                  # http://localhost:3000
```

Build de producción y previsualización:

```bash
yarn build                # genera dist/ (incluye service worker y manifest PWA)
yarn preview
```

### Variables de entorno (`frontend/.env`)

| Variable | Descripción |
|----------|-------------|
| `VITE_BACKEND_URL` | URL del backend FastAPI. Vacío = modo local (IndexedDB). |
| `VITE_SUPABASE_URL` | Project URL de Supabase (vacío = login desactivado). |
| `VITE_SUPABASE_ANON_KEY` | Anon public key de Supabase. |

> No subas `.env` a git (ya está en `.gitignore`).

---

## Backend opcional (FastAPI)

`MONGO_URL` es opcional: sin ella arranca en modo **OCR-only** (solo `/api/receipts/scan` y `/api/files/*`), ideal para desplegar gratis. Las rutas de datos devuelven 503 sin Mongo.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload           # http://localhost:8000
```

Variables (`backend/.env`): `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `EMERGENT_LLM_KEY`.

---

## Supabase (nube y auth)

1. Crea un proyecto en https://supabase.com.
2. Copia `Project URL` y `anon public key` a `frontend/.env`.
3. Ejecuta `supabase/schema.sql` en el **SQL Editor** (crea `categories`, `expenses`, `budget` con RLS y el bucket `receipts`).
4. Habilita proveedores en **Authentication → Providers** (Google, Azure, GitHub).
5. En **URL Configuration**, añade a *Redirect URLs* el origen de la app (p. ej. `http://localhost:3000/**` y producción).

El script incluye migraciones idempotentes para: `expenses.project`, `budget.category_budgets/project_budgets/period/projects` y `categories.project` (con unique `(user_id, project, name)`).

---

## Despliegue

Consulta **[DEPLOY_HOME.md](DEPLOY_HOME.md)** para el despliegue en un servidor propio con Apache + DuckDNS + HTTPS (frontend estático con SPA fallback, proxy `/api/` al backend OCR y unidad systemd).

---

## Documentación adicional

- [`AGENTS.md`](AGENTS.md) — arquitectura, convenciones y estado del proyecto.
- [`memory/PRD.md`](memory/PRD.md) — requisitos y funcionalidades implementadas.
- [`design_guidelines.json`](design_guidelines.json) — tema visual ("Warm Masonry").

---

## Repositorio

https://github.com/dannyserranoserrano/GastosControl
