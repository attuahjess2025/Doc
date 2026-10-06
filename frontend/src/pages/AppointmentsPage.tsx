import React, { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { Appointment, AppointmentStatus, Patient } from '../types';

interface AppointmentsPageProps {
  appointments: Appointment[];
  patients: Patient[];
  onUpdateStatus: (appointmentId: string, newStatus: AppointmentStatus) => void;
  onBookAppointment: (newAppointment: Appointment) => void;
}

// ---- Status badge styling ----
const statusStyles: Record<string, string> = {
  SCHEDULED: 'bg-slate-100 text-slate-600',
  CHECKED_IN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-600',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${statusStyles[status] ?? 'bg-slate-100 text-slate-600'
      }`}
  >
    {status.replace('_', '-')}
  </span>
);

// ---- Stat summary badge (circular number) ----
const StatBadge: React.FC<{ value: number; label: string; ringColor: string; bg: string }> = ({
  value,
  label,
  ringColor,
  bg,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col items-center gap-2">
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${bg} ${ringColor}`}
    >
      {value}
    </div>
    <span className="text-xs font-medium text-slate-500">{label}</span>
  </div>
);

export const AppointmentsPage: React.FC<AppointmentsPageProps> = ({
  appointments,
  patients,
  onUpdateStatus,
  onBookAppointment,
}) => {
  const [showBookModal, setShowBookModal] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    patientId: patients[0]?.id || '',
    reason: 'Routine Consultation',
    date: '2026-09-22',
    time: '14:00',
  });

  const totalScheduled = appointments.length;
  const checkedIn = appointments.filter((a) => a.status === 'CHECKED_IN').length;
  const inConsultation = appointments.filter((a) => a.status === 'IN_PROGRESS').length;
  const completed = appointments.filter((a) => a.status === 'COMPLETED').length;

  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === bookingForm.patientId);
    if (!patient) return;

    const startTime = `${bookingForm.date}T${bookingForm.time}:00Z`;

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientMrn: patient.mrn,
      doctorId: 'usr-001',
      doctorName: 'Dr. Alexander Smith',
      startTime,
      endTime: startTime,
      status: 'SCHEDULED',
      reason: bookingForm.reason,
      createdAt: new Date().toISOString(),
    };

    onBookAppointment(newApt);
    setShowBookModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="font-bold text-xl text-slate-900">Clinical Appointment Board</h1>
          <p className="text-xs text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {' '}· All Clinicians · All Rooms
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Today
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowBookModal(true)}
            className="bg-[#7A1C1C] hover:bg-[#581212] text-white px-5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Appointment</span>
          </button>
        </div>
      </div>

      {/* Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBadge value={totalScheduled} label="Total Scheduled" bg="bg-slate-100" ringColor="text-slate-700" />
        <StatBadge value={checkedIn} label="Checked-In" bg="bg-blue-100" ringColor="text-blue-700" />
        <StatBadge value={inConsultation} label="In Consultation" bg="bg-amber-100" ringColor="text-amber-700" />
        <StatBadge value={completed} label="Completed" bg="bg-emerald-100" ringColor="text-emerald-700" />
      </div>

      {/* Daily Time-Slot Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-slate-900 text-sm">
            Daily Time-Slot Schedule — 8:00 AM to 4:00 PM
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Scheduled</span>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">Checked-In</span>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">In-Consult</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Completed</span>
          </div>
        </div>

        <div className="space-y-3">
          {sortedAppointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center gap-4 border border-slate-100 rounded-xl px-4 py-3 hover:bg-slate-50/60 transition-colors"
            >
              {/* Time */}
              <div className="w-20 shrink-0 text-xs font-semibold text-slate-500">
                {new Date(apt.startTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>

              {/* Patient info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{apt.patientName}</h4>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {apt.patientMrn}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {apt.reason} · {apt.doctorName}
                  {/* ASSUMPTION: Appointment doesn't currently have a `room` field.
                      Add one (e.g. `room: string`) to your type, or tell me the real field name. */}
                  {apt.room ? ` · Room: ${apt.room}` : ''}
                </p>
              </div>

              {/* Status + Action */}
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={apt.status} />
                <button
                  onClick={() => onUpdateStatus(apt.id, 'CHECKED_IN')}
                  disabled={apt.status === 'CHECKED_IN' || apt.status === 'COMPLETED' || apt.status === 'CANCELLED'}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Check-In
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h2 className="font-bold text-lg text-slate-900">Schedule New Appointment</h2>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
                <select
                  value={bookingForm.patientId}
                  onChange={(e) => setBookingForm({ ...bookingForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Visit *</label>
                <input
                  type="text"
                  required
                  value={bookingForm.reason}
                  onChange={(e) => setBookingForm({ ...bookingForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={bookingForm.time}
                    onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#7A1C1C] hover:bg-[#581212] text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
