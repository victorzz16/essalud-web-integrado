package pe.edu.citas;

import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class Errors {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> rule(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(
            Map.of("message", exception.getReason() == null
                ? "Operación no permitida"
                : exception.getReason())
        );
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict(DataIntegrityViolationException exception) {
        String details = causeMessages(exception).toLowerCase();

        String message;
        if (details.contains("users_dni_key") || details.contains("users_dni_unique_idx")) {
            message = "El DNI ingresado ya está registrado. Verifica el número o inicia sesión con tu cuenta.";
        } else if (details.contains("users_email_key") || details.contains("users_email_lower_unique_idx")) {
            message = "El correo electrónico ya está registrado en otra cuenta.";
        } else if (details.contains("specialties_name_key") || details.contains("specialties_name_lower_unique_idx")) {
            message = "Esa especialidad ya existe. Escribe un nombre diferente.";
        } else {
            message = "Registro duplicado o datos relacionados no válidos. Revisa la información e inténtalo nuevamente.";
        }

        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> invalidFields(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getDefaultMessage())
            .filter(value -> value != null && !value.isBlank())
            .findFirst()
            .orElse("Revisa los campos y el formato de los datos.");
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler({
        IllegalArgumentException.class,
        org.springframework.http.converter.HttpMessageNotReadableException.class
    })
    ResponseEntity<?> invalid() {
        return ResponseEntity.badRequest().body(
            Map.of("message", "Revisa los campos y el formato de los datos.")
        );
    }

    private String causeMessages(Throwable exception) {
        StringBuilder messages = new StringBuilder();
        Throwable current = exception;
        while (current != null) {
            if (current.getMessage() != null) {
                messages.append(' ').append(current.getMessage());
            }
            current = current.getCause();
        }
        return messages.toString();
    }
}
