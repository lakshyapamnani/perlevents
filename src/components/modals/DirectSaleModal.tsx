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
  Upload,
  Plus,
  Trash2,
  Receipt,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { Attachment } from '../../types';
import { ImageUploadArea } from '../common/ImageUploadArea';

interface DirectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  'Other',
];

export const DirectSaleModal: React.FC<DirectSaleModalProps> = ({
  isOpen,
  onClose,
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
  const [referencePhotos, setReferencePhotos] = useState<Attachment[]>([]);

  // Financials
  const [quotedAmount, setQuotedAmount] = useState<number>(350000);
  const [discount, setDiscount] = useState<number>(0);
  const [advanceRequested, setAdvanceRequested] = useState<number>(150000);
  const [advanceReceived, setAdvanceReceived] = useState<number>(150000);
  const [paymentTerms, setPaymentTerms] = useState(
    '50% advance on booking, balance payable 48 hours prior to event.'
  );
  const [createInvoice, setCreateInvoice] = useState(true);

  // Vendor Assignments state
  const [assignedVendors, setAssignedVendors] = useState<
    Array<{ vendorId: string; category: string; requirements: string; quotedAmount: number }>
  >([]);

  // Validation feedback
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successEventId, setSuccessEventId] = useState<string | null>(null);

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

  // When banquet changes, update base price
  useEffect(() => {
    const b = banquets.find((item) => item.id === banquetId);
    if (b) {
      setQuotedAmount(b.basePrice);
      setAdvanceRequested(Math.round(b.basePrice * 0.5));
      setAdvanceReceived(Math.round(b.basePrice * 0.5));
    }
  }, [banquetId, banquets]);

  // Realtime Availability check whenever banquet, date, start/end time changes
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

  const handleAddVendorRow = () => {
    const firstVendor = vendors[0];
    if (firstVendor) {
      setAssignedVendors([
        ...assignedVendors,
        {
          vendorId: firstVendor.id,
          category: firstVendor.categories[0] || 'General',
          requirements: '',
          quotedAmount: 0,
        },
      ]);
    }
  };

  const handleRemoveVendorRow = (index: number) => {
    setAssignedVendors(assignedVendors.filter((_, i) => i !== index));
  };

  const handleVendorFieldChange = (index: number, field: string, value: any) => {
    const copy = [...assignedVendors];
    copy[index] = { ...copy[index], [field]: value };
    if (field === 'vendorId') {
      const match = vendors.find((v) => v.id === value);
      if (match) copy[index].category = match.categories[0] || 'General';
    }
    setAssignedVendors(copy);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Form validation
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
    if (quotedAmount < 0 || discount < 0 || advanceReceived < 0) {
      setGeneralError('Financial amounts cannot be negative.');
      return;
    }
    if (discount > quotedAmount) {
      setGeneralError('Discount cannot exceed the total quoted amount.');
      return;
    }

    setSubmitting(true);

    const result = createDirectSale({
      client: {
        id: clientMode === 'existing' ? selectedClientId : undefined,
        fullName: clientName,
        primaryPhone: clientPhone,
        whatsApp: clientWhatsApp || clientPhone,
        email: clientEmail,
        address: clientAddress,
      },
      event: {
        name: eventName,
        eventType,
        banquetId,
        date,
        startTime,
        endTime,
        guestCount,
        requirements,
        specialInstructions,
        managerId: managerId || undefined,
        referencePhotos,
      },
      financials: {
        quotedAmount,
        discount,
        advanceRequested,
        advanceReceived,
        paymentTerms,
      },
      vendorAssignments: assignedVendors,
      createInvoice,
      convertedFromLeadId: preselectedLead?.id,
    });

    setSubmitting(false);

    if (result.success && result.event) {
      setSuccessEventId(result.event.id);
    } else {
      setGeneralError(result.error || 'Failed to create booking.');
    }
  };

  const finalAmount = Math.max(0, quotedAmount - discount);
  const remainingBalance = Math.max(0, finalAmount - advanceReceived);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
              <span>Create Direct Sale & Banquet Booking</span>
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Validated against real-time banquet availability with setup/cleanup buffer prevention.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successEventId ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Booking & Direct Sale Confirmed!
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
              Event <strong>{eventName}</strong> has been successfully booked at{' '}
              <strong>{banquets.find((b) => b.id === banquetId)?.name}</strong> for{' '}
              <strong>{date}</strong>. Time slot is locked and confirmed.
            </p>
            <div className="flex justify-center gap-3 pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
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
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setClientMode('existing')}
                    className={`px-3 py-1 rounded-md font-medium ${
                      clientMode === 'existing'
                        ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    Existing Client
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClientMode('new');
                      setSelectedClientId('');
                    }}
                    className={`px-3 py-1 rounded-md font-medium ${
                      clientMode === 'new'
                        ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    + New Client
                  </button>
                </div>
              </div>

              {clientMode === 'existing' && (
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Select Client
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Ananya & Kabir Malhotra"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Primary Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
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
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="City, Area, House number"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>
            </div>

            {/* SECTION B: EVENT & REAL-TIME AVAILABILITY */}
            <div className="space-y-3 border-b border-stone-200 dark:border-stone-800 pb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Section B: Event Schedule & Banquet Availability
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Event Title / Occasion *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. Malhotra & Kapoor Grand Wedding Reception"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Event Type *
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Banquet Hall *
                  </label>
                  <select
                    value={banquetId}
                    onChange={(e) => setBanquetId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                  >
                    {banquets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Cap: {b.capacity} | Base: {formatCurrency(b.basePrice)})
                      </option>
                    ))}
                  </select>
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
                    Expected Guest Count *
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
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Assigned Operations Manager
                  </label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="">-- Assign Manager (Optional) --</option>
                    {users
                      .filter((u) => u.role === 'manager')
                      .map((m) => (
                        <option key={m.uid} value={m.uid}>
                          {m.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Concurrency Conflict Status Callout */}
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
                      Slot is <strong>AVAILABLE</strong> with required 60 min setup/cleanup buffers.
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

              {/* Event Reference Photos Upload */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                <ImageUploadArea
                  label="Stage & Decor Reference Photos (Moodboard)"
                  description="Upload client reference photos, floral designs, stage dimensions, or floor plans."
                  attachments={referencePhotos}
                  onChange={setReferencePhotos}
                  compact={true}
                />
              </div>
            </div>

            {/* SECTION D: VENDOR COORDINATION */}
            <div className="space-y-3 border-b border-stone-200 dark:border-stone-800 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Section D: Vendor Assignments
                  </h3>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    Pre-assign vendors for direct WhatsApp coordination and operational checklists.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVendorRow}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Vendor</span>
                </button>
              </div>

              {assignedVendors.length === 0 ? (
                <div className="p-3 text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-lg text-center">
                  No vendors assigned yet. Click "Assign Vendor" to coordinate decorators, catering, sound, etc.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedVendors.map((av, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                    >
                      <div>
                        <label className="block text-[10px] text-stone-600 dark:text-stone-400">Vendor</label>
                        <select
                          value={av.vendorId}
                          onChange={(e) => handleVendorFieldChange(idx, 'vendorId', e.target.value)}
                          className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                        >
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.businessName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-600 dark:text-stone-400">Category</label>
                        <input
                          type="text"
                          list="direct-sale-vendor-categories"
                          value={av.category}
                          onChange={(e) => handleVendorFieldChange(idx, 'category', e.target.value)}
                          className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                        />
                        <datalist id="direct-sale-vendor-categories">
                          {vendorCategories.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-600 dark:text-stone-400">Requirements</label>
                        <input
                          type="text"
                          value={av.requirements}
                          onChange={(e) => handleVendorFieldChange(idx, 'requirements', e.target.value)}
                          placeholder="Specific deliverables"
                          className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] text-stone-600 dark:text-stone-400">Quoted (₹)</label>
                          <input
                            type="number"
                            value={av.quotedAmount}
                            onChange={(e) => handleVendorFieldChange(idx, 'quotedAmount', Number(e.target.value))}
                            className="w-full p-1.5 text-xs rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 tabular-nums"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVendorRow(idx)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded mt-3"
                          title="Remove vendor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION E: FINANCIALS & INVOICE GENERATION */}
            <div className="space-y-3 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Section E: Financials & Advance Payment
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Total Quoted Tariff (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quotedAmount}
                    onChange={(e) => setQuotedAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Approved Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Advance Requested (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={advanceRequested}
                    onChange={(e) => setAdvanceRequested(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Actual Advance Received (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={advanceReceived}
                    onChange={(e) => setAdvanceReceived(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400"
                  />
                </div>
              </div>

              {/* Financial Calculation Summary Box */}
              <div className="p-3 bg-stone-100 dark:bg-stone-800/60 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-stone-600 dark:text-stone-400 block text-[10px]">Net Quoted</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(quotedAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-600 dark:text-stone-400 block text-[10px]">Final Sale Total</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                    {formatCurrency(finalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-600 dark:text-stone-400 block text-[10px]">Advance Recorded</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(advanceReceived)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-600 dark:text-stone-400 block text-[10px]">Remaining Balance</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={createInvoice}
                    onChange={(e) => setCreateInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Generate official client invoice immediately</span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || Boolean(conflictError)}
                className={`px-6 py-2.5 text-xs font-semibold text-white rounded-lg transition-all shadow-sm ${
                  conflictError
                    ? 'bg-stone-400 cursor-not-allowed'
                    : 'bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600'
                }`}
              >
                {submitting ? 'Verifying & Reserving...' : 'Confirm Booking & Save Direct Sale'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
