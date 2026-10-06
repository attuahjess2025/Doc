import React, { useState } from 'react';

interface ClinicInfo {
  clinicName: string;
  npiNumber: string;
  primaryContact: string;
  address: string;
  ehrInstanceId: string;
}

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'security' | 'clinical'>('general');

  const [formData, setFormData] = useState<ClinicInfo>({
    clinicName: 'Elda Medical Service',
    npiNumber: '1234567890',
    primaryContact: '(713) 555-0100',
    address: '4520 Westheimer Rd, Houston, TX 77027',
    ehrInstanceId: 'EMS-PROD-HOU-01',
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h1 className="font-bold text-lg text-slate-900 tracking-tight">System Settings & Configuration</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage clinic info, user roles, and HIPAA compliance settings
        </p>
      </div>

      {/* Main Settings Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-100 px-6 pt-4 gap-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-3 text-xs font-semibold transition-all relative ${activeTab === 'general'
              ? 'text-[#7A1C1C] border-b-2 border-[#7A1C1C]'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            General Clinic Info
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-xs font-semibold transition-all relative ${activeTab === 'users'
              ? 'text-[#7A1C1C] border-b-2 border-[#7A1C1C]'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Users & Roles
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 text-xs font-semibold transition-all relative ${activeTab === 'security'
              ? 'text-[#7A1C1C] border-b-2 border-[#7A1C1C]'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Security & HIPAA
          </button>
          <button
            onClick={() => setActiveTab('clinical')}
            className={`pb-3 text-xs font-semibold transition-all relative ${activeTab === 'clinical'
              ? 'text-[#7A1C1C] border-b-2 border-[#7A1C1C]'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Clinical Preferences
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-8">
          {activeTab === 'general' && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
              <h2 className="text-sm font-bold text-slate-800">Clinic Information</h2>

              {/* Clinic Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  CLINIC NAME
                </label>
                <input
                  type="text"
                  name="clinicName"
                  value={formData.clinicName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1C1C]/20 focus:border-[#7A1C1C] transition-all"
                />
              </div>

              {/* NPI Number */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  NPI NUMBER
                </label>
                <input
                  type="text"
                  name="npiNumber"
                  value={formData.npiNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1C1C]/20 focus:border-[#7A1C1C] transition-all"
                />
              </div>

              {/* Primary Contact */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  PRIMARY CONTACT
                </label>
                <input
                  type="text"
                  name="primaryContact"
                  value={formData.primaryContact}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1C1C]/20 focus:border-[#7A1C1C] transition-all"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ADDRESS
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1C1C]/20 focus:border-[#7A1C1C] transition-all"
                />
              </div>

              {/* EHR Instance ID */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  EHR INSTANCE ID
                </label>
                <input
                  type="text"
                  name="ehrInstanceId"
                  value={formData.ehrInstanceId}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1C1C]/20 focus:border-[#7A1C1C] transition-all"
                />
              </div>

              {/* Action Area */}
              <div className="pt-2 flex items-center gap-4">
                <button
                  type="submit"
                  className="bg-[#7A1C1C] hover:bg-[#601616] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs"
                >
                  Save Changes
                </button>
                {isSaved && (
                  <span className="text-xs font-semibold text-emerald-600 transition-all">
                    Settings saved successfully!
                  </span>
                )}
              </div>
            </form>
          )}

          {activeTab !== 'general' && (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Section settings module coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};