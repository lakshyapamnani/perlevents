import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Shield,
  Briefcase,
  ClipboardList,
  Handshake,
  PlusCircle,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { UserRole } from '../../types';

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
  const { currentUser, logout } = useAuth();
  const { settings } = useData();

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
    partner: {
      label: 'Partner',
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
      text: 'text-purple-800 dark:text-purple-300',
      icon: <Handshake className="w-3.5 h-3.5" />,
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

          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="Pearl Experience Logo"
              className="w-8 h-8 rounded-lg object-contain shadow-2xs border border-stone-200 dark:border-stone-700 bg-white p-0.5"
            />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 font-sans leading-tight">
                Pearl Experience
              </span>
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 leading-none hidden sm:inline">
                Luxury Venues & Events
              </span>
            </div>
          </div>
        </div>

        {/* Center: Operational status and date */}
        <div className="hidden md:flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-medium text-stone-800 dark:text-stone-200">Live Operations</span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <span className="text-stone-600 dark:text-stone-400">{todayFormatted}</span>
        </div>

        {/* Right: Role indicator + Sign Out */}
        <div className="flex items-center gap-2.5">
          {onOpenDirectSale && (
            <button
              onClick={onOpenDirectSale}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors shadow-sm min-h-[38px]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Direct Sale</span>
            </button>
          )}

          {/* Current Role Indicator Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${roleInfo.bg} ${roleInfo.text} min-h-[38px]`}
          >
            {roleInfo.icon}
            <span className="hidden sm:inline font-medium">{currentUser?.fullName}</span>
            <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-bold">
              {roleInfo.label}
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-red-600 dark:text-stone-300 dark:hover:text-red-400 hover:bg-stone-200/50 dark:hover:bg-stone-800 rounded-lg transition-colors border border-stone-200 dark:border-stone-700 min-h-[38px]"
            title="Sign Out of Pearlexperiences"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
