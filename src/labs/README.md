# Laboratorios locales

`lab-engine.js` expone `LabEngine` en el renderer y el mismo objeto mediante CommonJS. No usa red, procesos del sistema ni archivos del equipo. El catálogo conserva la distinción entre simulación, SQLite real aislado y cálculo criptográfico real; sus resultados no equivalen a una certificación profesional.

- `catalog`: ocho casos con `id`, `title`, `description`, `type`, `difficulty`, `duration`, `environment`, `objective`, `scenario`, `steps`, `fields`, `materials` y, cuando corresponde, `limitation`. Las opciones de campos son `{value,label}`. No se incluyen respuestas de evaluación en los campos. El hash de referencia sí es parte del ejercicio de comparación.
- `startLab(id)`: estado inicial. Linux devuelve `{labId,cwd,history,fs}` serializable como JSON.
- `runCommand(state,input)`: `{state,output}`. Devuelve un estado nuevo; un error conserva el anterior. Terminal acotada: `help`, `pwd`, `whoami`, `ls`, `cd`, `mkdir`, `touch`, `cat`, `chmod`, `stat`, `echo`, `clear`. Todas las entradas pertenecen al propietario virtual `student`; se aplican sus bits de lectura, escritura y búsqueda. No modela grupos, ACL, enlaces simbólicos, procesos ni todos los detalles de un shell POSIX. Límites: 256 entradas, 128 KiB de contenido, 16 KiB por archivo y comandos de 1024 caracteres.
- `calculateSubnet(cidr)`: red, difusión, rango, hosts, prefijo y máscara. Para `/31` aplica los dos extremos de un enlace punto a punto; `/32` representa una sola dirección. No son subredes de difusión convencionales.
- `queryLog({sourceIp,username,outcome,event,from,to})`: arreglo de eventos sintéticos. Filtros exactos combinados con AND; fechas ISO UTC inclusivas; devuelve copias.
- `hashText(text)`: promesa de SHA-256 hexadecimal sobre UTF-8 real, mediante Web Crypto. Límite: un millón de caracteres. No lee archivos personales.
- `evaluate(id,answers)`: `{score,total,passed,feedback,evidence}`. `feedback` es un arreglo de texto con criterios y orientación disponible al enviar el intento. Desconocidos se rechazan; respuestas vacías no aprueban. Linux evalúa `answers.state`; SQL evalúa `answers.result` producido por el worker. El resto usa los IDs de `fields`. `evidence` registra criterios y alcance, sin afirmar práctica en sistemas reales.

## SQLite

`sql-worker.cjs` se inicia mediante `Worker` con `workerData={query,taskId:'sql-investigation',wasmPath?}`. Responde directamente `{columns,rows,rowCount,truncated,elapsedMs}` o `{error:{code,message}}`. El escritorio debe aplicar el límite de tiempo y terminar el worker descartable al obtener la respuesta. `wasmPath` lo resuelve exclusivamente el proceso principal.

Cada consulta crea una base SQLite en memoria con siete registros de autenticación sintéticos y tres activos. Solo admite una sentencia `SELECT` o `WITH` de lectura. El escáner distingue comentarios y literales; bloquea DML/DDL, ATTACH, PRAGMA y funciones de archivos/extensiones, además de activar `query_only`. No se registra ninguna función que acceda al host. La base usa `hard_heap_limit` de SQLite de 16 MiB para acotar también asignaciones WASM. Límites de transporte: 8000 bytes UTF-8 de consulta, 64 columnas, 200 filas (se interrumpe al detectar la fila 201), texto de 8192 caracteres por celda y representación de BLOB de 256 bytes. `truncated` indica cualquiera de esos recortes; `rowCount` es la cantidad de filas entregadas, no un conteo completo de la consulta.

El límite de memoria SQLite complementa `resourceLimits` de V8: este último por sí solo no acota la memoria lineal de WebAssembly. Un timeout del escritorio sigue siendo necesario para agregaciones, recursión o uniones costosas antes de la primera fila.

Verificación: `node --test tests/labs*.test.cjs`; suite integrada: `npm test`. Las pruebas ejercitan permisos/rutas virtuales, límites IPv4, correlación sin falsos positivos, digest SHA-256 real, agregación SQLite real, lectura estricta, sentencias múltiples y límites de resultados/asignaciones.
