# Campus universitario: rediseño de interfaz

## Contexto y resultado

La persona estudia en Windows, usa Kali en otro equipo y prepara cinco certificaciones para diciembre. Quiere un campus universitario profesional que ayude a encontrar qué estudiar, continuar una clase y practicar. Eligió explícitamente azul y bordó. La aplicación Electron existente funciona localmente y conserva perfiles, notas e informes. Este trabajo rediseña su presentación y navegación; no crea servicios ni nuevas promesas de preparación.

## Dirección visual

Azul tinta para la navegación, bordó para acciones y selección, blanco y gris muy claro para superficies, dorado discreto para identidad académica. Tipografía del sistema para interfaz y una serif editorial medida para títulos del aula. Sin fuentes remotas, paquetes de iconos nuevos, emojis como iconografía principal, actividad ficticia ni porcentajes inventados. Iconos SVG propios con una misma retícula. Espaciado por múltiplos de cuatro, tarjetas de bordes suaves y jerarquía tipográfica consistente. Claro y oscuro deben sentirse diseñados, con alto contraste, texto ampliado y movimiento reducido preservados.

## Arquitectura y experiencia

- Inicio queda visible. El resto se agrupa en cuatro áreas desplegables: Aula virtual, Laboratorios, Certificaciones y Mi espacio. Conservar cada destino existente y todas las rutas secundarias. El área activa se abre automáticamente; la apertura manual se conserva durante la sesión. Una sola ruta activa, con `aria-current`.
- Cabecera con ubicación actual legible, búsqueda y perfil. Guardado, errores y actualizaciones siguen visibles y veraces.
- Inicio con saludo escapado, siguiente clase real y su módulo, progreso real y accesos diferenciados a cursos, laboratorios y certificaciones. Evitar dos CTA primarios que compitan: el panel de planificación existente se ubica después de la continuidad del estudio. No simular calendario o notificaciones.
- Catálogo de cursos con identidad de módulo, número de clases, duración orientativa y avance real. Aula con contexto de módulo, índice de clases accesible y cuatro pasos existentes: Teoría, Práctica, Comprobar, Mi resumen. Un indicador explica el avance sin sugerir aprobación oficial. Cambiar de clase usa `openLesson` existente y sus criterios de reanudación; los textos se guardan por el mecanismo actual.
- El sistema visual se aplica también a laboratorios, VM, topología, forense, objetivos, evaluación, preparación, tutor, combinación, biblioteca, perfiles y recuperación. Preservar estados vacíos, indisponibilidad y acciones con sus significados actuales.
- Navegación estrecha mediante menú con cierre, Escape y retorno de foco. Contenido cerrado fuera del orden de tabulación. Respetar concentración. Ventana de 920 px con escala 125%, 1440 px, y reflujo a 320 CSS px; tablas y mapas pueden tener desplazamiento local justificado. Sin desplazamiento horizontal global.

## Contrato técnico

Una hoja final `src/renderer/campus-design.css` centraliza la nueva capa visual y redefine los tokens existentes (`--navy`, `--wine`, `--ink`, `--paper`, `--surface`, `--muted`, `--line`, `--focus`, etc.) con variantes. No agregar variables sin definición. El módulo de presentación `src/renderer/campus-ui.js` expone `window.CampusUI` (también CommonJS para pruebas), contiene agrupación de navegación, iconos propios y constructores de presentación. `app.js` mantiene estado y efectos, y llama al módulo. `index.html` carga JS antes de app.js y CSS después de las hojas de hubs. No cambiar CSP, protocolo, IPC, guardado, esquema, actualización ni dependencias.

Clases compartidas nuevas: `.campus-nav-group`, `.campus-nav-heading`, `.campus-nav-links`, `.campus-dashboard`, `.campus-welcome`, `.campus-resume`, `.campus-progress`, `.campus-launch-grid`, `.campus-launch-card`, `.campus-section-heading`, `.campus-course-grid`, `.campus-course-card`, `.campus-course-cover`, `.campus-classroom`, `.campus-classroom-layout`, `.campus-syllabus`, `.campus-lesson-content`, `.campus-lesson-context`. El implementador de presentación comunica cualquier adición al de estilos antes de usarla.

## Verificación y límites

Pruebas conductuales para navegación completa, alias, expansión activa, escape del contenido, reanudación e índice, preferencias y guardado existente. Verificación nativa de rutas representativas en claro/oscuro/alto contraste, dos tamaños y teclado, con axe y medidas de geometría. La evaluación automática no certifica accesibilidad. Capturas visuales si el entorno permite; el capturador de Electron tuvo fallos previos, por lo que usar otra superficie autorizada de la aplicación propia si es necesario, sin acceder al antiguo HTML cuyo acceso fue denegado.

Referencias de diseño consultadas: [Fluent 2: espacio, jerarquía y reflujo](https://fluent2.microsoft.design/layout), [WAI: controles desplegables y teclado](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/). Son referencias de patrones, sin copiar identidad ajena.
