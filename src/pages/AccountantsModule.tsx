import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Pencil,
  LogIn,
  Search,
  Phone,
  Mail,
  Calendar,
  Building2,
  FileText,
  BadgeAlert,
  ArrowRight,
  ShieldCheck,
  UserCog,
  History,
  X,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { UserProfile } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';
import { CreateAccountantModal } from '../components/modals/CreateAccountantModal';

export const AccountantsModule: React.FC = () => {
  const { allUsersList, toggleUserStatus, loginAs, currentUser, resetPasswordForUser } = useAuth();
  const { banquets } = useData();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAccountantForEdit, setSelectedAccountantForEdit] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [inspectedAccountant, setInspectedAccountant] = useState<UserProfile | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filter only accountants
  const accountants = useMemo(() => {
    return allUsersList.filter((u) => u.role === 'accountant');
  }, [allUsersList]);

  const filteredAccountants = useMemo(() => {
    return accountants.filter((acc) => {
      if (statusFilter === 'active' && !acc.isActive) return false;
      if (statusFilter === 'inactive' && acc.isActive) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        acc.fullName.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        (acc.phone && acc.phone.toLowerCase().includes(q)) ||
        (acc.employeeId && acc.employeeId.toLowerCase().includes(q)) ||
        (acc.designation && acc.designation.toLowerCase().includes(q))
      );
    });
  }, [accountants, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: accountants.length,
      active: accountants.filter((a) => a.isActive).length,
      inactive: accountants.filter((a) => !a.isActive).length,
      totalBanquets: banquets.length,
    };
  }, [accountants, banquets]);

  const handleToggleStatus = (uid: string) => {
    const res = toggleUserStatus(uid);
    if (!res.success) {
      alert(res.error || 'Failed to update account status.');
    } else {
      setActionNotice('Account status updated.');
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleResetPassword = async (acc: UserProfile) => {
    if (window.confirm(`Reset password for accountant "${acc.fullName}" (${acc.email})?\nA secure authentication reset will be performed.`)) {
      const res = await resetPasswordForUser(acc.email);
      if (res.success) {
        alert(res.error || `Password reset instructions sent for ${acc.email}.`);
      } else {
        alert(res.error || 'Failed to reset password.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Accountants & Financial Officers</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Accountant account management, role permissions, activity monitoring, and credential controls.
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              setSelectedAccountantForEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Accountant</span>
          </button>
        )}
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Total Accountants
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
            {stats.total}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Authorized personnel</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Active Accounts
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {stats.active}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Currently operating</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Inactive Accounts
          </div>
          <div className="text-2xl font-bold text-stone-700 dark:text-stone-300 mt-1">
            {stats.inactive}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Access suspended</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Financial Scope
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
            All Banquets
          </div>
          <div className="text-[11px] text-stone-500 mt-1">{stats.totalBanquets} venues covered</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 sm:p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, designation, or employee ID..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-medium whitespace-nowrap">Status:</span>
          <div className="inline-flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1 text-xs">
            {(['all', 'active', 'inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accountants Table / Grid */}
      {filteredAccountants.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
          <UserCog className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            No Accountants Found
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No accountant records match your search criteria.'
              : 'No accountant accounts have been provisioned yet. Click "Create Accountant" above to add one.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Accountant</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Designation & Joining</th>
                  <th className="py-3 px-4">Permissions Scope</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {filteredAccountants.map((acc) => {
                  const permCount = acc.assignedPermissions?.length || 13;
                  return (
                    <tr
                      key={acc.uid}
                      className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
                            {acc.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                              <span>{acc.fullName}</span>
                              {acc.employeeId && (
                                <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] font-mono text-stone-600 dark:text-stone-400">
                                  {acc.employeeId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 truncate">
                              Role: Financial Accountant
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-stone-700 dark:text-stone-300">
                            <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate">{acc.email}</span>
                          </div>
                          {acc.phone && (
                            <div className="flex items-center gap-1 text-stone-500 text-[11px]">
                              <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span>{acc.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Designation & Joining */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-900 dark:text-stone-100">
                          {acc.designation || 'Accountant'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Joined: {acc.joiningDate ? formatDate(acc.joiningDate) : formatDate(acc.createdAt)}
                        </div>
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 text-[11px] font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>{permCount} Financial Modules</span>
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          All Banquets Access
                        </div>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-stone-600 dark:text-stone-400 text-[11px]">
                        {acc.lastLogin ? formatDate(acc.lastLogin) : 'Never logged in'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(acc.uid)}
                          title={`Click to ${acc.isActive ? 'deactivate' : 'activate'}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                            acc.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 hover:bg-red-200'
                          }`}
                        >
                          {acc.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Inactive
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Records & Activity */}
                          <button
                            onClick={() => setInspectedAccountant(acc)}
                            className="p-1.5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                            title="Inspect records created by this accountant"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => handleResetPassword(acc)}
                            className="p-1.5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => {
                              setSelectedAccountantForEdit(acc);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-1.5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                            title="Edit Accountant Profile"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Login As (Admin switch) */}
                          {currentUser?.role === 'admin' && (
                            <button
                              onClick={() => loginAs(acc.uid)}
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
                              title="Sign in as this accountant"
                            >
                              <LogIn className="w-3 h-3" />
                              <span className="hidden sm:inline">Login As</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Accountant Activity & Records Modal */}
      {inspectedAccountant && (
        <AccountantActivityDrawer
          accountant={inspectedAccountant}
          onClose={() => setInspectedAccountant(null)}
        />
      )}

      {/* Create / Edit Modal */}
      {isCreateModalOpen && (
        <CreateAccountantModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedAccountantForEdit(null);
          }}
          accountantToEdit={selectedAccountantForEdit}
        />
      )}
    </div>
  );
};

// Activity Drawer Component
const AccountantActivityDrawer: React.FC<{
  accountant: UserProfile;
  onClose: () => void;
}> = ({ accountant, onClose }) => {
  const { activityLogs, payments, invoices } = useData();

  // Activity logs by this accountant
  const userLogs = useMemo(() => {
    return activityLogs.filter(
      (log) => log.actorId === accountant.uid || log.actorName === accountant.fullName
    );
  }, [activityLogs, accountant]);

  const createdPayments = useMemo(() => {
    return payments.filter(
      (p) => p.recordedBy === accountant.uid || p.recordedByName === accountant.fullName
    );
  }, [payments, accountant]);

  const createdInvoices = useMemo(() => {
    return invoices.filter(
      (i) => i.createdBy === accountant.uid || i.createdByName === accountant.fullName
    );
  }, [invoices, accountant]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold flex items-center justify-center">
              {accountant.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>{accountant.fullName}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-normal">
                  {accountant.employeeId || 'Accountant'}
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                Created records, transaction logs, and operational activity history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
              <div className="text-[10px] uppercase text-stone-500 font-semibold">Total Actions</div>
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                {userLogs.length}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
              <div className="text-[10px] uppercase text-stone-500 font-semibold">Payments Handled</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                {createdPayments.length}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
              <div className="text-[10px] uppercase text-stone-500 font-semibold">Invoices Created</div>
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                {createdInvoices.length}
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
              <span>Recent Activity & Audit Entries</span>
            </h4>

            {userLogs.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 dark:bg-stone-950 rounded-xl text-xs text-stone-500">
                No recent audit log activities recorded for this accountant yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {userLogs.slice(0, 30).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-stone-100">
                        {log.action}
                      </div>
                      <div className="text-stone-600 dark:text-stone-400 text-[11px] mt-0.5">
                        {log.details}
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-400 whitespace-nowrap shrink-0">
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-end bg-stone-50/50 dark:bg-stone-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
