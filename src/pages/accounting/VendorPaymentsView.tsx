import React, { useState, useMemo } from 'react';
import {
  Truck,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  ArrowUpRight,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  CreditCard,
  X,
  History,
  Clock,
  Eye,
  Check,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { VendorBill, VendorPaymentRecord, PaymentMode } from '../../types/accounting';
import { accountingEngine, VendorFinancialProfile } from '../../services/accountingEngine';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PAYMENT_MODES: PaymentMode[] = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Card',
  'Cheque',
  'Other',
];

interface VendorPaymentsViewProps {
  onOpenCalculator?: () => void;
}

export const VendorPaymentsView: React.FC<VendorPaymentsViewProps> = () => {
  const {
    vendors,
    vendorBills,
    vendorPayments,
    recordVendorBill,
    recordVendorPayment,
    reverseTransaction,
    banquets,
    events,
    bankAccounts,
  } = useData();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBanquet, setSelectedBanquet] = useState('all');
  const [activeTab, setActiveTab] = useState<'vendors' | 'bills' | 'payments'>('vendors');

  // Modals state
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedVendorForPayment, setSelectedVendorForPayment] = useState<string>('');
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<string>('');
  const [inspectVendor, setInspectVendor] = useState<VendorFinancialProfile | null>(null);

  // Reversal state
  const [reversalTarget, setReversalTarget] = useState<VendorPaymentRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState('');

  // Bill Form state
  const [billVendorId, setBillVendorId] = useState('');
  const [billBanquetId, setBillBanquetId] = useState('');
  const [billEventId, setBillEventId] = useState('');
  const [billCategory, setBillCategory] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billDueDate, setBillDueDate] = useState('');
  const [billTotalAmount, setBillTotalAmount] = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [billError, setBillError] = useState('');
  const [billSuccess, setBillSuccess] = useState('');

  // Payment Form state
  const [payVendorId, setPayVendorId] = useState('');
  const [payBillId, setPayBillId] = useState('');
  const [payBanquetId, setPayBanquetId] = useState('');
  const [payEventId, setPayEventId] = useState('');
  const [payType, setPayType] = useState<'Advance' | 'Partial' | 'Final Settlement'>('Partial');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('Bank Transfer');
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payReferenceNumber, setPayReferenceNumber] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  // Dynamic profiles
  const vendorProfiles: VendorFinancialProfile[] = useMemo(() => {
    return accountingEngine.getVendorFinancialProfiles();
  }, [vendors, vendorBills, vendorPayments, events]);

  // Overall totals
  const totalAgreed = useMemo(
    () => vendorProfiles.reduce((sum, v) => sum + v.totalAgreedAmount, 0),
    [vendorProfiles]
  );
  const totalBilled = useMemo(
    () => vendorBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0),
    [vendorBills]
  );
  const totalPaid = useMemo(
    () =>
      vendorPayments
        .filter((p) => p.status !== 'Reversed')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [vendorPayments]
  );
  const totalPending = useMemo(
    () => vendorProfiles.reduce((sum, v) => sum + v.pendingBalance, 0),
    [vendorProfiles]
  );

  // Filtered vendors list
  const filteredVendors = useMemo(() => {
    return vendorProfiles.filter((v) => {
      const matchesSearch =
        v.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.serviceCategory.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [vendorProfiles, searchQuery]);

  // Filtered bills list
  const filteredBills = useMemo(() => {
    return vendorBills.filter((b) => {
      const matchesSearch =
        b.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBanquet = selectedBanquet === 'all' || b.banquetId === selectedBanquet;
      return matchesSearch && matchesBanquet;
    });
  }, [vendorBills, searchQuery, selectedBanquet]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return vendorPayments.filter((p) => {
      const matchesSearch =
        p.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesBanquet = selectedBanquet === 'all' || p.banquetId === selectedBanquet;
      return matchesSearch && matchesBanquet;
    });
  }, [vendorPayments, searchQuery, selectedBanquet]);

  // Handle opening payment modal for specific vendor
  const handleOpenPaymentForVendor = (vendorId: string, billId?: string) => {
    setPayVendorId(vendorId);
    if (billId) {
      setPayBillId(billId);
      const b = vendorBills.find((bill) => bill.id === billId);
      if (b) {
        setPayAmount(String(b.pendingAmount));
        setPayBanquetId(b.banquetId || '');
        setPayEventId(b.eventId || '');
      }
    } else {
      setPayBillId('');
      setPayAmount('');
    }
    setPayError('');
    setPaySuccess('');
    setIsPaymentModalOpen(true);
  };

  // Submit Record Vendor Bill
  const handleRecordBill = (e: React.FormEvent) => {
    e.preventDefault();
    setBillError('');
    setBillSuccess('');

    if (!billVendorId) {
      setBillError('Please select a vendor.');
      return;
    }
    const amountNum = parseFloat(billTotalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setBillError('Please enter a valid bill amount.');
      return;
    }

    const v = vendors.find((vend) => vend.id === billVendorId);
    const bq = banquets.find((b) => b.id === billBanquetId);
    const ev = events.find((item) => item.id === billEventId);

    const res = recordVendorBill({
      vendorId: billVendorId,
      vendorName: v?.businessName || 'Vendor',
      banquetId: billBanquetId || undefined,
      banquetName: bq?.name || undefined,
      eventId: billEventId || undefined,
      eventName: ev?.name || undefined,
      category: billCategory || v?.categories?.[0] || 'General Services',
      billNumber: billNumber || `BILL-${Date.now().toString().slice(-6)}`,
      billDate: billDate,
      dueDate: billDueDate || billDate,
      totalAmount: amountNum,
      notes: billNotes,
    });

    if (res.success) {
      setBillSuccess('Vendor bill recorded successfully.');
      setTimeout(() => {
        setIsBillModalOpen(false);
        setBillSuccess('');
        setBillVendorId('');
        setBillTotalAmount('');
        setBillNumber('');
        setBillNotes('');
      }, 1000);
    } else {
      setBillError(res.error || 'Failed to record bill.');
    }
  };

  // Submit Record Vendor Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');

    if (!payVendorId) {
      setPayError('Please select a vendor.');
      return;
    }
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPayError('Please enter a valid payment amount.');
      return;
    }

    const v = vendors.find((vend) => vend.id === payVendorId);
    const bq = banquets.find((b) => b.id === payBanquetId);
    const ev = events.find((item) => item.id === payEventId);
    const selectedBank = bankAccounts.find((acc) => acc.id === payBankAccountId);

    const res = recordVendorPayment({
      vendorId: payVendorId,
      vendorName: v?.businessName || 'Vendor',
      billId: payBillId || undefined,
      banquetId: payBanquetId || undefined,
      banquetName: bq?.name || undefined,
      eventId: payEventId || undefined,
      eventName: ev?.name || undefined,
      paymentType: payType,
      amount: amountNum,
      paymentMode: payMode,
      bankAccountId: payBankAccountId || undefined,
      bankAccountName: selectedBank ? `${selectedBank.accountName} (${selectedBank.bankName || selectedBank.accountType})` : undefined,
      referenceNumber: payReferenceNumber,
      paymentDate: payDate,
      notes: payNotes,
    });

    if (res.success) {
      setPaySuccess('Vendor payment recorded successfully.');
      setTimeout(() => {
        setIsPaymentModalOpen(false);
        setPaySuccess('');
        setPayVendorId('');
        setPayBillId('');
        setPayAmount('');
        setPayReferenceNumber('');
        setPayNotes('');
      }, 1000);
    } else {
      setPayError(res.error || 'Failed to record payment.');
    }
  };

  // Handle Reversal
  const handleConfirmReversal = () => {
    if (!reversalTarget) return;
    if (!reversalReason.trim()) {
      setReversalError('Please provide a mandatory reason for reversal.');
      return;
    }

    const res = reverseTransaction('vendor_payment', reversalTarget.id, reversalReason.trim());
    if (res.success) {
      setReversalTarget(null);
      setReversalReason('');
      setReversalError('');
    } else {
      setReversalError(res.error || 'Reversal failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-600" />
            Vendor Payments & Accounts Payable
          </h2>
          <p className="text-sm text-stone-600">
            Manage vendor bills, record advances & partial payments, and track outstanding supplier balances.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setBillError('');
              setBillSuccess('');
              setIsBillModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-semibold transition-all border border-stone-300 shadow-sm"
          >
            <FileText className="h-4 w-4 text-stone-600" />
            Record Vendor Bill
          </button>
          <button
            onClick={() => {
              setPayVendorId('');
              setPayBillId('');
              setPayAmount('');
              setPayError('');
              setPaySuccess('');
              setIsPaymentModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-sm font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Agreed / Quoted
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">{formatCurrency(totalAgreed)}</p>
          <span className="text-xs text-stone-600 mt-1 block">Contracted event services</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Bills Invoiced
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">{formatCurrency(totalBilled)}</p>
          <span className="text-xs text-stone-600 mt-1 block">
            {vendorBills.length} recorded supplier invoices
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Amount Paid
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{formatCurrency(totalPaid)}</p>
          <span className="text-xs text-stone-600 mt-1 block">
            Disbursed via bank / cash / UPI
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200/80 shadow-sm bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Pending Payables
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{formatCurrency(totalPending)}</p>
          <span className="text-xs text-rose-700 mt-1 block">Outstanding vendor liability</span>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 border-b md:border-b-0 pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'vendors'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Vendor Balances ({vendorProfiles.length})
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'bills'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Vendor Bills ({vendorBills.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'payments'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Payment History ({vendorPayments.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="h-4 w-4 text-stone-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vendor, bill or ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {activeTab !== 'vendors' && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-stone-600" />
                <select
                  value={selectedBanquet}
                  onChange={(e) => setSelectedBanquet(e.target.value)}
                  className="text-xs bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Banquets</option>
                  {banquets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Vendors Balances Table */}
        {activeTab === 'vendors' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3">Vendor / Supplier</th>
                  <th className="px-5 py-3">Service Category</th>
                  <th className="px-5 py-3 text-center">Events</th>
                  <th className="px-5 py-3 text-right">Agreed Value</th>
                  <th className="px-5 py-3 text-right">Billed Amount</th>
                  <th className="px-5 py-3 text-right">Paid Amount</th>
                  <th className="px-5 py-3 text-right">Pending Balance</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-stone-600">
                      No vendor financial records found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vp) => (
                    <tr key={vp.vendorId} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-900">{vp.vendorName}</div>
                        <div className="text-xs text-stone-600">ID: {vp.vendorId}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
                          {vp.serviceCategory}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-medium">
                        {vp.associatedEventsCount}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-stone-700">
                        {formatCurrency(vp.totalAgreedAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-stone-800">
                        {formatCurrency(vp.totalBilledAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
                        {formatCurrency(vp.totalPaidAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`font-bold ${
                            vp.pendingBalance > 0 ? 'text-rose-600' : 'text-stone-500'
                          }`}
                        >
                          {formatCurrency(vp.pendingBalance)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenPaymentForVendor(vp.vendorId)}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors"
                          >
                            Pay
                          </button>
                          <button
                            onClick={() => setInspectVendor(vp)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
                            title="Inspect Vendor Activity"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Vendor Bills Table */}
        {activeTab === 'bills' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3">Bill # / Date</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Banquet / Event</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">Total Amount</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Pending</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-stone-600">
                      No vendor bills recorded yet. Click "Record Vendor Bill" to add one.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-900">{b.billNumber}</div>
                        <div className="text-xs text-stone-600">
                          {formatDate(b.billDate)} {b.dueDate && `· Due ${formatDate(b.dueDate)}`}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-stone-900">{b.vendorName}</td>
                      <td className="px-5 py-3.5 text-xs text-stone-600">
                        {b.banquetName && <div className="font-medium text-stone-800">{b.banquetName}</div>}
                        {b.eventName && <div>{b.eventName}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-700">
                          {b.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-stone-900">
                        {formatCurrency(b.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-emerald-700">
                        {formatCurrency(b.paidAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-rose-600">
                        {formatCurrency(b.pendingAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            b.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {b.status !== 'Paid' && (
                          <button
                            onClick={() => handleOpenPaymentForVendor(b.vendorId, b.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                          >
                            Pay Bill
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Vendor Payments Table */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3">Txn ID / Date</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Payment Type</th>
                  <th className="px-5 py-3">Mode & Account</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Reference / Notes</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-stone-600">
                      No vendor payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-stone-50/70 transition-colors ${
                        p.status === 'Reversed' ? 'opacity-50 bg-stone-100/50' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-900">{p.transactionId}</div>
                        <div className="text-xs text-stone-600">{formatDate(p.paymentDate)}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-stone-900">{p.vendorName}</div>
                        {p.billNumber && (
                          <div className="text-xs text-stone-600">Bill: {p.billNumber}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-700">
                          {p.paymentType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-stone-600">
                        <div className="font-medium text-stone-800">{p.paymentMode}</div>
                        {p.bankAccountName && <div>{p.bankAccountName}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-stone-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-stone-600">
                        {p.referenceNumber && <div>Ref: {p.referenceNumber}</div>}
                        {p.notes && <div className="italic text-stone-600">{p.notes}</div>}
                        {p.reversalReason && (
                          <div className="text-rose-600 font-semibold mt-1">
                            Reversed: {p.reversalReason}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === 'Approved' || p.status === 'Posted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'Pending Approval'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {p.status !== 'Reversed' && (
                          <button
                            onClick={() => {
                              setReversalTarget(p);
                              setReversalReason('');
                              setReversalError('');
                            }}
                            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                            title="Reverse transaction"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reverse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Record Vendor Bill */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Record Vendor Bill
              </h3>
              <button
                onClick={() => setIsBillModalOpen(false)}
                className="p-1 rounded-lg text-stone-600 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordBill} className="mt-4 space-y-4">
              {billError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {billError}
                </div>
              )}
              {billSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {billSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Vendor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={billVendorId}
                  onChange={(e) => setBillVendorId(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName} ({v.categories?.join(', ') || 'Vendor'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Bill Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2024-001"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Total Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={billTotalAmount}
                    onChange={(e) => setBillTotalAmount(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Bill Date
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Banquet
                  </label>
                  <select
                    value={billBanquetId}
                    onChange={(e) => setBillBanquetId(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">General / None</option>
                    {banquets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Service Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Decoration, Catering"
                    value={billCategory}
                    onChange={(e) => setBillCategory(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  placeholder="Additional bill terms or description..."
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Vendor Payment */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-emerald-600" />
                Record Vendor Payment
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-stone-600 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              {payError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {payError}
                </div>
              )}
              {paySuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {paySuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Vendor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={payVendorId}
                  onChange={(e) => {
                    setPayVendorId(e.target.value);
                    setPayBillId('');
                  }}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bill Selection if any */}
              {payVendorId && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Link to Pending Bill (Optional)
                  </label>
                  <select
                    value={payBillId}
                    onChange={(e) => {
                      const billId = e.target.value;
                      setPayBillId(billId);
                      const b = vendorBills.find((bill) => bill.id === billId);
                      if (b) {
                        setPayAmount(String(b.pendingAmount));
                        setPayBanquetId(b.banquetId || '');
                        setPayEventId(b.eventId || '');
                      }
                    }}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Direct / Unlinked Payment</option>
                    {vendorBills
                      .filter((b) => b.vendorId === payVendorId && b.pendingAmount > 0)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.billNumber} · Pending: {formatCurrency(b.pendingAmount)} ({formatDate(b.billDate)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Payment Type
                  </label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as any)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Advance">Advance Payment</option>
                    <option value="Partial">Partial Payment</option>
                    <option value="Final Settlement">Final Settlement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Bank / Cash Account
                  </label>
                  <select
                    value={payBankAccountId}
                    onChange={(e) => setPayBankAccountId(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Default Cash/Bank</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} (Bal: {formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR12345678"
                    value={payReferenceNumber}
                    onChange={(e) => setPayReferenceNumber(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Banquet (Optional)
                  </label>
                  <select
                    value={payBanquetId}
                    onChange={(e) => setPayBanquetId(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">General / None</option>
                    {banquets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Event (Optional)
                  </label>
                  <select
                    value={payEventId}
                    onChange={(e) => setPayEventId(e.target.value)}
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">None</option>
                    {events
                      .filter((e) => !payBanquetId || e.banquetId === payBanquetId)
                      .slice(0, 30)
                      .map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name} ({formatDate(ev.date)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Remarks for this disbursement..."
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                >
                  Disburse & Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: Inspect Vendor Financial Profile */}
      {inspectVendor && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{inspectVendor.vendorName}</h3>
                  <p className="text-xs text-stone-600">Category: {inspectVendor.serviceCategory}</p>
                </div>
                <button
                  onClick={() => setInspectVendor(null)}
                  className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Vendor metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-xs text-stone-600 block">Total Agreed</span>
                  <span className="text-base font-bold text-stone-900">
                    {formatCurrency(inspectVendor.totalAgreedAmount)}
                  </span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-xs text-stone-600 block">Total Invoiced</span>
                  <span className="text-base font-bold text-stone-900">
                    {formatCurrency(inspectVendor.totalBilledAmount)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-xs text-emerald-800 block">Total Disbursed</span>
                  <span className="text-base font-bold text-emerald-700">
                    {formatCurrency(inspectVendor.totalPaidAmount)}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <span className="text-xs text-rose-800 block">Pending Balance</span>
                  <span className="text-base font-bold text-rose-700">
                    {formatCurrency(inspectVendor.pendingBalance)}
                  </span>
                </div>
              </div>

              {/* Payment history list */}
              <div>
                <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-emerald-600" />
                  Disbursement History ({inspectVendor.paymentHistory.length})
                </h4>
                {inspectVendor.paymentHistory.length === 0 ? (
                  <p className="text-xs text-stone-600 italic">No payments logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {inspectVendor.paymentHistory.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-stone-900">
                            {p.transactionId} · {formatDate(p.paymentDate)}
                          </div>
                          <div className="text-xs text-stone-600">
                            {p.paymentType} via {p.paymentMode}{' '}
                            {p.referenceNumber && `(Ref: ${p.referenceNumber})`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-stone-900">
                            {formatCurrency(p.amount)}
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold uppercase">
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setInspectVendor(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const vendId = inspectVendor.vendorId;
                  setInspectVendor(null);
                  handleOpenPaymentForVendor(vendId);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reversal Confirmation */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-rose-600" />
              Reverse Vendor Payment
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              You are reversing payment <strong>{reversalTarget.transactionId}</strong> of{' '}
              <strong>{formatCurrency(reversalTarget.amount)}</strong> to{' '}
              <strong>{reversalTarget.vendorName}</strong>. This will restore the vendor bill balance
              and credit the bank account.
            </p>

            {reversalError && (
              <div className="p-3 mt-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {reversalError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mandatory Reason for Reversal <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Reason for cancellation or error correction..."
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
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
