import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Shield,
  Briefcase,
  ClipboardList,
  Sparkles,
  PlusCircle,
  Menu,
  X,
  ChevronDown,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { UserRole } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenDirectSale?: () => void;
  onOpenAddLead?: () => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDirectSale,
  onOpenAddLead,
  mobileMenuOpen,
  setMobileMenuOpen,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const { currentUser, allUsersList, loginAs, switchRole, logout } = useAuth();
  const { settings } = useData();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const roleBadgeConfig: Record<
    UserRole,
    { label: string; bg: string; text: string; icon: React.ReactNode }
  > = {
    admin: {
      label: 'Admin',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-300',
      icon: <Shield className="w-3.5 h-3.5" />,
    },
    salesperson: {
      label: 'Salesperson',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-300',
      icon: <Briefcase className="w-3.5 h-3.5" />,
    },
    manager: {
      label: 'Manager',
      bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
      text: 'text-sky-800 dark:text-sky-300',
      icon: <ClipboardList className="w-3.5 h-3.5" />,
    },
  };

  const currentRole = currentUser?.role || 'admin';
  const roleInfo = roleBadgeConfig[currentRole];

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 flex-shrink-0 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 lg:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand & Mobile/Desktop Toggles */}
        <div className="flex items-center gap-3">
          {setMobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-lg transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle sidebar collapse"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-sans">
              Pearlexperiences
            </span>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              Luxury Venues
            </span>
          </div>
        </div>

        {/* Center: Operational status and date */}
        <div className="hidden md:flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-medium text-stone-800 dark:text-stone-200">Live Operations</span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <span className="text-stone-600 dark:text-stone-400">{todayFormatted}</span>
        </div>

        {/* Right: Quick Role Switcher + Primary Actions */}
        <div className="flex items-center gap-2.5">
          {/* Download App / PWA Install button for Salesperson and Manager */}
          {(currentRole === 'salesperson' || currentRole === 'manager') && (
            <PWAInstallButton variant="header" />
          )}

          {/* Quick return to Admin when testing as Salesperson or Manager */}
          {currentRole !== 'admin' && (
            <button
              type="button"
              onClick={() => switchRole('admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-lg transition-colors shadow-xs"
              title="Switch back to Administrator view"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Back to Admin</span>
            </button>
          )}

          {onOpenDirectSale && (
            <button
              onClick={onOpenDirectSale}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors shadow-sm min-h-[38px]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Direct Sale</span>
            </button>
          )}

          {/* Quick Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${roleInfo.bg} ${roleInfo.text} min-h-[38px]`}
              title="Click to switch active role for testing"
            >
              {roleInfo.icon}
              <span className="hidden sm:inline font-medium">{currentUser?.fullName?.split(' ')[0]}</span>
              <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-bold">
                {roleInfo.label}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl p-2 z-50">
                <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800 mb-1">
                  <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                    Switch Test Account / Role
                  </div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                    {currentUser?.fullName} ({currentUser?.role})
                  </div>
                </div>

                <div className="space-y-1">
                  {allUsersList.map((u) => {
                    const isSelected = u.uid === currentUser?.uid;
                    return (
                      <button
                        key={u.uid}
                        onClick={() => {
                          loginAs(u.uid);
                          setShowRoleDropdown(false);
                        }}
                        disabled={!u.isActive}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-stone-100 dark:bg-stone-800 font-semibold text-stone-900 dark:text-stone-100'
                            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                        } ${!u.isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-stone-900 dark:text-stone-200 font-medium truncate">
                            {u.fullName}
                          </div>
                          <div className="text-[10px] text-stone-600 dark:text-stone-400 truncate">
                            {u.email}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            u.role === 'admin'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : u.role === 'salesperson'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-1 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => {
                      logout();
                      setShowRoleDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Pearlexperiences</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Sign Out Icon Button */}
          <button
            onClick={logout}
            className="p-2 text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 hover:bg-stone-200/50 dark:hover:bg-stone-800 rounded-lg transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
