export type LegalLocale = "es" | "en";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bulletPoints?: string[];
  callout?: string;
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  draftNotice: string;
  draftDescription: string;
  lastUpdated: string;
  sections: LegalSection[];
  contactEmail: string;
  relatedLinkText: string;
  relatedLinkHref: string;
}

export const LEGAL_CONTACT_EMAIL = "privacidad@PENDIENTE";
export const DRAFT_NOTICE_ES = "Borrador pendiente de revisión legal";
export const DRAFT_NOTICE_EN = "Draft pending legal review";

export const privacyPolicyContent: Record<LegalLocale, LegalDocument> = {
  es: {
    title: "Política de Privacidad",
    subtitle:
      "Explicamos en palabras sencillas qué datos guardamos, para qué los usamos y cómo protegemos tu privacidad mientras corres.",
    draftNotice: DRAFT_NOTICE_ES,
    draftDescription:
      "Este documento es un borrador informativo para la fase de pruebas y está pendiente de validación jurídica formal antes del lanzamiento público en Dubái.",
    lastUpdated: "31 de octubre de 2026",
    contactEmail: LEGAL_CONTACT_EMAIL,
    relatedLinkText: "Consulta también los Términos y Condiciones",
    relatedLinkHref: "/terminos",
    sections: [
      {
        id: "datos-guardados",
        title: "1. ¿Qué datos guardamos?",
        paragraphs: [
          "Recopilamos únicamente los datos indispensables para que el juego funcione de forma justa y transparente:",
        ],
        bulletPoints: [
          "Alias público: El nombre o apodo que tú eliges libremente para identificarte en el mapa, en las baldosas que conquistas y en las clasificaciones.",
          "Dirección de email: Tu correo electrónico, utilizado exclusivamente para que puedas iniciar sesión de forma segura y acceder a tu perfil.",
          "Carreras con GPS y ritmos: Las coordenadas de los tramos que corres dentro de la pista oficial, la distancia recorrida, los tiempos de paso y tus ritmos calculados por kilómetro y por baldosa.",
        ],
      },
      {
        id: "para-que",
        title: "2. ¿Para qué usamos estos datos?",
        paragraphs: [
          "Toda la información se utiliza exclusivamente para la mecánica deportiva del juego:",
        ],
        bulletPoints: [
          "El juego de baldosas: Comparamos tus marcas con las de otros corredores en cada celda hexagonal de la pista de Jumeirah Beach – Kite Beach para determinar quién ostenta el territorio.",
          "Gestión de ligas equitativas: Asignamos y mantenemos tu categoría según tu ritmo de referencia (Élite, Avanzado, Intermedio o Inicial) para que compitas siempre contra corredores de tu mismo nivel.",
          "Puntos diarios y ascensos: Calculamos los puntos diarios ganados por poseer o robar baldosas y gestionamos los ascensos inmediatos de categoría cuando mejoras tu velocidad.",
        ],
      },
      {
        id: "privacidad-total",
        title: "3. Lo que NUNCA mostramos a otros corredores",
        paragraphs: [
          "Tu seguridad y privacidad física en Dubái son la máxima prioridad del proyecto. Por diseño, el sistema protege tus rutinas personales:",
        ],
        bulletPoints: [
          "Nunca mostramos a qué hora corres: Nadie puede ver el horario en que entrenas ni tus días habituales de salida.",
          "Nunca mostramos dónde empieza o termina tu carrera: No revelamos tus puntos de inicio o fin, protegiendo tu domicilio, lugar de trabajo o trayectos cotidianos.",
          "Recorte automático a la pista: Descartamos de inmediato cualquier coordenada que quede fuera de la zona oficial de la pista de running.",
          "Solo marcas agregadas: Los demás jugadores solo ven tu alias, tu liga actual y el ritmo medio al que pasaste por cada baldosa.",
        ],
        callout:
          "En el mapa nadie puede ver tu trazado completo ni tus horarios. Solo se muestra tu mejor ritmo en las baldosas oficiales.",
      },
      {
        id: "origen-datos",
        title: "4. ¿De dónde proceden los datos?",
        paragraphs: [
          "Los datos de tus carreras llegan al sistema única y exclusivamente si tú decides conectarlos o subirlos voluntariamente:",
        ],
        bulletPoints: [
          "Subida manual: Archivos .fit o .gpx que exportas desde tu reloj o app y subes directamente a la plataforma.",
          "Conexión con dispositivos (Garmin / Polar): Solo si conectas expresamente tu cuenta para sincronizar tus actividades.",
          "Grabación en la app: Solo si en el futuro decides iniciar una actividad y conceder permiso de ubicación mientras corres.",
        ],
        callout:
          "No realizamos ningún tipo de seguimiento en segundo plano ni accedemos a tus dispositivos sin tu consentimiento explícito.",
      },
      {
        id: "borrado-datos",
        title: "5. Borrado de cuenta y tus datos cuando quieras",
        paragraphs: [
          "Tú eres el único dueño de tu información. Puedes solicitar el borrado completo de tu cuenta y de todos tus datos personales asociados en cualquier momento.",
          "Cuando solicitas la eliminación, borramos tus archivos GPS de los servidores y desvinculamos o eliminamos tus marcas del mapa histórico. No conservamos datos personales una vez cerrada tu cuenta.",
        ],
      },
      {
        id: "contacto",
        title: "6. Contacto y dudas de privacidad",
        paragraphs: [
          "Si tienes cualquier consulta sobre cómo protegemos tus datos o deseas solicitar el borrado de tu información, escríbenos a nuestro correo de contacto:",
        ],
        callout: `Canal de privacidad: ${LEGAL_CONTACT_EMAIL}`,
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    subtitle:
      "We explain in plain words what data we store, what we use it for, and how we protect your privacy while you run.",
    draftNotice: DRAFT_NOTICE_EN,
    draftDescription:
      "This document is an informational draft for the testing phase, pending formal legal review prior to public launch in Dubai.",
    lastUpdated: "October 31, 2026",
    contactEmail: LEGAL_CONTACT_EMAIL,
    relatedLinkText: "See also our Terms of Service",
    relatedLinkHref: "/terminos",
    sections: [
      {
        id: "datos-guardados",
        title: "1. What data do we store?",
        paragraphs: [
          "We collect only the bare minimum data necessary to run the game fairly and transparently:",
        ],
        bulletPoints: [
          "Public alias: The nickname you choose to identify yourself on the map, conquered tiles, and leaderboards.",
          "Email address: Your email, used strictly for secure sign-in and account authentication.",
          "GPS runs and paces: Coordinates of segments run within the official track, distance covered, split timestamps, and calculated paces per kilometer and tile.",
        ],
      },
      {
        id: "para-que",
        title: "2. Why do we use this data?",
        paragraphs: ["All recorded data is used solely for the sporting mechanics of the game:"],
        bulletPoints: [
          "The tile game: We match your verified paces against other runners across hexagonal cells along the Jumeirah Beach – Kite Beach track to determine who conquers each territory.",
          "Fair league matching: We assign and maintain your category based on your reference pace (Elite, Advanced, Intermediate, or Starter) so you always compete against peers of similar ability.",
          "Daily points and promotions: We calculate daily points earned for defending or stealing tiles and grant immediate promotions when you reach a faster pace bracket.",
        ],
      },
      {
        id: "privacidad-total",
        title: "3. What we NEVER show to other runners",
        paragraphs: [
          "Your physical safety and personal privacy in Dubai are our top priorities. By design, the system protects your personal daily routines:",
        ],
        bulletPoints: [
          "We never show what time you run: Other players cannot see what hours or days you train.",
          "We never show where your run starts or finishes: We do not display origin or destination points, keeping your home address, workplace, and routes private.",
          "Automatic zone clipping: Any GPS point recorded outside the official running track is immediately discarded.",
          "Aggregated marks only: Other runners only see your alias, current league, and the average pace you clocked through an official tile.",
        ],
        callout:
          "No one can see your full route or schedule on the map. Only your best pace on official tiles is visible.",
      },
      {
        id: "origen-datos",
        title: "4. Where does the data come from?",
        paragraphs: [
          "Your running data reaches the system only if you voluntarily upload it or link your services:",
        ],
        bulletPoints: [
          "Manual file upload: .fit or .gpx files exported from your running watch or app and submitted by you.",
          "Third-party sync (Garmin / Polar): Only if you explicitly connect your account to import your activities.",
          "In-app recording: Only if you choose to record an activity directly in the app and grant active location permission.",
        ],
        callout:
          "We do not track your location in the background or access your devices without your explicit action.",
      },
      {
        id: "borrado-datos",
        title: "5. Deleting your account and data whenever you want",
        paragraphs: [
          "You have complete ownership of your information. You can request the full deletion of your account and all associated personal data at any time.",
          "Upon receiving your deletion request, your stored GPS files are purged from our servers, and your historical marks are removed or anonymized. We retain no personal data once your account is closed.",
        ],
      },
      {
        id: "contacto",
        title: "6. Privacy contact and questions",
        paragraphs: [
          "If you have any questions about how your data is handled or wish to exercise your right to deletion, please contact us at:",
        ],
        callout: `Privacy contact: ${LEGAL_CONTACT_EMAIL}`,
      },
    ],
  },
};

export const termsOfServiceContent: Record<LegalLocale, LegalDocument> = {
  es: {
    title: "Términos y Condiciones de Uso",
    subtitle:
      "Normas del juego, responsabilidad individual y compromiso de juego limpio en la pista de Dubái.",
    draftNotice: DRAFT_NOTICE_ES,
    draftDescription:
      "Este documento es un borrador informativo para la fase de pruebas y está pendiente de validación jurídica formal antes del lanzamiento público en Dubái.",
    lastUpdated: "31 de octubre de 2026",
    contactEmail: LEGAL_CONTACT_EMAIL,
    relatedLinkText: "Consulta también la Política de Privacidad",
    relatedLinkHref: "/privacidad",
    sections: [
      {
        id: "juego-gratuito",
        title: "1. Juego gratuito y comunitario",
        paragraphs: [
          "Territorio (Runners Dubái) es un juego deportivo 100 % gratuito creado para dinamizar y motivar a la comunidad de corredores en Dubái.",
          "La participación en las ligas, la conquista de baldosas y el uso de la aplicación no tienen ningún coste económico para los usuarios.",
        ],
      },
      {
        id: "responsabilidad-dubai",
        title: "2. Responsabilidad individual y normas en Dubái",
        paragraphs: [
          "La práctica de la carrera a pie se realiza bajo la exclusiva responsabilidad de cada participante. Al utilizar el servicio, aceptas las siguientes pautas fundamentales:",
        ],
        bulletPoints: [
          "Bajo tu propia responsabilidad: Cada usuario es plenamente responsable de su estado físico y de salud para realizar ejercicio cardiovascular. Consulta a un médico antes de exigirte ritmos intensos.",
          "Respeto al tráfico y normas de Dubái: Es obligatorio respetar en todo momento las normas de tráfico del Emirato de Dubái, la señalización vial y las instrucciones de la Dubai Police, Dubai Municipality y RTA (Road and Transport Authority).",
          "Prioridad peatonal y convivencia: La pista es un espacio compartido. Cede siempre el paso a peatones, familias y niños, y mantén una distancia de seguridad prudente.",
          "Condiciones climáticas y calor: El clima en Dubái puede ser extremo. Es responsabilidad de cada corredor hidratarse debidamente, evitar horas de insolación peligrosa y suspender el esfuerzo ante cualquier signo de golpe de calor o fatiga.",
        ],
        callout:
          "Tu salud y el respeto a la normativa de Dubái están siempre por encima de cualquier baldosa o récord en el juego.",
      },
      {
        id: "juego-limpio",
        title: "3. Juego limpio: prohibido hacer trampas",
        paragraphs: [
          "Territorio premia el esfuerzo real de corredores a pie. Para garantizar una competición justa, aplicamos tolerancia cero ante cualquier conducta fraudulenta:",
        ],
        bulletPoints: [
          "Prohibido cualquier vehículo: Queda estrictamente prohibido utilizar bicicleta, patinete (eléctrico o manual), coche, moto, patines o cualquier otro medio motorizado o sobre ruedas.",
          "Prohibido compartir cuentas: Cada cuenta es personal e intransferible. Está prohibido que varios corredores utilicen una misma cuenta para sumar marcas o defender territorio.",
          "Prohibido falsear datos GPS: No se permite manipular archivos GPX o FIT, falsear marcas de tiempo, inyectar datos sintéticos o duplicar tracks de otros usuarios.",
        ],
      },
      {
        id: "anulacion-carreras",
        title: "4. Detección y anulación de carreras sospechosas",
        paragraphs: [
          "El sistema cuenta con algoritmos automáticos de detección de anomalías diseñados para proteger la integridad de las ligas:",
        ],
        bulletPoints: [
          "Detección de velocidades incompatibles con la carrera a pie, aceleraciones no humanas, teletransportes y solapamientos.",
          "Facultad de anulación: Nos reservamos el derecho de enviar a revisión manual o anular cualquier carrera sospechosa de constituir trampa o fallo evidente de GPS.",
          "Efecto de la anulación: Si una carrera es anulada, las baldosas y las tablas de puntos de la temporada se recalculan como si dicha carrera no hubiera existido.",
          "Suspensión de cuentas: Los usuarios que incurran en trampas intencionadas o reincidentes podrán ser bloqueados o expulsados permanentemente de la plataforma.",
        ],
        callout:
          "Podemos anular carreras sospechosas y sancionar el uso de vehículos o cuentas compartidas para mantener las ligas limpias.",
      },
      {
        id: "modificaciones",
        title: "5. Modificaciones del servicio",
        paragraphs: [
          "El proyecto se encuentra en fase de desarrollo activo. Nos reservamos la facultad de ajustar el trazado de las zonas, las bandas de ritmo de las ligas y la duración de las temporadas para optimizar el equilibrio deportivo de la comunidad.",
        ],
      },
      {
        id: "contacto",
        title: "6. Consultas y reportes de juego limpio",
        paragraphs: [
          "Si deseas reportar una irregularidad deportiva o tienes dudas sobre estas condiciones de uso, puedes escribirnos a:",
        ],
        callout: `Contacto del equipo: ${LEGAL_CONTACT_EMAIL}`,
      },
    ],
  },
  en: {
    title: "Terms of Service",
    subtitle:
      "Game rules, personal responsibility, and fair play standards on the Dubai running track.",
    draftNotice: DRAFT_NOTICE_EN,
    draftDescription:
      "This document is an informational draft for the testing phase, pending formal legal review prior to public launch in Dubai.",
    lastUpdated: "October 31, 2026",
    contactEmail: LEGAL_CONTACT_EMAIL,
    relatedLinkText: "See also our Privacy Policy",
    relatedLinkHref: "/privacidad",
    sections: [
      {
        id: "juego-gratuito",
        title: "1. A free community game",
        paragraphs: [
          "Territory (Runners Dubai) is a 100% free sporting game designed to motivate and unite the running community in Dubai.",
          "Joining leagues, conquering tiles, and using the web application involve zero monetary fees or charges.",
        ],
      },
      {
        id: "responsabilidad-dubai",
        title: "2. Personal responsibility and Dubai rules",
        paragraphs: [
          "Running is undertaken entirely at your own risk. By participating, you agree to these fundamental requirements:",
        ],
        bulletPoints: [
          "At your own risk: Each runner is solely responsible for their physical fitness and medical suitability for intense cardiovascular exercise. Consult a physician before attempting demanding paces.",
          "Compliance with Dubai laws and traffic: You must strictly adhere to all applicable laws and traffic regulations in the Emirate of Dubai, road signage, and directives issued by Dubai Police, Dubai Municipality, and the RTA (Road and Transport Authority).",
          "Pedestrian priority and courtesy: The track is a shared public amenity. Always give way to pedestrians, strollers, and children, keeping a safe and respectful distance.",
          "Weather and extreme heat: Dubai temperatures and humidity can be severe. Runners must hydrate adequately, avoid peak midday sun, and cease running immediately at the first sign of heat exhaustion or distress.",
        ],
        callout:
          "Your health, safety, and respect for Dubai laws always come before any tile or game achievement.",
      },
      {
        id: "juego-limpio",
        title: "3. Fair play: cheating is strictly forbidden",
        paragraphs: [
          "Territory celebrates genuine running effort on foot. To maintain honest competition, we enforce strict zero-tolerance policies against cheating:",
        ],
        bulletPoints: [
          "No vehicles or wheels allowed: Using bicycles, e-scooters, kick-scooters, rollerblades, cars, motorbikes, or any motorized or wheeled assistance is strictly forbidden.",
          "No account sharing: Every account is strictly personal. Multiple runners may not share a single profile to defend or capture tiles.",
          "No GPS track manipulation: Tampering with GPX or FIT coordinates, falsifying timestamps, uploading synthetic mock runs, or stealing tracks from others is prohibited.",
        ],
      },
      {
        id: "anulacion-carreras",
        title: "4. Detection and invalidation of suspicious runs",
        paragraphs: [
          "Our system includes automated anti-cheat filters to maintain integrity across all leagues:",
        ],
        bulletPoints: [
          "Algorithmic checks flagging speeds incompatible with running, non-human accelerations, GPS jumps, and overlapping activities.",
          "Right to void runs: We reserve full authority to flag for review or cancel any run suspected of cheating or severe GPS inaccuracies.",
          "Consequences of cancellation: When a run is voided, tile ownership and season points are immediately recomputed as if that activity never happened.",
          "Account suspension: Deliberate or repeat offenders face immediate and permanent bans to preserve fair competition for all runners.",
        ],
        callout:
          "We reserve the right to void suspicious runs and ban users using vehicles or shared accounts to protect fair play.",
      },
      {
        id: "modificaciones",
        title: "5. Service modifications",
        paragraphs: [
          "The platform is continuously evolving. We may adjust zone boundaries, league pace brackets, and season timelines to improve gameplay balance and community enjoyment.",
        ],
      },
      {
        id: "contacto",
        title: "6. Fair play reports and questions",
        paragraphs: [
          "To report a fair play violation or inquire about these terms, reach out to our team at:",
        ],
        callout: `Team contact: ${LEGAL_CONTACT_EMAIL}`,
      },
    ],
  },
};
