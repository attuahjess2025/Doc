import React, { useState } from 'react';
import { Plus, Lock, FileText, AlertTriangle } from 'lucide-react';

interface PatientSummary {
  id: string;
  name: string;
  mrn: string;
  status: string;
  dob: string;
  age: number;
  gender: string;
  insurance: string;
  pcp: string;
  allergies: string[];
  vitals: {
    bp: string;
    hr: number;
    temp: number;
    bmi: number;
  };
}

export const VitalsAndRecordsPage: React.FC = () => {
  // Mock active patient matching the screenshot
  const [patient] = useState<PatientSummary>({
    id: 'p-001',
    name: 'Margaret Okonkwo',
    mrn: 'ELD-2026-0041',
    status: 'ACTIVE',
    dob: 'March 14, 1968',
    age: 58,
    gender: 'Female',
    insurance: 'NHIS',
    pcp: 'Dr. Alexander Smith',
    allergies: ['Penicillin (anaphylaxis)', 'Sulfonamides (rash)'],
    vitals: {
      bp: '138/88',
      hr: 82,
      temp: 98.6,
      bmi: 26.4,
    },
  });

  const [soapNote, setSoapNote] = useState({
    subjective:
      'Patient presents with persistent headache for 3 days, rated 7/10 in severity. Reports associated mild nausea and photophobia. No aura or neurological deficits noted. Current medications include Lisinopril 10mg daily. Denies fever, neck stiffness, or visual changes.',
    objective:
      'BP: 138/88 mmHg · HR: 82 bpm · Temp: 98.6°F · SpO2: 99% · BMI: 26.4\nNeurological: Alert and oriented x3. Pupils equal and reactive. No focal deficits.\nFunduscopic: Normal disc margins bilaterally.',
    assessment: [
      '1. Tension-type headache — primary (G44.2)',
      '2. Hypertension, poorly controlled — secondary concern (I10)',
      '3. Medication adherence counseling indicated.',
    ],
    plan: [
      '1. Ibuprofen 600mg PO TID with food × 5 days',
      '2. Increase Lisinopril to 20mg daily',
      '3. CBC, CMP, lipid panel ordered',
      '4. Follow-up in 2 weeks or sooner if symptoms worsen',
      '5. Patient educated on headache diary and hypertension diet modifications',
    ],
  });

  const prescriptions = [
    { id: 'rx-1', name: 'Ibuprofen 600mg', sig: 'TID × 5 days · PO' },
    { id: 'rx-2', name: 'Lisinopril 20mg', sig: 'Once daily · PO' },
    { id: 'rx-3', name: 'Ondansetron 4mg', sig: 'PRN nausea · PO' },
  ];

  const visitHistory = [
    { id: 'v-1', type: 'Follow-up Visit', doctor: 'Dr. Smith', date: 'Sep 20, 2026' },
    { id: 'v-2', type: 'Chronic Care Mgmt', doctor: 'Dr. Smith', date: 'Aug 5, 2026' },
    { id: 'v-3', type: 'Annual Physical', doctor: 'Dr. Osei', date: 'Jun 18, 2026' },
    { id: 'v-4', type: 'Urgent Care Visit', doctor: 'Dr. Nguyen', date: 'Mar 3, 2026' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* 1. Top Patient Info & Vitals Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#7A1C1C] text-white flex items-center justify-center font-bold font-serif text-xl shrink-0 shadow-sm">
            MO
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-xl text-slate-900 tracking-tight">{patient.name}</h1>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {patient.mrn}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                {patient.status}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              DOB: {patient.dob} · {patient.age} years · {patient.gender} · {patient.insurance} · PCP: {patient.pcp}
            </p>

            {/* Allergy Warning Bar */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 pt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>Allergies: {patient.allergies.join(', ')}</span>
            </div>
          </div>
        </div>

        {/* Quick Vitals Dashboard Widgets */}
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-xl text-center min-w-[80px]">
            <span className="block text-xs font-medium text-slate-400 uppercase">BP</span>
            <span className="text-sm font-extrabold text-slate-800">{patient.vitals.bp}</span>
            <span className="block text-[10px] text-slate-400">mmHg</span>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-xl text-center min-w-[80px]">
            <span className="block text-xs font-medium text-slate-400 uppercase">HR</span>
            <span className="text-sm font-extrabold text-slate-800">{patient.vitals.hr}</span>
            <span className="block text-[10px] text-slate-400">bpm</span>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-xl text-center min-w-[80px]">
            <span className="block text-xs font-medium text-slate-400 uppercase">TEMP</span>
            <span className="text-sm font-extrabold text-slate-800">{patient.vitals.temp}</span>
            <span className="block text-[10px] text-slate-400">°F</span>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-xl text-center min-w-[80px]">
            <span className="block text-xs font-medium text-slate-400 uppercase">BMI</span>
            <span className="text-sm font-extrabold text-slate-800">{patient.vitals.bmi}</span>
            <span className="block text-[10px] text-slate-400">kg/m²</span>
          </div>
        </div>
      </div>

      {/* 2. Main Medical Record Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2/3): SOAP Clinical Note Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-5 h-5 text-[#7A1C1C]" />
            <h2 className="font-bold text-slate-900 text-sm tracking-tight">
              SOAP Clinical Note — Sep 23, 2026
            </h2>
          </div>

          {/* Subjective Section */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#7A1C1C]">
              Subjective
            </label>
            <div className="border-l-2 border-[#7A1C1C] pl-4">
              <textarea
                rows={3}
                value={soapNote.subjective}
                onChange={(e) => setSoapNote({ ...soapNote, subjective: e.target.value })}
                className="w-full bg-slate-50/60 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#7A1C1C]/20 focus:border-[#7A1C1C]"
              />
            </div>
          </div>

          {/* Objective Section */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#7A1C1C]">
              Objective
            </label>
            <div className="border-l-2 border-[#7A1C1C] pl-4">
              <textarea
                rows={3}
                value={soapNote.objective}
                onChange={(e) => setSoapNote({ ...soapNote, objective: e.target.value })}
                className="w-full bg-slate-50/60 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#7A1C1C]/20 focus:border-[#7A1C1C]"
              />
            </div>
          </div>

          {/* Assessment Section */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#7A1C1C]">
              Assessment
            </label>
            <div className="border-l-2 border-[#7A1C1C] pl-4">
              <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/80 space-y-1">
                {soapNote.assessment.map((item, idx) => (
                  <p key={idx} className="text-xs text-slate-700 font-medium">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Plan Section */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#7A1C1C]">
              Plan
            </label>
            <div className="border-l-2 border-[#7A1C1C] pl-4">
              <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/80 space-y-1">
                {soapNote.plan.map((item, idx) => (
                  <p key={idx} className="text-xs text-slate-700 font-medium">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Prescriptions & Visit History */}
        <div className="space-y-6">

          {/* Electronic Rx Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs text-slate-800">Electronic Rx</h3>
              <button className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" />
                <span>Add Rx</span>
              </button>
            </div>

            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="p-2.5 rounded-xl bg-slate-50/50 border border-slate-100 space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">{rx.name}</p>
                  <p className="text-[11px] text-slate-400">{rx.sig}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visit History Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-3">
              Visit History
            </h3>

            <div className="space-y-3">
              {visitHistory.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between text-xs py-1">
                  <div>
                    <p className="font-bold text-slate-800">{visit.type}</p>
                    <p className="text-[11px] text-slate-400">{visit.doctor}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">{visit.date}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 3. Sticky Encounter Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 p-4 shadow-lg z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-medium">
            Encounter — Sep 23, 2026 at 9:15 AM · Clinician: <span className="font-bold text-slate-700">Dr. Alexander Smith, MD</span>
          </p>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              Save Draft
            </button>

            <button className="bg-[#7A1C1C] hover:bg-[#601616] text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors">
              <Lock className="w-3.5 h-3.5" />
              <span>Finalize & Sign Encounter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

