import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Printer,
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Sparkles,
  Download,
} from 'lucide-react';
import { Invoice, InvoiceItem, Attachment } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ImageUploadArea } from '../common/ImageUploadArea';
import { downloadEventInvoicePDF } from '../../utils/pdfReceiptGenerator';
import { DEFAULT_EVENT_SETUP_PHOTOS } from '../../assets/sampleEventPhotos';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceToView?: Invoice | null;
  preselectedEventId?: string;
  onOpenRecordPayment?: (eventId: string, clientId: string, balance: number) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceToView,
  preselectedEventId,
  onOpenRecordPayment,
}) => {
  const { events, clients, banquets, settings, saveInvoice, payments } = useData();
  const { currentUser } = useAuth();

  const isViewingExisting = Boolean(invoiceToView);

  // Form State
  const [selectedEventId, setSelectedEventId] = useState(
    invoiceToView?.eventId || preselectedEventId || events[0]?.id || ''
  );
  const [invoiceDate, setInvoiceDate] = useState(
    invoiceToView?.invoiceDate || new Date().toISOString().split('T')[0]
  );
  const [items, setItems] = useState<InvoiceItem[]>(
    invoiceToView?.items || [
      {
        id: `it_${Date.now()}_1`,
        description: 'Banquet Venue Hire & Facility Access',
        quantity: 1,
        unitPrice: 200000,
        total: 200000,
      },
      {
        id: `it_${Date.now()}_2`,
        description: 'Gourmet Catering Package',
        quantity: 250,
        unitPrice: 850,
        total: 212500,
      },
    ]
  );
  const [discount, setDiscount] = useState<number>(invoiceToView?.discount || 0);
  const [advanceRequested, setAdvanceRequested] = useState<number>(
    invoiceToView?.advanceRequested || 150000
  );
  const [actualAdvanceReceived, setActualAdvanceReceived] = useState<number>(
    invoiceToView?.actualAdvanceReceived || 0
  );
  const [paymentTerms, setPaymentTerms] = useState(
    invoiceToView?.paymentTerms ||
      '50% advance on contract confirmation. Remaining balance payable 48 hours prior to event execution.'
  );
  const [notes, setNotes] = useState(
    invoiceToView?.notes || 'Thank you for choosing PerlEvents for your milestone celebration.'
  );
  const [includePhotos, setIncludePhotos] = useState(
    invoiceToView?.includePhotosInPdf !== undefined ? invoiceToView.includePhotosInPdf : true
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    invoiceToView?.attachments || []
  );
  const [printMode, setPrintMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentEvent = events.find((e) => e.id === selectedEventId);
  const currentClient = clients.find((c) => c.id === currentEvent?.clientId);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const finalTotal = Math.max(0, subtotal - discount);
  const remainingBalance = Math.max(0, finalTotal - actualAdvanceReceived);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `it_${Date.now()}_${items.length + 1}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: 'description' | 'quantity' | 'unitPrice', val: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          updated.total = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
          return updated;
        }
        return item;
      })
    );
  };

  const handleSaveInvoice = (status: 'draft' | 'issued') => {
    if (!currentUser) return;
    if (!currentEvent) {
      setError('Please select an event to link this invoice to.');
      return;
    }

    const seq = settings.nextInvoiceSequence || 105;
    const invNumber =
      invoiceToView?.invoiceNumber || `${settings.invoiceNumberPrefix || 'PE-INV-2026-'}${seq}`;

    const inv: Invoice = {
      id: invoiceToView?.id || `inv_${Date.now()}`,
      invoiceNumber: invNumber,
      invoiceDate,
      clientId: currentEvent.clientId,
      clientName: currentEvent.clientName,
      clientPhone: currentEvent.clientPhone,
      clientEmail: currentClient?.email || '',
      clientAddress: currentClient?.address || '',
      eventId: currentEvent.id,
      eventName: currentEvent.name,
      eventType: currentEvent.eventType,
      banquetName: currentEvent.banquetName,
      eventDate: currentEvent.date,
      eventTime: `${currentEvent.startTime} - ${currentEvent.endTime}`,
      items,
      subtotal,
      discount,
      taxAmount: 0,
      finalTotal,
      advancePaymentRequired: advanceRequested > 0,
      advanceRequested,
      actualAdvanceReceived,
      remainingBalance,
      paymentTerms,
      notes,
      status:
        remainingBalance <= 0
          ? 'paid'
          : actualAdvanceReceived > 0
          ? 'partially_paid'
          : status,
      includePhotosInPdf: includePhotos,
      attachments,
      createdBy: invoiceToView?.createdBy || currentUser.uid,
      createdByName: invoiceToView?.createdByName || currentUser.fullName,
      createdAt: invoiceToView?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = saveInvoice(inv);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to save invoice.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header toolbar */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex items-center justify-between no-print">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
              <span>
                {invoiceToView ? `Invoice ${invoiceToView.invoiceNumber}` : 'Create New Invoice'}
              </span>
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Official GST-compliant hospitality invoice with decimal-safe financial calculations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {remainingBalance > 0 && onOpenRecordPayment && (
              <button
                type="button"
                onClick={() => {
                  onOpenRecordPayment(
                    currentEvent?.id || invoiceToView?.eventId || '',
                    currentClient?.id || invoiceToView?.clientId || '',
                    remainingBalance
                  );
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}
            <button
              onClick={() => {
                if (currentEvent) {
                  downloadEventInvoicePDF({
                    event: currentEvent,
                    client: currentClient,
                    invoice: invoiceToView || {
                      id: `inv_${Date.now()}`,
                      invoiceNumber: `${settings.invoiceNumberPrefix || 'PX-INV-2026-'}${settings.nextInvoiceSequence || 105}`,
                      invoiceDate,
                      clientId: currentEvent.clientId,
                      clientName: currentEvent.clientName,
                      clientPhone: currentEvent.clientPhone,
                      clientEmail: currentClient?.email,
                      clientAddress: currentClient?.address,
                      eventId: currentEvent.id,
                      eventName: currentEvent.name,
                      eventType: currentEvent.eventType,
                      banquetName: currentEvent.banquetName,
                      eventDate: currentEvent.date,
                      eventTime: `${currentEvent.startTime} - ${currentEvent.endTime}`,
                      items,
                      subtotal,
                      discount,
                      taxAmount: 0,
                      finalTotal,
                      advancePaymentRequired: advanceRequested > 0,
                      advanceRequested,
                      actualAdvanceReceived,
                      remainingBalance,
                      paymentTerms,
                      notes,
                      status: remainingBalance <= 0 ? 'paid' : actualAdvanceReceived > 0 ? 'partially_paid' : 'issued',
                      includePhotosInPdf: includePhotos,
                      attachments,
                      createdBy: currentUser?.uid || '',
                      createdByName: currentUser?.fullName || '',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                    payments: payments.filter((p) => p.eventId === currentEvent.id),
                    settings,
                  });
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white flex items-center gap-1.5 shadow-sm transition-colors"
              title="Download Tax Invoice & Receipt PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => setPrintMode(!printMode)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{printMode ? 'Edit Mode' : 'Print Preview'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Either Print Document or Edit Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs flex items-center gap-2 no-print">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {printMode ? (
            /* PRINT / PDF PREVIEW DOCUMENT LAYOUT */
            <div className="bg-white text-stone-900 p-8 rounded-xl shadow-sm border border-stone-200 max-w-3xl mx-auto space-y-6 font-sans">
              {/* Invoice Brand Header */}
              <div className="flex justify-between items-start border-b border-stone-200 pb-6">
                <div>
                  <img
                    src={settings.logoUrl || '/logo.png'}
                    alt={settings.name || 'Pearl Experience'}
                    className="max-h-16 max-w-[260px] object-contain mb-2"
                  />
                  <div className="text-xs text-stone-600 font-medium">
                    {settings.brandTagline || 'Luxury Banquets, Palatial Venues & Event Management'}
                  </div>
                  <div className="text-xs text-stone-600 mt-2 max-w-sm leading-relaxed">
                    {settings.address}
                    <br />
                    Phone: {settings.phone} | Email: {settings.email}
                    {settings.taxNumber && (
                      <div className="font-mono text-[11px] font-bold text-stone-900 mt-1">
                        GSTIN: {settings.taxNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                    Tax Invoice
                  </span>
                  <div className="text-xl font-mono font-bold text-stone-900 mt-1">
                    {invoiceToView?.invoiceNumber || `${settings.invoiceNumberPrefix}104`}
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    Date: {formatDate(invoiceDate)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-800 uppercase mt-1">
                    Status: {invoiceToView?.status || 'Issued'}
                  </div>
                </div>
              </div>

              {/* Bill To & Event Details */}
              <div className="grid grid-cols-2 gap-8 text-xs border-b border-stone-200 pb-6">
                <div>
                  <div className="font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Billed To:
                  </div>
                  <div className="font-bold text-sm text-stone-900">
                    {currentClient?.fullName || currentEvent?.clientName || 'Valued Client'}
                  </div>
                  <div className="text-stone-600 mt-1">
                    Phone: {currentClient?.primaryPhone || currentEvent?.clientPhone}
                  </div>
                  {currentClient?.email && (
                    <div className="text-stone-600">Email: {currentClient.email}</div>
                  )}
                  {currentClient?.address && (
                    <div className="text-stone-600 mt-0.5">{currentClient.address}</div>
                  )}
                </div>

                <div>
                  <div className="font-bold text-stone-500 uppercase tracking-wider mb-1">
                    Event Details:
                  </div>
                  <div className="font-semibold text-stone-900">
                    {currentEvent?.name || 'Milestone Celebration'}
                  </div>
                  <div className="text-stone-600 mt-1">
                    Venue: {currentEvent?.banquetName || 'Grand Crystal Ballroom'}
                  </div>
                  <div className="text-stone-600">
                    Date & Time: {formatDate(currentEvent?.date || '')} ({currentEvent?.startTime} - {currentEvent?.endTime})
                  </div>
                  <div className="text-stone-600">
                    Guest Count: {currentEvent?.guestCount || 300} Pax
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-stone-300 text-stone-600 font-bold uppercase tracking-wider">
                    <th className="py-2.5">Description</th>
                    <th className="py-2.5 text-center">Qty</th>
                    <th className="py-2.5 text-right">Unit Price</th>
                    <th className="py-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-3 font-medium text-stone-900">{it.description}</td>
                      <td className="py-3 text-center tabular-nums">{it.quantity}</td>
                      <td className="py-3 text-right tabular-nums">{formatCurrency(it.unitPrice)}</td>
                      <td className="py-3 text-right font-bold tabular-nums">
                        {formatCurrency(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="flex justify-end pt-4 border-t border-stone-200">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal:</span>
                    <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>Discount Applied:</span>
                      <span className="font-medium tabular-nums">- {formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-300">
                    <span>Final Total:</span>
                    <span className="tabular-nums">{formatCurrency(finalTotal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 pt-1">
                    <span>Advance Received:</span>
                    <span className="font-semibold text-emerald-800 tabular-nums">
                      {formatCurrency(actualAdvanceReceived)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-900 font-bold pt-1 border-t border-stone-200">
                    <span>Balance Due:</span>
                    <span className="text-amber-800 tabular-nums">{formatCurrency(remainingBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Terms, Payment Instructions & Official Signatory */}
              <div className="pt-6 border-t border-stone-200 grid grid-cols-12 gap-6 text-[11px] text-stone-600">
                <div className="col-span-12 sm:col-span-7 space-y-3">
                  <div>
                    <div className="font-bold uppercase text-stone-800 mb-1">Bank & Payment Instructions:</div>
                    <p className="leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-200 font-mono text-[10px] text-stone-700">
                      {settings.paymentInstructions}
                    </p>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-stone-800 mb-0.5">Payment Terms & Policy:</div>
                    <p className="leading-relaxed">{paymentTerms}</p>
                  </div>
                </div>

                {/* Official Signatory Box */}
                <div className="col-span-12 sm:col-span-5 flex flex-col justify-end items-center text-center p-3.5 rounded-xl border border-stone-200 bg-stone-50/60">
                  <span className="text-[10px] uppercase font-bold text-stone-500 mb-1">
                    For {settings.name || 'Pearlexperiences'} Pvt. Ltd.
                  </span>
                  <div className="h-14 flex items-center justify-center my-1">
                    {settings.signatureUrl ? (
                      <img
                        src={settings.signatureUrl}
                        alt="Authorized Signature"
                        className="max-h-12 max-w-[150px] object-contain"
                      />
                    ) : (
                      <span className="font-serif italic text-lg text-stone-800 tracking-wide select-none">
                        {settings.authorizedSignatoryName || 'Authorized Signatory'}
                      </span>
                    )}
                  </div>
                  <div className="w-36 border-t border-stone-800 my-1" />
                  <span className="font-bold text-stone-900 text-[11px]">
                    {settings.authorizedSignatoryName || 'Authorized Signatory'}
                  </span>
                  <span className="text-[9px] text-stone-500">
                    {settings.authorizedSignatoryTitle || 'Pearlexperiences Accounts'}
                  </span>
                  <span className="text-[8px] text-emerald-800 font-bold uppercase tracking-wider mt-0.5">
                    (Official Stamp & Signature)
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-stone-200 text-center text-[10px] text-stone-500">
                {settings.invoiceFooter}
              </div>

              {/* Attached Photos & Documents in PDF / Modal Preview */}
              {includePhotos && (() => {
                const combined = [
                  ...(attachments || []),
                  ...(currentEvent?.referencePhotos || []),
                  ...(currentClient?.referencePhotos || []),
                ];
                const photosToDisplay = combined.length > 0 ? combined : DEFAULT_EVENT_SETUP_PHOTOS;

                return (
                  <div className="pt-8 border-t border-stone-300 print-page-break space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                        <span>Event Setup & Reference Photos</span>
                        <span className="text-[11px] font-normal text-stone-500">({photosToDisplay.length})</span>
                      </h4>
                      <span className="text-[10px] text-stone-600">PerlEvents Verified Documentation</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {photosToDisplay.map((p, idx) => (
                        <div key={p.id || idx} className="border border-stone-200 rounded-lg p-2 bg-stone-50 text-left shadow-sm">
                          <img
                            src={p.url}
                            alt={p.name}
                            className="w-full h-28 object-cover rounded bg-stone-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-[11px] font-bold text-stone-900 mt-1.5 truncate">{p.name || 'Setup Photo'}</div>
                          {p.caption && <div className="text-[10px] text-stone-600 truncate">{p.caption}</div>}
                          {p.category && (
                            <span className="inline-block mt-1 text-[9px] uppercase font-semibold text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded">
                              {p.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* EDIT FORM VIEW */
            <div className="space-y-6">
              {/* Event Linker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Link to Event *
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                  >
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} · {e.clientName} ({formatDate(e.date)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Invoice Issue Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              {/* Line Items Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Itemized Charges
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 text-xs"
                    >
                      <div className="col-span-12 sm:col-span-6">
                        <label className="block text-[10px] text-stone-600 sm:hidden">Description</label>
                        <input
                          type="text"
                          required
                          value={it.description}
                          onChange={(e) => handleItemChange(it.id, 'description', e.target.value)}
                          placeholder="e.g. Hall Hire, DJ Sound Rigging, Dinner Buffet..."
                          className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] text-stone-600 sm:hidden">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(it.id, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-center tabular-nums"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] text-stone-600 sm:hidden">Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(it.id, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-right tabular-nums"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2 flex items-center justify-between">
                        <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                          {formatCurrency(it.total)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded"
                          disabled={items.length <= 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Discount (₹)
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
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
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
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Actual Advance Received (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={actualAdvanceReceived}
                    onChange={(e) => setActualAdvanceReceived(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums font-semibold text-emerald-700"
                  />
                </div>
              </div>

              {/* Live Arithmetic Summary Box */}
              <div className="p-4 bg-stone-100 dark:bg-stone-800/60 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400">Subtotal</div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(subtotal)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400">Final Total</div>
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                    {formatCurrency(finalTotal)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400">Received</div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(actualAdvanceReceived)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400">Balance Due</div>
                  <div className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                    {formatCurrency(remainingBalance)}
                  </div>
                </div>
              </div>

              {/* Invoice Image & Document Attachments */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                <ImageUploadArea
                  label="Invoice Photos & Document Attachments"
                  description="Upload proof of payment receipts, client approvals, banquet decor photos, or hall setup proof to append to this invoice."
                  attachments={attachments}
                  onChange={setAttachments}
                />
              </div>

              {/* Checkbox: Include Reference Photos in PDF */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={includePhotos}
                    onChange={(e) => setIncludePhotos(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Also include linked event reference photos in PDF Appendix</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInvoice('draft')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInvoice('issued')}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm"
                >
                  Issue Invoice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
