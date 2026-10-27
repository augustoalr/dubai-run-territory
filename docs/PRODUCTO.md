# Runners Dubái: producto (Fase 0)

> Documento vivo. Versión 0.1, 27 oct 2026 (hora del Golfo, UTC+4).
> Todo lo marcado como **ESTIMACIÓN** o **PROPUESTA** debe confirmarse con datos del piloto o con la aprobación de Augusto.

## 1. Visión

Un juego para corredores de Dubái: cada carrera conquista celdas hexagonales del mapa, y gana quien corre más rápido **dentro de su propia liga**. Así, un profesional no le quita el mapa a un principiante, porque cada uno compite contra corredores de su nivel.

- **MVP:** solo la pista de running de Jumeirah Beach a Kite Beach, unos 7 km por sentido (ver ARQUITECTURA.md).
- **Después:** Dubai Marina, Al Qudra y Downtown, añadidas como zonas nuevas por configuración y sin reescribir el motor.
- **Fase 0:** PWA web a costo cero. El corredor sube el archivo GPX o FIT de su reloj o de Strava, y no hace falta App Store ni Mac.

### Qué NO es la Fase 0

- No graba carreras en vivo. Grabar en la PWA de Safari con la pantalla encendida queda como opción futura.
- No tiene app nativa, no se conecta a la API de Strava, no hay pagos y no hay categorías de sexo y edad (ver decisiones).

## 2. Usuarios

| Usuario                                                        | Qué necesita                                       | Cómo lo atendemos en Fase 0                                   |
| -------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| Corredor recreativo (6–7 min/km)                               | Motivación y no sentirse aplastado por los rápidos | Liga propia y celdas alcanzables                              |
| Corredor de club (4:30–5:30 min/km)                            | Rivalidad con gente de su nivel y presumir         | Robos de celdas, ranking de temporada y enlace para compartir |
| Corredor élite (< 4:15 min/km)                                 | Reto real                                          | Liga élite con récords de celda difíciles                     |
| Club de running (Jumeirah Johns, Runner's High, Spartan, etc.) | Actividad para sus miembros                        | Temporadas cortas y salidas de club que llenan el mapa        |
| Admin (Augusto)                                                | Arbitrar trampas y abrir temporadas                | Panel mínimo: revisar carreras marcadas, anular y recalcular  |

Origen del archivo:

- **Garmin, Coros, Suunto u otros relojes:** el archivo FIT original.
- **Strava:** desde la web, en el menú "⋯" de la actividad, con "Export GPX" o "Export Original" ([ayuda de Strava](https://support.strava.com/en-us/articles/15401919-how-do-i-export-my-strava-data)).
- **Apple Watch:** lo más simple es sincronizar con Strava y exportar desde allí (ver riesgos).

## 3. Reglas del juego (exactas)

### 3.1 Conceptos

- **Zona:** área de juego definida por un polígono, por ejemplo `jumeirah-kite`. Cada zona tiene su propio conjunto de celdas, temporadas y rankings.
- **Celda:** hexágono H3 de resolución 10. Mide de media unos 76 m de lado y unos 15.000 m² (fuente oficial h3geo.org). La pista tiene del orden de **70–120 celdas (ESTIMACIÓN)**.
- **Liga:** grupo de corredores de ritmo parecido. Cada liga tiene **su propio mapa**: la misma celda puede tener un dueño distinto en cada liga.
- **Temporada:** periodo de **3 semanas (PROPUESTA)** con su mapa y su ranking. Al empezar una temporada todas las celdas vuelven a estar libres.
- **Carrera válida:** archivo aceptado por el antitrampas (ver ARQUITECTURA.md §6).

### 3.2 Marca de celda (cómo se mide)

- Para cada celda que cruzas se calcula tu **marca de celda**: el ritmo medio, en s/km, de la ventana de **1 km centrada** en el momento en que cruzas el centro de la celda (500 m antes y 500 m después).
- Si la carrera no tiene 500 m antes o después dentro de un tramo continuo, la ventana se desplaza hacia dentro hasta completar 1 km continuo. Si el tramo continuo mide menos de 1 km, esas celdas **no puntúan**.
- Por qué es así (PROPUESTA): con hexágonos de unos 150 m, medir solo el tiempo dentro de la celda premiaría sprints de 20 segundos y el ruido del GPS. La ventana de 1 km premia correr de verdad y suaviza los errores del GPS.
- La marca se redondea a **1 s/km**. Por ejemplo, 5:12/km equivale a 312 s/km.
- Si en una carrera pasas varias veces por la misma celda (ida y vuelta), cuenta tu **mejor** marca en esa celda.

### 3.3 Conquistar

- Una celda **libre** en tu liga y temporada pasa a ser tuya con cualquier marca válida.

### 3.4 Robar

- Robas la celda si tu marca es **estrictamente menor** (más rápida) que la del dueño actual en tu liga, comparando el valor redondeado a 1 s/km.
- El dueño anterior la pierde de inmediato y recibe un aviso en la app: "Te robaron 3 celdas".

### 3.5 Defender y mejorar

- Si ya eres el dueño y mejoras tu marca, la celda sigue siendo tuya con la nueva marca (más difícil de robar).
- Si un rival corre la celda y no te supera, se registra como **defensa** para ti (dato para la app; no da puntos en Fase 0).

### 3.6 Desempates

1. Marca igual tras redondear a 1 s/km: **conserva la celda quien la logró primero**, según la hora real de la carrera y no la hora de subida.
2. Si dos carreras logran la misma marca en el mismo segundo (caso teórico), gana la carrera subida primero.

### 3.7 Ligas: cuántas y cómo se asignan

Ligas iniciales (las **bandas son ESTIMACIÓN** y se calibran tras la temporada 1 con la distribución real):

| Liga       | Ritmo de referencia |
| ---------- | ------------------- |
| Élite      | menos de 4:15 /km   |
| Avanzado   | de 4:15 a 5:14 /km  |
| Intermedio | de 5:15 a 6:14 /km  |
| Inicial    | 6:15 /km o más      |

- **Ritmo de referencia:** tu **mejor ventana de 1 km** entre tus carreras válidas de los **últimos 60 días**. Se calcula automáticamente y nunca es autodeclarado.
- **Primera carrera:** te asigna una liga **provisional** con su mejor ventana de 1 km.
- **Ascenso inmediato:** si una carrera válida tiene una ventana de 1 km más rápida que el límite rápido de tu liga, subes **en ese momento**, y esa carrera se evalúa ya en la liga nueva. Así nunca puedes ganar celdas en una liga más lenta que tu ritmo demostrado, y correr lento a propósito para bajar de liga no da ventaja.
- **Sin descensos a mitad de temporada:** solo al empezar una temporada nueva se recalcula la liga con los últimos 60 días, y entonces puedes bajar.
- **Celdas al ascender (PROPUESTA, decisión de Augusto):** las celdas que tenías en la liga anterior **se quedan en esa liga hasta fin de temporada**, pero tus puntos de esa liga se congelan. El ranking final te muestra en la liga en la que terminaste. La alternativa es liberarlas en el momento del ascenso.
- **Categorías de sexo y edad:** aplazadas. El modelo de datos permite añadirlas como ligas paralelas (decisión de Augusto).

### 3.8 Temporadas y puntos

- **Duración:** 3 semanas (PROPUESTA; rango posible de 2 a 4). Empiezan un lunes a las 00:00 y terminan un domingo a las 23:59, hora del Golfo (UTC+4).
- **Carreras que cuentan:** las que empiezan dentro de la temporada y se suben **dentro de las 72 h** siguientes a su final (PROPUESTA). Después de ese plazo se rechazan para el mapa.
- **Puntos:**
  - +1 punto por cada celda que posees en la **foto diaria** de las 23:59, hora del Golfo.
  - +2 puntos por cada **robo**.
  - +1 punto por cada **conquista** de una celda libre.
  - Valores en PROPUESTA: premian mantener y atacar.
- **Ranking por liga:** se ordena por puntos. Los desempates son, en este orden:
  1. más celdas al cierre;
  2. más km válidos dentro de la zona en la temporada;
  3. quien alcanzó primero esa puntuación.
- **Al cierre:** se publica el podio por liga, el mapa se archiva (historial visible) y la temporada siguiente arranca con el mapa vacío.
- **Verano (junio a septiembre):** decidir si se pausan las temporadas o se sigue con menos actividad. Pendiente para más adelante.

### 3.9 Anulaciones

- Si el admin anula una carrera (trampa confirmada), sus marcas se eliminan y el mapa de esa temporada se **recalcula** como si esa carrera nunca hubiera existido.
- Los puntos diarios ya otorgados también se recalculan.

## 4. Qué ve el usuario

1. **Inicio, el mapa de la zona:** hexágonos coloreados en **tu liga** (selector para ver las otras ligas):
   - **míos** (color propio);
   - **de otros** (color neutro, más intenso cuanto más difícil es robarlos);
   - **libres** (solo contorno).
2. **Detalle de celda (al tocarla):**
   - dueño (alias), marca y fecha;
   - tu mejor marca;
   - "Te faltan 7 s/km para robarla".
3. **Subir carrera:** se elige el archivo y aparece una vista previa con el recorrido y las celdas tocadas. Tras el procesamiento se muestra el resultado, por ejemplo: "Conquistaste 4, robaste 2, defendiste 3, liga Intermedio". Si se rechaza, se muestra el motivo claro (por ejemplo, "velocidad de bicicleta detectada").
4. **Ranking de la temporada:** por liga, con tu posición destacada, los días que faltan y tus puntos de hoy.
5. **Perfil:**
   - alias, liga y ritmo de referencia;
   - historial de carreras con su estado (aceptada, en revisión o rechazada);
   - celdas actuales.
6. **Notificaciones dentro de la app (Fase 0):** "Te robaron X celdas". Las notificaciones push quedan para más adelante.

### Privacidad (regla de producto)

- Nunca se muestra el recorrido de otros corredores. Solo se ven las celdas y los alias.
- Del archivo solo se usan los puntos **dentro de la zona**, y el resto se descarta, porque el inicio de la carrera suele ser la casa del corredor.
- El archivo original se guarda en un bucket privado durante 30 días para auditoría y luego se borra (PROPUESTA).

## 5. Métricas de éxito del piloto

Objetivos en **PROPUESTA**: no hay datos públicos de cuántos corredores usan la pista, así que se medirán en el piloto.

| Métrica                                                               | Objetivo de la temporada 1                                       | Cómo se mide             |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------ |
| Corredores registrados con al menos 1 carrera válida                  | ≥ 50                                                             | Tabla `runs`             |
| Corredores activos semanales (al menos 1 carrera válida en la semana) | ≥ 30                                                             | Tabla `runs`             |
| Carreras válidas por corredor activo y semana                         | ≥ 1,5                                                            | Tabla `runs`             |
| Robos por semana                                                      | ≥ 40 (señal de rivalidad real)                                   | `ownership_events`       |
| Retención de la temporada 1 a la 2                                    | ≥ 40 % de los activos repite                                     | Cohortes                 |
| Tasa de rechazo antitrampas                                           | < 10 %, y menos del 2 % de falsos positivos en las reclamaciones | `runs.status` y reportes |
| Clubes participando                                                   | ≥ 2                                                              | Contacto directo         |

**Criterio para pasar a la Fase 1 (app Expo):** 2 temporadas seguidas con al menos 2 clubes y unos 100 corredores activos semanales, como dice el informe de nichos. Hasta entonces, costo cero.

## 6. Riesgos principales

- **Arranque en frío:** un mapa vacío no motiva. Mitigación: lanzar con 2–4 clubes y una salida de club el día 1.
- **GPX falsificables:** un GPX es texto editable. Mitigación: antitrampas, revisión manual y reportes; la grabación en la app llega en la Fase 1.
- **Apple Watch:** la app Entrenamiento no exporta GPX directamente. El camino es sincronizar con Strava y exportar desde allí, o usar apps de terceros.
- **Pista lineal:** con solo 70–120 celdas (ESTIMACIÓN) el mapa se satura rápido. Por eso las temporadas son cortas y hay que abrir zonas nuevas pronto.
- **Calor de verano:** baja la actividad exterior de junio a septiembre.
