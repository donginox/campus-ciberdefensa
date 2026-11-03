globalThis.CAMPUS_LEARNING = {
  "version": 1,
  "scopeNote": "Preguntas y criterios originales del Campus. Diagnóstico y simulacros docentes sobre una selección de fundamentos; no son exámenes oficiales, no predicen nota ni cubren íntegramente una certificación. El tiempo es opcional. Revisitá las brechas y objetivos en Competencias. Banco ampliado con 80 escenarios nuevos. Los formularios seleccionan una muestra docente de 24 preguntas y conservan sus opciones al retomarlos.",
  "reviewNote": "Intervalos simples de 1, 3, 7 y 14 días para organizar repasos; no representan una predicción científica de memoria.",
  "domains": [
    {
      "id": "systems",
      "title": "Sistemas",
      "lessonId": "kernel-shell",
      "practiceId": "win-processes",
      "lessonIds": [
        "procesos-concurrencia",
        "memoria-virtualizacion",
        "kernel-shell"
      ]
    },
    {
      "id": "windows",
      "title": "Windows",
      "lessonId": "windows-objetos-procesos",
      "practiceId": "win-processes",
      "lessonIds": [
        "windows-acl",
        "windows-objetos-procesos",
        "windows-eventos"
      ]
    },
    {
      "id": "linux",
      "title": "Linux",
      "lessonId": "linux-archivos-permisos",
      "practiceId": "linux-processes",
      "lessonIds": [
        "linux-archivos-permisos",
        "linux-proceso",
        "linux-http-local",
        "windows-eventos"
      ]
    },
    {
      "id": "networks",
      "title": "Redes",
      "lessonId": "capas-subredes-rutas",
      "practiceId": "win-network",
      "lessonIds": [
        "capas-subredes-rutas",
        "senales-unidades"
      ]
    },
    {
      "id": "data",
      "title": "Datos",
      "lessonId": "sql-consultas",
      "practiceId": "linux-logs",
      "lessonIds": [
        "sql-consultas",
        "sql-transacciones",
        "modelo-calidad",
        "recuperacion-rto-rpo",
        "fronteras-confianza"
      ]
    },
    {
      "id": "security",
      "title": "Seguridad",
      "lessonId": "fronteras-confianza",
      "practiceId": "win-permissions",
      "lessonIds": [
        "fronteras-confianza",
        "riesgo-cambios"
      ]
    },
    {
      "id": "governance",
      "title": "Gobierno y riesgo",
      "lessonId": "riesgo-cambios",
      "practiceId": "win-services",
      "lessonIds": [
        "riesgo-cambios",
        "fronteras-confianza"
      ]
    },
    {
      "id": "response",
      "title": "Respuesta y recuperación",
      "lessonId": "recuperacion-rto-rpo",
      "practiceId": "win-events",
      "lessonIds": [
        "windows-eventos",
        "fronteras-confianza",
        "recuperacion-rto-rpo"
      ]
    }
  ],
  "certifications": [
    {
      "id": "cc",
      "name": "ISC2 Certified in Cybersecurity · CC",
      "examMinutes": 30,
      "questionCount": 24,
      "domains": [
        "security",
        "governance",
        "response",
        "networks"
      ],
      "coverage": "Selección de fundamentos con 24 preguntas docentes. Complementar con práctica, evidencia y brechas del mapa de competencias.",
      "objectiveIds": [
        "cc-controles",
        "cc-continuidad",
        "cc-ciclo-identidad",
        "cc-red-responsabilidad",
        "cc-triaje-datos"
      ],
      "sourceUrl": "https://www.isc2.org/certifications/cc/cc-certification-exam-outline",
      "objectiveNote": "Relación didáctica por conceptos y clases del mapa de competencias; no equivale a cobertura completa ni a ponderación oficial."
    },
    {
      "id": "ccst",
      "name": "Cisco CCST Cybersecurity",
      "examMinutes": 30,
      "questionCount": 24,
      "domains": [
        "networks",
        "windows",
        "linux",
        "security"
      ],
      "coverage": "Selección de fundamentos con 24 preguntas docentes. Complementar con práctica, evidencia y brechas del mapa de competencias.",
      "objectiveIds": [
        "ccst-riesgo-acceso",
        "ccst-recorrido-red",
        "ccst-endpoint-verificar",
        "ccst-priorizar",
        "ccst-escalar"
      ],
      "sourceUrl": "https://www.cisco.com/c/dam/en_us/training-events/training/courses/ccst-cybersecurity.pdf",
      "objectiveNote": "Relación didáctica por conceptos y clases del mapa de competencias; no equivale a cobertura completa ni a ponderación oficial."
    },
    {
      "id": "security-plus",
      "name": "CompTIA Security+ · V7 en español",
      "examMinutes": 30,
      "questionCount": 24,
      "domains": [
        "security",
        "governance",
        "networks",
        "response"
      ],
      "coverage": "Selección de fundamentos con 24 preguntas docentes. Complementar con práctica, evidencia y brechas del mapa de competencias.",
      "objectiveIds": [
        "sec-criptografia-cambios",
        "sec-interpretar-hallazgos",
        "sec-disenar-fronteras",
        "sec-investigar",
        "sec-riesgo-programa"
      ],
      "sourceUrl": "https://www.comptia.org/en-us/certifications/security/v7/",
      "objectiveNote": "Relación didáctica por conceptos y clases del mapa de competencias; no equivale a cobertura completa ni a ponderación oficial."
    },
    {
      "id": "btl1",
      "name": "Blue Team Level 1 · BTL1",
      "examMinutes": 30,
      "questionCount": 24,
      "domains": [
        "response",
        "data",
        "windows",
        "linux"
      ],
      "coverage": "Selección de fundamentos con 24 preguntas docentes. Complementar con práctica, evidencia y brechas del mapa de competencias.",
      "objectiveIds": [
        "btl-sistema-defensa",
        "btl-correo",
        "btl-contextualizar-ioc",
        "btl-disco-memoria",
        "btl-consulta-siem",
        "btl-caso-integrado"
      ],
      "sourceUrl": "https://www.centri.org/certifications/blue-team-level-1",
      "objectiveNote": "Relación didáctica por conceptos y clases del mapa de competencias; no equivale a cobertura completa ni a ponderación oficial."
    },
    {
      "id": "ejpt",
      "name": "INE Junior Penetration Tester · eJPT",
      "examMinutes": 30,
      "questionCount": 24,
      "domains": [
        "networks",
        "linux",
        "security",
        "data"
      ],
      "coverage": "Selección de fundamentos con 24 preguntas docentes. Complementar con práctica, evidencia y brechas del mapa de competencias.",
      "objectiveIds": [
        "ejpt-alcance-enumerar",
        "ejpt-auditar-hosts",
        "ejpt-validar-acceso",
        "ejpt-pivoting",
        "ejpt-web-validar"
      ],
      "sourceUrl": "https://ine.com/security/certifications/ejpt-certification",
      "objectiveNote": "Relación didáctica por conceptos y clases del mapa de competencias; no equivale a cobertura completa ni a ponderación oficial."
    }
  ],
  "questions": [
    {
      "id": "systems-1",
      "domain": "systems",
      "question": "Un editor deja de responder pero el resto del escritorio funciona. ¿Qué observar primero?",
      "options": [
        "Reiniciar el sistema sin identificar el proceso",
        "Aumentar memoria sin medir su uso",
        "El proceso del editor y su consumo",
        "Reinstalar el editor antes de observar errores"
      ],
      "correct": 2,
      "explanation": "Un proceso puede fallar sin que falle el kernel. Observar PID y recursos permite acotar la hipótesis antes de intervenir.",
      "rubric": "Identificar proceso y consumo; distinguir observación de terminación.",
      "lessonId": "procesos-concurrencia",
      "legacyOptionOrder": [
        2,
        0,
        1,
        3
      ]
    },
    {
      "id": "systems-2",
      "domain": "systems",
      "question": "Una VM tiene disco libre pero rechaza abrir otra aplicación por falta de memoria. ¿Qué recurso revisar?",
      "options": [
        "RAM asignada y presión de memoria",
        "Solo capacidad del disco virtual",
        "Solo cantidad de CPU virtuales",
        "Solo latencia de la red externa"
      ],
      "correct": 0,
      "explanation": "El espacio en disco no sustituye sin costo a la RAM. Revisar memoria y paginación permite explicar la presión del sistema.",
      "rubric": "Relacionar RAM, paginación y carga; proponer una medida verificable.",
      "lessonId": "memoria-virtualizacion",
      "legacyOptionOrder": [
        1,
        0,
        2,
        3
      ]
    },
    {
      "id": "systems-3",
      "domain": "systems",
      "question": "Dos programas escriben simultáneamente un contador y se pierden incrementos. ¿Qué propiedad falta?",
      "options": [
        "Más prioridad para ambos procesos",
        "Una pausa fija entre escrituras sin coordinación",
        "Dos copias del archivo sin control de versión",
        "Sincronización del acceso compartido"
      ],
      "correct": 3,
      "explanation": "Una lectura seguida de escritura no es necesariamente atómica. La exclusión o una operación atómica evita actualizaciones perdidas.",
      "rubric": "Describir una intercalación y justificar la sincronización.",
      "lessonId": "procesos-concurrencia",
      "legacyOptionOrder": [
        0,
        1,
        3,
        2
      ]
    },
    {
      "id": "systems-4",
      "domain": "systems",
      "question": "Un comando muestra error de permiso. ¿Qué distingue shell de kernel?",
      "options": [
        "La shell autoriza por sí sola cada acceso al disco",
        "La shell interpreta; el kernel aplica controles",
        "El kernel interpreta todos los alias de la shell",
        "La aplicación decide sus permisos sin consultar al sistema"
      ],
      "correct": 1,
      "explanation": "La shell solicita operaciones al sistema. El kernel controla acceso a recursos y no debe saltarse sus permisos por un error de interfaz.",
      "rubric": "Separar interpretación, llamada al sistema y autorización.",
      "lessonId": "kernel-shell",
      "legacyOptionOrder": [
        0,
        2,
        3,
        1
      ]
    },
    {
      "id": "systems-5",
      "domain": "systems",
      "question": "Una imagen de VM arranca pero una aplicación no encuentra sus archivos. ¿Qué demuestra el arranque?",
      "options": [
        "Que cada aplicación cumple ya su RTO",
        "Que el sistema inicia, no que la aplicación esté recuperada",
        "Que todos los archivos recuperados coinciden",
        "Que el respaldo contiene los últimos cambios"
      ],
      "correct": 1,
      "explanation": "El arranque verifica una parte de la recuperación. Los datos y funciones requieren comprobaciones específicas adicionales.",
      "rubric": "Distinguir disponibilidad del sistema y validación funcional de datos.",
      "lessonId": "memoria-virtualizacion",
      "legacyOptionOrder": [
        1,
        0,
        2,
        3
      ]
    },
    {
      "id": "systems-6",
      "domain": "systems",
      "question": "Un servicio funciona hasta cerrar la terminal que lo lanzó. ¿Qué investigar?",
      "options": [
        "El tipo de sistema de archivos exclusivamente",
        "La configuración DNS del equipo primero",
        "Dependencia de la sesión y gestión del proceso",
        "El permiso de lectura de cada archivo del usuario"
      ],
      "correct": 2,
      "explanation": "Un proceso ligado a la sesión puede terminar al cerrar la terminal. Un gestor de servicios controla su ciclo de vida con configuración explícita.",
      "rubric": "Explicar ciclo de vida y contrastar con un servicio supervisado.",
      "lessonId": "kernel-shell",
      "legacyOptionOrder": [
        0,
        2,
        1,
        3
      ]
    },
    {
      "id": "windows-1",
      "domain": "windows",
      "question": "En una carpeta de práctica, un grupo tiene lectura y otro una denegación aplicable. ¿Qué revisar antes de cambiar permisos?",
      "options": [
        "Solo el permiso directo concedido al usuario",
        "Identidad, grupos y permisos efectivos",
        "Solo la casilla de herencia del recurso",
        "Solo que la cuenta pueda iniciar sesión"
      ],
      "correct": 1,
      "explanation": "Las ACL se evalúan con identidades y herencia. Observar permisos efectivos evita asumir acceso por una sola entrada de permiso.",
      "rubric": "Citar identidad, grupos, herencia y permiso efectivo sin modificar el host.",
      "lessonId": "windows-acl",
      "legacyOptionOrder": [
        1,
        0,
        2,
        3
      ]
    },
    {
      "id": "windows-2",
      "domain": "windows",
      "question": "Un proceso con nombre conocido consume CPU. ¿Cuál es una conclusión defendible?",
      "options": [
        "El consumo alto confirma comportamiento malicioso",
        "La firma conocida elimina la necesidad de contexto",
        "El nombre identifica de forma única el ejecutable",
        "El nombre solo no demuestra legitimidad"
      ],
      "correct": 3,
      "explanation": "Un nombre puede repetirse o ser imitado. CPU y nombre son señales iniciales; hacen falta contexto y procedencia para afirmar una causa.",
      "rubric": "Separar observación de atribución y pedir evidencia adicional.",
      "lessonId": "windows-objetos-procesos",
      "legacyOptionOrder": [
        0,
        3,
        1,
        2
      ]
    },
    {
      "id": "windows-3",
      "domain": "windows",
      "question": "Un evento registra un fallo de inicio. ¿Qué hace falta para vincularlo con otro equipo?",
      "options": [
        "Hora, origen e identidad, con límites de correlación",
        "Solo el identificador del evento, sin hora",
        "Solo el nombre de la cuenta, sin origen",
        "Solo el orden en que se recibieron las alertas"
      ],
      "correct": 0,
      "explanation": "Correlacionar exige campos comparables y relojes interpretados. Un evento aislado no prueba por sí solo una intrusión.",
      "rubric": "Usar campos de correlación y expresar incertidumbre.",
      "lessonId": "windows-eventos",
      "legacyOptionOrder": [
        1,
        2,
        0,
        3
      ]
    },
    {
      "id": "windows-4",
      "domain": "windows",
      "question": "Una cuenta estándar necesita leer un informe. ¿Qué cambio respeta privilegio mínimo?",
      "options": [
        "Añadir la cuenta a Administradores sin caducidad",
        "Conceder modificar a todo el directorio de usuarios",
        "Conceder lectura al grupo adecuado sobre esa carpeta de práctica",
        "Desactivar la herencia de permisos de todo el volumen"
      ],
      "correct": 2,
      "explanation": "Privilegio mínimo limita sujeto, recurso y operación. Elevar toda la cuenta excede la necesidad de leer un informe.",
      "rubric": "Precisar alcance, operación y verificación del permiso.",
      "lessonId": "windows-acl",
      "legacyOptionOrder": [
        0,
        1,
        3,
        2
      ]
    },
    {
      "id": "windows-5",
      "domain": "windows",
      "question": "Un servicio aparece detenido tras reiniciar. ¿Qué observar primero?",
      "options": [
        "Desinstalar y reinstalar antes de consultar estado",
        "Cambiar su identidad a administrador por defecto",
        "Marcar todos los servicios como automáticos",
        "Tipo de inicio, dependencias y estado"
      ],
      "correct": 3,
      "explanation": "El estado actual y el tipo de inicio son conceptos distintos. Las dependencias y errores aportan evidencia antes de cambiar configuración.",
      "rubric": "Distinguir configuración de inicio, dependencia y estado observado.",
      "lessonId": "windows-objetos-procesos",
      "legacyOptionOrder": [
        3,
        0,
        1,
        2
      ]
    },
    {
      "id": "windows-6",
      "domain": "windows",
      "question": "Una conexión saliente aparece en el observador. ¿Qué dato ayuda a atribuirla localmente?",
      "options": [
        "PID asociado y momento de observación",
        "Solo la dirección remota, sin proceso ni tiempo",
        "Solo el puerto remoto, que identifica al usuario",
        "Solo el nombre del proceso obtenido otro día"
      ],
      "correct": 0,
      "explanation": "La conexión se vincula con un proceso en un momento. El PID puede reutilizarse y debe interpretarse junto con tiempo y contexto.",
      "rubric": "Correlacionar PID y tiempo; no atribuir identidad remota con certeza.",
      "lessonId": "windows-objetos-procesos",
      "legacyOptionOrder": [
        1,
        0,
        2,
        3
      ]
    },
    {
      "id": "linux-1",
      "domain": "linux",
      "question": "Un archivo ficticio tiene modo 640. ¿Quién puede escribir por esos bits?",
      "options": [
        "El propietario y el grupo",
        "Todos los usuarios autenticados",
        "Cualquier usuario con acceso al directorio",
        "El propietario"
      ],
      "correct": 3,
      "explanation": "En 640 el propietario tiene lectura y escritura; el grupo lectura; otros ningún permiso. ACL adicionales pueden requerir otra inspección.",
      "rubric": "Descomponer los tres dígitos y declarar el alcance de bits tradicionales.",
      "lessonId": "linux-archivos-permisos",
      "legacyOptionOrder": [
        3,
        0,
        1,
        2
      ]
    },
    {
      "id": "linux-2",
      "domain": "linux",
      "question": "Un directorio permite leer nombres pero no atravesarlo. ¿Qué bit falta revisar?",
      "options": [
        "Lectura del directorio únicamente",
        "Ejecución del directorio",
        "Escritura del directorio únicamente",
        "Ejecución del archivo de texto contenido"
      ],
      "correct": 1,
      "explanation": "En directorios, ejecución permite atravesar y acceder a entradas. Lectura de nombres no equivale a acceso al contenido.",
      "rubric": "Explicar diferencia entre listar, atravesar y modificar entradas.",
      "lessonId": "linux-archivos-permisos",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "linux-3",
      "domain": "linux",
      "question": "Un proceso usa mucha RAM. ¿Qué dato identifica el proceso observado?",
      "options": [
        "Solo el nombre, porque no se repite",
        "Solo el usuario propietario, sin PID",
        "PID junto con instante y contexto",
        "Solo el tamaño del archivo ejecutable"
      ],
      "correct": 2,
      "explanation": "El PID localiza el proceso vivo; puede reutilizarse después. Una evidencia útil incluye el momento y los recursos observados.",
      "rubric": "Registrar identificación temporal sin asumir permanencia del PID.",
      "lessonId": "linux-proceso",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "linux-4",
      "domain": "linux",
      "question": "Un servidor escucha en 127.0.0.1. ¿Desde dónde se accede directamente?",
      "options": [
        "Desde el mismo espacio de red local",
        "Desde cualquier equipo de su subred por defecto",
        "Desde cualquier equipo con DNS resuelto",
        "Desde otro equipo con la misma cuenta de usuario"
      ],
      "correct": 0,
      "explanation": "La dirección de loopback limita el alcance al propio espacio de red. No implica que exista publicación hacia otras máquinas.",
      "rubric": "Distinguir dirección de escucha, alcance y publicación explícita.",
      "lessonId": "linux-http-local",
      "legacyOptionOrder": [
        1,
        2,
        3,
        0
      ]
    },
    {
      "id": "linux-5",
      "domain": "linux",
      "question": "Un registro muestra tres fallos y un éxito para una cuenta. ¿Qué sigue?",
      "options": [
        "Correlacionar origen, tiempo y contexto del éxito",
        "Confirmar compromiso solo por el número de fallos",
        "Suponer que el éxito invalida todos los fallos",
        "Bloquear todas las cuentas antes de acotar el caso"
      ],
      "correct": 0,
      "explanation": "La secuencia justifica investigar, pero no prueba compromiso por sí misma. El origen y contexto del éxito permiten contrastar hipótesis.",
      "rubric": "Plantear hipótesis alternativas y campos para corroborarlas.",
      "lessonId": "windows-eventos",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "linux-6",
      "domain": "linux",
      "question": "Un comando sudo pide contraseña en una práctica. ¿Qué decisión corresponde?",
      "options": [
        "Ejecutarlo primero y revisar efectos después",
        "Usar root para evitar interpretar el error",
        "Desactivar todos los controles de acceso temporalmente",
        "Revisar qué modifica y usar una VM o carpeta autorizada"
      ],
      "correct": 3,
      "explanation": "La elevación amplía el alcance de una operación. Comprenderla y aislarla en la práctica reduce cambios accidentales en el equipo propio.",
      "rubric": "Explicar impacto y alcance antes de elevar privilegios.",
      "lessonId": "linux-archivos-permisos",
      "legacyOptionOrder": [
        0,
        3,
        1,
        2
      ]
    },
    {
      "id": "networks-1",
      "domain": "networks",
      "question": "Un equipo llega a una IP pero falla por nombre. ¿Qué hipótesis inicial es más específica?",
      "options": [
        "Problema de resolución de nombres",
        "Fallo total de la interfaz de red",
        "Ausencia de toda ruta hacia la IP observada",
        "Fallo confirmado del servicio de destino"
      ],
      "correct": 0,
      "explanation": "Llegar a una dirección y fallar por nombre separa conectividad de resolución. Aún hay que comprobar DNS y el nombre consultado.",
      "rubric": "Distinguir DNS de transporte y proponer comprobación concreta.",
      "lessonId": "capas-subredes-rutas",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "networks-2",
      "domain": "networks",
      "question": "Dos equipos de subredes distintas necesitan comunicarse. ¿Qué función intermedia suele requerirse?",
      "options": [
        "Solo un switch sin función de enrutamiento",
        "Solo usar nombres DNS iguales",
        "Enrutamiento entre redes",
        "Solo asignar el mismo puerto a ambos servicios"
      ],
      "correct": 2,
      "explanation": "Un router decide el siguiente salto entre redes. La ruta de ida y la de vuelta deben ser coherentes y estar autorizadas.",
      "rubric": "Explicar siguiente salto y ruta de retorno.",
      "lessonId": "capas-subredes-rutas",
      "legacyOptionOrder": [
        0,
        2,
        1,
        3
      ]
    },
    {
      "id": "networks-3",
      "domain": "networks",
      "question": "Una aplicación recibe timeout. ¿Qué demuestra ese resultado?",
      "options": [
        "Que el servidor rechazó explícitamente la sesión",
        "No obtuvo respuesta en el plazo; hay varias causas posibles",
        "Que el puerto está abierto y autenticado",
        "Que el nombre resolvió siempre de forma correcta"
      ],
      "correct": 1,
      "explanation": "Un timeout es una observación temporal. Puede deberse a pérdida, filtrado, ruta, servicio o plazo insuficiente; requiere pruebas adicionales.",
      "rubric": "Separar síntoma de causa y proponer una segunda observación.",
      "lessonId": "capas-subredes-rutas",
      "legacyOptionOrder": [
        0,
        2,
        1,
        3
      ]
    },
    {
      "id": "networks-4",
      "domain": "networks",
      "question": "Una captura muestra TCP establecido y respuesta HTTP 403. ¿Qué capa informa el rechazo?",
      "options": [
        "La capa física, que decidió denegar al usuario",
        "La resolución de nombres, que emitió el código",
        "TCP, que codifica permisos de cada usuario",
        "La aplicación HTTP"
      ],
      "correct": 3,
      "explanation": "403 es una respuesta de aplicación tras intercambiar datos. No equivale a ausencia de conectividad TCP.",
      "rubric": "Relacionar respuesta HTTP con conectividad previa y política de acceso.",
      "lessonId": "capas-subredes-rutas",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "networks-5",
      "domain": "networks",
      "question": "Una transferencia de 100 MB cruza un enlace de 100 Mb/s. Sin sobrecarga, ¿qué tiempo mínimo aproxima?",
      "options": [
        "1 segundo, porque MB y Mb son equivalentes",
        "0,125 segundos, invirtiendo bytes y bits",
        "8 segundos",
        "100 segundos, multiplicando tamaño y ancho de banda"
      ],
      "correct": 2,
      "explanation": "Hay ocho bits por byte. Cien megabytes equivalen aproximadamente a ochocientos megabits; a cien megabits por segundo son ocho segundos.",
      "rubric": "Mostrar conversión de unidades y advertir sobre sobrecarga real.",
      "lessonId": "senales-unidades",
      "legacyOptionOrder": [
        2,
        0,
        1,
        3
      ]
    },
    {
      "id": "networks-6",
      "domain": "networks",
      "question": "Un puerto escucha en todas las interfaces. ¿Qué revisar antes de exponerlo?",
      "options": [
        "Solo que el puerto no sea uno conocido",
        "Necesidad, autenticación y alcance de red permitido",
        "Solo que el proceso tenga un nombre legítimo",
        "Solo que la conexión use una dirección privada"
      ],
      "correct": 1,
      "explanation": "Escuchar en todas las interfaces amplía el alcance potencial. Autenticación y controles de red deben corresponder con la necesidad del servicio.",
      "rubric": "Evaluar alcance, identidad y autorización del servicio.",
      "lessonId": "capas-subredes-rutas",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "data-1",
      "domain": "data",
      "question": "Una consulta SQL concatena texto ingresado por usuarios. ¿Qué mejora evita tratarlo como código?",
      "options": [
        "Escapar espacios del texto antes de concatenar",
        "Parámetros enlazados",
        "Validar solo el largo máximo del texto",
        "Ocultar la consulta en el código del cliente"
      ],
      "correct": 1,
      "explanation": "Los parámetros separan los valores de la estructura SQL. La validación ayuda al dominio de datos pero no reemplaza ese mecanismo.",
      "rubric": "Separar estructura y valor; señalar los límites de la validación.",
      "lessonId": "sql-consultas",
      "legacyOptionOrder": [
        1,
        0,
        2,
        3
      ]
    },
    {
      "id": "data-2",
      "domain": "data",
      "question": "Una transferencia descuenta saldo pero falla antes de acreditarlo. ¿Qué protege la operación completa?",
      "options": [
        "Una transacción con atomicidad",
        "Una confirmación independiente para cada cambio",
        "Una copia del saldo antes de cada lectura sin reversión",
        "Un orden fijo de filas sin transacción"
      ],
      "correct": 0,
      "explanation": "La atomicidad evita dejar cambios parciales de una unidad lógica. Debe acompañarse de reglas y tratamiento correcto del error.",
      "rubric": "Explicar confirmar o revertir ambos cambios como unidad.",
      "lessonId": "sql-transacciones",
      "legacyOptionOrder": [
        1,
        0,
        2,
        3
      ]
    },
    {
      "id": "data-3",
      "domain": "data",
      "question": "Una tabla repite un cliente con dos domicilios diferentes. ¿Qué problema se investiga?",
      "options": [
        "Eliminar automáticamente toda fila repetida",
        "Elegir el domicilio de la primera fila sin regla",
        "Calidad y consistencia según la regla del negocio",
        "Cambiar la clave para que todas las filas parezcan únicas"
      ],
      "correct": 2,
      "explanation": "La inconsistencia se interpreta con una clave y una regla de vigencia. Repetición no implica siempre duplicación inválida.",
      "rubric": "Definir clave, vigencia y criterio antes de corregir.",
      "lessonId": "modelo-calidad",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "data-4",
      "domain": "data",
      "question": "Un respaldo existe pero nunca se restauró. ¿Qué falta demostrar?",
      "options": [
        "Solo que el tamaño del respaldo sea positivo",
        "Solo que la tarea haya informado éxito",
        "Solo que el respaldo esté en otra carpeta del mismo disco",
        "Recuperabilidad e integridad funcional"
      ],
      "correct": 3,
      "explanation": "La existencia del archivo no demuestra que se pueda restaurar y usar. Una prueba de recuperación debe validar contenido y funciones.",
      "rubric": "Proponer restauración aislada y comprobaciones de datos.",
      "lessonId": "recuperacion-rto-rpo",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "data-5",
      "domain": "data",
      "question": "Hay que contar fallos por origen. ¿Qué combinación SQL corresponde?",
      "options": [
        "GROUP BY origen con COUNT y filtro de fallos",
        "ORDER BY origen sin contar filas",
        "COUNT global sin agrupar por origen",
        "DISTINCT origen, que ya muestra la cantidad de fallos"
      ],
      "correct": 0,
      "explanation": "El filtro define los eventos y la agrupación produce un recuento por origen. Debe comprobarse qué cuenta cada fila antes de interpretar.",
      "rubric": "Explicar filtro, granularidad y agregación sin destruir datos.",
      "lessonId": "sql-consultas",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "data-6",
      "domain": "data",
      "question": "El hash de una copia difiere del original. ¿Qué puede afirmarse?",
      "options": [
        "Que se probó una modificación intencional",
        "Que se sabe cuál de las dos copias es correcta",
        "Los bytes no coinciden bajo el algoritmo empleado",
        "Que se conoce quién produjo la diferencia"
      ],
      "correct": 2,
      "explanation": "Una diferencia de hash señala diferencia de contenido con ese algoritmo. No identifica causa ni autor; se debe investigar el proceso de copia.",
      "rubric": "Distinguir integridad, causa y atribución.",
      "lessonId": "fronteras-confianza",
      "legacyOptionOrder": [
        0,
        2,
        1,
        3
      ]
    },
    {
      "id": "security-1",
      "domain": "security",
      "question": "Un correo urgente pide ejecutar un adjunto para recuperar una cuenta. ¿Qué acción inicial es razonable?",
      "options": [
        "Abrir el adjunto en el equipo principal para verificarlo",
        "Responder al mismo remitente enviando la contraseña",
        "Confiar solo en el logotipo y nombre visible",
        "Verificar por un canal conocido y conservar evidencia"
      ],
      "correct": 3,
      "explanation": "La urgencia y la solicitud de ejecución requieren verificación independiente. Conservar datos del mensaje permite investigar sin abrir el adjunto.",
      "rubric": "Usar canal independiente y evitar ejecución del contenido.",
      "lessonId": "fronteras-confianza",
      "legacyOptionOrder": [
        3,
        0,
        1,
        2
      ]
    },
    {
      "id": "security-2",
      "domain": "security",
      "question": "Una aplicación confía en el rol enviado por el navegador. ¿Dónde debe decidir el acceso?",
      "options": [
        "Solo en JavaScript antes de enviar la solicitud",
        "Solo en un campo oculto que indique el rol",
        "En el servidor con identidad y autorización verificadas",
        "En una cookie editable sin validación del servidor"
      ],
      "correct": 2,
      "explanation": "El cliente está bajo control de quien lo usa. El servidor debe comprobar permisos para cada operación protegida.",
      "rubric": "Identificar frontera de confianza y control de autorización.",
      "lessonId": "fronteras-confianza",
      "legacyOptionOrder": [
        0,
        2,
        1,
        3
      ]
    },
    {
      "id": "security-3",
      "domain": "security",
      "question": "Un equipo usa MFA. ¿Qué afirmación describe su alcance?",
      "options": [
        "Reduce ciertos riesgos, sin eliminar phishing o secuestro de sesión",
        "Elimina la necesidad de revocar sesiones",
        "Garantiza que todo correo de acceso es legítimo",
        "Sustituye la autorización sobre recursos"
      ],
      "correct": 0,
      "explanation": "MFA añade comprobaciones de identidad pero sus mecanismos y las sesiones tienen límites. Debe combinarse con protección y seguimiento del acceso.",
      "rubric": "Reconocer beneficio y límites según mecanismo y sesión.",
      "lessonId": "fronteras-confianza",
      "legacyOptionOrder": [
        1,
        2,
        0,
        3
      ]
    },
    {
      "id": "security-4",
      "domain": "security",
      "question": "Una contraseña aparece en un repositorio compartido. ¿Qué hacer primero con esa credencial?",
      "options": [
        "Solo borrar el secreto del último commit",
        "Revocarla o rotarla y evaluar su uso",
        "Solo restringir acceso futuro al repositorio",
        "Esperar a observar un abuso antes de revocarla"
      ],
      "correct": 1,
      "explanation": "Quitar una línea no elimina copias ni historial. Revocar o rotar limita usos futuros y permite investigar exposición y actividad.",
      "rubric": "Incluir revocación y evaluación de exposición histórica.",
      "lessonId": "fronteras-confianza",
      "legacyOptionOrder": [
        0,
        2,
        3,
        1
      ]
    },
    {
      "id": "security-5",
      "domain": "security",
      "question": "Un escaneo autorizado detecta una versión antigua. ¿Qué falta para priorizar?",
      "options": [
        "Solo la antigüedad de la versión detectada",
        "Exposición, impacto, explotación y controles existentes",
        "Solo la cantidad de hallazgos del equipo",
        "Solo la severidad genérica sin contexto del activo"
      ],
      "correct": 1,
      "explanation": "La versión es una señal. El riesgo depende del contexto, criticidad, posibilidad de explotación y mitigaciones verificadas.",
      "rubric": "Priorizar con contexto y confirmar aplicabilidad del hallazgo.",
      "lessonId": "riesgo-cambios",
      "legacyOptionOrder": [
        1,
        0,
        2,
        3
      ]
    },
    {
      "id": "security-6",
      "domain": "security",
      "question": "Se propone probar una técnica contra un sitio público sin permiso. ¿Qué alternativa corresponde?",
      "options": [
        "Probar con pocas solicitudes sin avisar",
        "Usar una cuenta anónima para reducir el alcance",
        "Probar solo funcionalidades visibles al público",
        "Usar un objetivo propio o con autorización explícita"
      ],
      "correct": 3,
      "explanation": "La disponibilidad pública no otorga autorización de prueba. Un laboratorio propio permite practicar alcance y técnica de forma controlada.",
      "rubric": "Definir autorización, alcance y un entorno permitido.",
      "lessonId": "fronteras-confianza",
      "legacyOptionOrder": [
        0,
        3,
        1,
        2
      ]
    },
    {
      "id": "governance-1",
      "domain": "governance",
      "question": "Un cambio urgente promete corregir una falla. ¿Qué registro mínimo ayuda a controlarlo?",
      "options": [
        "Solo anotar que el cambio fue urgente",
        "Solo guardar el resultado exitoso final",
        "Motivo, responsable, alcance, validación y reversión",
        "Solo documentar el nombre de quien lo pidió"
      ],
      "correct": 2,
      "explanation": "La urgencia no elimina la necesidad de trazabilidad y reversión. Un registro proporcionado permite validar resultado y recuperar ante fallos.",
      "rubric": "Documentar responsable, impacto, prueba y reversión.",
      "lessonId": "riesgo-cambios",
      "legacyOptionOrder": [
        2,
        0,
        1,
        3
      ]
    },
    {
      "id": "governance-2",
      "domain": "governance",
      "question": "Un riesgo tiene bajo impacto y alta probabilidad. ¿Cómo decidir su tratamiento?",
      "options": [
        "Aceptar siempre los riesgos de bajo impacto",
        "Tratarlo como crítico solo por ser probable",
        "Transferirlo sin definir responsabilidad residual",
        "Según criterios de riesgo y contexto acordados"
      ],
      "correct": 3,
      "explanation": "Las dos dimensiones deben interpretarse con criterios y tolerancia definidos. No hay una acción universal por una etiqueta aislada.",
      "rubric": "Relacionar probabilidad, impacto, tolerancia y responsable.",
      "lessonId": "riesgo-cambios",
      "legacyOptionOrder": [
        0,
        3,
        1,
        2
      ]
    },
    {
      "id": "governance-3",
      "domain": "governance",
      "question": "Un proveedor procesa datos de clientes. ¿Qué debe aclararse antes de compartirlos?",
      "options": [
        "Solo que exista una política genérica publicada",
        "Finalidad, datos necesarios, responsabilidades y controles",
        "Solo que el servicio use una contraseña",
        "Solo que el proveedor tenga muchos clientes"
      ],
      "correct": 1,
      "explanation": "La relación debe definir necesidad, tratamiento y responsabilidades. Compartir menos datos y verificar controles reduce exposición innecesaria.",
      "rubric": "Precisar propósito, minimización y responsabilidades verificables.",
      "lessonId": "fronteras-confianza",
      "legacyOptionOrder": [
        0,
        2,
        1,
        3
      ]
    },
    {
      "id": "governance-4",
      "domain": "governance",
      "question": "Una política exige revisar acceso cada trimestre. ¿Qué evidencia muestra ejecución?",
      "options": [
        "Registro fechado de revisión con decisiones y responsables",
        "Una copia de la política que exige revisar",
        "Un listado de cuentas generado sin decisiones",
        "Una declaración verbal sin fecha ni alcance"
      ],
      "correct": 0,
      "explanation": "Una regla publicada demuestra intención. La ejecución requiere registros de quién revisó, cuándo y qué decisiones se tomaron.",
      "rubric": "Distinguir política, actividad y evidencia verificable.",
      "lessonId": "riesgo-cambios",
      "legacyOptionOrder": [
        1,
        2,
        3,
        0
      ]
    },
    {
      "id": "governance-5",
      "domain": "governance",
      "question": "Un inventario omite un servicio crítico. ¿Qué decisión puede quedar sesgada?",
      "options": [
        "Solo la compra de licencias del inventario visible",
        "Solo el orden de presentación de las alertas",
        "Solo la duración de las reuniones de soporte",
        "Priorizar y asignar protección o recuperación"
      ],
      "correct": 3,
      "explanation": "Sin inventario de activos y dependencias se desconocen impactos y responsables. Ese vacío afecta prevención y continuidad.",
      "rubric": "Vincular activo, dependencia, propietario e impacto.",
      "lessonId": "riesgo-cambios",
      "legacyOptionOrder": [
        3,
        0,
        1,
        2
      ]
    },
    {
      "id": "governance-6",
      "domain": "governance",
      "question": "Una métrica cuenta cursos terminados. ¿Qué no permite concluir por sí sola?",
      "options": [
        "Que se registraron pasos del recorrido",
        "Capacidad de resolver incidentes reales",
        "Que existe actividad en las clases",
        "Que se cumplieron hitos de lectura declarados"
      ],
      "correct": 1,
      "explanation": "Completar contenido mide actividad. La capacidad requiere desempeño observable, evidencia y revisión en escenarios de transferencia.",
      "rubric": "Separar actividad, aprendizaje y desempeño demostrado.",
      "lessonId": "riesgo-cambios",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "response-1",
      "domain": "response",
      "question": "Varios usuarios informan un adjunto sospechoso. ¿Qué registrar al iniciar el caso?",
      "options": [
        "Tiempo, alcance inicial, fuentes e hipótesis",
        "Una causa definitiva antes de corroborar fuentes",
        "Solo el asunto del correo sin referencias",
        "Solo el conteo de reportes sin tiempo ni alcance"
      ],
      "correct": 0,
      "explanation": "El registro inicial permite coordinar y contrastar hipótesis. Debe distinguir hechos observados de interpretaciones y conservar referencias.",
      "rubric": "Registrar tiempo, fuente, alcance y grado de certeza.",
      "lessonId": "windows-eventos",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "response-2",
      "domain": "response",
      "question": "Se contiene una cuenta posiblemente comprometida. ¿Qué verificar después?",
      "options": [
        "Solo que la herramienta informó acción aplicada",
        "Efecto de la contención y alcance residual",
        "Solo que desapareció una alerta del panel",
        "Que todas las sesiones se cerraron sin comprobarlas"
      ],
      "correct": 1,
      "explanation": "Una acción aplicada no demuestra que cesó toda actividad. Se debe comprobar efecto, dependencias y sesiones o vías residuales.",
      "rubric": "Validar resultado y buscar actividad residual con criterio.",
      "lessonId": "fronteras-confianza",
      "legacyOptionOrder": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "id": "response-3",
      "domain": "response",
      "question": "Una línea de tiempo mezcla registros UTC y hora local. ¿Qué hacer?",
      "options": [
        "Ordenarlos por texto y asumir la misma zona",
        "Convertir horas y eliminar los valores originales",
        "Ignorar los eventos con una hora distinta",
        "Normalizar zona y conservar el valor original"
      ],
      "correct": 3,
      "explanation": "Las zonas y desvíos de reloj pueden invertir secuencias aparentes. Conservar originales y registrar conversión permite revisar el análisis.",
      "rubric": "Documentar zona, normalización e incertidumbre temporal.",
      "lessonId": "windows-eventos",
      "legacyOptionOrder": [
        0,
        1,
        3,
        2
      ]
    },
    {
      "id": "response-4",
      "domain": "response",
      "question": "El negocio admite perder hasta una hora de datos. ¿Qué objetivo expresa?",
      "options": [
        "RTO de una hora, porque ambos miden lo mismo",
        "Un tiempo máximo de detección de una hora",
        "RPO de una hora",
        "Un tiempo máximo de investigación de una hora"
      ],
      "correct": 2,
      "explanation": "RPO expresa la pérdida temporal de datos tolerada. RTO se refiere al tiempo objetivo de recuperación del servicio.",
      "rubric": "Diferenciar pérdida de datos y tiempo de recuperación.",
      "lessonId": "recuperacion-rto-rpo",
      "legacyOptionOrder": [
        0,
        1,
        3,
        2
      ]
    },
    {
      "id": "response-5",
      "domain": "response",
      "question": "Una evidencia se copia para analizarla. ¿Qué registro ayuda a rastrearla?",
      "options": [
        "Solo el hash sin registrar procedencia",
        "Solo un nombre de archivo sin historial de copia",
        "Origen, hash, tiempo y responsables de transferencias",
        "Solo el permiso de lectura de la copia"
      ],
      "correct": 2,
      "explanation": "La trazabilidad documenta procedencia y manipulación. El hash aporta integridad pero no reemplaza los registros de adquisición y custodia.",
      "rubric": "Relacionar integridad con procedencia y cadena de transferencias.",
      "lessonId": "fronteras-confianza",
      "legacyOptionOrder": [
        2,
        0,
        1,
        3
      ]
    },
    {
      "id": "response-6",
      "domain": "response",
      "question": "Al cerrar un incidente, ¿qué mejora ayuda a evitar repetición?",
      "options": [
        "Acciones con responsable, plazo y verificación de eficacia",
        "Una lista genérica de consejos sin propietario",
        "Solo el conteo final de eventos del incidente",
        "Cerrar cuando desaparezca la última alerta"
      ],
      "correct": 0,
      "explanation": "Una revisión útil transforma hallazgos en acciones verificables. Sin responsable y comprobación las recomendaciones pueden no producir cambios.",
      "rubric": "Proponer acción verificable, responsable y fecha de seguimiento.",
      "lessonId": "recuperacion-rto-rpo",
      "legacyOptionOrder": [
        1,
        0,
        2,
        3
      ]
    },
    {
      "id": "systems-advanced-1",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "Una VM reserva casi toda la RAM del host y empieza a paginar. ¿Qué cambio contrasta la causa?",
      "options": [
        "Reducir la reserva y comparar con la misma carga",
        "Aumentar la reserva con la misma carga",
        "Reiniciar el guest y variar también la carga",
        "Desactivar la paginación sin medir la presión"
      ],
      "correct": 0,
      "explanation": "Comparar presión de memoria bajo la misma carga permite evaluar sobreasignación. La paginación por sí sola no demuestra actividad maliciosa.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:3.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "systems-advanced-2",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "Un PID reaparece con otra ruta minutos después de terminar. ¿Cómo correlacionás las instancias?",
      "options": [
        "Ruta del ejecutable sin distinguir instancias",
        "PID junto con hora de inicio y contexto",
        "PID y uso de CPU como identificador estable",
        "Nombre de proceso sin hora de creación"
      ],
      "correct": 1,
      "explanation": "Los PID se reutilizan. La hora de creación y el contexto permiten distinguir procesos y evitan atribuir acciones al ejecutable anterior.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:3.2",
        "btl1:4.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "systems-advanced-3",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "Un servicio sigue activo al cerrar la terminal. ¿Qué lo explica?",
      "options": [
        "El cierre de sesión convierte el proceso en kernel",
        "La cuenta del servicio evita todo control de permisos",
        "Su ciclo de vida lo administra el gestor de servicios",
        "La shell conserva siempre los procesos hijos"
      ],
      "correct": 2,
      "explanation": "El servicio puede tener un ciclo independiente de la terminal. Eso no elimina su cuenta de ejecución ni los controles que limitan sus acciones.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:3.1"
      ],
      "introducedIn": 3
    },
    {
      "id": "systems-advanced-4",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "Dos hilos actualizan un contador y el total varía. ¿Qué hipótesis probás?",
      "options": [
        "Un contador compartido se actualiza de forma atómica",
        "Un hilo conserva una copia privada que nunca se combina",
        "El planificador garantiza el mismo orden en cada ejecución",
        "Una carrera en lectura y escritura compartidas"
      ],
      "correct": 3,
      "explanation": "La operación leer-modificar-escribir puede intercalarse y perder incrementos. Repetir con sincronización permite contrastar la hipótesis con una entrada equivalente.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:3.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "systems-advanced-5",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "El disco se llena durante una captura. ¿Qué afirmación es sostenible?",
      "options": [
        "La captura puede estar incompleta",
        "El hash del archivo demuestra una captura completa",
        "El tamaño reservado garantiza que se guardaron los datos",
        "El reinicio reconstruye las páginas que no se escribieron"
      ],
      "correct": 0,
      "explanation": "La escritura fallida limita la completitud de la evidencia. Registrar error y ventana afectada evita inventar datos y permite evaluar qué observaciones siguen siendo utilizables.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "systems-advanced-6",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "Vas a restaurar un snapshot anterior a un informe. ¿Qué preservás antes?",
      "options": [
        "Una copia del informe en el disco que vas a restaurar",
        "Copia verificada del informe fuera del estado restaurado",
        "Un acceso directo dentro del guest al mismo informe",
        "El nombre del snapshot como prueba de inclusión"
      ],
      "correct": 1,
      "explanation": "Restaurar puede eliminar el trabajo posterior al snapshot. Una copia externa verificada y su registro conservan el informe sin afirmar que estaba incluido en el estado anterior.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:2.2",
        "security-plus-701:1.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "systems-advanced-7",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "Un contenedor comparte kernel con el host. ¿Qué implica?",
      "options": [
        "Compartir kernel elimina la necesidad de limitar privilegios",
        "Los límites de memoria impiden acceder a cualquier montaje",
        "Su aislamiento depende del kernel compartido",
        "Cada contenedor arranca un kernel independiente"
      ],
      "correct": 2,
      "explanation": "Namespaces y límites aíslan recursos sin crear otro kernel. Montajes y privilegios otorgados siguen definiendo una parte importante de su superficie de exposición.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:3.1"
      ],
      "introducedIn": 3
    },
    {
      "id": "systems-advanced-8",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "Una app bloqueada tiene poca CPU y alta espera de disco. ¿Qué investigás?",
      "options": [
        "Saturación de CPU como única explicación del bloqueo",
        "Velocidad de red sin comprobar la espera de almacenamiento",
        "Prioridad del proceso sin observar sus operaciones de E/S",
        "E/S y estado de espera"
      ],
      "correct": 3,
      "explanation": "CPU baja no significa funcionamiento correcto. El proceso puede esperar E/S o un bloqueo; métricas de espera orientan una prueba antes de terminarlo y perder contexto.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:3.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "systems-advanced-9",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "Dos fuentes parecen invertir su secuencia al cambiar zona horaria. ¿Qué conservás?",
      "options": [
        "Hora original, offset y conversión aplicada",
        "Solo la hora convertida, sobrescribiendo el dato original",
        "Orden de líneas como secuencia global entre las fuentes",
        "La hora del analista aplicada a todos los eventos"
      ],
      "correct": 0,
      "explanation": "La normalización temporal debe poder volver al dato original. Conservar offset y criterio impide convertir una diferencia de representación en una cronología falsa.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:5.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "systems-advanced-10",
      "domain": "systems",
      "lessonId": "kernel-shell",
      "question": "Una utilidad se ejecuta desde la carpeta personal sin elevación. ¿Qué concluís?",
      "options": [
        "La ejecución confirma una instalación para todos los usuarios",
        "La ejecución no siempre exige instalación de sistema",
        "La ausencia de elevación impide crear procesos hijos",
        "La ruta personal acredita que el binario es confiable"
      ],
      "correct": 1,
      "explanation": "La ejecución por usuario es posible sin elevación. La ubicación no acredita confianza; deben contrastarse procedencia y comportamiento antes de clasificar la utilidad.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:3.1"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-1",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "Ana lee localmente un archivo pero no por el recurso compartido. ¿Qué revisás?",
      "options": [
        "Solo permisos del recurso sin comprobar identidad efectiva",
        "Solo pertenencia a grupos sin revisar permisos del objeto",
        "Permisos efectivos de recurso compartido y NTFS",
        "Solo permisos NTFS bajo la cuenta del administrador"
      ],
      "correct": 2,
      "explanation": "El acceso de red atraviesa controles distintos. Permitir lectura local no demuestra que la misma identidad esté autorizada por el recurso compartido.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:3.2",
        "ccst-course:3.1"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-2",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "Se quitó una cuenta de un grupo pero una sesión conserva acceso. ¿Qué prueba falta?",
      "options": [
        "Releer la membresía sin renovar la sesión existente",
        "Renombrar el grupo manteniendo el token de la sesión",
        "Probar desde la misma sesión como administrador",
        "Repetir con un token nuevo"
      ],
      "correct": 3,
      "explanation": "Un token existente puede conservar pertenencias anteriores. Comparar sesiones y registrar el contexto permite evaluar la revocación sin confundir un token viejo con el nuevo estado.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:3.1",
        "security-plus-701:4.6"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-3",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "Un 4624 registra login correcto. ¿Qué falta para afirmar lectura de un archivo?",
      "options": [
        "Evidencia del objeto y la operación vinculada a la sesión",
        "Un segundo inicio de sesión exitoso de la misma cuenta",
        "La pertenencia del usuario al grupo con permiso de lectura",
        "Que el archivo exista en el equipo donde se autenticó"
      ],
      "correct": 0,
      "explanation": "Autenticar una identidad no prueba una operación concreta sobre un objeto. Vincular sesión, archivo y acción permite sostener la afirmación de acceso.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.4",
        "ccst-course:3.5"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-4",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "Un servicio usa privilegios de dominio solo para escribir una carpeta local. ¿Qué evaluás?",
      "options": [
        "Permitir escritura a todos para quitar la dependencia de cuenta",
        "Cuenta dedicada con permiso local mínimo",
        "Conservar administrador de dominio por ser un servicio",
        "Usar una cuenta personal con permiso local de administrador"
      ],
      "correct": 1,
      "explanation": "El permiso debe responder a una necesidad comprobada. Una identidad acotada reduce el alcance de un compromiso y exige una prueba funcional antes de cambiar producción.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:3.2",
        "security-plus-701:4.6"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-5",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "Una ACL heredada expone un archivo sensible. ¿Qué verifica la corrección?",
      "options": [
        "Abrir el archivo como administrador después del cambio",
        "Quitar una regla explícita sin revisar permisos heredados",
        "Pruebas permitida y denegada bajo identidades ficticias",
        "Ver que cambió una fila en el editor de permisos"
      ],
      "correct": 2,
      "explanation": "La configuración visible no basta para verificar resultado efectivo. Las dos pruebas comprueban que se conserva acceso autorizado y se rechaza el no permitido.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:3.2",
        "ccst-course:3.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-6",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "Un binario firmado aparece en una ruta extraña. ¿Qué aporta la firma?",
      "options": [
        "Que toda ejecución del binario está autorizada",
        "Que el programa no puede usarse con fines maliciosos",
        "Que el archivo nunca tuvo ninguna versión anterior",
        "Integridad y firmante según su validación"
      ],
      "correct": 3,
      "explanation": "Una firma válida aporta procedencia e integridad, pero una herramienta legítima puede usarse de forma abusiva. Ruta, argumentos y árbol de procesos aportan contexto adicional.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:1.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-7",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "La auditoría de objetos estaba desactivada. ¿Qué dice la ausencia de eventos?",
      "options": [
        "No permite afirmar que nadie accedió",
        "Que todos los intentos de acceso fueron denegados",
        "Que los eventos ausentes se borraron intencionalmente",
        "Que autenticarse era suficiente para generar esa auditoría"
      ],
      "correct": 0,
      "explanation": "Sin un control que registre la operación, la ausencia de eventos no prueba ausencia de acceso. La cobertura de auditoría debe quedar documentada en las limitaciones.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:3.5",
        "btl1:4.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-8",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "Una tarea corre tras cerrar la sesión de su creador. ¿Qué investigás?",
      "options": [
        "Solo la fecha del ejecutable sin revisar la acción configurada",
        "Identidad, desencadenador, acción y nivel de ejecución",
        "Solo la identidad de quien creó la tarea",
        "Solo la última sesión interactiva del equipo"
      ],
      "correct": 1,
      "explanation": "La cuenta de ejecución puede ser distinta del creador interactivo. El riesgo depende de la acción y del contexto configurado, no de que la ventana original siga abierta.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.4",
        "ccst-course:3.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-9",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "Un parche cambia el comportamiento de un servicio. ¿Qué facilita una reversión controlada?",
      "options": [
        "Un snapshot sin verificar su fecha ni los discos incluidos",
        "Reinstalar sin conservar la configuración previa del servicio",
        "Versión, configuración y prueba de salud previas",
        "Solo el número del parche y el nombre del servicio"
      ],
      "correct": 2,
      "explanation": "La reversión necesita una línea de base y un criterio verificable de éxito. Registrar versión y pruebas ayuda a separar el efecto del parche de cambios concurrentes.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:1.3",
        "cc:5.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "windows-advanced-10",
      "domain": "windows",
      "lessonId": "windows-objetos-procesos",
      "question": "Una persona rechaza un MFA inesperado. ¿Qué hacés primero?",
      "options": [
        "Confirmar intrusión solamente por el pedido de MFA",
        "Desactivar MFA para evitar que se repita la alerta",
        "Cerrar la investigación porque la persona rechazó el pedido",
        "Investigar intentos y sesiones asociadas"
      ],
      "correct": 3,
      "explanation": "Un pedido inesperado es un indicio y no una intrusión confirmada. Revisar autenticaciones y sesiones permite determinar alcance y adoptar una respuesta proporcional.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:2.4",
        "security-plus-701:4.6"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-1",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "Un archivo 644 no puede leerse desde un servicio. ¿Qué falta comprobar?",
      "options": [
        "Recorrido de directorios padres y cuenta efectiva",
        "Solo el modo del archivo sin comprobar los directorios",
        "Solo el propietario del archivo sin revisar la cuenta del servicio",
        "La extensión del archivo como control de lectura de Linux"
      ],
      "correct": 0,
      "explanation": "Para leer se necesita atravesar todos los directorios de la ruta. El modo aislado del archivo no describe todos los permisos ni controles que afectan al proceso.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.5",
        "cc:3.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-2",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "El usuario de un servicio puede escribir su configuración. ¿Qué riesgo evaluás?",
      "options": [
        "Que el archivo solo se puede cambiar durante una actualización",
        "Alteración persistente tras comprometer el servicio",
        "Que ejecutar sin root vuelve inocua cualquier configuración",
        "Que permitir escritura asegura la integridad del próximo arranque"
      ],
      "correct": 1,
      "explanation": "La identidad operativa no siempre debe modificar la configuración que cargará en el siguiente arranque. Separar escritura administrativa y lectura operativa limita cambios no autorizados.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.5",
        "security-plus-701:4.1"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-3",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "Una unidad funciona como root y falla con su usuario dedicado. ¿Qué hacés?",
      "options": [
        "Aplicar permisos globales de lectura y escritura al árbol",
        "Cambiar todos los archivos al propietario del servicio",
        "Identificar recurso requerido y conceder acceso mínimo",
        "Mantener root porque la prueba funcional ya pasó"
      ],
      "correct": 2,
      "explanation": "Root puede ocultar restricciones que afectan a una cuenta dedicada. Identificar el recurso preciso permite corregir permisos y validar función sin ampliar privilegios innecesarios.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:3.2",
        "btl1:4.5"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-4",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "Un enlace simbólico apunta fuera del directorio autorizado. ¿Qué definís antes de recopilar?",
      "options": [
        "Que autorizar el directorio autoriza cualquier destino del enlace",
        "Que copiar el enlace conserva automáticamente los bytes del destino",
        "Que resolver el enlace no cambia el alcance de la recopilación",
        "Si se copia el enlace o el destino y el alcance permitido"
      ],
      "correct": 3,
      "explanation": "Seguir enlaces puede ampliar el alcance y capturar datos no autorizados. La recolección debe declarar cómo trata enlaces y conservar la distinción entre nombre y destino.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.3",
        "btl1:4.5"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-5",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "Un log es local y otro UTC. ¿Cómo correlacionás un SSH con un cambio de archivo?",
      "options": [
        "Zona, normalización y tolerancia de reloj",
        "Orden de líneas entre ambos archivos como reloj común",
        "Solo hora de recepción del índice descartando la original",
        "Mismo texto de hora como prueba de simultaneidad"
      ],
      "correct": 0,
      "explanation": "Las fuentes pueden representar el mismo instante de forma distinta o tener relojes desviados. Conservar originales y margen temporal evita una atribución más precisa que la evidencia.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.5",
        "btl1:5.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-6",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "Un cron invoca un programa sin ruta absoluta. ¿Qué revisás?",
      "options": [
        "Solo nombre del programa asumiendo la misma resolución en cron",
        "PATH y directorios escribibles que influyen en resolución",
        "Solo propietario del crontab sin revisar el entorno",
        "Solo permisos del programa que encontrás en tu shell actual"
      ],
      "correct": 1,
      "explanation": "El entorno decide qué ejecutable resuelve un nombre. Un directorio modificable dentro de la búsqueda puede alterar la acción; revisar solo el texto del script no cubre esa dependencia.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.5",
        "security-plus-701:4.1"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-7",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "Se borra un log pero el proceso mantiene el descriptor. ¿Qué explica espacio ocupado?",
      "options": [
        "Que el archivo no tenía contenido porque ya no se lista",
        "Que solo los archivos visibles pueden consumir almacenamiento",
        "Bloques retenidos mientras exista una referencia abierta",
        "Que desvincular el nombre libera inmediatamente sus bloques"
      ],
      "correct": 2,
      "explanation": "Desvincular un nombre no libera necesariamente los datos aún abiertos. Revisar descriptores y rotación permite explicar uso de espacio sin atribuir ocultamiento automáticamente.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.5",
        "ccst-course:3.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-8",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "Una clave SSH de un exintegrante sigue autorizada. ¿Qué completa la baja?",
      "options": [
        "Cambiar solo la contraseña conservando las claves autorizadas",
        "Renombrar la cuenta sin revisar sus credenciales de acceso",
        "Quitar el comentario de la clave sin revocar la autorización",
        "Retirar la clave y revisar sesiones y otras credenciales"
      ],
      "correct": 3,
      "explanation": "Cambiar un nombre visible no invalida la clave. La baja debe revocar medios de autenticación y revisar sesiones o mecanismos que puedan conservar acceso.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:3.1",
        "security-plus-701:4.6"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-9",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "Un cambio de firewall corta el servicio de prueba. ¿Qué prueba atribuye el efecto?",
      "options": [
        "Flujo controlado antes/después con reversión documentada",
        "Reiniciar todo y comprobar únicamente que vuelve a responder",
        "Abrir todos los puertos y atribuir el corte a la última regla",
        "Cambiar origen y servicio en la prueba posterior sin registrarlo"
      ],
      "correct": 0,
      "explanation": "La comparación debe conservar origen, destino, protocolo y estado. Una reversión definida permite recuperar servicio sin perder la evidencia del efecto de la regla.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:1.3",
        "security-plus-701:4.5"
      ],
      "introducedIn": 3
    },
    {
      "id": "linux-advanced-10",
      "domain": "linux",
      "lessonId": "linux-archivos-permisos",
      "question": "Auditd registra un comando ausente del historial de shell. ¿Qué interpretación es prudente?",
      "options": [
        "Que la ausencia en history acredita que se ejecutó como root",
        "El historial puede ser incompleto y requiere contraste",
        "Que auditd es inválido si el comando no figura en history",
        "Que el historial de shell registra toda ejecución del sistema"
      ],
      "correct": 1,
      "explanation": "El historial depende del shell y puede no persistirse. La discrepancia exige revisar identidad, hora y mecanismo de ejecución, sin descartar una fuente por no coincidir con otra.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:3.5",
        "btl1:4.5"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-1",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "10.77.10.10/24 busca 10.77.20.20/24 sin gateway. ¿Qué falta para la ruta normal?",
      "options": [
        "Cambiar solo el prefijo de la estación para considerar local al servidor",
        "Una entrada ARP del servidor aunque está en otra subred",
        "Siguiente salto alcanzable y reenvío autorizado",
        "Un registro DNS aunque ya se conoce la IP de destino"
      ],
      "correct": 2,
      "explanation": "El destino está fuera de la subred. La ruta necesita un siguiente salto y este debe reenviar el tráfico; DNS no sustituye esa conectividad de red.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:4.1",
        "ccst-course:2.2",
        "ejpt:3.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-2",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "Ping responde y HTTPS falla. ¿Qué concluís?",
      "options": [
        "Que responder ICMP acredita el servicio HTTPS",
        "Que la falla confirma un certificado no confiable",
        "Que la falla de HTTPS demuestra que no hay ruta IP",
        "ICMP responde y falta comprobar TCP, TLS y aplicación"
      ],
      "correct": 3,
      "explanation": "La respuesta ICMP demuestra solo ese intercambio. TCP, negociación TLS y respuesta de aplicación son capas distintas y deben comprobarse para localizar la falla.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:2.1",
        "ejpt:1.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-3",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "Ves SYN repetidos sin SYN-ACK. ¿Qué causa sigue abierta?",
      "options": [
        "Filtrado, pérdida o destino sin respuesta",
        "Un rechazo de contraseña en la aplicación ya autenticada",
        "Una transferencia completa cuya respuesta fue omitida",
        "Una negociación TCP terminada que solo espera credenciales"
      ],
      "correct": 0,
      "explanation": "Una ausencia de respuesta visible admite varias causas y también una captura incompleta. La ubicación de captura y observaciones del destino ayudan a distinguirlas.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:2.1",
        "ejpt:1.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-4",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "La política permite estación a servidor solo TCP/443. ¿Qué prueba negativa sirve?",
      "options": [
        "Probar otro puerto desde otra red y atribuirlo a esa política",
        "Puerto no autorizado con el mismo origen y ruta",
        "Probar únicamente 443 desde una interfaz del router",
        "Leer la regla sin generar el flujo que debe rechazarse"
      ],
      "correct": 1,
      "explanation": "La validación necesita un flujo permitido y otro que deba rechazarse. Mantener origen y recorrido permite relacionar el resultado con la política que se pretende probar.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:4.2",
        "security-plus-701:4.5"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-5",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "DNS resuelve la IP esperada pero TLS presenta otro nombre. ¿Qué investigás?",
      "options": [
        "Solo si responde ICMP para decidir que el certificado es correcto",
        "La cuenta local del cliente como causa del nombre del certificado",
        "Identidad TLS y destino efectivo",
        "Solo el registro DNS como prueba de identidad del servidor"
      ],
      "correct": 2,
      "explanation": "Resolver un nombre no autentica al servidor. El certificado y el destino pueden señalar configuración errónea o intermediación, y necesitan contexto antes de atribuir una causa.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:4.1",
        "security-plus-701:1.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-6",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "Varios clientes usan una salida NAT. ¿Qué ayuda a investigar una conexión?",
      "options": [
        "Solo IP pública como identificador estable del usuario interno",
        "Solo hostname del router sin ventana temporal ni puertos",
        "Solo puerto del servidor sin el registro de la traducción",
        "Hora, puertos y registros de traducción"
      ],
      "correct": 3,
      "explanation": "La IP pública compartida no identifica al cliente interno. La traducción de puertos en una ventana precisa permite una atribución técnica limitada y trazable.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:2.2",
        "btl1:5.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-7",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "Querés separar dominios de difusión en un switch. ¿Qué control corresponde?",
      "options": [
        "VLAN y enrutamiento intersegmento controlado",
        "Asignar nombres distintos sin cambiar las VLAN de los puertos",
        "Crear dos subredes IP sobre la misma VLAN de difusión",
        "Cambiar solo DNS manteniendo el mismo dominio de capa dos"
      ],
      "correct": 0,
      "explanation": "La VLAN separa dominios de difusión de capa dos. La comunicación entre segmentos requiere controlar el enrutamiento; el nombre del equipo no crea ese aislamiento.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:4.2",
        "ccst-course:2.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-8",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "El túnel llega al salto pero no al servidor interno. ¿Qué demuestra pivoting completo?",
      "options": [
        "Que el cliente del túnel esté instalado y en ejecución",
        "Flujo de aplicación desde origen hasta destino verificado",
        "Una sesión autenticada únicamente en el salto",
        "Que el salto pueda llegar al servidor por su propia interfaz"
      ],
      "correct": 1,
      "explanation": "Llegar al salto es solo una etapa. La ruta completa necesita demostrar reenvío, reglas y acceso al servicio destino, indicando dónde se originó cada conexión.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ejpt:3.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-9",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "Una regla stateful acepta respuestas de B a A. ¿Qué no demuestra?",
      "options": [
        "Que la regla puede distinguir estado dentro de esa sesión",
        "Que la respuesta observada tuvo un flujo previo permitido",
        "Que B pueda iniciar conexiones nuevas hacia A",
        "Que el retorno observado pertenece a la sesión permitida"
      ],
      "correct": 2,
      "explanation": "El tráfico de retorno asociado no tiene la misma política que una conexión nueva en sentido inverso. Son pruebas distintas para evaluar la frontera entre segmentos.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:4.2",
        "security-plus-701:4.5"
      ],
      "introducedIn": 3
    },
    {
      "id": "networks-advanced-10",
      "domain": "networks",
      "lessonId": "capas-subredes-rutas",
      "question": "Un servicio escucha solo en loopback de la VM. ¿Por qué otra VM no conecta aunque haya ruta?",
      "options": [
        "Que una ruta entre VMs cambia automáticamente el bind del socket",
        "Que resolver el nombre hace que loopback sea alcanzable desde otra VM",
        "Que escuchar en 127.0.0.1 equivale a escuchar en todas las interfaces",
        "El socket no escucha en la interfaz de red"
      ],
      "correct": 3,
      "explanation": "La dirección de escucha determina dónde recibe conexiones el servicio. Tener ruta y firewall permitido no vuelve accesible por la red un socket enlazado únicamente a loopback.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ccst-course:2.2",
        "ejpt:1.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-1",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "Una unión de logs solo por usuario crea cientos de pares. ¿Qué mejora la correlación?",
      "options": [
        "Sesión y ventana temporal justificadas",
        "Quitar pares hasta obtener un único evento por usuario",
        "Agregar el nombre del equipo sin acotar la ventana temporal",
        "Tratar cada combinación de filas como una relación causal"
      ],
      "correct": 0,
      "explanation": "Una unión amplia crea coincidencias sin causalidad. Una clave contextual y una ventana justificadas reducen falsos pares y explicitan qué relación se está investigando.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:5.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-2",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "DISTINCT oculta eventos repetidos. ¿Qué podrías perder?",
      "options": [
        "La procedencia del archivo aunque se conserve como columna",
        "Frecuencia relevante de acciones",
        "La zona horaria almacenada en cada valor no duplicado",
        "Los permisos originales de la cuenta que ejecutó el evento"
      ],
      "correct": 1,
      "explanation": "Los duplicados pueden ser ingesta repetida o acciones reales. Debe definirse identidad de evento antes de colapsarlos y conservar la muestra original para revisar el criterio.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:5.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-3",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "La copia no coincide con el SHA256 del manifiesto. ¿Qué hacés?",
      "options": [
        "Continuar tratándola como idéntica si conserva el nombre",
        "Afirmar presencia de malware por cualquier diferencia de hash",
        "Verificar origen, transferencia y algoritmo antes de afirmar integridad",
        "Editar el manifiesto para que coincida con la copia"
      ],
      "correct": 2,
      "explanation": "El desajuste prueba falta de coincidencia con la referencia, no explica su causa. Se necesita revisar bytes, algoritmo y procedencia antes de usar la copia como evidencia íntegra.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.2",
        "security-plus-701:1.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-4",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "NOT IN devuelve menos filas con una columna nullable. ¿Qué revisás?",
      "options": [
        "Si NULL se compara igual que una cadena vacía",
        "Si ordenar la subconsulta elimina valores desconocidos",
        "Si duplicados en la subconsulta explican por sí solos el efecto",
        "Semántica de NULL y condición de ausencia"
      ],
      "correct": 3,
      "explanation": "NULL representa un valor desconocido y afecta la lógica SQL. Los valores ausentes requieren tratamiento explícito para que la búsqueda no descarte registros de manera inesperada.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:4.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-5",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "Se cumple RTO pero se pierden tres horas con RPO de una hora. ¿Qué falló?",
      "options": [
        "El objetivo de pérdida de datos",
        "El tiempo de recuperación aunque se cumplió el RTO",
        "Solo el objetivo de disponibilidad del hardware",
        "Ningún objetivo porque el servicio volvió dentro del plazo"
      ],
      "correct": 0,
      "explanation": "Tiempo de recuperación y pérdida aceptable de datos son objetivos distintos. Volver a operar rápido no demuestra que la antigüedad de lo recuperado cumpla el RPO.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:2.2",
        "security-plus-701:3.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-6",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "Un CSV no confiable tiene una celda que empieza con =. ¿Qué riesgo revisás al abrirlo en planilla?",
      "options": [
        "Que el hash del archivo impide evaluar fórmulas al abrirlo",
        "Interpretación de datos como fórmula",
        "Ejecución SQL directa en el servidor solo por leer el CSV",
        "Protección automática por tratarse de una extensión de texto"
      ],
      "correct": 1,
      "explanation": "El consumidor puede interpretar texto como una fórmula. Preparar una exportación segura requiere conservar el valor original y evitar que se convierta en acción al abrirse.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:2.3",
        "cc:5.1"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-7",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "El paquete docente incluye correos reales innecesarios. ¿Qué hacés antes de compartir?",
      "options": [
        "Cifrar el paquete y compartir la clave con todos los destinatarios",
        "Quitar la columna de nombre pero conservar identificadores directos",
        "Minimizar o anonimizar verificando utilidad",
        "Cambiar solo el nombre del paquete antes de publicarlo"
      ],
      "correct": 2,
      "explanation": "Cifrar protege acceso pero no justifica recolectar o compartir datos de más. Minimizar identificadores y revisar el resultado reduce exposición conservando lo necesario para el análisis.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:5.1",
        "security-plus-701:3.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-8",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "Reintentar una ingesta interrumpida duplica eventos. ¿Qué propiedad falta?",
      "options": [
        "Un timestamp nuevo para cada reintento sin clave de origen",
        "Ordenar por fecha sin identificar eventos ya importados",
        "Más concurrencia de ingesta sin una regla de deduplicación",
        "Identidad estable e idempotencia"
      ],
      "correct": 3,
      "explanation": "El reintento debe reconocer lo aceptado o confirmar el lote atómicamente. Una clave estable evita inflar conteos y producir alertas falsas por duplicación de registros.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:5.2",
        "security-plus-701:4.7"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-9",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "Se confirma el incidente pero falla su auditoría en otra escritura. ¿Qué riesgo aparece?",
      "options": [
        "Estado de negocio sin trazabilidad coherente",
        "Que el incidente deja de existir porque falló su registro de auditoría",
        "Que las dos escrituras independientes son atómicas por usar JSON",
        "Que el índice reconstruye automáticamente el dato nunca guardado"
      ],
      "correct": 0,
      "explanation": "La confirmación debe incluir la trazabilidad requerida o una entrega fiable. Separar escrituras sin control puede dejar cambios cuyo autor y motivo no pueden reconstruirse.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:1.1",
        "security-plus-701:4.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "data-advanced-10",
      "domain": "data",
      "lessonId": "sql-consultas",
      "question": "El log rota y la búsqueda solo lee el actual. ¿Qué límite declarás?",
      "options": [
        "Que el archivo actual representa toda la retención configurada",
        "Eventos rotados fuera de la consulta",
        "Que todos los eventos anteriores dejaron de existir",
        "Que no hubo actividad en períodos anteriores al archivo actual"
      ],
      "correct": 1,
      "explanation": "El resultado depende de los archivos y la retención incluidos. Registrar cobertura temporal evita presentar una muestra parcial como una investigación de toda la actividad.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:5.2",
        "cc:5.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-1",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "La API oculta borrar a lectores pero acepta su solicitud directa. ¿Qué falta?",
      "options": [
        "Ocultar la URL de borrado en el código del cliente",
        "Exigir una contraseña más larga sin cambiar autorización",
        "Autorización del servidor sobre recurso y acción",
        "Cambiar solo la visibilidad del botón según el rol"
      ],
      "correct": 2,
      "explanation": "La interfaz no es una frontera de autorización. El servidor debe evaluar identidad, operación y recurso y rechazar solicitudes directas que carecen de permiso.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ejpt:4.1",
        "cc:3.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-2",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "Se repite un nonce con una clave en un modo que exige unicidad. ¿Qué se incumple?",
      "options": [
        "La política de vencimiento de las contraseñas del usuario",
        "La validación de permisos del archivo que guarda el ciphertext",
        "La prueba de identidad del servidor por su nombre DNS",
        "Un requisito de seguridad del esquema"
      ],
      "correct": 3,
      "explanation": "Algunos modos dependen de no reutilizar nonce bajo una clave. Una clave larga no conserva las garantías criptográficas cuando se viola esa condición de uso.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:1.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-3",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "Un servicio valida firma JWT pero no audiencia. ¿Qué riesgo queda?",
      "options": [
        "Aceptar token emitido para otro servicio",
        "Que validar firma vuelve innecesario limitar el servicio destinatario",
        "Que verificar audiencia reemplaza siempre la firma del token",
        "Que una firma válida revela directamente la clave privada"
      ],
      "correct": 0,
      "explanation": "La firma acredita al emisor dentro de su validación. La audiencia delimita dónde se acepta el token; criptografía sin ese contexto no completa la decisión de acceso.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ejpt:4.1",
        "security-plus-701:4.6"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-4",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "Soporte necesita leer tickets durante una guardia. ¿Qué permiso elegís?",
      "options": [
        "Usar la cuenta compartida del equipo durante la guardia",
        "Lectura temporal de asignados con vencimiento",
        "Administración permanente del sistema de tickets",
        "Lectura de todos los tickets sin fecha de vencimiento"
      ],
      "correct": 1,
      "explanation": "El privilegio mínimo incluye acción, recurso y tiempo necesarios. Una concesión temporal con revisión reduce acceso sobrante y permite comprobar revocación al terminar la guardia.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:3.2",
        "security-plus-701:4.6"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-5",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "Una caché muestra a B contenido privado de A. ¿Qué prueba confirma el problema?",
      "options": [
        "Que esté habilitada la caché sin revisar contenido privado",
        "Que el transporte use HTTPS para los dos usuarios",
        "Comparación bajo sesiones distintas y condiciones equivalentes",
        "Que el mismo título público aparezca para ambas identidades"
      ],
      "correct": 2,
      "explanation": "La similitud de contenido público no prueba fuga. Se requiere información privada y control de identidades para demostrar que el contexto de caché mezcla respuestas de usuarios.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ejpt:4.1",
        "security-plus-701:2.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-6",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "El backup restaurado conserva la contraseña comprometida. ¿Qué falta?",
      "options": [
        "Dar por contenida la cuenta al recuperar la aplicación",
        "Renombrar el usuario conservando contraseñas y sesiones",
        "Restaurar otra copia con la misma credencial comprometida",
        "Revocar credenciales y sesiones además de recuperar datos"
      ],
      "correct": 3,
      "explanation": "Recuperar datos no revoca el acceso de quien conoce una credencial. La recuperación debe revisar identidades, sesiones y causa de ingreso antes de declarar operación normal.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:6.5",
        "security-plus-701:4.8"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-7",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "Un escáner alerta por versión y el proveedor afirma backport. ¿Qué verificás?",
      "options": [
        "Estado del parche y exposición con evidencia del activo",
        "Cambiar el banner para que el escáner deje de alertar",
        "Descartar toda alerta futura del producto por ese backport",
        "Confirmar explotación solo por el número de versión público"
      ],
      "correct": 0,
      "explanation": "La versión visible puede no reflejar parches retroportados. Avisos, inventario y configuración deben contrastarse para evaluar exposición sin confiar solo en el número mostrado.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:5.5",
        "security-plus-701:4.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-8",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "Un enlace de recuperación funciona dos veces. ¿Qué propiedad comprobás?",
      "options": [
        "Que una firma válida reemplace la comprobación de consumo",
        "Uso único, vencimiento y vínculo a cuenta y acción",
        "Que el enlace sea corto y no incluya el nombre de usuario",
        "Que HTTPS permita reutilizar el enlace indefinidamente"
      ],
      "correct": 1,
      "explanation": "El enlace es una credencial temporal para una operación sensible. Su reutilización amplía la ventana de abuso y debe probarse de forma acotada con cuentas ficticias propias.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "ejpt:4.1",
        "security-plus-701:4.6"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-9",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "La app registra tokens completos para depuración. ¿Qué cambio sirve?",
      "options": [
        "Mover los tokens a otro archivo con la misma retención",
        "Desactivar todo registro sin conservar datos de correlación",
        "Redacción de secretos e ID de correlación no autenticante",
        "Cifrar el transporte pero conservar tokens completos en el log"
      ],
      "correct": 2,
      "explanation": "El registro requiere contexto pero no credenciales reutilizables. Redactar tokens y usar identificadores de correlación conserva capacidad de investigación sin convertir el log en una fuente de acceso.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:5.1",
        "security-plus-701:4.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "security-advanced-10",
      "domain": "security",
      "lessonId": "fronteras-confianza",
      "question": "Una automatización bloquea cada alerta y corta clientes legítimos. ¿Qué evaluás?",
      "options": [
        "Aplicar la misma contención a toda alerta sin contexto",
        "Usar solo severidad del proveedor como autorización permanente",
        "Medir éxito por cantidad bloqueada sin revisar impacto legítimo",
        "Contexto, falsos positivos, supervisión y reversión"
      ],
      "correct": 3,
      "explanation": "La automatización necesita límites y pruebas de impacto. Un indicador puede ser benigno; supervisión y reversión evitan que una detección incierta cause una interrupción desproporcionada.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:4.7",
        "cc:5.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-1",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "Se acepta un riesgo por costo de mitigación. ¿Qué documentás?",
      "options": [
        "Autoridad, impacto, plazo y revisión",
        "La decisión informal sin responsable ni fecha de revisión",
        "Que aceptar equivale a eliminar el escenario de riesgo",
        "Solo el costo de la herramienta que se decidió no comprar"
      ],
      "correct": 0,
      "explanation": "Aceptar no elimina el riesgo. La decisión requiere un responsable autorizado, alcance y revisión para que el riesgo residual no quede oculto ni sea una excepción indefinida.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:1.2",
        "security-plus-701:5.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-2",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "Un proveedor cifra pero retiene claves y copias indefinidamente. ¿Qué preguntás?",
      "options": [
        "Solo disponibilidad del portal como prueba de protección de datos",
        "Control de claves, acceso, retención y eliminación",
        "Solo el algoritmo de cifrado sin ciclo de vida de las copias",
        "Solo la certificación del proveedor sin alcance del servicio"
      ],
      "correct": 1,
      "explanation": "Cifrado por sí solo no describe responsabilidades ni ciclo de vida. Claves y retención afectan exposición y deben contrastarse con condiciones y evidencias verificables del servicio.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:5.3",
        "cc:5.1"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-3",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "Premiar cierres de tickets genera casos cerrados sin resolver. ¿Qué medís además?",
      "options": [
        "Excluir de la métrica los casos que vuelven a abrirse",
        "Medir únicamente la reducción del backlog visible",
        "Calidad y recurrencia con revisión de muestra",
        "Solo aumentar la meta de tickets cerrados por día"
      ],
      "correct": 2,
      "explanation": "Una métrica puede incentivar un resultado aparente. Combinar eficiencia con calidad de resolución y recurrencia conserva visibilidad del trabajo real y permite detectar efectos adversos.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:2.4",
        "security-plus-701:5.5"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-4",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "Un servidor crítico no tiene propietario en inventario. ¿Qué afecta?",
      "options": [
        "Solo la forma de mostrar el servidor en el catálogo",
        "Solo el etiquetado físico sin impacto en decisiones de acceso",
        "Solo el orden de aparición del activo en un reporte",
        "Responsabilidad de parches, acceso y recuperación"
      ],
      "correct": 3,
      "explanation": "La propiedad operativa permite decidir y validar controles. Sin responsable definido, tareas necesarias pueden quedar sin ejecutar aunque el activo figure técnicamente en el inventario.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:5.4",
        "security-plus-701:4.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-5",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "Te piden probar un dominio relacionado pero fuera del alcance. ¿Cómo seguís?",
      "options": [
        "Obtener ampliación explícita antes de actuar",
        "Suponer que el parecido del dominio amplía el permiso",
        "Incluirlo si la técnica no requiere autenticación",
        "Probarlo y pedir la ampliación después si hay hallazgos"
      ],
      "correct": 0,
      "explanation": "La relación aparente con el cliente no concede autorización. La ampliación debe definir activo, técnicas y límites antes de ejecutar acciones contra ese nuevo destino.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:1.5",
        "btl1:1.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-6",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "La política exige revisar accesos y no hay registro de ejecución. ¿Qué concluís?",
      "options": [
        "Que la falta de registro confirma fraude de un responsable",
        "El funcionamiento del control no está demostrado",
        "Que publicar la política demuestra que se ejecutó la revisión",
        "Que todos los accesos revisados eran correctos"
      ],
      "correct": 1,
      "explanation": "El diseño de una política y su operación son dimensiones distintas. Registros de revisión, decisiones y seguimiento permiten demostrar que el control efectivamente se aplica.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:1.3",
        "security-plus-701:5.5"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-7",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "Un cambio urgente corrige una caída. ¿Qué preserva el control?",
      "options": [
        "Conservar solo el estado final sin quién autorizó el cambio",
        "Aprobar otros cambios relacionados sin delimitar el alcance",
        "Autorización de emergencia, registro y revisión posterior",
        "Omitir todo registro por tratarse de una emergencia"
      ],
      "correct": 2,
      "explanation": "La urgencia puede ajustar el proceso pero no elimina trazabilidad ni control del impacto. La revisión posterior verifica el resultado y corrige desviaciones del cambio de emergencia.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "security-plus-701:1.3",
        "cc:5.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-8",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "Un curso mide conciencia solo por asistencia. ¿Qué evidencia agrega valor?",
      "options": [
        "Cantidad de minutos de asistencia al mismo contenido",
        "Porcentaje de diapositivas mostradas en cada sesión",
        "Número de invitaciones enviadas al curso de conciencia",
        "Tarea segura observable con criterio de éxito"
      ],
      "correct": 3,
      "explanation": "La asistencia mide exposición al contenido, no conducta segura. Una actividad observable con criterios y repetición permite evaluar aprendizaje y orientar refuerzo sin prometer inmunidad.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:2.3",
        "cc:2.4",
        "security-plus-701:5.6"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-9",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "El backup está cifrado pero nadie logra restaurarlo. ¿Qué sigue abierto?",
      "options": [
        "Disponibilidad y recuperación operativa",
        "Solo la confidencialidad del archivo cifrado",
        "Nada porque el cifrado acredita recuperación operativa",
        "Solo el nombre y extensión del archivo de respaldo"
      ],
      "correct": 0,
      "explanation": "Cifrar protege confidencialidad pero puede requerir claves disponibles. La continuidad necesita restauraciones que validen datos, dependencias y tiempos, no solo la existencia del backup.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "cc:2.2",
        "security-plus-701:3.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "governance-advanced-10",
      "domain": "governance",
      "lessonId": "riesgo-cambios",
      "question": "Un informe confirma intrusión por una sola IP sospechosa. ¿Qué corregís?",
      "options": [
        "Repetir el IOC como prueba suficiente de autoría",
        "Hechos, confianza, alternativas y datos faltantes",
        "Aumentar la certeza usando geolocalización de la IP",
        "Quitar las alternativas para simplificar la comunicación"
      ],
      "correct": 1,
      "explanation": "Una coincidencia es un indicio que requiere contexto. Comunicar confianza y evidencia faltante permite decisiones proporcionales y mantiene la hipótesis abierta a revisión.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:1.2",
        "security-plus-701:2.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-1",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "Un EML tiene From corporativo y Reply-To externo. ¿Qué concluís inicialmente?",
      "options": [
        "Compromiso de cuenta confirmado por cualquier Reply-To distinto",
        "Que el nombre visible acredita la cadena de recepción",
        "Discrepancia que requiere encabezados y contexto",
        "Autenticidad del remitente demostrada por el campo From"
      ],
      "correct": 2,
      "explanation": "Los campos visibles pueden manipularse o tener usos legítimos. La discrepancia orienta la investigación, pero autenticación, recepción y contexto son necesarios para concluir.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:2.4"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-2",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "La alerta llega veinte minutos tarde por una ingesta detenida. ¿Qué hora usás?",
      "options": [
        "Hora de la alerta como si fuera la del evento original",
        "Hora del reintento de ingesta para todos los eventos recuperados",
        "La hora más reciente reemplazando las marcas anteriores",
        "Distinguir evento, recepción e ingesta"
      ],
      "correct": 3,
      "explanation": "El retraso de ingesta no traslada la actividad al instante de alerta. Conservar marcas temporales distintas permite reconstruir la secuencia y evaluar límites de detección.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:5.2",
        "cc:5.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-3",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "Antes de aislar un servidor crítico sospechoso, ¿qué ponderás?",
      "options": [
        "Continuidad, evidencia volátil, autoridad y alternativas",
        "Solo la cantidad de alertas que menciona el servidor",
        "Solo severidad técnica sin dependencia de negocio",
        "El bloqueo más amplio disponible sin analizar recuperación"
      ],
      "correct": 0,
      "explanation": "Contener cambia el sistema y puede afectar operación y evidencia. La decisión debe justificar urgencia y alcance según impacto, autorización y opciones disponibles.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:6.5",
        "cc:5.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-4",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "Recibís un minidump de un proceso de laboratorio. ¿Qué límite declarás?",
      "options": [
        "Sustituye la adquisición de memoria física completa del sistema",
        "No equivale a RAM completa para toda técnica de Volatility",
        "Incluye automáticamente la memoria de todos los procesos",
        "Contiene todas las conexiones históricas del equipo"
      ],
      "correct": 1,
      "explanation": "El alcance depende del formato y regiones capturadas. Elegir herramientas compatibles evita afirmar un análisis de memoria física completa que el archivo no permite realizar.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.6",
        "security-plus-701:4.9"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-5",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "Una imagen FAT muestra un archivo borrado. ¿Qué sustenta recuperación?",
      "options": [
        "Cambiar la imagen original para marcar el archivo como activo",
        "Atribuir quién lo borró a partir del nombre de la carpeta",
        "Herramienta, ruta, estado y bytes con hashes y límites",
        "Solo ver el nombre eliminado en un listado de la herramienta"
      ],
      "correct": 2,
      "explanation": "El nombre borrado y los bytes recuperables son evidencias diferentes. Registrar el método y la integridad permite evaluar qué contenido se recuperó y qué fragmentos siguen ausentes.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.7",
        "btl1:4.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-6",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "Una regla agrupa fallos y éxito de login por IP. ¿Qué falso positivo considerás?",
      "options": [
        "Que un login exitoso anula todos los fallos anteriores",
        "Que compartir IP demuestra una única identidad de usuario",
        "Que el puerto de destino permite identificar la persona",
        "Varios usuarios tras una salida compartida"
      ],
      "correct": 3,
      "explanation": "Una IP puede representar múltiples usuarios o servicios. La correlación necesita identidad, ventana y contexto antes de convertir un patrón técnico en incidente atribuido.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:5.3",
        "cc:5.2"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-7",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "Se mueve el original sin registrar custodia. ¿Qué problema aparece?",
      "options": [
        "Brecha de trazabilidad",
        "Que mover el original modifica necesariamente todos sus bytes",
        "Que ya no puede calcularse un hash después del traslado",
        "Que un hash coincidente reemplaza todo registro de custodia"
      ],
      "correct": 0,
      "explanation": "La custodia documenta quién manejó qué y cuándo. Un hash coincidente puede acreditar igualdad de bytes pero no reemplaza el registro de manipulación y sus limitaciones.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:4.2",
        "btl1:4.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-8",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "Se elimina un archivo y una tarea lo vuelve a crear. ¿Qué faltó?",
      "options": [
        "Restaurar el mismo estado sin investigar la tarea que lo recrea",
        "Persistencia y causa antes de recuperar",
        "Solo cambiar el nombre del archivo reaparecido",
        "Dar por erradicado el problema por una eliminación exitosa"
      ],
      "correct": 1,
      "explanation": "Borrar el artefacto no elimina el mecanismo que lo produce. Erradicar requiere investigar persistencia y verificar que no reaparezca bajo condiciones controladas de prueba.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:6.5",
        "security-plus-701:4.8"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-9",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "No hay coincidencias de un IOC en siete días. ¿Cómo lo informás?",
      "options": [
        "IOC falso confirmado porque no apareció en la búsqueda",
        "Cobertura completa de todos los activos durante esa ventana",
        "Sin hallazgos en fuentes y ventana consultadas",
        "Ausencia de incidentes en toda la organización"
      ],
      "correct": 2,
      "explanation": "Un resultado negativo está limitado por cobertura, retención y consulta. Expresar esos límites evita transformar ausencia de coincidencias en certeza sobre toda actividad posible.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:3.4",
        "btl1:5.3"
      ],
      "introducedIn": 3
    },
    {
      "id": "response-advanced-10",
      "domain": "response",
      "lessonId": "recuperacion-rto-rpo",
      "question": "Tras recuperar el servicio, ¿qué vuelve útil la revisión posterior?",
      "options": [
        "Solo enumerar responsables del incidente sin acciones de mejora",
        "Solo sumar las horas de trabajo sin comprobar resultados",
        "Cerrar el caso al recuperar servicio sin validar medidas pendientes",
        "Acciones con responsables, plazos y prueba de cierre"
      ],
      "correct": 3,
      "explanation": "Las lecciones deben convertirse en cambios verificables. Responsables, plazos y criterios de cierre permiten evaluar mejoras reales de preparación, detección, respuesta y recuperación.",
      "rubric": "Justificá con evidencia observable y explicá qué dato descartaría la hipótesis; reconocé los límites de la conclusión.",
      "objectiveRefs": [
        "btl1:6.6",
        "cc:5.3"
      ],
      "introducedIn": 3
    }
  ],
  "optionVersion": 2,
  "bankVersion": 3
};
