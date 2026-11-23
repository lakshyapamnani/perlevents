import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  ArrowDownRight,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  User,
  CreditCard,
  X,
  Paperclip,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { IncomeRecord, IncomeCategory, PaymentMode } from '../../types/accounting';
import { formatCurrency, formatDate } from '../../utils/formatters';

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Event Booking Income',
  'Advance Payments',
  'Final Customer Payments',
  'Banquet Rental Income',
  'Additional Services',
  'Cancellation Charges',
  'Other Income',
];

const PAYMENT_MODES: PaymentMode[] = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Card',
  'Cheque',
  'Other',
];

interface IncomeManagementViewProps {
  isRecordModalOpen?: boolean;
  setIsRecordModalOpen?: (open: boolean) => void;
}

export const IncomeManagementView: React.FC<IncomeManagementViewProps> = ({
  isRecordModalOpen: controlledModalOpen,
  setIsRecordModalOpen: setControlledModalOpen,
}) => {
  const { incomeRecords, recordIncome, reverseTransaction, banquets, events, clients, bankAccounts } = useData();

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen;
  const setIsModalOpen = setControlledModalOpen || setInternalModalOpen;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBanquet, setSelectedBanquet] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Reverse Transaction Modal State
  const [reversalTarget, setReversalTarget] = useState<IncomeRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Form State for Recording Income
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formCategory, setFormCategory] = useState<IncomeCategory>('Advance Payments');
  const [formBanquetId, setFormBanquetId] = useState(banquets[0]?.id || '');
  const [formEventId, setFormEventId] = useState<string>('');
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState<string>('');
  const [formPaymentMode, setFormPaymentMode] = useState<PaymentMode>('UPI');
  const [formBankAccountId, setFormBankAccountId] = useState<string>(bankAccounts[0]?.id || '');
  const [formRefNumber, setFormRefNumber] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredIncome = useMemo(() => {
    return incomeRecords.filter((inc) => {
      if (selectedBanquet !== 'all' && inc.banquetId !== selectedBanquet) return false;
      if (selectedCategory !== 'all' && inc.category !== selectedCategory) return false;
      if (selectedMode !== 'all' && inc.paymentMode !== selectedMode) return false;
      if (selectedStatus !== 'all' && inc.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        inc.transactionId.toLowerCase().includes(q) ||
        (inc.customerName && inc.customerName.toLowerCase().includes(q)) ||
        (inc.invoiceNumber && inc.invoiceNumber.toLowerCase().includes(q)) ||
        (inc.referenceNumber && inc.referenceNumber.toLowerCase().includes(q)) ||
        (inc.description && inc.description.toLowerCase().includes(q))
      );
    });
  }, [incomeRecords, selectedBanquet, selectedCategory, selectedMode, selectedStatus, searchQuery]);

  // Total Metric
  const totalIncomeValue = useMemo(() => {
    return filteredIncome
      .filter((i) => i.status !== 'Reversed')
      .reduce((sum, i) => sum + i.amount, 0);
  }, [filteredIncome]);

  // Handle Event Selection -> Auto fill Banquet, Customer, Invoice
  const handleSelectEvent = (eventId: string) => {
    setFormEventId(eventId);
    const evt = events.find((e) => e.id === eventId);
    if (evt) {
      setFormBanquetId(evt.banquetId);
      setFormCustomerId(evt.clientId);
      setFormInvoiceNumber(`PX-INV-2026-${evt.id.slice(-4).toUpperCase()}`);
      if (!formDescription) {
        setFormDescription(`Payment for ${evt.name} (${evt.clientName})`);
      }
    }
  };

  const handleCreateIncome = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formAmount <= 0) {
      setFormError('Please enter a valid amount greater than zero.');
      return;
    }

    const b = banquets.find((item) => item.id === formBanquetId);
    const evt = events.find((item) => item.id === formEventId);
    const client = clients.find((item) => item.id === formCustomerId);
    const bank = bankAccounts.find((item) => item.id === formBankAccountId);

    const res = recordIncome({
      date: formDate,
      amount: formAmount,
      category: formCategory,
      banquetId: formBanquetId,
      banquetName: b?.name || 'Grand Pearl Banquet',
      eventId: formEventId || undefined,
      eventName: evt?.name,
      customerId: formCustomerId || undefined,
      customerName: client?.fullName || evt?.clientName,
      invoiceNumber: formInvoiceNumber || undefined,
      paymentMode: formPaymentMode,
      bankAccountId: formBankAccountId || undefined,
      bankAccountName: bank?.accountName,
      referenceNumber: formRefNumber || undefined,
      description: formDescription.trim() || `${formCategory} via ${formPaymentMode}`,
      attachmentUrl: formAttachmentUrl || undefined,
    });

    if (res.success) {
      setIsModalOpen(false);
      setFormAmount(0);
      setFormRefNumber('');
      setFormDescription('');
      setFormAttachmentUrl('');
    } else {
      setFormError(res.error || 'Failed to record income entry.');
    }
  };

  const handleExecuteReversal = () => {
    if (!reversalTarget || !reversalReason.trim()) {
      setReversalError('A valid reason for transaction reversal is required.');
      return;
    }

    const res = reverseTransaction('income', reversalTarget.id, reversalReason.trim());
    if (res.success) {
      setReversalTarget(null);
      setReversalReason('');
      setReversalError(null);
    } else {
      setReversalError(res.error || 'Failed to reverse transaction.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Income Management & Cash Receipts</span>
          </h2>
          <p className="text-xs text-stone-500">
            Record, audit, and track event booking receipts, advances, rentals, and miscellaneous inflows.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Income Entry</span>
        </button>
      </div>

      {/* Filter & Metric Bar */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by transaction ID, customer, invoice, or reference..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          {/* Total Value Pill */}
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between md:justify-start gap-2">
            <span className="text-[11px] font-sans font-medium text-emerald-700 dark:text-emerald-400">Total Filtered Income:</span>
            <span>{formatCurrency(totalIncomeValue)}</span>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <select
            value={selectedBanquet}
            onChange={(e) => setSelectedBanquet(e.target.value)}
            className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-700 dark:text-stone-300"
          >
            <option value="all">All Banquets</option>
            {banquets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-700 dark:text-stone-300"
          >
            <option value="all">All Categories</option>
            {INCOME_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-700 dark:text-stone-300"
          >
            <option value="all">All Payment Modes</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-700 dark:text-stone-300"
          >
            <option value="all">All Statuses</option>
            <option value="posted">Posted</option>
            <option value="pending approval">Pending Approval</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Transaction ID & Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Banquet & Customer</th>
                <th className="py-3 px-4">Payment Mode & Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredIncome.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-stone-500">
                    No income records match the criteria. Click "+ Record Income Entry" to record receipts.
                  </td>
                </tr>
              ) : (
                filteredIncome.map((inc) => {
                  const isReversed = inc.status === 'Reversed';
                  return (
                    <tr
                      key={inc.id}
                      className={`hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors ${
                        isReversed ? 'opacity-60 bg-stone-100/50 dark:bg-stone-950/40' : ''
                      }`}
                    >
                      {/* ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <span>{inc.transactionId}</span>
                          {inc.attachmentUrl && (
                            <span title="Attachment attached">
                              <Paperclip className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500">{formatDate(inc.date)}</div>
                      </td>

                      {/* Category & Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800 dark:text-stone-200">
                          {inc.category}
                        </div>
                        <div className="text-[11px] text-stone-500 truncate max-w-xs">
                          {inc.description}
                        </div>
                      </td>

                      {/* Banquet & Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{inc.banquetName}</span>
                        </div>
                        {inc.customerName && (
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate">{inc.customerName}</span>
                            {inc.invoiceNumber && <span className="font-mono text-[10px]">({inc.invoiceNumber})</span>}
                          </div>
                        )}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800 dark:text-stone-200">
                          {inc.paymentMode}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {inc.referenceNumber ? `Ref: ${inc.referenceNumber}` : inc.bankAccountName || 'Direct'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className={isReversed ? 'line-through text-stone-400' : 'text-emerald-700 dark:text-emerald-400'}>
                          + {formatCurrency(inc.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inc.status === 'Posted'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : inc.status === 'Reversed'
                            ? 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {inc.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {!isReversed && (
                          <button
                            onClick={() => setReversalTarget(inc)}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[11px] font-medium flex items-center gap-1 ml-auto transition-colors"
                            title="Reverse posted income transaction"
                          >
                            <RotateCcw className="w-3 h-3 text-red-500" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Record Incoming Payment Entry
                  </h3>
                  <p className="text-xs text-stone-500">
                    Creates balanced double-entry vouchers and updates customer balances
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncome} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Receipt Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Amount Received (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs font-bold text-stone-900 dark:text-stone-100 focus:border-emerald-600"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Income Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as IncomeCategory)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  >
                    {INCOME_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Linked Event / Booking (Optional) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Link to Event / Booking (Auto-populates Venue & Customer)
                  </label>
                  <select
                    value={formEventId}
                    onChange={(e) => handleSelectEvent(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  >
                    <option value="">-- Direct Income (Not linked to specific booking) --</option>
                    {events
                      .filter((e) => e.status !== 'cancelled')
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} • {e.clientName} ({e.banquetName} - {formatDate(e.date)}) - Due: {formatCurrency(e.remainingBalance)}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Banquet Venue */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Banquet Venue <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formBanquetId}
                    onChange={(e) => setFormBanquetId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  >
                    {banquets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deposit Bank / Cash Account */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Deposit To Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formBankAccountId}
                    onChange={(e) => setFormBankAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  >
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Transaction / UPI / Cheque Ref Number
                  </label>
                  <input
                    type="text"
                    value={formRefNumber}
                    onChange={(e) => setFormRefNumber(e.target.value)}
                    placeholder="e.g. UPI-2026112001 or CHQ-88912"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Invoice Number (if issued)
                  </label>
                  <input
                    type="text"
                    value={formInvoiceNumber}
                    onChange={(e) => setFormInvoiceNumber(e.target.value)}
                    placeholder="e.g. PX-INV-2026-104"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Description & Receipt Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Payment particulars, breakdown, or customer remarks..."
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Post Income Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-md overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Reverse Income Transaction
                </h3>
                <p className="text-[11px] text-stone-500">
                  Transaction ID: {reversalTarget.transactionId} • {formatCurrency(reversalTarget.amount)}
                </p>
              </div>
            </div>

            {reversalError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs">
                {reversalError}
              </div>
            )}

            <div className="text-xs text-stone-600 dark:text-stone-400">
              This action will mark the transaction as <strong>Reversed</strong> and deduct {formatCurrency(reversalTarget.amount)} from the deposited bank account. Reversal entries are permanently preserved in the audit log.
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Reason for Reversal <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="State the reason (e.g. cheque bounce, duplicate entry, client cancelled payment)..."
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-3.5 py-1.5 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReversal}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
