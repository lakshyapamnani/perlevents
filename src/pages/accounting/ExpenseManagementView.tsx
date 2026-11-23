import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  Truck,
  FileText,
  CreditCard,
  X,
  Paperclip,
  ShieldAlert,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ExpenseRecord, ExpenseCategory, PaymentMode } from '../../types/accounting';
import { formatCurrency, formatDate } from '../../utils/formatters';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Decoration',
  'Catering',
  'Photography',
  'Videography',
  'Lighting',
  'Sound and DJ',
  'Floral',
  'Furniture',
  'Transportation',
  'Staff Salary',
  'Marketing',
  'Maintenance',
  'Electricity',
  'Rent',
  'Office Expenses',
  'Cleaning',
  'Security',
  'Other',
];

const PAYMENT_MODES: PaymentMode[] = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Card',
  'Cheque',
  'Other',
];

interface ExpenseManagementViewProps {
  isRecordModalOpen?: boolean;
  setIsRecordModalOpen?: (open: boolean) => void;
}

export const ExpenseManagementView: React.FC<ExpenseManagementViewProps> = ({
  isRecordModalOpen: controlledModalOpen,
  setIsRecordModalOpen: setControlledModalOpen,
}) => {
  const { expenseRecords, recordExpense, reverseTransaction, banquets, events, vendors, bankAccounts } = useData();

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen;
  const setIsModalOpen = setControlledModalOpen || setInternalModalOpen;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBanquet, setSelectedBanquet] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Reversal Modal State
  const [reversalTarget, setReversalTarget] = useState<ExpenseRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formBanquetId, setFormBanquetId] = useState(banquets[0]?.id || '');
  const [formEventId, setFormEventId] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Decoration');
  const [formVendorId, setFormVendorId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formTaxAmount, setFormTaxAmount] = useState<number>(0);
  const [formPaymentStatus, setFormPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partially Paid'>('Paid');
  const [formPaymentMode, setFormPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [formBankAccountId, setFormBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [formRefNumber, setFormRefNumber] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenseRecords.filter((exp) => {
      if (selectedBanquet !== 'all' && exp.banquetId !== selectedBanquet) return false;
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && exp.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        exp.expenseId.toLowerCase().includes(q) ||
        (exp.vendorName && exp.vendorName.toLowerCase().includes(q)) ||
        (exp.description && exp.description.toLowerCase().includes(q)) ||
        (exp.referenceNumber && exp.referenceNumber.toLowerCase().includes(q))
      );
    });
  }, [expenseRecords, selectedBanquet, selectedCategory, selectedStatus, searchQuery]);

  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.status !== 'Reversed')
      .reduce((sum, e) => sum + e.totalAmount, 0);
  }, [filteredExpenses]);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than zero.');
      return;
    }

    const b = banquets.find((item) => item.id === formBanquetId);
    const evt = events.find((item) => item.id === formEventId);
    const v = vendors.find((item) => item.id === formVendorId);
    const bank = bankAccounts.find((item) => item.id === formBankAccountId);

    const res = recordExpense({
      date: formDate,
      banquetId: formBanquetId,
      banquetName: b?.name || 'Grand Pearl Banquet',
      eventId: formEventId || undefined,
      eventName: evt?.name,
      category: formCategory,
      vendorId: formVendorId || undefined,
      vendorName: v?.businessName,
      description: formDescription.trim() || `${formCategory} expense`,
      amount: formAmount,
      taxAmount: formTaxAmount,
      paymentStatus: formPaymentStatus,
      paymentMode: formPaymentMode,
      bankAccountId: formPaymentStatus === 'Paid' ? formBankAccountId : undefined,
      bankAccountName: formPaymentStatus === 'Paid' ? bank?.accountName : undefined,
      referenceNumber: formRefNumber || undefined,
      invoiceNumber: formInvoiceNumber || undefined,
      attachmentUrl: formAttachmentUrl || undefined,
      notes: formNotes || undefined,
    });

    if (res.success) {
      setIsModalOpen(false);
      setFormAmount(0);
      setFormTaxAmount(0);
      setFormDescription('');
      setFormRefNumber('');
      setFormInvoiceNumber('');
      setFormAttachmentUrl('');
      setFormNotes('');
    } else {
      setFormError(res.error || 'Failed to record expense.');
    }
  };

  const handleExecuteReversal = () => {
    if (!reversalTarget || !reversalReason.trim()) {
      setReversalError('A valid reason for expense reversal is required.');
      return;
    }

    const res = reverseTransaction('expense', reversalTarget.id, reversalReason.trim());
    if (res.success) {
      setReversalTarget(null);
      setReversalReason('');
      setReversalError(null);
    } else {
      setReversalError(res.error || 'Failed to reverse expense entry.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span>Expense Management & Disbursements</span>
          </h2>
          <p className="text-xs text-stone-500">
            Record direct vendor costs, catering, decor, staff compensation, utilities, and operating overheads.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Expense Entry</span>
        </button>
      </div>

      {/* Filter & Metric Bar */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by expense ID, vendor, description, or reference..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs font-mono font-bold text-red-800 dark:text-red-300 flex items-center justify-between md:justify-start gap-2">
            <span className="text-[11px] font-sans font-medium text-red-700 dark:text-red-400">Total Filtered Expenses:</span>
            <span>{formatCurrency(totalExpenseAmount)}</span>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
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
            <option value="all">All Expense Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
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

      {/* Expenses Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Expense ID & Date</th>
                <th className="py-3 px-4">Category & Description</th>
                <th className="py-3 px-4">Banquet & Vendor</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-stone-500">
                    No expense records found. Click "+ Record Expense Entry" to record direct or operating costs.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const isReversed = exp.status === 'Reversed';
                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors ${
                        isReversed ? 'opacity-60 bg-stone-100/50 dark:bg-stone-950/40' : ''
                      }`}
                    >
                      {/* ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <span>{exp.expenseId}</span>
                          {exp.attachmentUrl && (
                            <span title="Receipt attached">
                              <Paperclip className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500">{formatDate(exp.date)}</div>
                      </td>

                      {/* Category & Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800 dark:text-stone-200">
                          {exp.category}
                        </div>
                        <div className="text-[11px] text-stone-500 truncate max-w-xs">
                          {exp.description}
                        </div>
                      </td>

                      {/* Banquet & Vendor */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{exp.banquetName}</span>
                        </div>
                        {exp.vendorName && (
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <Truck className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate">{exp.vendorName}</span>
                          </div>
                        )}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800 dark:text-stone-200">
                          {exp.paymentMode} ({exp.paymentStatus})
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {exp.bankAccountName || 'Direct'}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className={isReversed ? 'line-through text-stone-400' : 'text-red-600 dark:text-red-400'}>
                          - {formatCurrency(exp.totalAmount)}
                        </span>
                        {exp.taxAmount > 0 && (
                          <div className="text-[10px] text-stone-400 font-normal">
                            (incl. GST ₹{exp.taxAmount})
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          exp.status === 'Posted'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : exp.status === 'Pending Approval'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-400'
                        }`}>
                          {exp.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {!isReversed && (
                          <button
                            onClick={() => setReversalTarget(exp)}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[11px] font-medium flex items-center gap-1 ml-auto transition-colors"
                            title="Reverse posted expense"
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

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Record Expense Entry
                  </h3>
                  <p className="text-xs text-stone-500">
                    Direct vendor costs and operating expenditures with automatic threshold check
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

            <form onSubmit={handleCreateExpense} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
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
                    Expense Date <span className="text-red-500">*</span>
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
                    Base Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>

                {/* Tax Amount */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    GST / Tax Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formTaxAmount || ''}
                    onChange={(e) => setFormTaxAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 4500"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
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

                {/* Vendor (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Beneficiary Vendor
                  </label>
                  <select
                    value={formVendorId}
                    onChange={(e) => setFormVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  >
                    <option value="">-- Direct Operational Expense --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.businessName} ({v.categories.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formPaymentStatus}
                    onChange={(e) => setFormPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  >
                    <option value="Paid">Paid Immediately</option>
                    <option value="Unpaid">Unpaid (Accrual)</option>
                    <option value="Partially Paid">Partially Paid</option>
                  </select>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Payment Mode
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

                {/* Account */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Disbursed From Account
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
                    Vendor Bill / Ref Number
                  </label>
                  <input
                    type="text"
                    value={formRefNumber}
                    onChange={(e) => setFormRefNumber(e.target.value)}
                    placeholder="e.g. BILL-9921 or UTR-77212"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Description & Purpose <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Details of goods, services, or operating expense incurred..."
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
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Post Expense Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-md overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Reverse Expense Entry
                </h3>
                <p className="text-[11px] text-stone-500">
                  Expense ID: {reversalTarget.expenseId} • {formatCurrency(reversalTarget.totalAmount)}
                </p>
              </div>
            </div>

            {reversalError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs">
                {reversalError}
              </div>
            )}

            <div className="text-xs text-stone-600 dark:text-stone-400">
              Reversing this expense will restore {formatCurrency(reversalTarget.totalAmount)} back to the organization book balances and preserve full audit history.
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
                placeholder="State the reason (e.g. duplicate bill, incorrect amount, vendor issued credit note)..."
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
