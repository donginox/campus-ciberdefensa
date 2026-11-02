# Qué debo saber para cada certificación

Revisión de fuentes oficiales: **2 de noviembre de 2026**. Horizonte docente: estudiar durante noviembre y revisar la preparación de cada ruta en diciembre de 2026. El calendario no promete rendir ni aprobar cinco exámenes.

La matriz de la app vive en [competencies.json](../src/content/competencies.json): **27 competencias**, cinco certificaciones y 25 áreas de estudio. `canDo` describe algo que el alumno debe demostrar; no afirma que ya lo domine. Las actividades, evidencias y preguntas de preparación son material docente original. No reproducen preguntas de examen, bancos filtrados ni soluciones del proveedor.

## Cómo usar la matriz

1. Leé el objetivo oficial y las clases enlazadas.
2. Intentá la actividad antes de consultar una solución. Registrá lo que realmente ejecutaste.
3. Conservá evidencia fuera del simple indicador de completado: fecha y zona horaria, entorno/herramienta, procedimiento, resultado, interpretación y límite.
4. Respondé la pregunta de preparación con un caso distinto. Si necesitás la solución o falta el entorno, anotá la brecha y la próxima práctica.
5. Compará después contra **todos** los objetivos oficiales. Estas 27 filas son una selección para estudiar, no una declaración de cobertura exhaustiva.

Los porcentajes son ponderaciones oficiales de dominios; no son porcentajes de progreso ni una cantidad garantizada de preguntas. `null` significa ponderación no verificada/publicada en las fuentes consultadas. Las reglas de avance de la ruta local son propuestas propias, no notas de corte oficiales.

## Qué ejecuta cada práctica

| Tipo en los datos | Alcance de la evidencia |
| --- | --- |
| `simulator` | Caso artificial: permisos virtuales, ACL ficticia, cálculo de subred o correo estático. Verifica ese razonamiento; no administra un sistema real. |
| `real-local` | SQLite y SHA-256 ejecutan motores reales sobre datos sintéticos. Juice Shop es una aplicación web Linux real en un contenedor cuando el motor Docker está disponible y el objetivo se inicia correctamente. No es una VM. |
| `guided` | Caso guiado o procedimiento que debe ejecutarse manualmente. Una guía leída o una misión sintética completada no demuestra la operación sobre Windows/Linux. |
| `external` | Hace falta un entorno adicional autorizado: proveedor, SIEM, imágenes forenses o VMs preparadas aparte. El enlace al lab/misión local indica el punto de partida, no una implementación de esa capacidad. |

Las misiones `web-investigation`, `soc-investigation` y `sql-investigation` organizan evidencia. Una misión SOC con muestras ficticias no es un SIEM y no analiza un disco ni un volcado de memoria. El estado «completado» del campus tampoco certifica autoría, autonomía o corrección del informe.

Para Juice Shop y VMs, usar [topologías reales](real-labs-topology.md). `localhost` de Kali es la propia Kali, no Windows. El objetivo del campus se publica en loopback; no se lo debe interpretar como un servidor accesible desde otra VM. La app no prepara por sí sola una red de pentesting con varios segmentos.

## ISC2 CC

Se usa el outline efectivo desde el **1/9/2026**, que publica cinco dominios actualizados y español. No reutilizar los dominios y pesos anteriores. La integración de IA es transversal en la explicación oficial del outline. Los pesos publicados suman 99,9% por redondeo. [Outline oficial](https://www.isc2.org/certifications/cc/cc-certification-exam-outline), [PDF oficial en español](https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/2026/EXAMS-CC_Exam_Outline-01-2026_Spanish.pdf).

| Dominio | Peso | Competencia / actividad propia | Evidencia y brecha principal |
| --- | ---: | --- | --- |
| Principios de seguridad | 24% | `cc-controles`: justificar un control y contrastar integridad con otras protecciones. | Digest y decisión razonada; ampliar ética, privacidad y riesgos de IA. |
| Gobernanza de la seguridad | 17,3% | `cc-continuidad`: definir responsables, recuperación y una métrica útil. | Plan de mesa y criterio de cierre; no demuestra restauración ni GRC operativo. |
| Gestión de identidades y accesos | 20% | `cc-ciclo-identidad`: altas, revisiones, bajas y acceso mínimo. | Matriz de roles; ejecutar controles de acceso reales si falta esa práctica. |
| Seguridad en redes y nube | 21,3% | `cc-red-responsabilidad`: explicar segmentos y responsabilidad compartida. | Diagrama y tabla proveedor/cliente; el cálculo IPv4 no cubre nube, Wi-Fi o IPv6. |
| Operaciones y respuesta | 17,3% | `cc-triaje-datos`: clasificar datos, correlacionar y decidir próximos pasos. | Cronología con fuentes; ampliar criptografía, activos y pruebas de seguridad. |

Pregunta de cierre propia: ¿podés justificar la decisión de seguridad de un caso nuevo e identificar qué parte todavía no sabés? La lectura de todos los subobjetivos sigue siendo necesaria.

## Cisco CCST Cybersecurity · 100-160

La ficha oficial confirma principios, red, endpoints, vulnerabilidades/riesgo e incidentes. La página de temas detallados devolvió **CSS Error** durante esta revisión. Se usaron la ficha y los objetivos públicos del curso; **no se atribuyen pesos ni se afirma cobertura de subobjetivos no leídos**. [Ficha del examen](https://www.cisco.com/site/us/en/learn/training-certifications/exams/ccst-cybersecurity.html), [objetivos del curso](https://www.cisco.com/c/dam/en_us/training-events/training/courses/ccst-cybersecurity.pdf), [detalle pendiente](https://learningnetwork.cisco.com/s/ccst-cybersecurity-exam-topics).

| Área confirmada | Competencia / actividad propia | Evidencia y brecha principal |
| --- | --- | --- |
| Principios | `ccst-riesgo-acceso`: conectar riesgo, permisos y protección. | Caso explicado y hash; ampliar cifrado y acceso seguro. |
| Red | `ccst-recorrido-red`: localizar una falla por capas. | Subred y solicitud propia; faltan configuración de red y Wi-Fi seguro. |
| Endpoints | `ccst-endpoint-verificar`: revisar Windows y Linux. | Observaciones de procesos, permisos, registros y actualizaciones en ambos sistemas; ACL ficticia no basta. |
| Vulnerabilidades y riesgo | `ccst-priorizar`: priorizar un hallazgo contextualizado. | Observación del objetivo permitido y validación propuesta; completar gestión de vulnerabilidades. |
| Incidentes | `ccst-escalar`: comunicar una secuencia con límites. | Ticket con tiempos e IDs; faltan recolección forense y respuesta operativa si solo hay muestras ficticias. |

Pendiente antes de decidir examen: abrir el blueprint detallado, agregar sus subobjetivos y comprobar cada hueco. El PDF de formación no lo sustituye.

## CompTIA Security+ · V7 SY0-701 en español

La ruta conserva **SY0-701** y sus ponderaciones. Al 2/11/2026, la ficha V8 anuncia SY0-801 para aproximadamente el **17/11/2026**, una fecha futura, y publica inglés. No se mezclan versiones ni se cambia la ruta española por ese anuncio. El lector web falló en estas dos páginas; se verificó su HTML público directamente por HTTPS en el mismo día. [V7 oficial](https://www.comptia.org/en-us/certifications/security/v7/), [V8 anunciada](https://www.comptia.org/en-us/certifications/security/v8/).

| Dominio V7 | Peso | Competencia / actividad propia | Evidencia y brecha principal |
| --- | ---: | --- | --- |
| Conceptos generales | 12% | `sec-criptografia-cambios`: elegir mecanismos y prever reversión. | Comparativa y plan; faltan PKI, claves y confianza cero en profundidad. |
| Amenazas, vulnerabilidades y mitigaciones | 22% | `sec-interpretar-hallazgos`: explicar causa, indicio y control. | Solicitud/respuesta del objetivo; ampliar escenarios de red, malware e identidad. |
| Arquitectura | 18% | `sec-disenar-fronteras`: dibujar zonas y recuperación. | Flujo y límites del aislamiento; no demuestra despliegue, IoT/ICS o IaC. |
| Operaciones | 28% | `sec-hardening-identidad` y `sec-investigar`: verificar endpoints y consultar eventos. | Antes/después Windows/Linux y consulta reproducible; SQLite no acredita SIEM/EDR. |
| Gestión y supervisión del programa | 20% | `sec-riesgo-programa`: comunicar responsable y riesgo residual. | Memo y revisión; ampliar terceros, cumplimiento, auditorías y concienciación. |

Completar los objetivos V7 y ejercicios de desempeño legítimos adicionales. Un caso web y un caso de ACL no son una evaluación de la amplitud de Security+.

## Blue Team Level 1 · BTL1

Centri publica seis áreas formativas. Su soporte confirma análisis forense de **Windows y Linux, disco y memoria**, además de inteligencia, SIEM y respuesta. Los pesos quedan sin asignar. [Programa oficial](https://www.centri.org/certifications/blue-team-level-1), [áreas y herramientas](https://support.centri.org/hc/en-gb/articles/11316228055836-Is-BTL1-Right-For-Me).

| Área | Competencia / actividad propia | Evidencia y brecha principal |
| --- | --- | --- |
| Fundamentos | `btl-sistema-defensa`: observar controles en ambos sistemas. | Procedimiento propio; la terminal virtual no reemplaza Linux, Windows ni Active Directory. |
| Phishing | `btl-correo`: justificar clasificación y respuesta. | Indicadores citados; completar EML, encabezados y artefactos seguros en un lab. |
| Inteligencia | `btl-contextualizar-ioc`: evaluar procedencia, vigencia y confianza. | Ficha y uso de herramienta externa; no hay MISP en el campus. |
| Forense | `btl-disco-memoria`: contrastar artefactos de disco/memoria. | Imágenes y copias verificadas, herramientas y línea temporal; falta ejecución externa real. |
| SIEM | `btl-consulta-siem`: consultar eventos y revisar la ingesta. | Consulta y eventos originales en plataforma real; tabla JSON y SQL no son SIEM. |
| Respuesta | `btl-caso-integrado`: sostener decisiones durante un caso completo. | Informe integrado y alternativa contrastada; la misión sintética solo inicia esa práctica. |

La app no contiene un motor de Autopsy, Volatility ni Splunk. Para cerrar las brechas, usar imágenes **de laboratorio** y herramientas reales en un entorno autorizado, o los labs del proveedor, que requieren acceso con sus propias condiciones. Referencias primarias de herramientas: [Autopsy](https://www.sleuthkit.org/autopsy/), [Volatility](https://volatility3.readthedocs.io/en/stable/), [SPL de Splunk](https://help.splunk.com/en/splunk-enterprise/search/search-manual/9.4/search-overview/about-the-search-language). Para eventos Windows, [Get-WinEvent](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-7.5) permite trabajar con registros y archivos de eventos; la guía no demuestra haberlo ejecutado.

Criterio propio antes de considerar preparación: investigar un caso nuevo con evidencia Windows/Linux, disco, memoria y SIEM, y explicar los límites de cada conclusión. Un hash de texto sintético no es una cadena de custodia ni una investigación forense.

## INE eJPT

Se usan los cuatro dominios publicados y la actualización de **2026**, que amplía reconocimiento y web/CMS. No se asume una etiqueta de versión antigua ni que el curso de IA autorice asistencia de IA durante el examen. [Objetivos oficiales](https://ine.com/security/certifications/ejpt-certification), [actualización oficial de 2026](https://ine.com/newsroom/ine-security-launches-updated-ejpt-certification-with-expanded-web-app-testing-recon-training-and-offensive-ai).

| Dominio | Peso | Competencia / actividad propia | Evidencia y brecha principal |
| --- | ---: | --- | --- |
| Metodologías de evaluación | 25% | `ejpt-alcance-enumerar`: delimitar, observar y priorizar. | Inventario con procedencia; loopback no cubre descubrimiento de una red u OSINT completo. |
| Auditoría de hosts y redes | 25% | `ejpt-auditar-hosts`: recopilar contexto Windows/Linux. | Salidas y transferencias de laboratorio; un contenedor web no reemplaza hosts completos. |
| Pentesting de hosts y redes | 35% | `ejpt-validar-acceso` y `ejpt-pivoting`: validar acceso y demostrar dos recorridos. | Cadena y cierre, rutas y reenvío a otro segmento; requiere otro entorno. |
| Pentesting web | 15% | `ejpt-web-validar`: observar y validar una falla. | Solicitudes/respuestas y remediación; Juice Shop no es WordPress ni cubre todos los flujos web. |

**Brecha explícita:** el campus no ejecuta una red de varios segmentos ni administra acceso/pivoting. La topología básica de dos VMs sirve como preparación de red; no demuestra ruta a un segundo segmento ni reenvío de puertos. Las prácticas de explotación, auditoría Windows/Linux y pivoting deben ejecutarse en VMs propias preparadas aparte o labs autorizados como los de INE, con acceso y condiciones propios.

[PortSwigger Web Security Academy](https://portswigger.net/web-security) ofrece práctica web del proveedor como complemento. Puede requerir cuenta para ejecución o progreso; no sustituye los dominios de hosts y red de eJPT.

## Base común y decisión en diciembre

Las 24 clases conservan su función docente:

| Base | Clases existentes | Aporte |
| --- | --- | --- |
| Hardware y representación | `hardware-recursos`, `bits-unidades`, `almacenamiento-modelos` | Interpretar recursos, bytes y capas de almacenamiento. |
| Sistemas | `kernel-shell`, `procesos-concurrencia`, `memoria-virtualizacion` | Distinguir proceso, servicio, aislamiento y concurrencia. |
| Windows | `windows-objetos-procesos`, `windows-acl`, `windows-eventos` | Observar y documentar operaciones propias; ampliar a evidencia real. |
| Linux | `linux-archivos-permisos`, `linux-proceso`, `linux-http-local` | Orientarse en archivos, procesos y servicio local. |
| Redes | `senales-unidades`, `capacidad-errores`, `capas-subredes-rutas` | Razonar con unidades, capas, capacidad y rutas. |
| Datos | `modelo-calidad`, `sql-consultas`, `sql-transacciones` | Consultar evidencia y reconocer duplicados, NULL y límites. |
| Programación | `algoritmos-trazas`, `c-limites`, `objetos-contratos` | Entender contratos, validaciones y causas de fallas. |
| Seguridad y gestión | `fronteras-confianza`, `riesgo-cambios`, `recuperacion-rto-rpo` | Conectar controles, decisiones y recuperación. |

No todas las materias tienen igual presencia en cada examen. Completar esta base no demuestra cobertura de cinco certificaciones.

Durante noviembre, conservar evidencia de la base y detectar brechas. En diciembre, revisar CC y CCST por separado y elegir profundidad principal entre Security+, BTL1 o eJPT. Una decisión de fecha necesita objetivos completos, prácticas pendientes resueltas y evaluaciones legítimas nuevas. Si falta Windows, una imagen forense, un SIEM o una red con segundo segmento, registrar **pendiente**, con próxima acción y nueva fecha de revisión; no compensarlo con casillas completadas.
