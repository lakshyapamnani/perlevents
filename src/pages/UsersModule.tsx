import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Pencil,
  Trash2,
  LogIn,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { formatDate } from '../utils/formatters';
import { CreateEmployeeModal } from '../components/modals/CreateEmployeeModal';

interface UsersModuleProps {
  filterRole?: 'salesperson' | 'manager';
}

export const UsersModule: React.FC<UsersModuleProps> = ({ filterRole }) => {
  const { allUsersList, toggleUserStatus, deleteEmployee, loginAs, currentUser } = useAuth();
  const { banquets } = useData();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);

  const displayUsers = allUsersList.filter(
    (u) => !filterRole || u.role === filterRole
  );

  const roleBadgeConfig: Record<UserRole, { label: string; bg: string; text: string }> = {
    admin: { label: 'Admin', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', text: '' },
    salesperson: { label: 'Salesperson', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', text: '' },
    manager: { label: 'Operations Manager', bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300', text: '' },
  };

  const handleToggle = (uid: string) => {
    const res = toggleUserStatus(uid);
    if (!res.success) {
      alert(res.error || 'Failed to update account status.');
    }
  };

  const handleDeleteUser = (u: UserProfile) => {
    const roleTitle = u.role === 'salesperson' ? 'Salesperson' : u.role === 'manager' ? 'Operations Manager' : 'Employee';
    if (window.confirm(`Are you sure you want to permanently delete ${roleTitle} "${u.fullName}" (${u.email})?\nThis action cannot be undone.`)) {
      const res = deleteEmployee(u.uid);
      if (!res.success) {
        alert(res.error || 'Failed to delete account.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>
              {filterRole === 'salesperson'
                ? 'Salespersons Directory'
                : filterRole === 'manager'
                ? 'Operations Managers Directory'
                : 'Employee Access & Role Control'}
            </span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Admin-controlled account provisioning. No public registration allowed.
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              setSelectedUserForEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision New Employee</span>
          </button>
        )}
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayUsers.map((u) => {
          const badge = roleBadgeConfig[u.role];
          const isMe = u.uid === currentUser?.uid;

          return (
            <div
              key={u.uid}
              className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {u.fullName} {isMe && <span className="text-emerald-700 text-xs">(You)</span>}
                    </h3>
                    <div className="text-xs text-stone-500">{u.email}</div>
                    {u.phone && <div className="text-[11px] text-stone-400">{u.phone}</div>}
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badge.bg}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-xs space-y-1">
                  <div className="flex justify-between text-stone-500">
                    <span>Account Status:</span>
                    <span
                      className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  <div className="flex justify-between text-stone-500">
                    <span>Provisioned Date:</span>
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {formatDate(u.createdAt)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                      Assigned Banquets ({(u.assignedBanquetIds || []).length}):
                    </span>
                    {(u.assignedBanquetIds || []).length === 0 ? (
                      <span className="text-[11px] text-stone-400 italic">No venue halls assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {banquets
                          .filter((b) => (u.assignedBanquetIds || []).includes(b.id))
                          .map((b) => (
                            <span
                              key={b.id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1 border border-stone-200/60 dark:border-stone-700"
                            >
                              <Building2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{b.name}</span>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Actions: Log in as User / Edit / Deactivate / Delete */}
              {currentUser?.role === 'admin' && (
                <div className="space-y-2.5 pt-3 border-t border-stone-100 dark:border-stone-800">
                  {/* Direct Login as Salesperson / Manager button */}
                  {!isMe && u.isActive && (
                    <button
                      type="button"
                      onClick={() => loginAs(u.uid)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      title={`Log in as ${u.fullName} (${badge.label}) to see what's happening`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>
                        Log in as {u.role === 'salesperson' ? 'Salesperson' : u.role === 'manager' ? 'Operations Manager' : 'User'}
                      </span>
                    </button>
                  )}

                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedUserForEdit(u);
                        setIsCreateModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center gap-1 transition-colors"
                      title="Edit name, phone, role, and assigned banquets"
                    >
                      <Pencil className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>Edit</span>
                    </button>

                    {!isMe && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggle(u.uid)}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            u.isActive
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40 flex items-center gap-1 transition-colors"
                          title={`Permanently delete ${u.fullName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isCreateModalOpen && (
        <CreateEmployeeModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedUserForEdit(null);
          }}
          defaultRole={filterRole || 'salesperson'}
          employeeToEdit={selectedUserForEdit}
        />
      )}
    </div>
  );
};
