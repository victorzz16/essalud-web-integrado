package pe.edu.citas;

import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Reglas comunes de validación para nombres, correos, DNI y especialidades.
 * La unicidad se comprueba en la aplicación y se respalda con índices únicos
 * en PostgreSQL para cubrir también solicitudes simultáneas.
 */
final class UserValidation {
    private static final Pattern PERSON_NAME =
        Pattern.compile("(?U)^[\\p{L}][\\p{L}\\p{M} .'-]{1,99}$");

    private static final Pattern SPECIALTY_NAME =
        Pattern.compile("(?U)^[\\p{L}][\\p{L}\\p{M}0-9 .&/+()'-]{1,99}$");

    private UserValidation() {}

    static String cleanName(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    static void validateName(String value) {
        String name = cleanName(value);
        BookingService.require(
            name.length() >= 2 && name.length() <= 100 && PERSON_NAME.matcher(name).matches(),
            400,
            "El nombre debe tener entre 2 y 100 caracteres y solo puede incluir letras, espacios, apóstrofes, puntos o guiones."
        );
    }

    static String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    static void validatePassword(String value) {
        BookingService.require(
            value != null && value.length() >= 8 && value.length() <= 64 && !value.isBlank(),
            400,
            "La contraseña debe tener entre 8 y 64 caracteres y no puede estar vacía."
        );
    }

    static void ensureUniqueIdentity(JdbcTemplate db, String dni, String email) {
        Long dniCount = db.queryForObject(
            "SELECT count(*) FROM users WHERE dni = ?", Long.class, dni
        );
        BookingService.require(
            dniCount == null || dniCount == 0,
            409,
            "El DNI ingresado ya está registrado. Verifica el número o inicia sesión con tu cuenta."
        );
        ensureUniqueEmail(db, email, null);
    }

    static void ensureUniqueEmail(JdbcTemplate db, String email, Long exceptUserId) {
        String sql = "SELECT count(*) FROM users WHERE lower(btrim(email)) = lower(btrim(?))"
            + (exceptUserId == null ? "" : " AND id <> ?");
        Long count = exceptUserId == null
            ? db.queryForObject(sql, Long.class, email)
            : db.queryForObject(sql, Long.class, email, exceptUserId);
        BookingService.require(
            count == null || count == 0,
            409,
            "El correo electrónico ya está registrado en otra cuenta."
        );
    }

    static String cleanSpecialtyName(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    static void validateSpecialtyName(String value) {
        String name = cleanSpecialtyName(value);
        BookingService.require(
            name.length() >= 2 && name.length() <= 100 && SPECIALTY_NAME.matcher(name).matches(),
            400,
            "La especialidad debe tener entre 2 y 100 caracteres y contener un nombre válido."
        );
    }

    static void ensureUniqueSpecialty(JdbcTemplate db, String name, Long exceptId) {
        String sql = "SELECT count(*) FROM specialties WHERE lower(btrim(name)) = lower(btrim(?))"
            + (exceptId == null ? "" : " AND id <> ?");
        Long count = exceptId == null
            ? db.queryForObject(sql, Long.class, name)
            : db.queryForObject(sql, Long.class, name, exceptId);
        BookingService.require(
            count == null || count == 0,
            409,
            "Esa especialidad ya existe. Escribe un nombre diferente."
        );
    }
}
