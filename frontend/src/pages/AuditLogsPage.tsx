import React, { useState } from 'react';
import { ShieldAlert, Terminal, Lock, Filter, Search } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsPageProps {
  auditLogs: AuditLog[];
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ auditLogs }) => {
  const [filterAction, setFilterAction] = useState('ALL');

  const filteredLogs = filterAction === 'ALL'
    ? auditLogs
    : auditLogs.filter(a => a.action === filterAction);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-[#7A1C1C]" />
            <h1 className="font-serif font-bold text-2xl text-slate-900">Security Audit Trail & HIPAA Logs</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">Immutable access logs for patient charts, prescriptions, and system actions</p>
        </div>
        <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-2">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Audit Encryption Active</span>
        </div>
      </div>

      {/* Filter */}
      <div className="card-elda p-4 flex items-center space-x-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-700">Filter by Action:</span>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
        >
          <option value="ALL">All Logged Actions</option>
          <option value="CREATE_PATIENT">CREATE_PATIENT</option>
          <option value="CREATE_ENCOUNTER">CREATE_ENCOUNTER</option>
          <option value="ISSUE_PRESCRIPTION">ISSUE_PRESCRIPTION</option>
          <option value="SCHEDULE_APPOINTMENT">SCHEDULE_APPOINTMENT</option>
        </select>
      </div>

      {/* Audit Log Stream Table */}
      <div className="card-elda overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {log.username}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[#7A1C1C] font-bold border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {log.entityName}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {log.ipAddress}
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-sans max-w-xs truncate">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
