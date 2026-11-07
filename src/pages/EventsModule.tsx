import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  CalendarCheck2,
  Plus,
  Search,
  Filter,
  Calendar,
  Building2,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Receipt,
  Download,
  Printer,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Wallet,
  Smartphone,
  Landmark,
  FileCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { BookingStatus, EventRecord } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { EventFinanceModal } from '../components/modals/EventFinanceModal';
import { downloadEventInvoicePDF } from '../utils/pdfReceiptGenerator';

interface EventsModuleProps {
  onOpenDirectSale: () => void;
  onSelectEvent: (eventId: string) => void;
  onOpenInvoice?: (eventId: string) => void;
}

export const EventsModule: React.FC<EventsModuleProps> = ({
  onOpenDirectSale,
  onSelectEvent,
  onOpenInvoice,
}) => {
  const { events, banquets, payments, invoices, clients, settings } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [banquetFilter, setBanquetFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Selected event for the Picture 1 Financial Management & WhatsApp Modal
  const [selectedFinanceEventId, setSelectedFinanceEventId] = useState<string | null>(null);

  // Month options for filter dropdown
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.date) {
        set.add(e.date.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort().reverse();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (!e) return false;
      const matchesSearch =
        (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.clientPhone || '').includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchesBanquet = banquetFilter === 'all' || e.banquetId === banquetFilter;
      const matchesMonth = monthFilter === 'all' || (e.date && e.date.startsWith(monthFilter));
      return matchesSearch && matchesStatus && matchesBanquet && matchesMonth;
    });
  }, [events, searchQuery, statusFilter, banquetFilter, monthFilter]);

  // Overall Financial Calculations (Matching Picture 2 Fees Overview Dashboard)
  const dashboardStats = useMemo(() => {
    const activeEvents = events.filter((e) => e && e.status !== 'cancelled');

    const totalFees = activeEvents.reduce((acc, e) => acc + (Number(e.finalAmount) || 0), 0);
    const totalReceived = activeEvents.reduce((acc, e) => acc + (Number(e.advanceReceived) || 0), 0);
    const totalDue = activeEvents.reduce((acc, e) => acc + (Number(e.remainingBalance) || Math.max(0, (Number(e.finalAmount) || 0) - (Number(e.advanceReceived) || 0))), 0);

    const collectionRate = totalFees > 0 ? Math.round((totalReceived / totalFees) * 100) : 0;
    const pendingRate = totalFees > 0 ? Math.round((totalDue / totalFees) * 100) : 0;

    // Dates for collection summary
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7);

    // Payments breakdown
    const todayPayments = payments.filter((p) => p && p.paymentDate === todayStr && p.type !== 'refund');
    const todayReceived = todayPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const monthPayments = payments.filter((p) => p && p.paymentDate && p.paymentDate.startsWith(currentMonthStr) && p.type !== 'refund');
    const monthReceived = monthPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Status breakdown
    const fullyPaidCount = activeEvents.filter((e) => (Number(e.remainingBalance) || 0) <= 0 && (Number(e.finalAmount) || 0) > 0).length;
    const partialCount = activeEvents.filter((e) => (Number(e.advanceReceived) || 0) > 0 && (Number(e.remainingBalance) || 0) > 0).length;
    const unpaidCount = activeEvents.filter((e) => (Number(e.advanceReceived) || 0) === 0 && (Number(e.finalAmount) || 0) > 0).length;

    // Payment modes breakdown
    const modeTotals: Record<string, { amount: number; count: number }> = {
      cash: { amount: 0, count: 0 },
      upi: { amount: 0, count: 0 },
      card: { amount: 0, count: 0 },
      bank_transfer: { amount: 0, count: 0 },
      cheque: { amount: 0, count: 0 },
      other: { amount: 0, count: 0 },
    };

    payments.forEach((p) => {
      if (!p || p.type === 'refund') return;
      const mode = (p.paymentMethod || 'other').toLowerCase();
      const target = modeTotals[mode] || modeTotals.other;
      target.amount += Number(p.amount) || 0;
      target.count += 1;
    });

    return {
      totalFees,
      totalReceived,
      totalDue,
      collectionRate,
      pendingRate,
      activeCount: activeEvents.length,
      todayReceived,
      monthReceived,
      fullyPaidCount,
      partialCount,
      unpaidCount,
      modeTotals,
    };
  }, [events, payments]);

  const statusBadgeConfig: Record<BookingStatus, { label: string; bg: string; text: string }> = {
    tentative: { label: 'Tentative', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/40', text: '' },
    confirmed: { label: 'Confirmed', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40', text: '' },
    in_progress: { label: 'In Progress', bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300/40', text: '' },
    completed: { label: 'Completed', bg: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-300/40', text: '' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300/40', text: '' },
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setBanquetFilter('all');
    setMonthFilter('all');
  };

  return (
    <div className="space-y-8 pb-24">
      {/* =========================================================================
          TOP FINANCIAL DASHBOARD (Matching Picture 2 Fees Overview Dashboard)
         ========================================================================= */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#091122] border border-[#172544] text-white shadow-2xl space-y-6">
        {/* Header bar of Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1b2b4d] gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>Fees & Event Sales Dashboard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              Fees Overview Dashboard
            </h1>
            <p className="text-xs text-stone-400">
              Live financial calculations, collection tracking & fee status analytics across events and banquets
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-2 bg-[#121f3a] hover:bg-[#1a2c52] text-stone-300 rounded-xl text-xs font-semibold border border-[#223762] transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>

            <button
              onClick={onOpenDirectSale}
              className="px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5 min-h-[36px]"
            >
              <Plus className="w-4 h-4" />
              <span>New Direct Sale</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0d172e] p-3 rounded-2xl border border-[#1b2c52]">
          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
              Search Event / Client
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#21345c] bg-[#070e1e] text-white placeholder-stone-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
              Month / Period
            </label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#21345c] bg-[#070e1e] text-white outline-none"
            >
              <option value="all">All Months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
              Banquet / Venue
            </label>
            <select
              value={banquetFilter}
              onChange={(e) => setBanquetFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#21345c] bg-[#070e1e] text-white outline-none"
            >
              <option value="all">All Banquets</option>
              {banquets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
              Payment Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#21345c] bg-[#070e1e] text-white outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="tentative">Tentative</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Primary 3 Metric Cards (Matching Picture 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Fees */}
          <div className="p-5 rounded-2xl bg-[#0c1527] border border-[#1d2d50] relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  TOTAL FEES
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  100% Structured
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-2 tabular-nums">
                {formatCurrency(dashboardStats.totalFees)}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                Assigned across {dashboardStats.activeCount} active events
              </div>
            </div>
            <div className="mt-3 text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
              <span>Structure Coverage</span>
              <span className="ml-auto">100% Assigned ↗</span>
            </div>
          </div>

          {/* Card 2: Received / Collected */}
          <div className="p-5 rounded-2xl bg-[#0c1527] border border-[#155e42]/60 relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  RECEIVED
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  {dashboardStats.collectionRate}% Collected
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 tabular-nums">
                {formatCurrency(dashboardStats.totalReceived)}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                Collected event revenue
              </div>
            </div>
            <div className="mt-3 text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
              <span>Collection Rate</span>
              <span className="ml-auto">{dashboardStats.collectionRate}% of Total</span>
            </div>
          </div>

          {/* Card 3: Due Amount / Remaining */}
          <div className="p-5 rounded-2xl bg-[#0c1527] border border-[#5c1c28]/60 relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  DUE AMOUNT
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800/80">
                  {dashboardStats.pendingRate}% Pending
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-2 tabular-nums">
                {formatCurrency(dashboardStats.totalDue)}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                Total outstanding balance remaining
              </div>
            </div>
            <div className="mt-3 text-[10px] font-semibold text-rose-300 flex items-center gap-1">
              <span>Outstanding Balance</span>
              <span className="ml-auto">{dashboardStats.pendingRate}% Remaining</span>
            </div>
          </div>
        </div>

        {/* Middle Section: Collection Summary & Event Payment Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Collection Summary */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1629] border border-[#1d2d50]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2b4d] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Collection Summary</span>
              </span>
              <span className="text-[10px] text-stone-400">Real-time stats</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#070e1c] border border-[#1b2b4d]">
                <span className="text-[10px] font-semibold text-indigo-400 block">Today</span>
                <div className="text-sm font-bold text-emerald-400 mt-1 tabular-nums">
                  {formatCurrency(dashboardStats.todayReceived)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Today's collection</div>
              </div>

              <div className="p-3 rounded-xl bg-[#070e1c] border border-[#1b2b4d]">
                <span className="text-[10px] font-semibold text-indigo-400 block">This Month</span>
                <div className="text-sm font-bold text-emerald-400 mt-1 tabular-nums">
                  {formatCurrency(dashboardStats.monthReceived)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Month's collection</div>
              </div>

              <div className="p-3 rounded-xl bg-[#070e1c] border border-[#1b2b4d]">
                <span className="text-[10px] font-semibold text-rose-400 block">Total Due</span>
                <div className="text-sm font-bold text-rose-400 mt-1 tabular-nums">
                  {formatCurrency(dashboardStats.totalDue)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Pending collection</div>
              </div>
            </div>
          </div>

          {/* Event Booking Fee Status */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1629] border border-[#1d2d50]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2b4d] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Event Payment Status</span>
              </span>
              <span className="text-[10px] text-stone-400">Total: {dashboardStats.activeCount}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#070e1c] border border-[#1b2b4d]">
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span>●</span> Fully Cleared
                </span>
                <div className="text-sm font-bold text-white mt-1">
                  {dashboardStats.fullyPaidCount} <span className="text-xs font-normal text-stone-400">events</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#070e1c] border border-[#1b2b4d]">
                <span className="text-[10px] font-semibold text-sky-400 flex items-center gap-1">
                  <span>●</span> Partial Paid
                </span>
                <div className="text-sm font-bold text-white mt-1">
                  {dashboardStats.partialCount} <span className="text-xs font-normal text-stone-400">events</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#070e1c] border border-[#1b2b4d]">
                <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                  <span>●</span> Unpaid Advance
                </span>
                <div className="text-sm font-bold text-white mt-1">
                  {dashboardStats.unpaidCount} <span className="text-xs font-normal text-stone-400">events</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Mode Breakdown (Matching Picture 2 bottom row) */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2.5 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-indigo-400" />
            <span>Payment Mode Breakdown</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            <div className="p-3 rounded-xl bg-[#0c1527] border border-[#1d2d50]">
              <span className="text-[10px] font-semibold text-stone-400 block">Cash</span>
              <div className="text-xs font-bold text-white mt-1 tabular-nums">
                {formatCurrency(dashboardStats.modeTotals.cash.amount)}
              </div>
              <span className="text-[9px] text-stone-500">{dashboardStats.modeTotals.cash.count} txns</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1527] border border-[#1d2d50]">
              <span className="text-[10px] font-semibold text-stone-400 block">UPI / QR</span>
              <div className="text-xs font-bold text-white mt-1 tabular-nums">
                {formatCurrency(dashboardStats.modeTotals.upi.amount)}
              </div>
              <span className="text-[9px] text-stone-500">{dashboardStats.modeTotals.upi.count} txns</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1527] border border-[#1d2d50]">
              <span className="text-[10px] font-semibold text-stone-400 block">Bank Transfer</span>
              <div className="text-xs font-bold text-white mt-1 tabular-nums">
                {formatCurrency(dashboardStats.modeTotals.bank_transfer.amount)}
              </div>
              <span className="text-[9px] text-stone-500">{dashboardStats.modeTotals.bank_transfer.count} txns</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1527] border border-[#1d2d50]">
              <span className="text-[10px] font-semibold text-stone-400 block">Card</span>
              <div className="text-xs font-bold text-white mt-1 tabular-nums">
                {formatCurrency(dashboardStats.modeTotals.card.amount)}
              </div>
              <span className="text-[9px] text-stone-500">{dashboardStats.modeTotals.card.count} txns</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1527] border border-[#1d2d50]">
              <span className="text-[10px] font-semibold text-stone-400 block">Cheque</span>
              <div className="text-xs font-bold text-white mt-1 tabular-nums">
                {formatCurrency(dashboardStats.modeTotals.cheque.amount)}
              </div>
              <span className="text-[9px] text-stone-500">{dashboardStats.modeTotals.cheque.count} txns</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1527] border border-[#1d2d50]">
              <span className="text-[10px] font-semibold text-stone-400 block">Other</span>
              <div className="text-xs font-bold text-white mt-1 tabular-nums">
                {formatCurrency(dashboardStats.modeTotals.other.amount)}
              </div>
              <span className="text-[9px] text-stone-500">{dashboardStats.modeTotals.other.count} txns</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          EVENT CARDS LIST: SQUARE CARDS, 3 EVENTS IN ONE LINE
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CalendarCheck2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
              <span>Booked Events & Billing ({filteredEvents.length})</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Square event cards with direct invoice download, live advance payment and balance management.
            </p>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <Calendar className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="font-semibold text-sm text-stone-700 dark:text-stone-300">
              No events found matching your search and filter criteria.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold rounded-xl text-stone-700 dark:text-stone-300"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          /* 3 Events In One Line Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((evt) => {
              const badge = statusBadgeConfig[evt.status] || statusBadgeConfig.confirmed;
              const total = Number(evt.finalAmount) || 0;
              const advance = Number(evt.advanceReceived) || 0;
              const remaining = Math.max(0, Number(evt.remainingBalance) || (total - advance));
              const pctPaid = total > 0 ? Math.min(100, Math.round((advance / total) * 100)) : 0;

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedFinanceEventId(evt.id)}
                  className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 shadow-sm hover:shadow-xl hover:border-emerald-600/80 transition-all cursor-pointer flex flex-col justify-between p-5 group relative overflow-hidden"
                >
                  {/* Card Header: Banquet & Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 truncate max-w-[65%]">
                        {evt.banquetName}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg ${badge.bg} shrink-0`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Event Name & Type */}
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        {evt.eventType}
                      </div>
                      <h3 className="font-bold text-base text-stone-900 dark:text-white line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {evt.name}
                      </h3>
                      <div className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 truncate">
                        Client: <span className="font-semibold text-stone-900 dark:text-stone-200">{evt.clientName}</span> ({evt.clientPhone})
                      </div>
                    </div>

                    {/* Date, Time, Pax */}
                    <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-950/70 border border-stone-100 dark:border-stone-800/80 space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-medium text-stone-800 dark:text-stone-200">{formatDate(evt.date)}</span>
                        <span>·</span>
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{evt.startTime} - {evt.endTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>{evt.guestCount} Guests</span>
                        <span>Sales: {evt.salespersonName || 'Executive'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Bar (Total, Advance Paid, Remaining) */}
                  <div className="mt-4 pt-3.5 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] text-stone-400 block">Total</span>
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                          {formatCurrency(total)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">Paid</span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(advance)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-rose-500 block">Balance</span>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${pctPaid}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-stone-400 font-medium">
                        <span>{pctPaid}% Paid</span>
                        <span>{remaining <= 0 ? 'Fully Cleared' : 'Payment Due'}</span>
                      </div>
                    </div>

                    {/* Actions: Direct Invoice Download & Manage Finance */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      {/* Direct Invoice Download Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const linkedInv = invoices.find((i) => i.eventId === evt.id);
                          const client = clients.find((c) => c.id === evt.clientId);
                          downloadEventInvoicePDF({
                            event: evt,
                            client,
                            invoice: linkedInv,
                            payments,
                            settings,
                          });
                        }}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 flex items-center gap-1.5 transition-colors"
                        title="Download Tax Invoice & Receipt PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Download Invoice</span>
                      </button>

                      {/* Manage Financials / Details button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFinanceEventId(evt.id);
                        }}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-sm transition-colors"
                      >
                        <span>Finance & Pay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Picture 1 Financial Management & WhatsApp Notification Modal */}
      {selectedFinanceEventId && (
        <EventFinanceModal
          isOpen={Boolean(selectedFinanceEventId)}
          onClose={() => setSelectedFinanceEventId(null)}
          eventId={selectedFinanceEventId}
          onOpenInvoice={onOpenInvoice}
          onInspectEvent={(id) => {
            setSelectedFinanceEventId(null);
            onSelectEvent(id);
          }}
        />
      )}
    </div>
  );
};
