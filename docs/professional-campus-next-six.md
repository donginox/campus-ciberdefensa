# Segunda tanda: aprender, demostrar y recuperar

La auditoría de la primera tanda identificó estas seis brechas. Las correcciones de errores de la primera tanda no cuentan como funciones nuevas. Esta tanda se inicia cuando su revisión queda aprobada.

1. **Guía de inicio reanudable.** Elegir una certificación principal, fecha de revisión, disponibilidad y entorno; comprobar requisitos solo a pedido y llegar al diagnóstico o a una primera práctica viable. Sin instalaciones automáticas. La opción de estudio flexible no impone un límite al alumno.
2. **Espacios de certificación y registro de evidencias.** Conectar los dominios oficiales, las competencias seleccionadas, las nuevas prácticas y lo que falta realizar afuera. Registrar procedimiento, resultado, interpretación, fecha, entorno, ayuda y revisión. La selección alimenta el plan; ningún contador acredita dominio.
3. **Análisis de paquetes con archivos PCAP.** Dos casos sintéticos originales, DNS/TCP/HTTP coherentes, registros relacionados, SHA-256, instrucciones de custodia, caso guiado y caso de transferencia. Exportación sin conexión y verificación con un lector real de PCAP. No capturar tráfico del usuario.
4. **Evaluación práctica independiente.** Dos casos acotados para los objetivos locales existentes; alcance autorizado, línea de base, hipótesis fallidas, asistencia y reporte estructurado persistentes. Rúbrica visible y caminos externos para capacidades que requieren otros sistemas, explotación o pivoting.
5. **Revisión del historial y refuerzo.** Abrir intentos anteriores, comparar muestras comparables, ver errores por dominio, omisiones y solapamiento de preguntas. Hasta tres acciones concretas y próxima revisión; separar resultados repetidos de práctica independiente.
6. **Centro de recuperación local.** Arrancar en estado recuperable si el archivo está dañado, inspeccionar copias válidas sin reemplazar el original, rotación acotada y checkpoint antes de importar. Restauración explícita, serializada y con copia previa; cancelar no modifica datos.

## Contratos y ownership

- Root integra `app.js`, `index.html`, `main.cjs`, `preload.cjs`, `security.cjs`, búsqueda y portafolio. Los agentes no editan esos archivos salvo cesión explícita. No commits paralelos.
- Cada módulo UI usa `create(options) → render, mount, dispose`, guarda exclusivamente en claves propias de `profile.labs` mediante la cola/revisión de root y protege perfil + generación al resolver trabajo asíncrono.
- `preparation-ledger` guarda evidencias de competencias; `independent-assessment` guarda intentos prácticos; `professional-onboarding` guarda la guía. Los historiales permanecen acotados. Ningún registro incorpora filas del host ni archivos privados automáticamente.
- El espacio de certificación consume `CAMPUS_COMPETENCIES`, prácticas y registros existentes. La procedencia y la fecha de revisión de fuentes son visibles. Si no se verificaron subobjetivos, se muestra esa brecha; una lista de dominios no se presenta como inventario exhaustivo de subobjetivos.
- El caso PCAP añade recursos propios al manifest existente. La app solo exporta archivos expresamente incluidos; no ejecuta comandos de análisis ni abre capturas del host.
- La recuperación pertenece al store y usa IDs opacos de candidatos propios. El renderer no proporciona rutas de archivos. Root conserva los diálogos nativos para importar/exportar y confirmar restauraciones.
- Mantener compatibilidad de perfiles y copias 0.1.9, pruebas TDD focales, revisiones independientes y QA nativa Windows. CI verifica Linux y Docker por separado.

## Criterio para terminar de agregar funciones

Las seis rutas deben funcionar de punta a punta: primer perfil → primera tarea viable; objetivo → evidencia → próximo paso; PCAP exportado → análisis → informe; caso nuevo → entrega → revisión; error histórico → refuerzo; perfil dañado/importación → recuperación comprobada. Deben sobrevivir reinicio, cambio/importación de perfil y fallos de guardado, con teclado, ambos temas y ampliación.

Cuando no haya defectos críticos o importantes en esas rutas y las brechas externas sean explícitas y accionables, se cierra la expansión de funciones y se termina documentación, revisión global, CI, instaladores y comprobación de actualizaciones. Los entornos externos de disco/memoria/SIEM y explotación entre varios hosts pueden seguir siendo requisitos del alumno; no se cuentan como demostrados por una simulación local.
