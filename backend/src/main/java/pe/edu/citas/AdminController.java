package pe.edu.citas;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    final JdbcTemplate db;
    final BookingService service;
    final PasswordEncoder passwords;

    AdminController(JdbcTemplate db, BookingService service, PasswordEncoder passwords) {
        this.db = db;
        this.service = service;
        this.passwords = passwords;
    }

    @GetMapping("/summary")
    public Object summary() {
        return Map.of(
            "patients", db.queryForObject("SELECT count(*) FROM users WHERE role='PACIENTE'", Long.class),
            "doctors", db.queryForObject("SELECT count(*) FROM doctors WHERE active", Long.class),
            "appointments", db.queryForObject("SELECT count(*) FROM appointments WHERE status='RESERVADA'", Long.class)
        );
    }

    @GetMapping("/appointments")
    public Object appointments(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "") String date,
        @RequestParam(defaultValue = "") String status,
        @RequestParam(defaultValue = "0") long doctorId,
        @RequestParam(defaultValue = "0") long specialtyId,
        @RequestParam(defaultValue = "") String facilityCode
    ) {
        BookingService.require(page >= 0 && page < 100000, 400, "Página inválida");
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        String normalizedDate = date == null ? "" : date.trim();
        String normalizedFacility = facilityCode == null ? "" : facilityCode.trim();

        BookingService.require(doctorId >= 0 && specialtyId >= 0, 400,
            "Los filtros de médico y especialidad no pueden ser negativos.");
        if (doctorId > 0) {
            BookingService.require(db.queryForObject("SELECT count(*) FROM doctors WHERE id=?",
                Long.class, doctorId) == 1, 400, "El médico seleccionado no existe.");
        }
        if (specialtyId > 0) {
            BookingService.require(db.queryForObject("SELECT count(*) FROM specialties WHERE id=?",
                Long.class, specialtyId) == 1, 400, "La especialidad seleccionada no existe.");
        }
        BookingService.require(Set.of("", "RESERVADA", "CANCELADA", "ATENDIDA", "NO_ASISTIO")
            .contains(normalizedStatus), 400, "Selecciona un estado de cita válido.");

        if (!normalizedDate.isEmpty()) {
            try {
                LocalDate.parse(normalizedDate);
            } catch (DateTimeParseException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La fecha debe tener el formato AAAA-MM-DD.");
            }
        }
        if (!normalizedFacility.isEmpty()) {
            BookingService.require(
                db.queryForObject("SELECT count(*) FROM facilities WHERE code=? AND active=TRUE",
                    Long.class, normalizedFacility) == 1,
                400,
                "Selecciona una sede válida y activa."
            );
        }

        return db.queryForList(ApiController.APPOINTMENTS + """
            WHERE (? = '' OR to_char(s.starts_at AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') = ?)
              AND (? = '' OR a.status = ?)
              AND (? = 0 OR d.id = ?)
              AND (? = 0 OR sp.id = ?)
              AND (? = '' OR u.facility = ?)
            ORDER BY s.starts_at ASC
            LIMIT 50 OFFSET ?
            """,
            normalizedDate, normalizedDate,
            normalizedStatus, normalizedStatus,
            doctorId, doctorId,
            specialtyId, specialtyId,
            normalizedFacility, normalizedFacility,
            page * 50
        );
    }

    @GetMapping("/specialties")
    public Object specialties() {
        return db.queryForList("SELECT * FROM specialties ORDER BY name");
    }

    record Specialty(
        @NotBlank(message = "Ingresa el nombre de la especialidad.")
        @Size(min = 2, max = 100, message = "La especialidad debe tener entre 2 y 100 caracteres.")
        String name,
        boolean active,
        boolean direct
    ) {}

    @PostMapping("/specialties")
    public Object specialty(@Valid @RequestBody Specialty request) {
        String name = UserValidation.cleanSpecialtyName(request.name());
        UserValidation.validateSpecialtyName(name);
        UserValidation.ensureUniqueSpecialty(db, name, null);
        return service.one(
            "INSERT INTO specialties(name,active,direct) VALUES(?,?,?) RETURNING *",
            name, request.active(), request.direct()
        );
    }

    @PutMapping("/specialties/{id}")
    public Object specialty(@PathVariable long id, @Valid @RequestBody Specialty request) {
        String name = UserValidation.cleanSpecialtyName(request.name());
        UserValidation.validateSpecialtyName(name);
        UserValidation.ensureUniqueSpecialty(db, name, id);
        return service.one(
            "UPDATE specialties SET name=?,active=?,direct=? WHERE id=? RETURNING *",
            name, request.active(), request.direct(), id
        );
    }

    @GetMapping("/doctors")
    public Object doctors() {
        return db.queryForList("""
            SELECT d.id, u.name, u.email, d.specialty_id, d.active,
                   sp.name AS specialty, u.facility AS facility_code,
                   COALESCE(f.name,u.facility) AS facility
            FROM doctors d
            JOIN users u ON u.id=d.user_id
            JOIN specialties sp ON sp.id=d.specialty_id
            LEFT JOIN facilities f ON f.code=u.facility
            ORDER BY u.name
            """);
    }

    record Doctor(
        @NotBlank(message = "Ingresa los nombres y apellidos del profesional.")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres.")
        String name,
        @NotBlank(message = "Ingresa el DNI del profesional.")
        @Pattern(regexp = "^[0-9]{8}$", message = "El DNI debe contener exactamente 8 dígitos numéricos.")
        String dni,
        @NotBlank(message = "Ingresa el correo del profesional.")
        @Email(message = "Ingresa un correo electrónico válido.")
        @Size(max = 150, message = "El correo no puede superar 150 caracteres.")
        String email,
        @NotBlank(message = "Ingresa una contraseña inicial.")
        @Size(min = 8, max = 64, message = "La contraseña debe tener entre 8 y 64 caracteres.")
        String password,
        @Min(value = 1, message = "Selecciona una especialidad válida.")
        long specialtyId,
        @NotBlank(message = "Selecciona una sede de atención.")
        @Size(max = 30, message = "El código de sede no es válido.")
        String facilityCode
    ) {}

    @PostMapping("/doctors")
    @Transactional
    public Object doctor(@Valid @RequestBody Doctor request) {
        String name = UserValidation.cleanName(request.name());
        String dni = request.dni().trim();
        String email = UserValidation.normalizeEmail(request.email());
        String facilityCode = request.facilityCode().trim();

        UserValidation.validateName(name);
        UserValidation.validatePassword(request.password());
        UserValidation.ensureUniqueIdentity(db, dni, email);

        BookingService.require(
            db.queryForObject("SELECT count(*) FROM facilities WHERE code=? AND active=TRUE", Long.class, facilityCode) == 1,
            400, "Selecciona una sede válida y activa."
        );
        BookingService.require(
            db.queryForObject("SELECT count(*) FROM specialties WHERE id=? AND active=TRUE", Long.class, request.specialtyId()) == 1,
            400, "Selecciona una especialidad activa."
        );
        var user = service.one(
            "INSERT INTO users(name,dni,email,password,role,facility) VALUES(?,?,?,?,'MEDICO',?) RETURNING id",
            name, dni, email, passwords.encode(request.password()), facilityCode
        );
        return service.one(
            "INSERT INTO doctors(user_id,specialty_id) VALUES(?,?) RETURNING *",
            user.get("id"), request.specialtyId()
        );
    }

    record DoctorEdit(
        @NotBlank(message = "Ingresa los nombres y apellidos del profesional.")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres.")
        String name,
        @Min(value = 1, message = "Selecciona una especialidad válida.")
        long specialtyId,
        @NotBlank(message = "Selecciona una sede de atención.")
        @Size(max = 30, message = "El código de sede no es válido.")
        String facilityCode,
        boolean active
    ) {}

    @PutMapping("/doctors/{id}")
    @Transactional
    public Object editDoctor(@PathVariable long id, @Valid @RequestBody DoctorEdit request) {
        String name = UserValidation.cleanName(request.name());
        UserValidation.validateName(name);
        String facilityCode = request.facilityCode().trim();
        BookingService.require(
            db.queryForObject("SELECT count(*) FROM facilities WHERE code=? AND active=TRUE", Long.class, facilityCode) == 1,
            400, "Selecciona una sede válida y activa."
        );
        BookingService.require(
            db.queryForObject("SELECT count(*) FROM specialties WHERE id=? AND active=TRUE", Long.class, request.specialtyId()) == 1,
            400, "Selecciona una especialidad activa."
        );
        var doctor = service.one(
            "UPDATE doctors SET specialty_id=?,active=? WHERE id=? RETURNING *",
            request.specialtyId(), request.active(), id
        );
        db.update("UPDATE users SET name=?,facility=? WHERE id=?",
            name, facilityCode, doctor.get("user_id"));
        return doctor;
    }

    @GetMapping("/slots")
    public Object slots() {
        return db.queryForList("""
            SELECT s.id, s.doctor_id, s.starts_at, s.ends_at, s.blocked, s.block_reason,
                   u.name AS doctor, sp.name AS specialty,
                   COALESCE(f.name,u.facility) AS facility,
                   COALESCE(a.status,'DISPONIBLE') AS appointment_status,
                   p.name AS patient,
                   EXISTS (
                       SELECT 1 FROM schedule_blocks b
                       WHERE b.doctor_id=s.doctor_id AND b.active
                         AND b.starts_at < s.ends_at AND b.ends_at > s.starts_at
                   ) AS range_blocked,
                   (SELECT b.reason FROM schedule_blocks b
                    WHERE b.doctor_id=s.doctor_id AND b.active
                      AND b.starts_at < s.ends_at AND b.ends_at > s.starts_at
                    ORDER BY b.id DESC LIMIT 1) AS range_block_reason
            FROM slots s
            JOIN doctors d ON d.id=s.doctor_id
            JOIN users u ON u.id=d.user_id
            JOIN specialties sp ON sp.id=d.specialty_id
            LEFT JOIN facilities f ON f.code=u.facility
            LEFT JOIN appointments a ON a.slot_id=s.id AND a.status<>'CANCELADA'
            LEFT JOIN users p ON p.id=a.patient_id
            WHERE s.ends_at > now()
            ORDER BY s.starts_at ASC
            LIMIT 1000
            """);
    }

    record Slot(@Min(1) long doctorId, @NotNull OffsetDateTime startsAt, @NotNull OffsetDateTime endsAt) {}

    @PostMapping("/slots")
    @Transactional
    public Object slot(@Valid @RequestBody Slot request) {
        service.one("SELECT id FROM doctors WHERE id=? AND active=TRUE FOR UPDATE", request.doctorId());
        BookingService.require(request.startsAt().isAfter(OffsetDateTime.now())
            && request.endsAt().isAfter(request.startsAt()), 400, "Intervalo inválido o pasado.");
        BookingService.require(db.queryForObject(
            "SELECT count(*) FROM slots WHERE doctor_id=? AND starts_at<? AND ends_at>?",
            Long.class, request.doctorId(), request.endsAt(), request.startsAt()) == 0,
            409, "El horario se superpone con otro turno registrado.");
        BookingService.require(db.queryForObject(
            "SELECT count(*) FROM schedule_blocks WHERE doctor_id=? AND active AND starts_at<? AND ends_at>?",
            Long.class, request.doctorId(), request.endsAt(), request.startsAt()) == 0,
            409, "No se puede publicar un turno dentro de un bloqueo de agenda.");
        return service.one(
            "INSERT INTO slots(doctor_id,starts_at,ends_at) VALUES(?,?,?) RETURNING *",
            request.doctorId(), request.startsAt(), request.endsAt()
        );
    }

    record BlockSlot(boolean blocked, @Size(max = 250) String reason) {}

    @PatchMapping("/slots/{id}")
    @Transactional
    public Object blockSlot(@PathVariable long id, @Valid @RequestBody BlockSlot request) {
        service.one("SELECT id FROM slots WHERE id=? FOR UPDATE", id);
        BookingService.require(!request.blocked() || db.queryForObject(
            "SELECT count(*) FROM appointments WHERE slot_id=? AND status<>'CANCELADA'", Long.class, id) == 0,
            409, "Este horario tiene una cita registrada. Cancela o reprograma la cita antes de bloquearlo.");
        String reason = request.blocked()
            ? (request.reason() == null || request.reason().isBlank() ? "Bloqueo administrativo" : request.reason().trim())
            : null;
        return service.one(
            "UPDATE slots SET blocked=?,block_reason=? WHERE id=? RETURNING *",
            request.blocked(), reason, id
        );
    }

    @GetMapping("/blocks")
    public Object blocks() {
        return db.queryForList("""
            SELECT b.id,b.doctor_id,b.starts_at,b.ends_at,b.reason,b.active,
                   u.name AS doctor, COALESCE(f.name,u.facility) AS facility
            FROM schedule_blocks b
            JOIN doctors d ON d.id=b.doctor_id
            JOIN users u ON u.id=d.user_id
            LEFT JOIN facilities f ON f.code=u.facility
            ORDER BY b.starts_at DESC
            LIMIT 1000
            """);
    }

    record BlockRange(@Min(1) long doctorId, @NotNull OffsetDateTime startsAt,
                      @NotNull OffsetDateTime endsAt, @NotBlank @Size(max = 250) String reason) {}

    @PostMapping("/blocks")
    @Transactional
    public Object createBlock(@Valid @RequestBody BlockRange request) {
        BookingService.require(request.reason().trim().length() >= 3, 400,
            "El motivo del bloqueo debe contener al menos 3 caracteres.");
        service.one("SELECT id FROM doctors WHERE id=? AND active=TRUE FOR UPDATE", request.doctorId());
        BookingService.require(request.startsAt().isAfter(OffsetDateTime.now())
            && request.endsAt().isAfter(request.startsAt()), 400, "El rango de bloqueo debe ser futuro y tener una hora final posterior.");
        BookingService.require(db.queryForObject("""
            SELECT count(*) FROM appointments a
            JOIN slots s ON s.id=a.slot_id
            WHERE s.doctor_id=? AND a.status<>'CANCELADA'
              AND s.starts_at < ? AND s.ends_at > ?
            """, Long.class, request.doctorId(), request.endsAt(), request.startsAt()) == 0,
            409, "El rango incluye una cita reservada o atendida. Resuelve primero esa cita.");
        BookingService.require(db.queryForObject(
            "SELECT count(*) FROM schedule_blocks WHERE doctor_id=? AND active AND starts_at<? AND ends_at>?",
            Long.class, request.doctorId(), request.endsAt(), request.startsAt()) == 0,
            409, "El rango se superpone con otro bloqueo activo.");
        return service.one(
            "INSERT INTO schedule_blocks(doctor_id,starts_at,ends_at,reason) VALUES(?,?,?,?) RETURNING *",
            request.doctorId(), request.startsAt(), request.endsAt(), request.reason().trim()
        );
    }

    record BlockStatus(boolean active) {}

    @PatchMapping("/blocks/{id}")
    @Transactional
    public Object toggleBlock(@PathVariable long id, @Valid @RequestBody BlockStatus request) {
        var block = service.one("SELECT * FROM schedule_blocks WHERE id=? FOR UPDATE", id);
        if (request.active()) {
            service.one("SELECT id FROM doctors WHERE id=? FOR UPDATE", block.get("doctor_id"));
            BookingService.require(db.queryForObject("""
                SELECT count(*) FROM appointments a
                JOIN slots s ON s.id=a.slot_id
                WHERE s.doctor_id=? AND a.status<>'CANCELADA'
                  AND s.starts_at < ? AND s.ends_at > ?
                """, Long.class, block.get("doctor_id"), block.get("ends_at"), block.get("starts_at")) == 0,
                409, "No se puede reactivar el bloqueo porque ya existe una cita dentro de ese rango.");
        }
        return service.one("UPDATE schedule_blocks SET active=? WHERE id=? RETURNING *", request.active(), id);
    }

    @GetMapping("/patients")
    public Object patients() {
        return db.queryForList("SELECT id,name,dni,coverage,coverage_until,facility FROM users WHERE role='PACIENTE' ORDER BY id LIMIT 500");
    }

    record Coverage(
        @NotNull(message = "Selecciona un estado de cobertura válido.")
        @Pattern(regexp = "VIGENTE|VENCIDA|NO_VERIFICABLE",
            message = "El estado debe ser VIGENTE, VENCIDA o NO_VERIFICABLE.")
        String coverage,
        @NotNull(message = "Selecciona una fecha de vencimiento.")
        LocalDate until
    ) {}

    @PatchMapping("/patients/{id}")
    @Transactional
    public Object coverage(@PathVariable long id, @Valid @RequestBody Coverage request) {
        service.one("SELECT id FROM users WHERE id=? AND role='PACIENTE' FOR UPDATE", id);
        LocalDate today = LocalDate.now(ZoneId.of("America/Lima"));
        if ("VIGENTE".equals(request.coverage())) {
            BookingService.require(!request.until().isBefore(today), 400,
                "Una cobertura vigente debe tener una fecha de vencimiento igual o posterior a hoy.");
        } else if ("VENCIDA".equals(request.coverage())) {
            BookingService.require(request.until().isBefore(today), 400,
                "Una cobertura vencida debe tener una fecha de vencimiento anterior a hoy.");
        }
        return service.one("UPDATE users SET coverage=?,coverage_until=? WHERE id=? RETURNING id,coverage,coverage_until",
            request.coverage(), request.until(), id);
    }

    @GetMapping("/audit")
    public Object audit() {
        return db.queryForList("SELECT a.*,u.name AS actor FROM audit a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 200");
    }
}
