import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Calendar,
  Clock,
  Users,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Receipt,
  ShieldAlert,
  Send,
  Printer,
  Sparkles,
  Phone,
  MessageCircle,
  ExternalLink,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, formatDate, generateWhatsAppUrl } from '../../utils/formatters';
import { Attachment, EventRecord } from '../../types';
import { ImageUploadArea } from '../common/ImageUploadArea';
import { DEFAULT_EVENT_SETUP_PHOTOS } from '../../assets/sampleEventPhotos';

interface DirectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent?: (eventId: string) => void;
  preselectedDate?: string;
  preselectedBanquetId?: string;
  preselectedLead?: {
    id: string;
    clientName: string;
    phone: string;
    whatsApp: string;
    email?: string;
    eventType: string;
    expectedEventDate: string;
    guestCount: number;
    requirements: string;
  };
}

const EVENT_TYPES = [
  'Wedding',
  'Reception',
  'Birthday',
  'Engagement',
  'Anniversary',
  'Corporate event',
  'Conference',
  'Cocktail & Sangeet',
  'Other',
];

interface VendorAssignmentRow {
  vendorId?: string;
  vendorName: string;
  vendorPhone: string;
  vendorWhatsApp: string;
  category: string;
  requirements: string;
  quotedAmount: number;
  isCustom: boolean;
}

export const DirectSaleModal: React.FC<DirectSaleModalProps> = ({
  isOpen,
  onClose,
  onSelectEvent,
  preselectedDate,
  preselectedBanquetId,
  preselectedLead,
}) => {
  const { banquets, clients, vendors, vendorCategories, validateAvailability, createDirectSale } = useData();
  const { currentUser, allUsersList: users } = useAuth();

  // Mode: existing vs new client
  const [clientMode, setClientMode] = useState<'existing' | 'new'>(
    preselectedLead ? 'new' : 'existing'
  );
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Client form
  const [clientName, setClientName] = useState(preselectedLead?.clientName || '');
  const [clientPhone, setClientPhone] = useState(preselectedLead?.phone || '');
  const [clientWhatsApp, setClientWhatsApp] = useState(preselectedLead?.whatsApp || '');
  const [clientEmail, setClientEmail] = useState(preselectedLead?.email || '');
  const [clientAddress, setClientAddress] = useState('');

  // Event form
  const [eventName, setEventName] = useState(
    preselectedLead ? `${preselectedLead.clientName} ${preselectedLead.eventType}` : ''
  );
  const [eventType, setEventType] = useState(preselectedLead?.eventType || 'Wedding');
  const [banquetId, setBanquetId] = useState(
    preselectedBanquetId || banquets[0]?.id || ''
  );
  const [date, setDate] = useState(
    preselectedDate || preselectedLead?.expectedEventDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('23:30');
  const [guestCount, setGuestCount] = useState<number>(preselectedLead?.guestCount || 300);
  const [requirements, setRequirements] = useState(preselectedLead?.requirements || '');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [managerId, setManagerId] = useState('');
  const [salespersonId, setSalespersonId] = useState<string>(
    currentUser?.role === 'salesperson'
      ? currentUser.uid
      : (users.find((u) => u.role === 'salesperson')?.uid || currentUser?.uid || '')
  );
  const [referencePhotos, setReferencePhotos] = useState<Attachment[]>([
    ...DEFAULT_EVENT_SETUP_PHOTOS,
  ]);

  // Financials - STRICTLY OPTIONAL
  const [quotedAmount, setQuotedAmount] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [advanceRequested, setAdvanceRequested] = useState<number | ''>('');
  const [advanceReceived, setAdvanceReceived] = useState<number | ''>('');
  const [paymentTerms, setPaymentTerms] = useState(
    'Advance on booking, balance payable prior to event.'
  );
  const [createInvoice, setCreateInvoice] = useState(true);

  // Vendor Assignments state
  const [assignedVendors, setAssignedVendors] = useState<VendorAssignmentRow[]>([]);

  // Validation & status
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Check-in Voucher Popup state
  const [confirmedEvent, setConfirmedEvent] = useState<EventRecord | null>(null);

  // Auto populate client if existing is picked
  useEffect(() => {
    if (clientMode === 'existing' && selectedClientId) {
      const c = clients.find((item) => item.id === selectedClientId);
      if (c) {
        setClientName(c.fullName);
        setClientPhone(c.primaryPhone);
        setClientWhatsApp(c.whatsApp);
        setClientEmail(c.email || '');
        setClientAddress(c.address || '');
      }
    }
  }, [selectedClientId, clientMode, clients]);

  // When banquet changes, if banquet has base price, optionally suggest it
  useEffect(() => {
    const b = banquets.find((item) => item.id === banquetId);
    if (b && b.basePrice > 0 && (quotedAmount === '' || quotedAmount === 0)) {
      setQuotedAmount(b.basePrice);
    }
  }, [banquetId, banquets]);

  // Realtime Availability check
  useEffect(() => {
    if (!banquetId || !date || !startTime || !endTime) return;

    setIsCheckingConflict(true);
    const check = validateAvailability({
      banquetId,
      date,
      startTime,
      endTime,
    });
    setIsCheckingConflict(false);

    if (!check.isAvailable) {
      setConflictError(check.conflictReason || 'Slot is unavailable.');
    } else {
      setConflictError(null);
    }
  }, [banquetId, date, startTime, endTime, validateAvailability]);

  if (!isOpen) return null;

  // Add Vendor Row - Works smoothly whether existing vendors exist or not!
  const handleAddVendorRow = () => {
    const defaultCat = vendorCategories[0] || 'Decoration';
    const firstV = vendors[0];

    if (firstV) {
      setAssignedVendors([
        ...assignedVendors,
        {
          vendorId: firstV.id,
          vendorName: firstV.businessName,
          vendorPhone: firstV.phone,
          vendorWhatsApp: firstV.whatsApp || firstV.phone,
          category: firstV.categories[0] || defaultCat,
          requirements: '',
          quotedAmount: 0,
          isCustom: false,
        },
      ]);
    } else {
      setAssignedVendors([
        ...assignedVendors,
        {
          vendorId: '',
          vendorName: '',
          vendorPhone: '',
          vendorWhatsApp: '',
          category: defaultCat,
          requirements: '',
          quotedAmount: 0,
          isCustom: true,
        },
      ]);
    }
  };

  const handleRemoveVendorRow = (index: number) => {
    setAssignedVendors(assignedVendors.filter((_, i) => i !== index));
  };

  const handleVendorFieldChange = (index: number, field: keyof VendorAssignmentRow, value: any) => {
    const copy = [...assignedVendors];
    copy[index] = { ...copy[index], [field]: value };

    if (field === 'vendorId') {
      if (value === '__custom__') {
        copy[index].isCustom = true;
        copy[index].vendorId = '';
        copy[index].vendorName = '';
        copy[index].vendorPhone = '';
        copy[index].vendorWhatsApp = '';
      } else {
        const match = vendors.find((v) => v.id === value);
        if (match) {
          copy[index].isCustom = false;
          copy[index].vendorName = match.businessName;
          copy[index].vendorPhone = match.phone;
          copy[index].vendorWhatsApp = match.whatsApp || match.phone;
          copy[index].category = match.categories[0] || copy[index].category;
        }
      }
    }

    setAssignedVendors(copy);
  };

  const numQuoted = Number(quotedAmount) || 0;
  const numDiscount = Number(discount) || 0;
  const numAdvanceRec = Number(advanceReceived) || 0;
  const numAdvanceReq = Number(advanceRequested) || numAdvanceRec;
  const finalAmount = Math.max(0, numQuoted - numDiscount);
  const remainingBalance = Math.max(0, finalAmount - numAdvanceRec);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Basic validation
    if (!eventName.trim()) {
      setGeneralError('Please enter an event name.');
      return;
    }
    if (!clientName.trim() || !clientPhone.trim()) {
      setGeneralError('Client name and contact phone number are required.');
      return;
    }
    if (conflictError) {
      setGeneralError('Cannot book conflicting slot. Please adjust date or time.');
      return;
    }

    // Prepare vendor assignments
    const formattedVendors = assignedVendors.map((av, idx) => ({
      vendorId: av.vendorId || undefined,
      vendorName: av.vendorName.trim() || `Vendor ${idx + 1}`,
      vendorPhone: av.vendorPhone.trim(),
      vendorWhatsApp: av.vendorWhatsApp.trim() || av.vendorPhone.trim(),
      category: av.category || 'General',
      requirements: av.requirements.trim(),
      quotedAmount: Number(av.quotedAmount) || 0,
    }));

    setSubmitting(true);

    const result = createDirectSale({
      client: {
        id: clientMode === 'existing' ? selectedClientId : undefined,
        fullName: clientName.trim(),
        primaryPhone: clientPhone.trim(),
        whatsApp: (clientWhatsApp.trim() || clientPhone.trim()),
        email: clientEmail.trim(),
        address: clientAddress.trim(),
      },
      event: {
        name: eventName.trim(),
        eventType,
        banquetId,
        date,
        startTime,
        endTime,
        guestCount: Number(guestCount) || 100,
        requirements,
        specialInstructions,
        managerId: managerId || undefined,
        salespersonId: salespersonId || undefined,
        referencePhotos,
      },
      financials: {
        quotedAmount: numQuoted,
        discount: numDiscount,
        advanceRequested: numAdvanceReq,
        advanceReceived: numAdvanceRec,
        paymentTerms,
      },
      vendorAssignments: formattedVendors,
      createInvoice,
      convertedFromLeadId: preselectedLead?.id,
    });

    setSubmitting(false);

    if (result.success && result.event) {
      setConfirmedEvent(result.event);
    } else {
      setGeneralError(result.error || 'Failed to create booking.');
    }
  };

  const selectedBanquetObj = banquets.find((b) => b.id === (confirmedEvent ? confirmedEvent.banquetId : banquetId));

  // Pre-fill WhatsApp Check-in Pass Message
  const getWhatsAppCheckinMessage = () => {
    if (!confirmedEvent) return '';
    const bName = selectedBanquetObj?.name || confirmedEvent.banquetName;
    return `*Pearlexperiences - Official Booking Pass & Check-In Voucher*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Pass ID: PX-PASS-${confirmedEvent.id.slice(-6).toUpperCase()}\n` +
      `Event: ${confirmedEvent.name} (${confirmedEvent.eventType})\n` +
      `Venue: ${bName}\n` +
      `Date: ${formatDate(confirmedEvent.date)}\n` +
      `Timing: ${confirmedEvent.startTime} to ${confirmedEvent.endTime}\n` +
      `Guest Count: ${confirmedEvent.guestCount} Pax\n` +
      `Guest Name: ${confirmedEvent.clientName}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      (confirmedEvent.finalAmount > 0
        ? `Tariff: ₹${confirmedEvent.finalAmount.toLocaleString()}\n` +
          `Advance Paid: ₹${confirmedEvent.advanceReceived.toLocaleString()}\n` +
          `Balance Due: ₹${confirmedEvent.remainingBalance.toLocaleString()}\n`
        : `Status: Confirmed & Reserved\n`) +
      `Pearlexperiences Pvt Ltd\n` +
      `Support: Pearlexperiencespvt.ltd@gmail.com`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden">
        
        {/* CHECK-IN POPUP OVERLAY */}
        {confirmedEvent ? (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Header Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                      Pearlexperiences
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                      ✓ Confirmed & Check-in Ready
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    Booking & Guest Check-In Voucher
                  </h2>
                  <div className="text-xs text-stone-500">
                    Pass Reference: <strong className="text-stone-800 dark:text-stone-200">PX-PASS-{confirmedEvent.id.slice(-6).toUpperCase()}</strong> · Pearlexperiencespvt.ltd@gmail.com
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="self-start sm:self-center p-2 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Check-in Pass Card Layout */}
            <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 space-y-5">
              {/* Event & Venue Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-stone-400 font-medium block text-[11px]">Event Name</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">{confirmedEvent.name}</span>
                  <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">{confirmedEvent.eventType}</span>
                </div>

                <div>
                  <span className="text-stone-400 font-medium block text-[11px]">Reserved Venue</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">{confirmedEvent.banquetName}</span>
                  <span className="block text-[11px] text-stone-500">{confirmedEvent.guestCount} Guests Expected</span>
                </div>

                <div>
                  <span className="text-stone-400 font-medium block text-[11px]">Booking Schedule</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">{formatDate(confirmedEvent.date)}</span>
                  <span className="block text-[11px] text-stone-600 dark:text-stone-300">{confirmedEvent.startTime} to {confirmedEvent.endTime}</span>
                </div>

                <div>
                  <span className="text-stone-400 font-medium block text-[11px]">Primary Guest</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">{confirmedEvent.clientName}</span>
                  <span className="block text-[11px] text-stone-500">{confirmedEvent.clientPhone}</span>
                </div>
              </div>

              {/* Assigned Vendors Summary */}
              {confirmedEvent.vendorAssignments && confirmedEvent.vendorAssignments.length > 0 && (
                <div className="pt-3 border-t border-stone-200 dark:border-stone-700/60">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                    Assigned Vendors & Coordination ({confirmedEvent.vendorAssignments.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {confirmedEvent.vendorAssignments.map((va) => (
                      <div
                        key={va.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-stone-900 dark:text-stone-100">{va.vendorName}</div>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">{va.category}</div>
                          {va.vendorPhone && (
                            <div className="text-[10px] text-stone-500">{va.vendorPhone}</div>
                          )}
                        </div>
                        {va.quotedAmount > 0 && (
                          <div className="text-right font-semibold text-stone-700 dark:text-stone-300 tabular-nums">
                            ₹{va.quotedAmount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Snapshot */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-700/60 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-stone-400 block text-[10px]">Quoted Tariff</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {confirmedEvent.finalAmount > 0 ? `₹${confirmedEvent.finalAmount.toLocaleString()}` : 'Optional / Not set'}
                    </span>
                  </div>
                  {confirmedEvent.advanceReceived > 0 && (
                    <div>
                      <span className="text-stone-400 block text-[10px]">Advance Received</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        ₹{confirmedEvent.advanceReceived.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {confirmedEvent.remainingBalance > 0 && (
                    <div>
                      <span className="text-stone-400 block text-[10px]">Balance Due</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        ₹{confirmedEvent.remainingBalance.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-stone-500 italic">
                  Slot locked in real-time calendar with 60m buffers.
                </div>
              </div>
            </div>

            {/* Check-in Popup Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Open Event Details & Reminders */}
                {onSelectEvent && (
                  <button
                    onClick={() => {
                      onSelectEvent(confirmedEvent.id);
                      onClose();
                    }}
                    className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 min-h-[42px] transition-transform active:scale-95"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Open Event Details & Reminders</span>
                  </button>
                )}

                {/* 2. Share WhatsApp Check-in Pass */}
                {confirmedEvent.clientWhatsApp && (
                  <a
                    href={generateWhatsAppUrl(confirmedEvent.clientWhatsApp, getWhatsAppCheckinMessage())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 min-h-[42px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Pass</span>
                  </a>
                )}

                {/* 3. Print Check-in Slip */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[42px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Pass</span>
                </button>
              </div>

              {/* 4. Done */}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-stone-900 hover:bg-black dark:bg-stone-100 dark:text-stone-900 text-white rounded-xl text-xs font-bold min-h-[42px]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
              <div>
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
                  <span>Direct Sale & Banquet Reservation</span>
                </h2>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Pearlexperiences luxury reservation desk. All pricing fields are optional.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {generalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* SECTION A: CLIENT INFORMATION */}
              <div className="space-y-3 border-b border-stone-200 dark:border-stone-800 pb-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Section A: Client Information
                  </h3>
                  <div className="flex rounded-lg border border-stone-200 dark:border-stone-700 p-0.5 text-xs bg-stone-50 dark:bg-stone-800">
                    <button
                      type="button"
                      onClick={() => setClientMode('new')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        clientMode === 'new'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      New Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientMode('existing')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        clientMode === 'existing'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      Existing Directory ({clients.length})
                    </button>
                  </div>
                </div>

                {clientMode === 'existing' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Select Client from Directory
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    >
                      <option value="">-- Choose registered client --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.primaryPhone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Client Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Vikram Malhotra"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Primary Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => {
                        setClientPhone(e.target.value);
                        if (!clientWhatsApp) setClientWhatsApp(e.target.value);
                      }}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={clientWhatsApp}
                      onChange={(e) => setClientWhatsApp(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@gmail.com"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Client Residential / Billing Address
                  </label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Sector, City, State"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              {/* SECTION B: EVENT & SCHEDULE */}
              <div className="space-y-3 border-b border-stone-200 dark:border-stone-800 pb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Section B: Event Specifics & Venue Slot
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Event Title / Occasion *
                    </label>
                    <input
                      type="text"
                      required
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="e.g. Malhotra Grand Wedding Reception"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Event Category *
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Banquet Venue *
                      </label>
                      <select
                        required
                        value={banquetId}
                        onChange={(e) => {
                          const newBId = e.target.value;
                          setBanquetId(newBId);
                          const b = banquets.find((item) => item.id === newBId);
                          if (b?.assignedSalespersonId) setSalespersonId(b.assignedSalespersonId);
                          if (b?.assignedManagerId) setManagerId(b.assignedManagerId);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                      >
                        {banquets.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.capacity} Pax)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Assigned Salesperson *
                      </label>
                      <select
                        value={salespersonId}
                        onChange={(e) => setSalespersonId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                      >
                        <optgroup label="Sales Executives">
                          {users
                            .filter((u) => u.isActive && u.role === 'salesperson')
                            .map((u) => (
                              <option key={u.uid} value={u.uid}>
                                {u.fullName} (Salesperson)
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Management / Admins">
                          {users
                            .filter((u) => u.isActive && (u.role === 'admin' || u.role === 'manager'))
                            .map((u) => (
                              <option key={u.uid} value={u.uid}>
                                {u.fullName} ({u.role === 'admin' ? 'Admin' : 'Manager'})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Assigned Operations Manager
                      </label>
                      <select
                        value={managerId}
                        onChange={(e) => setManagerId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                      >
                        <option value="">-- No specific manager (Visible to All) --</option>
                        <optgroup label="Operations Managers">
                          {users
                            .filter((u) => u.isActive && u.role === 'manager')
                            .map((u) => (
                              <option key={u.uid} value={u.uid}>
                                {u.fullName} (Operations Manager)
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Management / Admins">
                          {users
                            .filter((u) => u.isActive && u.role === 'admin')
                            .map((u) => (
                              <option key={u.uid} value={u.uid}>
                                {u.fullName} (Admin)
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Expected Guest Count (Pax)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Start & End Time *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-2 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-2 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Concurrency Conflict Status */}
                <div className="pt-2">
                  {conflictError ? (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-lg text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Booking Conflict Detected:</span> {conflictError}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        Slot is <strong>AVAILABLE</strong> with required 60m setup/cleanup buffer prevention.
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Event Requirements & Setup Specifications
                  </label>
                  <textarea
                    rows={2}
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="Detail decor themes, floral arches, stage dimensions, catering requirements..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              {/* SECTION C: VENDOR COORDINATION (Option for Vendors to Add) */}
              <div className="space-y-3 border-b border-stone-200 dark:border-stone-800 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>Section C: Vendor Assignments</span>
                    </h3>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400">
                      Add vendors for catering, sound, decor, or photography. Prices are completely optional.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVendorRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 rounded-lg shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Vendor</span>
                  </button>
                </div>

                {assignedVendors.length === 0 ? (
                  <div className="p-4 text-xs text-stone-500 bg-stone-50 dark:bg-stone-800/40 rounded-xl text-center border border-dashed border-stone-200 dark:border-stone-700">
                    No vendors assigned to this direct sale yet. Click <strong>&quot;+ Add Vendor&quot;</strong> to add decorators, sound/DJ, catering, or security.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignedVendors.map((av, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/40 space-y-2.5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Vendor Selector or Custom Name */}
                          <div>
                            <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                              Vendor / Supplier *
                            </label>
                            {vendors.length > 0 ? (
                              <div className="space-y-1">
                                <select
                                  value={av.isCustom ? '__custom__' : (av.vendorId || '__custom__')}
                                  onChange={(e) => handleVendorFieldChange(idx, 'vendorId', e.target.value)}
                                  className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                                >
                                  <option value="__custom__">+ Enter New / Custom Vendor</option>
                                  {vendors.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.businessName} ({v.categories.join(', ')})
                                    </option>
                                  ))}
                                </select>
                                {av.isCustom && (
                                  <input
                                    type="text"
                                    placeholder="Enter Vendor Business Name"
                                    value={av.vendorName}
                                    onChange={(e) => handleVendorFieldChange(idx, 'vendorName', e.target.value)}
                                    className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                                  />
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="e.g. Royal Decorators / DJ Aryan"
                                value={av.vendorName}
                                onChange={(e) => handleVendorFieldChange(idx, 'vendorName', e.target.value)}
                                className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                              />
                            )}
                          </div>

                          {/* Vendor Category */}
                          <div>
                            <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                              Service Category *
                            </label>
                            <input
                              type="text"
                              list="vendor-category-presets"
                              value={av.category}
                              placeholder="Decoration, Sound, Catering..."
                              onChange={(e) => handleVendorFieldChange(idx, 'category', e.target.value)}
                              className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                            />
                            <datalist id="vendor-category-presets">
                              {vendorCategories.map((c) => (
                                <option key={c} value={c} />
                              ))}
                              <option value="Decoration" />
                              <option value="Sound and DJ" />
                              <option value="Lighting & Trussing" />
                              <option value="Catering & Buffet" />
                              <option value="Photography & Video" />
                              <option value="Valet Parking & Security" />
                              <option value="Florist" />
                              <option value="Bridal Makeup" />
                            </datalist>
                          </div>

                          {/* Contact Phone / WhatsApp */}
                          <div>
                            <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                              Contact Phone / WhatsApp
                            </label>
                            <input
                              type="tel"
                              value={av.vendorPhone}
                              placeholder="+91 98765 00000"
                              onChange={(e) => {
                                handleVendorFieldChange(idx, 'vendorPhone', e.target.value);
                                if (!av.vendorWhatsApp) handleVendorFieldChange(idx, 'vendorWhatsApp', e.target.value);
                              }}
                              className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                              Requirements / Deliverables Scope
                            </label>
                            <input
                              type="text"
                              value={av.requirements}
                              onChange={(e) => handleVendorFieldChange(idx, 'requirements', e.target.value)}
                              placeholder="e.g. Floral stage setup, 2 wireless microphones, 10 buffet warmers"
                              className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-0.5">
                                Quoted Price (₹) <span className="font-normal text-stone-400">(Optional)</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={av.quotedAmount === 0 ? '' : av.quotedAmount}
                                placeholder="0 (Optional)"
                                onChange={(e) => handleVendorFieldChange(idx, 'quotedAmount', Number(e.target.value) || 0)}
                                className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 tabular-nums"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveVendorRow(idx)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg mt-3"
                              title="Remove vendor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION D: FINANCIALS (ALL OPTIONAL) */}
              <div className="space-y-3 pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Section D: Financials & Payments
                  </h3>
                  <span className="text-[11px] text-stone-500 font-medium">
                    (All financial fields are optional)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Total Quoted Tariff (₹) <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quotedAmount}
                      onChange={(e) => setQuotedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0 (Optional)"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Discount Applied (₹) <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Advance Received (₹) <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={advanceReceived}
                      onChange={(e) => setAdvanceReceived(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 tabular-nums font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Remaining Balance Due
                    </label>
                    <div className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 font-bold tabular-nums">
                      {formatCurrency(remainingBalance)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="create-invoice-toggle"
                    checked={createInvoice}
                    onChange={(e) => setCreateInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <label htmlFor="create-invoice-toggle" className="text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                    Automatically generate official Pearlexperiences booking invoice
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || Boolean(conflictError)}
                  className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  {submitting ? 'Confirming...' : 'Confirm Direct Sale & View Check-In'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
