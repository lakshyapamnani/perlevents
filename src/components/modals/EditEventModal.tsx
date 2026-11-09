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
  Pencil,
  Camera,
  Tag,
  Save,
  Phone,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { Attachment, EventRecord, BookingStatus, UserProfile } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ImageUploadArea } from '../common/ImageUploadArea';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventRecord | null;
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

const EVENT_STATUSES: Array<{ value: BookingStatus; label: string }> = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'tentative', label: 'Tentative / Hold' },
  { value: 'in_progress', label: 'In Progress (Active)' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const { banquets, updateEventDetails } = useData();
  const { currentUser, allUsersList: users = [] } = useAuth();

  // Form State
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [banquetId, setBanquetId] = useState('');
  const [salespersonId, setSalespersonId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('23:30');
  const [guestCount, setGuestCount] = useState<number>(100);
  const [status, setStatus] = useState<BookingStatus>('confirmed');

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');

  // Requirements & Notes
  const [requirements, setRequirements] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Financials
  const [quotedAmount, setQuotedAmount] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [advanceRequested, setAdvanceRequested] = useState<number | ''>('');
  const [advanceReceived, setAdvanceReceived] = useState<number | ''>('');
  const [paymentTerms, setPaymentTerms] = useState('');

  // Decoration & Setup Photos
  const [referencePhotos, setReferencePhotos] = useState<Attachment[]>([]);

  // Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Prepopulate form when event changes or modal opens
  useEffect(() => {
    if (event) {
      setName(event.name || '');
      setEventType(event.eventType || 'Wedding');
      setBanquetId(event.banquetId || '');
      setSalespersonId(event.salespersonId || currentUser?.uid || '');
      setManagerId(event.managerId || '');
      setDate(event.date || '');
      setStartTime(event.startTime || '18:00');
      setEndTime(event.endTime || '23:30');
      setGuestCount(event.guestCount || 100);
      setStatus(event.status || 'confirmed');

      setClientName(event.clientName || '');
      setClientPhone(event.clientPhone || '');
      setClientWhatsApp(event.clientWhatsApp || event.clientPhone || '');

      setRequirements(event.requirements || '');
      setSpecialInstructions(event.specialInstructions || '');

      setQuotedAmount(event.quotedAmount !== undefined ? event.quotedAmount : '');
      setDiscount(event.discount !== undefined ? event.discount : '');
      setAdvanceRequested(event.advanceRequested !== undefined ? event.advanceRequested : '');
      setAdvanceReceived(event.advanceReceived !== undefined ? event.advanceReceived : '');
      setPaymentTerms(event.paymentTerms || 'Standard payment terms apply.');

      setReferencePhotos(Array.isArray(event.referencePhotos) ? [...event.referencePhotos] : []);

      setError(null);
      setSuccessMsg(null);
    }
  }, [event, isOpen, currentUser]);

  if (!isOpen || !event) return null;

  // Real-time calculations
  const numQuoted = Number(quotedAmount) || 0;
  const numDiscount = Number(discount) || 0;
  const finalAmount = Math.max(0, numQuoted - numDiscount);
  const numAdvanceRec = Number(advanceReceived) || 0;
  const numAdvanceReq = Number(advanceRequested) || 0;
  const remainingBalance = Math.max(0, finalAmount - numAdvanceRec);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError('Event title / occasion is required.');
      return;
    }
    if (!banquetId) {
      setError('Please select a banquet venue.');
      return;
    }
    if (!date) {
      setError('Event date is required.');
      return;
    }
    if (!clientName.trim()) {
      setError('Client name is required.');
      return;
    }
    if (!clientPhone.trim()) {
      setError('Client phone number is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = updateEventDetails(event.id, {
        name: name.trim(),
        eventType,
        banquetId,
        salespersonId: salespersonId || undefined,
        managerId: managerId || undefined,
        date,
        startTime,
        endTime,
        guestCount: Number(guestCount) || 100,
        status,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientWhatsApp: (clientWhatsApp.trim() || clientPhone.trim()),
        requirements: requirements.trim(),
        specialInstructions: specialInstructions.trim(),
        quotedAmount: numQuoted,
        discount: numDiscount,
        finalAmount,
        advanceRequested: numAdvanceReq,
        advanceReceived: numAdvanceRec,
        remainingBalance,
        paymentTerms,
        referencePhotos,
      });

      if (res.success) {
        setSuccessMsg('Event details, pricing, and decoration pictures updated successfully!');
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setError(res.error || 'Failed to update event.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shadow-inner">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Edit Event Details</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Update venue, date/timing, client info, setup pictures, or pricing for {event.name}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SECTION A: EVENT SPECIFICS & VENUE */}
          <div className="space-y-3 border-b border-stone-200 dark:border-stone-800 pb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Section A: Event Title, Venue & Schedule</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Event Title / Occasion *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Royal Wedding & Reception"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
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

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Banquet Venue *
                </label>
                <select
                  required
                  value={banquetId}
                  onChange={(e) => setBanquetId(e.target.value)}
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
                  Start & End Time *
                </label>
                <div className="grid grid-cols-2 gap-2">
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
                  Booking Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BookingStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                >
                  {EVENT_STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Assigned Salesperson
                </label>
                <select
                  value={salespersonId}
                  onChange={(e) => setSalespersonId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                >
                  <optgroup label="Sales Executives">
                    {users
                      .filter((u: UserProfile) => u.isActive && u.role === 'salesperson')
                      .map((u: UserProfile) => (
                        <option key={u.uid} value={u.uid}>
                          {u.fullName} (Salesperson)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Management / Admins">
                    {users
                      .filter((u: UserProfile) => u.isActive && (u.role === 'admin' || u.role === 'manager'))
                      .map((u: UserProfile) => (
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                >
                  <option value="">-- No specific manager (Visible to All) --</option>
                  <optgroup label="Operations Managers">
                    {users
                      .filter((u: UserProfile) => u.isActive && u.role === 'manager')
                      .map((u: UserProfile) => (
                        <option key={u.uid} value={u.uid}>
                          {u.fullName} (Operations Manager)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Management / Admins">
                    {users
                      .filter((u: UserProfile) => u.isActive && u.role === 'admin')
                      .map((u: UserProfile) => (
                        <option key={u.uid} value={u.uid}>
                          {u.fullName} (Admin)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION B: CLIENT PROFILE */}
          <div className="space-y-3 border-b border-stone-200 dark:border-stone-800 pb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Section B: Client Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Rohan Sharma"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Primary Mobile Number *
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
            </div>
          </div>

          {/* SECTION C: REQUIREMENTS & SETUP */}
          <div className="space-y-3 border-b border-stone-200 dark:border-stone-800 pb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Section C: Setup Requirements & Special Instructions</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Event Requirements & Setup Specifications
                </label>
                <textarea
                  rows={3}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Detail decor themes, floral arches, stage dimensions, catering requirements..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Special Instructions / Internal Notes
                </label>
                <textarea
                  rows={3}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Special client requests, VIP guest arrivals, security precautions..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          </div>

          {/* SECTION D: DECORATION & REFERENCE PICTURES */}
          <div className="space-y-3 border-b border-stone-200 dark:border-stone-800 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Section D: Decoration Pictures (Shown in Invoice)</span>
                </h3>
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  Upload decoration pictures (stage, mandap, floral decor, lighting theme). These will appear directly on the booking invoice.
                </p>
              </div>
              {referencePhotos.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {referencePhotos.length} photo{referencePhotos.length > 1 ? 's' : ''} uploaded
                </span>
              )}
            </div>

            <ImageUploadArea
              label="Upload Event Decoration Pictures"
              description="Upload pictures from your computer or phone, or paste image URLs to include in the client's invoice."
              attachments={referencePhotos}
              onChange={setReferencePhotos}
              maxPhotos={8}
            />
          </div>

          {/* SECTION E: FINANCIALS & TARIFF */}
          <div className="space-y-3 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Section E: Financials, Pricing & Payment Terms</span>
              </h3>
              <span className="text-[11px] text-stone-500 font-medium">
                Syncs with sales and invoices
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Total Quoted Tariff (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={quotedAmount}
                  onChange={(e) => setQuotedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Discount (₹)
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
                  Advance Received (₹)
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
                  Calculated Balance Due
                </label>
                <div className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 font-bold tabular-nums">
                  {formatCurrency(remainingBalance)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Advance Requested / Down Payment (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={advanceRequested}
                  onChange={(e) => setAdvanceRequested(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Advance on booking, balance payable prior to event."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Event...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
