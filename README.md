# Mi Salud · Citas médicas EsSalud
Proyecto académico funcional con Angular, Spring Boot, Spring Security (JWT) y PostgreSQL. **Sin Docker.** Incluye buscador de especialistas, selección referencial de sedes, calendario de citas, perfil editable con fotografía y comprobante PDF con identidad gráfica del prototipo. EsSalud es el contexto del trabajo; los horarios, cobertura, usuarios y disponibilidad son de demostración. No existe conexión con servicios oficiales.

## 1. Instalar una sola vez
- JDK **21** y variable JAVA_HOME apuntando al JDK 21.
- Maven **3.9.x** para recompilar o modificar el backend (`mvn -v`). Para ejecutar el JAR incluido basta Java 21.
- Node.js **22.12 o superior de la rama 22**, o Node.js 24, con npm.
- PostgreSQL **17** y pgAdmin 4. Durante su instalación guarda la contraseña del usuario postgres.
- Editor recomendado: VS Code para frontend e IntelliJ IDEA o VS Code para backend.

pgAdmin es el administrador visual; PostgreSQL es el servidor que almacena los datos. Ambos deben estar instalados. No hace falta Angular CLI global.

## 2. Crear la base desde pgAdmin
1. Abrir pgAdmin y conectar al servidor local, puerto 5432, usuario postgres.
2. Seleccionar Databases → postgres → Query Tool.
3. Abrir `database/01_crear_usuario.sql`, sustituir CAMBIA_ESTA_CLAVE por una contraseña propia y ejecutar.
4. Abrir `database/02_crear_base.sql` y ejecutar SOLO la sentencia CREATE DATABASE, con Auto-commit activado. No ejecutarla dentro de BEGIN/COMMIT.
5. Refrescar Databases. Debe aparecer essalud_citas. No crear tablas manualmente: Flyway ejecuta la migración al arrancar Spring Boot.

## 3. Ejecutar en Windows (dos terminales)
Descomprimir el ZIP en una carpeta, por ejemplo `C:\proyectos\essalud-citas`. Abrir PowerShell allí.

Terminal 1:
```powershell
powershell -ExecutionPolicy Bypass -File .\iniciar-backend.ps1
```
El script pide la contraseña PostgreSQL del usuario essalud_app y una contraseña de mínimo 8 caracteres para las cuentas demo. Genera una clave JWT local para esa ejecución. Esperar el mensaje `Started Application` (puerto 8080).

Terminal 2:
```powershell
powershell -ExecutionPolicy Bypass -File .\iniciar-frontend.ps1
```
Abrir **http://localhost:4200**. La primera ejecución descarga dependencias y requiere internet. Angular reenvía `/api` al backend mediante el proxy configurado; no necesitas configurar CORS ni usar pgAdmin como API.

Las cuentas base de demostración se crean cuando corresponde y los profesionales/horarios de ejemplo faltantes se completan en cada inicio sin duplicar turnos. Si ya existen las cuentas demo, sus contraseñas se conservan. Detener cada proceso con Ctrl+C.

## 4. Ejecución manual / Linux / macOS
Configurar variables en la terminal del backend:
```bash
export DB_URL=jdbc:postgresql://localhost:5432/essalud_citas
export DB_USER=essalud_app
export DB_PASSWORD='TU_CLAVE_POSTGRESQL'
export JWT_SECRET='TU_SECRETO_ALEATORIO_DE_AL_MENOS_32_CARACTERES'
export APP_DEMO=true
export DEMO_PASSWORD='TU_CLAVE_DEMO'
export CANCEL_HOURS=2
cd backend
mvn spring-boot:run
```
En otra terminal:
```bash
cd frontend
npm ci
npm start
```
En PowerShell, usar `$env:DB_PASSWORD = 'tu clave'` en vez de export. No guardar claves en Git. Si cambia el puerto del backend, modificar `frontend/proxy.conf.json`.

## 5. Usuarios demo
| Perfil | Correo | Contraseña |
|---|---|---|
| Paciente | paciente@demo.pe | La indicada en DEMO_PASSWORD en el primer arranque |
| Médico | medico@demo.pe | La misma contraseña demo |
| Administrador | admin@demo.pe | La misma contraseña demo |

Se crean 26 profesionales de demostración repartidos entre las sedes del catálogo. Entre las cuentas médicas iniciales están medico@demo.pe, valeria@demo.pe, carlos@demo.pe y ana@demo.pe; las demás cuentas se identifican por su especialidad. Se generan turnos de media hora para los próximos 14 días, de 08:00 a 12:00, para los profesionales de demostración. Al reiniciar el backend se completan los turnos que falten sin duplicar los existentes. Después se pueden ampliar desde Administración → Horarios. Cada profesional tiene su propia agenda.

## 6. Recorrido de demostración
1. Entrar como paciente → Reservar cita → elegir establecimiento y especialidad → seleccionar profesional → fecha/hora → confirmar.
2. Revisar Mis citas, descargar el comprobante PDF o agregar la reserva a un calendario externo.
3. Abrir Calendario para revisar las citas por mes y seleccionar un día para ver sus atenciones.
4. Abrir Mi perfil para actualizar nombre, correo y fotografía.
5. Salir, entrar como médico y revisar Mi agenda. Solo puede marcar ATENDIDA desde el inicio del turno o NO_ASISTIO desde el final.
6. Entrar como administrador para crear médicos, editar e inactivar profesionales, mantener especialidades, consultar la Agenda general con filtros y publicar o bloquear horarios individuales o rangos completos (aunque todavía no existan turnos publicados).
7. En Cobertura demo cambiar el paciente a VENCIDA o NO_VERIFICABLE. Intentar reservar con ese paciente: el backend rechaza la operación.
8. En pgAdmin abrir la base essalud_citas y ejecutar `database/03_consultas_verificacion.sql`.

El paciente puede registrarse con nombre, DNI ficticio de 8 dígitos, correo y contraseña. Recibe únicamente rol PACIENTE y cobertura demo vigente por 365 días, no una acreditación real.

## 7. Validaciones de datos incorporadas

- **DNI:** obligatorio, exactamente 8 dígitos numéricos y único en toda la tabla de usuarios. Se aplica al registro de pacientes y al alta de profesionales.
- **Correo electrónico:** formato válido, máximo 150 caracteres, se guarda sin espacios externos y en minúsculas. No se permite repetirlo aunque cambien las mayúsculas.
- **Nombre:** entre 2 y 100 caracteres; admite letras, tildes, espacios, apóstrofes, puntos y guiones. No admite nombres vacíos ni números.
- **Contraseña:** entre 8 y 64 caracteres; no se acepta una contraseña vacía o formada solo por espacios. Se almacena con BCrypt.
- **Confirmación de contraseña:** el registro compara ambos campos antes de enviar los datos.
- **Perfil:** no permite cambiar el correo por uno que ya pertenezca a otra cuenta; el DNI permanece bloqueado para edición.
- **Profesionales:** el administrador debe registrar DNI y correo no utilizados, una especialidad activa y una sede existente y activa.
- **Especialidades:** no se admiten nombres vacíos ni duplicados por diferencias de mayúsculas o espacios.
- **Horarios y bloqueos:** el inicio debe ser futuro, el fin posterior al inicio, el intervalo no puede cruzarse con otro turno y los bloqueos requieren un motivo válido. El servidor repite estas comprobaciones.
- **Cobertura demo:** una cobertura VIGENTE debe tener vencimiento hoy o posterior; una VENCIDA debe tener vencimiento anterior a hoy. NO_VERIFICABLE se mantiene como estado de prueba.
- **Filtros administrativos:** fecha ISO válida, estado permitido e identificadores no negativos.

La validación del navegador mejora la experiencia, pero la API y PostgreSQL vuelven a comprobar los datos. Así se evitan registros duplicados incluso si dos solicitudes llegan al mismo tiempo.

## 8. Arquitectura y decisiones
- **Angular 20.3**: componentes standalone, rutas protegidas por rol, formulario reactivo de autenticación, HttpClient, interceptor Bearer, buscador de especialistas por sede y especialidad, calendario mensual y perfil editable. La fotografía se reduce en el navegador y se guarda como imagen JPEG en la base de datos. La sesión vive en memoria; al recargar la página hay que iniciar sesión nuevamente y no se guarda el JWT en localStorage.
- **Spring Boot 3.5.7 / Java 21**: controladores REST, servicio transaccional de reservas, validación y manejo de errores.
- **Spring Security**: BCrypt para contraseñas; JWT HS256 con emisor validado y vencimiento de 1 hora; rutas administrativas restringidas. Logout elimina el token del cliente; los tokens emitidos vencen a la hora, sin lista de revocación.
- **Spring JDBC + PostgreSQL**, con SQL parametrizado y Flyway. Se usa JDBC en lugar de JPA/Hibernate propuesto en el informe para hacer explícitas las consultas y bloqueos. Ajustar esa sección del informe al código entregado.
- Reserva: bloqueo del paciente, turno y médico para serializar reservas con bloqueos administrativos; validación de cobertura demo, detección de cruces, exclusión de turnos bloqueados por rango y un índice único parcial como última defensa frente a doble reserva. El usuario puede elegir entre sedes del catálogo académico; no se valida su adscripción real.
- Cancelación: estado histórico CANCELADA, cupo reutilizable y auditoría dentro de la misma transacción. Anticipación mínima configurable; 2 horas por defecto, regla académica.
- Fechas: PostgreSQL TIMESTAMPTZ, intercambio ISO 8601 y visualización en Perú (UTC−5).
- Comprobantes: PDF de una página generado en el navegador con logotipo vectorial de Mi Salud, datos de cita, sede y aviso de alcance académico. No es un documento oficial de EsSalud.

## 9. Estructura
```text
essalud-citas/
  frontend/src/app/          Componentes, servicio API, rutas e interceptor
    calendar.ts              Calendario mensual de citas
    profile.ts               Perfil editable y fotografía
  frontend/src/styles.css   Diseño adaptable
  backend/src/main/java/pe/edu/citas/
    SecurityConfig.java     JWT y autorización
    AuthController.java     Registro y acceso y normalización de credenciales
    UserValidation.java     Reglas comunes de validación y unicidad
    BookingService.java     Reglas y transacciones
    ApiController.java      API del paciente/médico
    AdminController.java    Administración
    DemoData.java            Datos ficticios iniciales
  backend/src/main/resources/db/migration/V1__schema.sql
  backend/src/main/resources/db/migration/V2__catalogo_sedes_y_perfil.sql
  backend/src/main/resources/db/migration/V3__bloqueos_agenda.sql
  backend/src/main/resources/db/migration/V4__validaciones_unicas.sql
  database/                 Creación de base y consultas para pgAdmin
  tests/smoke.py             Pruebas contra PostgreSQL real
  VALIDACION.md              Resultado de validaciones de entrega
```

Se incluye `backend/citas.jar`, compilado desde este código. El script Windows lo ejecuta directamente. Después de modificar Java, ejecutar `mvn clean package` y reemplazar `citas.jar` por `target/citas-1.0.0.jar`, o usar `mvn spring-boot:run`.

## 10. Compilar y verificar
```bash
cd frontend
npm ci
npm run build
cd ../backend
mvn clean package
```
También puedes importar `tests/EsSalud.postman_collection.json` en Postman, configurar email/password y ejecutar primero el login; guarda el token automáticamente.

Pruebas de integración: con backend arrancado sobre una **base demo de pruebas**, definir DEMO_PASSWORD y ejecutar desde la raíz `python tests/smoke.py`. Usan Python 3 estándar, sin pip; crean pacientes ficticios y conservan citas/auditoría. No ejecutarlas sobre una base con datos reales.

## 11. Contrato principal de API
| Método | Ruta | Acceso |
|---|---|---|
| POST | /api/auth/register | Público; alta paciente |
| POST | /api/auth/login | Público; devuelve token, name, role y photo_data |
| GET/PUT | /api/me | Autenticado; PUT actualiza nombre, correo y fotografía (photoData) |
| GET | /api/facilities | Autenticado; catálogo referencial de sedes |
| GET | /api/specialties, /api/doctors?facilityCode=... | Autenticado; especialistas filtrados por sede; sin `facilityCode` devuelve todos los médicos activos de todas las sedes |
| GET | /api/slots?doctorId=1 | Autenticado |
| POST | /api/appointments | Paciente; `{"slotId":1}` |
| GET | /api/appointments | Citas propias o agenda del médico |
| PATCH | /api/appointments/1 | `{"status":"CANCELADA"}` / ATENDIDA / NO_ASISTIO |
| GET | /api/admin/appointments?page=0&date=&status=&doctorId=0&specialtyId=0&facilityCode= | Admin, páginas de 50 y filtros por fecha, estado, médico, especialidad y sede |
| GET/POST | /api/admin/doctors, /specialties, /slots | Admin; el alta de médico recibe `facilityCode` además de `specialtyId` |
| PUT | /api/admin/doctors/1, /specialties/1 | Admin; la edición de médico recibe `facilityCode` |
| PATCH | /api/admin/slots/1 | Admin; `{"blocked":true,"reason":"Bloqueo administrativo"}` |
| GET/POST | /api/admin/blocks | Admin; lista y crea bloqueos por rango de fecha/hora |
| PATCH | /api/admin/blocks/1 | Admin; `{"active":false}` desactiva o `true` reactiva el bloqueo |
| GET | /api/admin/patients, /summary, /audit | Admin |
| PATCH | /api/admin/patients/1 | Admin; `{"coverage":"VIGENTE","until":"2027-12-31"}` |

## 12. Solución de problemas
- **Connection refused:** iniciar servicio PostgreSQL y revisar host/puerto; comprobar DB_URL.
- **Password authentication failed:** contraseña de essalud_app incorrecta. La de postgres solo se usa para crear la base.
- **Unsupported release 21:** JAVA_HOME apunta a otra versión. Revisar `java -version` y `mvn -v`.
- **Puerto ocupado:** cerrar el otro proceso o configurar SERVER_PORT y el proxy.
- **401 al recargar:** la sesión vive en memoria; volver a iniciar sesión.
- **No se puede cancelar:** el turno está dentro del plazo mínimo o ya tiene un estado final.
- **No aparecen médicos al reservar:** en Filtros elige “Todas las sedes · Todos los médicos” y “Todos los médicos”; comprueba que los profesionales estén activos en Administración → Médicos. En modo demo, reinicia el backend para que se complete la semilla de médicos y horarios.
- **Agenda general vacía:** confirma que existan citas reservadas; la agenda lista reservas, no turnos libres. Usa “Limpiar filtros” para volver a consultar todas las citas.
- **No se puede bloquear un turno:** los turnos con una cita no se bloquean hasta resolver la reserva. Para cerrar un intervalo sin turnos existentes, usa “Bloquear un rango de atención” y registra el motivo.
- **No hay turnos:** crear nuevos horarios desde el administrador; la semilla completa turnos de demostración al iniciar el backend.
- **Tablas no aparecen:** refrescar Schemas → public → Tables después de iniciar backend.

## 13. Alcance pendiente para uso institucional
Este es un prototipo local, no una plataforma lista para datos reales. Quedan integración oficial de aseguramiento, recuperación de contraseña, verificación de correo, revocación de tokens, limitación de intentos de login, notificaciones, accesibilidad auditada, despliegue HTTPS, copias de seguridad operativas y pruebas de carga. No se envían correos ni SMS. El comprobante se imprime desde el navegador; no es un PDF oficial.
Los catálogos, agendas y auditoría tienen límites de lectura (200–500 registros); la agenda administrativa sí tiene paginación. Las sedes y especialidades incluidas son un catálogo referencial basado en información pública institucional y no equivalen a una oferta actualizada en tiempo real. La disponibilidad y adscripción deben verificarse por los canales oficiales. El registro de usuarios y el mantenimiento de catálogos no se auditan en esta versión; las operaciones de citas sí.

Referencias técnicas: https://angular.dev/reference/versions · https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html · https://www.postgresql.org/docs/17/

Referencias institucionales usadas para el catálogo referencial: https://www.essalud.gob.pe/downloads/memorias/memoria_anual_2022_12012023.pdf · https://www.essalud.gob.pe/nuestras-redes-asistenciales/cercado/ · https://www.essalud.gob.pe/servicios-primarios/
