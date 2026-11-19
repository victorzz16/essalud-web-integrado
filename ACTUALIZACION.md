# Actualización del portal de citas — 19/11/2026

> **Versión más reciente del ZIP:** incorpora validaciones de identidad y formularios, además de la migración Flyway V4. Conserva la base de datos existente; no la recrees.

## Corrección adicional: registro y búsqueda de médicos

- En Administración → Médicos, el formulario ahora exige seleccionar la sede donde atenderá cada profesional.
- La tabla de médicos muestra y permite cambiar la sede asignada, además de la especialidad y el estado.
- El backend guarda el código de sede en el usuario del médico, devuelve el nombre y código de la sede en el listado administrativo y valida que la sede exista y esté activa.
- La reserva filtra los profesionales por la sede seleccionada; por eso, un médico recién registrado aparece en el listado de pacientes cuando se elige la misma sede.
- Si no hay médicos en una sede, la pantalla muestra una indicación para cambiar de establecimiento o pedir al administrador que asigne profesionales.

## Cambios incluidos

- Comprobante PDF rediseñado con logotipo vectorial de **Mi Salud**, encabezado institucional del prototipo, datos del paciente, profesional, especialidad, fecha, horario, duración y establecimiento.
- Imagen familiar del proyecto aplicada al panel de acceso con transparencia y superposición azul para conservar la legibilidad.
- Nueva opción **Calendario** en el menú del paciente: vista mensual, navegación entre meses, días con citas y detalle de cada fecha.
- Catálogo ampliado de especialidades médicas y profesionales de demostración.
- Selector de establecimiento en la reserva. Se incluyeron sedes de referencia de Lima, Callao, Lambayeque, Junín y Arequipa.
- Buscador de especialistas inspirado en la referencia visual compartida: tarjetas horizontales con nombre, especialidad, sede y botón para ver horarios. No incluye atención a domicilio ni calificaciones.
- Nueva sección **Mi perfil**: permite editar nombre y correo, cargar o quitar fotografía y consultar datos de la cuenta.
- La fotografía se redimensiona en el navegador antes de guardarse en PostgreSQL.
- El backend devuelve el establecimiento asociado al profesional para mostrarlo en Mis citas, Calendario y el PDF.

## Actualizar una instalación existente

1. Detén Angular y Spring Boot con `Ctrl+C` en sus respectivas terminales.
2. Conserva una copia de la carpeta anterior del proyecto.
3. Descomprime esta versión completa en la carpeta de trabajo y reemplaza el proyecto anterior.
4. Inicia PostgreSQL como de costumbre. **No borres la base de datos ni las tablas.**
5. Ejecuta `iniciar-backend.ps1`. Flyway conserva la migración `V2__catalogo_sedes_y_perfil.sql`; esta corrección no requiere una migración nueva. Los usuarios y citas existentes se conservan.
6. Ejecuta `iniciar-frontend.ps1`. Si es la primera ejecución en esa carpeta, `npm ci` instalará las dependencias.
7. Abre `http://localhost:4200`, inicia sesión y prueba Reservar cita, Calendario y Mi perfil.

La primera vez que se inicie el backend actualizado en modo demostración se agregarán profesionales y horarios de ejemplo que falten, sin duplicar los turnos ya registrados.

## Importante sobre el catálogo

Los establecimientos incluidos son una selección referencial de centros de EsSalud, no un directorio nacional completo ni una confirmación de adscripción. Los profesionales, horarios, disponibilidad y cobertura son ficticios para el proyecto. La aplicación no se conecta a los sistemas oficiales de EsSalud ni realiza reservas reales.

## Validación de esta entrega

- `AdminController.java` compilado con JDK 21 usando las dependencias incluidas en el JAR del proyecto.
- JAR ejecutable actualizado con el nuevo registro y edición de la sede del médico.
- Archivos TypeScript del módulo revisados mediante el compilador de TypeScript; el comprobante PDF se generó y verificó como PDF A4 de una página.
- Pendiente: compilación Angular completa y recorrido de extremo a extremo con PostgreSQL real. El entorno de preparación no pudo acceder al registro de npm para descargar las dependencias; en Windows, `iniciar-frontend.ps1` ejecuta `npm ci` en la primera apertura.


## Corrección de filtros, agenda y bloqueos — 19/11/2026

- En Reservar cita, el filtro inicia en “Todas las sedes · Todos los médicos”. Se añadió un filtro explícito de médico con la opción “Todos los médicos”, además de “Todas las especialidades”.
- El listado muestra el número de horarios futuros disponibles y el siguiente horario de cada profesional. El botón de cada médico abre la lista de fechas y horas para seleccionar el turno.
- La consulta de médicos sin `facilityCode` devuelve todos los profesionales activos de todas las sedes; con `facilityCode` conserva el filtro por establecimiento.
- Agenda general: se reforzó la consulta administrativa y se añadieron filtros por fecha, estado, médico, especialidad y sede, con actualización, limpieza de filtros y paginación. La agenda muestra citas registradas; no inventa reservas cuando no existen.
- Horarios: la tabla administrativa identifica turnos ocupados, bloqueos individuales y bloqueos por rango. No permite bloquear un turno que tenga una cita activa.
- Se añadió la función para bloquear un rango de fecha/hora por médico, con motivo. Funciona incluso si no hay turnos previamente publicados. Los bloqueos activos excluyen los turnos afectados de la búsqueda del paciente y el backend vuelve a validarlos al confirmar una reserva.
- Se incorporó Flyway V3 (`V3__bloqueos_agenda.sql`) para guardar el motivo de los bloqueos individuales y crear la tabla `schedule_blocks`. No borrar la base de datos: al iniciar el backend, Flyway aplica V3 automáticamente.

### Actualización de una instalación existente

1. Detener frontend y backend con Ctrl+C.
2. Guardar una copia de la carpeta actual.
3. Reemplazar el proyecto por esta versión completa.
4. Mantener la misma base `essalud_citas`; no volver a ejecutar scripts de creación ni borrar tablas.
5. Iniciar backend y esperar que Flyway complete V3 y aparezca `Started Application`.
6. Iniciar frontend y recargar el navegador con Ctrl+F5.

La Agenda general solo muestra citas que ya fueron reservadas. Los horarios disponibles se consultan en Reservar cita; los bloqueos se gestionan en Administración → Horarios.

## Validaciones de registro y datos — 19/11/2026

- Se reforzó el registro de pacientes para impedir que se repitan el DNI o el correo electrónico.
- El DNI debe contener exactamente ocho dígitos. El correo debe tener formato válido, se guarda en minúsculas y no puede repetirse aunque se escriba con mayúsculas.
- Se aplicaron las mismas reglas de identidad al registrar médicos desde Administración.
- Mi perfil valida el nombre y el correo y rechaza un correo que ya pertenezca a otra cuenta. El DNI no se puede modificar.
- Se añadió validación de nombre y contraseña, confirmación de contraseña y mensajes de error específicos.
- Las especialidades no pueden registrarse dos veces con diferencias de mayúsculas o espacios.
- Se reforzaron las comprobaciones de fechas, horarios, bloqueos y consistencia de cobertura demo.
- Flyway V4 añade índices únicos de correo y especialidad sin distinguir mayúsculas. El DNI ya era único en V1.

### Actualizar una instalación existente

1. Detén frontend y backend con Ctrl+C.
2. Guarda una copia de la carpeta del proyecto.
3. Reemplaza el proyecto por esta versión completa.
4. Conserva la base `essalud_citas`; no la elimines ni vuelvas a ejecutar los scripts de creación.
5. Inicia el backend y espera a que Flyway aplique V4 y aparezca `Started Application`.
6. Inicia el frontend y recarga con Ctrl+F5.

Si V4 detecta correos o especialidades duplicados que ya existían en la base, detendrá la migración para que se corrijan manualmente. No eliminará usuarios ni citas.


## Corrección de arranque de Flyway V4 — 19/11/2026

Se corrigió el archivo `V4__validaciones_unicas.sql`: se retiró un carácter `\\` accidental al inicio que impedía que PostgreSQL interpretara la migración. La misma corrección se incorporó al recurso SQL dentro de `backend/citas.jar`. La migración V4 conserva su lógica de detección de duplicados y creación de índices únicos. Si el intento anterior terminó con `Changes successfully rolled back` y la versión del esquema continúa en 3, basta con sustituir esta entrega y volver a iniciar el backend; no se debe borrar ni recrear la base de datos.
