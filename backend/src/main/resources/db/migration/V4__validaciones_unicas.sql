-- Normaliza los valores existentes antes de activar la unicidad sin distinguir mayúsculas.
-- Si hubiera duplicados históricos, la migración se detendrá sin borrar cuentas ni datos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        GROUP BY lower(btrim(email))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Hay correos duplicados al ignorar mayúsculas o espacios. Corrígelos antes de aplicar V4.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM specialties
        GROUP BY lower(btrim(name))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Hay especialidades duplicadas al ignorar mayúsculas o espacios. Corrígelas antes de aplicar V4.';
    END IF;
END $$;

UPDATE users SET email = lower(btrim(email));
UPDATE specialties SET name = btrim(name);

-- El DNI ya cuenta con UNIQUE y CHECK de ocho dígitos en V1.
-- Estos índices evitan duplicados como correo@dominio.pe / CORREO@DOMINIO.PE
-- y "Medicina general" / " MEDICINA GENERAL ".
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx
    ON users (lower(btrim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS specialties_name_lower_unique_idx
    ON specialties (lower(btrim(name)));
