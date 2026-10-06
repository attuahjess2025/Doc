import React from 'react';
import { LayoutDashboard, Users, Calendar, Heart, FileText, History, Settings, PlusCircle } from 'lucide-react';

export type NavTab = 'dashboard' | 'patients' | 'appointments' | 'new-encounter' | 'audit-logs';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenNewPatient: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenNewPatient }) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard, badge: 'Active' },
    { id: 'patients' as NavTab, label: 'Patients', icon: Users },
    { id: 'appointments' as NavTab, label: 'Appointments', icon: Calendar },
    { id: 'new-encounter' as NavTab, label: 'Vitals & Records', icon: Heart },
    { id: 'audit-logs' as NavTab, label: 'Audit Logs', icon: History },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between py-6 px-4 min-h-screen shrink-0">
      <div className="space-y-6">

        {/* 📍 TOP-LEFT CORNER: Full Logo Image */}
        <div className="flex items-center justify-center py-2">
          <img
            src="/logo.png"
            alt="Elda Medical Service"
            className="h-20 w-auto object-contain transition-transform duration-200 hover:scale-105 cursor-pointer"
            onClick={() => setActiveTab('dashboard')}
          />
        </div>

        {/* Navigation Links */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-medium transition-all ${isActive
                    ? 'bg-[#FAF0F0] text-[#7A1C1C] font-bold shadow-sm border border-[#7A1C1C]/10'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#7A1C1C]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && isActive && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#7A1C1C] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <button className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
            <FileText className="w-5 h-5 text-slate-400" />
            <span>Reports</span>
          </button>

          <button className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
            <Settings className="w-5 h-5 text-slate-400" />
            <span>Settings</span>
          </button>
        </nav>

      </div>

      {/* Quick Patient Intake Button at sidebar bottom */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={onOpenNewPatient}
          className="w-full btn-burgundy py-3 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold shadow-md uppercase tracking-wider cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-[#E8CA65]" />
          <span>New Patient Intake</span>
        </button>
      </div>
    </aside>
  );
};