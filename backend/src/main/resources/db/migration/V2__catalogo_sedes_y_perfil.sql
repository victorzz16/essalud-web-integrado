CREATE TABLE facilities (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    region VARCHAR(80) NOT NULL,
    district VARCHAR(80) NOT NULL,
    address VARCHAR(200),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE users ADD COLUMN photo_data TEXT;

INSERT INTO facilities(code, name, region, district, address) VALUES
('DEMO-001', 'Sede académica de demostración', 'Lima', 'Lima', 'Dirección referencial del proyecto'),
('LIMA-REBA', 'Hospital Nacional Edgardo Rebagliati Martins', 'Lima', 'Jesús María', 'Av. Domingo Cueto, Jesús María'),
('LIMA-ALME', 'Hospital Nacional Guillermo Almenara Irigoyen', 'Lima', 'La Victoria', 'Av. Grau 800, La Victoria'),
('CALLAO-SAB', 'Hospital Nacional Alberto Sabogal Sologuren', 'Callao', 'Bellavista', 'Callao'),
('LIMA-GRAU', 'Hospital III de Emergencias Grau', 'Lima', 'Cercado de Lima', 'Av. Grau 351, Cercado de Lima'),
('LAMB-ALM', 'Hospital Nacional Almanzor Aguinaga Asenjo', 'Lambayeque', 'Chiclayo', 'Chiclayo, Lambayeque'),
('JUNIN-PRI', 'Hospital Nacional Ramiro Prialé Prialé', 'Junín', 'Huancayo', 'Huancayo, Junín'),
('AREQ-SEGU', 'Hospital Nacional Carlos Alberto Seguín Escobedo', 'Arequipa', 'Arequipa', 'Arequipa')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE users ALTER COLUMN facility SET DEFAULT 'LIMA-REBA';
UPDATE users SET facility='LIMA-REBA' WHERE role='PACIENTE' AND facility='DEMO-001';

INSERT INTO specialties(name, active, direct) VALUES
('Medicina general', TRUE, TRUE),
('Odontología', TRUE, TRUE),
('Obstetricia', TRUE, TRUE),
('Psicología', TRUE, TRUE),
('Medicina interna', TRUE, TRUE),
('Cardiología', TRUE, TRUE),
('Dermatología', TRUE, TRUE),
('Endocrinología', TRUE, TRUE),
('Gastroenterología', TRUE, TRUE),
('Geriatría', TRUE, TRUE),
('Ginecología y obstetricia', TRUE, TRUE),
('Pediatría', TRUE, TRUE),
('Neurología', TRUE, TRUE),
('Neumología', TRUE, TRUE),
('Nefrología', TRUE, TRUE),
('Oftalmología', TRUE, TRUE),
('Otorrinolaringología', TRUE, TRUE),
('Traumatología y ortopedia', TRUE, TRUE),
('Urología', TRUE, TRUE),
('Psiquiatría', TRUE, TRUE),
('Reumatología', TRUE, TRUE),
('Medicina física y rehabilitación', TRUE, TRUE),
('Cirugía general', TRUE, TRUE),
('Nutrición', TRUE, TRUE),
('Medicina familiar y comunitaria', TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;
