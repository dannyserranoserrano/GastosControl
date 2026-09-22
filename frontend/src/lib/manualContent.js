// Manual de uso paso a paso.
// - `icon`  → icono de la sección (clave del mapa ICONS de pages/Help.jsx)
// - `image` → captura (ruta en public/, p. ej. "/help/panel.jpg")
// - cada paso: { t: "texto", i: "Icono" }

export const MANUAL = [
  {
    id: "primeros-pasos",
    icon: "Rocket",
    title: "Primeros pasos",
    image: "/help/panel.jpg",
    steps: [
      { t: "Entra con Google/GitHub o crea una cuenta con correo y contraseña.", i: "LogIn" },
      { t: "En Ajustes → Proyecto crea tu primer proyecto (por ejemplo, «Casa» u «Obra»).", i: "FolderKanban" },
      { t: "Pulsa el nombre del proyecto en la cabecera para dejarlo activo: todo se aplica a ese proyecto.", i: "ChevronDown" },
      { t: "Desde el Panel usa «Escanear» o ve a Gastos → «Añadir gasto» para empezar.", i: "Plus" },
    ],
  },
  {
    id: "anadir-gasto",
    icon: "Receipt",
    title: "Añadir un gasto manualmente",
    image: "/help/gastos.jpg",
    steps: [
      { t: "Entra en Gastos y pulsa «Añadir gasto».", i: "Plus" },
      { t: "Rellena proveedor, fecha e importe (lo mínimo).", i: "Type" },
      { t: "Elige la categoría (se sugiere sola) y, si quieres, notas y una o varias imágenes o PDFs.", i: "Tags" },
      { t: "Pulsa «Guardar gasto»: aparecerá en la lista y en el Panel.", i: "Save" },
    ],
  },
  {
    id: "escanear",
    icon: "ScanLine",
    title: "Escanear un ticket con IA",
    image: "/help/escanear.jpg",
    steps: [
      { t: "Pulsa «Escanear» (o el botón flotante en el móvil).", i: "ScanLine" },
      { t: "Sube o fotografía el ticket (JPG, PNG o WEBP).", i: "Upload" },
      { t: "Pulsa «Analizar con IA»: se rellenan proveedor, fecha, importe, categoría e ítems.", i: "Sparkles" },
      { t: "Revisa y corrige lo que haga falta y pulsa «Guardar gasto».", i: "Check" },
    ],
  },
  {
    id: "panel",
    icon: "LayoutDashboard",
    title: "Leer el Panel (inicio)",
    image: "/help/panel.jpg",
    steps: [
      { t: "Arriba tienes presupuesto, gastado del periodo, disponible y número de tickets.", i: "Wallet" },
      { t: "Los gráficos muestran reparto por categoría, evolución y comparación con el mes anterior.", i: "BarChart3" },
      { t: "Abajo verás la previsión de recurrentes y los avisos.", i: "Repeat" },
    ],
  },
  {
    id: "proyectos",
    icon: "FolderKanban",
    title: "Trabajar con varios proyectos",
    image: "/help/proyecto.jpg",
    steps: [
      { t: "Crea proyectos en Ajustes → Proyecto (nombre, descripción, color e icono).", i: "FolderKanban" },
      { t: "Pulsa el nombre del proyecto en la cabecera para cambiar; al elegir otro, se abre el Panel.", i: "ChevronDown" },
      { t: "Cada proyecto tiene sus propios gastos, categorías, presupuesto y estadísticas.", i: "Layers" },
    ],
  },
  {
    id: "presupuesto",
    icon: "Wallet",
    title: "Configurar presupuesto y topes",
    image: "/help/presupuesto.jpg",
    steps: [
      { t: "Ajustes → Presupuesto: define importe total, periodo (semanal/mensual/anual) y % de aviso.", i: "Wallet" },
      { t: "Ajustes → Categorías: pon el tope de gasto de cada categoría.", i: "Target" },
      { t: "El progreso y las alertas se calculan sobre el periodo en curso.", i: "Percent" },
    ],
  },
  {
    id: "categorias",
    icon: "Tags",
    title: "Crear y organizar categorías",
    image: "/help/categorias.jpg",
    steps: [
      { t: "Ajustes → Categorías: escribe el nombre, elige icono y color, y pulsa «Añadir categoría».", i: "Tags" },
      { t: "En la misma pantalla puedes fijar el tope de cada categoría.", i: "Target" },
      { t: "Las categorías son propias de cada proyecto.", i: "FolderKanban" },
    ],
  },
  {
    id: "recurrentes",
    icon: "Repeat",
    title: "Gastos recurrentes",
    image: "/help/gastos.jpg",
    steps: [
      { t: "En Gastos pulsa «Recurrentes» y rellena proveedor, importe, categoría, día, frecuencia y mes de inicio.", i: "Repeat" },
      { t: "Se generan solos al abrir la app en los meses que tocan.", i: "Zap" },
      { t: "Puedes pausarlos, eliminarlos o generarlos a mano con el botón del rayo.", i: "Pause" },
    ],
  },
  {
    id: "galeria",
    icon: "Images",
    title: "Ver la galería de tickets",
    image: "/help/galeria.jpg",
    steps: [
      { t: "Entra en Gastos → «Tickets».", i: "Images" },
      { t: "Busca y filtra por categoría; ordena por fecha o categoría.", i: "Search" },
      { t: "Pulsa un ticket para verlo con zoom o descargarlo.", i: "ZoomIn" },
    ],
  },
  {
    id: "informe",
    icon: "BarChart3",
    title: "Informe mensual",
    image: "/help/informe.jpg",
    steps: [
      { t: "En Informe mensual elige el mes: verás KPIs, desglose por categoría, top proveedores y desviación.", i: "BarChart3" },
      { t: "Exporta a CSV o PDF con los botones de arriba.", i: "Download" },
    ],
  },
  {
    id: "calendario",
    icon: "CalendarDays",
    title: "Usar el calendario",
    image: "/help/calendario.jpg",
    steps: [
      { t: "Abre Análisis ▸ Calendario.", i: "CalendarDays" },
      { t: "Verás el gasto de cada día del mes.", i: "CalendarDays" },
      { t: "Pulsa un día para ver el detalle.", i: "Check" },
    ],
  },
  {
    id: "csv",
    icon: "Upload",
    title: "Importar y exportar datos",
    image: "/help/gastos.jpg",
    steps: [
      { t: "Gastos → «Importar CSV»: previsualiza, valida y omite duplicados.", i: "Upload" },
      { t: "Gastos → «Exportar CSV»: descarga todos los gastos.", i: "Download" },
      { t: "Ajustes → Datos: copia de seguridad completa en JSON.", i: "Database" },
    ],
  },
  {
    id: "ahorro",
    icon: "PiggyBank",
    title: "Objetivos de ahorro",
    image: "/help/ahorro.jpg",
    steps: [
      { t: "Ajustes → Ahorro: crea un objetivo con importe y, opcionalmente, fecha límite.", i: "Target" },
      { t: "Añade aportaciones; verás el progreso y el ritmo mensual estimado.", i: "PiggyBank" },
    ],
  },
  {
    id: "cierre",
    icon: "Lock",
    title: "Cerrar un mes",
    image: "/help/informe.jpg",
    steps: [
      { t: "En Informe mensual pulsa «Cerrar mes» para bloquear cambios de ese mes.", i: "Lock" },
      { t: "Si necesitas editarlo, pulsa «Reabrir mes».", i: "Unlock" },
    ],
  },
  {
    id: "cuenta",
    icon: "UserCog",
    title: "Cuenta: entrar, contraseña y salir",
    image: "/help/login.jpg",
    steps: [
      { t: "Entra con Google/GitHub o con correo y contraseña.", i: "LogIn" },
      { t: "Pulsa tu usuario (arriba a la derecha) para abrir «Mi cuenta».", i: "UserCog" },
      { t: "Desde ahí cambias la contraseña (pide la actual), pides un enlace de recuperación o pulsas «Salir».", i: "KeyRound" },
    ],
  },
  {
    id: "pwa",
    icon: "Moon",
    title: "Instalar la app y modo oscuro",
    image: "/help/panel.jpg",
    steps: [
      { t: "Usa el botón «Instalar» (Android/escritorio) o, en iPhone, Safari → Compartir → Añadir a pantalla de inicio.", i: "Download" },
      { t: "Cambia entre tema claro y oscuro con el botón de la cabecera.", i: "Moon" },
      { t: "La app funciona sin conexión con los datos guardados en el dispositivo.", i: "WifiOff" },
    ],
  },
];
