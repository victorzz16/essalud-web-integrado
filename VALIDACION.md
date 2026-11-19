# Validación de entrega — 19 de noviembre de 2026

## Comprobaciones realizadas

- Compilación de todas las clases Java del backend con JDK 21 y las bibliotecas del proyecto: satisfactoria.
- Comprobación estática de los archivos TypeScript de la aplicación: satisfactoria con TypeScript 5.8.3 y declaraciones de tipos Angular de validación.
- El listado de médicos admite consulta global sin `facilityCode` y devuelve el conteo y la fecha del siguiente horario disponible.
- La reserva del paciente excluye turnos bloqueados individualmente y turnos dentro de rangos de bloqueo administrativo.
- La reserva y la creación/reactivación de bloqueos sincronizan el acceso a la fila del médico para reducir condiciones de carrera.
- La Agenda general incorpora filtros por fecha, estado, médico, especialidad y sede, con paginación de 50 citas.
- Los horarios administrativos devuelven médico, especialidad, paciente, estado y motivo del bloqueo.
- Los bloqueos por rango se pueden crear sin turnos existentes, listar, desactivar y reactivar. La reactivación se rechaza si ya existe una cita dentro del rango.
- Se añadió la migración Flyway V3 para los motivos de bloqueo individual y la tabla de bloqueos por rango.
- Se añadieron pruebas de humo para filtro global de médicos, agenda administrativa, bloqueo por rango y reactivación.

## Pendiente de comprobación integral

- No se dispone de una instancia PostgreSQL en este entorno, por lo que no se pudo ejecutar Flyway V3 ni las pruebas de humo contra una base real.
- No se pudo ejecutar `npm ci` ni `ng build` con Angular CLI porque no están instaladas las dependencias locales y el registro npm no está disponible en este entorno. El TypeScript de los componentes sí pasó la comprobación estática.
- El usuario debe probar en Windows el arranque con PostgreSQL y confirmar que el navegador carga la agenda y aplica los bloqueos.

## Instrucciones de actualización

- Mantener la base PostgreSQL existente. No eliminar ni recrear `essalud_citas`.
- Reemplazar la carpeta del proyecto por la contenida en el ZIP.
- Iniciar el backend; Flyway aplica V3 automáticamente. Esperar `Started Application`.
- Iniciar el frontend y recargar con Ctrl+F5.

## Alcance

Prototipo académico. Médicos, sedes, citas y horarios son datos de demostración; no hay conexión con servicios oficiales de EsSalud.

## Validaciones de identidad, formularios y agenda — 19 de noviembre de 2026

### Reglas implementadas

- Registro de pacientes: DNI obligatorio de ocho dígitos y no repetido; correo válido, normalizado y no repetido ignorando mayúsculas; nombre entre 2 y 100 caracteres; contraseña entre 8 y 64 caracteres; confirmación de contraseña coincidente.
- Alta de médicos: se reutilizan las mismas reglas de nombre, DNI, correo y contraseña; se verifica que la sede y la especialidad existan y estén activas.
- Perfil: el correo se normaliza a minúsculas y no puede pertenecer a otra cuenta; el DNI no es editable.
- Especialidades: nombre de 2 a 100 caracteres y unicidad sin distinguir mayúsculas ni espacios externos.
- Base de datos: V4 agrega índices únicos sobre `lower(btrim(email))` y `lower(btrim(name))` para correos y especialidades. El DNI ya tenía restricción UNIQUE y CHECK de ocho dígitos desde V1.
- Horarios y bloqueos: el navegador limita fechas pasadas y el servidor verifica que el inicio sea futuro, que el final sea posterior y que no existan cruces o bloqueos incompatibles.
- Cobertura demo: se valida la coherencia entre estado y fecha de vencimiento.
- Agenda administrativa: se rechazan fechas, estados e identificadores de filtro inválidos.
- Errores: la API devuelve mensajes específicos para DNI, correo y especialidad duplicados, incluso cuando la colisión se produce por solicitudes simultáneas.

### Pruebas añadidas

`tests/smoke.py` incorpora escenarios para DNI duplicado, correo duplicado con distintas mayúsculas, DNI mal formado, correo inválido, nombre con números, contraseña corta, duplicados al crear médicos, especialidades repetidas, correo duplicado al editar perfil, normalización del correo, filtros inválidos y coherencia de cobertura.

### Migración

La nueva migración `V4__validaciones_unicas.sql` se ejecuta automáticamente con Flyway al iniciar el backend. No se debe borrar ni recrear la base de datos. Antes de crear los índices, V4 comprueba si existen duplicados históricos por correo o especialidad y detiene la migración con un mensaje claro en lugar de borrar o modificar cuentas duplicadas.

### Estado de comprobación

- Compilación Java con JDK 21 y las bibliotecas incluidas en el JAR de la entrega: satisfactoria; el JAR ejecutable se actualizó con las clases nuevas y la migración V4.
- La ejecución de V4 y de `tests/smoke.py` requiere que el usuario inicie PostgreSQL y el backend sobre una base de demostración. No se debe afirmar que esas pruebas de integración pasaron hasta ejecutarlas en ese entorno. En este entorno de preparación no hay un servidor PostgreSQL disponible.
- Los archivos TypeScript modificados pasaron una comprobación de sintaxis/transpilación con TypeScript 5.8.3. La compilación Angular completa no se ejecutó: `npm ci --offline` no pudo descargar `zone.js` porque el paquete no estaba en la caché; debe ejecutarse `npm ci` y `npm run build` en el equipo local con internet.


## Incidencia de migración V4 corregida

La primera entrega de V4 contenía un carácter `\\` antes del comentario SQL inicial. Se retiró del archivo de migración y del recurso incluido en `backend/citas.jar`. El registro del usuario muestra que PostgreSQL revirtió la ejecución y que el esquema seguía en versión 3; por ello, no se requiere recrear la base. La aplicación de V4 debe confirmarse al volver a iniciar el backend en el equipo del usuario.
