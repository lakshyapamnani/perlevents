import React from 'react';
import {
  Home,
  Inbox,
  CalendarDays,
  CalendarCheck2,
  MoreHorizontal,
  Contact2,
  BadgeDollarSign,
  Receipt,
  Truck,
  Calendar,
  User,
  X,
} from 'lucide-react';

export type SalespersonTab =
  | 'home'
  | 'leads'
  | 'availability'
  | 'events'
  | 'more'
  | 'clients'
  | 'sales'
  | 'invoices'
  | 'vendors'
  | 'calendar'
  | 'profile';

interface SalespersonBottomNavProps {
  activeTab: SalespersonTab;
  setActiveTab: (tab: SalespersonTab) => void;
  showMoreDrawer: boolean;
  setShowMoreDrawer: (show: boolean) => void;
}

export const SalespersonBottomNav: React.FC<SalespersonBottomNavProps> = ({
  activeTab,
  setActiveTab,
  showMoreDrawer,
  setShowMoreDrawer,
}) => {
  const primaryTabs: Array<{ id: SalespersonTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'leads', label: 'Leads', icon: <Inbox className="w-5 h-5" /> },
    { id: 'availability', label: 'Availability', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'events', label: 'Events', icon: <CalendarCheck2 className="w-5 h-5" /> },
    { id: 'more', label: 'More', icon: <MoreHorizontal className="w-5 h-5" /> },
  ];

  const moreItems: Array<{ id: SalespersonTab; label: string; description: string; icon: React.ReactNode }> = [
    { id: 'clients', label: 'Clients', description: 'Client profiles, histories & inspiration photos', icon: <Contact2 className="w-5 h-5" /> },
    { id: 'sales', label: 'Sales', description: 'Structured sales records & commissions', icon: <BadgeDollarSign className="w-5 h-5" /> },
    { id: 'invoices', label: 'Invoices', description: 'Generate & print client invoices & PDFs', icon: <Receipt className="w-5 h-5" /> },
    { id: 'vendors', label: 'Vendor Reminders', description: 'WhatsApp click-to-chat coordination', icon: <Truck className="w-5 h-5" /> },
    { id: 'calendar', label: 'Calendar', description: 'Consolidated bookings schedule', icon: <Calendar className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile & Access', description: 'Your active permissions and account details', icon: <User className="w-5 h-5" /> },
  ];

  const handleTabClick = (tabId: SalespersonTab) => {
    if (tabId === 'more') {
      setShowMoreDrawer(!showMoreDrawer);
    } else {
      setShowMoreDrawer(false);
      setActiveTab(tabId);
    }
  };

  const isMoreActive = ['more', 'clients', 'sales', 'invoices', 'vendors', 'calendar', 'profile'].includes(activeTab);

  return (
    <>
      {/* "More" Bottom Sheet Modal */}
      {showMoreDrawer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-stone-900/50 backdrop-blur-sm animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setShowMoreDrawer(false)}
            aria-label="Close drawer"
          />
          <div className="relative z-10 bg-white dark:bg-stone-900 rounded-t-3xl border-t border-stone-200 dark:border-stone-800 p-5 shadow-2xl max-h-[80vh] overflow-y-auto">
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-4">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  Additional Modules
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Salesperson Operations & Tools
                </p>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-2 text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-6">
              {moreItems.map((item) => {
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMoreDrawer(false);
                    }}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-stone-600 dark:text-stone-400">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Salesperson Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 shadow-lg px-2 pb-safe"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          {primaryTabs.map((tab) => {
            const isActive = tab.id === 'more' ? isMoreActive : activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors ${
                  isActive
                    ? 'text-emerald-800 dark:text-emerald-400 font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 font-medium'
                }`}
              >
                <div className={`transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
                  {tab.icon}
                </div>
                <span className="text-[10px] tracking-tight mt-1 whitespace-nowrap">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 bg-emerald-700 dark:bg-emerald-400 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
