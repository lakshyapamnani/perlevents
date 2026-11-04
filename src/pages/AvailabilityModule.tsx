import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  CalendarDays,
  Building2,
  Clock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/formatters';
import { BookingStatus } from '../types';

interface AvailabilityModuleProps {
  onOpenDirectSaleWithSlot: (banquetId: string, date: string) => void;
  onSelectEvent: (eventId: string) => void;
}

export const AvailabilityModule: React.FC<AvailabilityModuleProps> = ({
  onOpenDirectSaleWithSlot,
  onSelectEvent,
}) => {
  const { banquets, bookingSlots, events, settings } = useData();

  const [selectedBanquetId, setSelectedBanquetId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const setupBuffer = settings.defaultSetupBufferMinutes || 60;
  const cleanupBuffer = settings.defaultCleanupBufferMinutes || 60;

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Banquet daily limit calculations
  const currentBanquet = banquets.find((b) => b.id === selectedBanquetId);
  const maxDailyLimit = currentBanquet?.maxBookingsPerDay || 2;

  // Filter slots for the selected date
  const slotsOnDate = bookingSlots.filter((slot) => {
    const matchDate = slot.date === selectedDate;
    const matchBanquet = selectedBanquetId === 'all' || slot.banquetId === selectedBanquetId;
    return matchDate && matchBanquet && slot.status !== 'cancelled';
  });

  const isSelectedBanquetFull = selectedBanquetId !== 'all' && slotsOnDate.length >= maxDailyLimit;

  // Calculate day-by-day availability status for the calendar grid
  const getDayDetails = (dayNum: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const daySlots = bookingSlots.filter((s) => {
      const matchDate = s.date === dateStr;
      const matchBanquet = selectedBanquetId === 'all' || s.banquetId === selectedBanquetId;
      return matchDate && matchBanquet && s.status !== 'cancelled';
    });

    const isFull = selectedBanquetId !== 'all' && daySlots.length >= maxDailyLimit;
    let status: 'available' | 'tentative' | 'booked' | 'full' = 'available';
    if (isFull) {
      status = 'full';
    } else if (daySlots.some((s) => s.status === 'confirmed')) {
      status = 'booked';
    } else if (daySlots.length > 0) {
      status = 'tentative';
    }

    return { status, count: daySlots.length };
  };

  const statusBadgeConfig: Record<BookingStatus, { label: string; bg: string; text: string }> = {
    tentative: { label: 'Tentative Hold', bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-800 dark:text-amber-300' },
    confirmed: { label: 'Confirmed', bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-800 dark:text-emerald-300' },
    in_progress: { label: 'In Progress', bg: 'bg-sky-100 dark:bg-sky-950', text: 'text-sky-800 dark:text-sky-300' },
    completed: { label: 'Completed', bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-300' },
    cancelled: { label: 'Cancelled (Released)', bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' },
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Banquet Availability & Concurrency Guard</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Real-time multi-hall availability calculation with automatic setup ({setupBuffer}m) and cleanup ({cleanupBuffer}m) buffer enforcement.
          </p>
        </div>

        {/* Hall Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-stone-500" />
          <select
            value={selectedBanquetId}
            onChange={(e) => setSelectedBanquetId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 w-full sm:w-auto"
          >
            <option value="all">All Banquet Halls (Consolidated)</option>
            {banquets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (Cap: {b.capacity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Slot Details & Quick Booking on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Month View Calendar (7 Cols on desktop) */}
        <div className="lg:col-span-7 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100">
              {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase text-stone-600 dark:text-stone-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1.5 text-xs">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="p-2" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDate;
              const { status, count } = getDayDetails(dayNum);

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`p-2 rounded-xl text-center flex flex-col items-center justify-center min-h-[52px] transition-all relative ${
                    isSelected
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold shadow-md'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <span className="text-xs">{dayNum}</span>
                  {status === 'full' && (
                    <span className="text-[9px] font-black text-red-600 dark:text-red-400 mt-0.5">FULL</span>
                  )}
                  {status === 'booked' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                  )}
                  {status === 'tentative' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" />
                  )}
                  {status === 'available' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 mt-1" />
                  )}
                  {selectedBanquetId !== 'all' && count > 0 && status !== 'full' && (
                    <span className="text-[8px] font-bold text-stone-500 dark:text-stone-400 mt-0.5">
                      {count}/{maxDailyLimit}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-700" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Tentative Hold</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Confirmed Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Daily Limit Full</span>
            </div>
          </div>
        </div>

        {/* Selected Date Schedule & Booking Action (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-stone-600 dark:text-stone-400">
                    Selected Date Schedule
                  </span>
                  {selectedBanquetId !== 'all' && (
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        isSelectedBanquetFull
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {slotsOnDate.length} / {maxDailyLimit} Used
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  {formatDate(selectedDate)}
                </h3>
                {selectedBanquetId !== 'all' && isSelectedBanquetFull && (
                  <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-0.5">
                    Daily limit reached (Max {maxDailyLimit}/day).
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  onOpenDirectSaleWithSlot(
                    selectedBanquetId === 'all' ? banquets[0]?.id || '' : selectedBanquetId,
                    selectedDate
                  )
                }
                disabled={isSelectedBanquetFull}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors ${
                  isSelectedBanquetFull
                    ? 'bg-stone-200 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                }`}
                title={isSelectedBanquetFull ? `Daily limit reached for this venue` : 'Book this slot'}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isSelectedBanquetFull ? 'Limit Reached' : 'Book This Slot'}</span>
              </button>
            </div>

            {slotsOnDate.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-600 dark:text-stone-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-semibold text-stone-800 dark:text-stone-200">
                  No bookings scheduled on this date
                </div>
                <p className="text-[11px]">
                  All time slots are fully available for{' '}
                  {selectedBanquetId === 'all'
                    ? 'all banquet halls'
                    : banquets.find((b) => b.id === selectedBanquetId)?.name}
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {slotsOnDate.map((slot) => {
                  const bq = banquets.find((b) => b.id === slot.banquetId);
                  const badge = statusBadgeConfig[slot.status] || statusBadgeConfig.confirmed;
                  return (
                    <div
                      key={slot.id}
                      onClick={() => onSelectEvent(slot.eventId)}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-600 cursor-pointer transition-colors space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {slot.eventName}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div className="text-[11px] text-stone-600 dark:text-stone-400 flex items-center justify-between">
                        <span>{bq?.name}</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>

                      <div className="text-[10px] text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>
                          Locked buffer: {slot.bufferStartTime} to {slot.bufferEndTime}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
