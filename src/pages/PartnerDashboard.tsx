import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Handshake,
  Building2,
  CalendarCheck2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  Download,
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageCircle,
  Eye,
  PieChart,
} from 'lucide-react';
import { EventRecord, Invoice, Payment } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { downloadEventInvoicePDF, sendInvoiceOnWhatsApp } from '../utils/pdfReceiptGenerator';
import { CalendarModule } from './CalendarModule';

interface PartnerDashboardProps {
  onSelectEvent: (eventId: string) => void;
  onOpenInvoice?: (eventId: string) => void;
}

type PartnerTab = 'overview' | 'banquets' | 'events' | 'finances' | 'calendar';

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({
  onSelectEvent,
  onOpenInvoice,
}) => {
  const { currentUser } = useAuth();
  const { banquets, events, payments, invoices, clients, settings } = useData();

  const [activeTab, setActiveTab] = useState<PartnerTab>('overview');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [banquetFilter, setBanquetFilter] = useState<string>('all');

  // Assigned Banquet IDs for this partner
  const assignedBanquetIds = useMemo(() => {
    return new Set(currentUser?.assignedBanquetIds || []);
  }, [currentUser]);

  // Partner's Banquets
  const partnerBanquets = useMemo(() => {
    return banquets.filter((b) => b && assignedBanquetIds.has(b.id));
  }, [banquets, assignedBanquetIds]);

  // Partner's Events / Bookings
  const partnerEvents = useMemo(() => {
    return events.filter((e) => e && assignedBanquetIds.has(e.banquetId));
  }, [events, assignedBanquetIds]);

  // Event ID set for quick lookup
  const partnerEventIdSet = useMemo(() => {
    return new Set(partnerEvents.map((e) => e.id));
  }, [partnerEvents]);

  // Partner's Invoices
  const partnerInvoices = useMemo(() => {
    return invoices.filter((i) => i && partnerEventIdSet.has(i.eventId));
  }, [invoices, partnerEventIdSet]);

  // Partner's Payments
  const partnerPayments = useMemo(() => {
    return payments.filter((p) => p && p.eventId && partnerEventIdSet.has(p.eventId));
  }, [payments, partnerEventIdSet]);

  // Financial KPIs for Partner
  const financialMetrics = useMemo(() => {
    const totalVolume = partnerEvents.reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);
    const totalAdvances = partnerEvents.reduce((sum, e) => sum + (Number(e.advanceReceived) || 0), 0);
    const totalBalance = partnerEvents.reduce((sum, e) => sum + (Number(e.remainingBalance) || 0), 0);

    const confirmedEvents = partnerEvents.filter((e) => e.status === 'confirmed');
    const completedEvents = partnerEvents.filter((e) => e.status === 'completed');

    return {
      totalVolume,
      totalAdvances,
      totalBalance,
      totalBookings: partnerEvents.length,
      confirmedBookings: confirmedEvents.length,
      completedBookings: completedEvents.length,
    };
  }, [partnerEvents]);

  // Filtered Events for Events Tab
  const filteredEvents = useMemo(() => {
    return partnerEvents.filter((evt) => {
      if (!evt) return false;
      const q = eventSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        evt.name.toLowerCase().includes(q) ||
        evt.clientName.toLowerCase().includes(q) ||
        evt.clientPhone.includes(q) ||
        evt.banquetName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || evt.status === statusFilter;
      const matchesBanquet = banquetFilter === 'all' || evt.banquetId === banquetFilter;

      return matchesSearch && matchesStatus && matchesBanquet;
    });
  }, [partnerEvents, eventSearchQuery, statusFilter, banquetFilter]);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Welcome & Navigation Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-800/60 border border-purple-400/30 text-purple-200 text-xs font-semibold backdrop-blur-md">
              <Handshake className="w-3.5 h-3.5 text-purple-300" />
              <span>Venue Partnership Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {currentUser?.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl">
              Real-time executive oversight into your partnered banquet venues, event bookings, occupancy schedules, and financial collections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-stone-950/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('banquets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'banquets'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              My Banquets ({partnerBanquets.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'events'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Bookings ({partnerEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('finances')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'finances'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Finances
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Quick KPI Strip inside banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10 text-xs">
          <div>
            <div className="text-purple-300 font-medium">Partnered Venues</div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {partnerBanquets.length} Venue Hall{partnerBanquets.length === 1 ? '' : 's'}
            </div>
          </div>
          <div>
            <div className="text-purple-300 font-medium">Total Bookings</div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {financialMetrics.totalBookings} Event{financialMetrics.totalBookings === 1 ? '' : 's'}
            </div>
          </div>
          <div>
            <div className="text-purple-300 font-medium">Total Turnover</div>
            <div className="text-xl font-extrabold text-emerald-300 mt-0.5">
              {formatCurrency(financialMetrics.totalVolume)}
            </div>
          </div>
          <div>
            <div className="text-purple-300 font-medium">Pending Balance</div>
            <div className="text-xl font-extrabold text-amber-300 mt-0.5">
              {formatCurrency(financialMetrics.totalBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Warning if no venues assigned */}
      {partnerBanquets.length === 0 && (
        <div className="p-6 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
            No Partner Banquet Halls Assigned Yet
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto">
            Your partner profile is active, but your administrator has not yet assigned any specific banquet halls to your account. Please contact your organization administrator to link your partner halls.
          </p>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Partnered Venues Grid */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-700 dark:text-purple-400" />
              <span>Your Partnered Venues</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partnerBanquets.map((banquet) => {
                const venueEvents = events.filter((e) => e && e.banquetId === banquet.id);
                const venueRevenue = venueEvents.reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);
                const venueAdvances = venueEvents.reduce((sum, e) => sum + (Number(e.advanceReceived) || 0), 0);
                const venueBalance = venueEvents.reduce((sum, e) => sum + (Number(e.remainingBalance) || 0), 0);

                return (
                  <div
                    key={banquet.id}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-purple-300 dark:hover:border-purple-800 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                            {banquet.name}
                          </h3>
                          <p className="text-xs text-stone-500 line-clamp-1">{banquet.address}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {banquet.capacity} Pax
                        </span>
                      </div>

                      <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <div className="text-[10px] text-stone-500 uppercase font-medium">Bookings</div>
                          <div className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                            {venueEvents.length}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-stone-500 uppercase font-medium">Revenue</div>
                          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                            {formatCurrency(venueRevenue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-stone-500 uppercase font-medium">Balance</div>
                          <div className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                            {formatCurrency(venueBalance)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBanquetFilter(banquet.id);
                        setActiveTab('events');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>View Venue Bookings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Bookings for Partner Venues */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-purple-700 dark:text-purple-400" />
                <span>Recent Bookings & Events</span>
              </h2>
              <button
                onClick={() => setActiveTab('events')}
                className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline"
              >
                View All ({partnerEvents.length}) →
              </button>
            </div>

            {partnerEvents.length === 0 ? (
              <div className="p-8 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
                No bookings recorded yet for your partnered banquets.
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
                <div className="divide-y divide-stone-200 dark:divide-stone-800">
                  {partnerEvents.slice(0, 6).map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt.id)}
                      className="p-4 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                            {evt.name}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            {evt.eventType}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-stone-400" />
                            <span>{evt.banquetName}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>{formatDate(evt.date)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-stone-400" />
                            <span>{evt.guestCount} Pax</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {formatCurrency(evt.finalAmount)}
                          </div>
                          <div className="text-[11px] text-emerald-600 font-medium">
                            Adv: {formatCurrency(evt.advanceReceived)}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY BANQUETS */}
      {activeTab === 'banquets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Partnered Banquet Halls Directory
            </h2>
            <span className="text-xs text-stone-500">
              {partnerBanquets.length} venue halls under partnership
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partnerBanquets.map((banquet) => {
              const venueEvents = events.filter((e) => e && e.banquetId === banquet.id);
              const venueRevenue = venueEvents.reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);
              const venueAdvances = venueEvents.reduce((sum, e) => sum + (Number(e.advanceReceived) || 0), 0);
              const venueBalance = venueEvents.reduce((sum, e) => sum + (Number(e.remainingBalance) || 0), 0);

              return (
                <div
                  key={banquet.id}
                  className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                        {banquet.name}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">{banquet.address}</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Capacity: {banquet.capacity} Pax
                    </span>
                  </div>

                  {banquet.description && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      {banquet.description}
                    </p>
                  )}

                  <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800 grid grid-cols-3 gap-3 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-stone-500 uppercase font-medium">Total Bookings</div>
                      <div className="text-base font-bold text-stone-900 dark:text-stone-100 mt-1">
                        {venueEvents.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500 uppercase font-medium">Billed Revenue</div>
                      <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                        {formatCurrency(venueRevenue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500 uppercase font-medium">Pending Balance</div>
                      <div className="text-base font-bold text-amber-700 dark:text-amber-400 mt-1">
                        {formatCurrency(venueBalance)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBanquetFilter(banquet.id);
                        setActiveTab('events');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CalendarCheck2 className="w-3.5 h-3.5" />
                      <span>View Bookings ({venueEvents.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('calendar')}
                      className="py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Calendar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BOOKINGS & EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={eventSearchQuery}
                onChange={(e) => setEventSearchQuery(e.target.value)}
                placeholder="Search bookings by event name, client, phone, or venue..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={banquetFilter}
                onChange={(e) => setBanquetFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="all">All My Banquets</option>
                {partnerBanquets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="tentative">Tentative</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Bookings List */}
          {filteredEvents.length === 0 ? (
            <div className="p-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-center space-y-2">
              <CalendarCheck2 className="w-8 h-8 text-stone-400 mx-auto" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                No Bookings Match Your Filters
              </h3>
              <p className="text-xs text-stone-500">
                Try selecting a different banquet or clearing the search query.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((evt) => {
                const linkedInvoice = invoices.find((i) => i.eventId === evt.id);
                const client = clients.find((c) => c.id === evt.clientId);

                return (
                  <div
                    key={evt.id}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-purple-300 dark:hover:border-purple-800 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-stone-900 dark:text-stone-100">
                          {evt.name}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          {evt.eventType}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            evt.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : evt.status === 'completed'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-stone-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                          <strong>{evt.banquetName}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{formatDate(evt.date)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>
                            {evt.startTime} - {evt.endTime}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          <span>{evt.guestCount} Guests</span>
                        </span>
                        <span className="text-stone-500">
                          Client: <strong>{evt.clientName}</strong> ({evt.clientPhone})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto justify-between border-t md:border-t-0 pt-3 md:pt-0 border-stone-100 dark:border-stone-800">
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-stone-500">Total Billed</div>
                        <div className="text-base font-bold text-stone-900 dark:text-stone-100">
                          {formatCurrency(evt.finalAmount)}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600">
                          Adv: {formatCurrency(evt.advanceReceived)} · Bal: {formatCurrency(evt.remainingBalance)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectEvent(evt.id)}
                          className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            downloadEventInvoicePDF({
                              event: evt,
                              client,
                              invoice: linkedInvoice,
                              payments,
                              settings,
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                          title="Download Official Billing PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FINANCES & INVOICES */}
      {activeTab === 'finances' && (
        <div className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs font-medium text-stone-500">Total Partnership Turnover</div>
              <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-1">
                {formatCurrency(financialMetrics.totalVolume)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                From {partnerEvents.length} banquet bookings
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs font-medium text-stone-500">Advances Received</div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(financialMetrics.totalAdvances)}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                Deposited & accounted
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs font-medium text-stone-500">Pending Remaining Balance</div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(financialMetrics.totalBalance)}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                To be collected prior to event execution
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-purple-700 dark:text-purple-400" />
              <span>Invoices for Your Partnered Venues</span>
            </h3>

            {partnerInvoices.length === 0 ? (
              <div className="p-8 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
                No invoices issued yet for your venues.
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 font-bold border-b border-stone-200 dark:border-stone-800 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Event & Venue</th>
                        <th className="p-3">Client</th>
                        <th className="p-3 text-right">Final Total</th>
                        <th className="p-3 text-right">Advance Received</th>
                        <th className="p-3 text-right">Balance Due</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                      {partnerInvoices.map((inv) => {
                        const linkedEvt = events.find((e) => e.id === inv.eventId);
                        const client = clients.find((c) => c.id === inv.clientId);

                        return (
                          <tr key={inv.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20">
                            <td className="p-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                              {inv.invoiceNumber}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-stone-900 dark:text-stone-100">
                                {inv.eventName}
                              </div>
                              <div className="text-[11px] text-stone-500">{inv.banquetName}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-stone-800 dark:text-stone-200">
                                {inv.clientName}
                              </div>
                              <div className="text-[11px] text-stone-400">{inv.clientPhone}</div>
                            </td>
                            <td className="p-3 text-right font-bold text-stone-900 dark:text-stone-100">
                              {formatCurrency(inv.finalTotal)}
                            </td>
                            <td className="p-3 text-right font-semibold text-emerald-600">
                              {formatCurrency(inv.actualAdvanceReceived)}
                            </td>
                            <td className="p-3 text-right font-semibold text-amber-600">
                              {formatCurrency(inv.remainingBalance)}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  inv.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : inv.status === 'partially_paid'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (linkedEvt) {
                                    downloadEventInvoicePDF({
                                      event: linkedEvt,
                                      client,
                                      invoice: inv,
                                      payments,
                                      settings,
                                    });
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Payment Receipts Log */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-700 dark:text-purple-400" />
              <span>Payments & Advances Received</span>
            </h3>

            {partnerPayments.length === 0 ? (
              <div className="p-8 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
                No payment transactions recorded yet.
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
                <div className="divide-y divide-stone-200 dark:divide-stone-800">
                  {partnerPayments.map((pay) => (
                    <div
                      key={pay.id}
                      className="p-3.5 flex items-center justify-between text-xs hover:bg-stone-50 dark:hover:bg-stone-800/40"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          <span>{pay.clientName}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                            {pay.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Recorded: {formatDate(pay.createdAt)} · By: {pay.recordedByName}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(pay.amount)}
                        </div>
                        {pay.referenceNumber && (
                          <div className="text-[10px] text-stone-400 font-mono">
                            Ref: {pay.referenceNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CALENDAR / OCCUPANCY */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                <span>Partner Banquets Occupancy & Schedule</span>
              </h2>
              <p className="text-xs text-purple-800/80 dark:text-purple-300/80">
                Live view of all confirmed and held booking slots strictly for your partnered banquet halls.
              </p>
            </div>
          </div>

          <CalendarModule onSelectEvent={(id) => onSelectEvent(id)} />
        </div>
      )}
    </div>
  );
};