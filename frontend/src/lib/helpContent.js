// Contenido de la Ayuda.
//
// Cada entrada tiene una `updated` (YYYY-MM-DD). La página ordena por fecha
// descendente, así que **al actualizar una función, sube su `updated` a la fecha
// del cambio y pasará automáticamente al primer lugar de la lista**.
//
// `icon` debe ser una clave del mapa ICONS de pages/Help.jsx.

export const HELP_ITEMS = [
  {
    id: "adjuntos-pdf",
    icon: "FileText",
    title: "Adjuntar PDFs como ticket",
    updated: "2026-09-22",
    body: [
      "En el formulario de un gasto puedes adjuntar imágenes o PDFs (facturas, justificantes…).",
      "Los PDF se muestran como una ficha con icono; al abrirlos se ven en un visor (o en una pestaña). También aparecen en la Galería y en la lista de Gastos.",
    ],
  },
  {
    id: "cuenta",
    icon: "UserCog",
    title: "Cuenta, contraseña y cerrar sesión",
    updated: "2026-09-22",
    body: [
      "Pulsa tu usuario (arriba a la derecha) para abrir «Mi cuenta».",
      "Con email y contraseña puedes cambiarla (se pide la actual) o pedir un enlace de recuperación.",
      "Si entras con Google/GitHub, hay un enlace a los ajustes de seguridad del proveedor.",
      "El botón «Salir» está dentro de ese menú. Al cerrar sesión se borran los datos locales del dispositivo.",
    ],
  },
  {
    id: "proyectos",
    icon: "FolderKanban",
    title: "Proyectos y proyecto activo",
    updated: "2026-09-22",
    body: [
      "Cada proyecto es un espacio de trabajo con sus propios gastos, categorías, presupuesto y estadísticas.",
      "Siempre hay un proyecto activo (el último que usaste). En la cabecera, pulsa el nombre del proyecto para cambiarlo; al elegir otro, se abre el Panel.",
      "Crea, edita la ficha (nombre, descripción, color, icono) o elimina proyectos en Ajustes → Proyecto.",
    ],
  },
  {
    id: "orden-gastos",
    icon: "Receipt",
    title: "Ordenar la lista de gastos",
    updated: "2026-09-22",
    body: [
      "En «Todos los gastos», usa el selector de orden junto a los filtros.",
      "Opciones: fecha (recientes/antiguos), categoría (A-Z) y con ticket primero / sin ticket primero.",
    ],
  },
  {
    id: "recurrentes",
    icon: "Repeat",
    title: "Gastos recurrentes con frecuencia",
    updated: "2026-09-22",
    body: [
      "Crea plantillas con proveedor, importe, categoría, proyecto, día del mes, frecuencia y mes de inicio.",
      "Frecuencia: mensual, bimestral, trimestral, cuatrimestral, semestral, anual o personalizada («cada X meses»).",
      "Se generan solos al abrir la app en los meses que tocan; también puedes generarlos a mano o pausarlos.",
    ],
  },
  {
    id: "seguridad",
    icon: "ShieldCheck",
    title: "Seguridad y privacidad",
    updated: "2026-09-18",
    body: [
      "El sitio va siempre por HTTPS, con cabeceras de seguridad y CAPTCHA en el registro/login.",
      "Los tickets se guardan privados y se sirven con enlaces firmados temporales.",
      "Al cerrar sesión se limpian los datos locales del dispositivo.",
    ],
  },
  {
    id: "panel",
    icon: "LayoutDashboard",
    title: "Panel de control (inicio)",
    updated: "2026-09-17",
    body: [
      "Resumen del proyecto activo: presupuesto, gastado del periodo, disponible y número de tickets.",
      "Gráficos por categoría, evolución mensual y comparativa mes a mes.",
      "Previsión de gastos recurrentes y avisos de presupuesto.",
    ],
  },
  {
    id: "gastos",
    icon: "Receipt",
    title: "Registrar y editar gastos",
    updated: "2026-09-17",
    body: [
      "Añade gastos a mano: proveedor, fecha, importe, categoría, proyecto, notas y varios tickets.",
      "Busca por proveedor/notas, filtra por categoría y rango de fechas (con rangos rápidos y total).",
      "Edita, duplica o elimina (con opción de deshacer).",
    ],
  },
  {
    id: "escanear",
    icon: "ScanLine",
    title: "Escanear tickets con IA",
    updated: "2026-09-17",
    body: [
      "Sube o fotografía un ticket; la IA extrae proveedor, fecha, importe, categoría e ítems.",
      "Revisa y corrige los datos antes de guardar.",
    ],
  },
  {
    id: "galeria",
    icon: "Images",
    title: "Galería de tickets",
    updated: "2026-09-17",
    body: [
      "Todos los tickets escaneados en una cuadrícula; busca, filtra y ordena por fecha o categoría.",
      "Vista previa con zoom y descarga.",
    ],
  },
  {
    id: "presupuesto",
    icon: "Wallet",
    title: "Presupuesto y topes",
    updated: "2026-09-17",
    body: [
      "Define importe total, periodo (semanal/mensual/anual) y umbral de aviso en Ajustes → Presupuesto.",
      "Los topes por categoría se configuran en Ajustes → Categorías.",
    ],
  },
  {
    id: "categorias",
    icon: "Tags",
    title: "Categorías",
    updated: "2026-09-17",
    body: [
      "Crea categorías (con icono y color) por proyecto y define su tope de gasto.",
      "Son independientes en cada proyecto.",
    ],
  },
  {
    id: "informe",
    icon: "BarChart3",
    title: "Informe mensual",
    updated: "2026-09-17",
    body: [
      "KPIs, desglose por categoría, top proveedores y desviación presupuesto vs real.",
      "Exporta a CSV o PDF. Con presupuesto anual, la desviación es acumulada del año.",
    ],
  },
  {
    id: "calendario",
    icon: "CalendarDays",
    title: "Calendario",
    updated: "2026-09-17",
    body: [
      "Vista mensual con el gasto de cada día; pulsa un día para ver el detalle.",
    ],
  },
  {
    id: "cierre",
    icon: "Lock",
    title: "Cierre de mes",
    updated: "2026-09-17",
    body: [
      "Cierra un mes para bloquear cambios en él (por proyecto); reábrelo cuando quieras desde el Informe.",
    ],
  },
  {
    id: "ahorro",
    icon: "PiggyBank",
    title: "Objetivos de ahorro",
    updated: "2026-09-17",
    body: [
      "Crea objetivos con importe, fecha límite y aportaciones; muestra progreso y ritmo estimado.",
    ],
  },
  {
    id: "csv",
    icon: "Upload",
    title: "Importar y exportar CSV",
    updated: "2026-09-17",
    body: [
      "Importa gastos con previsualización, validación y omisión de duplicados.",
      "Exporta todos los gastos o el mes del informe.",
    ],
  },
  {
    id: "reglas",
    icon: "Sparkles",
    title: "Auto-categorización y reglas",
    updated: "2026-09-17",
    body: [
      "Al crear un gasto, se sugiere categoría/proyecto según el proveedor y tus reglas.",
      "Gestiona las reglas desde el botón «Reglas» en Gastos.",
    ],
  },
  {
    id: "duplicados",
    icon: "Copy",
    title: "Detección de duplicados",
    updated: "2026-09-17",
    body: [
      "Avisa de posibles gastos duplicados (mismo importe, fecha cercana y proveedor similar) y los marca.",
    ],
  },
  {
    id: "notificaciones",
    icon: "Bell",
    title: "Notificaciones",
    updated: "2026-09-17",
    body: [
      "Avisos del navegador y al móvil (Telegram o EmailJS) sobre presupuesto, recurrentes y cierre de mes.",
      "Se configuran en Ajustes → Notificaciones y Ajustes → Alertas.",
    ],
  },
  {
    id: "backup",
    icon: "Database",
    title: "Copia de seguridad",
    updated: "2026-09-17",
    body: [
      "Exporta/importa todos los datos locales en un archivo JSON (Ajustes → Datos).",
    ],
  },
  {
    id: "tema-pwa",
    icon: "Moon",
    title: "Modo oscuro y app instalable (PWA)",
    updated: "2026-09-17",
    body: [
      "Cambia entre tema claro y oscuro desde la cabecera.",
      "Instala GastoControl como app y úsala sin conexión (service worker).",
    ],
  },
];
