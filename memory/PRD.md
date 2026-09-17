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
- [x] Galería dedicada de tickets

## Backlog
- P2: Presupuesto por categoría (no solo global)
- P2: Proyección de gasto final basada en tendencia