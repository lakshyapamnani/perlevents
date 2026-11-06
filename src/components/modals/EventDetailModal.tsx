import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Calendar,
  Clock,
  Users,
  Building2,
  DollarSign,
  MessageCircle,
  CheckSquare,
  FileText,
  History,
  Phone,
  Mail,
  MapPin,
  Send,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { EventRecord, ReminderStatus } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  generateWhatsAppUrl,
  createBanquetOwnerReminderMessage,
  createVendorReminderMessage,
} from '../../utils/formatters';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventRecord | null;
  onOpenRecordPayment?: (eventId: string, clientId: string, balance: number) => void;
}

type EventTab =
  | 'overview'
  | 'client'
  | 'vendors'
  | 'reminders'
  | 'checklist'
  | 'financials'
  | 'documents'
  | 'activity';

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  onOpenRecordPayment,
}) => {
  const {
    banquets,
    clients,
    checklistItems,
    activityLogs,
    updateEventStatus,
    updateVendorAssignmentStatus,
    toggleChecklistItem,
  } = useData();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<EventTab>('overview');
  const [checklistNote, setChecklistNote] = useState<Record<string, string>>({});

  if (!isOpen || !event) return null;

  const banquet = banquets.find((b) => b.id === event.banquetId);
  const client = clients.find((c) => c.id === event.clientId);
  const eventChecklist = checklistItems[event.id] || [];
  const eventLogs = activityLogs.filter((log) => log.recordId === event.id);

  // Completed task ratio
  const completedCount = eventChecklist.filter((c) => c.status === 'completed').length;
  const checklistPercent =
    eventChecklist.length > 0 ? Math.round((completedCount / eventChecklist.length) * 100) : 0;

  // Prepare reminders list: Banquet owner + assigned vendors
  const remindersList = [
    {
      id: `rem_owner_${event.id}`,
      type: 'banquet_owner',
      name: banquet?.ownerName || 'Banquet Property Trustee',
      phone: banquet?.ownerPhone || banquet?.ownerWhatsApp || '',
      responsibility: 'Hall Preparation & HVAC Pre-Cooling',
      status: 'not_contacted' as ReminderStatus,
      message: createBanquetOwnerReminderMessage({
        ownerName: banquet?.ownerName || 'Venue Trustee',
        banquetName: event.banquetName,
        eventName: event.name,
        date: formatDate(event.date),
        startTime: event.startTime,
        endTime: event.endTime,
        requirements: event.requirements,
      }),
    },
    ...(Array.isArray(event.vendorAssignments) ? event.vendorAssignments : []).map((va) => ({
      id: va.id,
      type: 'vendor',
      name: va.vendorName,
      phone: va.vendorWhatsApp || va.vendorPhone,
      responsibility: `${va.category} (${va.requirements || 'As per spec'})`,
      status: va.contactStatus,
      message: createVendorReminderMessage({
        vendorContactPerson: va.vendorName,
        vendorBusinessName: va.vendorName,
        category: va.category,
        banquetName: event.banquetName,
        eventName: event.name,
        date: formatDate(event.date),
        startTime: event.startTime,
        endTime: event.endTime,
        requirements: va.requirements,
      }),
    })),
  ];

  const handleStatusChange = (newStatus: any) => {
    if (confirm(`Change event status to "${newStatus}"?`)) {
      updateEventStatus(event.id, newStatus);
    }
  };

  const tabs: Array<{ id: EventTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'client', label: 'Client' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'reminders', label: 'WhatsApp Reminders' },
    { id: 'checklist', label: `Checklist (${checklistPercent}%)` },
    { id: 'financials', label: 'Financials' },
    { id: 'documents', label: 'Documents & Photos' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                {event.eventType}
              </span>
              <span className="text-stone-300 dark:text-stone-700">·</span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  event.status === 'confirmed'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : event.status === 'in_progress'
                    ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                    : event.status === 'completed'
                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    : event.status === 'cancelled'
                    ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}
              >
                {event.status.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              {event.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 dark:text-stone-400 mt-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {event.banquetName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(event.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {event.startTime} - {event.endTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser?.role === 'admin' && (
              <select
                value={event.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              >
                <option value="tentative">Tentative</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
            <button
              onClick={onClose}
              className="p-2 text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Tabs */}
        <div className="flex overflow-x-auto border-b border-stone-200 dark:border-stone-800 px-6 bg-white dark:bg-stone-900 shrink-0">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-emerald-800 dark:border-emerald-500 text-emerald-800 dark:text-emerald-400'
                    : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40">
                  <div className="text-[11px] font-bold uppercase text-stone-600 dark:text-stone-400">
                    Expected Attendance
                  </div>
                  <div className="text-xl font-bold text-stone-900 dark:text-stone-100 mt-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                    <span>{event.guestCount} Guests</span>
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                    Banquet max capacity: {banquet?.capacity || 'N/A'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40">
                  <div className="text-[11px] font-bold uppercase text-stone-600 dark:text-stone-400">
                    Assigned Personnel
                  </div>
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 mt-1">
                    Sales: {event.salespersonName}
                  </div>
                  <div className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                    Operations: {event.managerName || 'Unassigned'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40">
                  <div className="text-[11px] font-bold uppercase text-stone-600 dark:text-stone-400">
                    Financial Status
                  </div>
                  <div className="text-base font-bold text-stone-900 dark:text-stone-100 mt-1">
                    {formatCurrency(event.finalAmount)}
                  </div>
                  <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Balance Due: {formatCurrency(event.remainingBalance)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                  Event Requirements & Themes
                </h4>
                <div className="p-4 bg-stone-50 dark:bg-stone-800/30 rounded-xl border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                  {event.requirements || 'No specific requirements recorded.'}
                </div>
              </div>

              {event.specialInstructions && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                    Special Operational Instructions
                  </h4>
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/50 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {event.specialInstructions}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CLIENT */}
          {activeTab === 'client' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-3">
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  {client?.fullName || event.clientName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                    <Phone className="w-4 h-4 text-emerald-700" />
                    <span>{event.clientPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                    <MessageCircle className="w-4 h-4 text-emerald-700" />
                    <span>{event.clientWhatsApp || event.clientPhone}</span>
                  </div>
                  {client?.email && (
                    <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                      <Mail className="w-4 h-4 text-emerald-700" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client?.address && (
                    <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      <span>{client.address}</span>
                    </div>
                  )}
                </div>
                {client?.notes && (
                  <div className="pt-2 text-xs text-stone-600 dark:text-stone-400 italic">
                    Client Profile Notes: {client.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VENDORS */}
          {activeTab === 'vendors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Assigned Service Vendors ({(event.vendorAssignments || []).length})
                </h3>
              </div>

              {(event.vendorAssignments || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/30 rounded-xl">
                  No vendors assigned to this event yet.
                </div>
              ) : (
                <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                  {(event.vendorAssignments || []).map((va) => (
                    <div key={va.id} className="p-4 bg-white dark:bg-stone-900 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                          <span>{va.vendorName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 font-semibold">
                            {va.category}
                          </span>
                        </div>
                        <div className="text-stone-600 dark:text-stone-400 mt-1">
                          {va.requirements || 'Standard service scope.'}
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                          Phone: {va.vendorPhone}
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <div className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                          {formatCurrency(va.quotedAmount)}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              va.contactStatus === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : va.contactStatus === 'contacted'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {va.contactStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WHATSAPP REMINDERS (SECTION 14) */}
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-300">
                <span className="font-bold">WhatsApp Coordination Hub:</span> Generate tailored prefilled messages for banquet owner and assigned service vendors. Click &quot;Open WhatsApp&quot; to review in WhatsApp before sending. Manually update status based on recipient confirmation.
              </div>

              <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-b border-stone-200 dark:border-stone-800 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Responsibility</th>
                      <th className="p-3">Reminder Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {remindersList.map((rem, idx) => {
                      const waUrl = generateWhatsAppUrl(rem.phone, rem.message);
                      return (
                        <tr key={idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                          <td className="p-3">
                            <div className="font-bold text-stone-900 dark:text-stone-100">
                              {rem.name}
                            </div>
                            <div className="text-[11px] text-stone-600 dark:text-stone-400">
                              {rem.phone}
                            </div>
                          </td>
                          <td className="p-3 text-stone-700 dark:text-stone-300 max-w-xs">
                            {rem.responsibility}
                          </td>
                          <td className="p-3">
                            {rem.type === 'vendor' ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={rem.status === 'contacted' || rem.status === 'confirmed'}
                                  onChange={(e) =>
                                    updateVendorAssignmentStatus(
                                      event.id,
                                      rem.id,
                                      e.target.checked ? 'contacted' : 'not_contacted'
                                    )
                                  }
                                  className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                                  title="Check to mark reminder sent"
                                />
                                <select
                                  value={rem.status}
                                  onChange={(e) =>
                                    updateVendorAssignmentStatus(
                                      event.id,
                                      rem.id,
                                      e.target.value as ReminderStatus
                                    )
                                  }
                                  className="text-xs px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                                >
                                  <option value="not_contacted">Not Contacted</option>
                                  <option value="contacted">Contacted</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="followup_required">Follow-up Required</option>
                                  <option value="not_required">Not Required</option>
                                </select>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-700">
                                {rem.status.replace('_', ' ')}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Open WhatsApp</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CHECKLIST (SECTION 15) */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Operations Checklist ({completedCount}/{eventChecklist.length} Complete)
                  </h3>
                  <div className="w-48 h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-emerald-700 dark:bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${checklistPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                {eventChecklist.map((item) => {
                  const isDone = item.status === 'completed';
                  return (
                    <div
                      key={item.id}
                      className={`p-4 flex items-start justify-between gap-3 transition-colors ${
                        isDone ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : 'bg-white dark:bg-stone-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleChecklistItem(event.id, item.id)}
                          className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors min-h-[24px] min-w-[24px] ${
                            isDone
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'border-stone-400 dark:border-stone-600 hover:border-emerald-600'
                          }`}
                        >
                          {isDone && <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <div>
                          <div
                            className={`text-xs font-semibold ${
                              isDone
                                ? 'line-through text-stone-600 dark:text-stone-400'
                                : 'text-stone-900 dark:text-stone-100'
                            }`}
                          >
                            {item.title}
                          </div>
                          {item.description && (
                            <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                              {item.description}
                            </div>
                          )}
                          {isDone && item.completedByName && (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                              Completed by {item.completedByName} on {formatDateTime(item.completedAt || '')}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 shrink-0">
                        {item.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: FINANCIALS */}
          {activeTab === 'financials' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 text-xs">
                <div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold">
                    Quoted Total
                  </div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 text-sm mt-0.5 tabular-nums">
                    {formatCurrency(event.quotedAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold">
                    Discount
                  </div>
                  <div className="font-bold text-stone-700 dark:text-stone-300 text-sm mt-0.5 tabular-nums">
                    {formatCurrency(event.discount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold">
                    Advance Received
                  </div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5 tabular-nums">
                    {formatCurrency(event.advanceReceived)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold">
                    Remaining Balance
                  </div>
                  <div className="font-bold text-amber-700 dark:text-amber-400 text-sm mt-0.5 tabular-nums">
                    {formatCurrency(event.remainingBalance)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-stone-600 dark:text-stone-400">
                  Payment Terms: {event.paymentTerms}
                </span>
                {onOpenRecordPayment && event.remainingBalance > 0 && (
                  <button
                    onClick={() => {
                      onOpenRecordPayment(event.id, event.clientId, event.remainingBalance);
                    }}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    + Record Payment
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: DOCUMENTS & REFERENCE PHOTOS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Client Inspiration & Reference Materials ({event.referencePhotos.length})
              </h3>

              {event.referencePhotos.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/30 rounded-xl">
                  No reference photos uploaded for this event.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.referencePhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden bg-stone-50 dark:bg-stone-800/40"
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-48 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="p-3 text-xs">
                        <div className="font-bold text-stone-900 dark:text-stone-100">{photo.name}</div>
                        {photo.caption && (
                          <div className="text-stone-600 dark:text-stone-400 mt-0.5">{photo.caption}</div>
                        )}
                        <div className="text-[10px] text-stone-600 dark:text-stone-400 mt-1">
                          Category: {photo.category || 'General'} · By {photo.uploadedBy}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Audit Trail & History
              </h3>
              {eventLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/30 rounded-xl">
                  No audit logs recorded for this event.
                </div>
              ) : (
                <div className="space-y-2">
                  {eventLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/30 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-400 mb-1">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {log.actorName} ({log.actorRole})
                        </span>
                        <span>{formatDateTime(log.timestamp)}</span>
                      </div>
                      <div className="font-semibold text-stone-900 dark:text-stone-100">{log.action}</div>
                      <div className="text-stone-600 dark:text-stone-400 mt-0.5">{log.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
