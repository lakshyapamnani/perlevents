import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  CalendarDays,
  Inbox,
  CalendarCheck2,
  BadgeDollarSign,
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  Truck,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { AdminTab } from '../components/common/AdminSidebar';

interface AdminDashboardProps {
  setActiveTab: (tab: AdminTab) => void;
  onOpenDirectSale: () => void;
  onOpenAddLead: () => void;
  onSelectEvent: (eventId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  setActiveTab,
  onOpenDirectSale,
  onOpenAddLead,
  onSelectEvent,
}) => {
  const { metrics, events, leads, invoices, payments, activityLogs, banquets } = useData();
  const { currentUser } = useAuth();

  const today = new Date().toISOString().split('T')[0];

  const upcomingEvents = events
    .filter((e) => Boolean(e && e.date && e.date >= today && e.status !== 'cancelled'))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 5);

  const recentLeads = [...leads]
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  const pendingReminders = events
    .flatMap((e) => {
      if (!e) return [];
      const assignments = Array.isArray(e.vendorAssignments)
        ? e.vendorAssignments
        : (e.vendorAssignments && typeof e.vendorAssignments === 'object' ? Object.values(e.vendorAssignments) : []);
      return assignments
        .filter((va: any) => Boolean(va && (va.contactStatus === 'not_contacted' || va.contactStatus === 'followup_required')))
        .map((va: any) => ({ ...va, event: e }));
    })
    .slice(0, 4);

  const recentInvoices = [...invoices]
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-800 text-white shadow-sm border border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Admin Console · Pearlexperiences ERP</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {currentUser?.fullName?.split(' ')[0] || 'Administrator'}
          </h1>
          <p className="text-xs text-stone-300 mt-1">
            Realtime Banquet Availability, Sales Ledger & Multi-Role Operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddLead}
            className="px-3.5 py-2 text-xs font-semibold bg-stone-700/80 hover:bg-stone-700 text-white rounded-lg transition-colors border border-stone-600 shadow-sm"
          >
            + Add Lead
          </button>
          <button
            onClick={onOpenDirectSale}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Direct Sale</span>
          </button>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS (SECTION 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Banquets */}
        <button
          onClick={() => setActiveTab('banquets')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Banquets</span>
            <Building2 className="w-4 h-4 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
            {metrics.totalBanquets}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Active Halls</div>
        </button>

        {/* Today's Events */}
        <button
          onClick={() => setActiveTab('events')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Today</span>
            <CalendarCheck2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
            {metrics.todaysEvents}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
            {metrics.upcomingEvents} Upcoming
          </div>
        </button>

        {/* Active Leads */}
        <button
          onClick={() => setActiveTab('leads')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Active Leads</span>
            <Inbox className="w-4 h-4 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
            {metrics.newAndActiveLeads}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Enquiries in pipeline</div>
        </button>

        {/* Confirmed Bookings */}
        <button
          onClick={() => setActiveTab('events')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Confirmed</span>
            <CalendarDays className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mt-1 tabular-nums">
            {metrics.confirmedBookings}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Locked venue slots</div>
        </button>

        {/* Total Sales Value */}
        <button
          onClick={() => setActiveTab('sales')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Sales</span>
            <BadgeDollarSign className="w-4 h-4 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums truncate">
            {formatCurrency(metrics.totalSalesValue)}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Contracted value</div>
        </button>

        {/* Payments Received */}
        <button
          onClick={() => setActiveTab('sales-reports')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Received</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-1 tabular-nums truncate">
            {formatCurrency(metrics.paymentsReceived)}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Bank verified receipts</div>
        </button>

        {/* Outstanding Balances */}
        <button
          onClick={() => setActiveTab('sales-reports')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Outstanding</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-amber-800 dark:text-amber-400 mt-1 tabular-nums truncate">
            {formatCurrency(metrics.outstandingBalances)}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-500 mt-1">Pending receivables</div>
        </button>

        {/* Awaiting Vendor Confirmation */}
        <button
          onClick={() => setActiveTab('vendors')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Vendor Conf.</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
            {metrics.eventsAwaitingVendorConfirmation}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Events pending WhatsApp</div>
        </button>

        {/* Incomplete Checklists */}
        <button
          onClick={() => setActiveTab('events')}
          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-left hover:shadow-md transition-shadow group sm:col-span-2 lg:col-span-2"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Operations Checklists</span>
            <ClipboardList className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
            {metrics.eventsWithIncompleteChecklists} Events
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Checklists in progress across active event stages
          </div>
        </button>
      </div>

      {/* TWO COLUMN WORKSPACE SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Upcoming Events & Leads */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Event Schedule */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <CalendarCheck2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                  <span>Upcoming Event Schedule</span>
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Confirmed banquet bookings and operational assignments
                </p>
              </div>
              <button
                onClick={() => setActiveTab('events')}
                className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View All ({events.length})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400">
                No upcoming events scheduled.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent(evt.id)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 rounded-lg cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span>{evt.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          {evt.eventType}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 flex items-center gap-2">
                        <span>{evt.banquetName}</span>
                        <span>·</span>
                        <span>{evt.guestCount} Pax</span>
                        <span>·</span>
                        <span className="font-medium text-stone-700 dark:text-stone-300">
                          {formatDate(evt.date)} ({evt.startTime} - {evt.endTime})
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatCurrency(evt.finalAmount)}
                      </div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                        Bal: {formatCurrency(evt.remainingBalance)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Leads Module */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                  <span>Recent Lead Inquiries</span>
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Sales pipeline & follow-up tracking
                </p>
              </div>
              <button
                onClick={() => setActiveTab('leads')}
                className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View All Leads</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="py-3 px-2 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 rounded-lg text-xs"
                >
                  <div>
                    <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>{lead.clientName}</span>
                      <span className="text-[10px] text-stone-500 font-medium">({lead.phone})</span>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {lead.eventType} · {lead.expectedGuestCount} pax · Expected:{' '}
                      {formatDate(lead.expectedEventDate)} · Source: {lead.leadSource}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        lead.status === 'active'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {lead.status}
                    </span>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      Follow-up: {formatDate(lead.followUpDate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Pending Reminders & Activity Log */}
        <div className="space-y-6">
          {/* Pending Vendor Reminders */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>Pending Vendor WhatsApp</span>
              </h3>
              <button
                onClick={() => setActiveTab('vendors')}
                className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
              >
                Manage
              </button>
            </div>

            {pendingReminders.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500 dark:text-stone-400">
                All vendors confirmed!
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingReminders.map((pr, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectEvent(pr.event.id)}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {pr.vendorName}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                        {pr.contactStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      {pr.category} · For: {pr.event.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Invoices summary */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                <span>Recent Invoices</span>
              </h3>
              <button
                onClick={() => setActiveTab('invoices')}
                className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
              >
                Invoices
              </button>
            </div>

            <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">
                      {inv.invoiceNumber}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      {inv.clientName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-stone-900 dark:text-stone-100">
                      {formatCurrency(inv.finalTotal)}
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'partially_paid'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {inv.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail / Recent Activity */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-500" />
              <span>Realtime Activity Log</span>
            </h3>

            <div className="space-y-3 text-xs max-h-60 overflow-y-auto">
              {activityLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="border-l-2 border-emerald-600 pl-3 py-1">
                  <div className="flex items-center justify-between text-[10px] text-stone-400">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      {log.actorName}
                    </span>
                    <span>{formatDateTime(log.timestamp)}</span>
                  </div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                    {log.action}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                    {log.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
