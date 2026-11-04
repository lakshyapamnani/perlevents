import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Building2,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { BookingStatus, EventRecord } from '../types';

interface CalendarModuleProps {
  onSelectEvent: (eventId: string) => void;
  onOpenDirectSaleWithDate?: (date: string) => void;
}

export const CalendarModule: React.FC<CalendarModuleProps> = ({
  onSelectEvent,
  onOpenDirectSaleWithDate,
}) => {
  const { events, banquets } = useData();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedBanquet, setSelectedBanquet] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const filteredEvents = events.filter((e) => {
    const matchBanquet = selectedBanquet === 'all' || e.banquetId === selectedBanquet;
    const matchStatus = selectedStatus === 'all' || e.status === selectedStatus;
    return matchBanquet && matchStatus;
  });

  const currentBanquetObj = selectedBanquet !== 'all' ? banquets.find((b) => b.id === selectedBanquet) : null;
  const currentBanquetMaxDaily = currentBanquetObj?.maxBookingsPerDay || 2;

  // Monthly stats
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEvents = filteredEvents.filter((e) => e.date.startsWith(monthPrefix));
  const occupiedDatesCount = new Set(monthEvents.map((e) => e.date)).size;
  const confirmedOccupiedCount = monthEvents.filter((e) => e.status === 'confirmed').length;
  const tentativeCount = monthEvents.filter((e) => e.status === 'tentative').length;

  const statusStyles: Record<
    BookingStatus,
    { bg: string; text: string; badge: string; border: string }
  > = {
    confirmed: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
      text: 'text-emerald-900 dark:text-emerald-200',
      badge: 'bg-emerald-700 text-white',
      border: 'border-emerald-300 dark:border-emerald-800',
    },
    tentative: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50',
      text: 'text-amber-900 dark:text-amber-200',
      badge: 'bg-amber-600 text-white',
      border: 'border-amber-300 dark:border-amber-800',
    },
    in_progress: {
      bg: 'bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50',
      text: 'text-sky-900 dark:text-sky-200',
      badge: 'bg-sky-600 text-white',
      border: 'border-sky-300 dark:border-sky-800',
    },
    completed: {
      bg: 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700',
      text: 'text-stone-700 dark:text-stone-300',
      badge: 'bg-stone-600 text-white',
      border: 'border-stone-300 dark:border-stone-700',
    },
    cancelled: {
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      badge: 'bg-red-600 text-white',
      border: 'border-red-300 dark:border-red-800',
    },
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Master Venue Calendar & Occupancy</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Live occupancy schedule across all luxury venues. Select any occupied date to view event specifics.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedBanquet}
            onChange={(e) => setSelectedBanquet(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium"
          >
            <option value="all">All Luxury Venues</option>
            {banquets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium"
          >
            <option value="all">All Booking Statuses</option>
            <option value="confirmed">Confirmed Occupied</option>
            <option value="tentative">Tentative Hold</option>
            <option value="in_progress">Live / In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Occupancy Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Occupied Dates
          </div>
          <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
            {occupiedDatesCount} Days
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
            Active in this month
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Confirmed Bookings
          </div>
          <div className="text-xl font-extrabold text-emerald-800 dark:text-emerald-400 mt-0.5">
            {confirmedOccupiedCount} Events
          </div>
          <div className="text-[10px] text-stone-500">Locked banquet slots</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Tentative Holds
          </div>
          <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">
            {tentativeCount} Events
          </div>
          <div className="text-[10px] text-stone-500">Subject to 48hr release</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Venue Availability
          </div>
          <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
            {Math.max(0, totalDays - occupiedDatesCount)} Days
          </div>
          <div className="text-[10px] text-stone-500">Open for new bookings</div>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-4">
        {/* Month Navigation & Status Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Legend */}
            <div className="hidden md:flex items-center gap-3 text-[11px] text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Confirmed Occupied</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Tentative Hold</span>
              </span>
            </div>

            {/* Prev / Next Month Controls */}
            <div className="flex items-center gap-1 border border-stone-200 dark:border-stone-700 rounded-lg p-0.5">
              <button
                onClick={prevMonth}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 text-center text-xs font-bold uppercase text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800 pb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[100px] p-1 opacity-20 rounded-xl" />
          ))}

          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayEvents = filteredEvents.filter((e) => e.date === dateStr);
            const isToday = dateStr === todayStr;
            const isOccupied = dayEvents.length > 0;

            return (
              <div
                key={dayNum}
                className={`min-h-[105px] sm:min-h-[125px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  isOccupied
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs'
                    : 'border-stone-100 dark:border-stone-800/80 bg-stone-50/40 dark:bg-stone-900/40'
                } ${isToday ? 'ring-2 ring-emerald-600 ring-offset-1 dark:ring-offset-stone-900' : ''}`}
              >
                {/* Date header with Occupancy badge & Daily Quota */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  {isOccupied ? (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white shadow-xs ${
                        selectedBanquet !== 'all' && dayEvents.length >= currentBanquetMaxDaily
                          ? 'bg-red-700'
                          : 'bg-emerald-800'
                      }`}
                    >
                      {selectedBanquet !== 'all'
                        ? (dayEvents.length >= currentBanquetMaxDaily
                            ? `FULL (${dayEvents.length}/${currentBanquetMaxDaily})`
                            : `${dayEvents.length}/${currentBanquetMaxDaily} BOOKED`)
                        : (dayEvents.length > 1 ? `${dayEvents.length} OCCUPIED` : 'OCCUPIED')}
                    </span>
                  ) : (
                    <span className="text-[9px] text-stone-400 font-medium hidden sm:inline">
                      Open
                    </span>
                  )}
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* Day events list */}
                <div className="space-y-1.5 overflow-y-auto max-h-24 scrollbar-none flex-1">
                  {dayEvents.map((evt) => {
                    const style = statusStyles[evt.status] || statusStyles.confirmed;

                    return (
                      <button
                        key={evt.id}
                        onClick={() => onSelectEvent(evt.id)}
                        className={`w-full p-1.5 rounded-lg border text-left text-[10px] font-semibold leading-tight block transition-transform hover:scale-[1.02] shadow-xs ${style.bg} ${style.text} ${style.border}`}
                        title={`${evt.name} - ${evt.banquetName} (${evt.startTime} - ${evt.endTime})`}
                      >
                        <div className="font-bold truncate">{evt.name}</div>
                        <div className="text-[9px] opacity-80 truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                          <span>{evt.banquetName}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
