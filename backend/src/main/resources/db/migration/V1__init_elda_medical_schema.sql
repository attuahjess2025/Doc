-- Flyway Database Migration: V1__init_elda_medical_schema.sql
-- Target Database: PostgreSQL 15+ (Compatible with H2 in PostgreSQL Mode)

-- 1. Roles & Users (RBAC)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(30) PRIMARY KEY,
    description VARCHAR(255) NOT NULL
);

INSERT INTO roles (id, description) VALUES
('ROLE_ADMIN', 'System Administrator with full security and audit management'),
('ROLE_DOCTOR', 'Medical Doctor with diagnosis, encounter, and prescribing rights'),
('ROLE_NURSE', 'Clinical Nurse with vitals logging and patient triage rights'),
('ROLE_RECEPTIONIST', 'Front Desk Staff for patient intake and appointment management');

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role_id VARCHAR(30) NOT NULL REFERENCES roles(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patient Master Index
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    mrn VARCHAR(20) NOT NULL UNIQUE, -- E.g. ELD-2026-001
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(25),
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);

-- 3. Medical Background: Allergies & Chronic Conditions
CREATE TABLE IF NOT EXISTS patient_allergies (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    allergen VARCHAR(100) NOT NULL,
    severity VARCHAR(30) NOT NULL, -- MILD, MODERATE, SEVERE, ANAPHYLACTIC
    reaction VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS patient_chronic_conditions (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    condition_name VARCHAR(150) NOT NULL,
    diagnosed_date DATE,
    status VARCHAR(30) DEFAULT 'ACTIVE' -- ACTIVE, INACTIVE, REMISSION
);

-- 4. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
    reason VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);

-- 5. Clinical Encounters / Visits
CREATE TABLE IF NOT EXISTS clinical_visits (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
    appointment_id VARCHAR(36) REFERENCES appointments(id),
    encounter_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    chief_complaint TEXT NOT NULL,
    bp_systolic INT,
    bp_diastolic INT,
    heart_rate INT,
    temperature_c NUMERIC(4,1),
    resp_rate INT,
    weight_kg NUMERIC(5,2),
    height_cm NUMERIC(5,2),
    bmi NUMERIC(4,1),
    oxygen_sat INT,
    diagnosis_icd10 VARCHAR(100),
    clinical_notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visits_patient ON clinical_visits(patient_id);

-- 6. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id VARCHAR(36) PRIMARY KEY,
    visit_id VARCHAR(36) NOT NULL REFERENCES clinical_visits(id) ON DELETE CASCADE,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
    medication_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    instructions TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, DISCONTINUED
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit Logging (Security & HeFRAA Compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id),
    username VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    ip_address VARCHAR(45),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(created_at);
