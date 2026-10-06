export type UserRole = 'ROLE_ADMIN' | 'ROLE_DOCTOR' | 'ROLE_NURSE' | 'ROLE_RECEPTIONIST';



export interface User {
  id: string;
  username: string;
  name?: string; // Made optional
  email: string;
  firstName: string;
  lastName: string;
  role?: string | { id: string; description?: string }; // Added role property
  roles?: string[];
  active?: boolean;
}

export interface Allergy {
  id: string;
  allergen: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'ANAPHYLACTIC';
  reaction: string;
}

export interface ChronicCondition {
  id: string;
  conditionName: string;
  diagnosedDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'REMISSION';
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  name?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  allergies?: Allergy[];
  chronicConditions?: ChronicCondition[];
  lastVisit?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | string;
  createdAt?: string;
  updatedAt?: string;
}

export type AppointmentStatus = 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string;
  room?: string;
  notes?: string;
  createdAt: string;
}

export interface Prescription {
  id: string;
  visitId?: string;
  patientId: string;
  doctorId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
  issuedAt: string;
}

export interface Vitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  temperatureC?: number;
  respRate?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  oxygenSat?: number;
}

export interface ClinicalVisit {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  encounterTime: string;
  chiefComplaint: string;
  vitals: Vitals;
  diagnosisIcd10: string;
  diagnosisDescription: string;
  clinicalNotes: string;
  prescriptions: Prescription[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  actor?: string;
  action: 'READ_PATIENT' | 'CREATE_PATIENT' | 'UPDATE_PATIENT' | 'CREATE_ENCOUNTER' | 'ISSUE_PRESCRIPTION' | 'SCHEDULE_APPOINTMENT' | 'LOGIN';
  eventType?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  entityName: string;
  entityId: string;
  ipAddress: string;
  details: string;
  createdAt: string;
  patient?: any;
  time?: string;
  mrn?: string;
  type?: string;
  clinician?: string;
}
