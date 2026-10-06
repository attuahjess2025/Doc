import React, { useState } from 'react';

type StaffUser = {
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  active: boolean;
};

interface LoginScreenProps {
  staffUsers: StaffUser[];
  onLogin: (user: StaffUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ staffUsers, onLogin }) => {
  const [email, setEmail] = useState('a.smith@eldamedical.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeStaff = staffUsers.filter(u => u.active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const targetEmail = email.trim().toLowerCase();

    try {
      // Attempt real JWT login first
      const res = await fetch('http://localhost:8080/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('elda_token', data.token);
        localStorage.setItem('elda_user', JSON.stringify({
          name: data.fullName,
          email: data.email,
          role: data.role,
          isAdmin: data.role === 'ADMIN',
          active: true,
        }));
        const found = activeStaff.find(u => u.email.toLowerCase() === targetEmail)
          ?? { name: data.fullName, email: data.email, role: data.role, isAdmin: data.role === 'ADMIN', active: true };
        onLogin(found);
        return;
      }
    } catch {
      // Backend offline — fall through to local auth
    }

    // Local/demo fallback when backend is unavailable
    const found = activeStaff.find(u => u.email.toLowerCase() === targetEmail);
    if (!found) {
      setError('Invalid credentials or account is inactive.');
    } else {
      onLogin(found);
    }
    setLoading(false);
  };

  const handleQuickLogin = async (user: StaffUser) => {
    setEmail(user.email);
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: 'password123' }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('elda_token', data.token);
        localStorage.setItem('elda_user', JSON.stringify({
          name: data.fullName, email: data.email, role: data.role,
          isAdmin: data.role === 'ADMIN', active: true,
        }));
      }
    } catch {
      // Backend offline — proceed with local session
    }

    setLoading(false);
    onLogin(user);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4" style={{ background: '#F8FAFC' }}>
      {/* Background Graphic Accents */}
      <div className="fixed top-0 left-0 w-full h-2 bg-[#7A1C1C]" />

      <div className="w-full max-w-md space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 mb-1">
            <img
              src="/logo.png"
              alt="Elda Medical Service"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#7A1C1C', fontFamily: 'DM Serif Display, serif' }}>
            Elda Medical Service
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Production-Grade Clinical Patient Management System
          </p>
        </div>

        {/* Main Login Card */}
        <div className="glass-card p-7 space-y-5 shadow-lg" style={{ background: '#FFFFFF' }}>
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800">Sign in to your account</h2>
            <p className="text-xs text-slate-400 mt-0.5">Authorized clinical personnel access only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@eldamedical.com"
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:outline-none focus:border-[#7A1C1C] focus:ring-2 focus:ring-[#7A1C1C]/10 transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Password
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Please contact your HeFRAA Systems Administrator to reset your credentials."); }} className="text-xs text-[#7A1C1C] font-semibold hover:underline">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50 focus:outline-none focus:border-[#7A1C1C] focus:ring-2 focus:ring-[#7A1C1C]/10 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-sm rounded-xl font-bold shadow-md cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In to Portal'}
            </button>
          </form>

          {/* Quick Demo Pre-select */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              ⚡ Quick Demo Sign In
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {activeStaff.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(user)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-[#FAF0F0] hover:border-[#7A1C1C]/30 transition-all flex items-center justify-between text-xs disabled:opacity-60"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">{user.name}</span>
                    <span className="text-[11px] text-slate-400">{user.email}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-bold text-[10px]">
                    {user.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>© 2026 Elda Medical Service · All rights reserved.</p>
          <p className="text-[11px]">Protected under HeFRAA Security Rule §164.312</p>
        </div>

      </div>
    </div>
  );
};
