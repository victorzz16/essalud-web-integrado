package pe.edu.citas;

import org.springframework.stereotype.Component;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@ConditionalOnProperty(name = "app.demo", havingValue = "true")
public class DemoData implements CommandLineRunner {
    private final JdbcTemplate db;
    private final PasswordEncoder encoder;
    private final String password;

    DemoData(JdbcTemplate db, PasswordEncoder encoder,
             @Value("${app.demo-password}") String password) {
        this.db = db;
        this.encoder = encoder;
        this.password = password;
    }

    private record UserSeed(String name, String email, String dni, String role, String facility) {}
    private record DoctorSeed(String name, String email, String dni, String specialty, String facility) {}

    @Override
    @Transactional
    public void run(String... args) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("DEMO_PASSWORD requiere al menos 8 caracteres");
        }

        ensureUser(new UserSeed("Administrador Demo", "admin@demo.pe", "90000000", "ADMIN", "DEMO-001"));
        ensureUser(new UserSeed("Lucía Torres", "paciente@demo.pe", "90000001", "PACIENTE", "LIMA-REBA"));

        // Profesionales que ya existían en la versión anterior del proyecto.
        ensureDoctor(new DoctorSeed("Andrés Rojas", "medico@demo.pe", "90000002", "Medicina general", "LIMA-REBA"));
        ensureDoctor(new DoctorSeed("Valeria Mendoza", "valeria@demo.pe", "90000003", "Odontología", "LIMA-ALME"));
        ensureDoctor(new DoctorSeed("Carlos Vega", "carlos@demo.pe", "90000004", "Obstetricia", "CALLAO-SAB"));
        ensureDoctor(new DoctorSeed("Ana Salazar", "ana@demo.pe", "90000005", "Psicología", "LAMB-ALM"));

        // Catálogo ampliado para la demostración académica. Las sedes y agendas no
        // representan disponibilidad oficial ni sustituyen la adscripción real.
        List<DoctorSeed> additionalDoctors = List.of(
            new DoctorSeed("María Fernanda Cárdenas", "cardiologia@demo.pe", "91000001", "Cardiología", "LIMA-REBA"),
            new DoctorSeed("Jorge Luis Paredes", "dermatologia@demo.pe", "91000002", "Dermatología", "LIMA-ALME"),
            new DoctorSeed("Paola Rivas", "endocrinologia@demo.pe", "91000003", "Endocrinología", "CALLAO-SAB"),
            new DoctorSeed("Renato Castillo", "gastroenterologia@demo.pe", "91000004", "Gastroenterología", "LIMA-GRAU"),
            new DoctorSeed("Elena Gutiérrez", "geriatria@demo.pe", "91000005", "Geriatría", "LIMA-REBA"),
            new DoctorSeed("Andrea Salazar", "ginecologia@demo.pe", "91000006", "Ginecología y obstetricia", "LAMB-ALM"),
            new DoctorSeed("Diego Valdivia", "pediatria@demo.pe", "91000007", "Pediatría", "JUNIN-PRI"),
            new DoctorSeed("Lucía Benavides", "neurologia@demo.pe", "91000008", "Neurología", "LIMA-ALME"),
            new DoctorSeed("Marco Villanueva", "neumologia@demo.pe", "91000009", "Neumología", "AREQ-SEGU"),
            new DoctorSeed("Silvia Torres", "nefrologia@demo.pe", "91000010", "Nefrología", "LIMA-REBA"),
            new DoctorSeed("Gabriela León", "oftalmologia@demo.pe", "91000011", "Oftalmología", "CALLAO-SAB"),
            new DoctorSeed("Alonso Núñez", "otorrino@demo.pe", "91000012", "Otorrinolaringología", "LIMA-GRAU"),
            new DoctorSeed("Pedro Ramírez", "traumatologia@demo.pe", "91000013", "Traumatología y ortopedia", "JUNIN-PRI"),
            new DoctorSeed("Camila Mendoza", "urologia@demo.pe", "91000014", "Urología", "LIMA-ALME"),
            new DoctorSeed("Patricia Flores", "psiquiatria@demo.pe", "91000015", "Psiquiatría", "LIMA-REBA"),
            new DoctorSeed("Ricardo Salas", "reumatologia@demo.pe", "91000016", "Reumatología", "AREQ-SEGU"),
            new DoctorSeed("Daniela Campos", "rehabilitacion@demo.pe", "91000017", "Medicina física y rehabilitación", "LAMB-ALM"),
            new DoctorSeed("Roberto Chávez", "cirugia@demo.pe", "91000018", "Cirugía general", "LIMA-GRAU"),
            new DoctorSeed("Mónica Pacheco", "medicinainterna@demo.pe", "91000019", "Medicina interna", "CALLAO-SAB"),
            new DoctorSeed("Fernando Ríos", "nutricion@demo.pe", "91000020", "Nutrición", "JUNIN-PRI"),
            new DoctorSeed("Cecilia Vargas", "medicinafamiliar@demo.pe", "91000021", "Medicina familiar y comunitaria", "AREQ-SEGU"),
            new DoctorSeed("José Miguel Herrera", "medicinademo@demo.pe", "91000022", "Medicina general", "DEMO-001")
        );
        additionalDoctors.forEach(this::ensureDoctor);

        // Genera horarios de demostración para todos los médicos y evita duplicados
        // cuando el backend se reinicia o se actualiza una base ya existente.
        db.update("""
            INSERT INTO slots(doctor_id, starts_at, ends_at)
            SELECT d.id,
                   ((CURRENT_DATE + day.n + time '08:00') AT TIME ZONE 'America/Lima') + k.n * interval '30 minutes',
                   ((CURRENT_DATE + day.n + time '08:00') AT TIME ZONE 'America/Lima') + (k.n + 1) * interval '30 minutes'
            FROM doctors d
            CROSS JOIN generate_series(1, 14) day(n)
            CROSS JOIN generate_series(0, 7) k(n)
            ON CONFLICT (doctor_id, starts_at) DO NOTHING
            """);
    }

    private long ensureUser(UserSeed seed) {
        var existing = db.queryForList("SELECT id FROM users WHERE email = ?", seed.email());
        if (!existing.isEmpty()) {
            long id = ((Number) existing.getFirst().get("id")).longValue();
            if (seed.role().equals("MEDICO")) {
                db.update("UPDATE users SET facility = ? WHERE id = ?", seed.facility(), id);
            }
            return id;
        }
        String dni = seed.dni();
        while (db.queryForObject("SELECT count(*) FROM users WHERE dni=?", Long.class, dni) > 0) {
            int next = Integer.parseInt(dni) + 1;
            if (next > 99999999) throw new IllegalStateException("No hay DNI demo disponible para " + seed.email());
            dni = String.format(java.util.Locale.ROOT, "%08d", next);
        }
        return db.queryForObject(
            "INSERT INTO users(name,dni,email,password,role,facility) VALUES(?,?,?,?,?,?) RETURNING id",
            Long.class, seed.name(), dni, seed.email(), encoder.encode(password), seed.role(), seed.facility()
        );
    }

    private void ensureDoctor(DoctorSeed seed) {
        db.update("INSERT INTO specialties(name) VALUES(?) ON CONFLICT(name) DO NOTHING", seed.specialty());
        long userId = ensureUser(new UserSeed(seed.name(), seed.email(), seed.dni(), "MEDICO", seed.facility()));
        long specialtyId = db.queryForObject("SELECT id FROM specialties WHERE name = ?", Long.class, seed.specialty());
        db.update("""
            INSERT INTO doctors(user_id, specialty_id, active) VALUES(?,?,TRUE)
            ON CONFLICT(user_id) DO UPDATE SET specialty_id = EXCLUDED.specialty_id, active = TRUE
            """, userId, specialtyId);
    }
}
