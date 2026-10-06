import React, { useState } from 'react';
import { X, UserPlus, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Patient } from '../../types';

interface PatientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (newPatient: Patient) => void;
}

export const PatientRegistrationModal: React.FC<PatientRegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegister
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'FEMALE' as 'MALE' | 'FEMALE' | 'OTHER',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    initialAllergy: '',
    allergySeverity: 'MODERATE' as 'MILD' | 'MODERATE' | 'SEVERE' | 'ANAPHYLACTIC'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate MRN
    const generatedMrn = `ELD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      mrn: generatedMrn,
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone,
      insuranceProvider: formData.insuranceProvider,
      insurancePolicyNumber: formData.insurancePolicyNumber,
      allergies: formData.initialAllergy ? [
        {
          id: `alg-${Date.now()}`,
          allergen: formData.initialAllergy,
          severity: formData.allergySeverity,
          reaction: 'Reported during intake registration'
        }
      ] : [],
      chronicConditions: [],
      createdAt: new Date().toISOString()
    };

    onRegister(newPatient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        
        {/* Modal Header */}
        <div className="elda-gradient-header px-6 py-5 flex items-center justify-between text-white border-b border-[#C59B27]/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-[#E8CA65]/30">
              <UserPlus className="w-5 h-5 text-[#E8CA65]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-white">Patient Registration Intake</h2>
              <p className="text-xs text-white/80">Elda Medical Service — Master Patient Record Creation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Section 1: Demographics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A1C1C] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#7A1C1C]" />
              1. Patient Demographics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                <input
                  required
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="e.g. Sarah"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                <input
                  required
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="e.g. Jenkins"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                <input
                  required
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other / Non-Binary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Info */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A1C1C] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#7A1C1C]" />
              2. Contact & Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="patient@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, State, ZIP"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Emergency & Insurance */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A1C1C] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#7A1C1C]" />
              3. Emergency Contact & Insurance Coverage
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  placeholder="Relative or Guardian Name"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  placeholder="+1 (555) 111-2222"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Insurance Provider</label>
                <select
                  value={formData.insuranceProvider}
                  onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                >
                  <option value="">Select Provider</option>
                  <option value="Self-Paid">Self-Paid</option>
                  <option value="NHIS">NHIS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Number</label>
                <input
                  type="text"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                  placeholder="e.g. POL-99482-B"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7A1C1C] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Initial Allergy Warning */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center space-x-2 text-amber-800 font-semibold text-xs mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Initial Allergy Screening (Optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={formData.initialAllergy}
                  onChange={(e) => setFormData({ ...formData, initialAllergy: e.target.value })}
                  placeholder="Allergen (e.g. Penicillin, Latex, Peanuts)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <select
                  value={formData.allergySeverity}
                  onChange={(e) => setFormData({ ...formData, allergySeverity: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none"
                >
                  <option value="MILD">Mild Severity</option>
                  <option value="MODERATE">Moderate Severity</option>
                  <option value="SEVERE">Severe</option>
                  <option value="ANAPHYLACTIC">Anaphylactic Risk</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-burgundy px-6 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 text-[#E8CA65]" />
              <span>Save & Register Patient</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
