import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Building2,
  DollarSign,
  MessageCircle,
  CheckSquare,
  CheckCircle2,
  FileText,
  History,
  Phone,
  Mail,
  MapPin,
  Send,
  AlertCircle,
  Plus,
  Share2,
  Download,
  Image as ImageIcon,
  Receipt,
  User,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { EventRecord, ReminderStatus, Attachment } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  generateWhatsAppUrl,
  createBanquetOwnerReminderMessage,
  createVendorReminderMessage,
} from '../utils/formatters';
import { ImageUploadArea } from '../components/common/ImageUploadArea';

interface EventDetailPageProps {
  eventId: string;
  onBack: () => void;
  onOpenRecordPayment?: (eventId: string, clientId: string, balance: number) => void;
  onOpenCreateInvoice?: (eventId: string) => void;
}

type TabType =
  | 'overview'
  | 'checklist'
  | 'vendors'
  | 'financials'
  | 'photos'
  | 'reminders'
  | 'activity';

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  eventId,
  onBack,
  onOpenRecordPayment,
  onOpenCreateInvoice,
}) => {
  const {
    events,
    banquets,
    clients,
    checklistItems,
    activityLogs,
    invoices,
    payments,
    updateEventStatus,
    updateVendorAssignmentStatus,
    toggleChecklistItem,
    addEventPhoto,
  } = useData();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const event = events.find((e) => e.id === eventId);

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Event Not Found</h2>
        <p className="text-xs text-stone-500">
          The requested event record does not exist or may have been deleted.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </button>
      </div>
    );
  }

  const banquet = banquets.find((b) => b.id === event.banquetId);
  const client = clients.find((c) => c.id === event.clientId);
  const tasks = checklistItems[event.id] || [];
  const eventLogs = activityLogs.filter((log) => log.recordId === event.id);
  const eventInvoices = invoices.filter((inv) => inv.eventId === event.id);
  const eventPayments = payments.filter((p) => p.eventId === event.id);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const pct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleToggle = (taskId: string) => {
    const note = taskNotes[taskId];
    toggleChecklistItem(event.id, taskId, note, true);
  };

  const handleSaveNoteOnly = (taskId: string) => {
    const note = taskNotes[taskId];
    if (note !== undefined) {
      toggleChecklistItem(event.id, taskId, note, false);
      setSaveSuccessMsg('Note saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    }
  };

  const handleAddPhotos = (newPhotos: Attachment[]) => {
    // Add any photo that is newly added
    const existingIds = new Set((event.referencePhotos || []).map((p) => p.id));
    const freshlyAdded = newPhotos.filter((p) => !existingIds.has(p.id));
    freshlyAdded.forEach((photo) => {
      addEventPhoto(event.id, photo);
    });
  };

  const handleStatusChange = (newStatus: any) => {
    if (confirm(`Update status of "${event.name}" to ${newStatus}?`)) {
      updateEventStatus(event.id, newStatus);
    }
  };

  const statusBadgeColors: Record<string, string> = {
    confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    in_progress: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    completed: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-300 dark:border-stone-700',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800',
    tentative: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  };

  const tabs: Array<{ id: TabType; label: string; count?: number | string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'checklist', label: 'Ops Checklist', count: `${completedCount}/${tasks.length}` },
    { id: 'vendors', label: 'Vendors & Reminders', count: event.vendorAssignments.length },
    { id: 'financials', label: 'Financials & Invoices', count: eventInvoices.length },
    { id: 'photos', label: 'Photos & Moodboard', count: event.referencePhotos?.length || 0 },
    { id: 'activity', label: 'Activity Logs', count: eventLogs.length },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold w-fit transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Previous View</span>
        </button>

        {/* Quick Actions Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {event.clientWhatsApp && (
            <a
              href={generateWhatsAppUrl(
                event.clientWhatsApp,
                `Hello ${event.clientName}, this is regarding your upcoming event "${event.name}" on ${formatDate(event.date)} at ${event.banquetName}. Let us know if you need any adjustments.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Client</span>
            </a>
          )}

          {onOpenRecordPayment && event.remainingBalance > 0 && (
            <button
              onClick={() => onOpenRecordPayment(event.id, event.clientId, event.remainingBalance)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:opacity-90 shadow-xs"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          {onOpenCreateInvoice && (
            <button
              onClick={() => onOpenCreateInvoice(event.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Create Invoice</span>
            </button>
          )}

          <div className="relative inline-block">
            <select
              value={event.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-bold uppercase rounded-lg px-2.5 py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="tentative">Status: Tentative</option>
              <option value="confirmed">Status: Confirmed</option>
              <option value="in_progress">Status: In Progress</option>
              <option value="completed">Status: Completed</option>
              <option value="cancelled">Status: Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Hero Event Banner */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-700/80 text-emerald-100">
                {event.eventType}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                  statusBadgeColors[event.status] || 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                {event.status}
              </span>
              <span className="text-xs text-stone-300 font-medium">
                Ref ID: {event.id}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              {event.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-300 pt-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">{event.banquetName}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>{formatDate(event.date)}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{event.startTime} - {event.endTime}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{event.guestCount} Guests</span>
              </div>
            </div>
          </div>

          {/* Financial pill summary on Hero */}
          <div className="bg-stone-900/80 backdrop-blur-md p-4 rounded-2xl border border-stone-700/60 flex flex-col gap-2 min-w-[200px]">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400">Quoted:</span>
              <span className="font-bold text-stone-100">{formatCurrency(event.finalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400">Received:</span>
              <span className="font-bold text-emerald-400">{formatCurrency(event.advanceReceived)}</span>
            </div>
            <div className="pt-1 border-t border-stone-700 flex justify-between items-center text-xs">
              <span className="text-stone-300 font-semibold">Remaining:</span>
              <span className="font-extrabold text-amber-400">{formatCurrency(event.remainingBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Navigation Tabs Strip */}
      <div className="border-b border-stone-200 dark:border-stone-800 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 min-w-max pb-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive
                        ? 'bg-emerald-900/90 text-emerald-200'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT PANELS */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Setup specifications */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                Event Requirements & Floor Setup
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed bg-stone-50 dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200 dark:border-stone-700/60">
                {event.requirements || 'No specific decor requirements specified.'}
              </p>

              {event.specialInstructions && (
                <div className="space-y-1.5 pt-2">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Special VIP & Gate Instructions</span>
                  </h4>
                  <p className="text-xs text-stone-700 dark:text-stone-300 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40">
                    {event.specialInstructions}
                  </p>
                </div>
              )}
            </div>

            {/* Checklist Preview Box */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Operational Checklist Progress
                  </h3>
                  <p className="text-xs text-stone-500">
                    {completedCount} of {tasks.length} inspection tasks verified
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('checklist')}
                  className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline"
                >
                  Manage Checklist →
                </button>
              </div>

              <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="space-y-2 pt-2">
                {tasks.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleToggle(t.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                          t.status === 'completed'
                            ? 'bg-emerald-700 text-white'
                            : 'border border-stone-400 dark:border-stone-600'
                        }`}
                      >
                        {t.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span
                        className={`text-xs ${
                          t.status === 'completed'
                            ? 'line-through text-stone-400'
                            : 'font-medium text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-stone-500 uppercase px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
                      {t.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Client & Personnel */}
          <div className="space-y-6">
            {/* Client Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Client Profile
              </h3>
              <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                {event.clientName}
              </div>
              <div className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <a href={`tel:${event.clientPhone}`} className="hover:text-emerald-700">
                    {event.clientPhone}
                  </a>
                </div>
                {event.clientWhatsApp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <a
                      href={generateWhatsAppUrl(event.clientWhatsApp, `Hello ${event.clientName}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
                    >
                      {event.clientWhatsApp} (WhatsApp)
                    </a>
                  </div>
                )}
                {client?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client?.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{client.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Personnel Assigned */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Staff & Operations Assignment
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[11px] text-stone-500 block">Lead Salesperson:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {event.salespersonName || 'Unassigned'}
                  </span>
                </div>
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                  <span className="text-[11px] text-stone-500 block">Operations Manager:</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-400">
                    {event.managerName || 'Unassigned (Admin Supervising)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Banquet Property Owner */}
            {banquet && (
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Banquet Property Trustee
                </h3>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-stone-900 dark:text-stone-100">{banquet.name}</div>
                  <div className="text-stone-600 dark:text-stone-400">Owner: {banquet.ownerName}</div>
                  <div className="flex items-center gap-2 pt-1 text-emerald-700 dark:text-emerald-400">
                    <Phone className="w-3.5 h-3.5" />
                    <a href={`tel:${banquet.ownerPhone}`}>{banquet.ownerPhone}</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. OPS CHECKLIST TAB */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Operational Quality & Readiness Checklist
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Managers verify banquet setup, HVAC cooling, AV testing, and catering standards.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {completedCount} / {tasks.length} Completed ({pct}%)
              </span>
              <div className="w-28 h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs text-stone-500">
                No checklist tasks initialized for this event yet.
              </div>
            ) : (
              tasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isDone
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggle(task.id)}
                          className={`mt-0.5 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 min-h-[44px] min-w-[44px] ${
                            isDone
                              ? 'bg-emerald-700 border-emerald-700 text-white shadow-xs'
                              : 'border-stone-400 dark:border-stone-500 hover:border-emerald-700 bg-white dark:bg-stone-800 text-transparent'
                          }`}
                          aria-label={`Mark ${task.title} as ${isDone ? 'pending' : 'completed'}`}
                        >
                          <CheckCircle2 className={`w-5 h-5 ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                        </button>

                        <div>
                          <h4
                            className={`text-sm font-bold ${
                              isDone
                                ? 'line-through text-stone-400 dark:text-stone-500'
                                : 'text-stone-900 dark:text-stone-100'
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                              {task.description}
                            </p>
                          )}
                          {isDone && task.completedByName && (
                            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 mt-1 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified by {task.completedByName} on {formatDateTime(task.completedAt || '')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0">
                        {task.category}
                      </span>
                    </div>

                    {/* Operational Notes Entry */}
                    <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add manager inspection notes..."
                        value={taskNotes[task.id] !== undefined ? taskNotes[task.id] : task.notes || ''}
                        onChange={(e) =>
                          setTaskNotes({ ...taskNotes, [task.id]: e.target.value })
                        }
                        className="flex-1 text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNoteOnly(task.id)}
                        className="px-3 py-2 text-xs font-semibold rounded-lg bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 hover:opacity-90 transition-opacity"
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
      )}

      {/* 3. VENDORS & REMINDERS TAB */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Vendor Coordination & WhatsApp Reminders
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Send pre-formatted WhatsApp reminders with hall timings, setup requirements, and contact statuses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.vendorAssignments.map((va) => {
              const msg = createVendorReminderMessage({
                vendorContactPerson: va.vendorName,
                vendorBusinessName: va.vendorName,
                category: va.category,
                banquetName: event.banquetName,
                eventName: event.name,
                date: formatDate(event.date),
                startTime: event.startTime,
                endTime: event.endTime,
                requirements: va.requirements,
              });

              return (
                <div
                  key={va.id}
                  className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {va.category}
                      </span>
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {formatCurrency(va.quotedAmount)}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {va.vendorName}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      <strong>Requirements:</strong> {va.requirements || 'Standard event specs'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
                    <select
                      value={va.contactStatus}
                      onChange={(e) =>
                        updateVendorAssignmentStatus(
                          event.id,
                          va.id,
                          e.target.value as ReminderStatus
                        )
                      }
                      className="text-xs font-semibold rounded-lg px-2 py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
                    >
                      <option value="not_contacted">Not Contacted</option>
                      <option value="contacted">Contacted</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="followup_required">Follow-up Req</option>
                    </select>

                    <a
                      href={generateWhatsAppUrl(va.vendorWhatsApp || va.vendorPhone, msg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. FINANCIALS & INVOICES TAB */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-xs text-stone-500 font-medium">Final Quoted Amount</span>
              <div className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                {formatCurrency(event.finalAmount)}
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">
                Gross: {formatCurrency(event.quotedAmount)} (Discount: {formatCurrency(event.discount)})
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-xs text-stone-500 font-medium">Advance Payments Received</span>
              <div className="text-xl font-bold text-emerald-800 dark:text-emerald-400 mt-1">
                {formatCurrency(event.advanceReceived)}
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">
                {eventPayments.length} recorded payments
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-xs text-stone-500 font-medium">Outstanding Balance</span>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                {formatCurrency(event.remainingBalance)}
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">
                {event.remainingBalance <= 0 ? 'Fully Cleared' : 'Payment Pending'}
              </div>
            </div>
          </div>

          {/* Linked Invoices Section */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Invoices Linked to Event ({eventInvoices.length})
              </h3>
              {onOpenCreateInvoice && (
                <button
                  onClick={() => onOpenCreateInvoice(event.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 text-white hover:bg-emerald-900"
                >
                  + Generate New Invoice
                </button>
              )}
            </div>

            {eventInvoices.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No invoices issued for this event yet.</p>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {eventInvoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100">{inv.invoiceNumber}</div>
                      <div className="text-stone-500 text-[11px]">Issued {formatDate(inv.invoiceDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{formatCurrency(inv.finalTotal)}</div>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PHOTOS & MOODBOARD TAB */}
      {activeTab === 'photos' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-6">
          <ImageUploadArea
            label="Event Photos, Moodboard & Evidence Gallery"
            description="Upload stage designs, floral concepts, banquet floorplans, and on-site completion verification photos."
            attachments={event.referencePhotos || []}
            onChange={handleAddPhotos}
            maxPhotos={20}
          />
        </div>
      )}

      {/* 6. ACTIVITY LOGS TAB */}
      {activeTab === 'activity' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
            Event Audit Trail & Operational Timeline
          </h3>

          <div className="space-y-3">
            {eventLogs.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No recorded activity logs for this event.</p>
            ) : (
              eventLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 dark:text-stone-100">{log.action}</span>
                    <span className="text-[11px] text-stone-500">{formatDateTime(log.timestamp)}</span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-400">{log.details}</p>
                  <div className="text-[10px] text-stone-500 font-medium">
                    By {log.actorName} ({log.actorRole})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
