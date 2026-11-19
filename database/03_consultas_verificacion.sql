-- Abrir Query Tool sobre essalud_citas (después de iniciar el backend).
SELECT id,name,email,role,facility,coverage,coverage_until FROM users;
SELECT a.id,p.name AS paciente,u.name AS medico,s.starts_at AT TIME ZONE 'America/Lima' AS hora_peru,a.status
FROM appointments a JOIN users p ON p.id=a.patient_id JOIN slots s ON s.id=a.slot_id JOIN doctors d ON d.id=s.doctor_id JOIN users u ON u.id=d.user_id ORDER BY a.id DESC;
SELECT * FROM audit ORDER BY id DESC;
-- Debe devolver CERO filas:
SELECT slot_id,count(*) FROM appointments WHERE status <> 'CANCELADA' GROUP BY slot_id HAVING count(*)>1;
SELECT * FROM flyway_schema_history;

-- Deben devolver CERO filas: no debe haber correos ni especialidades duplicados
-- al ignorar mayúsculas y espacios.
SELECT lower(btrim(email)) AS correo_normalizado, count(*)
FROM users
GROUP BY lower(btrim(email))
HAVING count(*) > 1;

SELECT lower(btrim(name)) AS especialidad_normalizada, count(*)
FROM specialties
GROUP BY lower(btrim(name))
HAVING count(*) > 1;

-- Índices de unicidad incorporados por V4.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('users_email_lower_unique_idx', 'specialties_name_lower_unique_idx');
