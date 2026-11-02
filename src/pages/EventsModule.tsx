import React, { useState } from 'react';
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
} from 'lucide-react';
import { BookingStatus, EventRecord } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface EventsModuleProps {
  onOpenDirectSale: () => void;
  onSelectEvent: (eventId: string) => void;
}

export const EventsModule: React.FC<EventsModuleProps> = ({
  onOpenDirectSale,
  onSelectEvent,
}) => {
  const { events, banquets } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [banquetFilter, setBanquetFilter] = useState<string>('all');

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesBanquet = banquetFilter === 'all' || e.banquetId === banquetFilter;
    return matchesSearch && matchesStatus && matchesBanquet;
  });

  const statusBadgeConfig: Record<BookingStatus, { label: string; bg: string; text: string }> = {
    tentative: { label: 'Tentative', bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-800 dark:text-amber-300' },
    confirmed: { label: 'Confirmed', bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-800 dark:text-emerald-300' },
    in_progress: { label: 'In Progress', bg: 'bg-sky-100 dark:bg-sky-950', text: 'text-sky-800 dark:text-sky-300' },
    completed: { label: 'Completed', bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-300' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' },
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Event Management & Operational Schedules</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Comprehensive overview of confirmed bookings, vendor checklists, and payment statuses.
          </p>
        </div>

        <button
          onClick={onOpenDirectSale}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Direct Sale</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search event name or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed Only</option>
            <option value="tentative">Tentative Holds</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            value={banquetFilter}
            onChange={(e) => setBanquetFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          >
            <option value="all">All Banquets</option>
            {banquets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 bg-white dark:bg-stone-900 rounded-xl border border-stone-200">
            No events found matching your search criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((evt) => {
              const badge = statusBadgeConfig[evt.status] || statusBadgeConfig.confirmed;

              return (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt.id)}
                  className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:border-emerald-600 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                        {evt.eventType}
                      </span>
                      <span className="text-stone-300">·</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                      {evt.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {evt.banquetName}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(evt.date)}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {evt.startTime} - {evt.endTime}
                      </span>
                      <span>·</span>
                      <span>{evt.guestCount} Guests</span>
                    </div>

                    <div className="text-[11px] text-stone-600 dark:text-stone-400">
                      Client: <span className="font-semibold">{evt.clientName}</span> ({evt.clientPhone}) · Sales:{' '}
                      {evt.salespersonName}
                    </div>
                  </div>

                  {/* Financial & Action block */}
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100 dark:border-stone-800">
                    <div className="text-left md:text-right">
                      <div className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatCurrency(evt.finalAmount)}
                      </div>
                      <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                        Balance: {formatCurrency(evt.remainingBalance)}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline">
                      <span>Inspect Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
