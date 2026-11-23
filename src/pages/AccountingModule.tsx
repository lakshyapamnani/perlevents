import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Truck,
  BookOpen,
  Scale,
  PieChart,
  Landmark,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Shield,
  Calculator,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  PanelLeftClose,
  ChevronLeft,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

// Sub-views
import { AccountingDashboardView } from './accounting/AccountingDashboardView';
import { BanquetFinancialsView } from './accounting/BanquetFinancialsView';
import { PartnerFinancialsView } from './accounting/PartnerFinancialsView';
import { IncomeManagementView } from './accounting/IncomeManagementView';
import { ExpenseManagementView } from './accounting/ExpenseManagementView';
import { VendorPaymentsView } from './accounting/VendorPaymentsView';
import { CustomerLedgersView } from './accounting/CustomerLedgersView';
import { DoubleEntryView } from './accounting/DoubleEntryView';
import { ProfitLossView } from './accounting/ProfitLossView';
import { CashBankView } from './accounting/CashBankView';
import { SpreadsheetWorkspaceView } from './accounting/SpreadsheetWorkspaceView';
import { FinancialReportsView } from './accounting/FinancialReportsView';
import { ApprovalWorkflowView } from './accounting/ApprovalWorkflowView';
import { FinancialAuditLogsView } from './accounting/FinancialAuditLogsView';
import { FinancialCalculatorModal } from './accounting/FinancialCalculatorModal';

export type AccountingTab =
  | 'dashboard'
  | 'banquets'
  | 'partners'
  | 'income'
  | 'expenses'
  | 'vendor_payments'
  | 'customer_ledgers'
  | 'double_entry'
  | 'profit_loss'
  | 'cash_bank'
  | 'spreadsheet'
  | 'reports'
  | 'approvals'
  | 'audit_logs';

interface NavGroup {
  groupName: string;
  items: Array<{
    id: AccountingTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }>;
}

export interface AccountingModuleProps {
  onBack?: () => void;
  isMobileNavOpen?: boolean;
  setIsMobileNavOpen?: (open: boolean) => void;
}

export const AccountingModule: React.FC<AccountingModuleProps> = ({
  onBack,
  isMobileNavOpen = false,
  setIsMobileNavOpen,
}) => {
  const { currentUser } = useAuth();
  const { expenseRecords, vendorPayments, partnerSettlements } = useData();

  const [activeTab, setActiveTab] = useState<AccountingTab>('dashboard');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Desktop collapse state matching AdminSidebar
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('perlevents_accounting_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileNavOpen = setIsMobileNavOpen !== undefined ? isMobileNavOpen : internalMobileOpen;
  const setMobileNavOpen = setIsMobileNavOpen || setInternalMobileOpen;

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('perlevents_accounting_sidebar_collapsed', String(nextState));
    }
  };

  // Count pending approval items
  const pendingCount =
    expenseRecords.filter((e) => e.status === 'Pending Approval').length +
    vendorPayments.filter((p) => p.status === 'Pending Approval').length +
    partnerSettlements.filter((s) => s.status === 'Pending Approval').length;

  const isAccountantUser = currentUser?.role === 'accountant';

  const navGroups: NavGroup[] = [
    {
      groupName: 'Executive & Reports',
      items: [
        { id: 'dashboard', label: 'Financial Dashboard', icon: LayoutDashboard },
        { id: 'profit_loss', label: 'Profit & Loss (P&L)', icon: PieChart },
        { id: 'reports', label: 'Statutory Reports', icon: FileText },
      ],
    },
    {
      groupName: 'Operating Ledgers',
      items: [
        { id: 'banquets', label: 'Banquet Financials', icon: Building2 },
        { id: 'partners', label: 'Partner Bifurcation', icon: Users },
        { id: 'income', label: 'Income & Inflows', icon: TrendingUp },
        { id: 'expenses', label: 'Expense Management', icon: TrendingDown },
        { id: 'vendor_payments', label: 'Vendor Payables', icon: Truck },
        { id: 'customer_ledgers', label: 'Customer Ledgers', icon: BookOpen },
      ],
    },
    {
      groupName: 'Books & Solvency',
      items: [
        { id: 'double_entry', label: 'Double-Entry (GL)', icon: Scale },
        { id: 'cash_bank', label: 'Cash & Bank Accounts', icon: Landmark },
        { id: 'spreadsheet', label: 'Finance Spreadsheet', icon: FileSpreadsheet },
      ],
    },
    {
      groupName: 'Governance & Audit',
      items: [
        {
          id: 'approvals',
          label: 'Approvals & Limits',
          icon: ShieldCheck,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        },
        { id: 'audit_logs', label: 'Audit Trail & Compliance', icon: Shield },
      ],
    },
  ];

  const activeItemDetails = navGroups
    .flatMap((g) => g.items)
    .find((item) => item.id === activeTab);

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden relative w-full h-full">
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Accounting Sidebar: Built and styled intact like AdminSidebar */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col
          transition-all duration-300 ease-in-out
          lg:static lg:h-full lg:flex-shrink-0 lg:translate-x-0
          ${mobileNavOpen ? 'translate-x-0 shadow-2xl w-72' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
        `}
      >
        {/* If Admin: Back Option at the top of the sidebar */}
        {(onBack || currentUser?.role === 'admin') && onBack && (
          <div
            className={`border-b border-stone-200/80 dark:border-stone-800 ${
              isCollapsed ? 'p-2 flex justify-center' : 'p-3'
            }`}
          >
            <button
              onClick={onBack}
              className={`w-full flex items-center gap-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition-all shadow-2xs ${
                isCollapsed ? 'justify-center p-2' : 'px-3 py-2'
              }`}
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              {!isCollapsed && <span>Back to Admin</span>}
            </button>
          </div>
        )}

        {/* Brand / Logo & Collapse Toggle Bar */}
        <div
          className={`border-b border-stone-200/80 dark:border-stone-800 flex items-center transition-all ${
            isCollapsed ? 'p-3 flex-col gap-2 justify-center' : 'p-4 justify-between'
          }`}
        >
          {isCollapsed ? (
            <>
              <img
                src="/icon-192.png"
                alt="Pearl Accounting"
                onClick={toggleCollapse}
                className="w-10 h-10 rounded-xl object-contain shadow-sm cursor-pointer hover:opacity-90 transition-opacity bg-white p-1 border border-stone-200 dark:border-stone-700"
                title="Pearl Accounting - Click to expand"
              />
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <img
                  src="/icon-192.png"
                  alt="Pearl Accounting"
                  className="w-8 h-8 rounded-lg object-contain shadow-xs flex-shrink-0 bg-white p-0.5 border border-stone-200 dark:border-stone-700"
                />
                <div className="overflow-hidden min-w-0">
                  <div className="font-bold text-sm tracking-tight text-stone-900 dark:text-stone-100 truncate">
                    Pearl Accounting
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium truncate">
                    Financial Management ERP
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
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

        {/* Quick Action Tools Bar */}
        {!isCollapsed ? (
          <div className="p-3 border-b border-stone-200/80 dark:border-stone-800 space-y-1.5">
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold shadow-2xs transition-all"
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Financial Calculator</span>
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setIsIncomeModalOpen(true)}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200 transition-colors"
                title="Record Incoming Payment"
              >
                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
                <span>+ Income</span>
              </button>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-semibold border border-rose-200 transition-colors"
                title="Record Business Expense"
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
                <span>+ Expense</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2 border-b border-stone-200/80 dark:border-stone-800 flex justify-center">
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-700 shadow-2xs transition-colors"
              title="Launch Financial Calculator"
            >
              <Calculator className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Grouped Vertical Navigation Links: Matches AdminSidebar exact styling */}
        <nav
          className={`flex-1 overflow-y-auto space-y-0.5 transition-all ${
            isCollapsed ? 'px-2 py-3' : 'px-3 py-3'
          }`}
        >
          {navGroups.map((group) => (
            <React.Fragment key={group.groupName}>
              {isCollapsed ? (
                <div
                  className="my-2.5 mx-auto w-6 border-t border-stone-200 dark:border-stone-800"
                  title={group.groupName}
                />
              ) : (
                <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 truncate">
                  {group.groupName}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
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
                      <Icon className="w-4 h-4" />
                    </span>

                    {!isCollapsed && <span className="truncate">{item.label}</span>}

                    {!isCollapsed && item.badge !== undefined && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {item.badge}
                      </span>
                    )}

                    {/* Floating tooltip on hover when sidebar is collapsed */}
                    {isCollapsed && (
                      <span className="pointer-events-none absolute left-full ml-3 hidden group-hover:block whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg dark:bg-stone-800 z-50">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        {/* Footer info: Matches AdminSidebar */}
        <div
          className={`border-t border-stone-200 dark:border-stone-800 transition-all ${
            isCollapsed ? 'p-3 flex justify-center' : 'p-3'
          }`}
        >
          {isCollapsed ? (
            <div
              className="text-[10px] font-mono text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded bg-stone-200/50 dark:bg-stone-800 text-center"
              title="Pearlexperiences Accounting Suite"
            >
              ACC
            </div>
          ) : (
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              <div className="font-medium text-stone-700 dark:text-stone-300">
                Pearlexperiences Pvt. Ltd.
              </div>
              <div className="text-[10px] text-stone-400 dark:text-stone-500">
                Accounting & Financial ERP
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area: Independently scrolling with top breadcrumb / Back option */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-8 py-6">
        {/* Top Back bar for Admin */}
        {(onBack || currentUser?.role === 'admin') && onBack && (
          <div className="flex items-center justify-between pb-3 mb-6 border-b border-stone-200/80 dark:border-stone-800">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold shadow-2xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Back to Admin Dashboard</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>Admin ERP</span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                Accounting ({activeItemDetails?.label})
              </span>
            </div>
          </div>
        )}

        {/* Accountant context notice */}
        {isAccountantUser && (
          <div className="mb-6 bg-gradient-to-r from-emerald-900 to-teal-900 text-white px-5 py-3 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-700/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Pearl Experiences · Accounting Workspace
                </span>
                <p className="text-xs text-stone-200">
                  Logged in as <strong>{currentUser.fullName}</strong> ({currentUser.designation || 'Accountant'}).
                  Full organization financial visibility enabled.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 text-xs font-semibold text-white transition-colors border border-emerald-500/30 self-start sm:self-auto"
            >
              <Calculator className="h-4 w-4" />
              Launch Calculator
            </button>
          </div>
        )}

        {/* Active Accounting View */}
        {activeTab === 'dashboard' && (
          <AccountingDashboardView
            onNavigateTab={(tab: string) => setActiveTab(tab as AccountingTab)}
            onOpenCalculator={() => setIsCalculatorOpen(true)}
            onOpenRecordIncome={() => setIsIncomeModalOpen(true)}
            onOpenRecordExpense={() => setIsExpenseModalOpen(true)}
            onOpenVendorPayment={() => setActiveTab('vendor_payments')}
            onOpenSpreadsheet={() => setActiveTab('spreadsheet')}
          />
        )}
        {activeTab === 'banquets' && <BanquetFinancialsView />}
        {activeTab === 'partners' && <PartnerFinancialsView />}
        {activeTab === 'income' && (
          <IncomeManagementView
            isRecordModalOpen={isIncomeModalOpen}
            setIsRecordModalOpen={setIsIncomeModalOpen}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpenseManagementView
            isRecordModalOpen={isExpenseModalOpen}
            setIsRecordModalOpen={setIsExpenseModalOpen}
          />
        )}
        {activeTab === 'vendor_payments' && (
          <VendorPaymentsView onOpenCalculator={() => setIsCalculatorOpen(true)} />
        )}
        {activeTab === 'customer_ledgers' && (
          <CustomerLedgersView onOpenIncomeModal={() => setIsIncomeModalOpen(true)} />
        )}
        {activeTab === 'double_entry' && <DoubleEntryView />}
        {activeTab === 'profit_loss' && <ProfitLossView />}
        {activeTab === 'cash_bank' && <CashBankView />}
        {activeTab === 'spreadsheet' && <SpreadsheetWorkspaceView />}
        {activeTab === 'reports' && <FinancialReportsView />}
        {activeTab === 'approvals' && <ApprovalWorkflowView />}
        {activeTab === 'audit_logs' && <FinancialAuditLogsView />}
      </main>

      {/* Global Calculator Modal */}
      <FinancialCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
};
