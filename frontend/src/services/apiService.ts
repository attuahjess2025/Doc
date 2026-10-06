// ─── Elda Medical PMS — API Service ─────────────────────────────────────────
// Wraps fetch with JWT token injection and global 401 handling.

const BASE_URL = 'http://localhost:8080/api/v1';

function getToken(): string | null {
  return localStorage.getItem('elda_token');
}

function clearSession() {
  localStorage.removeItem('elda_token');
  localStorage.removeItem('elda_user');
  // Reload to trigger the login screen
  window.location.reload();
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 || response.status === 403) {
    clearSession();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error ?? `Request failed: ${response.status}`);
  }

  // 204 No Content
  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  email: string;
  fullName: string;
  role: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await request<LoginResponse>('POST', '/auth/login', { email, password });
  localStorage.setItem('elda_token', data.token);
  localStorage.setItem('elda_user', JSON.stringify({
    name: data.fullName,
    email: data.email,
    role: data.role,
    isAdmin: data.role === 'ADMIN',
    active: true,
  }));
  return data;
}

export function logout() {
  clearSession();
}

// ─── Patients ─────────────────────────────────────────────────────────────────
export interface PatientVisit {
  id: string;
  encounterTime: string;
  chiefComplaint: string;
  clinicalNotes: string;
  diagnosisIcd10?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  temperatureC?: number;
  bmi?: number;
  doctor: {
    firstName: string;
    lastName: string;
  };
}

/**
 * Fetch all clinical visit history for a patient.
 * Backend: GET /api/v1/visits/patient/{patientId}
 * Returns encounters ordered by encounterTime DESC (most recent first).
 */
export async function getPatientHistory(patientId: string): Promise<PatientVisit[]> {
  return request<PatientVisit[]>('GET', `/visits/patient/${patientId}`);
}

/**
 * Fetch all patients (or filter by search term).
 */
export async function getPatients(search?: string): Promise<unknown[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<unknown[]>('GET', `/patients${qs}`);
}

/**
 * Fetch a single patient by ID.
 */
export async function getPatient(id: string): Promise<unknown> {
  return request<unknown>('GET', `/patients/${id}`);
}

// ─── Session Restore ──────────────────────────────────────────────────────────
/**
 * On page load, restore the saved session from localStorage.
 * Returns the saved user object or null if no valid session exists.
 */
export function restoreSession(): { name: string; email: string; role: string; isAdmin: boolean; active: boolean } | null {
  const token = getToken();
  const userJson = localStorage.getItem('elda_user');
  if (!token || !userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}
