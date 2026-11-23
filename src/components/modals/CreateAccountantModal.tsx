import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, UserPlus, Shield, AlertCircle, CheckCircle2, KeyRound, Pencil, Save, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../../types';

interface CreateAccountantModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountantToEdit?: UserProfile | null;
}

const ALL_ACCOUNTING_PERMISSIONS = [
  { id: 'dashboard', label: 'Accounting Dashboard & Overview' },
  { id: 'sales', label: 'Overall Sales & Booking Value' },
  { id: 'banquets', label: 'All Banquet Financials & Metrics' },
  { id: 'income', label: 'Income Management & Receipts' },
  { id: 'expenses', label: 'Expense Recording & Approvals' },
  { id: 'vendor_payments', label: 'Vendor Payments & Bills' },
  { id: 'partner_financials', label: 'Partner Financials & Settlements' },
  { id: 'ledgers', label: 'Customer & Vendor Running Ledgers' },
  { id: 'reports', label: 'Financial Reports & P&L Statement' },
  { id: 'spreadsheet', label: 'In-App Spreadsheet Workspace' },
  { id: 'calculator', label: 'In-App Financial & GST Calculator' },
  { id: 'double_entry', label: 'Double-Entry Journal & Chart of Accounts' },
  { id: 'cash_bank', label: 'Cash & Bank Management' },
];

export const CreateAccountantModal: React.FC<CreateAccountantModalProps> = ({
  isOpen,
  onClose,
  accountantToEdit = null,
}) => {
  const { provisionEmployee, updateEmployee } = useAuth();
  const isEditing = Boolean(accountantToEdit);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Financial Accountant');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedPermissions, setAssignedPermissions] = useState<string[]>(
    ALL_ACCOUNTING_PERMISSIONS.map((p) => p.id)
  );
  const [notes, setNotes] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    email: string;
    password?: string;
  } | null>(null);

  useEffect(() => {
    if (accountantToEdit) {
      setFullName(accountantToEdit.fullName);
      setEmail(accountantToEdit.email);
      setPhone(accountantToEdit.phone || '');
      setEmployeeId(accountantToEdit.employeeId || '');
      setDesignation(accountantToEdit.designation || 'Financial Accountant');
      setJoiningDate(accountantToEdit.joiningDate || new Date().toISOString().split('T')[0]);
      setAssignedPermissions(
        accountantToEdit.assignedPermissions && accountantToEdit.assignedPermissions.length > 0
          ? accountantToEdit.assignedPermissions
          : ALL_ACCOUNTING_PERMISSIONS.map((p) => p.id)
      );
      setNotes(accountantToEdit.notes || '');
      setInitialPassword('');
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setEmployeeId(`PE-ACC-${Math.floor(100 + Math.random() * 900)}`);
      setDesignation('Financial Accountant');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setAssignedPermissions(ALL_ACCOUNTING_PERMISSIONS.map((p) => p.id));
      setNotes('');
      setInitialPassword('account123');
    }
    setError(null);
    setSuccessResult(null);
  }, [accountantToEdit, isOpen]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const pwd = `PE@Acc${Math.random().toString(36).substring(2, 7)}!`;
    setInitialPassword(pwd);
  };

  const handleTogglePermission = (permId: string) => {
    if (assignedPermissions.includes(permId)) {
      setAssignedPermissions(assignedPermissions.filter((p) => p !== permId));
    } else {
      setAssignedPermissions([...assignedPermissions, permId]);
    }
  };

  const handleSelectAllPermissions = () => {
    if (assignedPermissions.length === ALL_ACCOUNTING_PERMISSIONS.length) {
      setAssignedPermissions([]);
    } else {
      setAssignedPermissions(ALL_ACCOUNTING_PERMISSIONS.map((p) => p.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are mandatory.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && accountantToEdit) {
        const res = updateEmployee(accountantToEdit.uid, {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          role: 'accountant',
          employeeId: employeeId.trim(),
          designation: designation.trim(),
          joiningDate,
          assignedPermissions,
          notes: notes.trim(),
          password: initialPassword.trim() || undefined,
        });

        if (res.success) {
          onClose();
        } else {
          setError(res.error || 'Failed to update accountant profile.');
        }
      } else {
        const res = await provisionEmployee({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          role: 'accountant',
          initialPassword: initialPassword.trim() || 'account123',
          employeeId: employeeId.trim(),
          designation: designation.trim(),
          joiningDate,
          assignedPermissions,
          notes: notes.trim(),
        });

        if (res.success) {
          setSuccessResult({
            email: email.trim(),
            password: initialPassword.trim() || 'account123',
          });
        } else {
          setError(res.error || 'Failed to provision accountant account.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold">
              {isEditing ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                {isEditing ? 'Edit Accountant Profile' : 'Create Accountant Account'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Full financial permissions across all Pearl Experiences banquets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successResult ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Accountant Account Provisioned!
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                  The accountant has been successfully registered in the ERP and Firebase Authentication.
                </p>
              </div>

              <div className="bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl p-4 text-left space-y-2 text-xs font-mono">
                <div>
                  <span className="text-stone-500">Email: </span>
                  <span className="text-stone-900 dark:text-stone-100 font-bold">{successResult.email}</span>
                </div>
                <div>
                  <span className="text-stone-500">Initial Password: </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{successResult.password}</span>
                </div>
                <div>
                  <span className="text-stone-500">Access Scope: </span>
                  <span className="text-stone-800 dark:text-stone-200">Global Financial & Sales Control</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form id="accountant-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Neha Gupta"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. neha.accounts@perlexperiences.com"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. PE-ACC-104"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600 font-mono"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Chartered Accountant / Billing Specialist"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Password Setting */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    {isEditing ? 'New Password (leave blank to keep unchanged)' : 'Initial Account Password'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" /> Generate Secure Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder={isEditing ? '••••••••' : 'account123'}
                    className="w-full px-3 py-2 pr-10 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Assigned Permissions */}
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-3 bg-stone-50/50 dark:bg-stone-950/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-stone-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                    <span>Assigned Financial Permissions ({assignedPermissions.length}/{ALL_ACCOUNTING_PERMISSIONS.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllPermissions}
                    className="text-[11px] font-medium text-emerald-800 dark:text-emerald-400 hover:underline"
                  >
                    {assignedPermissions.length === ALL_ACCOUNTING_PERMISSIONS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-44 overflow-y-auto">
                  {ALL_ACCOUNTING_PERMISSIONS.map((perm) => {
                    const isSelected = assignedPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100 font-medium'
                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="rounded text-emerald-800 focus:ring-emerald-700 h-3.5 w-3.5"
                        />
                        <span className="truncate">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Internal Notes & Special Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes on scope of responsibility, statutory duties, or reporting hierarchy..."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!successResult && (
          <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-3 bg-stone-50/50 dark:bg-stone-950/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="accountant-form"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : isEditing ? (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Accountant
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
