import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { X, UserPlus, Shield, AlertCircle, CheckCircle2, KeyRound, Pencil, Building2, Save, Eye, EyeOff } from 'lucide-react';
import { UserProfile, UserRole } from '../../types';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'salesperson' | 'manager' | 'partner';
  employeeToEdit?: UserProfile | null;
}

export const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'salesperson',
  employeeToEdit = null,
}) => {
  const { provisionEmployee, updateEmployee } = useAuth();
  const { banquets } = useData();

  const isEditing = Boolean(employeeToEdit);

  const [role, setRole] = useState<'salesperson' | 'manager' | 'partner'>(defaultRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBanquets, setSelectedBanquets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    email: string;
    role: string;
    password?: string;
  } | null>(null);

  useEffect(() => {
    if (employeeToEdit) {
      setRole((employeeToEdit.role as 'salesperson' | 'manager' | 'partner') || defaultRole);
      setFullName(employeeToEdit.fullName);
      setEmail(employeeToEdit.email);
      setPhone(employeeToEdit.phone || '');
      setSelectedBanquets(employeeToEdit.assignedBanquetIds || []);
      setInitialPassword('');
    } else {
      setRole(defaultRole);
      setFullName('');
      setEmail('');
      setPhone('');
      setSelectedBanquets([]);
      setInitialPassword('');
    }
    setError(null);
    setSuccessResult(null);
  }, [employeeToEdit, defaultRole, isOpen]);

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

  const handleSelectAllBanquets = () => {
    if (selectedBanquets.length === banquets.length) {
      setSelectedBanquets([]);
    } else {
      setSelectedBanquets(banquets.map((b) => b.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }

    if (isEditing && employeeToEdit) {
      setIsSubmitting(true);
      setError(null);
      const res = updateEmployee(employeeToEdit.uid, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        assignedBanquetIds: selectedBanquets,
        password: initialPassword.trim() || undefined,
      });
      setIsSubmitting(false);

      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to update employee account.');
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await provisionEmployee({
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
          password:
            initialPassword ||
            (res.user.role === 'salesperson'
              ? 'sales123'
              : res.user.role === 'manager'
              ? 'manager123'
              : 'partner123'),
        });
      } else {
        setError(res.error || 'Failed to provision account.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error occurred while creating employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Pencil className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            ) : (
              <UserPlus className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            )}
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {isEditing
                ? `Edit ${
                    role === 'partner'
                      ? 'Partner'
                      : role === 'salesperson'
                      ? 'Salesperson'
                      : 'Operations Manager'
                  } Profile & Assigned Venues`
                : 'Provision Account (Admin Only)'}
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
              User <strong>{successResult.email}</strong> is now registered with role{' '}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole('salesperson')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors ${
                    role === 'salesperson'
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
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
                      ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-bold">Manager</div>
                  <div className="text-[11px] font-normal text-stone-500 mt-0.5">
                    Checklists, operations & execution
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('partner')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors ${
                    role === 'partner'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-xs ring-1 ring-purple-500'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                    <span>Partner</span>
                    <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-purple-200 dark:bg-purple-900/60 font-bold">New</span>
                  </div>
                  <div className="text-[11px] font-normal text-stone-500 mt-0.5">
                    Access to their banquets, bookings & finances
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

            {/* Password / Passcode Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>{isEditing ? 'Change Password / Passcode' : 'Initial Passcode / Secret'}</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Generate New</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  placeholder={
                    isEditing
                      ? 'Leave blank to keep current password, or enter new password'
                      : 'Click Generate or enter secure password (e.g. sales123)'
                  }
                  className="w-full pl-3 pr-10 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isEditing && (
                <p className="text-[10px] text-stone-500 mt-1">
                  Type a new password here to reset this {role === 'partner' ? 'partner' : role === 'salesperson' ? 'salesperson' : 'manager'}'s login password immediately.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {role === 'partner' ? 'Partnered Banquet Venues' : 'Assigned Banquet Venues'} ({selectedBanquets.length} of {banquets.length})
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllBanquets}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                >
                  {selectedBanquets.length === banquets.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <p className="text-[11px] text-stone-500 mb-2">
                {role === 'partner'
                  ? 'Select which banquets this partner co-owns. The partner will only have access to view and review bookings, calendar, and finances for these selected banquets.'
                  : 'Check the banquets this employee is authorized to manage, view availability for, and sell.'}
              </p>
              <div className="space-y-1.5 max-h-44 overflow-y-auto p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/20 text-xs">
                {banquets.map((b) => {
                  const isChecked = selectedBanquets.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                          : 'border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${isChecked ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}`} />
                        <div>
                          <span className="text-stone-800 dark:text-stone-200 font-bold block">{b.name}</span>
                          <span className="text-[10px] text-stone-500">{b.address} · {b.capacity} Pax</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleBanquet(b.id)}
                        className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4"
                      />
                    </label>
                  );
                })}
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
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : isEditing ? (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Banquet & Profile Changes</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
