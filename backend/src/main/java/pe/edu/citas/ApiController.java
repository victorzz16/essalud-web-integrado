package pe.edu.citas;

import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api")
public class ApiController {
    final JdbcTemplate db;
    final BookingService service;

    ApiController(JdbcTemplate db, BookingService service) {
        this.db = db;
        this.service = service;
    }

    long id(Jwt jwt) { return Long.parseLong(jwt.getSubject()); }

    @GetMapping("/me")
    public Object me(@AuthenticationPrincipal Jwt jwt) {
        return service.user(id(jwt));
    }

    record ProfileUpdate(
        @NotBlank(message = "Ingresa tus nombres y apellidos.")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres.")
        String name,
        @Email(message = "Ingresa un correo electrónico válido.")
        @NotBlank(message = "Ingresa tu correo electrónico.")
        @Size(max = 150, message = "El correo no puede superar 150 caracteres.")
        String email,
        @Size(max = 350000, message = "La fotografía es demasiado grande.")
        String photoData
    ) {}

    @PutMapping("/me")
    public Object updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProfileUpdate update) {
        long userId = id(jwt);
        service.user(userId);

        String name = UserValidation.cleanName(update.name());
        String email = UserValidation.normalizeEmail(update.email());
        UserValidation.validateName(name);
        UserValidation.ensureUniqueEmail(db, email, userId);

        String photo = update.photoData();
        if (photo != null && !photo.matches("^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$")) {
            BookingService.require(false, 400, "La fotografía debe ser JPG, PNG o WebP válida.");
        }
        db.update("UPDATE users SET name=?, email=?, photo_data=? WHERE id=?",
            name, email, photo, userId);
        return service.user(userId);
    }

    @GetMapping("/facilities")
    public Object facilities() {
        return db.queryForList("""
            SELECT code, name, region, district, address
            FROM facilities WHERE active = TRUE
            ORDER BY region, name
            """);
    }

    @GetMapping("/specialties")
    public Object specialties() {
        return db.queryForList("SELECT * FROM specialties WHERE active=true AND direct=true ORDER BY name");
    }

    @GetMapping("/doctors")
    public Object doctors(@AuthenticationPrincipal Jwt jwt,
                          @RequestParam(required = false) String facilityCode) {
        service.user(id(jwt)); // Verifica que la cuenta esté activa.
        String facility = facilityCode == null ? "" : facilityCode.trim();
        if (!facility.isEmpty()) {
            BookingService.require(
                db.queryForObject("SELECT count(*) FROM facilities WHERE code=? AND active=TRUE",
                    Long.class, facility) == 1,
                400,
                "Selecciona una sede válida y activa."
            );
        }
        return db.queryForList("""
            SELECT d.id, u.name, sp.name AS specialty, d.specialty_id,
                   u.facility AS facility_code, COALESCE(f.name,u.facility) AS facility,
                   d.active,
                   (SELECT count(*) FROM slots s
                    WHERE s.doctor_id=d.id AND NOT s.blocked AND s.starts_at>now()
                      AND NOT EXISTS(SELECT 1 FROM appointments a WHERE a.slot_id=s.id AND a.status<>'CANCELADA')
                      AND NOT EXISTS(SELECT 1 FROM schedule_blocks b WHERE b.doctor_id=d.id AND b.active
                                     AND b.starts_at<s.ends_at AND b.ends_at>s.starts_at)
                   ) AS available_slots,
                   (SELECT min(s.starts_at) FROM slots s
                    WHERE s.doctor_id=d.id AND NOT s.blocked AND s.starts_at>now()
                      AND NOT EXISTS(SELECT 1 FROM appointments a WHERE a.slot_id=s.id AND a.status<>'CANCELADA')
                      AND NOT EXISTS(SELECT 1 FROM schedule_blocks b WHERE b.doctor_id=d.id AND b.active
                                     AND b.starts_at<s.ends_at AND b.ends_at>s.starts_at)
                   ) AS next_available
            FROM doctors d
            JOIN users u ON u.id=d.user_id
            JOIN specialties sp ON sp.id=d.specialty_id
            LEFT JOIN facilities f ON f.code=u.facility
            WHERE d.active AND u.active AND sp.active AND sp.direct
              AND (? = '' OR u.facility = ?)
            ORDER BY u.name
            """, facility, facility);
    }

    @GetMapping("/slots")
    public Object slots(@RequestParam long doctorId) {
        BookingService.require(doctorId > 0, 400, "Selecciona un profesional válido.");
        BookingService.require(
            db.queryForObject("SELECT count(*) FROM doctors WHERE id=? AND active=TRUE", Long.class, doctorId) == 1,
            404,
            "El profesional no existe o está inactivo."
        );
        return db.queryForList("""
            SELECT s.id,s.starts_at,s.ends_at
            FROM slots s
            WHERE s.doctor_id=? AND NOT s.blocked AND s.starts_at>now()
              AND NOT EXISTS(SELECT 1 FROM appointments a WHERE a.slot_id=s.id AND a.status<>'CANCELADA')
              AND NOT EXISTS(SELECT 1 FROM schedule_blocks b WHERE b.doctor_id=s.doctor_id AND b.active
                             AND b.starts_at<s.ends_at AND b.ends_at>s.starts_at)
            ORDER BY s.starts_at LIMIT 300
            """, doctorId);
    }

    static final String APPOINTMENTS = """
        SELECT a.id,a.status,a.created_at,s.starts_at,s.ends_at,
               u.name AS doctor,p.name AS patient,sp.name AS specialty,
               d.id AS doctor_id,COALESCE(f.name,u.facility) AS facility
        FROM appointments a
        JOIN slots s ON s.id=a.slot_id
        JOIN doctors d ON d.id=s.doctor_id
        JOIN users u ON u.id=d.user_id
        JOIN users p ON p.id=a.patient_id
        JOIN specialties sp ON sp.id=d.specialty_id
        LEFT JOIN facilities f ON f.code=u.facility
        """;

    @GetMapping("/appointments")
    public Object appointments(@AuthenticationPrincipal Jwt jwt) {
        var u = service.user(id(jwt));
        String role = u.get("role").toString();
        BookingService.require(!role.equals("ADMIN"), 403, "Usa la agenda administrativa");
        return db.queryForList(APPOINTMENTS
            + (role.equals("MEDICO") ? "WHERE d.user_id=? " : "WHERE a.patient_id=? ")
            + "ORDER BY s.starts_at DESC LIMIT 500", id(jwt));
    }

    record Reserve(@Min(1) long slotId) {}
    record Change(@NotBlank String status) {}

    @PostMapping("/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    public Object reserve(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Reserve r) {
        return service.reserve(id(jwt), r.slotId());
    }

    @PatchMapping("/appointments/{appointmentId}")
    public Object change(@AuthenticationPrincipal Jwt jwt, @PathVariable long appointmentId,
                         @Valid @RequestBody Change r) {
        return service.change(id(jwt), appointmentId, r.status());
    }
}
