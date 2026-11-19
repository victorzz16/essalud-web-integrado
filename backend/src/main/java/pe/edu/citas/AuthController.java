package pe.edu.citas;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    final JdbcTemplate db;
    final PasswordEncoder passwords;
    final JwtEncoder jwt;

    AuthController(JdbcTemplate db, PasswordEncoder passwords, JwtEncoder jwt) {
        this.db = db;
        this.passwords = passwords;
        this.jwt = jwt;
    }

    record Login(
        @NotBlank(message = "Ingresa tu correo electrónico.")
        @Email(message = "Ingresa un correo electrónico válido.")
        @Size(max = 150, message = "El correo no puede superar 150 caracteres.")
        String email,
        @NotBlank(message = "Ingresa tu contraseña.")
        String password
    ) {}

    record Register(
        @NotBlank(message = "Ingresa tus nombres y apellidos.")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres.")
        String name,

        @NotBlank(message = "Ingresa tu DNI.")
        @Pattern(regexp = "^[0-9]{8}$", message = "El DNI debe contener exactamente 8 dígitos numéricos.")
        String dni,

        @NotBlank(message = "Ingresa tu correo electrónico.")
        @Email(message = "Ingresa un correo electrónico válido.")
        @Size(max = 150, message = "El correo no puede superar 150 caracteres.")
        String email,

        @NotBlank(message = "Ingresa una contraseña.")
        @Size(min = 8, max = 64, message = "La contraseña debe tener entre 8 y 64 caracteres.")
        String password
    ) {}

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(@Valid @RequestBody Register request) {
        String name = UserValidation.cleanName(request.name());
        String dni = request.dni().trim();
        String email = UserValidation.normalizeEmail(request.email());

        UserValidation.validateName(name);
        UserValidation.validatePassword(request.password());
        UserValidation.ensureUniqueIdentity(db, dni, email);

        db.update(
            "INSERT INTO users(name,dni,email,password,role) VALUES(?,?,?,?, 'PACIENTE')",
            name, dni, email, passwords.encode(request.password())
        );
        return Map.of("message", "Cuenta creada. Inicia sesión.");
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody Login request) {
        String email = UserValidation.normalizeEmail(request.email());
        var rows = db.queryForList(
            "SELECT * FROM users WHERE lower(btrim(email)) = lower(btrim(?)) AND active = true",
            email
        );

        if (rows.isEmpty()
            || !passwords.matches(request.password(), (String) rows.getFirst().get("password"))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
        }

        var user = rows.getFirst();
        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
            .issuer("essalud-demo")
            .subject(user.get("id").toString())
            .issuedAt(now)
            .expiresAt(now.plusSeconds(3600))
            .claim("role", user.get("role"))
            .build();

        String token = jwt.encode(
            JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                claims
            )
        ).getTokenValue();

        var response = new HashMap<String, Object>();
        response.put("token", token);
        response.put("name", user.get("name"));
        response.put("role", user.get("role"));
        response.put("photo_data", user.get("photo_data"));
        return response;
    }
}
