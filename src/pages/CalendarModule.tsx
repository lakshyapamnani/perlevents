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
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { BookingStatus, EventRecord } from '../types';

interface CalendarModuleProps {
  onSelectEvent: (eventId: string) => void;
}

export const CalendarModule: React.FC<CalendarModuleProps> = ({ onSelectEvent }) => {
  const { events, banquets } = useData();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedBanquet, setSelectedBanquet] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const filteredEvents = events.filter((e) => {
    const matchBanquet = selectedBanquet === 'all' || e.banquetId === selectedBanquet;
    const matchStatus = selectedStatus === 'all' || e.status === selectedStatus;
    return matchBanquet && matchStatus;
  });

  const statusStyles: Record<BookingStatus, { bg: string; text: string; dot: string }> = {
    tentative: { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
    confirmed: { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
    in_progress: { bg: 'bg-sky-100 dark:bg-sky-950/60', text: 'text-sky-800 dark:text-sky-300', dot: 'bg-sky-500' },
    completed: { bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-300', dot: 'bg-stone-500' },
    cancelled: { bg: 'bg-red-100 dark:bg-red-950/60', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Master Event Calendar</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Interactive schedule across all banquet venues with real-time status distinctions.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedBanquet}
            onChange={(e) => setSelectedBanquet(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          >
            <option value="all">All Banquets</option>
            {banquets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="tentative">Tentative Hold</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 text-center text-xs font-bold uppercase text-stone-600 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800 pb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[90px] p-1 opacity-20" />
          ))}

          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayEvents = filteredEvents.filter((e) => e.date === dateStr);

            return (
              <div
                key={dayNum}
                className="min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-xl border border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-800/20 flex flex-col justify-between"
              >
                <div className="text-right text-xs font-bold text-stone-700 dark:text-stone-300">
                  {dayNum}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-20">
                  {dayEvents.map((evt) => {
                    const style = statusStyles[evt.status] || statusStyles.confirmed;
                    return (
                      <button
                        key={evt.id}
                        onClick={() => onSelectEvent(evt.id)}
                        className={`w-full p-1 rounded text-left text-[10px] font-semibold leading-tight truncate block transition-transform hover:scale-[1.02] ${style.bg} ${style.text}`}
                        title={`${evt.name} (${evt.banquetName}, ${evt.startTime}-${evt.endTime})`}
                      >
                        {evt.name}
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
