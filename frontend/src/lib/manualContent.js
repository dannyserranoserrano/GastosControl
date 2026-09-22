// Manual de uso paso a paso.
// `icon` debe ser una clave del mapa ICONS de pages/Help.jsx.

export const MANUAL = [
  {
    id: "primeros-pasos",
    icon: "Rocket",
    title: "Primeros pasos",
    steps: [
      "Entra con Google/GitHub o crea una cuenta con correo y contraseña.",
      "En Ajustes → Proyecto crea tu primer proyecto (por ejemplo, «Casa» u «Obra»).",
      "Pulsa el nombre del proyecto en la cabecera para dejarlo activo: todo lo que hagas se aplica a ese proyecto.",
      "Desde el Panel (inicio) usa «Escanear» o ve a Gastos → «Añadir gasto» para empezar.",
    ],
  },
  {
    id: "anadir-gasto",
    icon: "Receipt",
    title: "Añadir un gasto manualmente",
    steps: [
      "Entra en Gastos y pulsa «Añadir gasto».",
      "Rellena proveedor, fecha e importe (lo mínimo).",
      "Elige la categoría (se sugiere sola según el proveedor) y, si quieres, notas y una o varias fotos del ticket.",
      "Pulsa «Guardar gasto»: aparecerá en la lista y en el Panel.",
    ],
  },
  {
    id: "escanear",
    icon: "ScanLine",
    title: "Escanear un ticket con IA",
    steps: [
      "Pulsa «Escanear» (o el botón flotante en el móvil).",
      "Sube o fotografía el ticket (JPG, PNG o WEBP).",
      "Pulsa «Analizar con IA»: se rellenan proveedor, fecha, importe, categoría e ítems.",
      "Revisa y corrige lo que haga falta y pulsa «Guardar gasto».",
    ],
  },
  {
    id: "panel",
    icon: "LayoutDashboard",
    title: "Leer el Panel (inicio)",
    steps: [
      "Arriba tienes presupuesto, gastado del periodo, disponible y número de tickets.",
      "Los gráficos muestran el reparto por categoría, la evolución y la comparación con el mes anterior.",
      "Abajo verás la previsión de recurrentes y los avisos (presupuesto, duplicados, cierre de mes).",
    ],
  },
  {
    id: "proyectos",
    icon: "FolderKanban",
    title: "Trabajar con varios proyectos",
    steps: [
      "Crea proyectos en Ajustes → Proyecto (nombre, descripción, color e icono).",
      "Pulsa el nombre del proyecto en la cabecera para cambiar; al elegir otro, se abre el Panel.",
      "Cada proyecto tiene sus propios gastos, categorías, presupuesto y estadísticas.",
    ],
  },
  {
    id: "presupuesto",
    icon: "Wallet",
    title: "Configurar presupuesto y topes",
    steps: [
      "Ajustes → Presupuesto: define el importe total, el periodo (semanal/mensual/anual) y el % de aviso.",
      "Ajustes → Categorías: pon el tope de gasto de cada categoría.",
      "El progreso y las alertas se calculan sobre el periodo en curso.",
    ],
  },
  {
    id: "categorias",
    icon: "Tags",
    title: "Crear y organizar categorías",
    steps: [
      "Ajustes → Categorías: escribe el nombre, elige icono y color, y pulsa «Añadir categoría».",
      "En la misma pantalla puedes fijar el tope de cada categoría.",
      "Las categorías son propias de cada proyecto.",
    ],
  },
  {
    id: "recurrentes",
    icon: "Repeat",
    title: "Gastos recurrentes",
    steps: [
      "En Gastos pulsa «Recurrentes» y rellena proveedor, importe, categoría, día, frecuencia y mes de inicio.",
      "Se generan solos al abrir la app en los meses que tocan.",
      "Puedes pausarlos, eliminarlos o generarlos a mano con el botón del rayo.",
    ],
  },
  {
    id: "informe",
    icon: "BarChart3",
    title: "Informe mensual y calendario",
    steps: [
      "En Informe mensual elige el mes: verás KPIs, desglose por categoría, top proveedores y desviación.",
      "Exporta a CSV o PDF con los botones de arriba.",
      "En Calendario tienes el gasto por día; pulsa un día para ver el detalle.",
    ],
  },
  {
    id: "csv",
    icon: "Upload",
    title: "Importar y exportar datos",
    steps: [
      "Gastos → «Importar CSV»: previsualiza, valida y omite duplicados.",
      "Gastos → «Exportar CSV»: descarga todos los gastos.",
      "Ajustes → Datos: copia de seguridad completa en JSON (exportar/importar).",
    ],
  },
  {
    id: "ahorro",
    icon: "PiggyBank",
    title: "Objetivos de ahorro",
    steps: [
      "Ajustes → Ahorro: crea un objetivo con importe y, opcionalmente, fecha límite.",
      "Añade aportaciones; verás el progreso y el ritmo mensual estimado.",
    ],
  },
  {
    id: "cierre",
    icon: "Lock",
    title: "Cerrar un mes",
    steps: [
      "En Informe mensual pulsa «Cerrar mes» para bloquear cambios de ese mes.",
      "Si necesitas editarlo, pulsa «Reabrir mes».",
    ],
  },
  {
    id: "cuenta",
    icon: "UserCog",
    title: "Cuenta: entrar, contraseña y salir",
    steps: [
      "Entra con Google/GitHub o con correo y contraseña.",
      "Pulsa tu usuario (arriba a la derecha) para abrir «Mi cuenta».",
      "Desde ahí cambias la contraseña (pide la actual), pides un enlace de recuperación o pulsas «Salir».",
    ],
  },
  {
    id: "pwa",
    icon: "Moon",
    title: "Instalar la app y modo oscuro",
    steps: [
      "Usa el botón «Instalar» (Android/escritorio) o, en iPhone, Safari → Compartir → Añadir a pantalla de inicio.",
      "Cambia entre tema claro y oscuro con el botón de la cabecera.",
      "La app funciona sin conexión con los datos guardados en el dispositivo.",
    ],
  },
];
