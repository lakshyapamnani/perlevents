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
  Utensils,
  Music,
  ShoppingBag,
  Plus,
  Trash2,
} from 'lucide-react';
import { Attachment, EventRecord, BookingStatus, UserProfile, InvoiceItem } from '../../types';
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

  // Billable Items State
  const [bookingItems, setBookingItems] = useState<InvoiceItem[]>([]);

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

      setBookingItems(
        Array.isArray(event.items) && event.items.length > 0
          ? event.items.map((it) => ({ ...it }))
          : []
      );

      setReferencePhotos(Array.isArray(event.referencePhotos) ? [...event.referencePhotos] : []);

      setError(null);
      setSuccessMsg(null);
    }
  }, [event, isOpen, currentUser]);

  const handleItemChange = (
    id: string,
    field: 'description' | 'quantity' | 'unitPrice',
    val: any
  ) => {
    setBookingItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newItem = { ...item, [field]: val };
          const qty = Number(newItem.quantity) || 0;
          const rate = Number(newItem.unitPrice) || 0;
          newItem.total = Math.round(qty * rate);
          return newItem;
        }
        return item;
      });
      const sum = updated.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
      if (sum > 0) {
        setQuotedAmount(sum);
      }
      return updated;
    });
  };

  const handleAddItem = (preset?: { description: string; quantity?: number; unitPrice?: number }) => {
    const selectedB = banquets.find((b) => b.id === banquetId);
    let desc = preset?.description || '';
    let qty = preset?.quantity !== undefined ? preset.quantity : 1;
    let rate = preset?.unitPrice !== undefined ? preset.unitPrice : 0;

    const newItem: InvoiceItem = {
      id: `it_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      description: desc,
      quantity: qty,
      unitPrice: rate,
      total: Math.round(qty * rate),
    };

    setBookingItems((prev) => {
      const updated = [...prev, newItem];
      const sum = updated.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
      if (sum > 0) {
        setQuotedAmount(sum);
      }
      return updated;
    });
  };

  const handleRemoveItem = (id: string) => {
    setBookingItems((prev) => {
      const updated = prev.filter((it) => it.id !== id);
      const sum = updated.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
      if (sum > 0) {
        setQuotedAmount(sum);
      }
      return updated;
    });
  };

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

    const validBookingItems = bookingItems
      .filter((it) => it.description.trim().length > 0)
      .map((it) => ({
        ...it,
        description: it.description.trim(),
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
        total: Math.round((Math.max(1, Number(it.quantity) || 1)) * (Math.max(0, Number(it.unitPrice) || 0))),
      }));

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
        items: validBookingItems,
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

          {/* SECTION E: BILLABLE ITEMS & PACKAGES (FOOD, VENUE, DECORATION, ETC.) */}
          <div className="space-y-3.5 border-b border-stone-200 dark:border-stone-800 pb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Section E: Billable Items & Packages</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Invoice & Receipt Breakdown
                  </span>
                </h3>
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  Update itemized services (Food / Catering per pax, Banquet hall hire, Decor, DJ). Quantity × Rate automatically calculates line totals and updates the invoice and payment receipts.
                </p>
              </div>
              {bookingItems.length > 0 && (
                <div className="text-right">
                  <div className="text-[10px] text-stone-400 uppercase font-medium">Items Subtotal</div>
                  <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(bookingItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Add Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mr-1">
                Quick Presets:
              </span>
              <button
                type="button"
                onClick={() =>
                  handleAddItem({
                    description: `Food & Catering Package (${guestCount || 100} Pax)`,
                    quantity: Number(guestCount) || 100,
                    unitPrice: 0,
                  })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition-colors shadow-2xs"
              >
                <Utensils className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>+ Food & Catering</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const bObj = banquets.find((b) => b.id === banquetId);
                  handleAddItem({
                    description: `${bObj?.name || 'Banquet'} Venue Hire & Facility Access`,
                    quantity: 1,
                    unitPrice: bObj?.basePrice || 0,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 transition-colors shadow-2xs"
              >
                <Building2 className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                <span>+ Banquet Hall Hire</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAddItem({
                    description: 'Stage Setup & Theme Floral Decoration',
                    quantity: 1,
                    unitPrice: 0,
                  })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-pink-50 dark:bg-pink-950/40 text-pink-900 dark:text-pink-200 border border-pink-200 dark:border-pink-800/60 hover:bg-pink-100 transition-colors shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-700 dark:text-pink-400" />
                <span>+ Decoration</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAddItem({
                    description: 'Sound System & Professional DJ Setup',
                    quantity: 1,
                    unitPrice: 0,
                  })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 transition-colors shadow-2xs"
              >
                <Music className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                <span>+ DJ & Sound</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>+ Add Custom Item</span>
              </button>
            </div>

            {/* Items List - DESKTOP VIEW (TABLE) */}
            <div className="hidden md:block">
              <div className="border border-stone-200 dark:border-stone-700/80 rounded-xl overflow-hidden shadow-2xs">
                <div className="grid grid-cols-12 gap-2 bg-stone-100/90 dark:bg-stone-800/80 px-3.5 py-2 text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-5">Item / Service Description *</div>
                  <div className="col-span-2 text-center">Quantity / Pax *</div>
                  <div className="col-span-2 text-right">Rate / Unit Price (₹) *</div>
                  <div className="col-span-2 text-right pr-2">Total Amount (₹)</div>
                </div>

                <div className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-900">
                  {bookingItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-400">
                      No custom billable items configured yet. Click presets above to add food, venue hire, or decor.
                    </div>
                  ) : (
                    bookingItems.map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                        <div className="col-span-1 text-center text-xs font-bold text-stone-400">
                          {idx + 1}
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            placeholder="e.g. Food & Catering Package (300 Pax)"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:border-emerald-600 outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                            placeholder="1"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-center font-semibold tabular-nums focus:border-emerald-600 outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice === 0 ? '' : item.unitPrice}
                              onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                              placeholder="0"
                              className="w-full pl-6 pr-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-right font-semibold tabular-nums focus:border-emerald-600 outline-none"
                            />
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-between pl-1">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(item.total)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Items List - MOBILE UI (STACKED CARDS FOR PHONES) */}
            <div className="block md:hidden space-y-3">
              {bookingItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-700">
                  No items configured. Tap a preset button above to add Food, Venue, or Decor.
                </div>
              ) : (
                bookingItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-700">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          Billable Item #{idx + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        Item / Package Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="e.g. Food & Catering Package (300 Pax)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:border-emerald-600 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          Quantity / Pax *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                          placeholder="1"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold tabular-nums focus:border-emerald-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          Rate / Unit Price (₹) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice === 0 ? '' : item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                            placeholder="0"
                            className="w-full pl-6 pr-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold tabular-nums text-right focus:border-emerald-600 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-700/60 bg-stone-50 dark:bg-stone-900/60 p-2.5 rounded-xl">
                      <span className="text-[11px] font-semibold text-stone-500">
                        Line Total ({item.quantity || 0} × ₹{(item.unitPrice || 0).toLocaleString('en-IN')})
                      </span>
                      <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Add Action & Auto-Sync Notification */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Billable Item</span>
              </button>

              <div className="text-[11px] text-stone-500 dark:text-stone-400 text-right">
                💡 Sum of billable items auto-updates the Total Quoted Tariff below.
              </div>
            </div>
          </div>

          {/* SECTION F: FINANCIALS & TARIFF */}
          <div className="space-y-3 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Section F: Financials, Pricing & Payment Terms</span>
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
