import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  Users,
  CheckSquare,
  AlertCircle,
  Truck,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { formatDate, formatDateTime, generateWhatsAppUrl, createVendorReminderMessage } from '../utils/formatters';

interface ManagerDashboardProps {
  onSelectEvent: (eventId: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onSelectEvent }) => {
  const { events, checklistItems, toggleChecklistItem, updateVendorAssignmentStatus } = useData();
  const { currentUser } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});

  // Filter events assigned to this manager (or all if admin or no specific manager set)
  const assignedEvents = events.filter(
    (e) => !e.managerId || e.managerId === currentUser?.uid || currentUser?.role === 'admin'
  );

  const activeEventId = selectedEventId || assignedEvents[0]?.id || '';
  const currentEvent = events.find((e) => e.id === activeEventId);
  const currentTasks = checklistItems[activeEventId] || [];
  const currentVendors = Array.isArray(currentEvent?.vendorAssignments) ? currentEvent.vendorAssignments : [];

  const completedCount = currentTasks.filter((t) => t.status === 'completed').length;
  const percentComplete =
    currentTasks.length > 0 ? Math.round((completedCount / currentTasks.length) * 100) : 0;

  const handleToggle = (taskId: string) => {
    if (!currentEvent) return;
    const note = taskNotes[taskId];
    toggleChecklistItem(currentEvent.id, taskId, note, true);
  };

  const handleSaveNote = (taskId: string) => {
    if (!currentEvent) return;
    const note = taskNotes[taskId];
    if (note !== undefined) {
      toggleChecklistItem(currentEvent.id, taskId, note, false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-stone-900 to-sky-950 text-white shadow-sm border border-stone-800">
        <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <ClipboardCheck className="w-4 h-4" />
          <span>Operational Execution Console</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Operations Manager: {currentUser?.fullName}
        </h1>
        <p className="text-xs text-stone-300 mt-1">
          Event Day Execution, Vendor Readiness & Quality Inspection Checklists.
        </p>
      </div>

      {/* Event Selector Strip */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Assigned Events ({assignedEvents.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {assignedEvents.map((evt) => {
            const tasks = checklistItems[evt.id] || [];
            const done = tasks.filter((t) => t.status === 'completed').length;
            const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
            const isSelected = evt.id === activeEventId;

            return (
              <div
                key={evt.id}
                onClick={() => setSelectedEventId(evt.id)}
                className={`group p-4 rounded-2xl border text-left transition-all cursor-pointer bg-white dark:bg-stone-900 hover:shadow-lg active:scale-[0.99] flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm bg-emerald-50/10'
                    : 'border-stone-200 dark:border-stone-800 hover:border-emerald-600 dark:hover:border-emerald-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {evt.eventType}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">{formatDate(evt.date)}</span>
                  </div>
                  <div className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {evt.name}
                  </div>
                  <div className="text-xs text-stone-500 truncate mt-0.5">
                    {evt.banquetName} · {evt.startTime} - {evt.endTime}
                  </div>
                </div>

                {/* Progress bar & open link */}
                <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                    <span>Checklist Readiness</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {done}/{tasks.length} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(evt.id);
                    }}
                    className="mt-2 block w-full text-right text-[11px] font-bold text-emerald-800 dark:text-emerald-400 hover:underline"
                  >
                    Open Dedicated Events Page →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Event Workspace */}
      {currentEvent ? (
        <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Active Event Execution
              </span>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {currentEvent.name}
              </h2>
              <div className="text-xs text-stone-500 flex flex-wrap gap-2 mt-0.5">
                <span>{currentEvent.banquetName}</span>
                <span>·</span>
                <span>{formatDate(currentEvent.date)}</span>
                <span>·</span>
                <span>
                  {currentEvent.startTime} - {currentEvent.endTime}
                </span>
                <span>·</span>
                <span>{currentEvent.guestCount} Guests</span>
              </div>
            </div>

            <button
              onClick={() => onSelectEvent(currentEvent.id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              Full Event Details
            </button>
          </div>

          {/* Assigned Vendors & WhatsApp Coordination Panel */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  Assigned Service Vendors & WhatsApp Coordination ({currentVendors.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectEvent(currentEvent.id)}
                className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold hover:underline"
              >
                + Assign Vendor →
              </button>
            </div>

            {currentVendors.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500 bg-white dark:bg-stone-900 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                No vendors currently assigned for this event.{' '}
                <button
                  type="button"
                  onClick={() => onSelectEvent(currentEvent.id)}
                  className="font-bold text-emerald-800 dark:text-emerald-400 underline ml-1"
                >
                  Assign Vendors on Event Page
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentVendors.map((va) => {
                  const msg = createVendorReminderMessage({
                    vendorContactPerson: va.vendorName,
                    vendorBusinessName: va.vendorName,
                    category: va.category,
                    banquetName: currentEvent.banquetName,
                    eventName: currentEvent.name,
                    date: formatDate(currentEvent.date),
                    startTime: currentEvent.startTime,
                    endTime: currentEvent.endTime,
                    requirements: va.requirements || currentEvent.requirements,
                  });
                  const waUrl = generateWhatsAppUrl(va.vendorWhatsApp || va.vendorPhone, msg);
                  const isContacted = va.contactStatus === 'contacted' || va.contactStatus === 'confirmed';

                  return (
                    <div
                      key={va.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isContacted
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                            {va.category}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              va.contactStatus === 'confirmed'
                                ? 'bg-emerald-700 text-white'
                                : va.contactStatus === 'contacted'
                                ? 'bg-sky-600 text-white'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {isContacted ? '✓ ' + va.contactStatus.replace('_', ' ') : 'Pending Contact'}
                          </span>
                        </div>

                        <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                          {va.vendorName}
                        </div>
                        {va.vendorPhone && (
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            📞 {va.vendorPhone}
                          </div>
                        )}
                        {va.requirements && (
                          <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 bg-stone-50 dark:bg-stone-800/50 p-1.5 rounded-lg border border-stone-100 dark:border-stone-800">
                            <strong>Scope:</strong> {va.requirements}
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 mt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isContacted}
                            onChange={(e) => {
                              updateVendorAssignmentStatus(
                                currentEvent.id,
                                va.id,
                                e.target.checked ? 'contacted' : 'not_contacted'
                              );
                            }}
                            className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                          />
                          <span>Contacted</span>
                        </label>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (!isContacted) {
                              updateVendorAssignmentStatus(currentEvent.id, va.id, 'contacted');
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Touch-Friendly Tasks List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Operational Quality & Readiness Checklist
            </h3>
            {currentTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                No checklist tasks initialized for this event.
              </div>
            ) : (
              currentTasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <button
                          onClick={() => handleToggle(task.id)}
                          className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] ${
                            isDone
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'border-stone-400 dark:border-stone-500 hover:border-emerald-600 bg-white dark:bg-stone-900'
                          }`}
                          aria-label={`Mark ${task.title} as ${isDone ? 'incomplete' : 'complete'}`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <CheckSquare className="w-5 h-5 text-transparent" />
                          )}
                        </button>

                        <div>
                          <h3
                            className={`text-sm font-bold ${
                              isDone
                                ? 'line-through text-stone-500 dark:text-stone-400'
                                : 'text-stone-900 dark:text-stone-100'
                            }`}
                          >
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                              {task.description}
                            </p>
                          )}
                          {isDone && task.completedByName && (
                            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 mt-1">
                              ✓ Verified by {task.completedByName} on{' '}
                              {formatDateTime(task.completedAt || '')}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 shrink-0">
                        {task.category}
                      </span>
                    </div>

                    {/* Operational completion notes */}
                    <div className="mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add manager verification notes..."
                        value={taskNotes[task.id] || task.notes || ''}
                        onChange={(e) =>
                          setTaskNotes({ ...taskNotes, [task.id]: e.target.value })
                        }
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNote(task.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 hover:opacity-90 transition-opacity"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-stone-500 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200">
          No events currently assigned.
        </div>
      )}
    </div>
  );
};
