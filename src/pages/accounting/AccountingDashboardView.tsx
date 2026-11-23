import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  Filter,
  CreditCard,
  Wallet,
  AlertCircle,
  PlusCircle,
  FileSpreadsheet,
  Calculator,
  PieChart,
  BarChart3,
  Users,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { accountingEngine, DateFilterRange } from '../../services/accountingEngine';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface AccountingDashboardViewProps {
  onOpenRecordIncome?: () => void;
  onOpenRecordExpense?: () => void;
  onOpenVendorPayment?: () => void;
  onOpenSpreadsheet?: () => void;
  onOpenCalculator?: () => void;
  onNavigateTab?: (tabId: string) => void;
}

type DatePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'prev_month'
  | 'this_quarter'
  | 'this_fy'
  | 'custom';

export const AccountingDashboardView: React.FC<AccountingDashboardViewProps> = ({
  onOpenRecordIncome,
  onOpenRecordExpense,
  onOpenVendorPayment,
  onOpenSpreadsheet,
  onOpenCalculator,
  onNavigateTab = () => {},
}) => {
  const { banquets, events, incomeRecords, expenseRecords, vendorBills, vendorPayments, accountingPartners } = useData();

  const [datePreset, setDatePreset] = useState<DatePreset>('this_fy');
  const [customStart, setCustomStart] = useState<string>(() => {
    const now = new Date();
    // Default FY start: 2026-04-01
    return `${now.getFullYear()}-04-01`;
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calculate Date Range based on Preset
  const activeDateRange: DateFilterRange = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (datePreset === 'today') {
      const dStr = toYMD(today);
      return { startDate: dStr, endDate: dStr };
    }
    if (datePreset === 'this_week') {
      const first = new Date(today.setDate(today.getDate() - today.getDay() + 1));
      const last = new Date(today.setDate(first.getDate() + 6));
      return { startDate: toYMD(first), endDate: toYMD(last) };
    }
    if (datePreset === 'this_month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: toYMD(first), endDate: toYMD(last) };
    }
    if (datePreset === 'prev_month') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: toYMD(first), endDate: toYMD(last) };
    }
    if (datePreset === 'this_quarter') {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const first = new Date(today.getFullYear(), currentQuarter * 3, 1);
      const last = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
      return { startDate: toYMD(first), endDate: toYMD(last) };
    }
    if (datePreset === 'this_fy') {
      // Indian Financial Year: April 1 to March 31
      const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      return {
        startDate: `${year}-04-01`,
        endDate: `${year + 1}-03-31`,
      };
    }
    // Custom
    return { startDate: customStart, endDate: customEnd };
  }, [datePreset, customStart, customEnd]);

  // Real database calculation of KPIs
  const kpis = useMemo(() => {
    return accountingEngine.calculateFinancialKPIs(activeDateRange);
  }, [activeDateRange, events, incomeRecords, expenseRecords, vendorBills, vendorPayments]);

  // Banquet Profiles for Charts
  const banquetProfiles = useMemo(() => {
    return accountingEngine.getBanquetFinancialProfiles(activeDateRange);
  }, [activeDateRange, banquets, events, expenseRecords]);

  // Category Breakdown for Expenses Chart
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    const filtered = expenseRecords.filter((e) => {
      if (e.status === 'Reversed') return false;
      const d = e.date.slice(0, 10);
      return d >= activeDateRange.startDate && d <= activeDateRange.endDate;
    });

    filtered.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.totalAmount;
    });

    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseRecords, activeDateRange]);

  // Revenue by Event Type Chart
  const revenueByEventType = useMemo(() => {
    const map: Record<string, number> = {};
    events.filter((e) => e.status !== 'cancelled').forEach((e) => {
      const type = e.eventType || 'Other';
      map[type] = (map[type] || 0) + (Number(e.finalAmount) || 0);
    });

    return Object.entries(map)
      .map(([eventType, total]) => ({ eventType, total }))
      .sort((a, b) => b.total - a.total);
  }, [events]);

  // Monthly Revenue vs Expenses Trend (Last 6 Months)
  const monthlyTrends = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const current = new Date();
    const result: Array<{
      monthLabel: string;
      yearMonth: string;
      revenue: number;
      expenses: number;
      profit: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${months[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;

      const mRevenue = events
        .filter((e) => e.status !== 'cancelled' && (e.date || '').startsWith(ym))
        .reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);

      const mExpenses = expenseRecords
        .filter((e) => e.status !== 'Reversed' && (e.date || '').startsWith(ym))
        .reduce((sum, e) => sum + e.totalAmount, 0);

      const profit = mRevenue - mExpenses;

      result.push({
        monthLabel: label,
        yearMonth: ym,
        revenue: mRevenue,
        expenses: mExpenses,
        profit,
      });
    }

    return result;
  }, [events, expenseRecords]);

  // Partner Distribution Breakdown
  const partnerProfiles = useMemo(() => {
    return accountingEngine.getPartnerFinancialProfiles();
  }, [accountingPartners, banquetProfiles]);

  const maxMonthlyVal = Math.max(
    ...monthlyTrends.map((t) => Math.max(t.revenue, t.expenses, 100000))
  );

  return (
    <div className="space-y-6">
      {/* Date Filter Bar & Quick Actions Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 sm:p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        {/* Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          <span className="text-stone-400 font-medium mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'prev_month', label: 'Previous Month' },
            { id: 'this_quarter', label: 'This Quarter' },
            { id: 'this_fy', label: 'This FY (2026-27)' },
            { id: 'custom', label: 'Custom' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id as DatePreset)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                datePreset === preset.id
                  ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Range Picker */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
            />
            <span className="text-stone-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-stone-100"
            />
          </div>
        )}

        {/* Quick Transaction Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenRecordIncome}
            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Income</span>
          </button>

          <button
            onClick={onOpenRecordExpense}
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Expense</span>
          </button>

          <button
            onClick={onOpenCalculator}
            className="p-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl transition-colors"
            title="Open Financial Calculator"
          >
            <Calculator className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSpreadsheet}
            className="p-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl transition-colors"
            title="Open Finance Spreadsheet Workspace"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </button>
        </div>
      </div>

      {/* 9 Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* 1. Total Business Revenue */}
        <div
          onClick={() => onNavigateTab('sales')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs cursor-pointer hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Total Business Revenue
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-2 font-mono">
            {formatCurrency(kpis.totalRevenue)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
            <span>Confirmed & Completed Events</span>
          </div>
        </div>

        {/* 2. Total Money Received */}
        <div
          onClick={() => onNavigateTab('income')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs cursor-pointer hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Money Received
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-2 font-mono">
            {formatCurrency(kpis.totalReceived)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Actual Cash & Bank Inflows
          </div>
        </div>

        {/* 3. Total Outstanding Receivables */}
        <div
          onClick={() => onNavigateTab('customer_ledgers')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs cursor-pointer hover:border-amber-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Outstanding Receivables
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-2 font-mono">
            {formatCurrency(kpis.totalReceivables)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Pending Client Settlements
          </div>
        </div>

        {/* 4. Total Business Expenses */}
        <div
          onClick={() => onNavigateTab('expenses')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs cursor-pointer hover:border-red-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Total Business Expenses
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-red-700 dark:text-red-400 mt-2 font-mono">
            {formatCurrency(kpis.totalExpenses)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Vendor Direct & Operating Costs
          </div>
        </div>

        {/* 5. Total Vendor Payables */}
        <div
          onClick={() => onNavigateTab('vendor_payments')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs cursor-pointer hover:border-stone-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Total Vendor Payables
            </span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-stone-800 dark:text-stone-200 mt-2 font-mono">
            {formatCurrency(kpis.totalVendorPayables)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Unpaid Vendor Invoices & Bills
          </div>
        </div>

        {/* 6. Total Partner Payables */}
        <div
          onClick={() => onNavigateTab('partner_financials')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs cursor-pointer hover:border-purple-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Total Partner Payables
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 dark:text-purple-400 mt-2 font-mono">
            {formatCurrency(kpis.totalPartnerPayables)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Pending Partner Profit Share
          </div>
        </div>

        {/* 7. Net Profit */}
        <div
          onClick={() => onNavigateTab('p_and_l')}
          className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950 to-stone-900 border border-emerald-800/80 text-white shadow-md cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Net Profit
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-800/80 text-white flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-2 font-mono">
            {formatCurrency(kpis.netProfit)}
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1">
            Operating Net Before Partner Share
          </div>
        </div>

        {/* 8. Available Cash */}
        <div
          onClick={() => onNavigateTab('cash_and_bank')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs cursor-pointer hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Available Cash
            </span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-2 font-mono">
            {formatCurrency(kpis.availableCash)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Cash in Hand & Petty Vaults
          </div>
        </div>

        {/* 9. Bank Balance */}
        <div
          onClick={() => onNavigateTab('cash_and_bank')}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs cursor-pointer hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Bank Balance
            </span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-2 font-mono">
            {formatCurrency(kpis.bankBalance)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            Current Accounts & Business UPI
          </div>
        </div>
      </div>

      {/* Visual Charts Grid (8 Interactive Visual Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CHART 1: Monthly Revenue vs Expenses */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                <span>Monthly Revenue vs Expenses</span>
              </h3>
              <p className="text-[11px] text-stone-500">6-Month financial trajectory comparison</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
                <span className="w-3 h-3 rounded-xs bg-emerald-700 inline-block" /> Revenue
              </span>
              <span className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
                <span className="w-3 h-3 rounded-xs bg-red-600 inline-block" /> Expenses
              </span>
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-stone-200 dark:border-stone-800">
            {monthlyTrends.map((t) => {
              const revHeight = maxMonthlyVal > 0 ? (t.revenue / maxMonthlyVal) * 100 : 0;
              const expHeight = maxMonthlyVal > 0 ? (t.expenses / maxMonthlyVal) * 100 : 0;
              return (
                <div key={t.yearMonth} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
                    <div
                      style={{ height: `${Math.max(4, revHeight)}%` }}
                      className="w-1/2 max-w-[18px] bg-emerald-700 dark:bg-emerald-600 rounded-t-sm transition-all group-hover:opacity-90 relative"
                      title={`Revenue: ${formatCurrency(t.revenue)}`}
                    />
                    <div
                      style={{ height: `${Math.max(4, expHeight)}%` }}
                      className="w-1/2 max-w-[18px] bg-red-600 dark:bg-red-500 rounded-t-sm transition-all group-hover:opacity-90 relative"
                      title={`Expenses: ${formatCurrency(t.expenses)}`}
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 font-medium truncate mt-1">
                    {t.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: Monthly Profit Trend */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                <span>Monthly Net Profit Trend</span>
              </h3>
              <p className="text-[11px] text-stone-500">Operating margins across reporting months</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
              Avg: {formatCurrency(monthlyTrends.reduce((s, t) => s + t.profit, 0) / (monthlyTrends.length || 1))}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {monthlyTrends.map((t) => {
              const isPositive = t.profit >= 0;
              return (
                <div key={t.yearMonth} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-700 dark:text-stone-300">{t.monthLabel}</span>
                    <span className={`font-mono font-bold ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                      {formatCurrency(t.profit)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(5, (Math.abs(t.profit) / maxMonthlyVal) * 100))}%` }}
                      className={`h-full rounded-full ${isPositive ? 'bg-emerald-600' : 'bg-red-500'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 3: Income by Banquet */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                <span>Income by Banquet Venue</span>
              </h3>
              <p className="text-[11px] text-stone-500">Contribution per banquet facility</p>
            </div>
            <button
              onClick={() => onNavigateTab('banquet_financials')}
              className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold hover:underline"
            >
              View All Venues →
            </button>
          </div>

          {banquetProfiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">No banquet revenue records yet.</div>
          ) : (
            <div className="space-y-3">
              {banquetProfiles.map((b) => {
                const pct = kpis.totalRevenue > 0 ? (b.totalRevenue / kpis.totalRevenue) * 100 : 0;
                return (
                  <div key={b.banquetId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-stone-800 dark:text-stone-200 truncate">{b.banquetName}</span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        {formatCurrency(b.totalRevenue)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div style={{ width: `${Math.min(100, Math.max(3, pct))}%` }} className="h-full rounded-full bg-emerald-800 dark:bg-emerald-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CHART 4: Expenses by Category */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-red-600" />
                <span>Expenses by Category</span>
              </h3>
              <p className="text-[11px] text-stone-500">Direct costs & operating allocation</p>
            </div>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold hover:underline"
            >
              Manage Expenses →
            </button>
          </div>

          {expenseByCategory.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">No expense records found.</div>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {expenseByCategory.map((c) => {
                const pct = kpis.totalExpenses > 0 ? (c.amount / kpis.totalExpenses) * 100 : 0;
                return (
                  <div key={c.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-stone-700 dark:text-stone-300">{c.category}</span>
                      <span className="font-mono font-bold text-red-700 dark:text-red-400">
                        {formatCurrency(c.amount)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div style={{ width: `${Math.min(100, Math.max(3, pct))}%` }} className="h-full rounded-full bg-red-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CHART 5: Revenue by Event Type */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                <span>Revenue by Event Type</span>
              </h3>
              <p className="text-[11px] text-stone-500">Weddings, Corporate, Anniversaries & Gatherings</p>
            </div>
          </div>

          {revenueByEventType.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">No booking records found.</div>
          ) : (
            <div className="space-y-2.5">
              {revenueByEventType.map((item) => {
                const pct = kpis.totalRevenue > 0 ? (item.total / kpis.totalRevenue) * 100 : 0;
                return (
                  <div key={item.eventType} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-stone-700 dark:text-stone-300">{item.eventType}</span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        {formatCurrency(item.total)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div style={{ width: `${Math.min(100, Math.max(3, pct))}%` }} className="h-full rounded-full bg-emerald-700" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CHART 6: Partner Distribution Breakdown */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Partner-Wise Financial Distribution</span>
              </h3>
              <p className="text-[11px] text-stone-500">Profit shares entitled vs paid to partners</p>
            </div>
            <button
              onClick={() => onNavigateTab('partner_financials')}
              className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold hover:underline"
            >
              View Partner Ledgers →
            </button>
          </div>

          {partnerProfiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">No partner agreements configured.</div>
          ) : (
            <div className="space-y-3">
              {partnerProfiles.map((p) => {
                const isSettled = p.totalOutstandingAmount <= 0;
                return (
                  <div
                    key={p.partnerId}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100">{p.partnerName}</div>
                      <div className="text-[11px] text-stone-500">
                        {p.associatedBanquets.length} Venues • Entitled: {formatCurrency(p.totalProfitShare)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold ${isSettled ? 'text-emerald-600' : 'text-purple-700 dark:text-purple-400'}`}>
                        {isSettled ? 'Settled' : `Due: ${formatCurrency(p.totalOutstandingAmount)}`}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        Paid: {formatCurrency(p.totalAmountPaid)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
