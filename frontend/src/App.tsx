import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { printPatientChart, exportAuditLogsToCSV } from './utils/exportUtils';
import { restoreSession } from './services/apiService';

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'dashboard' | 'patients' | 'appointments' | 'encounters' | 'audit' | 'settings';

type AuditLogEntry = {
  ts: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  ip: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
};

// ─── Seed Data ────────────────────────────────────────────────────────────────
const APP_TODAY = (() => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })();

type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  mrn: string;
  patient: string;
  type: string;
  clinician: string;
  room: string;
  status: string;
};

type ScheduleForm = { mrn: string; date: string; time: string; type: string; clinician: string; room: string };

const appointmentTypes = ['Annual Physical', 'Follow-up Visit', 'Chronic Care Mgmt', 'New Patient Intake', 'Medication Review', 'Lab Results Review', 'Cardiac Monitoring', 'Dermatology Consult', 'Urgent Care Visit', 'Rx Refill'];
const rooms = ['Exam 1', 'Exam 2', 'Exam 3', 'Exam 4'];

function formatSlot(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
}
const timeSlots: string[] = [];
for (let m = 8 * 60; m <= 16 * 60; m += 15) timeSlots.push(formatSlot(m));

function timeToMinutes(t: string): number {
  const [hm, ap] = t.split(' ');
  const [h, m] = hm.split(':').map(Number);
  return ((h % 12) + (ap === 'PM' ? 12 : 0)) * 60 + m;
}
const byTime = (a: Appointment, b: Appointment) => timeToMinutes(a.time) - timeToMinutes(b.time);

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return toYmd(d);
}
const formatLongDate = (s: string) => parseYmd(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const formatMediumDate = (s: string) => parseYmd(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatShortDate = (s: string) => parseYmd(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ─── Encounter & History model ────────────────────────────────────────────────
const DEFAULT_MRN = 'ELD-2026-0041';

type Rx = { id: string; drug: string; dose: string; freq: string; route: string };
type Soap = { subjective: string; objective: string; assessment: string; plan: string };
type Vitals = { bp: string; hr: string; temp: string; bmi: string };
type EncounterState = {
  soap: Soap;
  rx: Rx[];
  vitals: Vitals;
  status: 'DRAFT' | 'SIGNED';
  dirty: boolean;
  draftSavedAt?: string;
  signedAt?: string;
};

// Rich VisitEntry storing full clinical charts for historical review
type VisitEntry = {
  id?: string;
  date: string;
  type: string;
  clinician: string;
  diagnosis?: string;
  notes?: string;
  vitals?: Vitals;
  rx?: Rx[];
  soap?: Soap;
};

const emptySoap: Soap = { subjective: '', objective: '', assessment: '', plan: '' };
const emptyVitals: Vitals = { bp: '', hr: '', temp: '', bmi: '' };
const blankEncounter = (): EncounterState => ({ soap: { ...emptySoap }, rx: [], vitals: { ...emptyVitals }, status: 'DRAFT', dirty: false });

const seedEncounters: Record<string, EncounterState> = {
  [DEFAULT_MRN]: {
    soap: {
      subjective: 'Patient presents with persistent headache for 3 days, rated 7/10 in severity. Reports associated mild nausea and photophobia. No aura or neurological deficits noted. Current medications include Lisinopril 10mg daily. Denies fever, neck stiffness, or visual changes.',
      objective: 'BP: 138/88 mmHg · HR: 82 bpm · Temp: 98.6°F · SpO2: 99% · BMI: 26.4\nNeurological: Alert and oriented x3. Pupils equal and reactive. No focal deficits.\nFunduscopic: Normal disc margins bilaterally.',
      assessment: '1. Tension-type headache — primary (G44.2)\n2. Hypertension, poorly controlled — secondary concern (I10)\n3. Medication adherence counseling indicated.',
      plan: '1. Ibuprofen 600mg PO TID with food × 5 days\n2. Increase Lisinopril to 20mg daily\n3. CBC, CMP, lipid panel ordered\n4. Follow-up in 2 weeks or sooner if symptoms worsen\n5. Patient educated on headache diary and hypertension diet modifications',
    },
    rx: [
      { id: 'rx-seed-1', drug: 'Ibuprofen', dose: '600mg', freq: 'TID × 5 days', route: 'PO' },
      { id: 'rx-seed-2', drug: 'Lisinopril', dose: '20mg', freq: 'Once daily', route: 'PO' },
      { id: 'rx-seed-3', drug: 'Ondansetron', dose: '4mg', freq: 'PRN nausea', route: 'PO' },
    ],
    vitals: { bp: '138/88', hr: '82', temp: '98.6', bmi: '26.4' },
    status: 'DRAFT',
    dirty: false,
  },
};

const seedVisits: Record<string, VisitEntry[]> = {
  [DEFAULT_MRN]: [
    {
      date: 'Sep 20, 2026',
      type: 'Follow-up Visit',
      clinician: 'Dr. Smith',
      diagnosis: 'Essential Hypertension — Routine Follow-up',
      notes: 'Blood pressure slightly elevated but improved from previous visit. Patient compliant with Lisinopril 10mg.',
      vitals: { bp: '130/84', hr: '76', temp: '98.4', bmi: '26.2' },
      rx: [
        { id: 'rx-hist-1', drug: 'Lisinopril', dose: '10mg', freq: 'Once daily', route: 'PO' },
      ],
      soap: {
        subjective: 'Patient returns for follow-up of blood pressure and occasional headache. Reports symptoms are mild and episodic, mostly occurring after long work days. Sleeping 7 hours per night.',
        objective: 'BP: 130/84 mmHg · HR: 76 bpm · Temp: 98.4°F · BMI: 26.2.\nNeurological: Alert, oriented x3. Cranial nerves intact.\nCardiovascular: Regular rate and rhythm, no murmurs.',
        assessment: '1. Essential hypertension (I10) — stable and responding well to current therapy.\n2. Tension-type headache — mild, non-progressive.',
        plan: '1. Continue Lisinopril 10mg PO once daily in the morning.\n2. Maintain headache log.\n3. Routine clinic follow-up in 4 weeks.',
      },
    },
    {
      date: 'Aug 5, 2026',
      type: 'Chronic Care Mgmt',
      clinician: 'Dr. Smith',
      diagnosis: 'Chronic Care Management & Diet Counseling',
      notes: 'Reviewed home BP records and dietary habits. Advised on low sodium DASH diet.',
      vitals: { bp: '136/88', hr: '80', temp: '98.6', bmi: '26.5' },
      rx: [
        { id: 'rx-hist-2', drug: 'Lisinopril', dose: '10mg', freq: 'Once daily', route: 'PO' },
      ],
      soap: {
        subjective: 'Scheduled chronic care check-in. Reports mild work-related stress. Denies chest discomfort, shortness of breath, or lower extremity edema.',
        objective: 'BP: 136/88 mmHg · HR: 80 bpm · Temp: 98.6°F · BMI: 26.5.\nLungs clear to auscultation bilaterally. Abdomen soft, non-tender.',
        assessment: '1. Essential hypertension (I10) — suboptimally controlled.\n2. Lifestyle modification counseling required.',
        plan: '1. Low sodium DASH diet nutrition counseling provided.\n2. Advised 30 minutes daily moderate cardiovascular exercise.\n3. Return in 4–6 weeks for BP check.',
      },
    },
    {
      date: 'Jun 18, 2026',
      type: 'Annual Physical',
      clinician: 'Dr. Osei',
      diagnosis: 'Preventive Health Examination',
      notes: 'Annual comprehensive preventive checkup. Routine laboratory panels ordered.',
      vitals: { bp: '128/82', hr: '74', temp: '98.5', bmi: '26.1' },
      rx: [],
      soap: {
        subjective: 'Presents for annual wellness examination. No acute medical complaints. Up to date on all preventive vaccines except seasonal booster.',
        objective: 'BP: 128/82 mmHg · HR: 74 bpm · Temp: 98.5°F · BMI: 26.1.\nHead, eyes, ENT, lungs, and heart within normal limits. Skin without suspicious lesions.',
        assessment: '1. Routine general adult medical examination without abnormal findings.\n2. Borderline baseline blood pressure.',
        plan: '1. Fasting lipid panel and CMP ordered.\n2. Routine follow-up scheduled for review of labs.',
      },
    },
    {
      date: 'Mar 3, 2026',
      type: 'Urgent Care Visit',
      clinician: 'Dr. Nguyen',
      diagnosis: 'Acute Tension Headache & Dehydration',
      notes: 'Patient presented with sudden throbbing headache after prolonged work hours.',
      vitals: { bp: '142/90', hr: '88', temp: '98.7', bmi: '26.4' },
      rx: [
        { id: 'rx-hist-3', drug: 'Ibuprofen', dose: '400mg', freq: 'TID PRN pain', route: 'PO' },
      ],
      soap: {
        subjective: 'Sudden onset throbbing headache since yesterday evening. Associated mild photophobia, denies aura, fever, or trauma.',
        objective: 'BP: 142/90 mmHg · HR: 88 bpm · Temp: 98.7°F · BMI: 26.4.\nNeck supple, Kernig/Brudzinski negative. Pupils equal and reactive to light.',
        assessment: '1. Acute tension headache.\n2. Reactive blood pressure elevation secondary to pain and stress.',
        plan: '1. Ibuprofen 400mg PO TID PRN with food.\n2. Oral hydration encouraged.\n3. Follow up with primary care clinician if headache fails to resolve.',
      },
    },
  ],
};

const rxFrequencies = ['Once daily', 'BID', 'TID', 'QID', 'Every 8 hours', 'Every 12 hours', 'At bedtime', 'PRN'];
const rxRoutes = ['PO', 'IV', 'IM', 'SC', 'SL', 'Topical', 'Inhaled'];

// Drug-class expansion for allergy screening
const allergyClasses: { keys: string[]; terms: string[] }[] = [
  { keys: ['penicillin'], terms: ['penicillin', 'amoxicillin', 'ampicillin', 'piperacillin', 'flucloxacillin', 'augmentin', 'amoxil'] },
  { keys: ['sulfa', 'sulfon'], terms: ['sulfa', 'sulfamethoxazole', 'sulfadiazine', 'bactrim', 'septra', 'co-trimoxazole', 'cotrimoxazole'] },
  { keys: ['nsaid', 'anti-inflammatory'], terms: ['ibuprofen', 'naproxen', 'diclofenac', 'ketorolac', 'indomethacin', 'celecoxib'] },
];

function allergyMatch(drug: string, allergies: string[]): string | undefined {
  const d = drug.trim().toLowerCase();
  if (!d) return undefined;
  return allergies.find(label => {
    const base = label.split('(')[0].trim().toLowerCase();
    if (!base) return false;
    const terms = new Set<string>([base, base.replace(/s$/, '')]);
    allergyClasses.forEach(c => {
      if (c.keys.some(k => base.includes(k))) c.terms.forEach(t => terms.add(t));
    });
    return Array.from(terms).some(t => t.length > 2 && d.includes(t));
  });
}

function parseAllergies(s?: string): string[] | undefined {
  const parts = (s ?? '').split(/,(?![^()]*\))/).map(x => x.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

const timeNow = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

type PatientRow = {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  insurance: string;
  lastVisit: string;
  status: string;
  dob?: string;
  email?: string;
  address?: string;
  allergies?: string[];
  pcp?: string;
};

type PatientForm = {
  fullName: string;
  dob: string;
  phone: string;
  insurance: string;
  gender?: string;
  email?: string;
  address?: string;
  status?: string;
  allergies?: string;
};
type AuditEventFn = (action: string, resource: string, level?: 'INFO' | 'WARNING' | 'CRITICAL') => void;

const insuranceOptions = ['Self-Paid', 'NHIS'];

function calcAge(dob: string): number {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 0;
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
  return Math.max(0, age);
}

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const seedPatients: PatientRow[] = [
  { id: 'ELD-2026-0041', name: 'Margaret Okonkwo', age: 58, gender: 'F', phone: '(832) 514-7823', insurance: 'NHIS', lastVisit: formatMediumDate(addDays(APP_TODAY, -3)), status: 'ACTIVE', dob: '1968-03-14', allergies: ['Penicillin (anaphylaxis)', 'Sulfonamides (rash)'], pcp: 'Dr. Alexander Smith' },
  { id: 'ELD-2026-0038', name: 'James Ferreira', age: 34, gender: 'M', phone: '(713) 228-9045', insurance: 'Self-Paid', lastVisit: formatMediumDate(addDays(APP_TODAY, -5)), status: 'ACTIVE' },
  { id: 'ELD-2026-0029', name: 'Yuki Tanaka', age: 47, gender: 'F', phone: '(346) 710-5562', insurance: 'NHIS', lastVisit: formatMediumDate(addDays(APP_TODAY, -8)), status: 'ACTIVE' },
  { id: 'ELD-2026-0017', name: 'Robert Mensah', age: 72, gender: 'M', phone: '(281) 943-2178', insurance: 'NHIS', lastVisit: formatMediumDate(addDays(APP_TODAY, -13)), status: 'INACTIVE' },
  { id: 'ELD-2026-0055', name: 'Sofia Delgado', age: 29, gender: 'F', phone: '(832) 667-3390', insurance: 'Self-Paid', lastVisit: formatMediumDate(addDays(APP_TODAY, -1)), status: 'ACTIVE' },
  { id: 'ELD-2026-0062', name: 'Kwame Asante', age: 41, gender: 'M', phone: '(713) 884-0214', insurance: 'NHIS', lastVisit: formatMediumDate(addDays(APP_TODAY, -4)), status: 'ACTIVE' },
  { id: 'ELD-2026-0033', name: 'Patricia Huang', age: 65, gender: 'F', phone: '(346) 520-8877', insurance: 'Self-Paid', lastVisit: formatMediumDate(addDays(APP_TODAY, -18)), status: 'INACTIVE' },
  { id: 'ELD-2026-0071', name: 'Daniel Eze', age: 52, gender: 'M', phone: '(281) 334-6501', insurance: 'NHIS', lastVisit: formatMediumDate(APP_TODAY), status: 'ACTIVE' },
];

const rawAppointments = [
  { time: '8:00 AM', mrn: 'ELD-2026-0055', patient: 'Sofia Delgado', type: 'Annual Physical', clinician: 'Dr. Smith', room: 'Exam 3', status: 'COMPLETED' },
  { time: '8:30 AM', mrn: 'ELD-2026-0038', patient: 'James Ferreira', type: 'Follow-up Visit', clinician: 'Dr. Osei', room: 'Exam 1', status: 'COMPLETED' },
  { time: '9:15 AM', mrn: 'ELD-2026-0041', patient: 'Margaret Okonkwo', type: 'Chronic Care Mgmt', clinician: 'Dr. Smith', room: 'Exam 2', status: 'IN-CONSULT' },
  { time: '10:00 AM', mrn: 'ELD-2026-0062', patient: 'Kwame Asante', type: 'New Patient Intake', clinician: 'Dr. Nguyen', room: 'Exam 4', status: 'CHECKED-IN' },
  { time: '10:45 AM', mrn: 'ELD-2026-0029', patient: 'Yuki Tanaka', type: 'Medication Review', clinician: 'Dr. Smith', room: 'Exam 2', status: 'SCHEDULED' },
  { time: '11:30 AM', mrn: 'ELD-2026-0071', patient: 'Daniel Eze', type: 'Lab Results Review', clinician: 'Dr. Osei', room: 'Exam 1', status: 'SCHEDULED' },
  { time: '1:00 PM', mrn: 'ELD-2026-0017', patient: 'Robert Mensah', type: 'Cardiac Monitoring', clinician: 'Dr. Smith', room: 'Exam 3', status: 'SCHEDULED' },
  { time: '2:15 PM', mrn: 'ELD-2026-0033', patient: 'Patricia Huang', type: 'Dermatology Consult', clinician: 'Dr. Nguyen', room: 'Exam 4', status: 'SCHEDULED' },
  { time: '3:00 PM', mrn: 'ELD-2026-0055', patient: 'Sofia Delgado', type: 'Rx Refill', clinician: 'Dr. Smith', room: 'Exam 2', status: 'SCHEDULED' },
];

const seedAppointments: Appointment[] = rawAppointments.map((a, i) => ({ ...a, id: `APT-2026-${1401 + i}`, date: APP_TODAY }));

const seedAuditLogs: AuditLogEntry[] = [
  { ts: `${APP_TODAY} 09:14:32`, user: 'Dr. Alexander Smith', role: 'DOCTOR', action: 'RECORD_ACCESS', resource: 'Patient ELD-2026-0041 — Clinical Chart', ip: '10.0.1.14', level: 'INFO' },
  { ts: `${APP_TODAY} 09:08:11`, user: 'Nurse Priya Rajan', role: 'NURSE', action: 'VITALS_UPDATE', resource: 'Patient ELD-2026-0038 — Vitals Record', ip: '10.0.1.22', level: 'INFO' },
  { ts: `${APP_TODAY} 08:55:44`, user: 'Admin Carla Vega', role: 'ADMIN', action: 'USER_ROLE_MODIFIED', resource: 'Staff Account — Dr. Nguyen', ip: '10.0.2.5', level: 'WARNING' },
  { ts: `${APP_TODAY} 08:41:09`, user: 'Dr. Yemi Osei', role: 'DOCTOR', action: 'PRESCRIPTION_SIGNED', resource: 'Rx #RX-2026-00812 — ELD-2026-0055', ip: '10.0.1.18', level: 'INFO' },
  { ts: `${APP_TODAY} 08:30:00`, user: 'Unknown', role: '—', action: 'FAILED_LOGIN', resource: 'Auth Portal — 5 consecutive failures', ip: '192.168.99.44', level: 'CRITICAL' },
  { ts: `${APP_TODAY} 08:15:23`, user: 'Receptionist J. Park', role: 'RECEPTIONIST', action: 'APPOINTMENT_SCHEDULED', resource: 'Appt #APT-2026-1409 — ELD-2026-0062', ip: '10.0.1.30', level: 'INFO' },
  { ts: `${APP_TODAY} 07:58:11`, user: 'Admin Carla Vega', role: 'ADMIN', action: 'DATA_EXPORT_INITIATED', resource: 'Patient Index — Full Export Requested', ip: '10.0.2.5', level: 'WARNING' },
  { ts: `${APP_TODAY} 07:45:00`, user: 'System', role: 'SYSTEM', action: 'SESSION_PURGE', resource: 'Expired sessions cleared — 12 tokens', ip: '127.0.0.1', level: 'INFO' },
];

type StaffUser = { name: string; email: string; role: string; isAdmin: boolean; active: boolean };
type StaffForm = { firstName: string; lastName: string; name: string; email: string; role: string; isAdmin: boolean; active: boolean };
type ClinicInfo = { name: string; npi: string; contact: string; address: string; ehr: string };
type Prefs = { soap: string; vitals: string; rx: string };

const CURRENT_USER_EMAIL = 'a.smith@eldamedical.com';
const staffRoles = ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'ADMIN'];
const rolePrefix: Record<string, string> = { DOCTOR: 'Dr. ', NURSE: 'Nurse ', RECEPTIONIST: 'Receptionist ', ADMIN: 'Admin ' };
const rolePrefixPattern = /^(Dr\.|Nurse|Receptionist|Admin)\s+/i;

function initialsOf(name: string): string {
  const stripped = name.replace(rolePrefixPattern, '');
  return stripped.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

const clinicianShort = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return `Dr. ${parts[parts.length - 1]}`;
};

const seedClinic: ClinicInfo = {
  name: 'Elda Medical Service',
  npi: '1234567890',
  contact: '(713) 555-0100',
  address: '4520 Westheimer Rd, Houston, TX 77027',
  ehr: 'EMS-PROD-HOU-01',
};
const seedPrefs: Prefs = { soap: 'Standard SOAP', vitals: 'Every visit', rx: 'Standard Rx Pad' };
const securityItems: { key: string; label: string; desc: string }[] = [
  { key: 'mfa', label: 'Require MFA for all users', desc: 'Multi-factor authentication enforced at login' },
  { key: 'timeout', label: 'Session timeout (15 min idle)', desc: 'Automatically lock inactive sessions' },
  { key: 'audit', label: 'Immutable audit logging', desc: 'HeFRAA §164.312(b) compliant event recording' },
  { key: 'encrypt', label: 'Encrypt data at rest (AES-256)', desc: 'Full-disk encryption for all patient records' },
  { key: 'report', label: 'Automatic HeFRAA report export', desc: 'Monthly compliance summary to Privacy Officer' },
  { key: 'phi', label: 'PHI access breach alerts', desc: 'Alert admin on suspicious access patterns' },
];
const seedSecurity: Record<string, boolean> = { mfa: true, timeout: true, audit: true, encrypt: true, report: false, phi: true };

const staffUsers: StaffUser[] = [
  { name: 'Dr. Alexander Smith', email: 'a.smith@eldamedical.com', role: 'DOCTOR', isAdmin: true, active: true },
  { name: 'Dr. Yemi Osei', email: 'y.osei@eldamedical.com', role: 'DOCTOR', isAdmin: false, active: true },
  { name: 'Dr. Linh Nguyen', email: 'l.nguyen@eldamedical.com', role: 'DOCTOR', isAdmin: false, active: true },
  { name: 'Nurse Priya Rajan', email: 'p.rajan@eldamedical.com', role: 'NURSE', isAdmin: false, active: true },
  { name: 'Nurse Thomas Adu', email: 't.adu@eldamedical.com', role: 'NURSE', isAdmin: false, active: false },
  { name: 'Receptionist J. Park', email: 'j.park@eldamedical.com', role: 'RECEPTIONIST', isAdmin: false, active: true },
  { name: 'Admin Carla Vega', email: 'c.vega@eldamedical.com', role: 'ADMIN', isAdmin: true, active: true },
];

// ─── Badges & Icons ───────────────────────────────────────────────────────────
function ApptStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'COMPLETED': 'appt-completed',
    'IN-CONSULT': 'appt-in-consult',
    'CHECKED-IN': 'appt-checked-in',
    'SCHEDULED': 'appt-scheduled',
  };
  return (
    <span className={`${map[status] ?? 'appt-scheduled'} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    'DOCTOR': 'bg-purple-100 text-purple-800',
    'NURSE': 'bg-sky-100 text-sky-800',
    'RECEPTIONIST': 'bg-amber-100 text-amber-800',
    'ADMIN': 'bg-rose-100 text-rose-800',
    'SYSTEM': 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`${colors[role] ?? 'bg-slate-100 text-slate-600'} text-xs font-semibold px-2 py-0.5 rounded-md tracking-wide`}>
      {role}
    </span>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${on ? 'toggle-on' : 'toggle-off'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

const Icon = {
  Dashboard: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Patients: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Activity: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  FileText: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Bell: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Lock: () => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Heart: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Clipboard: () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  LogOut: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Printer: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const navItems: { id: Screen; label: string; Icon: () => JSX.Element; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: Icon.Dashboard },
  { id: 'patients', label: 'Patients', Icon: Icon.Patients, badge: '248' },
  { id: 'appointments', label: 'Appointments', Icon: Icon.Calendar, badge: '9' },
  { id: 'encounters', label: 'Vitals & Records', Icon: Icon.Activity },
  { id: 'audit', label: 'Audit Logs', Icon: Icon.Shield },
  { id: 'settings', label: 'Settings', Icon: Icon.Settings },
];

function Sidebar({ active, onNavigate, patientsCount, appointmentsCount, currentUser, onLogout }: { active: Screen; onNavigate: (s: Screen) => void; patientsCount: number; appointmentsCount: number; currentUser: StaffUser; onLogout?: () => void }) {
  return (
    <aside className="sidebar-glass fixed left-0 top-0 h-full w-[260px] flex flex-col z-30 select-none">
      <div className="px-5 pt-4 pb-4 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-20 h-18 overflow-hidden flex-shrink-0 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Elda Medical Cross"
            className="h-15 w-auto max-w-none object-cover -translate-x--1"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-wider text-[#7A1C1C] leading-tight uppercase">
            Elda Medical
          </span>
          <span className="text-[15px] font-bold tracking-widest text-[#B8860B] uppercase">
            Service
          </span>
        </div>
      </div>
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">Main Menu</div>
        {navItems.map(({ id, label, Icon: NavIcon, badge }) => {
          const isActive = active === id;
          const displayBadge = id === 'patients' ? String(patientsCount) : id === 'appointments' ? String(appointmentsCount) : badge;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${isActive
                ? 'nav-active shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span className="flex items-center gap-3">
                <NavIcon />
                <span className="font-medium">{label}</span>
              </span>
              {displayBadge && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {displayBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-slate-100 mt-2 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#7A1C1C' }}>{initialsOf(currentUser.name)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-700 truncate">{currentUser.name}</div>
            <div className="text-xs text-slate-400">{currentUser.role}{currentUser.isAdmin && currentUser.role !== 'ADMIN' ? ' · ADMIN' : ''}</div>
          </div>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-all cursor-pointer"
          >
            Sign Out
          </button>
        )}
      </div>
    </aside>
  );
}

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'info' | 'warning' | 'alert';
};

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ screen, patients, staff, currentUser, onSearchPatient, onSwitchAccount, onLogout }: { screen: Screen; patients: typeof seedPatients; staff: StaffUser[]; currentUser: StaffUser; onSearchPatient: (query: string) => void; onSwitchAccount: (email: string) => void; onLogout?: () => void }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: '1', title: 'Pending Chart Reviews', message: '3 patient clinical encounter charts are pending signature.', time: '10m ago', unread: true, type: 'info' },
    { id: '2', title: 'Patient Check-In', message: 'Kwame Asante (ELD-2026-0062) has arrived and checked in.', time: '25m ago', unread: true, type: 'info' },
    { id: '3', title: 'HeFRAA Security Notice', message: '1 CRITICAL audit log recorded in system stream.', time: '1h ago', unread: true, type: 'alert' },
    { id: '4', title: 'Prescription Warning', message: 'Penicillin allergy override logged for Margaret Okonkwo.', time: '2h ago', unread: false, type: 'warning' },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  const clearNotifications = () => setNotifications([]);

  const matches = query.trim()
    ? patients.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.id.toLowerCase().includes(query.toLowerCase()) ||
      p.phone.includes(query)
    ).slice(0, 6)
    : [];

  const runSearch = (q: string) => {
    if (!q.trim()) return;
    onSearchPatient(q);
    setFocused(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runSearch(query);
  };

  return (
    <header className="header-glass fixed top-0 left-[260px] right-0 h-14 flex items-center px-6 gap-4 z-20">
      <div className="flex-1 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon.Search /></span>
        <input
          type="text"
          placeholder="Search patient by MRN, Name, or Phone..."
          className="w-full max-w-md pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
        />
        {focused && matches.length > 0 && (
          <div className="absolute left-0 right-0 max-w-md mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 overflow-hidden">
            {matches.map((p, i) => (
              <button
                key={i}
                onMouseDown={() => runSearch(p.name)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between text-sm border-b border-slate-50 last:border-0 transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-800 text-xs">{p.name}</div>
                  <div className="text-[11px] text-slate-400">{p.phone}</div>
                </div>
                <span className="mrn-badge">{p.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="relative">
          <button
            onClick={() => { setNotificationsOpen(o => !o); setSwitcherOpen(false); }}
            className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Icon.Bell />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"></span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-semibold text-[#7A1C1C] hover:underline cursor-pointer">
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No notifications at this time.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-3.5 hover:bg-slate-50 transition-colors flex gap-3 items-start ${n.unread ? 'bg-amber-50/20' : ''}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${n.unread ? (n.type === 'alert' ? 'bg-red-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500') : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 truncate">{n.title}</span>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                  <button onClick={clearNotifications} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer">
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            className="flex items-center gap-2.5 pl-3 border-l border-slate-200 hover:bg-slate-50 rounded-lg py-1 pr-2 transition-colors cursor-pointer"
            onClick={() => { setSwitcherOpen(o => !o); setNotificationsOpen(false); }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#7A1C1C' }}>{initialsOf(currentUser.name)}</div>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-700 leading-tight">{currentUser.name}</div>
              <div className="flex gap-1">
                <RoleBadge role={currentUser.role} />
                {currentUser.isAdmin && currentUser.role !== 'ADMIN' && <span className="text-xs bg-rose-100 text-rose-800 px-1.5 rounded font-semibold">ADMIN</span>}
              </div>
            </div>
            <Icon.ChevronDown />
          </button>
          {switcherOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-40 overflow-hidden">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">Switch Account</div>
              <div className="max-h-72 overflow-auto">
                {staff.filter(u => u.active).map(u => (
                  <button
                    key={u.email}
                    onClick={() => { onSwitchAccount(u.email); setSwitcherOpen(false); }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors ${u.email === currentUser.email ? 'bg-slate-50' : ''}`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{u.name}{u.email === currentUser.email ? ' (current)' : ''}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </div>
                    <RoleBadge role={u.role} />
                  </button>
                ))}
              </div>
              {onLogout && (
                <button
                  onClick={() => { onLogout(); setSwitcherOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border-t border-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Sign Out</span>
                  <Icon.LogOut />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, iconClass }: { icon: JSX.Element; label: string; value: string; sub: string; iconClass: string }) {
  return (
    <div className="glass-card p-5 flex gap-4 items-start">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-2xl font-bold text-slate-800 leading-tight">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${timeOfDay}, ${name}.`;
}

function getLiveFormattedDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();
}
function getLiveShortDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// ─── DASHBOARD SCREEN ─────────────────────────────────────────────────────────
type DashboardScreenProps = {
  currentUser: StaffUser;
  patients: typeof seedPatients;
  auditLogs: AuditLogEntry[];
  onRegisterPatient: (p: { fullName: string; dob: string; phone: string; insurance: string }) => void;
  onNavigate: (s: Screen) => void;
  appointments: Appointment[];
  encountersLogged: number;
  onLogEncounter: () => void;
  onOpenEncounter: (mrn: string) => void;
};

function DashboardScreen({ currentUser, patients, auditLogs, onRegisterPatient, onNavigate, appointments, encountersLogged, onLogEncounter, onOpenEncounter }: DashboardScreenProps) {
  const todays = appointments.filter(a => a.date === APP_TODAY).sort(byTime);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [insurance, setInsurance] = useState('');

  const handleRegisterPatient = () => {
    if (!fullName.trim()) {
      alert("Please enter the patient's full name.");
      return;
    }
    onRegisterPatient({ fullName: fullName.trim(), dob, phone, insurance });
    setFullName('');
    setDob('');
    setPhone('');
    setInsurance('');
  };

  return (
    <div className="space-y-5">
      <div className="glass-card p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(122,28,28,0.06) 0%, rgba(212,175,55,0.05) 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #7A1C1C 0%, transparent 60%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{getLiveFormattedDate()}</div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#7A1C1C', fontFamily: 'DM Serif Display, serif' }}>
              {getGreeting(currentUser.name)}
            </h1>
            <p className="text-sm text-slate-500">You have <span className="font-semibold text-slate-700">{todays.length} appointments</span> scheduled today and <span className="font-semibold text-slate-700">3 pending chart reviews</span>.</p>
          </div>
          <button className="btn-gold" onClick={onLogEncounter}>
            <Icon.Plus />
            Log Clinical Encounter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPICard icon={<Icon.Patients />} label="Active Patients" value={String(patients.length)} sub="+3 registered this week" iconClass="kpi-icon-brand" />
        <KPICard icon={<Icon.Calendar />} label="Today's Appointments" value={String(todays.length)} sub={`${todays.filter(a => a.status === 'COMPLETED').length} completed · ${todays.filter(a => a.status === 'IN-CONSULT').length} in-consult`} iconClass="kpi-icon-gold" />
        <KPICard icon={<Icon.Clipboard />} label="Encounters Logged" value={encountersLogged.toLocaleString('en-US')} sub={`+${12 + encountersLogged - 1047} this month`} iconClass="kpi-icon-green" />
        <KPICard icon={<Icon.Shield />} label="HeFRAA Audit Events" value={String(auditLogs.length)} sub={`${auditLogs.filter(l => l.level === 'CRITICAL').length} CRITICAL · ${auditLogs.filter(l => l.level === 'WARNING').length} WARNING today`} iconClass="kpi-icon-blue" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Today's Appointment Schedule</h2>
              <p className="text-xs text-slate-400 mt-0.5">{getLiveShortDate()} — All Clinicians</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">{todays.length} Total</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-5 py-3">Time</th>
                  <th className="text-left px-3 py-3">Patient / MRN</th>
                  <th className="text-left px-3 py-3">Type</th>
                  <th className="text-left px-3 py-3">Clinician</th>
                  <th className="text-left px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {todays.slice(0, 7).map((a) => (
                  <tr key={a.id} className="table-row cursor-pointer" onClick={() => onOpenEncounter(a.mrn)}>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{a.time}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800 text-xs">{a.patient}</div>
                      <span className="mrn-badge">{a.mrn}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{a.type}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{a.clinician}</td>
                    <td className="px-3 py-3"><ApptStatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Icon.Plus />
              Quick Patient Intake
            </h3>
            <div className="space-y-2.5">
              <input
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <input
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400"
                placeholder="Date of Birth (YYYY-MM-DD)"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
              <input
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <select
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400 text-slate-500"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
              >
                <option value="">Select Insurance Provider</option>
                <option value="Self-Paid">Self-Paid</option>
                <option value="NHIS">NHIS</option>
              </select>
              <button className="btn-primary w-full justify-center" onClick={handleRegisterPatient}>
                Register Patient
              </button>
            </div>
          </div>

          <div className="glass-card p-5 flex-1">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Icon.Shield />
              Live Audit Stream
            </h3>
            <div className="space-y-2.5">
              {auditLogs.slice(0, 5).map((log, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className={`text-xs font-bold mt-0.5 w-12 shrink-0 ${log.level === 'CRITICAL' ? 'audit-critical' : log.level === 'WARNING' ? 'audit-warning' : 'audit-info'}`}>
                    {log.level}
                  </span>
                  <div>
                    <div className="text-xs text-slate-700 font-medium leading-tight">{log.action}</div>
                    <div className="text-xs text-slate-400">{log.user} · {log.ts.split(' ')[1]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PATIENTS SCREEN & MODALS ─────────────────────────────────────────────────
const emptyPatientForm: PatientForm = { fullName: '', dob: '', gender: '', phone: '', email: '', address: '', insurance: '', status: 'ACTIVE', allergies: '' };

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-auto p-6" style={{ background: '#FFFFFF' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PatientFormModal({ mode, initial, subtitle, onClose, onSubmit }: { mode: 'register' | 'edit'; initial: PatientForm; subtitle?: string; onClose: () => void; onSubmit: (f: PatientForm) => void }) {
  const [form, setForm] = useState<PatientForm>(initial);
  const [error, setError] = useState('');
  const set = (k: keyof PatientForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));
  const inputCls = 'mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400 transition';
  const labelCls = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';

  const submit = () => {
    if (!form.fullName.trim()) { setError("Please enter the patient's full name."); return; }
    if (form.dob) {
      const d = new Date(form.dob);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dob) || isNaN(d.getTime())) { setError('Date of birth must be a valid date in YYYY-MM-DD format.'); return; }
      if (d > new Date()) { setError('Date of birth cannot be in the future.'); return; }
    }
    setError('');
    onSubmit({ ...form, fullName: form.fullName.trim() });
  };
  return (
    <ModalShell title={mode === 'register' ? 'Register New Patient' : 'Edit Patient Record'} subtitle={subtitle} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Full Name</label>
          <input className={inputCls} value={form.fullName} onChange={set('fullName')} placeholder="e.g. Ama Mensah" autoFocus />
        </div>
        <div>
          <label className={labelCls}>Date of Birth</label>
          <input className={inputCls} value={form.dob} onChange={set('dob')} placeholder="YYYY-MM-DD" />
        </div>
        <div>
          <label className={labelCls}>Gender</label>
          <select className={inputCls} value={form.gender ?? ''} onChange={set('gender')}>
            <option value="">Not specified</option>
            <option value="F">Female</option>
            <option value="M">Male</option>
            <option value="O">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} type="tel" value={form.phone} onChange={set('phone')} placeholder="Phone Number" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} type="email" value={form.email ?? ''} onChange={set('email')} placeholder="name@example.com" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Address</label>
          <input className={inputCls} value={form.address ?? ''} onChange={set('address')} placeholder="Street, City" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Allergies</label>
          <input className={inputCls} value={form.allergies ?? ''} onChange={set('allergies')} placeholder="Comma-separated, e.g. Penicillin (anaphylaxis), Latex" />
        </div>
        <div className={mode === 'edit' ? '' : 'col-span-2'}>
          <label className={labelCls}>Insurance Provider</label>
          <select className={inputCls} value={form.insurance} onChange={set('insurance')}>
            <option value="">Select Insurance Provider</option>
            {insuranceOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {mode === 'edit' && (
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status ?? 'ACTIVE'} onChange={set('status')}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        )}
      </div>
      {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>{mode === 'register' ? 'Register Patient' : 'Save Changes'}</button>
      </div>
    </ModalShell>
  );
}

function PatientChartModal({ patient, appointments, onClose, onEdit, onOpenEncounter }: { patient: PatientRow; appointments: Appointment[]; onClose: () => void; onEdit: () => void; onOpenEncounter: () => void }) {
  const initials = patient.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const genderLabel = patient.gender === 'F' ? 'Female' : patient.gender === 'M' ? 'Male' : patient.gender === 'O' ? 'Other' : 'Not specified';
  const todays = appointments.filter(a => a.mrn === patient.id && a.date === APP_TODAY).sort(byTime);
  const rows: { label: string; value: string }[] = [
    { label: 'Date of Birth', value: patient.dob ? `${patient.dob} (${patient.age} yrs)` : patient.age ? `${patient.age} yrs` : 'Not recorded' },
    { label: 'Gender', value: genderLabel },
    { label: 'Phone', value: patient.phone },
    { label: 'Email', value: patient.email || 'Not provided' },
    { label: 'Address', value: patient.address || 'Not provided' },
    { label: 'Allergies', value: patient.allergies?.length ? patient.allergies.join(', ') : 'None recorded' },
    { label: 'Insurance', value: patient.insurance },
    { label: 'Last Visit', value: patient.lastVisit },
  ];
  return (
    <ModalShell title="Patient Chart" subtitle="Elda Medical Service · Confidential PHI" onClose={onClose}>
      <div className="flex gap-4 items-center mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white" style={{ background: '#7A1C1C' }}>{initials}</div>
        <div>
          <div className="flex items-center gap-3">
            <h4 className="text-base font-bold text-slate-800">{patient.name}</h4>
            <span className={patient.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}>{patient.status}</span>
          </div>
          <span className="mrn-badge">{patient.id}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rows.map((r, i) => (
          <div key={i} className={`bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 ${r.label === 'Address' || r.label === 'Allergies' ? 'col-span-2' : ''}`}>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{r.label}</div>
            <div className="text-sm font-semibold text-slate-800 break-words">{r.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#7A1C1C' }}>Today's Appointments</div>
        {todays.length === 0 ? (
          <div className="text-xs text-slate-400">No appointments scheduled today.</div>
        ) : (
          <div className="space-y-2">
            {todays.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-700">{a.type}</div>
                  <div className="text-slate-400">{a.time} · {a.clinician} · {a.room}</div>
                </div>
                <ApptStatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Close</button>
        <button className="btn-ghost" onClick={() => printPatientChart(patient, null, [])}>Print / PDF Chart</button>
        <button className="btn-ghost" onClick={onEdit}><Icon.Edit /> Edit Patient</button>
        <button className="btn-primary" onClick={onOpenEncounter}>Open Encounter</button>
      </div>
    </ModalShell>
  );
}

type PatientsModal = null | { type: 'register' } | { type: 'edit'; id: string } | { type: 'chart'; id: string };

function PatientsScreen({ patients, appointments, search, onSearchChange, onAuditEvent, onRegisterPatient, onUpdatePatient, onOpenEncounter }: {
  patients: PatientRow[];
  appointments: Appointment[];
  search: string;
  onSearchChange: (q: string) => void;
  onAuditEvent: AuditEventFn;
  onRegisterPatient: (f: PatientForm) => void;
  onUpdatePatient: (id: string, f: PatientForm) => void;
  onOpenEncounter: (mrn: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [insuranceFilter, setInsuranceFilter] = useState('ALL');
  const [modal, setModal] = useState<PatientsModal>(null);

  const q = search.trim().toLowerCase();
  const filtered = patients.filter(p =>
    (statusFilter === 'ALL' || p.status === statusFilter) &&
    (insuranceFilter === 'ALL' || p.insurance === insuranceFilter) &&
    (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.phone.includes(q))
  );

  const target = modal && 'id' in modal ? patients.find(p => p.id === modal.id) : undefined;

  const openChart = (p: PatientRow) => {
    onAuditEvent('RECORD_ACCESS', `Patient ${p.id} — Clinical Chart`);
    setModal({ type: 'chart', id: p.id });
  };

  const editInitial = (p: PatientRow): PatientForm => ({
    fullName: p.name,
    dob: p.dob ?? '',
    gender: p.gender === '—' ? '' : p.gender,
    phone: p.phone === 'N/A' ? '' : p.phone,
    email: p.email ?? '',
    address: p.address ?? '',
    insurance: p.insurance === 'Self-Paid' ? '' : p.insurance,
    status: p.status,
    allergies: (p.allergies ?? []).join(', '),
  });

  return (
    <div className="space-y-4">
      <div className="glass-card px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Master Patient Index</h2>
          <p className="text-xs text-slate-400">{patients.length} total records · Elda Medical Service</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ type: 'register' })}><Icon.Plus /> Register New Patient</button>
      </div>

      <div className="glass-card px-5 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon.Search /></span>
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by name or MRN..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 transition"
          />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none text-sm border border-slate-200 rounded-lg pl-3 pr-7 py-1.5 bg-slate-50 text-slate-600 focus:outline-none cursor-pointer">
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Icon.ChevronDown /></span>
        </div>
        <div className="relative">
          <select value={insuranceFilter} onChange={e => setInsuranceFilter(e.target.value)} className="appearance-none text-sm border border-slate-200 rounded-lg pl-3 pr-7 py-1.5 bg-slate-50 text-slate-600 focus:outline-none cursor-pointer">
            <option value="ALL">All Insurance Providers</option>
            {insuranceOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Icon.ChevronDown /></span>
        </div>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left px-5 py-3">Patient</th>
              <th className="text-left px-4 py-3">MRN</th>
              <th className="text-left px-4 py-3">Age / Sex</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Insurance</th>
              <th className="text-left px-4 py-3">Last Visit</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr className="table-row">
                <td colSpan={8} className="px-5 py-6 text-center text-xs text-slate-400">No patients match your search or filters.</td>
              </tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="table-row">
                <td className="px-5 py-3.5 font-semibold text-slate-800">{p.name}</td>
                <td className="px-4 py-3.5"><span className="mrn-badge">{p.id}</span></td>
                <td className="px-4 py-3.5 text-slate-600">{p.age} / {p.gender}</td>
                <td className="px-4 py-3.5 text-slate-600">{p.phone}</td>
                <td className="px-4 py-3.5 text-slate-600">{p.insurance}</td>
                <td className="px-4 py-3.5 text-slate-500 text-xs">{p.lastVisit}</td>
                <td className="px-4 py-3.5">
                  <span className={p.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}>{p.status}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-1.5">
                    <button className="btn-ghost py-1 px-2 text-xs" onClick={() => openChart(p)}>
                      <Icon.Eye /> View Chart
                    </button>
                    <button className="btn-ghost py-1 px-2 text-xs" onClick={() => setModal({ type: 'edit', id: p.id })}>
                      <Icon.Edit /> Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'register' && (
        <PatientFormModal
          mode="register"
          initial={emptyPatientForm}
          subtitle="A new MRN is generated automatically."
          onClose={() => setModal(null)}
          onSubmit={f => { onRegisterPatient(f); setModal(null); }}
        />
      )}
      {modal?.type === 'edit' && target && (
        <PatientFormModal
          mode="edit"
          initial={editInitial(target)}
          subtitle={`MRN ${target.id}`}
          onClose={() => setModal(null)}
          onSubmit={f => { onUpdatePatient(target.id, f); setModal(null); }}
        />
      )}
      {modal?.type === 'chart' && target && (
        <PatientChartModal
          patient={target}
          appointments={appointments}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'edit', id: target.id })}
          onOpenEncounter={() => onOpenEncounter(target.id)}
        />
      )}
    </div>
  );
}

// ─── APPOINTMENTS SCREEN ──────────────────────────────────────────────────────
type StatusFilter = 'ALL' | 'CHECKED-IN' | 'IN-CONSULT' | 'COMPLETED';

function ScheduleModal({ patients, appointments, clinicians, initialDate, onClose, onSubmit }: {
  patients: PatientRow[];
  clinicians: string[];
  appointments: Appointment[];
  initialDate: string;
  onClose: () => void;
  onSubmit: (f: ScheduleForm) => void;
}) {
  const [form, setForm] = useState<ScheduleForm>({
    mrn: '',
    date: initialDate < APP_TODAY ? APP_TODAY : initialDate,
    time: '',
    type: appointmentTypes[0],
    clinician: clinicians[0] ?? '',
    room: rooms[0],
  });
  const [error, setError] = useState('');
  const set = (k: keyof ScheduleForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));
  const inputCls = 'mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400 transition';
  const labelCls = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';

  const submit = () => {
    if (!form.mrn) { setError('Please select a patient.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || isNaN(parseYmd(form.date).getTime())) { setError('Please choose a valid date.'); return; }
    if (form.date < APP_TODAY) { setError('Appointments cannot be scheduled in the past.'); return; }
    if (!form.time) { setError('Please select a time slot.'); return; }
    if (!form.clinician) { setError('No active clinicians are available to book.'); return; }
    const sameSlot = appointments.filter(a => a.date === form.date && a.time === form.time);
    if (sameSlot.some(a => a.mrn === form.mrn)) { setError('This patient already has an appointment at that time.'); return; }
    if (sameSlot.some(a => a.clinician === form.clinician)) { setError(`${form.clinician} is already booked at ${form.time} on that date.`); return; }
    if (sameSlot.some(a => a.room === form.room)) { setError(`${form.room} is already in use at ${form.time} on that date.`); return; }
    setError('');
    onSubmit(form);
  };

  return (
    <ModalShell title="Schedule Appointment" subtitle="Clinical Appointment Board" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Patient</label>
          <select className={inputCls} value={form.mrn} onChange={set('mrn')}>
            <option value="">Select a patient</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.id}{p.status !== 'ACTIVE' ? ' (inactive)' : ''}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input className={inputCls} type="date" min={APP_TODAY} value={form.date} onChange={set('date')} />
        </div>
        <div>
          <label className={labelCls}>Time</label>
          <select className={inputCls} value={form.time} onChange={set('time')}>
            <option value="">Select time</option>
            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Appointment Type</label>
          <select className={inputCls} value={form.type} onChange={set('type')}>
            {appointmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Clinician</label>
          <select className={inputCls} value={form.clinician} onChange={set('clinician')}>
            {clinicians.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Room</label>
          <select className={inputCls} value={form.room} onChange={set('room')}>
            {rooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Book Appointment</button>
      </div>
    </ModalShell>
  );
}

function AppointmentsScreen({ appointments, patients, clinicians, onAdvance, onSchedule }: {
  appointments: Appointment[];
  patients: PatientRow[];
  clinicians: string[];
  onAdvance: (id: string) => void;
  onSchedule: (f: ScheduleForm) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(APP_TODAY);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateMenu, setDateMenu] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dateMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setDateMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dateMenu]);

  const dayAppts = appointments.filter(a => a.date === selectedDate).sort(byTime);
  const statusCounts = {
    checkedIn: dayAppts.filter(a => a.status === 'CHECKED-IN').length,
    inConsult: dayAppts.filter(a => a.status === 'IN-CONSULT').length,
    completed: dayAppts.filter(a => a.status === 'COMPLETED').length,
  };
  const visible = statusFilter === 'ALL' ? dayAppts : dayAppts.filter(a => a.status === statusFilter);
  const dateLabel = selectedDate === APP_TODAY ? 'Today' : formatShortDate(selectedDate);
  const actionLabel = (s: string) => s === 'SCHEDULED' ? 'Check-In' : s === 'CHECKED-IN' ? 'Start Consult' : s === 'IN-CONSULT' ? 'Complete' : 'Done';

  const pickDate = (d: string) => {
    setSelectedDate(d);
    setDateMenu(false);
  };

  return (
    <div className="space-y-4">
      <div className="glass-card px-5 py-4 flex items-center justify-between relative z-10">
        <div>
          <h2 className="text-base font-bold text-slate-800">Clinical Appointment Board</h2>
          <p className="text-xs text-slate-400">{formatLongDate(selectedDate)} · All Clinicians · All Rooms</p>
        </div>
        <div className="flex gap-2">
          <div className="relative" ref={menuRef}>
            <button className="btn-ghost" onClick={() => setDateMenu(o => !o)}><Icon.ChevronDown /> {dateLabel}</button>
            {dateMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-40 p-2 space-y-1">
                {([['Today', APP_TODAY], ['Yesterday', addDays(APP_TODAY, -1)], ['Tomorrow', addDays(APP_TODAY, 1)]] as [string, string][]).map(([label, d]) => (
                  <button
                    key={label}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-semibold hover:bg-slate-50 ${selectedDate === d ? 'text-slate-900 bg-slate-50' : 'text-slate-600'}`}
                    onClick={() => pickDate(d)}
                  >
                    {label}<span className="text-slate-400 font-normal"> · {formatShortDate(d)}</span>
                  </button>
                ))}
                <div className="pt-2 border-t border-slate-100 px-1 pb-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Jump to date</div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => { if (e.target.value) pickDate(e.target.value); }}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={() => setScheduling(true)}><Icon.Plus /> Schedule Appointment</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {([
          { key: 'ALL', label: 'Total Scheduled', value: dayAppts.length, color: 'bg-slate-100 text-slate-700' },
          { key: 'CHECKED-IN', label: 'Checked-In', value: statusCounts.checkedIn, color: 'bg-blue-100 text-blue-800' },
          { key: 'IN-CONSULT', label: 'In Consultation', value: statusCounts.inConsult, color: 'bg-yellow-100 text-yellow-800' },
          { key: 'COMPLETED', label: 'Completed', value: statusCounts.completed, color: 'bg-green-100 text-green-800' },
        ] as { key: StatusFilter; label: string; value: number; color: string }[]).map(c => (
          <div
            key={c.key}
            role="button"
            onClick={() => setStatusFilter(c.key === statusFilter ? 'ALL' : c.key)}
            className={`glass-card p-5 text-center cursor-pointer transition-all ${statusFilter === c.key && c.key !== 'ALL' ? 'ring-2 ring-[#7A1C1C]/40' : ''}`}
          >
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-2xl font-bold mb-2 ${c.color}`}>{c.value}</div>
            <div className="text-xs font-semibold text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Daily Time-Slot Schedule — 8:00 AM to 4:00 PM</h3>
          <div className="flex gap-3 text-xs">
            {['SCHEDULED', 'CHECKED-IN', 'IN-CONSULT', 'COMPLETED'].map(s => (
              <span key={s} className="flex items-center gap-1.5">
                <ApptStatusBadge status={s} />
              </span>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {visible.length === 0 && (
            <div className="px-5 py-8 text-center text-xs text-slate-400">
              {dayAppts.length === 0 ? 'No appointments scheduled for this date.' : 'No appointments match this status.'}
            </div>
          )}
          {visible.map(a => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
              <div className="w-20 shrink-0 text-center">
                <div className="font-mono text-xs font-semibold text-slate-500">{a.time}</div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="flex-1 glass-card p-3.5" style={{ background: 'rgba(255,255,255,0.9)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-800">{a.patient}</span>
                      <span className="mrn-badge">{a.mrn}</span>
                    </div>
                    <div className="text-xs text-slate-500">{a.type} · <span className="text-slate-600 font-medium">{a.clinician}</span> · Room: {a.room}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ApptStatusBadge status={a.status} />
                    <button
                      className={`btn-ghost py-1 px-2 text-xs ${a.status === 'COMPLETED' ? 'opacity-50 cursor-default' : ''}`}
                      disabled={a.status === 'COMPLETED'}
                      onClick={() => onAdvance(a.id)}
                    >
                      {actionLabel(a.status)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {scheduling && (
        <ScheduleModal
          patients={patients}
          clinicians={clinicians}
          appointments={appointments}
          initialDate={selectedDate}
          onClose={() => setScheduling(false)}
          onSubmit={f => { onSchedule(f); setSelectedDate(f.date); setStatusFilter('ALL'); setScheduling(false); }}
        />
      )}
    </div>
  );
}

// ─── ENCOUNTERS SCREEN ────────────────────────────────────────────────────────
function RxModal({ existing, allergies, patientLabel, onClose, onSubmit }: { existing: Rx[]; allergies: string[]; patientLabel: string; onClose: () => void; onSubmit: (rx: Omit<Rx, 'id'>, overrode: boolean) => void }) {
  const [drug, setDrug] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState(rxFrequencies[0]);
  const [duration, setDuration] = useState('');
  const [route, setRoute] = useState(rxRoutes[0]);
  const [error, setError] = useState('');
  const [allergyAck, setAllergyAck] = useState(false);
  const inputCls = 'mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400 transition';
  const labelCls = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';

  const submit = () => {
    const name = drug.trim();
    if (!name) { setError('Please enter the medication name.'); return; }
    if (!dose.trim()) { setError('Please enter the dose (e.g. 500mg).'); return; }
    if (existing.some(r => r.drug.toLowerCase() === name.toLowerCase())) {
      setError(`${name} is already on this prescription list.`);
      return;
    }
    const hit = allergyMatch(name, allergies);
    if (hit && !allergyAck) {
      setError(`ALLERGY ALERT: patient has a documented ${hit} allergy. Click "Prescribe Anyway" only if this is clinically justified.`);
      setAllergyAck(true);
      return;
    }
    const dur = duration.trim();
    const freq = frequency === 'PRN' ? `PRN${dur ? ' ' + dur : ''}` : dur ? `${frequency} × ${dur}` : frequency;
    onSubmit({ drug: name, dose: dose.trim(), freq, route }, !!hit);
  };

  return (
    <ModalShell title="Add Prescription" subtitle={`Electronic Rx · ${patientLabel}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Medication</label>
          <input className={inputCls} value={drug} onChange={e => { setDrug(e.target.value); setAllergyAck(false); setError(''); }} placeholder="e.g. Paracetamol" autoFocus />
        </div>
        <div>
          <label className={labelCls}>Dose</label>
          <input className={inputCls} value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 500mg" />
        </div>
        <div>
          <label className={labelCls}>Route</label>
          <select className={inputCls} value={route} onChange={e => setRoute(e.target.value)}>
            {rxRoutes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Frequency</label>
          <select className={inputCls} value={frequency} onChange={e => setFrequency(e.target.value)}>
            {rxFrequencies.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{frequency === 'PRN' ? 'Indication' : 'Duration'}</label>
          <input className={inputCls} value={duration} onChange={e => setDuration(e.target.value)} placeholder={frequency === 'PRN' ? 'e.g. nausea' : 'e.g. 5 days'} />
        </div>
      </div>
      {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>{allergyAck ? 'Prescribe Anyway' : 'Add Prescription'}</button>
      </div>
    </ModalShell>
  );
}

function VitalsModal({ initial, patientLabel, onClose, onSubmit }: { initial: Vitals; patientLabel: string; onClose: () => void; onSubmit: (v: Vitals) => void }) {
  const [v, setV] = useState<Vitals>(initial);
  const [error, setError] = useState('');
  const set = (k: keyof Vitals) => (e: ChangeEvent<HTMLInputElement>) => setV(p => ({ ...p, [k]: e.target.value }));
  const inputCls = 'mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400 transition';
  const labelCls = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';
  const inRange = (s: string, lo: number, hi: number) => s === '' || (!isNaN(Number(s)) && Number(s) >= lo && Number(s) <= hi);

  const submit = () => {
    const bp = v.bp.trim();
    if (bp) {
      const m = /^(\d{2,3})\/(\d{2,3})$/.exec(bp);
      if (!m || Number(m[1]) < 50 || Number(m[1]) > 260 || Number(m[2]) < 30 || Number(m[2]) > 160 || Number(m[1]) <= Number(m[2])) {
        setError('Blood pressure must look like 120/80 (systolic 50–260, diastolic 30–160).');
        return;
      }
    }
    if (!inRange(v.hr.trim(), 20, 250)) { setError('Heart rate must be between 20 and 250 bpm.'); return; }
    if (!inRange(v.temp.trim(), 90, 110)) { setError('Temperature must be between 90 and 110 °F.'); return; }
    if (!inRange(v.bmi.trim(), 8, 80)) { setError('BMI must be between 8 and 80.'); return; }
    onSubmit({ bp, hr: v.hr.trim(), temp: v.temp.trim(), bmi: v.bmi.trim() });
  };

  return (
    <ModalShell title="Record Vitals" subtitle={patientLabel} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Blood Pressure (mmHg)</label><input className={inputCls} value={v.bp} onChange={set('bp')} placeholder="120/80" autoFocus /></div>
        <div><label className={labelCls}>Heart Rate (bpm)</label><input className={inputCls} value={v.hr} onChange={set('hr')} placeholder="72" /></div>
        <div><label className={labelCls}>Temperature (°F)</label><input className={inputCls} value={v.temp} onChange={set('temp')} placeholder="98.6" /></div>
        <div><label className={labelCls}>BMI (kg/m²)</label><input className={inputCls} value={v.bmi} onChange={set('bmi')} placeholder="24.0" /></div>
      </div>
      {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Save Vitals</button>
      </div>
    </ModalShell>
  );
}

function PatientPickerModal({ patients, appointments, activeMrn, onSelect, onClose }: { patients: PatientRow[]; appointments: Appointment[]; activeMrn: string; onSelect: (mrn: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = patients.filter(p => !query || p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
  return (
    <ModalShell title="Select Patient" subtitle="Choose whose clinical encounter to open" onClose={onClose}>
      <input
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400 transition"
        placeholder="Search by name or MRN..."
        value={q}
        onChange={e => setQ(e.target.value)}
        autoFocus
      />
      <div className="mt-3 max-h-72 overflow-auto divide-y divide-slate-50 border border-slate-100 rounded-lg">
        {list.length === 0 && <div className="px-3 py-4 text-xs text-slate-400 text-center">No patients found.</div>}
        {list.map(p => {
          const appts = appointments.filter(a => a.mrn === p.id && a.date === APP_TODAY).sort(byTime);
          const appt = appts.find(a => a.status !== 'COMPLETED') ?? appts[0];
          return (
            <button key={p.id} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer" onClick={() => onSelect(p.id)}>
              <div>
                <div className="text-sm font-semibold text-slate-800">{p.name}{p.id === activeMrn ? ' (current)' : ''}</div>
                <span className="mrn-badge">{p.id}</span>
              </div>
              {appt ? <ApptStatusBadge status={appt.status} /> : <span className="text-xs text-slate-400">No appointment today</span>}
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

function EncountersScreen({ patient, patients, appointments, encounter, visitHistory, pickerOpen, onPickerChange, onSelectPatient, onSoapChange, onAddRx, onRemoveRx, onSaveDraft, onFinalize, onNewEncounter, onSaveVitals, currentUser, onAuditEvent }: {
  currentUser: StaffUser;
  patient: PatientRow;
  patients: PatientRow[];
  appointments: Appointment[];
  encounter: EncounterState;
  visitHistory: VisitEntry[];
  pickerOpen: boolean;
  onPickerChange: (open: boolean) => void;
  onSelectPatient: (mrn: string) => void;
  onSoapChange: (field: keyof Soap, value: string) => void;
  onAddRx: (rx: Omit<Rx, 'id'>, overrode: boolean) => void;
  onRemoveRx: (id: string) => void;
  onSaveDraft: () => void;
  onFinalize: () => void;
  onNewEncounter: () => void;
  onSaveVitals: (v: Vitals) => void;
  onAuditEvent: AuditEventFn;
}) {
  const [rxOpen, setRxOpen] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  // OPTION A: Selected historical visit loaded directly onto the screen
  const [viewingHistoricalVisit, setViewingHistoricalVisit] = useState<VisitEntry | null>(null);
  const [error, setError] = useState('');

  // When viewing a historical visit, display its content in read-only mode
  const isHistorical = viewingHistoricalVisit !== null;
  const signed = encounter.status === 'SIGNED' || isHistorical;

  // Values shown in the main view
  const currentSoap = isHistorical
    ? (viewingHistoricalVisit.soap ?? {
      subjective: viewingHistoricalVisit.notes ?? 'No subjective notes recorded for this visit.',
      objective: 'Vitals & clinical observation recorded in historical chart.',
      assessment: viewingHistoricalVisit.diagnosis ?? viewingHistoricalVisit.type,
      plan: 'Historical treatment plan archived in electronic chart.',
    })
    : encounter.soap;

  const currentVitals = isHistorical ? (viewingHistoricalVisit.vitals ?? emptyVitals) : encounter.vitals;
  const currentRx = isHistorical ? (viewingHistoricalVisit.rx ?? []) : encounter.rx;

  const allergies = patient.allergies ?? [];
  const initials = patient.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const genderLabel = patient.gender === 'F' ? 'Female' : patient.gender === 'M' ? 'Male' : patient.gender === 'O' ? 'Other' : 'Sex not recorded';
  const todayAppt = appointments.filter(a => a.mrn === patient.id && a.date === APP_TODAY).sort(byTime)[0];
  const patientLabel = `${patient.name} (${patient.id})`;
  const currentUserLabel = `${currentUser.name}${currentUser.role === 'DOCTOR' ? ', MD' : ''}`;

  const finalize = () => {
    const missing = (['subjective', 'objective', 'assessment', 'plan'] as const).filter(f => !encounter.soap[f].trim());
    if (missing.length) {
      setError(`Please complete the ${missing.join(', ')} section${missing.length > 1 ? 's' : ''} before signing.`);
      return;
    }
    if (!window.confirm('Finalize and sign this encounter? The note will be locked and can no longer be edited.')) return;
    setError('');
    onFinalize();
  };

  const selectHistoryVisit = (v: VisitEntry) => {
    setViewingHistoricalVisit(v);
    onAuditEvent('RECORD_ACCESS', `Patient ${patient.id} — Historical Visit Record (${v.date} · ${v.type})`);
  };

  return (
    <div className="space-y-4">
      {/* Historical Record Banner when in review mode */}
      {isHistorical && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3.5 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-amber-200 text-amber-900"><Icon.Clipboard /></span>
            <div>
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Viewing Historical Visit: {viewingHistoricalVisit.date} · {viewingHistoricalVisit.type}
              </div>
              <div className="text-xs text-amber-700">
                Attending Clinician: <span className="font-semibold">{viewingHistoricalVisit.clinician}</span> · Read-Only Mode
              </div>
            </div>
          </div>
          <button
            onClick={() => setViewingHistoricalVisit(null)}
            className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-none"
          >
            ← Return to Today's Encounter
          </button>
        </div>
      )}

      {/* Patient header */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white" style={{ background: '#7A1C1C' }}>{initials}</div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-800">{patient.name}</h2>
                <span className="mrn-badge">{patient.id}</span>
                <span className={patient.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}>{patient.status}</span>
                <button
                  className="btn-ghost py-1 px-2 text-xs"
                  onClick={() => {
                    setViewingHistoricalVisit(null);
                    onPickerChange(true);
                  }}
                >
                  Switch Patient
                </button>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                DOB: {patient.dob ? formatLongDate(patient.dob) : 'Not recorded'} · {patient.age ? `${patient.age} years` : 'Age not recorded'} · {genderLabel} · {patient.insurance}{patient.pcp ? ` · PCP: ${patient.pcp}` : ''}
              </div>
              <div className="text-xs mt-1.5 flex gap-3">
                {allergies.length > 0
                  ? <span className="text-red-600 font-semibold">⚠ Allergies: {allergies.join(', ')}</span>
                  : <span className="text-slate-400">No known allergies recorded</span>}
              </div>
            </div>
          </div>
          <div
            role="button"
            title={signed ? 'Vitals are locked on signed / historical encounters' : 'Click to record vitals'}
            onClick={() => { if (!signed) setVitalsOpen(true); }}
            className={`grid grid-cols-4 gap-3 text-center ${signed ? '' : 'cursor-pointer'}`}
          >
            {[
              { label: 'BP', value: currentVitals.bp, unit: 'mmHg' },
              { label: 'HR', value: currentVitals.hr, unit: 'bpm' },
              { label: 'Temp', value: currentVitals.temp, unit: '°F' },
              { label: 'BMI', value: currentVitals.bmi, unit: 'kg/m²' },
            ].map((v, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{v.label}</div>
                <div className="text-base font-bold text-slate-800">{v.value || '—'}</div>
                <div className="text-xs text-slate-400">{v.unit}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* SOAP Notes */}
        <div className="col-span-8 space-y-3">
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Icon.FileText />
                {isHistorical
                  ? `SOAP Clinical Note — Historical: ${viewingHistoricalVisit.date}`
                  : `SOAP Clinical Note — ${formatLongDate(APP_TODAY)}`}
              </span>
              {isHistorical && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Archived Visit ({viewingHistoricalVisit.clinician})
                </span>
              )}
            </h3>
            <div className="space-y-4">
              {(['subjective', 'objective', 'assessment', 'plan'] as const).map(field => (
                <div key={field} className="soap-block">
                  <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#7A1C1C' }}>{field}</div>
                  <textarea
                    value={currentSoap[field]}
                    readOnly={signed}
                    placeholder={`Enter ${field} findings...`}
                    onChange={e => {
                      if (!signed) {
                        setError('');
                        onSoapChange(field, e.target.value);
                      }
                    }}
                    rows={field === 'plan' ? 5 : 3}
                    className={`w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:border-slate-400 resize-none font-sans leading-relaxed ${signed ? 'cursor-default bg-slate-50/70 select-text' : ''}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {isHistorical ? (
                <span className="font-semibold text-amber-800">
                  Archived Record: {viewingHistoricalVisit.type} on {viewingHistoricalVisit.date} · Clinician: {viewingHistoricalVisit.clinician}
                </span>
              ) : encounter.status === 'SIGNED' ? (
                `Signed electronically · ${encounter.signedAt} · Clinician: ${currentUserLabel}`
              ) : (
                `Encounter — ${formatMediumDate(APP_TODAY)}${todayAppt ? ` at ${todayAppt.time}` : ''} · Clinician: ${currentUserLabel}`
              )}
              {!signed && encounter.dirty && <span className="text-amber-600 font-semibold"> · Unsaved changes</span>}
              {!signed && !encounter.dirty && encounter.draftSavedAt && <span className="text-emerald-600 font-semibold"> · Draft saved {encounter.draftSavedAt}</span>}
              {error && <div className="text-red-600 font-semibold mt-1">{error}</div>}
            </div>

            <div className="flex gap-2">
              {isHistorical ? (
                <button
                  className="btn-primary"
                  onClick={() => setViewingHistoricalVisit(null)}
                >
                  ← Return to Today's Encounter
                </button>
              ) : encounter.status === 'SIGNED' ? (
                <>
                  <button className="btn-ghost" onClick={onNewEncounter}>New Encounter</button>
                  <button className="btn-primary opacity-60 cursor-default" disabled>
                    <Icon.Lock />
                    Signed
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-ghost" onClick={onSaveDraft}>Save Draft</button>
                  <button className="btn-primary" onClick={finalize}>
                    <Icon.Lock />
                    Finalize & Sign Encounter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Rx Table & Patient History */}
        <div className="col-span-4 space-y-3">
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {isHistorical ? `Prescriptions (${viewingHistoricalVisit.date})` : 'Electronic Rx'}
              </h3>
              {!isHistorical && (
                <button
                  className={`btn-ghost py-1 px-2 text-xs ${encounter.status === 'SIGNED' ? 'opacity-50 cursor-default' : ''}`}
                  disabled={encounter.status === 'SIGNED'}
                  onClick={() => setRxOpen(true)}
                >
                  <Icon.Plus /> Add Rx
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {currentRx.length === 0 && (
                <div className="px-4 py-3 text-xs text-slate-400">No prescriptions recorded for this encounter.</div>
              )}
              {currentRx.map(rx => (
                <div key={rx.id} className="px-4 py-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{rx.drug} {rx.dose}</div>
                    <div className="text-xs text-slate-500">{rx.freq} · {rx.route}</div>
                  </div>
                  {!signed && (
                    <button
                      className="text-slate-300 hover:text-red-500 text-lg leading-none px-1"
                      onClick={() => onRemoveRx(rx.id)}
                      aria-label={`Remove ${rx.drug}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Patient History Sidebar with Option A active selection */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Patient History</h3>
              <span className="text-xs font-normal text-slate-400">{visitHistory.length} visit{visitHistory.length !== 1 ? 's' : ''} total</span>
            </div>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {visitHistory.length === 0 && <div className="text-xs text-slate-400">No previous visits recorded.</div>}
              {visitHistory.map((v, i) => {
                const isSelected = viewingHistoricalVisit?.date === v.date && viewingHistoricalVisit?.type === v.type;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectHistoryVisit(v)}
                    className={`w-full text-left flex items-start justify-between text-xs p-2.5 rounded-xl border transition-all cursor-pointer ${isSelected
                        ? 'bg-amber-100/90 border-[#B8860B] ring-2 ring-[#B8860B]/40 shadow-sm'
                        : i === 0
                          ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/60 hover:border-amber-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
                      }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="truncate">{v.type}</span>
                        <span className="text-slate-400 shrink-0"><Icon.Eye /></span>
                      </div>
                      <div className="text-slate-400 mt-0.5">{v.clinician}</div>
                      {v.diagnosis && (
                        <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[170px]">
                          {v.diagnosis}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-slate-500 font-medium">{v.date}</span>
                      {isSelected ? (
                        <div className="text-[10px] text-amber-700 font-extrabold mt-0.5 tracking-wider">VIEWING</div>
                      ) : i === 0 ? (
                        <div className="text-[10px] text-amber-600 font-bold mt-0.5">LATEST</div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {rxOpen && (
        <RxModal
          existing={encounter.rx}
          allergies={allergies}
          patientLabel={patientLabel}
          onClose={() => setRxOpen(false)}
          onSubmit={(rx, overrode) => { onAddRx(rx, overrode); setRxOpen(false); }}
        />
      )}
      {vitalsOpen && (
        <VitalsModal
          initial={encounter.vitals}
          patientLabel={patientLabel}
          onClose={() => setVitalsOpen(false)}
          onSubmit={v => { onSaveVitals(v); setVitalsOpen(false); }}
        />
      )}
      {pickerOpen && (
        <PatientPickerModal
          patients={patients}
          appointments={appointments}
          activeMrn={patient.id}
          onSelect={mrn => {
            setViewingHistoricalVisit(null);
            onSelectPatient(mrn);
          }}
          onClose={() => onPickerChange(false)}
        />
      )}
    </div>
  );
}

// ─── AUDIT SCREEN ─────────────────────────────────────────────────────────────
function AuditScreen({ auditLogs }: { auditLogs: AuditLogEntry[] }) {
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'>('ALL');
  const filtered = auditLogs.filter(l => levelFilter === 'ALL' || l.level === levelFilter);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex gap-3 items-start">
        <span className="text-red-500 mt-0.5"><Icon.AlertTriangle /></span>
        <div>
          <div className="text-sm font-bold text-red-700">HeFRAA Compliance Notice — Immutable Audit Logging Active</div>
          <div className="text-xs text-red-600 mt-0.5">All access, modification, and export events are cryptographically logged and cannot be altered or deleted. This audit trail is subject to HeFRAA Security Rule §164.312(b) requirements. Unauthorized data access will be reported to the Privacy Officer.</div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Security Audit Log — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              {(['ALL', 'INFO', 'WARNING', 'CRITICAL'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLevelFilter(l)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${levelFilter === l ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button className="btn-ghost text-xs px-3 py-1.5 cursor-pointer" onClick={() => exportAuditLogsToCSV(auditLogs)}>
              Export CSV
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left px-5 py-3">Timestamp</th>
              <th className="text-left px-4 py-3">Level</th>
              <th className="text-left px-4 py-3">User & Role</th>
              <th className="text-left px-4 py-3">Action Category</th>
              <th className="text-left px-4 py-3">Affected Resource</th>
              <th className="text-left px-4 py-3">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log, i) => (
              <tr key={i} className="table-row">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{log.ts}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs font-bold ${log.level === 'CRITICAL' ? 'audit-critical' : log.level === 'WARNING' ? 'audit-warning' : 'audit-info'}`}>
                    {log.level}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="text-xs font-semibold text-slate-700">{log.user}</div>
                  <RoleBadge role={log.role} />
                </td>
                <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{log.action}</td>
                <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">{log.resource}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SETTINGS SCREEN ──────────────────────────────────────────────────────────
function StaffModal({ mode, initial, staff, editingEmail, onClose, onSubmit }: {
  mode: 'add' | 'edit';
  initial: StaffForm;
  staff: StaffUser[];
  editingEmail?: string;
  onClose: () => void;
  onSubmit: (f: StaffForm) => string | null;
}) {
  const [form, setForm] = useState<StaffForm>(initial);
  const [emailTouched, setEmailTouched] = useState(mode === 'edit');
  const [error, setError] = useState('');
  const inputCls = 'mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400 transition';
  const labelCls = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';
  const autoEmail = (first: string, last: string) =>
    first.trim() && last.trim() ? `${first.trim()[0]}.${last.trim().replace(/\s+/g, '')}@eldamedical.com`.toLowerCase() : '';
  const isAdminRole = form.role === 'ADMIN';

  const setNamePart = (k: 'firstName' | 'lastName') => (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setError('');
    setForm(p => {
      const next = { ...p, [k]: v };
      if (!emailTouched) next.email = autoEmail(next.firstName, next.lastName);
      return next;
    });
  };

  const submit = () => {
    let name = form.name.trim().replace(/\s+/g, ' ');
    if (mode === 'add') {
      if (!form.firstName.trim() || !form.lastName.trim()) { setError('Please enter the first and last name.'); return; }
      name = `${rolePrefix[form.role] ?? ''}${form.firstName.trim()} ${form.lastName.trim()}`.replace(/\s+/g, ' ');
    } else if (!name) {
      setError('Please enter the staff member\u2019s name.');
      return;
    }
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return; }
    if (staff.some(u => u.email.toLowerCase() === email && u.email.toLowerCase() !== (editingEmail ?? '').toLowerCase())) {
      setError('A staff account with this email already exists.');
      return;
    }
    if (form.role === 'DOCTOR') {
      const short = clinicianShort(name);
      if (staff.some(u => u.role === 'DOCTOR' && u.email.toLowerCase() !== (editingEmail ?? '').toLowerCase() && clinicianShort(u.name) === short)) {
        setError(`Another doctor is already listed as "${short}". Surnames must be unique so clinicians can be told apart on the schedule.`);
        return;
      }
    }
    const err = onSubmit({ ...form, name, email, isAdmin: form.isAdmin || isAdminRole });
    if (err) setError(err);
    else onClose();
  };

  const toggleRow = (label: string, on: boolean, onToggle: () => void) => (
    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );

  return (
    <ModalShell title={mode === 'add' ? 'Add Staff User' : 'Edit Staff User'} subtitle={mode === 'add' ? 'Create a new staff account' : editingEmail} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {mode === 'add' ? (
          <>
            <div>
              <label className={labelCls}>First Name</label>
              <input className={inputCls} value={form.firstName} onChange={setNamePart('firstName')} placeholder="e.g. Kofi" autoFocus />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input className={inputCls} value={form.lastName} onChange={setNamePart('lastName')} placeholder="e.g. Boateng" />
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <label className={labelCls}>Display Name</label>
            <input className={inputCls} value={form.name} onChange={e => { setError(''); setForm(p => ({ ...p, name: e.target.value })); }} autoFocus />
          </div>
        )}
        <div className="col-span-2">
          <label className={labelCls}>Email</label>
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={e => { setEmailTouched(true); setError(''); setForm(p => ({ ...p, email: e.target.value })); }}
            placeholder="name@eldamedical.com"
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Role</label>
          <select className={inputCls} value={form.role} onChange={e => { setError(''); setForm(p => ({ ...p, role: e.target.value })); }}>
            {staffRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className={mode === 'edit' ? '' : 'col-span-2'}>
          {toggleRow('Admin access', form.isAdmin || isAdminRole, () => { if (!isAdminRole) setForm(p => ({ ...p, isAdmin: !p.isAdmin })); })}
        </div>
        {mode === 'edit' && <div>{toggleRow('Account active', form.active, () => setForm(p => ({ ...p, active: !p.active })))}</div>}
      </div>
      {error && <div className="mt-3 text-xs font-semibold text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>{mode === 'add' ? 'Add Staff User' : 'Save Changes'}</button>
      </div>
    </ModalShell>
  );
}

function SettingsScreen({ staff, clinic, security, prefs, onSaveClinic, onSavePrefs, onToggleSecurity, onAddStaff, onUpdateStaff, onToggleStaffActive, onToggleStaffAdmin }: {
  staff: StaffUser[];
  clinic: ClinicInfo;
  security: Record<string, boolean>;
  prefs: Prefs;
  onSaveClinic: (c: ClinicInfo) => void;
  onSavePrefs: (p: Prefs) => void;
  onToggleSecurity: (key: string) => void;
  onAddStaff: (f: StaffForm) => string | null;
  onUpdateStaff: (email: string, f: StaffForm) => string | null;
  onToggleStaffActive: (email: string) => void;
  onToggleStaffAdmin: (email: string) => void;
}) {
  const [tab, setTab] = useState(0);
  const [clinicDraft, setClinicDraft] = useState<ClinicInfo>(clinic);
  const [prefsDraft, setPrefsDraft] = useState<Prefs>(prefs);
  const [clinicMsg, setClinicMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [prefsMsg, setPrefsMsg] = useState('');
  const [staffModal, setStaffModal] = useState<null | { mode: 'add' } | { mode: 'edit'; email: string }>(null);
  const tabs = ['General Clinic Info', 'Users & Roles', 'Security & HeFRAA', 'Clinical Preferences'];

  const clinicFields: { key: keyof ClinicInfo; label: string }[] = [
    { key: 'name', label: 'Clinic Name' },
    { key: 'npi', label: 'NPI Number' },
    { key: 'contact', label: 'Primary Contact' },
    { key: 'address', label: 'Address' },
    { key: 'ehr', label: 'EHR Instance ID' },
  ];
  const prefFields: { key: keyof Prefs; label: string; options: string[] }[] = [
    { key: 'soap', label: 'Default SOAP note template', options: ['Standard SOAP', 'BIRP', 'DAP', 'Custom'] },
    { key: 'vitals', label: 'Vitals frequency reminder', options: ['Every visit', 'Every 30 days', 'Chronic only'] },
    { key: 'rx', label: 'Prescription print format', options: ['Standard Rx Pad', 'Electronic Only', 'Dual'] },
  ];

  const saveClinic = () => {
    const c: ClinicInfo = {
      name: clinicDraft.name.trim(),
      npi: clinicDraft.npi.trim(),
      contact: clinicDraft.contact.trim(),
      address: clinicDraft.address.trim(),
      ehr: clinicDraft.ehr.trim(),
    };
    if (!c.name) { setClinicMsg({ ok: false, text: 'Clinic name is required.' }); return; }
    if (!/^\d{10}$/.test(c.npi)) { setClinicMsg({ ok: false, text: 'NPI number must be exactly 10 digits.' }); return; }
    onSaveClinic(c);
    setClinicDraft(c);
    setClinicMsg({ ok: true, text: 'Changes saved' });
  };

  const savePrefs = () => {
    onSavePrefs(prefsDraft);
    setPrefsMsg('Preferences saved');
  };

  const editing = staffModal?.mode === 'edit' ? staff.find(u => u.email === staffModal.email) : undefined;

  return (
    <div className="space-y-4">
      <div className="glass-card px-5 py-4">
        <h2 className="text-base font-bold text-slate-800">System Settings & Configuration</h2>
        <p className="text-xs text-slate-400">Manage clinic info, user roles, and HeFRAA compliance settings</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-slate-100 px-5">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`py-3.5 px-4 text-sm transition-all ${tab === i ? 'tab-active' : 'tab-inactive'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 0 && (
            <div className="max-w-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-700">Clinic Information</h3>
              {clinicFields.map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{f.label}</label>
                  <input
                    value={clinicDraft[f.key]}
                    onChange={e => { setClinicMsg(null); setClinicDraft(p => ({ ...p, [f.key]: e.target.value })); }}
                    className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3 mt-2">
                <button className="btn-primary" onClick={saveClinic}>Save Changes</button>
                {clinicMsg && <span className={`text-xs font-semibold ${clinicMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{clinicMsg.text}</span>}
              </div>
            </div>
          )}

          {tab === 1 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700">Staff Directory & Role Management</h3>
                <button className="btn-primary" onClick={() => setStaffModal({ mode: 'add' })}><Icon.Plus /> Add Staff User</button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-4 py-3">Staff Member</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Admin Access</th>
                    <th className="text-left px-4 py-3">Account Active</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(u => (
                    <tr key={u.email} className="table-row">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3.5"><Toggle on={u.isAdmin} onToggle={() => onToggleStaffAdmin(u.email)} /></td>
                      <td className="px-4 py-3.5"><Toggle on={u.active} onToggle={() => onToggleStaffActive(u.email)} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1.5">
                          <button className="btn-ghost py-1 px-2 text-xs" onClick={() => setStaffModal({ mode: 'edit', email: u.email })}><Icon.Edit /> Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 2 && (
            <div className="max-w-xl space-y-5">
              <h3 className="text-sm font-bold text-slate-700">Security & HeFRAA Configuration</h3>
              {securityItems.map(item => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                  <Toggle on={security[item.key]} onToggle={() => onToggleSecurity(item.key)} />
                </div>
              ))}
            </div>
          )}

          {tab === 3 && (
            <div className="max-w-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-700">Clinical Preferences</h3>
              {prefFields.map(pref => (
                <div key={pref.key}>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{pref.label}</label>
                  <div className="relative mt-1">
                    <select
                      value={prefsDraft[pref.key]}
                      onChange={e => { setPrefsMsg(''); setPrefsDraft(p => ({ ...p, [pref.key]: e.target.value })); }}
                      className="w-full text-sm border border-slate-200 rounded-lg pl-3 pr-8 py-2 bg-slate-50 focus:outline-none appearance-none cursor-pointer"
                    >
                      {pref.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Icon.ChevronDown /></span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 mt-2">
                <button className="btn-primary" onClick={savePrefs}>Save Preferences</button>
                {prefsMsg && <span className="text-xs font-semibold text-emerald-600">{prefsMsg}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {staffModal?.mode === 'add' && (
        <StaffModal
          mode="add"
          initial={{ firstName: '', lastName: '', name: '', email: '', role: 'DOCTOR', isAdmin: false, active: true }}
          staff={staff}
          onClose={() => setStaffModal(null)}
          onSubmit={onAddStaff}
        />
      )}
      {staffModal?.mode === 'edit' && editing && (
        <StaffModal
          mode="edit"
          initial={{ firstName: '', lastName: '', name: editing.name, email: editing.email, role: editing.role, isAdmin: editing.isAdmin, active: editing.active }}
          staff={staff}
          editingEmail={editing.email}
          onClose={() => setStaffModal(null)}
          onSubmit={f => onUpdateStaff(editing.email, f)}
        />
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const savedSession = restoreSession();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(savedSession !== null);
  const [currentUserEmail, setCurrentUserEmail] = useState(
    savedSession?.email ?? CURRENT_USER_EMAIL
  );
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [patients, setPatients] = useState<PatientRow[]>(seedPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(seedAppointments);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(seedAuditLogs);
  const [patientSearch, setPatientSearch] = useState('');
  const [activeMrn, setActiveMrn] = useState(DEFAULT_MRN);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [encounters, setEncounters] = useState<Record<string, EncounterState>>(seedEncounters);
  const [visits, setVisits] = useState<Record<string, VisitEntry[]>>(seedVisits);
  const [encountersLogged, setEncountersLogged] = useState(1047);
  const [rxSeq, setRxSeq] = useState(813);
  const [staff, setStaff] = useState<StaffUser[]>(() => {
    if (savedSession && !staffUsers.some(u => u.email === savedSession.email)) {
      return [savedSession, ...staffUsers];
    }
    return staffUsers;
  });
  const [clinic, setClinic] = useState<ClinicInfo>(seedClinic);
  const [security, setSecurity] = useState<Record<string, boolean>>(seedSecurity);
  const [prefs, setPrefs] = useState<Prefs>(seedPrefs);

  const currentUser: StaffUser = staff.find(u => u.email === currentUserEmail) ?? staff[0];

  const addAuditLog: AuditEventFn = (action, resource, level = 'INFO') => {
    setAuditLogs(prev => [
      { ts: nowStamp(), user: currentUser.name, role: currentUser.role, action, resource, ip: '10.0.1.14', level },
      ...prev,
    ]);
  };

  const handleLogout = () => {
    addAuditLog('LOGOUT', `User ${currentUser.name} signed out`);
    localStorage.removeItem('elda_token');
    localStorage.removeItem('elda_user');
    setIsAuthenticated(false);
  };

  const handleLogin = (user: StaffUser) => {
    setStaff(prev =>
      prev.some(u => u.email === user.email) ? prev : [user, ...prev]
    );
    setCurrentUserEmail(user.email);
    setIsAuthenticated(true);
    setAuditLogs(prev => [
      { ts: nowStamp(), user: user.name, role: user.role, action: 'LOGIN_SUCCESS', resource: 'User authenticated into clinical portal', ip: '10.0.1.14', level: 'INFO' },
      ...prev,
    ]);
  };

  const handleSwitchAccount = (email: string) => {
    const next = staff.find(u => u.email === email);
    if (!next || !next.active || email === currentUserEmail) return;
    addAuditLog('ACCOUNT_SWITCHED', `Session switched from ${currentUser.name} to ${next.name}`, 'WARNING');
    setCurrentUserEmail(email);
  };

  const handleSearchPatient = (query: string) => {
    setPatientSearch(query);
    setScreen('patients');
  };

  const handleRegisterPatient = (form: PatientForm) => {
    const nameParts = form.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Patient';
    let mrn = '';
    do {
      mrn = `ELD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    } while (patients.some(p => p.id === mrn));

    const newPatientRow: PatientRow = {
      id: mrn,
      name: `${firstName} ${lastName}`,
      age: form.dob ? calcAge(form.dob) : 0,
      gender: form.gender || '—',
      phone: form.phone || 'N/A',
      insurance: form.insurance || 'Self-Paid',
      lastVisit: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'ACTIVE',
      dob: form.dob || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      allergies: parseAllergies(form.allergies),
    };

    setPatients(prev => [newPatientRow, ...prev]);
    addAuditLog('CREATE_PATIENT', `Patient ${mrn} — New Registration`);
    alert(`Patient ${firstName} ${lastName} registered successfully!\nMRN: ${mrn}`);
  };

  const handleUpdatePatient = (id: string, form: PatientForm) => {
    setPatients(prev => prev.map(p => p.id !== id ? p : {
      ...p,
      name: form.fullName.trim().replace(/\s+/g, ' '),
      dob: form.dob || p.dob,
      age: form.dob ? calcAge(form.dob) : p.age,
      gender: form.gender || '—',
      phone: form.phone || 'N/A',
      email: form.email || undefined,
      address: form.address || undefined,
      allergies: parseAllergies(form.allergies),
      insurance: form.insurance || 'Self-Paid',
      status: form.status || p.status,
    }));
    setAppointments(prev => prev.map(a => a.mrn === id ? { ...a, patient: form.fullName.trim().replace(/\s+/g, ' ') } : a));
    addAuditLog('UPDATE_PATIENT', `Patient ${id} — Record Updated`);
  };

  const handleAdvanceAppointment = (id: string) => {
    const a = appointments.find(x => x.id === id);
    if (!a) return;
    if (a.date !== APP_TODAY) {
      alert('Appointment status can only be updated on the day of the appointment.');
      return;
    }
    const next = a.status === 'SCHEDULED' ? 'CHECKED-IN' : a.status === 'CHECKED-IN' ? 'IN-CONSULT' : a.status === 'IN-CONSULT' ? 'COMPLETED' : null;
    if (!next) return;
    const actions: Record<string, string> = { 'CHECKED-IN': 'PATIENT_CHECKED_IN', 'IN-CONSULT': 'CONSULT_STARTED', 'COMPLETED': 'CONSULT_COMPLETED' };
    setAppointments(prev => prev.map(x => x.id === id ? { ...x, status: next } : x));
    if (next === 'COMPLETED') {
      setPatients(prev => prev.map(p => p.id === a.mrn ? { ...p, lastVisit: formatMediumDate(a.date) } : p));
    }
    addAuditLog(actions[next], `Appt ${a.id} — ${a.patient} (${a.mrn})`);
  };

  const handleScheduleAppointment = (form: ScheduleForm) => {
    const p = patients.find(x => x.id === form.mrn);
    if (!p) return;
    const nextNum = Math.max(1400, ...appointments.map(a => parseInt(String(a.id ?? '').split('-').pop() || '0', 10) || 0)) + 1;
    const appt: Appointment = {
      id: `APT-2026-${nextNum}`,
      date: form.date,
      time: form.time,
      mrn: p.id,
      patient: p.name,
      type: form.type,
      clinician: form.clinician,
      room: form.room,
      status: 'SCHEDULED',
    };
    setAppointments(prev => [...prev, appt]);
    addAuditLog('SCHEDULE_APPOINTMENT', `Appt ${appt.id} — ${p.name} (${p.id})`);
  };

  const activePatient = patients.find(p => p.id === activeMrn) ?? patients[0];
  const encounter = encounters[activeMrn] ?? blankEncounter();

  const updateEncounter = (fn: (e: EncounterState) => EncounterState) =>
    setEncounters(prev => ({ ...prev, [activeMrn]: fn(prev[activeMrn] ?? blankEncounter()) }));

  const handleOpenEncounter = (mrn: string) => {
    setActiveMrn(mrn);
    setPickerOpen(false);
    setScreen('encounters');
  };

  const handleLogEncounter = () => {
    setScreen('encounters');
    setPickerOpen(true);
  };

  const handleSelectPatient = (mrn: string) => {
    setActiveMrn(mrn);
    setPickerOpen(false);
  };

  const handleSoapChange = (field: keyof Soap, value: string) => {
    updateEncounter(e => e.status === 'SIGNED' ? e : { ...e, soap: { ...e.soap, [field]: value }, dirty: true });
  };

  const handleSaveVitals = (v: Vitals) => {
    updateEncounter(e => e.status === 'SIGNED' ? e : { ...e, vitals: v, dirty: true });
    addAuditLog('VITALS_UPDATE', `Patient ${activeMrn} — Vitals Record`);
  };

  const handleAddRx = (rx: Omit<Rx, 'id'>, overrode: boolean) => {
    const id = `RX-2026-${String(rxSeq).padStart(5, '0')}`;
    setRxSeq(n => n + 1);
    updateEncounter(e => e.status === 'SIGNED' ? e : { ...e, rx: [...e.rx, { id, ...rx }], dirty: true });
    addAuditLog(
      'ISSUE_PRESCRIPTION',
      `Rx ${id} — ${rx.drug} ${rx.dose} — ${activeMrn}${overrode ? ' (ALLERGY OVERRIDE)' : ''}`,
      overrode ? 'WARNING' : 'INFO'
    );
  };

  const handleRemoveRx = (id: string) => {
    const r = encounter.rx.find(x => x.id === id);
    if (!r) return;
    updateEncounter(e => e.status === 'SIGNED' ? e : { ...e, rx: e.rx.filter(x => x.id !== id), dirty: true });
    addAuditLog('PRESCRIPTION_REMOVED', `${r.drug} ${r.dose} — ${activeMrn}`);
  };

  const handleSaveDraft = () => {
    updateEncounter(e => ({ ...e, dirty: false, draftSavedAt: timeNow() }));
    addAuditLog('UPDATE_PATIENT', `Patient ${activeMrn} — SOAP Draft Saved`);
  };

  // Automatically snapshot SOAP notes and vitals into Patient History on finalize
  const handleFinalizeEncounter = () => {
    const now = new Date();
    const todayYmd = toYmd(now);
    const todays = appointments.filter(a => a.mrn === activeMrn && a.date === todayYmd).sort(byTime);
    const inProgress = todays.find(a => a.status === 'CHECKED-IN' || a.status === 'IN-CONSULT');
    const visitType = (inProgress ?? todays[0])?.type ?? 'Clinical Encounter';

    updateEncounter(e => ({ ...e, status: 'SIGNED', dirty: false, signedAt: `${formatMediumDate(todayYmd)} at ${timeNow()}` }));

    const newHistoryEntry: VisitEntry = {
      date: formatMediumDate(todayYmd),
      type: visitType,
      clinician: clinicianShort(currentUser.name),
      vitals: { ...encounter.vitals },
      rx: [...encounter.rx],
      soap: { ...encounter.soap },
      diagnosis: encounter.soap.assessment || 'Encounter Signed',
      notes: encounter.soap.plan || 'Clinical visit finalized.',
    };

    setVisits(prev => ({
      ...prev,
      [activeMrn]: [newHistoryEntry, ...(prev[activeMrn] ?? [])],
    }));

    setEncountersLogged(n => n + 1);
    setPatients(prev => prev.map(p => p.id === activeMrn ? { ...p, lastVisit: formatMediumDate(todayYmd) } : p));
    if (inProgress) {
      setAppointments(prev => prev.map(a => a.id === inProgress.id ? { ...a, status: 'COMPLETED' } : a));
    }
    addAuditLog('CREATE_ENCOUNTER', `Patient ${activeMrn} — Encounter Finalized & Signed (${encounter.rx.length} Rx)`);
  };

  const handleNewEncounter = () => {
    updateEncounter(() => blankEncounter());
    addAuditLog('ENCOUNTER_STARTED', `Patient ${activeMrn} — New Encounter`);
  };

  const clinicianOptions = Array.from(new Set(staff.filter(u => u.role === 'DOCTOR' && u.active).map(u => clinicianShort(u.name))));

  const guardStaffChange = (u: StaffUser, next: { active: boolean; isAdmin: boolean }): string | null => {
    const adminCount = staff.filter(x => x.isAdmin && x.active).length;
    const isOwn = u.email.toLowerCase() === currentUserEmail.toLowerCase();
    if (u.active && !next.active) {
      if (isOwn) return "You can't deactivate your own account.";
      if (u.isAdmin && adminCount <= 1) return 'At least one active administrator is required.';
    }
    if (u.isAdmin && !next.isAdmin) {
      if (isOwn) return "You can't remove your own admin access.";
      if (u.active && adminCount <= 1) return 'At least one active administrator is required.';
    }
    return null;
  };

  const handleToggleStaffActive = (email: string) => {
    const u = staff.find(x => x.email === email);
    if (!u) return;
    const err = guardStaffChange(u, { active: !u.active, isAdmin: u.isAdmin });
    if (err) { alert(err); return; }
    setStaff(prev => prev.map(x => x.email === email ? { ...x, active: !x.active } : x));
    addAuditLog('USER_STATUS_CHANGED', `Staff Account — ${u.name} ${u.active ? 'deactivated' : 'activated'}`, 'WARNING');
  };

  const handleToggleStaffAdmin = (email: string) => {
    const u = staff.find(x => x.email === email);
    if (!u) return;
    const err = guardStaffChange(u, { active: u.active, isAdmin: !u.isAdmin });
    if (err) { alert(err); return; }
    setStaff(prev => prev.map(x => x.email === email ? { ...x, isAdmin: !x.isAdmin } : x));
    addAuditLog('USER_ROLE_MODIFIED', `Staff Account — ${u.name} admin access ${u.isAdmin ? 'revoked' : 'granted'}`, 'WARNING');
  };

  const handleAddStaff = (form: StaffForm): string | null => {
    if (staff.some(u => u.email.toLowerCase() === form.email.toLowerCase())) return 'A staff account with this email already exists.';
    setStaff(prev => [...prev, { name: form.name, email: form.email, role: form.role, isAdmin: form.isAdmin, active: true }]);
    addAuditLog('STAFF_CREATED', `Staff Account — ${form.name} (${form.role}${form.isAdmin ? ', admin' : ''})`, form.isAdmin ? 'WARNING' : 'INFO');
    return null;
  };

  const handleUpdateStaff = (email: string, form: StaffForm): string | null => {
    const u = staff.find(x => x.email === email);
    if (!u) return 'Staff account not found.';
    if (u.email.toLowerCase() === currentUserEmail.toLowerCase() && form.email.toLowerCase() !== u.email.toLowerCase()) {
      return "You can't change your own sign-in email here.";
    }
    const err = guardStaffChange(u, { active: form.active, isAdmin: form.isAdmin });
    if (err) return err;
    const changes: string[] = [];
    if (form.name !== u.name) changes.push(`name → ${form.name}`);
    if (form.email !== u.email) changes.push(`email → ${form.email}`);
    if (form.role !== u.role) changes.push(`role ${u.role} → ${form.role}`);
    if (form.isAdmin !== u.isAdmin) changes.push(`admin access ${form.isAdmin ? 'granted' : 'revoked'}`);
    if (form.active !== u.active) changes.push(form.active ? 'activated' : 'deactivated');
    if (changes.length === 0) return null;
    setStaff(prev => prev.map(x => x.email === email ? { ...x, name: form.name, email: form.email, role: form.role, isAdmin: form.isAdmin, active: form.active } : x));
    const privileged = form.role !== u.role || form.isAdmin !== u.isAdmin || form.active !== u.active;
    addAuditLog(
      form.role !== u.role || form.isAdmin !== u.isAdmin ? 'USER_ROLE_MODIFIED' : form.active !== u.active ? 'USER_STATUS_CHANGED' : 'USER_UPDATED',
      `Staff Account — ${u.name}: ${changes.join('; ')}`,
      privileged ? 'WARNING' : 'INFO'
    );
    return null;
  };

  const handleSaveClinic = (c: ClinicInfo) => {
    setClinic(c);
    addAuditLog('SETTINGS_UPDATED', 'Clinic Information — Saved');
  };

  const handleSavePrefs = (p: Prefs) => {
    setPrefs(p);
    addAuditLog('SETTINGS_UPDATED', 'Clinical Preferences — Saved');
  };

  const handleToggleSecurity = (key: string) => {
    const item = securityItems.find(i => i.key === key);
    if (!item) return;
    if (key === 'audit') {
      alert('Immutable audit logging is required for HeFRAA compliance and cannot be disabled.');
      return;
    }
    const next = !security[key];
    setSecurity(prev => ({ ...prev, [key]: next }));
    addAuditLog('SECURITY_SETTING_CHANGED', `${item.label} — ${next ? 'enabled' : 'disabled'}`, next ? 'INFO' : 'WARNING');
  };

  const screenMap: Record<Screen, JSX.Element> = {
    dashboard: (
      <DashboardScreen
        currentUser={currentUser}
        patients={patients}
        auditLogs={auditLogs}
        appointments={appointments}
        encountersLogged={encountersLogged}
        onRegisterPatient={handleRegisterPatient}
        onNavigate={setScreen}
        onLogEncounter={handleLogEncounter}
        onOpenEncounter={handleOpenEncounter}
      />
    ),
    patients: (
      <PatientsScreen
        patients={patients}
        appointments={appointments}
        search={patientSearch}
        onSearchChange={setPatientSearch}
        onAuditEvent={addAuditLog}
        onRegisterPatient={handleRegisterPatient}
        onUpdatePatient={handleUpdatePatient}
        onOpenEncounter={handleOpenEncounter}
      />
    ),
    appointments: <AppointmentsScreen appointments={appointments} patients={patients} clinicians={clinicianOptions} onAdvance={handleAdvanceAppointment} onSchedule={handleScheduleAppointment} />,
    encounters: (
      <EncountersScreen
        key={activeMrn}
        currentUser={currentUser}
        patient={activePatient}
        patients={patients}
        appointments={appointments}
        encounter={encounter}
        visitHistory={visits[activeMrn] ?? []}
        pickerOpen={pickerOpen}
        onPickerChange={setPickerOpen}
        onSelectPatient={handleSelectPatient}
        onSoapChange={handleSoapChange}
        onAddRx={handleAddRx}
        onRemoveRx={handleRemoveRx}
        onSaveDraft={handleSaveDraft}
        onFinalize={handleFinalizeEncounter}
        onNewEncounter={handleNewEncounter}
        onSaveVitals={handleSaveVitals}
        onAuditEvent={addAuditLog}
      />
    ),
    audit: <AuditScreen auditLogs={auditLogs} />,
    settings: (
      <SettingsScreen
        staff={staff}
        clinic={clinic}
        security={security}
        prefs={prefs}
        onSaveClinic={handleSaveClinic}
        onSavePrefs={handleSavePrefs}
        onToggleSecurity={handleToggleSecurity}
        onAddStaff={handleAddStaff}
        onUpdateStaff={handleUpdateStaff}
        onToggleStaffActive={handleToggleStaffActive}
        onToggleStaffAdmin={handleToggleStaffAdmin}
      />
    ),
  };

  if (!isAuthenticated) {
    return <LoginScreen staffUsers={staff} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <Sidebar active={screen} onNavigate={setScreen} patientsCount={patients.length} appointmentsCount={appointments.filter(a => a.date === APP_TODAY).length} currentUser={currentUser} onLogout={handleLogout} />
      <Header screen={screen} patients={patients} staff={staff} currentUser={currentUser} onSearchPatient={handleSearchPatient} onSwitchAccount={handleSwitchAccount} onLogout={handleLogout} />
      <main className="pl-[260px] pt-14">
        <div className="p-6 max-w-[1400px]">
          {screenMap[screen]}
        </div>
      </main>
    </div>
  );
}