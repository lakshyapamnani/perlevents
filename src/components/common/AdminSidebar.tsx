import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Users,
  UserCheck,
  Truck,
  CalendarCheck2,
  Sparkles,
  Inbox,
  Contact2,
  BadgeDollarSign,
  Receipt,
  BarChart3,
  Settings,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'banquets'
  | 'availability'
  | 'salespersons'
  | 'managers'
  | 'vendors'
  | 'events'
  | 'calendar'
  | 'leads'
  | 'clients'
  | 'sales'
  | 'invoices'
  | 'sales-reports'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen = false,
  onClose,
  isCollapsed: controlledCollapsed,
  setIsCollapsed: setControlledCollapsed,
}) => {
  // Support both controlled and uncontrolled collapse state with localStorage fallback
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('perlevents_admin_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    if (setControlledCollapsed) {
      setControlledCollapsed(nextState);
    } else {
      setInternalCollapsed(nextState);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('perlevents_admin_sidebar_collapsed', String(nextState));
    }
  };

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    category?: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'banquets', label: 'Banquets', icon: <Building2 className="w-4 h-4" />, category: 'Operations' },
    { id: 'availability', label: 'Availability', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'events', label: 'Events', icon: <CalendarCheck2 className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
    { id: 'leads', label: 'Leads', icon: <Inbox className="w-4 h-4" />, category: 'Sales & Clients' },
    { id: 'clients', label: 'Clients', icon: <Contact2 className="w-4 h-4" /> },
    { id: 'sales', label: 'Sales', icon: <BadgeDollarSign className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt className="w-4 h-4" /> },
    { id: 'sales-reports', label: 'Sales Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'salespersons', label: 'Salespersons', icon: <Users className="w-4 h-4" />, category: 'People & Vendors' },
    { id: 'managers', label: 'Managers', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'vendors', label: 'Vendors', icon: <Truck className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, category: 'Configuration' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Fixed & non-scrolling with main screen */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col
          transition-all duration-300 ease-in-out
          lg:static lg:h-full lg:flex-shrink-0 lg:translate-x-0
          ${isOpen ? 'translate-x-0 shadow-2xl w-72' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
        `}
      >
        {/* Brand / Logo & Collapse Toggle Bar */}
        <div
          className={`border-b border-stone-200/80 dark:border-stone-800 flex items-center transition-all ${
            isCollapsed ? 'p-3 flex-col gap-2 justify-center' : 'p-4 justify-between'
          }`}
        >
          {isCollapsed ? (
            <>
              {/* Collapsed Brand Icon */}
              <div
                onClick={toggleCollapse}
                className="w-10 h-10 rounded-xl bg-emerald-800 dark:bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                title="PerlEvents ERP - Click to expand"
              >
                P
              </div>

              {/* Desktop Expand Button */}
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Expanded Brand Lockup */}
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
                  P
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="font-bold text-sm tracking-tight text-stone-900 dark:text-stone-100 truncate">
                    PerlEvents ERP
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 font-medium truncate">
                    Hospitality Operations
                  </div>
                </div>
              </div>

              {/* Action Buttons: Close (Mobile) & Collapse (Desktop) */}
              <div className="flex items-center gap-1">
                {/* Mobile Close Button */}
                <button
                  onClick={onClose}
                  className="lg:hidden p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Desktop Collapse Button */}
                <button
                  onClick={toggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-lg text-stone-400 hover:text-stone-800 dark:text-stone-500 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Navigation List: Scrolls independently inside the fixed sidebar */}
        <nav
          className={`flex-1 overflow-y-auto space-y-0.5 transition-all ${
            isCollapsed ? 'px-2 py-3' : 'px-3 py-3'
          }`}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <React.Fragment key={item.id}>
                {item.category && (
                  <>
                    {isCollapsed ? (
                      <div
                        className="my-2.5 mx-auto w-6 border-t border-stone-200 dark:border-stone-800"
                        title={item.category}
                      />
                    ) : (
                      <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 truncate">
                        {item.category}
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose?.();
                  }}
                  title={item.label}
                  aria-label={item.label}
                  className={`
                    transition-all duration-150 group relative
                    ${
                      isCollapsed
                        ? 'w-10 h-10 mx-auto rounded-xl flex items-center justify-center my-1'
                        : 'w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px]'
                    }
                    ${
                      isActive
                        ? 'bg-emerald-800 text-white dark:bg-emerald-700 shadow-sm'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                    }
                  `}
                >
                  <span
                    className={`flex-shrink-0 transition-transform ${
                      isActive
                        ? 'text-white'
                        : 'text-stone-600 dark:text-stone-400 group-hover:scale-110'
                    }`}
                  >
                    {item.icon}
                  </span>

                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}

                  {/* Floating tooltip on hover when sidebar is collapsed */}
                  {isCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 hidden group-hover:block whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg dark:bg-stone-800 z-50">
                      {item.label}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer info: Fixed at bottom of sidebar */}
        <div
          className={`border-t border-stone-200 dark:border-stone-800 transition-all ${
            isCollapsed ? 'p-3 flex justify-center' : 'p-3'
          }`}
        >
          {isCollapsed ? (
            <div
              className="text-[10px] font-mono text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded bg-stone-200/50 dark:bg-stone-800 text-center"
              title="PerlEvents Enterprise Suite v2.4"
            >
              v2.4
            </div>
          ) : (
            <div className="text-[11px] text-stone-600 dark:text-stone-400">
              <div className="font-medium text-stone-700 dark:text-stone-300">
                PerlEvents · Powered by Drona
              </div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">
                Enterprise Suite v2.4
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
