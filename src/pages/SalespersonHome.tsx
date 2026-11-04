import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays,
  PlusCircle,
  Inbox,
  CalendarCheck2,
  Receipt,
  UserPlus,
  Clock,
  ArrowRight,
  Truck,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Phone,
  Target,
  Award,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { SalespersonTab } from '../components/common/SalespersonBottomNav';

interface SalespersonHomeProps {
  setActiveTab: (tab: SalespersonTab) => void;
  onOpenDirectSale: () => void;
  onOpenAddLead: () => void;
  onOpenInvoiceModal: () => void;
  onSelectEvent: (eventId: string) => void;
}

export const SalespersonHome: React.FC<SalespersonHomeProps> = ({
  setActiveTab,
  onOpenDirectSale,
  onOpenAddLead,
  onOpenInvoiceModal,
  onSelectEvent,
}) => {
  const { events, leads, sales, banquets, targets } = useData();
  const { currentUser } = useAuth();

  const today = new Date().toISOString().split('T')[0];

  // Match target for this salesperson
  const myTarget = targets.find(
    (t) =>
      t.salespersonId === currentUser?.uid ||
      t.salespersonEmail?.toLowerCase() === currentUser?.email?.toLowerCase()
  );

  // Salesperson-relevant data & live achieved bookings count
  const mySales = sales.filter((s) => s.salespersonId === currentUser?.uid || (!s.salespersonId && true));
  const matchingSales = myTarget?.periodType === 'daily'
    ? mySales.filter((s) => s.saleDate === myTarget.periodValue || s.createdAt?.startsWith(myTarget.periodValue))
    : mySales;
  const myDealsCount = matchingSales.length;
  const targetBookingsGoal = myTarget?.targetBookings || 1;

  const targetPercentage = myTarget && targetBookingsGoal > 0
    ? Math.round((myDealsCount / targetBookingsGoal) * 100)
    : 0;
  const remainingBookings = myTarget ? Math.max(0, targetBookingsGoal - myDealsCount) : 0;

  const myEvents = events.filter((e) => e.salespersonId === currentUser?.uid || true);
  const todaysEvents = myEvents.filter((e) => e.date === today && e.status !== 'cancelled');
  const upcomingEvents = myEvents
    .filter((e) => e.date > today && e.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const activeLeads = leads.filter((l) => l.status === 'active');
  const followUpsDueToday = activeLeads.filter((l) => l.followUpDate <= today);

  const recentDirectSales = sales.slice(0, 3);

  return (
    <div className="space-y-5 pb-24 max-w-2xl mx-auto px-1 sm:px-4">
      {/* Mobile Header Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-stone-900 to-emerald-950 text-white shadow-md border border-stone-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sales Concierge</span>
          </div>
          <span className="text-[11px] font-medium text-stone-400">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>

        <h1 className="text-xl font-extrabold tracking-tight">
          Hi, {currentUser?.fullName?.split(' ')[0] || 'Sales Executive'}
        </h1>
        <p className="text-xs text-stone-300 mt-0.5">
          {todaysEvents.length} event today · {followUpsDueToday.length} follow-ups due
        </p>

        {/* Quick Actions Horizontal Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
          <button
            onClick={onOpenDirectSale}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-transform active:scale-95 min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Direct Sale</span>
          </button>

          <button
            onClick={onOpenAddLead}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 min-h-[44px]"
          >
            <Inbox className="w-4 h-4" />
            <span>Add Lead</span>
          </button>

          <button
            onClick={() => setActiveTab('availability')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 min-h-[44px]"
          >
            <CalendarDays className="w-4 h-4" />
            <span>Availability</span>
          </button>

          <button
            onClick={onOpenInvoiceModal}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 min-h-[44px]"
          >
            <Receipt className="w-4 h-4" />
            <span>Invoice</span>
          </button>
        </div>
      </div>

      {/* ASSIGNED SALES TARGET CARD */}
      {myTarget && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <span>My Booking Target</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                    {myTarget.periodType === 'daily' ? `Daily: ${myTarget.periodValue}` : `Monthly: ${myTarget.periodValue}`}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500">
                  Target assigned by Administrator
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-base font-extrabold text-emerald-800 dark:text-emerald-400">
                {targetPercentage}%
              </div>
              <div className="text-[10px] text-stone-500 font-medium">Achieved</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  targetPercentage >= 100
                    ? 'bg-emerald-500'
                    : targetPercentage >= 60
                    ? 'bg-sky-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, targetPercentage)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {myDealsCount} / {targetBookingsGoal} Bookings Closed
              </span>
              <span className="text-stone-500">
                Quota: {targetBookingsGoal} Booking{targetBookingsGoal === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Deals count & pacing note */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
            <span>
              Pacing: <strong>{targetPercentage >= 100 ? 'Goal Exceeded' : `${targetPercentage}% achieved`}</strong>
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {remainingBookings > 0
                ? `${remainingBookings} more booking${remainingBookings === 1 ? '' : 's'} to goal`
                : 'Target Achieved! 🎉'}
            </span>
          </div>

          {myTarget.notes && (
            <div className="text-[11px] text-stone-600 dark:text-stone-400 italic bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-lg border border-stone-100 dark:border-stone-800/60">
              "{myTarget.notes}"
            </div>
          )}
        </div>
      )}

      {/* TODAY'S EVENTS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Today's Events ({todaysEvents.length})
          </h2>
          {todaysEvents.length > 0 && (
            <button
              onClick={() => setActiveTab('events')}
              className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold"
            >
              See all
            </button>
          )}
        </div>

        {todaysEvents.length === 0 ? (
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-center text-xs text-stone-500 space-y-2">
            <p>No events scheduled for today.</p>
            <button
              onClick={onOpenDirectSale}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Direct Sale</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todaysEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt.id)}
                className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-800 text-white">
                    {evt.eventType}
                  </span>
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    {evt.startTime} - {evt.endTime}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">{evt.name}</h3>
                <div className="text-xs text-stone-600 dark:text-stone-400 mt-1 flex items-center justify-between">
                  <span>{evt.banquetName}</span>
                  <span className="font-bold">{evt.guestCount} Pax</span>
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold">
                  <span>{evt.vendorAssignments?.length || 0} Vendors Assigned</span>
                  <span>View Details & Reminders →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOLLOW-UPS DUE TODAY ALERT */}
      {followUpsDueToday.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>{followUpsDueToday.length} Follow-ups Due Today</span>
            </span>
            <button
              onClick={() => setActiveTab('leads')}
              className="text-xs font-semibold text-amber-900 dark:text-amber-300 hover:underline"
            >
              Follow Up Now
            </button>
          </div>
          <div className="space-y-1.5">
            {followUpsDueToday.slice(0, 2).map((l) => (
              <div
                key={l.id}
                className="p-2.5 rounded-lg bg-white/80 dark:bg-stone-900/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100">{l.clientName}</div>
                  <div className="text-[11px] text-stone-500">
                    {l.eventType} · Expected {formatDate(l.expectedEventDate)}
                  </div>
                </div>
                <a
                  href={`tel:${l.phone}`}
                  className="px-2.5 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPCOMING BOOKINGS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Upcoming Bookings
          </h2>
          <button
            onClick={() => setActiveTab('events')}
            className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold"
          >
            View all
          </button>
        </div>

        <div className="space-y-2">
          {upcomingEvents.length === 0 ? (
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-center text-xs text-stone-500 space-y-2">
              <p>No upcoming events booked yet.</p>
              <button
                onClick={onOpenDirectSale}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Book Direct Sale Event</span>
              </button>
            </div>
          ) : (
            upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt.id)}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex items-center justify-between hover:border-emerald-600 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="font-bold text-xs text-stone-900 dark:text-stone-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                    {evt.name}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {formatDate(evt.date)} · {evt.banquetName} · {evt.guestCount} Pax
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <span>{evt.vendorAssignments?.length || 0} Vendors Assigned · Tap for WhatsApp Reminders →</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
                    {evt.finalAmount > 0 ? formatCurrency(evt.finalAmount) : 'Price Optional'}
                  </div>
                  {evt.remainingBalance > 0 && (
                    <div className="text-[10px] text-amber-700 font-semibold">
                      Bal: {formatCurrency(evt.remainingBalance)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ACTIVE LEADS SUMMARY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Active Leads ({activeLeads.length})
          </h2>
          <button
            onClick={() => setActiveTab('leads')}
            className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-1"
          >
            <span>Open Leads</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {activeLeads.slice(0, 3).map((l) => (
            <div
              key={l.id}
              className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-stone-900 dark:text-stone-100">{l.clientName}</div>
                <div className="text-[11px] text-stone-500">
                  {l.eventType} · {l.expectedGuestCount} Pax · Source: {l.leadSource}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-stone-400">Next Follow-up</div>
                <div className="font-bold text-stone-800 dark:text-stone-200">
                  {formatDate(l.followUpDate)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
