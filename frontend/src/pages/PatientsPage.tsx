import React, { useMemo, useState } from 'react';
import { Search, Plus, Eye, Pencil, ChevronDown } from 'lucide-react';
import { Patient } from '../types';

interface PatientsPageProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onOpenNewPatientModal: () => void;
  searchQuery: string;
}

// ---- Helpers ----
// ASSUMPTION: Patient has `dateOfBirth` as a parseable date string.
const calculateAge = (dob: string): number | null => {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

// ASSUMPTION: Patient has an optional `status` field ('ACTIVE' | 'INACTIVE').
// If your type doesn't have this yet, add it or tell me the real field name.
const StatusBadge: React.FC<{ status?: string }> = ({ status = 'ACTIVE' }) => {
  const isActive = status.toUpperCase() === 'ACTIVE';
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
        }`}
    >
      {status}
    </span>
  );
};

export const PatientsPage: React.FC<PatientsPageProps> = ({
  patients,
  onSelectPatient,
  onOpenNewPatientModal,
  searchQuery,
}) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [insuranceFilter, setInsuranceFilter] = useState('ALL');

  const effectiveSearch = filter || searchQuery;

  const insuranceOptions = useMemo(() => {
    const set = new Set(
      patients.map((p) => p.insuranceProvider).filter((v): v is string => Boolean(v))
    );
    return Array.from(set);
  }, [patients]);

  const filteredPatients = patients.filter((p) => {
    const q = effectiveSearch.toLowerCase();
    const matchesSearch =
      p.mrn.toLowerCase().includes(q) ||
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q) ||
      (p.insuranceProvider && p.insuranceProvider.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'ALL' || (p.status ?? 'ACTIVE').toUpperCase() === statusFilter;

    const matchesInsurance =
      insuranceFilter === 'ALL' || p.insuranceProvider === insuranceFilter;

    return matchesSearch && matchesStatus && matchesInsurance;
  });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="font-bold text-xl text-slate-900">Master Patient Index</h1>
          <p className="text-xs text-slate-500 mt-1">
            {patients.length} total records · Elda Medical Service
          </p>
        </div>
        <button
          onClick={onOpenNewPatientModal}
          className="bg-[#7A1C1C] hover:bg-[#581212] text-white px-5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name or MRN..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1C1C] focus:bg-white"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7A1C1C] cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Insurance Filter */}
        <div className="relative">
          <select
            value={insuranceFilter}
            onChange={(e) => setInsuranceFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#7A1C1C] cursor-pointer"
          >
            <option value="ALL">All Insurance Providers</option>
            {insuranceOptions.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="text-xs text-slate-400 font-medium ml-auto whitespace-nowrap">
          {filteredPatients.length} results
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">MRN</th>
                <th className="py-3.5 px-4">Age / Sex</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Insurance</th>
                <th className="py-3.5 px-4">Last Visit</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const age = calculateAge(patient.dateOfBirth);
                  const sex = patient.gender?.[0]?.toUpperCase() ?? '—';

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-block text-[11px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                          {patient.mrn}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-600 text-sm">
                        {age !== null ? `${age} / ${sex}` : '—'}
                      </td>

                      <td className="py-4 px-4 text-slate-600 text-sm">{patient.phone}</td>

                      <td className="py-4 px-4 text-slate-600 text-sm">
                        {patient.insuranceProvider || 'Self-Paid'}
                      </td>

                      {/* ASSUMPTION: Patient has `lastVisit` as a date string. Adjust if named differently. */}
                      <td className="py-4 px-4 text-slate-500 text-sm">
                        {patient.lastVisit
                          ? new Date(patient.lastVisit).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                          : '—'}
                      </td>

                      <td className="py-4 px-4">
                        <StatusBadge status={patient.status} />
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onSelectPatient(patient)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Chart
                          </button>
                          <button
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                            aria-label="Edit patient"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
