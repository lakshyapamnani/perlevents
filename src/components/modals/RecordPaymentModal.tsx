import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { X, DollarSign, CheckCircle2, AlertCircle, PlusCircle, MinusCircle } from 'lucide-react';
import { PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEventId?: string;
  preselectedClientId?: string;
  preselectedBalance?: number;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedEventId,
  preselectedClientId,
  preselectedBalance,
}) => {
  const { clients, events, invoices, recordPayment } = useData();
  const { currentUser } = useAuth();

  const [clientId, setClientId] = useState(preselectedClientId || clients[0]?.id || '');
  const [eventId, setEventId] = useState(preselectedEventId || '');
  const [entryType, setEntryType] = useState<'payment' | 'refund'>('payment');
  const [amount, setAmount] = useState<number>(preselectedBalance || 50000);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const client = clients.find((c) => c.id === clientId);
  const clientEvents = events.filter((e) => e.clientId === clientId);
  const clientInvoices = invoices.filter((i) => i.clientId === clientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError(
        entryType === 'payment'
          ? 'Payment amount must be greater than zero.'
          : 'Deduction amount must be greater than zero.'
      );
      return;
    }
    if (!client) {
      setError('Please select a client.');
      return;
    }

    const linkedInvoice = clientInvoices.find((i) => i.eventId === eventId);

    const res = recordPayment({
      clientId,
      clientName: client.fullName,
      eventId: eventId || undefined,
      invoiceId: linkedInvoice?.id,
      amount,
      type: entryType,
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to record payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
            {entryType === 'payment' ? (
              <DollarSign className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            ) : (
              <MinusCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            )}
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {entryType === 'payment' ? 'Record Client Payment' : 'Subtract / Deduct from Payment'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Switcher: Add Payment vs Subtract from Payment */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setEntryType('payment');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                entryType === 'payment'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Payment</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryType('refund');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                entryType === 'refund'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              <span>Subtract from Payment</span>
            </button>
          </div>

          {entryType === 'refund' && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-[11px] text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <MinusCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                <strong>Deduction / Refund Entry:</strong> This will subtract from payments received and increase the client&apos;s outstanding balance.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Client *
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setEventId('');
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.primaryPhone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Link to Event (Optional)
            </label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="">-- General Account Payment --</option>
              {clientEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} (Bal: {formatCurrency(e.remainingBalance)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {entryType === 'payment' ? 'Amount Received (₹) *' : 'Amount to Deduct / Refund (₹) *'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold tabular-nums ${
                  entryType === 'payment'
                    ? 'border-stone-300 dark:border-stone-700 focus:border-emerald-700 focus:ring-emerald-700'
                    : 'border-rose-300 dark:border-rose-700 focus:border-rose-600 focus:ring-rose-600 text-rose-700 dark:text-rose-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {entryType === 'payment' ? 'Payment Date *' : 'Deduction Date *'}
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {entryType === 'payment' ? 'Payment Method *' : 'Refund / Payout Method *'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="cash">Cash Receipt / Payout</option>
                <option value="card">Credit / Debit Card</option>
                <option value="other">Cheque / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Reference / UTR Number
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR99882211"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Internal Ledger Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                entryType === 'payment'
                  ? 'e.g. Received via company HDFC account'
                  : 'e.g. Refund issued for package adjustment / overpayment'
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors ${
                entryType === 'payment'
                  ? 'bg-emerald-800 hover:bg-emerald-900'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {entryType === 'payment' ? (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Payment Entry</span>
                </>
              ) : (
                <>
                  <MinusCircle className="w-4 h-4" />
                  <span>Subtract from Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
