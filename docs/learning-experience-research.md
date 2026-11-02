Campus Ciberdefensa · patrones públicos para salas y tareas
Revisión documental: 2026-11-02. Fuentes oficiales públicas; 12 referencias al final.

DECISIÓN PRINCIPAL

Convertir las 24 clases en salas con tareas pequeñas y evidencia explícita. Reutilizar los ocho laboratorios como prácticas vinculables y los tres objetivos previstos como entornos independientes. El avance de una sala, el estado de un entorno y la calidad de una evidencia deben mostrarse por separado. Esto permite estudiar sin Docker, detener un objetivo sin perder notas y distinguir una respuesta correcta de una competencia practicada.

1. Alcance y peso de la evidencia

Método: extracción de patrones documentados en páginas y ayudas públicas oficiales de TryHackMe, Google Skills/Cloud Skills Boost, Microsoft Learn y AWS Skill Builder. Se leyó además README, SPEC, catálogo de ocho laboratorios, currículo y estilos del campus actual. No hubo altas, compra, sesión privada, ejecución de máquinas de terceros ni evaluación con participantes.

Evidencia documental alta para jerarquías y controles descritos expresamente; moderada para composición de pantalla porque algunas ayudas conservan imágenes o textos antiguos. Las recomendaciones siguientes son propuestas para este campus, no resultados de una prueba de usabilidad. No se afirma equivalencia completa con las plataformas observadas.

Contexto de diseño: alumno que estudia y practica desde Windows/Linux, puede interrumpirse, dispone de conectividad variable y prepara cinco certificaciones. Producto de escritorio local con perfiles, materiales y progreso sin servidor. Se presupone que conserva las opciones actuales de lectura ampliada, contraste, temas, espaciado y teclado; falta validar los nuevos flujos con estudiantes.

2. Qué conviene extraer de cada referencia

TryHackMe. Su estructura pública vincula rutas, módulos y salas; las salas combinan formación con material interactivo [1]. Las tareas admiten material, preguntas, respuestas y pistas [2]. Una máquina objetivo pertenece a una tarea; al iniciarla aparece una tarjeta con dirección, vencimiento y controles. La máquina de ataque y el objetivo son conceptos distintos [3]. Las pistas se ofrecen junto a la respuesta y también se explica el formato esperado [4]. Aplicación: tarea y resultado visibles en el mismo contexto; un panel estable informa qué recurso se está utilizando. No importar su estética, textos, nombres de producto, recompensas competitivas ni requerir una máquina para toda sala.

Google Skills. El manual se puede revisar antes de iniciar; una sesión de laboratorio entrega credenciales temporales y tiene un límite real de uso [5]. Aprovisionar y estar listo son estados diferentes; terminar puede destruir el trabajo del entorno [6]. La comprobación de objetivos es una acción diferenciada dentro de la práctica [7]. Aplicación: permitir leer y planear antes de encender; indicar preparación, disponibilidad y cierre; ofrecer comprobación por tarea con criterios concretos. Un contenedor local no necesita imitar una cuenta temporal ni un contador que vence: mostrar duración estimada de estudio y tiempo activo como datos distintos.

Microsoft Learn. Ruta → módulo → unidad organiza contenido breve con metadatos de público, alcance y duración [8]. Su FAQ distingue el logro por completar formación de una credencial validada mediante evaluación más amplia [9]. Aplicación: mostrar tareas completadas y competencias demostradas sin convertir ninguno en una certificación. Advertencia de vigencia: la FAQ actual informa que los sandboxes de Learn ya no están disponibles y los ejercicios requieren acceso a una suscripción Azure; el artículo de tipos de contenido todavía conserva una captura antigua de sandbox [8,9]. Esa captura no prueba disponibilidad actual.

AWS Skill Builder. Los planes recomendados progresan por rol o dominio, permiten cambiar de orden y pueden incluir prácticas; Builder Labs proporciona instrucciones guiadas y AWS Jam plantea desafíos [10]. La preparación distingue estudio, práctica y evaluación; las respuestas de práctica ofrecen explicación y recursos [11]. Aplicación: separar sala guiada y reto de transferencia, recomendar un orden sin bloquear lectura y explicar cada error. Mantener acceso/cuenta/pago junto al enlace externo; el campus no adjudica acceso ni actúa como cliente de los servicios privados.

3. Modelo de experiencia del campus

Ruta universitaria → módulo → sala → tarea → intento → evidencia.
Una sala se vincula con cero o más laboratorios/entornos y con una o más competencias. La relación con una certificación corresponde a una competencia/objetivo concreto, no al porcentaje de sala leído.

Sala: propósito verificable, prerrequisitos, tiempo orientativo, modalidad, tareas, recursos y criterios de cierre. Modalidades visibles: lectura; simulación; motor real aislado; objetivo local real; práctica externa. Una sala de teoría no debe exhibir un botón de máquina inactivo que parezca una falla.

Tarea: contexto breve → acción → qué entregar → comprobar o registrar. Tipos: lectura/reflexión, pregunta conceptual, operación en simulador, resultado calculado, consulta SQL, observación del objetivo y evidencia manual. Cada tarea declara qué comprueba la app y qué queda a autoevaluación. No llamar «verificado» a un texto escrito por el alumno.

Intento: respuesta o acción, fecha, ayudas utilizadas, resultado y explicación. Reintentar agrega un intento; no borra evidencia anterior. La pista orienta primero al concepto, luego al procedimiento. Registrar su uso aporta contexto pedagógico; no requiere penalizar ni ocultar el progreso.

Evidencia: observación reproducible, resultado relevante, interpretación y límite. Vinculada a tarea, intento, competencia y modalidad. La identidad del entorno y su versión ayudan a interpretar el resultado. Las capturas son opcionales; una descripción textual debe permitir entender el hallazgo. Conservar evidencia en el perfil local y excluirla del repositorio público.

4. Flujo principal y recuperación

Inicio «Continuar» → sala y última tarea pendiente → revisar objetivo y recursos → iniciar entorno si la tarea lo necesita → resolver → comprobar respuesta o adjuntar evidencia → recibir orientación → siguiente tarea → cierre de sala → competencia y siguiente práctica recomendada.

Catálogo de salas: buscar por tema; filtrar por módulo, modalidad y nivel; mostrar propósito, tiempo orientativo, tareas y estado «sin comenzar/en curso/completada». Ofrecer «Continuar» con destino concreto. Los prerrequisitos recomiendan lectura previa y explican su motivo; la lectura sigue accesible cuando falta un recurso de ejecución.

Dentro de la sala: título y objetivo, índice de tareas con estado textual, tarea actual y panel de entorno persistente. En escritorio ancho, lectura y panel pueden convivir; con lectura ampliada o ventana angosta se apilan en el mismo orden. La evidencia permanece junto al criterio que la pide. Evitar que el alumno deba ir a «Entornos reales» y volver para descubrir qué practicar.

Respuesta incorrecta: conservar el texto y señalar el criterio incumplido, el formato esperado y una pista opcional. Una excepción técnica no cuenta como error de conocimiento. Evidencia insuficiente: indicar qué observación falta y permitir completar el borrador. No cerrar tareas por ver la solución.

Volver a una sala: reabrir última tarea y borrador guardado; consultar el estado real del entorno antes de declarar que continúa encendido. Si el entorno ya no existe, mantener el progreso pedagógico y ofrecer iniciar otra sesión. Sin Internet, conservar contenido local y explicar la indisponibilidad solo en el recurso externo que depende de él.

5. Contrato visible del entorno

Estados que el alumno debe distinguir: no disponible → detenido → preparando → comprobando disponibilidad → disponible → deteniendo → detenido; además error y restableciendo. El estado nace de una observación del recurso, no de un temporizador cosmético.

Antes de iniciar: nombre del objetivo, modalidad, requisitos y alcance. Para contenedores usar «Iniciar entorno» u «Objetivo local»; «máquina» se reserva para una VM real. Mostrar claramente dónde se abre y desde qué equipo se alcanza. Una IP de una VM y una dirección localhost del anfitrión no son intercambiables.

Disponible: nombre, dirección copiable, estado, acción de abrir, detener y restablecer. «Abrir» solo se habilita cuando el servicio responde. Durante preparación, mantener accesibles instrucciones y notas. Ante error, explicar el estado observado y la siguiente acción útil: revisar requisitos, volver a comprobar o reintentar.

Detener: describir si el objetivo conserva su estado y que las evidencias del campus se guardan por separado. Restablecer: confirmación específica con objetivo y datos que se perderán; preservar el historial del campus. No mezclar «restablecer objetivo» con «borrar progreso de sala». Al salir de la app, indicar si hay recursos que seguirán activos y cómo detenerlos, según la capacidad real del lanzador.

6. Migración aplicable al contenido existente

24 clases → 24 salas base con los mismos identificadores y vínculo al módulo actual. Conservar teoría, 72 preguntas, 48 tarjetas, notas y marcas existentes. Dividir cada clase en tareas con propósito; no inventar práctica real a partir de una lectura completada. Los estados heredados se rotulan como progreso previo, sin fabricar fechas, intentos ni evidencias verificadas.

Ocho laboratorios → prácticas reutilizables: Linux/permisos; Windows/ACL; IPv4/subred; SQL/investigación; SOC/logs; correo/phishing; integridad/SHA-256; recuperación/evidencia. Asociarlos a las salas relevantes mediante un único catálogo. Linux y Windows actuales continúan identificados como simulación; SQL y hash conservan la distinción de ejecución real acotada. Una sala puede enlazar varios laboratorios y un laboratorio servir a varias salas.

Tres objetivos previstos → recursos de entorno compartidos por las salas prácticas. Juice Shop, WebGoat y DVWA requieren guiones docentes propios y criterios distintos; el estado «objetivo encendido» no implica tarea resuelta. Publicar cada modalidad únicamente cuando esté realmente disponible. El guion de una sala debe poder guardar el intento incluso si un objetivo todavía no está instalado.

Final de siete estaciones → evaluación integradora que reúne evidencias de varias competencias. Conservar su recorrido y criterios. Agregar un reto de transferencia sin pasos de solución cuando exista contenido suficiente; distinguir el resultado de práctica guiada del resultado independiente.

7. Competencias y roadmap sin promesas falsas

Cada competencia describe una capacidad observable y relaciona salas, prácticas, evidencias y brechas. Estados sugeridos: por estudiar; practicada con guía; demostrada en simulación; demostrada en entorno real; pendiente de revisión. Junto al estado, identificar siempre quién evaluó y con qué método: comprobación automática acotada, autoevaluación o revisión docente. Una escala de apoyo/contexto es más útil que una barra única que mezcla lectura y habilidad.

Para ISC2 CC, CCST Cybersecurity, Security+, BTL1 y eJPT, guardar la correspondencia con objetivo oficial, versión/fecha de revisión y enlace existente. La matriz muestra qué evidencia apoya cada objetivo y qué falta. La relación concreta debe cotejarse con el programa vigente de cada entidad; este estudio de plataformas no verificó de nuevo esos temarios.

Ejemplo de relación propuesta: sala de permisos → justificar mínimo privilegio → resultado del simulador + explicación; luego práctica real guiada separada. Sala SQL → agrupar eventos y fundamentar una hipótesis → consulta y filas devueltas. Sala web → observación en objetivo autorizado → petición/respuesta o descripción, impacto y corrección. Son evidencias del campus, no credenciales oficiales ni equivalencia automática con un examen.

8. Identidad, accesibilidad y criterio de aceptación UX

Conservar azul #132846, crema #f5f3ed, borgoña #8c3041 y oro #bc994b. Azul estructura; crema lectura; borgoña acciones; oro acentos. El oro no debe ser el único código de estado ni usarse para texto pequeño sin contrastarlo. Mantener títulos editoriales, navegación sobria y superficies de lectura; no copiar paneles de ranking, mascotas, rachas ni activos de las referencias.

Todos los estados incluyen texto además de color. Índice de tareas y panel de entorno operables con teclado, orden de foco coherente y foco visible. Los cambios «preparando/listo/error» se anuncian sin mover el foco; W3C explica este patrón para mensajes de estado [12]. Anunciar transiciones relevantes, no cada segundo de un contador. Botones de pista describen su tarea; cada campo tiene etiqueta y error asociado. Conservar zoom, lectura ampliada, modo concentración y movimiento reducido.

Validación posterior propuesta: con contenido local, una persona debe poder retomar una sala, identificar si usa simulación o entorno real, iniciar la práctica correspondiente, entender un fallo técnico, guardar una evidencia y detener el objetivo. Probar también solo teclado, lectura ampliada, falta de Docker, cierre/reapertura y ausencia de red. No se realizaron estas pruebas de uso en este estudio.

9. Lo que esta investigación no permite inferir

Las páginas públicas describen resultados y controles; no revelan la arquitectura propietaria, hipervisores, red interna, orquestador, modelos de datos, APIs privadas, método exacto de corrección, controles contra trampas ni requisitos de escalado. No corresponde deducirlos de una tarjeta de máquina o de una respuesta de interfaz. La propuesta anterior es un diseño propio compatible con la app local, sin backend de campus.

La corrección local es inspeccionable por quien controla su equipo: sirve para aprendizaje y seguimiento personal, no para emitir una credencial confiable. Una comprobación de disponibilidad prueba que responde un servicio, no que la vulnerabilidad se explotó ni que se alcanzó la competencia. Los enlaces externos pueden cambiar su acceso; toda ficha debe mostrar cuándo se revisó y qué parte es externa.

FUENTES OFICIALES · CONSULTADAS 2026-11-02

[1] TryHackMe, Training content overview — jerarquía y contenido interactivo.
https://help.tryhackme.com/en/articles/8484133-training-content-overview
[2] TryHackMe, Managing Your Rooms — tareas, materiales, preguntas y pistas.
https://help.tryhackme.com/en/articles/6633579-managing-your-rooms
[3] TryHackMe, How to: Starting your first TryHackMe machine — objetivo/atacante, tarjeta y cierre.
https://help.tryhackme.com/en/articles/7977454-how-to-starting-your-first-tryhackme-machine
[4] TryHackMe, Stuck On A Question? — pistas y formato de respuesta.
https://help.tryhackme.com/en/articles/17696277-stuck-on-a-question
[5] Google Skills Help, Start a lab — lectura previa, sesión y acceso temporal.
https://support.google.com/qwiklabs/answer/9127959?hl=en
[6] Google Skills Help, Lab provisioning and time limits — preparación, disponibilidad y cierre.
https://support.google.com/qwiklabs/answer/10702647?hl=en
[7] Google Skills Help, Activity Tracking — comprobaciones por objetivo.
https://support.google.com/qwiklabs/answer/9157965?hl=en
[8] Microsoft Learn, Content and resource types — rutas, módulos y unidades; captura histórica.
https://learn.microsoft.com/en-us/training/support/learn-content-types
[9] Microsoft Learn, Frequently asked questions — logros/credenciales y disponibilidad actual de sandboxes.
https://learn.microsoft.com/en-us/training/support/faq
[10] AWS, Training FAQs — planes, Builder Labs y desafíos; acceso y modalidades.
https://aws.amazon.com/training/faqs/
[11] AWS, Certification exam preparation — estudio, práctica y feedback de evaluación.
https://aws.amazon.com/certification/certification-prep/
[12] W3C WAI, Understanding SC 4.1.3 Status Messages — comunicación accesible de estados.
https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
