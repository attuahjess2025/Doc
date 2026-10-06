import React, { useState } from 'react';
import { Patient } from '../types';

interface DashboardPageProps {
  patientsCount?: number;
  onRegisterPatient?: (patient: Patient) => void;
  onNavigatePatients?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  patientsCount = 248,
  onRegisterPatient,
  onNavigatePatients,
}) => {
  // Form State for Quick Intake
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [insurance, setInsurance] = useState('');

  const executeRegistration = () => {
    if (!fullName.trim()) {
      alert('Please enter a full name.');
      return;
    }

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Patient';
    const generatedMrn = `ELD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      mrn: generatedMrn,
      firstName,
      lastName,
      dateOfBirth: dob || '1990-01-01',
      gender: 'OTHER',
      phone: phone || 'N/A',
      email: `${firstName.toLowerCase()}@example.com`,
      address: 'Not Provided',
      emergencyContactName: 'N/A',
      emergencyContactPhone: 'N/A',
      insuranceProvider: insurance || 'Self-Pay',
      insurancePolicyNumber: insurance ? 'POL-9921' : 'N/A',
      allergies: [],
      chronicConditions: [],
      status: 'ACTIVE',
      lastVisit: '2026-09-23',
      createdAt: new Date().toISOString(),
    };

    if (onRegisterPatient) {
      onRegisterPatient(newPatient);
    }

    alert(`Patient ${firstName} ${lastName} registered successfully!\nMRN: ${generatedMrn}`);

    // Clear form fields
    setFullName('');
    setDob('');
    setPhone('');
    setInsurance('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeRegistration();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div
          onClick={onNavigatePatients}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-slate-300 transition-all"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Patients</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{patientsCount}</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">+3 registered this week</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Appointments</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">9</p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">2 completed · 1 in-consult</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encounters Logged</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">1,047</p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">+12 this month</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HIPAA Audit Events</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">34</p>
          <p className="text-[10px] text-amber-600 font-semibold mt-1">1 CRITICAL · 2 WARNING today</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">

        {/* Left Column: Schedule */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Today's Appointment Schedule</h2>
            <span className="text-xs text-slate-400 font-medium">9 Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Patient / MRN</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Clinician</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <td className="py-3 px-3 text-slate-500 font-medium">8:00 AM</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-800">Sofia Delgado</p>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">ELD-2026-0055</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">Annual Physical</td>
                  <td className="py-3 px-3 text-slate-600">Dr. Smith</td>
                  <td className="py-3 px-3">
                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">COMPLETED</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <td className="py-3 px-3 text-slate-500 font-medium">8:30 AM</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-800">James Ferreira</p>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">ELD-2026-0038</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">Follow-up Visit</td>
                  <td className="py-3 px-3 text-slate-600">Dr. Osei</td>
                  <td className="py-3 px-3">
                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">COMPLETED</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Quick Intake */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm h-fit space-y-4">
          <h2 className="text-xs font-bold text-slate-800">+ Quick Patient Intake</h2>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400"
            />

            <input
              type="text"
              placeholder="Date of Birth (YYYY-MM-DD)"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400"
            />

            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400"
            />

            <select
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-slate-400 text-slate-600"
            >
              <option value="">Insurance Provider</option>
              <option value="Blue Cross Blue Shield">Blue Cross Blue Shield</option>
              <option value="Aetna Health">Aetna Health</option>
              <option value="UnitedHealthcare">UnitedHealthcare</option>
              <option value="Self-Pay">Self-Pay</option>
            </select>

            <button
              type="submit"
              className="btn-primary w-full justify-center cursor-pointer"
            >
              Register Patient
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};