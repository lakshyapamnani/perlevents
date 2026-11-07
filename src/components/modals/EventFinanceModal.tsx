import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  DollarSign,
  Calendar,
  CreditCard,
  Receipt,
  Printer,
  Download,
  Send,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, generateWhatsAppUrl } from '../../utils/formatters';
import { PaymentMethod } from '../../types';
import {
  downloadEventInvoicePDF,
  downloadPaymentReceiptPDF,
  openPrintableInvoiceWindow,
} from '../../utils/pdfReceiptGenerator';

interface EventFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onOpenInvoice?: (eventId: string) => void;
  onInspectEvent?: (eventId: string) => void;
}

export const EventFinanceModal: React.FC<EventFinanceModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onOpenInvoice,
  onInspectEvent,
}) => {
  const { events, payments, banquets, clients, recordPayment, invoices, settings } = useData();
  const { currentUser } = useAuth();

  const event = events.find((e) => e.id === eventId);
  const client = clients.find((c) => c.id === event?.clientId);
  const banquet = banquets.find((b) => b.id === event?.banquetId);
  const eventPayments = payments.filter((p) => p.eventId === eventId);
  const linkedInvoice = invoices.find((i) => i.eventId === eventId);

  // Payment form state
  const [amountToAdd, setAmountToAdd] = useState<string>('');
  const [receiptNo, setReceiptNo] = useState<string>(() => {
    return `PX-${480 + (eventPayments.length || 0) + 1}`;
  });
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('Payment received towards event booking');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // WhatsApp notification state
  const [whatsappMode, setWhatsappMode] = useState<'received' | 'reminder'>('received');
  const [whatsappNumber, setWhatsappNumber] = useState<string>(
    event?.clientWhatsApp || event?.clientPhone || client?.whatsApp || client?.primaryPhone || ''
  );

  if (!isOpen || !event) return null;

  const totalFees = Number(event.finalAmount) || 0;
  const totalPaid = Number(event.advanceReceived) || 0;
  const remaining = Math.max(0, Number(event.remainingBalance) || (totalFees - totalPaid));
  const downPayment = eventPayments[0] ? Number(eventPayments[0].amount) || 0 : (totalPaid > 0 ? totalPaid : 0);

  // Generate prefilled WhatsApp message
  const getWhatsAppMessage = () => {
    if (whatsappMode === 'received') {
      return `Dear ${event.clientName || 'Client'},\n\nFee payment received for *${event.name}* at *${event.banquetName}*.\n\n• *Total Event Fees:* ${formatCurrency(totalFees)}\n• *Total Paid:* ${formatCurrency(totalPaid)}\n• *Remaining Balance:* ${formatCurrency(remaining)}\n• *Receipt No:* ${receiptNo}\n• *Payment Mode:* ${paymentMode.replace('_', ' ').toUpperCase()}\n• *Event Date:* ${formatDate(event.date)}\n\nThank you for choosing Pearl Experience.\nPearlexperiences Pvt. Ltd.`;
    }
    return `Dear ${event.clientName || 'Client'},\n\nThis is a friendly reminder regarding the outstanding balance for your upcoming celebration *${event.name}* at *${event.banquetName}* on ${formatDate(event.date)}.\n\n• *Total Event Fees:* ${formatCurrency(totalFees)}\n• *Total Received:* ${formatCurrency(totalPaid)}\n• *Remaining Due Balance:* ${formatCurrency(remaining)}\n\nPlease arrange for the payment prior to event execution.\n\nThank you,\nPearl Experience Operations Team`;
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const numericAmount = Number(amountToAdd);
    if (!numericAmount || numericAmount <= 0) {
      setFormError('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (!currentUser) {
      setFormError('Authentication required to record payments.');
      return;
    }

    const res = recordPayment({
      clientId: event.clientId,
      clientName: event.clientName,
      eventId: event.id,
      invoiceId: linkedInvoice?.id,
      amount: numericAmount,
      type: 'payment',
      paymentDate,
      paymentMethod: paymentMode,
      referenceNumber: receiptNo.trim(),
      notes: paymentNotes.trim() || undefined,
    });

    if (res.success) {
      const createdPayment = res.payment || {
        id: `pay_${Date.now()}`,
        clientId: event.clientId,
        clientName: event.clientName,
        eventId: event.id,
        invoiceId: linkedInvoice?.id,
        amount: numericAmount,
        type: 'payment' as const,
        paymentDate,
        paymentMethod: paymentMode,
        referenceNumber: receiptNo.trim() || `PX-${480 + (eventPayments.length || 0) + 1}`,
        notes: paymentNotes.trim(),
        recordedBy: currentUser.uid,
        recordedByName: currentUser.fullName,
        createdAt: new Date().toISOString(),
      };

      // Automatically download the official payment receipt voucher PDF with logo and client name
      try {
        downloadPaymentReceiptPDF({
          payment: createdPayment,
          event,
          client,
          settings,
          totalFees,
          totalPaid: totalPaid + numericAmount,
          remainingBalance: Math.max(0, remaining - numericAmount),
        });
      } catch (e) {
        console.error('Failed to trigger automatic receipt PDF download', e);
      }

      setSuccessMsg(
        `Successfully recorded ₹${numericAmount.toLocaleString('en-IN')}! Official Receipt #${receiptNo} downloaded.`
      );
      setAmountToAdd('');
      setReceiptNo(`PX-${480 + (eventPayments.length + 1) + 1}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setFormError(res.error || 'Failed to record payment.');
    }
  };

  const handleSendWhatsApp = () => {
    if (!whatsappNumber) {
      alert('Please provide a valid client phone or WhatsApp number.');
      return;
    }
    const url = generateWhatsAppUrl(whatsappNumber, getWhatsAppMessage());
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/70 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-800 dark:text-emerald-400 shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-white tracking-tight">
                  {event.name}
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60">
                  {event.eventType}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {event.banquetName} · Client: <span className="text-stone-900 dark:text-stone-200 font-semibold">{event.clientName}</span> ({event.clientPhone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                downloadEventInvoicePDF({
                  event,
                  client,
                  invoice: linkedInvoice,
                  payments: eventPayments,
                  settings,
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              title="Download Full Tax Invoice & Receipt PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Invoice PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                openPrintableInvoiceWindow({
                  event,
                  client,
                  invoice: linkedInvoice,
                  payments: eventPayments,
                  settings,
                });
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-700 transition-colors"
              title="Print / Save As PDF"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
              <span>Print</span>
            </button>

            {onInspectEvent && (
              <button
                type="button"
                onClick={() => onInspectEvent(event.id)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-700 transition-colors"
                title="Open Event Detail Page"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Event Ops</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-white rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Top 5 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Total Fees</span>
              <div className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white mt-1 tabular-nums">
                {formatCurrency(totalFees)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Down Payment</span>
              <div className="text-lg sm:text-xl font-extrabold text-sky-600 dark:text-sky-400 mt-1 tabular-nums">
                {formatCurrency(downPayment)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Total Paid</span>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {formatCurrency(totalPaid)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Remaining</span>
              <div className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-500 mt-1 tabular-nums">
                {formatCurrency(remaining)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Adjusted EMI / Due</span>
              <div className="text-lg sm:text-xl font-extrabold text-sky-600 dark:text-sky-400 mt-1 tabular-nums">
                {formatCurrency(remaining)}
              </div>
            </div>
          </div>

          {/* Add Payment Amount Card */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950 border border-stone-700/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold tracking-tight text-white">
                  Add Payment Amount
                </h3>
              </div>
              <span className="text-[11px] font-medium text-emerald-300 bg-stone-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                Deducts directly from unpaid to paid balance
              </span>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-700/80 rounded-xl text-xs text-red-200 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-600/80 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Payment Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-200 mb-1.5">
                    Add Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={amountToAdd}
                      onChange={(e) => setAmountToAdd(e.target.value)}
                      placeholder="Amount"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-stone-950 border border-stone-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl text-xs font-bold text-white placeholder-stone-500 outline-none transition-colors tabular-nums"
                    />
                  </div>
                </div>

                {/* Receipt No */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-200 mb-1.5">
                    Receipt No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    placeholder="480"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl text-xs font-semibold text-white placeholder-stone-500 outline-none transition-colors font-mono"
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-200 mb-1.5">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl text-xs font-semibold text-white outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                {/* Payment Mode */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-200 mb-1.5">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl text-xs font-semibold text-white outline-none transition-colors"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Optional Notes */}
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-stone-200 mb-1.5">
                    Remarks / Memo
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Stage & catering installment"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl text-xs text-white placeholder-stone-500 outline-none transition-colors"
                  />
                </div>

                {/* Record Payment Button */}
                <div className="sm:col-span-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[40px]"
                  >
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Payment History Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white tracking-tight">
                Payment History ({eventPayments.length})
              </h3>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                Total Cleared: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(totalPaid)}</span>
              </span>
            </div>

            {eventPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-950/70 rounded-2xl border border-stone-200 dark:border-stone-800">
                No payment receipts logged yet. Use the form above to record the initial token/down payment.
              </div>
            ) : (
              <div className="space-y-2.5">
                {eventPayments.map((p, idx) => {
                  const isFirst = idx === 0;
                  const isRefund = p.type === 'refund';
                  const receiptLabel = p.referenceNumber ? `Receipt: ${p.referenceNumber}` : `Receipt: PX-REC-${idx + 1}`;

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-emerald-600/60 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-stone-900 dark:text-white">
                            {isFirst ? 'Down Payment' : isRefund ? 'Refund / Adjustment' : 'Payment'} · <span className="text-emerald-700 dark:text-emerald-400 font-mono">{receiptLabel}</span>
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                              isRefund
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
                            }`}
                          >
                            {isFirst ? 'PAID AT SETUP' : isRefund ? 'REFUND' : 'CLEARED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {formatDate(p.paymentDate)} · {p.notes || `Credit received via ${p.paymentMethod.replace('_', ' ').toUpperCase()}`}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className={`text-sm font-extrabold tabular-nums ${isRefund ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isRefund ? '-' : '+'}{formatCurrency(p.amount)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              downloadPaymentReceiptPDF({
                                payment: p,
                                event,
                                client,
                                settings,
                                totalFees,
                                totalPaid,
                                remainingBalance: remaining,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/80 rounded-lg transition-colors border border-emerald-300 dark:border-emerald-800/60 text-[11px] font-semibold"
                            title="Download Official Receipt Voucher PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Receipt</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              openPrintableInvoiceWindow({
                                event,
                                client,
                                invoice: linkedInvoice,
                                payments: eventPayments,
                                settings,
                              });
                            }}
                            className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                            title="Print Document"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Send WhatsApp Fees Notification */}
          <div className="p-5 sm:p-6 rounded-3xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white tracking-tight">
                  Send WhatsApp Fees Notification
                </h3>
              </div>

              {/* Toggle Pills: Payment Received vs Fee Due Reminder */}
              <div className="flex items-center gap-1.5 bg-stone-200/80 dark:bg-stone-900 p-1 rounded-xl border border-stone-300 dark:border-stone-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setWhatsappMode('received')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    whatsappMode === 'received'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Payment Received
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsappMode('reminder')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    whatsappMode === 'reminder'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Fee Due Reminder
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:border-emerald-600 rounded-xl text-xs text-stone-900 dark:text-white outline-none font-mono"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Clicking send opens WhatsApp click-to-chat directly.
                </span>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                    Payment Confirmation Message
                  </label>
                  <span className="text-[10px] text-stone-400 italic">Editable before sending</span>
                </div>
                <textarea
                  rows={4}
                  value={getWhatsAppMessage()}
                  onChange={() => {}}
                  readOnly
                  className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-800 dark:text-stone-200 font-sans outline-none leading-relaxed resize-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1da850] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Send WhatsApp Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

