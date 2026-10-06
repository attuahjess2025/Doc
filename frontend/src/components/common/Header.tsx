import React from 'react';
import { Search, Bell } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  currentUser?: User; // Marked optional to prevent parent-pass errors
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

const getInitials = (name?: string) => {
  if (!name) return 'EM'; // Default fallback initials (Elda Medical)
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSearchChange,
  searchQuery,
}) => {
  // Safely extract roles array with fallback
  const roles: string[] = currentUser?.roles ?? [];

  return (
    <header className="w-full h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search patient by MRN, Name, or Phone..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7A1C1C] focus:border-transparent transition-all"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
          <div className="w-9 h-9 rounded-full bg-[#7A1C1C] text-white flex items-center justify-center text-xs font-bold tracking-wider shadow-sm">
            {getInitials(currentUser?.name)}
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 leading-none mb-1">
              {currentUser?.name || 'Guest User'}
            </span>
            {roles.length > 0 && (
              <div className="flex items-center gap-1">
                {roles.map((role: string) => {
                  const roleStr = String(role);
                  const isAdmin = roleStr.toUpperCase() === 'ADMIN';
                  return (
                    <span
                      key={roleStr}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${isAdmin
                          ? 'bg-red-100 text-red-600'
                          : 'bg-purple-100 text-purple-700'
                        }`}
                    >
                      {roleStr}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};