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
  Trash2,
  X,
  Pencil,
  Save,
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
    vendors,
    vendorCategories,
    updateEventStatus,
    updateVendorAssignmentStatus,
    addVendorToEvent,
    removeVendorFromEvent,
    toggleChecklistItem,
    addEventPhoto,
    updateEventDetails,
  } = useData();
  const { currentUser, allUsersList: users } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Edit Venue & Personnel Reassignment State
  const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] = useState(false);
  const [editBanquetId, setEditBanquetId] = useState('');
  const [editSalespersonId, setEditSalespersonId] = useState('');
  const [editManagerId, setEditManagerId] = useState('');

  // Vendor Assignment State
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [newVendorId, setNewVendorId] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorCategory, setNewVendorCategory] = useState('Decoration');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorRequirements, setNewVendorRequirements] = useState('');
  const [newVendorQuoted, setNewVendorQuoted] = useState<number | ''>('');

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
  const vendorAssignments = Array.isArray(event.vendorAssignments) ? event.vendorAssignments : [];

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

  const handleOpenEditAssignment = () => {
    setEditBanquetId(event.banquetId);
    setEditSalespersonId(event.salespersonId || '');
    setEditManagerId(event.managerId || '');
    setIsEditAssignmentModalOpen(true);
  };

  const handleSaveAssignment = () => {
    const res = updateEventDetails(event.id, {
      banquetId: editBanquetId,
      salespersonId: editSalespersonId,
      managerId: editManagerId,
    });
    if (res.success) {
      setIsEditAssignmentModalOpen(false);
      setSaveSuccessMsg('Banquet venue and personnel assignments updated successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } else {
      alert(res.error || 'Failed to update assignment.');
    }
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

  const isSalesperson = currentUser?.role === 'salesperson';

  const tabs: Array<{ id: TabType; label: string; count?: number | string }> = [
    { id: 'overview', label: 'Overview' },
    ...(!isSalesperson
      ? [{ id: 'checklist' as TabType, label: 'Ops Checklist', count: `${completedCount}/${tasks.length}` }]
      : []),
    { id: 'vendors', label: 'Vendors & Reminders', count: vendorAssignments.length },
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

          {currentUser?.role === 'admin' && (
            <button
              onClick={handleOpenEditAssignment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold"
              title="Change banquet venue or assigned personnel"
            >
              <Pencil className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Change Venue / Salesperson</span>
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
                className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusBadgeColors[event.status] || 'bg-stone-800 text-stone-300 border-stone-700'
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
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isActive
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive
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

            {/* Salesperson: Vendor Reminders Dispatch Box; Others: Operational Checklist */}
            {isSalesperson ? (
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                      <span>Vendor Reminders & WhatsApp Dispatch</span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      {vendorAssignments.length} vendors assigned · Send 1-click WhatsApp reminders & mark status
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('vendors')}
                    className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline"
                  >
                    Manage All Vendors →
                  </button>
                </div>

                {vendorAssignments.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
                    <span>No vendors assigned yet. </span>
                    <button
                      onClick={() => setIsAddVendorModalOpen(true)}
                      className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
                    >
                      + Assign Vendor
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    {vendorAssignments.slice(0, 4).map((va) => {
                      const msg = createVendorReminderMessage({
                        vendorContactPerson: va.vendorName,
                        vendorBusinessName: va.vendorName,
                        category: va.category,
                        banquetName: event.banquetName,
                        eventName: event.name,
                        date: event.date,
                        startTime: event.startTime,
                        endTime: event.endTime,
                        requirements: va.requirements || event.requirements,
                      });
                      const waUrl = generateWhatsAppUrl(va.vendorWhatsApp || va.vendorPhone, msg);
                      const isReminderSent = va.contactStatus === 'contacted' || va.contactStatus === 'confirmed';

                      return (
                        <div
                          key={va.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isReminderSent}
                              onChange={(e) => {
                                updateVendorAssignmentStatus(
                                  event.id,
                                  va.id,
                                  e.target.checked ? 'contacted' : 'not_contacted'
                                );
                              }}
                              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                              title="Mark reminder sent"
                            />
                            <div>
                              <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                <span>{va.vendorName}</span>
                                <span className="text-[10px] font-semibold text-stone-500 uppercase px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800">
                                  {va.category}
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500">
                                {isReminderSent ? (
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">✓ Reminder Contacted</span>
                                ) : (
                                  <span className="text-amber-700 dark:text-amber-400">Pending Reminder</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (!isReminderSent) {
                                updateVendorAssignmentStatus(event.id, va.id, 'contacted');
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 shadow-xs"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
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
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${t.status === 'completed'
                              ? 'bg-emerald-700 text-white'
                              : 'border border-stone-400 dark:border-stone-600'
                            }`}
                        >
                          {t.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <span
                          className={`text-xs ${t.status === 'completed'
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
            )}
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
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Staff & Operations Assignment
                </h3>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={handleOpenEditAssignment}
                    className="p-1 rounded-md text-stone-400 hover:text-emerald-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Change venue or salesperson"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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

      {/* 2. OPS CHECKLIST TAB (Hidden for Salesperson - replaced by Vendor Reminders) */}
      {activeTab === 'checklist' && !isSalesperson && (
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
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${isDone
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggle(task.id)}
                          className={`mt-0.5 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 min-h-[44px] min-w-[44px] ${isDone
                              ? 'bg-emerald-700 border-emerald-700 text-white shadow-xs'
                              : 'border-stone-400 dark:border-stone-500 hover:border-emerald-700 bg-white dark:bg-stone-800 text-transparent'
                            }`}
                          aria-label={`Mark ${task.title} as ${isDone ? 'pending' : 'completed'}`}
                        >
                          <CheckCircle2 className={`w-5 h-5 ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                        </button>

                        <div>
                          <h4
                            className={`text-sm font-bold ${isDone
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
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
                <span>Vendor Coordination & Operational Reminders</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Send 1-click WhatsApp reminders. Check the reminder checkbox once contacted; status updates in real time for Admin & Sales.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddVendorModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Vendor</span>
            </button>
          </div>

          {vendorAssignments.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="font-bold text-sm text-stone-900 dark:text-stone-100">No Vendors Assigned to this Event</div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Assign decorators, sound & DJ, catering, or photography. You can send WhatsApp reminders with event timings and check them off.
              </p>
              <button
                type="button"
                onClick={() => setIsAddVendorModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Assign First Vendor</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendorAssignments.map((va) => {
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

                const isContacted = va.contactStatus === 'contacted' || va.contactStatus === 'confirmed';

                return (
                  <div
                    key={va.id}
                    className={`p-5 rounded-2xl border shadow-xs space-y-3.5 flex flex-col justify-between transition-all ${isContacted
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                      }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {va.category}
                        </span>
                        <div className="text-xs font-semibold text-stone-500">
                          {va.quotedAmount > 0 ? (
                            <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                              {formatCurrency(va.quotedAmount)}
                            </span>
                          ) : (
                            <span className="text-stone-400 italic">Price: Optional</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                            {va.vendorName}
                          </h4>
                          {va.vendorPhone && (
                            <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-stone-400" />
                              <span>{va.vendorPhone}</span>
                            </div>
                          )}
                        </div>

                        {/* Status pill */}
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${va.contactStatus === 'confirmed'
                              ? 'bg-emerald-700 text-white'
                              : va.contactStatus === 'contacted'
                                ? 'bg-sky-600 text-white'
                                : va.contactStatus === 'followup_required'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                            }`}
                        >
                          {va.contactStatus.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-xl border border-stone-200/50 dark:border-stone-800">
                        <strong>Requirements:</strong> {va.requirements || 'Standard event scope and schedule'}
                      </p>
                    </div>

                    {/* Interactive Reminder Checkbox & WhatsApp Action */}
                    <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
                      {/* Reminder Checkbox - Syncs across Admin & Salesperson */}
                      <label className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border bg-white dark:bg-stone-800/90 border-stone-300 dark:border-stone-700 hover:border-emerald-600 cursor-pointer select-none transition-colors shadow-xs">
                        <input
                          type="checkbox"
                          checked={isContacted}
                          onChange={(e) => {
                            const newStatus: ReminderStatus = e.target.checked ? 'contacted' : 'not_contacted';
                            updateVendorAssignmentStatus(event.id, va.id, newStatus);
                          }}
                          className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                          {va.contactStatus === 'confirmed'
                            ? '✓ Confirmed'
                            : va.contactStatus === 'contacted'
                              ? '✓ Reminder Sent'
                              : 'Mark Reminder Sent'}
                        </span>
                      </label>

                      <div className="flex items-center gap-2">
                        {/* WhatsApp Button */}
                        <a
                          href={generateWhatsAppUrl(va.vendorWhatsApp || va.vendorPhone, msg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (va.contactStatus === 'not_contacted') {
                              updateVendorAssignmentStatus(event.id, va.id, 'contacted');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                          title="Open WhatsApp with prefilled reminder text"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        {/* Status Select */}
                        <select
                          value={va.contactStatus}
                          onChange={(e) =>
                            updateVendorAssignmentStatus(
                              event.id,
                              va.id,
                              e.target.value as ReminderStatus
                            )
                          }
                          className="text-xs font-semibold rounded-xl px-2 py-1.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
                        >
                          <option value="not_contacted">Not Contacted</option>
                          <option value="contacted">Contacted</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="followup_required">Follow-up Req</option>
                        </select>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove vendor ${va.vendorName} from this event?`)) {
                              removeVendorFromEvent(event.id, va.id);
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg"
                          title="Remove vendor from event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Assign Vendor Modal */}
          {isAddVendorModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                    <span>Assign Vendor to {event.name}</span>
                  </h3>
                  <button
                    onClick={() => setIsAddVendorModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newVendorName.trim()) return;

                    addVendorToEvent(event.id, {
                      vendorId: newVendorId || undefined,
                      vendorName: newVendorName.trim(),
                      category: newVendorCategory || 'General',
                      vendorPhone: newVendorPhone.trim(),
                      vendorWhatsApp: newVendorPhone.trim(),
                      requirements: newVendorRequirements.trim(),
                      quotedAmount: Number(newVendorQuoted) || 0,
                    });

                    setIsAddVendorModalOpen(false);
                    setNewVendorName('');
                    setNewVendorPhone('');
                    setNewVendorRequirements('');
                    setNewVendorQuoted('');
                    setSaveSuccessMsg('Vendor assigned and added to operational reminder schedule.');
                    setTimeout(() => setSaveSuccessMsg(null), 3000);
                  }}
                  className="space-y-3.5 text-xs"
                >
                  {vendors.length > 0 && (
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Select Existing Vendor (Optional)
                      </label>
                      <select
                        value={newVendorId}
                        onChange={(e) => {
                          const vId = e.target.value;
                          setNewVendorId(vId);
                          const match = vendors.find((v) => v.id === vId);
                          if (match) {
                            setNewVendorName(match.businessName);
                            setNewVendorPhone(match.phone);
                            setNewVendorCategory(match.categories[0] || 'Decoration');
                          }
                        }}
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                      >
                        <option value="">-- Or enter custom vendor below --</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.businessName} ({v.categories.join(', ')})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Vendor / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newVendorName}
                      onChange={(e) => setNewVendorName(e.target.value)}
                      placeholder="e.g. Royal Decorators / DJ Aryan"
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Category *
                      </label>
                      <input
                        type="text"
                        list="modal-vendor-categories"
                        required
                        value={newVendorCategory}
                        onChange={(e) => setNewVendorCategory(e.target.value)}
                        placeholder="Decoration, Sound, etc."
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                      />
                      <datalist id="modal-vendor-categories">
                        {vendorCategories.map((c) => (
                          <option key={c} value={c} />
                        ))}
                        <option value="Decoration" />
                        <option value="Sound and DJ" />
                        <option value="Lighting" />
                        <option value="Catering" />
                        <option value="Photography" />
                      </datalist>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={newVendorPhone}
                        onChange={(e) => setNewVendorPhone(e.target.value)}
                        placeholder="+91 98765 00000"
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Requirements / Deliverables Scope
                    </label>
                    <input
                      type="text"
                      value={newVendorRequirements}
                      onChange={(e) => setNewVendorRequirements(e.target.value)}
                      placeholder="e.g. Floral backdrop, 2 cordless mics"
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Agreed Price (₹) <span className="font-normal text-stone-400">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newVendorQuoted}
                      onChange={(e) => setNewVendorQuoted(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0 (Optional)"
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddVendorModalOpen(false)}
                      className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-600 dark:text-stone-400 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold shadow-xs"
                    >
                      Assign Vendor
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Invoices Linked to Event ({eventInvoices.length})
              </h3>
              <div className="flex items-center gap-2">
                {onOpenRecordPayment && event.remainingBalance > 0 && (
                  <button
                    onClick={() => onOpenRecordPayment(event.id, event.clientId, event.remainingBalance)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 flex items-center gap-1 shadow-2xs"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>+ Record Client Payment</span>
                  </button>
                )}
                {onOpenCreateInvoice && (
                  <button
                    onClick={() => onOpenCreateInvoice(event.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700"
                  >
                    + Generate New Invoice
                  </button>
                )}
              </div>
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

          {/* Client Payment Ledger History */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Payment & Deduction Ledger ({eventPayments.length})
              </h3>
              {onOpenRecordPayment && (
                <button
                  onClick={() => onOpenRecordPayment(event.id, event.clientId, event.remainingBalance)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 flex items-center gap-1 shadow-2xs"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Record / Adjust Payment</span>
                </button>
              )}
            </div>

            {eventPayments.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No payments or deductions recorded yet.</p>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {eventPayments.map((p) => {
                  const isRefund = p.type === 'refund';
                  return (
                    <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${isRefund ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                              }`}
                          >
                            {isRefund ? '-' : '+'} {formatCurrency(p.amount)}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isRefund
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                          >
                            {isRefund ? 'Deduction / Refund' : 'Payment Received'}
                          </span>
                        </div>
                        <div className="text-stone-500 text-[11px] mt-0.5">
                          {formatDate(p.paymentDate)} via {p.paymentMethod.replace('_', ' ').toUpperCase()}
                          {p.referenceNumber ? ` · Ref: ${p.referenceNumber}` : ''}
                        </div>
                        {p.notes && <div className="text-[11px] text-stone-400 italic mt-0.5">{p.notes}</div>}
                      </div>
                      <div className="text-right text-[11px] text-stone-400">
                        Recorded by {p.recordedByName}
                      </div>
                    </div>
                  );
                })}
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

      {/* Reassign Banquet & Personnel Modal */}
      {isEditAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Change Banquet Venue & Salesperson
                </h3>
              </div>
              <button
                onClick={() => setIsEditAssignmentModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Banquet Venue *
                </label>
                <select
                  value={editBanquetId}
                  onChange={(e) => setEditBanquetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold"
                >
                  {banquets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.capacity} Pax)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-400 mt-1">
                  Reassigning the venue updates the booking schedule, linked sales cards, and invoices.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Lead Salesperson *
                </label>
                <select
                  value={editSalespersonId}
                  onChange={(e) => setEditSalespersonId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                >
                  <option value="">-- Select Salesperson --</option>
                  {users
                    .filter((u) => u.isActive && (u.role === 'salesperson' || u.role === 'admin'))
                    .map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Operations Manager (Optional)
                </label>
                <select
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="">-- Unassigned (Admin Supervising) --</option>
                  {users
                    .filter((u) => u.isActive && (u.role === 'manager' || u.role === 'admin'))
                    .map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsEditAssignmentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignment}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Reassignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
