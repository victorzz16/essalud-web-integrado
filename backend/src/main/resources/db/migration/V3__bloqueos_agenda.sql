ALTER TABLE slots
    ADD COLUMN IF NOT EXISTS block_reason VARCHAR(250);

CREATE TABLE IF NOT EXISTS schedule_blocks (
    id BIGSERIAL PRIMARY KEY,
    doctor_id BIGINT NOT NULL REFERENCES doctors(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(250) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT schedule_blocks_valid_interval CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS schedule_blocks_doctor_interval_idx
    ON schedule_blocks(doctor_id, starts_at, ends_at)
    WHERE active = TRUE;
