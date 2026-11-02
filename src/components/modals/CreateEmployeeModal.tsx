import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { X, UserPlus, Shield, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { UserRole } from '../../types';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'salesperson' | 'manager';
}

export const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'salesperson',
}) => {
  const { provisionEmployee } = useAuth();
  const { banquets } = useData();

  const [role, setRole] = useState<'salesperson' | 'manager'>(defaultRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [selectedBanquets, setSelectedBanquets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    email: string;
    role: string;
    password?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const pwd = `PE@${Math.random().toString(36).substring(2, 8)}!2026`;
    setInitialPassword(pwd);
  };

  const handleToggleBanquet = (banquetId: string) => {
    if (selectedBanquets.includes(banquetId)) {
      setSelectedBanquets(selectedBanquets.filter((id) => id !== banquetId));
    } else {
      setSelectedBanquets([...selectedBanquets, banquetId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }

    const res = provisionEmployee({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      role,
      initialPassword: initialPassword || undefined,
      assignedBanquetIds: selectedBanquets,
    });

    if (res.success && res.user) {
      setSuccessResult({
        email: res.user.email,
        role: res.user.role,
        password: initialPassword || 'PE@Welcome!2026',
      });
    } else {
      setError(res.error || 'Failed to provision account.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Provision Employee Account (Admin Only)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successResult ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Account Successfully Provisioned!
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Employee <strong>{successResult.email}</strong> is now registered as a{' '}
              <strong className="uppercase">{successResult.role}</strong>.
            </p>
            <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-left text-xs space-y-1 font-mono">
              <div>
                <span className="text-stone-500 font-sans">Login Identifier:</span> {successResult.email}
              </div>
              <div>
                <span className="text-stone-500 font-sans">Initial Passcode:</span>{' '}
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {successResult.password}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-stone-500 italic">
              Share these credentials securely. The employee can sign in from the login page or switch to their account in demo mode.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Account Role *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('salesperson')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors ${
                    role === 'salesperson'
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-bold">Salesperson</div>
                  <div className="text-[11px] font-normal text-stone-500 mt-0.5">
                    Leads, Direct sales, mobile interface
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('manager')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors ${
                    role === 'manager'
                      ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-bold">Manager</div>
                  <div className="text-[11px] font-normal text-stone-500 mt-0.5">
                    Operational checklists, event execution
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Employee Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ankit Saxena"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ankit.sales@perlevents.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98111 55667"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Initial Passcode / Secret
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  Generate
                </button>
              </div>
              <input
                type="text"
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                placeholder="Click Generate or enter secure password"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Assigned Banquets (Optional)
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/20 text-xs">
                {banquets.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBanquets.includes(b.id)}
                      onChange={() => handleToggleBanquet(b.id)}
                      className="rounded text-emerald-800 focus:ring-emerald-700"
                    />
                    <span className="text-stone-800 dark:text-stone-200 font-medium">{b.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm"
              >
                Create Account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
