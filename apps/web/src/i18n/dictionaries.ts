export const es = {
  // Brand & navigation
  appName: "Territorio",
  zoneEyebrow: "Pista de running",
  zoneName: "Jumeirah · Kite Beach",
  zoneTrack: "Pista Jumeirah · Kite",
  season: "Temporada 1",
  mvpBadge: "Fase 0 · MVP",
  yourLog: "Tu registro",
  backToMap: "Volver al mapa",
  map: "Mapa",
  runs: "Mis carreras",
  record: "Grabar",
  close: "Cerrar",
  cancel: "Cancelar",
  menu: "Menú",
  openMenu: "Abrir menú y enlaces legales",
  themeToggle: "Cambiar tema",
  selectLanguage: "Seleccionar idioma",
  loading: "Cargando...",
  privacy: "Privacidad",
  terms: "Términos",

  // Legacy keys
  example: "Ejemplo",
  exampleNote: "Cada liga tiene su propio mapa. Dueños de muestra, no hay carreras reales todavía.",
  localeSwitch: "EN",
  localeLabel: "Ver en inglés",
  leaguesLabel: "Liga",
  zonesLabel: "Zona",
  soon: "Pronto",
  yours: "Tuyas",
  rivals: "Rivales",
  free: "Libres",
  legendHard: "Difícil de robar",
  legendEasy: "Más asequible",
  cellFree: "Baldosa libre",
  cellYours: "Baldosa tuya",
  cellOther: "Baldosa de otro",
  owner: "Dueño",
  you: "Tú",
  mark: "Marca",
  date: "Fecha",
  yourBest: "Tu mejor",
  noBest: "Sin marca",
  perKm: "/km",
  yoursNote: "Es tuya. Si mejoras la marca, cuesta más robártela.",
  freeNote: "Libre. Cualquier marca válida la conquista.",
  noMark: "Aún no tienes marca en esta baldosa.",
  gap: (seconds: number) => `Te faltan ${seconds} s/km para robarla.`,
  under: (pace: string) => `Para robarla hay que bajar de ${pace} /km.`,
  mapLabel: "Mapa de la zona entre Jumeirah Beach y Kite Beach",
  mapError: "No se pudo abrir el mapa. Hace falta WebGL y conexión para cargar las teselas.",

  // Metrics
  distance: "Distancia",
  time: "Tiempo",
  duration: "Duración",
  currentPace: "Ritmo actual",
  avgPace: "Ritmo medio",
  speed: "Velocidad",
  perKmUnit: "s/km",
  noRecord: "Sin registro",
  unknownDate: "Fecha no disponible",

  // Territory Header & Stats
  statMine: "Tuyas",
  statThreatened: "En peligro",
  statRival: "De otros",
  statFree: "Libres",

  // Leagues
  leagues: {
    elite: "Élite",
    advanced: "Avanzado",
    intermediate: "Intermedio",
    starter: "Inicial",
  },
  leagueSelectorLabel: "Selector de ligas de carrera",
  yourCurrentLeague: "Tu liga actual",

  // Map & Legend
  legendTitle: "Leyenda",
  legendMine: "Mía",
  legendThreatened: "En peligro",
  legendRival: "De otro",
  legendFree: "Libre",
  legendMineDesc: "Territorio que posees actualmente",
  legendThreatenedDesc: "Territorio tuyo con un rival muy cerca",
  legendRivalDesc: "Territorio dominado por otro corredor",
  legendFreeDesc: "Territorio disponible para conquistar",
  mapLoading: "Cargando mapa de territorios...",
  mapFatalTitle: "No se pudo iniciar el mapa 3D",
  mapFatalDesc: "Se requiere WebGL y conexión a internet para renderizar los mapas de OpenFreeMap.",
  mapGeometryError: "No se pudo cargar la geometría de la zona Jumeirah · Kite.",

  // Cell Bottom Sheet
  sheetAriaLabel: "Detalles del territorio seleccionado",
  closeDetails: "Cerrar detalles",
  freeTerritory: "Territorio libre",
  noOwnerRegistered: "Sin dueño registrado",
  markFromDate: (date: string) => `Marca del ${date}`,
  tagYou: "Tú",
  tagThreatened: "En peligro",
  tagRival: "Rival",
  tagFree: "Disponible",
  cutoffPace: "Ritmo de corte",
  currentPaceMetric: "Ritmo actual",
  yourBestPace: "Tu mejor ritmo",
  actionHowToSteal: "Cómo robarla",
  actionHowToDefend: "Cómo defenderla",
  actionHowToImprove: "Cómo mejorar tu marca",
  actionHowToConquer: "Cómo conquistarla",
  statusDanger: (rival: string, pace: string, gap: number) =>
    `⚠️ ¡En peligro! ${rival} corrió a ${pace} (a solo ${gap} seg/km de robarte).`,
  statusMine: "¡Eres el dueño actual de esta sección de la pista!",
  statusRival: (gap: number, rival: string) =>
    `Te faltan solo ${gap} segundos por km para superar a ${rival}.`,
  statusFree: "Nadie ha reclamado esta baldosa en tu liga todavía. ¡Sé el primero!",

  // Steal Guide Modal
  guideCloseAria: "Cerrar guía",
  guideTitleSteal: "Cómo robar este territorio",
  guideSubtitleSteal: (pace: string) => `Supera el ritmo de ${pace} para adueñarte de este sector.`,
  guideTitleDefend: "Cómo defender tu territorio",
  guideSubtitleDefend: (gap: number) =>
    `Un rival está a solo ${gap} segundos. Corre más rápido para afianzar tu liderato.`,
  guideTitleImprove: "Cómo mejorar tu marca",
  guideSubtitleImprove:
    "Cuanto más rápido corras este tramo, más difícil será que otro corredor te lo robe.",
  guideTitleConquer: "Cómo conquistar este territorio",
  guideSubtitleConquer:
    "Este sector no tiene dueño en tu liga. Cualquier carrera válida lo hace tuyo.",
  step1Title: "Sal a correr",
  step1Desc:
    "Pasa por la pista de running de Jumeirah Beach / Kite Beach durante tu entrenamiento.",
  step2Title: "Tus carreras entran solas",
  step2Desc:
    "Conecta tu reloj Garmin o Polar, o graba directamente con la app. Tu actividad se procesará automáticamente al terminar.",
  step3Title: "Conquista la baldosa",
  step3DescFree:
    "Pasa por esa baldosa para conquistarla. Contamos tu ritmo en el kilómetro alrededor de ella.",
  step3DescBeat:
    "Pasa por esa baldosa más rápido que su dueño. Contamos tu ritmo en el kilómetro alrededor de ella.",
  guideUnderstood: "¡Entendido, a correr!",

  // App Menu Modal
  menuTitle: "Menú de la App",
  menuSubtitle: "Jumeirah Beach · Kite Beach",
  menuCloseAria: "Cerrar menú",
  menuTermsTitle: "Términos y Condiciones",
  menuTermsDesc: "Juego gratuito, normas de tráfico en Dubái y juego limpio sin trampas.",
  menuPrivacyTitle: "Política de Privacidad",
  menuPrivacyDesc: "Qué datos guardamos, protección de horarios/rutas y borrado de cuenta.",
  menuInfoText:
    "Territorio es un juego de conquista de baldosas para la pista de running de Jumeirah Beach a Kite Beach. Compite en tu liga de ritmo y defiende tus sectores.",
  menuLanguage: "Idioma",

  // Runs Page
  runsPageTitle: "Mis Carreras",
  runsLoading: "Cargando tus carreras...",
  recordRunShortcut: "Grabar nueva carrera",
  emptyRunsTitle: "Aún no tienes carreras guardadas",
  emptyRunsDesc:
    "Sal a correr a la pista de Jumeirah Beach o Kite Beach, registra tu actividad y guárdala en tu teléfono.",
  recordFirstRun: "Grabar mi primera carrera",
  viewRunDetailsAria: (date: string) => `Ver detalles de la carrera del ${date}`,

  // Run Detail Modal
  runSummaryDefaultTitle: "Resumen de carrera",
  closeRunDetail: "Cerrar detalle",
  downloadRunFile: "Descargar archivo de la carrera",
  deleteRun: "Borrar carrera",
  deleteRunError: "No se pudo borrar la carrera. Inténtalo de nuevo.",
  noGpsTrack: "Sin recorrido GPS",
  mapTrackAria: "Recorrido de la carrera",

  // Delete Confirm Dialog
  deleteModalTitle: "¿Borrar carrera?",
  deleteModalDesc: "Esta acción no se puede deshacer. Se eliminará la carrera de este teléfono.",
  deleteModalConfirm: "Sí, borrar carrera",
  deleteModalDeleting: "Borrando...",

  // Upload Watch File Card
  advancedOption: "Opción avanzada",
  uploadWatchDesc:
    "Si ya grabaste con tu reloj deportivo, puedes importar el archivo para ver tu recorrido aquí.",
  uploadWatchBtn: "Subir archivo de mi reloj (.gpx o .fit)",
  readingFile: "Leyendo archivo...",
  fileReadError: "No se pudo leer el archivo.",
  fileSaveSuccess: (km: string) => `Carrera guardada con éxito (${km} km).`,

  // Recording Page
  recordRunTitle: "Grabar Carrera",
  statusAcquiring: "Buscando GPS",
  statusActive: "GPS activo",
  statusIdle: "Listo",
  statusSaved: "Guardada",
  btnStartRun: "Empezar carrera",
  btnFinishRun: "Terminar",
  wakeLockNotice: "No bloquees el teléfono mientras grabas",
  gpsErrorTitle: "No se pudo acceder al GPS",
  retry: "Reintentar",
  gpsAcquiringNotice: "Buscando señal GPS… Sal al aire libre, lejos de edificios altos",
  startAnyway: "Empezar igual",
  runCompletedTitle: "¡Carrera terminada!",
  savedOnPhoneSubtitle: "Guardada en este teléfono",
  localSavedBadge: "Guardado local",
  localSavedNotice: "Por ahora tu carrera se guarda solo en este teléfono.",
  downloadGpx: "Descargar archivo de la carrera",
  recordAnotherRun: "Grabar otra carrera",

  // Legal Pages
  privacyTitle: "Privacidad · Territorio",
  privacyDescription:
    "Explicamos de forma sencilla y transparente qué datos guardamos, para qué los usamos y cómo protegemos tu privacidad en Dubái.",
  termsTitle: "Términos y Condiciones · Territorio",
  termsDescription:
    "Normas claras sobre seguridad, tráfico de Dubái y juego limpio en la pista de running de Jumeirah Beach y Kite Beach.",
  draftNotice: "Borrador pendiente de revisión legal",
};

export type Dictionary = typeof es;

export const en: Dictionary = {
  // Brand & navigation
  appName: "Territory",
  zoneEyebrow: "Running track",
  zoneName: "Jumeirah · Kite Beach",
  zoneTrack: "Jumeirah · Kite Track",
  season: "Season 1",
  mvpBadge: "Phase 0 · MVP",
  yourLog: "Your log",
  backToMap: "Back to map",
  map: "Map",
  runs: "My runs",
  record: "Record",
  close: "Close",
  cancel: "Cancel",
  menu: "Menu",
  openMenu: "Open menu and legal links",
  themeToggle: "Toggle theme",
  selectLanguage: "Select language",
  loading: "Loading...",
  privacy: "Privacy",
  terms: "Terms",

  // Legacy keys
  example: "Sample",
  exampleNote: "Each league has its own map. These owners are sample data, not real runs yet.",
  localeSwitch: "ES",
  localeLabel: "View in Spanish",
  leaguesLabel: "League",
  zonesLabel: "Zone",
  soon: "Soon",
  yours: "Yours",
  rivals: "Rivals",
  free: "Open",
  legendHard: "Hard to take",
  legendEasy: "Easier",
  cellFree: "Open tile",
  cellYours: "Your tile",
  cellOther: "Someone else's tile",
  owner: "Owner",
  you: "You",
  mark: "Mark",
  date: "Date",
  yourBest: "Your best",
  noBest: "No mark",
  perKm: "/km",
  yoursNote: "It's yours. A faster mark makes it harder to take.",
  freeNote: "Open. Any valid mark takes it.",
  noMark: "You don't have a mark on this tile yet.",
  gap: (seconds: number) => `You need ${seconds} s/km to take it.`,
  under: (pace: string) => `Taking it means going under ${pace} /km.`,
  mapLabel: "Map of the zone between Jumeirah Beach and Kite Beach",
  mapError: "The map could not start. WebGL and a connection are required to load the tiles.",

  // Metrics
  distance: "Distance",
  time: "Time",
  duration: "Duration",
  currentPace: "Current pace",
  avgPace: "Average pace",
  speed: "Speed",
  perKmUnit: "s/km",
  noRecord: "No record",
  unknownDate: "Date unavailable",

  // Territory Header & Stats
  statMine: "Yours",
  statThreatened: "In danger",
  statRival: "Rivals",
  statFree: "Open",

  // Leagues
  leagues: {
    elite: "Elite",
    advanced: "Advanced",
    intermediate: "Intermediate",
    starter: "Starter",
  },
  leagueSelectorLabel: "Race league selector",
  yourCurrentLeague: "Your current league",

  // Map & Legend
  legendTitle: "Legend",
  legendMine: "Yours",
  legendThreatened: "In danger",
  legendRival: "Rival",
  legendFree: "Open",
  legendMineDesc: "Territory you currently own",
  legendThreatenedDesc: "Your territory with a rival very close",
  legendRivalDesc: "Territory owned by another runner",
  legendFreeDesc: "Territory available to conquer",
  mapLoading: "Loading territory map...",
  mapFatalTitle: "Could not launch 3D map",
  mapFatalDesc: "WebGL and an internet connection are required to render OpenFreeMap maps.",
  mapGeometryError: "Could not load Jumeirah · Kite zone geometry.",

  // Cell Bottom Sheet
  sheetAriaLabel: "Selected territory details",
  closeDetails: "Close details",
  freeTerritory: "Open territory",
  noOwnerRegistered: "No registered owner",
  markFromDate: (date: string) => `Mark from ${date}`,
  tagYou: "You",
  tagThreatened: "In danger",
  tagRival: "Rival",
  tagFree: "Available",
  cutoffPace: "Cutoff pace",
  currentPaceMetric: "Current pace",
  yourBestPace: "Your best pace",
  actionHowToSteal: "How to take it",
  actionHowToDefend: "How to defend it",
  actionHowToImprove: "How to improve your mark",
  actionHowToConquer: "How to conquer it",
  statusDanger: (rival: string, pace: string, gap: number) =>
    `⚠️ In danger! ${rival} ran at ${pace} (just ${gap} s/km from taking it from you).`,
  statusMine: "You are the current owner of this section of the track!",
  statusRival: (gap: number, rival: string) =>
    `You are only ${gap} seconds per km away from beating ${rival}.`,
  statusFree: "Nobody has claimed this tile in your league yet. Be the first!",

  // Steal Guide Modal
  guideCloseAria: "Close guide",
  guideTitleSteal: "How to take this territory",
  guideSubtitleSteal: (pace: string) => `Beat the pace of ${pace} to take this sector.`,
  guideTitleDefend: "How to defend your territory",
  guideSubtitleDefend: (gap: number) =>
    `A rival is just ${gap} seconds away. Run faster to secure your lead.`,
  guideTitleImprove: "How to improve your mark",
  guideSubtitleImprove:
    "The faster you run this section, the harder it will be for someone to take it from you.",
  guideTitleConquer: "How to conquer this territory",
  guideSubtitleConquer: "This sector has no owner in your league. Any valid run makes it yours.",
  step1Title: "Go for a run",
  step1Desc: "Head to the Jumeirah Beach / Kite Beach running track during your workout.",
  step2Title: "Your runs sync automatically",
  step2Desc:
    "Connect your Garmin or Polar watch, or record directly with the app. Your activity will be processed automatically when finished.",
  step3Title: "Conquer the tile",
  step3DescFree:
    "Run through that tile to conquer it. We count your pace on the kilometre around it.",
  step3DescBeat:
    "Run through that tile faster than its owner. We count your pace on the kilometre around it.",
  guideUnderstood: "Got it, let's run!",

  // App Menu Modal
  menuTitle: "App Menu",
  menuSubtitle: "Jumeirah Beach · Kite Beach",
  menuCloseAria: "Close menu",
  menuTermsTitle: "Terms and Conditions",
  menuTermsDesc: "Free game, Dubai traffic rules and fair play without cheating.",
  menuPrivacyTitle: "Privacy Policy",
  menuPrivacyDesc: "What data we keep, protection of times/routes and account deletion.",
  menuInfoText:
    "Territory is a tile conquest game for the Jumeirah Beach to Kite Beach running track. Compete in your pace league and defend your sectors.",
  menuLanguage: "Language",

  // Runs Page
  runsPageTitle: "My Runs",
  runsLoading: "Loading your runs...",
  recordRunShortcut: "Record new run",
  emptyRunsTitle: "You don't have any saved runs yet",
  emptyRunsDesc:
    "Go run on the Jumeirah Beach or Kite Beach track, record your activity, and save it on your phone.",
  recordFirstRun: "Record my first run",
  viewRunDetailsAria: (date: string) => `View details of the run from ${date}`,

  // Run Detail Modal
  runSummaryDefaultTitle: "Run summary",
  closeRunDetail: "Close detail",
  downloadRunFile: "Download run file",
  deleteRun: "Delete run",
  deleteRunError: "Could not delete the run. Please try again.",
  noGpsTrack: "No GPS track",
  mapTrackAria: "Run track",

  // Delete Confirm Dialog
  deleteModalTitle: "Delete run?",
  deleteModalDesc: "This action cannot be undone. The run will be deleted from this phone.",
  deleteModalConfirm: "Yes, delete run",
  deleteModalDeleting: "Deleting...",

  // Upload Watch File Card
  advancedOption: "Advanced option",
  uploadWatchDesc:
    "If you already recorded with your sports watch, you can import the file to view your track here.",
  uploadWatchBtn: "Upload watch file (.gpx or .fit)",
  readingFile: "Reading file...",
  fileReadError: "Could not read file.",
  fileSaveSuccess: (km: string) => `Run saved successfully (${km} km).`,

  // Recording Page
  recordRunTitle: "Record Run",
  statusAcquiring: "Acquiring GPS",
  statusActive: "GPS active",
  statusIdle: "Ready",
  statusSaved: "Saved",
  btnStartRun: "Start run",
  btnFinishRun: "Finish",
  wakeLockNotice: "Keep phone unlocked while recording",
  gpsErrorTitle: "Could not access GPS",
  retry: "Retry",
  gpsAcquiringNotice: "Searching for GPS signal… Head outdoors, away from tall buildings",
  startAnyway: "Start anyway",
  runCompletedTitle: "Run completed!",
  savedOnPhoneSubtitle: "Saved on this phone",
  localSavedBadge: "Local storage",
  localSavedNotice: "For now your run is stored only on this phone.",
  downloadGpx: "Download run file",
  recordAnotherRun: "Record another run",

  // Legal Pages
  privacyTitle: "Privacy · Territory",
  privacyDescription:
    "We explain simply and transparently what data we store, what we use it for, and how we protect your privacy in Dubai.",
  termsTitle: "Terms and Conditions · Territory",
  termsDescription:
    "Clear rules on safety, Dubai traffic, and fair play on the Jumeirah Beach and Kite Beach running track.",
  draftNotice: "Draft pending legal review",
};
