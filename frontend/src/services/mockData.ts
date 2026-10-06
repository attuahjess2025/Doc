import { Patient, Appointment, ClinicalVisit, AuditLog, User } from '../types';

export const CURRENT_USER: User = {
  id: 'usr-001',
  username: 'dr.smith',
  email: 'dr.smith@eldamedical.com',
  firstName: 'Alexander',
  lastName: 'Smith',
  role: 'ROLE_DOCTOR',
  roles: ['DOCTOR'],
  active: true
};

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-101',
    mrn: 'ELD-2026-0042',
    firstName: 'Eleanor',
    lastName: 'Vance',
    dateOfBirth: '1984-06-15',
    gender: 'FEMALE',
    phone: '+1 (555) 234-8901',
    email: 'eleanor.vance@example.com',
    address: '742 Evergreen Terrace, Springfield',
    emergencyContactName: 'Thomas Vance (Spouse)',
    emergencyContactPhone: '+1 (555) 234-8902',
    insuranceProvider: 'Blue Cross Shield',
    insurancePolicyNumber: 'BCX-9982410-A',
    allergies: [
      { id: 'alg-1', allergen: 'Penicillin', severity: 'ANAPHYLACTIC', reaction: 'Hives and Bronchospasm' },
      { id: 'alg-2', allergen: 'Latex', severity: 'MODERATE', reaction: 'Contact dermatitis' }
    ],
    chronicConditions: [
      { id: 'cc-1', conditionName: 'Type 2 Diabetes Mellitus', diagnosedDate: '2020-03-10', status: 'ACTIVE' },
      { id: 'cc-2', conditionName: 'Essential Hypertension', diagnosedDate: '2018-11-22', status: 'ACTIVE' }
    ],
    createdAt: '2026-01-15T09:30:00Z'
  },
  {
    id: 'pat-102',
    mrn: 'ELD-2026-0089',
    firstName: 'Marcus',
    lastName: 'Aurelius',
    dateOfBirth: '1976-11-04',
    gender: 'MALE',
    phone: '+1 (555) 876-1234',
    email: 'm.aurelius@example.com',
    address: '120 Capitol Hill Ave, Suite 4B',
    emergencyContactName: 'Lucilla Aurelius (Sister)',
    emergencyContactPhone: '+1 (555) 876-5544',
    insuranceProvider: 'Aetna Health',
    insurancePolicyNumber: 'AET-441092-X',
    allergies: [
      { id: 'alg-3', allergen: 'Sulfa Drugs', severity: 'SEVERE', reaction: 'Facial swelling' }
    ],
    chronicConditions: [
      { id: 'cc-3', conditionName: 'Asthma (Moderate Persistent)', diagnosedDate: '2015-08-14', status: 'ACTIVE' }
    ],
    createdAt: '2026-02-01T14:15:00Z'
  },
  {
    id: 'pat-103',
    mrn: 'ELD-2026-0115',
    firstName: 'Sophia',
    lastName: 'Chen',
    dateOfBirth: '1992-03-28',
    gender: 'FEMALE',
    phone: '+1 (555) 432-9087',
    email: 'sophia.chen@example.org',
    address: '88 Oakridge Drive, Bay Area',
    emergencyContactName: 'David Chen (Father)',
    emergencyContactPhone: '+1 (555) 432-1100',
    insuranceProvider: 'United Healthcare',
    insurancePolicyNumber: 'UHC-8812903',
    allergies: [],
    chronicConditions: [],
    createdAt: '2026-03-05T11:00:00Z'
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-501',
    patientId: 'pat-101',
    patientName: 'Eleanor Vance',
    patientMrn: 'ELD-2026-0042',
    doctorId: 'usr-001',
    doctorName: 'Dr. Alexander Smith',
    startTime: '2026-09-22T10:00:00Z',
    endTime: '2026-09-22T10:30:00Z',
    status: 'IN_PROGRESS',
    reason: 'Quarterly Diabetic & Hypertension Follow-up',
    notes: 'Patient requested blood work review',
    createdAt: '2026-09-20T08:12:00Z'
  },
  {
    id: 'apt-502',
    patientId: 'pat-102',
    patientName: 'Marcus Aurelius',
    patientMrn: 'ELD-2026-0089',
    doctorId: 'usr-001',
    doctorName: 'Dr. Alexander Smith',
    startTime: '2026-09-22T11:30:00Z',
    endTime: '2026-09-22T12:00:00Z',
    status: 'CHECKED_IN',
    reason: 'Asthma Exacerbation & Inhaler Renewal',
    createdAt: '2026-09-21T14:20:00Z'
  },
  {
    id: 'apt-503',
    patientId: 'pat-103',
    patientName: 'Sophia Chen',
    patientMrn: 'ELD-2026-0115',
    doctorId: 'usr-001',
    doctorName: 'Dr. Alexander Smith',
    startTime: '2026-09-22T14:00:00Z',
    endTime: '2026-09-22T14:30:00Z',
    status: 'SCHEDULED',
    reason: 'Annual Routine Physical Intake',
    createdAt: '2026-09-18T16:00:00Z'
  }
];

export const INITIAL_VISITS: ClinicalVisit[] = [
  {
    id: 'vst-801',
    patientId: 'pat-101',
    patientName: 'Eleanor Vance',
    patientMrn: 'ELD-2026-0042',
    doctorId: 'usr-001',
    doctorName: 'Dr. Alexander Smith',
    appointmentId: 'apt-501',
    encounterTime: '2026-09-22T10:05:00Z',
    chiefComplaint: 'Reports mild fatigue over the last 2 weeks and morning blood glucose readings around 145 mg/dL.',
    vitals: {
      bpSystolic: 132,
      bpDiastolic: 84,
      heartRate: 74,
      temperatureC: 36.8,
      respRate: 16,
      weightKg: 68.5,
      heightCm: 165,
      bmi: 25.2,
      oxygenSat: 98
    },
    diagnosisIcd10: 'E11.9',
    diagnosisDescription: 'Type 2 diabetes mellitus without complications',
    clinicalNotes: 'Patient is compliant with Metformin 500mg BID. HbA1c lab requested today. Advised low-glycemic dietary adjustments and 30-min daily walking regimen.',
    prescriptions: [
      {
        id: 'rx-901',
        patientId: 'pat-101',
        doctorId: 'usr-001',
        medicationName: 'Metformin HCl ER',
        dosage: '500 mg',
        frequency: 'Twice daily with meals',
        duration: '90 days',
        instructions: 'Take with morning and evening meals. Do not crush.',
        status: 'ACTIVE',
        issuedAt: '2026-09-22T10:25:00Z'
      },
      {
        id: 'rx-902',
        patientId: 'pat-101',
        doctorId: 'usr-001',
        medicationName: 'Lisinopril',
        dosage: '10 mg',
        frequency: 'Once daily',
        duration: '90 days',
        instructions: 'Take in the morning.',
        status: 'ACTIVE',
        issuedAt: '2026-09-22T10:25:00Z'
      }
    ],
    createdAt: '2026-09-22T10:25:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-001',
    userId: 'usr-001',
    username: 'dr.smith',
    action: 'CREATE_ENCOUNTER',
    entityName: 'ClinicalVisit',
    entityId: 'vst-801',
    ipAddress: '192.168.1.45',
    details: 'Logged clinical visit encounter for patient MRN: ELD-2026-0042 (Eleanor Vance)',
    createdAt: '2026-09-22T10:25:00Z'
  },
  {
    id: 'aud-002',
    userId: 'usr-001',
    username: 'dr.smith',
    action: 'ISSUE_PRESCRIPTION',
    entityName: 'Prescription',
    entityId: 'rx-901',
    ipAddress: '192.168.1.45',
    details: 'Issued prescription: Metformin HCl ER 500mg (90 days)',
    createdAt: '2026-09-22T10:25:00Z'
  },
  {
    id: 'aud-003',
    userId: 'usr-002',
    username: 'rec.jane',
    action: 'CREATE_PATIENT',
    entityName: 'Patient',
    entityId: 'pat-103',
    ipAddress: '192.168.1.12',
    details: 'Registered new patient MRN: ELD-2026-0115 (Sophia Chen)',
    createdAt: '2026-09-22T08:50:00Z'
  }
];
