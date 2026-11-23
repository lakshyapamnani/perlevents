import React, { useState, useMemo } from 'react';
import {
  Landmark,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  CreditCard,
  X,
  Wallet,
  Smartphone,
  Check,
  History,
  Trash2,
  Edit3,
  User,
  Phone,
  Clock,
  ChevronRight,
  Receipt,
  BadgeAlert,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { BankAccount } from '../../types/accounting';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { EventFinanceModal } from '../../components/modals/EventFinanceModal';

export const CashBankView: React.FC = () => {
  const {
    bankAccounts,
    saveBankAccount,
    deleteBankAccount,
    payments,
    incomeRecords,
    expenseRecords,
    vendorPayments,
    partnerSettlements,
    events,
    clients,
    banquets,
  } = useData();

  // Search & filter for Accounts
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Search & filters for Event Receivables
  const [receivableSearch, setReceivableSearch] = useState('');
  const [selectedBanquet, setSelectedBanquet] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState<'pending' | 'all' | 'paid'>('pending');

  // Event Finance & Payment Modal State (Identical to Events tab)
  const [selectedFinanceEventId, setSelectedFinanceEventId] = useState<string | null>(null);

  // Add/Edit Account Modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<BankAccount['accountType']>('Bank Account');
  const [bankName, setBankName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [accError, setAccError] = useState('');
  const [accSuccess, setAccSuccess] = useState('');

  // Reconciliation Modal
  const [reconAccount, setReconAccount] = useState<BankAccount | null>(null);
  const [statementBalance, setStatementBalance] = useState('');
  const [reconDate, setReconDate] = useState(new Date().toISOString().split('T')[0]);
  const [reconNotes, setReconNotes] = useState('');
  const [reconError, setReconError] = useState('');
  const [reconSuccess, setReconSuccess] = useState('');

  // Delete Confirmation State
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  // Compute live inflows and outflows strictly from real Firebase records
  const liveInflowsOutflows = useMemo(() => {
    const cashIn =
      payments
        .filter((p) => (p.paymentMethod || '').toLowerCase() === 'cash' && p.type !== 'refund')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) +
      incomeRecords
        .filter((i) => i.paymentMode === 'Cash' && i.status !== 'Reversed')
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const cashOut = expenseRecords
      .filter((e) => e.paymentStatus === 'Paid' && e.paymentMode === 'Cash' && e.status !== 'Reversed')
      .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);

    const bankIn =
      payments
        .filter((p) => (p.paymentMethod || '').toLowerCase() !== 'cash' && p.type !== 'refund')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) +
      incomeRecords
        .filter((i) => i.paymentMode !== 'Cash' && i.status !== 'Reversed')
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const bankOut =
      expenseRecords
        .filter((e) => e.paymentStatus === 'Paid' && e.paymentMode !== 'Cash' && e.status !== 'Reversed')
        .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0) +
      vendorPayments
        .filter((vp) => vp.status !== 'Reversed')
        .reduce((sum, vp) => sum + (Number(vp.amount) || 0), 0) +
      partnerSettlements.reduce((sum, ps) => sum + (Number(ps.amountPaid) || 0), 0);

    return { cashIn, cashOut, bankIn, bankOut };
  }, [payments, incomeRecords, expenseRecords, vendorPayments, partnerSettlements]);

  // Dynamic accounts with real balances from Firebase
  const dynamicAccounts = useMemo(() => {
    return bankAccounts.map((acc) => {
      const isCash = acc.accountType === 'Cash in Hand' || acc.accountType === 'Petty Cash';
      const credits =
        acc.totalCredits > 0
          ? acc.totalCredits
          : isCash
          ? liveInflowsOutflows.cashIn
          : liveInflowsOutflows.bankIn;
      const debits =
        acc.totalDebits > 0
          ? acc.totalDebits
          : isCash
          ? liveInflowsOutflows.cashOut
          : liveInflowsOutflows.bankOut;
      const currentBalance =
        acc.currentBalance > 0
          ? acc.currentBalance
          : Math.max(0, (acc.openingBalance || 0) + credits - debits);

      return {
        ...acc,
        totalCredits: credits,
        totalDebits: debits,
        currentBalance,
      };
    });
  }, [bankAccounts, liveInflowsOutflows]);

  // Total metrics: If accounts exist, use their configured balances; otherwise fallback to live calculated cash/bank flow
  const totalCashInHand = useMemo(() => {
    const cashAccs = dynamicAccounts.filter(
      (b) => b.accountType === 'Cash in Hand' || b.accountType === 'Petty Cash'
    );
    if (cashAccs.length > 0) {
      return cashAccs.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    }
    return Math.max(0, liveInflowsOutflows.cashIn - liveInflowsOutflows.cashOut);
  }, [dynamicAccounts, liveInflowsOutflows]);

  const totalBankBalance = useMemo(() => {
    const bankAccs = dynamicAccounts.filter(
      (b) => b.accountType === 'Bank Account' || b.accountType === 'UPI Account'
    );
    if (bankAccs.length > 0) {
      return bankAccs.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    }
    return Math.max(0, liveInflowsOutflows.bankIn - liveInflowsOutflows.bankOut);
  }, [dynamicAccounts, liveInflowsOutflows]);

  const totalLiquidity = totalCashInHand + totalBankBalance;

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return dynamicAccounts.filter((b) => {
      const matchesSearch =
        b.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.bankName && b.bankName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.upiId && b.upiId.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === 'all' || b.accountType === selectedType;
      return matchesSearch && matchesType;
    });
  }, [dynamicAccounts, searchQuery, selectedType]);

  // Event Receivables calculations & filtering
  const eventReceivables = useMemo(() => {
    return events
      .filter((ev) => ev.status !== 'cancelled')
      .map((ev) => {
        const remaining = Number(ev.remainingBalance) || 0;
        const total = Number(ev.finalAmount) || 0;
        const received = Number(ev.advanceReceived) || 0;
        return {
          ...ev,
          remaining,
          total,
          received,
        };
      })
      .filter((ev) => {
        const matchesSearch =
          ev.name.toLowerCase().includes(receivableSearch.toLowerCase()) ||
          ev.clientName.toLowerCase().includes(receivableSearch.toLowerCase()) ||
          (ev.clientPhone && ev.clientPhone.includes(receivableSearch));
        const matchesBanquet = selectedBanquet === 'all' || ev.banquetId === selectedBanquet;
        const matchesStatus =
          balanceFilter === 'all'
            ? true
            : balanceFilter === 'pending'
            ? ev.remaining > 0
            : ev.remaining <= 0;
        return matchesSearch && matchesBanquet && matchesStatus;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, receivableSearch, selectedBanquet, balanceFilter]);

  const totalEventReceivablesDue = useMemo(() => {
    return events
      .filter((ev) => ev.status !== 'cancelled')
      .reduce((sum, ev) => sum + Math.max(0, Number(ev.remainingBalance) || 0), 0);
  }, [events]);

  const totalEventBookedValue = useMemo(() => {
    return events
      .filter((ev) => ev.status !== 'cancelled')
      .reduce((sum, ev) => sum + (Number(ev.finalAmount) || 0), 0);
  }, [events]);

  const totalEventCollected = useMemo(() => {
    return events
      .filter((ev) => ev.status !== 'cancelled')
      .reduce((sum, ev) => sum + (Number(ev.advanceReceived) || 0), 0);
  }, [events]);

  const pendingEventsCount = useMemo(() => {
    return events.filter((ev) => ev.status !== 'cancelled' && (Number(ev.remainingBalance) || 0) > 0).length;
  }, [events]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('Bank Account');
    setBankName('');
    setAccNumber('');
    setIfscCode('');
    setUpiId('');
    setOpeningBalance('0');
    setAccError('');
    setAccSuccess('');
    setIsAccountModalOpen(true);
  };

  const handleOpenEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccName(acc.accountName);
    setAccType(acc.accountType);
    setBankName(acc.bankName || '');
    setAccNumber(acc.accountNumber || '');
    setIfscCode(acc.ifscCode || '');
    setUpiId(acc.upiId || '');
    setOpeningBalance(String(acc.openingBalance));
    setAccError('');
    setAccSuccess('');
    setIsAccountModalOpen(true);
  };

  const handleDeleteAccount = (id: string) => {
    deleteBankAccount(id);
    setDeletingAccountId(null);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccError('');
    setAccSuccess('');

    if (!accName.trim()) {
      setAccError('Please provide an account name.');
      return;
    }
    const openBalNum = parseFloat(openingBalance) || 0;

    const accountId =
      editingAccount?.id || `bank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const currentBal = editingAccount
      ? openBalNum + editingAccount.totalCredits - editingAccount.totalDebits
      : openBalNum;

    const accountToSave: BankAccount = {
      id: accountId,
      accountName: accName.trim(),
      accountType: accType,
      bankName: bankName.trim() || undefined,
      accountNumber: accNumber.trim() || undefined,
      ifscCode: ifscCode.trim() || undefined,
      upiId: upiId.trim() || undefined,
      openingBalance: openBalNum,
      totalCredits: editingAccount ? editingAccount.totalCredits : 0,
      totalDebits: editingAccount ? editingAccount.totalDebits : 0,
      currentBalance: currentBal,
      reconciliationStatus: editingAccount ? editingAccount.reconciliationStatus : 'Reconciled',
      lastReconciledDate: editingAccount?.lastReconciledDate,
      isActive: true,
      createdAt: editingAccount?.createdAt || new Date().toISOString(),
    };

    const res = saveBankAccount(accountToSave);
    if (res.success) {
      setAccSuccess('Account saved successfully.');
      setTimeout(() => {
        setIsAccountModalOpen(false);
        setAccSuccess('');
      }, 700);
    } else {
      setAccError('Failed to save bank account.');
    }
  };

  const handleSaveReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconAccount) return;
    setReconError('');
    setReconSuccess('');

    const stmtBal = parseFloat(statementBalance);
    if (isNaN(stmtBal)) {
      setReconError('Please enter a valid statement balance.');
      return;
    }

    const diff = Math.round((stmtBal - reconAccount.currentBalance) * 100) / 100;
    const isMatched = diff === 0;

    const updatedAcc: BankAccount = {
      ...reconAccount,
      reconciliationStatus: isMatched ? 'Reconciled' : 'Discrepancy',
      lastReconciledDate: reconDate,
    };

    saveBankAccount(updatedAcc);
    setReconSuccess(
      isMatched
        ? 'Reconciliation complete! Statement perfectly matches books.'
        : `Reconciled with discrepancy of ₹${Math.abs(diff)}.`
    );

    setTimeout(() => {
      setReconAccount(null);
      setReconSuccess('');
    }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* ========================================================= */}
      {/* SECTION 1: BANK & CASH ACCOUNTS MANAGEMENT                */}
      {/* ========================================================= */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <Landmark className="h-5 w-5 text-emerald-600" />
              Cash & Bank Management
            </h2>
            <p className="text-sm text-stone-600">
              Live tracking of cash vaults, corporate checking accounts, UPI gateways, and statement reconciliation.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Add Bank Account
          </button>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Total Cash in Hand
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-stone-900 mt-2">
              {formatCurrency(totalCashInHand)}
            </p>
            <span className="text-xs text-stone-600 mt-1 block">Petty cash & physical vaults</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Total Bank & UPI Balances
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Landmark className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-2">
              {formatCurrency(totalBankBalance)}
            </p>
            <span className="text-xs text-stone-600 mt-1 block">In commercial corporate accounts</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-emerald-200/80 shadow-sm bg-emerald-50/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Total Available Liquidity
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-800 mt-2">
              {formatCurrency(totalLiquidity)}
            </p>
            <span className="text-xs text-emerald-700 mt-1 block">Realtime business solvency</span>
          </div>
        </div>

        {/* Accounts List & Filter */}
        <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {['all', 'Bank Account', 'Cash in Hand', 'UPI Account', 'Petty Cash'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedType === type
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {type === 'all' ? 'All Accounts' : type}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search account, bank or UPI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {filteredAccounts.length === 0 ? (
              <div className="col-span-full py-10 px-6 text-center border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                  <Landmark className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-stone-900 mb-1">No Bank Accounts Configured</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
                  Add your corporate checking accounts, physical cash drawers, or UPI VPAs to track account balances and perform reconciliations.
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Bank Account
                </button>
              </div>
            ) : (
              filteredAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl border border-stone-200 bg-white hover:border-emerald-300 transition-all shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {acc.accountType === 'Cash in Hand' || acc.accountType === 'Petty Cash' ? (
                          <Wallet className="h-4 w-4 text-emerald-600" />
                        ) : acc.accountType === 'UPI Account' ? (
                          <Smartphone className="h-4 w-4 text-purple-600" />
                        ) : (
                          <Landmark className="h-4 w-4 text-blue-600" />
                        )}
                        <h4 className="font-bold text-stone-900 text-sm">{acc.accountName}</h4>
                      </div>
                      <span className="text-[11px] text-stone-500 block mt-0.5">
                        {acc.bankName ? `${acc.bankName} · ` : ''}
                        {acc.accountType}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        acc.reconciliationStatus === 'Reconciled'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {acc.reconciliationStatus}
                    </span>
                  </div>

                  {/* Account details */}
                  <div className="text-xs text-stone-600 space-y-0.5 font-mono">
                    {acc.accountNumber && <div>A/C: {acc.accountNumber}</div>}
                    {acc.ifscCode && <div>IFSC: {acc.ifscCode}</div>}
                    {acc.upiId && <div>UPI: {acc.upiId}</div>}
                  </div>

                  {/* Balances */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-semibold block">
                        Current Balance
                      </span>
                      <span className="text-base font-bold text-stone-900">
                        {formatCurrency(acc.currentBalance)}
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-stone-500">
                      <div>Inflows: +{formatCurrency(acc.totalCredits)}</div>
                      <div>Outflows: -{formatCurrency(acc.totalDebits)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(acc)}
                        className="text-stone-600 hover:text-stone-900 font-medium inline-flex items-center gap-1"
                        title="Edit account details"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingAccountId(acc.id)}
                        className="text-rose-600 hover:text-rose-800 font-medium inline-flex items-center gap-1"
                        title="Delete account"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setReconAccount(acc);
                        setStatementBalance(String(acc.currentBalance));
                        setReconError('');
                        setReconSuccess('');
                      }}
                      className="px-2.5 py-1 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200"
                    >
                      Reconcile
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: EVENT RECEIVABLES & RECORD PAYMENT WORKSPACE   */}
      {/* ========================================================= */}
      <div className="space-y-4 pt-4 border-t border-stone-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Event Receivables & Collections
            </h3>
            <p className="text-xs text-stone-600">
              Track event booking values, collected advances, and pending receivables. Record customer payments directly into cash & bank accounts.
            </p>
          </div>
        </div>

        {/* Receivables KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 block">
              Total Outstanding Receivables
            </span>
            <p className="text-xl font-bold text-amber-800 mt-1">
              {formatCurrency(totalEventReceivablesDue)}
            </p>
            <span className="text-[11px] text-amber-700 mt-0.5 block">
              Across {pendingEventsCount} active events
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Total Event Booked Value
            </span>
            <p className="text-xl font-bold text-stone-900 mt-1">
              {formatCurrency(totalEventBookedValue)}
            </p>
            <span className="text-[11px] text-stone-500 mt-0.5 block">All confirmed events</span>
          </div>

          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 block">
              Total Payments Collected
            </span>
            <p className="text-xl font-bold text-emerald-800 mt-1">
              {formatCurrency(totalEventCollected)}
            </p>
            <span className="text-[11px] text-emerald-700 mt-0.5 block">Received to date</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Collection Efficiency
            </span>
            <p className="text-xl font-bold text-stone-900 mt-1">
              {totalEventBookedValue > 0
                ? `${((totalEventCollected / totalEventBookedValue) * 100).toFixed(1)}%`
                : '100%'}
            </p>
            <span className="text-[11px] text-stone-500 mt-0.5 block">Realized percentage</span>
          </div>
        </div>

        {/* Filters & Event Receivables Table */}
        <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setBalanceFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  balanceFilter === 'pending'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Receivables Due ({pendingEventsCount})
              </button>
              <button
                onClick={() => setBalanceFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  balanceFilter === 'all'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setBalanceFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  balanceFilter === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Fully Paid
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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

              <div className="relative min-w-[220px]">
                <Search className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search event, client, phone..."
                  value={receivableSearch}
                  onChange={(e) => setReceivableSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50/80 text-[11px] font-semibold text-stone-700 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Event & Client</th>
                  <th className="px-4 py-3">Banquet Venue & Date</th>
                  <th className="px-4 py-3 text-right">Booking Total</th>
                  <th className="px-4 py-3 text-right">Amount Received</th>
                  <th className="px-4 py-3 text-right">Receivable Due</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {eventReceivables.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-500">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                      <p className="font-semibold text-stone-700 text-sm">No event receivables found</p>
                      <p className="text-xs text-stone-500 mt-1">
                        {balanceFilter === 'pending'
                          ? 'All active event bookings are fully collected, or no events match your filter.'
                          : 'No events match your search criteria.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  eventReceivables.map((ev) => (
                    <tr
                      key={ev.id}
                      className="hover:bg-stone-50/70 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-900">{ev.name}</div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3 text-stone-400" />
                            {ev.clientName}
                          </span>
                          {ev.clientPhone && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px]">
                              <Phone className="h-2.5 w-2.5 text-stone-400" />
                              {ev.clientPhone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-800 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          {ev.banquetName || 'Unassigned Venue'}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3 text-stone-400" />
                          {formatDate(ev.date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-medium text-stone-700">
                          {formatCurrency(ev.total)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-medium text-emerald-700">
                          {formatCurrency(ev.received)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono font-bold ${
                            ev.remaining > 0
                              ? 'text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(ev.remaining)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            ev.remaining > 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {ev.remaining > 0 ? 'Receivable Due' : 'Fully Paid'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedFinanceEventId(ev.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Event Finance & Payments (Events Tab Popup)        */}
      {/* ========================================================= */}
      {selectedFinanceEventId && (
        <EventFinanceModal
          isOpen={Boolean(selectedFinanceEventId)}
          onClose={() => setSelectedFinanceEventId(null)}
          eventId={selectedFinanceEventId}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: Add / Edit Account                                 */}
      {/* ========================================================= */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-emerald-600" />
                {editingAccount ? 'Edit Bank Account' : 'Add Bank or Cash Account'}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 rounded-lg text-stone-600 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="mt-4 space-y-3">
              {accError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {accError}
                </div>
              )}
              {accSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {accSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Account Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Main Operating A/C"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Account Type
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as any)}
                  className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                >
                  <option value="Bank Account">Bank Current Account</option>
                  <option value="Cash in Hand">Cash in Hand (Vault)</option>
                  <option value="UPI Account">UPI Collection Account</option>
                  <option value="Petty Cash">Petty Cash Drawer</option>
                </select>
              </div>

              {accType === 'Bank Account' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 50200012345678"
                        value={accNumber}
                        onChange={(e) => setAccNumber(e.target.value)}
                        className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                    />
                  </div>
                </>
              )}

              {accType === 'UPI Account' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    UPI Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. pearlexperiences@hdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Delete Account Confirmation                        */}
      {/* ========================================================= */}
      {deletingAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
            <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900">Delete Bank Account?</h3>
            <p className="text-xs text-stone-500 mt-1">
              Are you sure you want to remove this account? This will remove it from your active accounts list.
            </p>
            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-stone-200">
              <button
                onClick={() => setDeletingAccountId(null)}
                className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAccount(deletingAccountId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Reconcile Account Statement                        */}
      {/* ========================================================= */}
      {reconAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Bank Statement Reconciliation
              </h3>
              <button
                onClick={() => setReconAccount(null)}
                className="p-1 rounded-lg text-stone-600 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReconciliation} className="mt-4 space-y-4">
              {reconError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {reconError}
                </div>
              )}
              {reconSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {reconSuccess}
                </div>
              )}

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs">
                <span className="text-stone-500 block">Reconciling Account:</span>
                <span className="font-bold text-stone-900 text-sm">{reconAccount.accountName}</span>
                <div className="mt-2 flex justify-between">
                  <span className="text-stone-500">Current Ledger Book Balance:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {formatCurrency(reconAccount.currentBalance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Bank Statement Closing Balance (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={statementBalance}
                  onChange={(e) => setStatementBalance(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                  required
                />
              </div>

              {/* Difference live calculation */}
              {statementBalance && (
                <div className="p-2.5 rounded-lg border text-xs flex items-center justify-between">
                  <span className="font-medium text-stone-700">Calculated Difference:</span>
                  <span
                    className={`font-mono font-bold ${
                      Math.abs(parseFloat(statementBalance) - reconAccount.currentBalance) === 0
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(
                      parseFloat(statementBalance) - reconAccount.currentBalance || 0
                    )}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Reconciliation Date
                </label>
                <input
                  type="date"
                  value={reconDate}
                  onChange={(e) => setReconDate(e.target.value)}
                  className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Reconciliation Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={reconNotes}
                  onChange={(e) => setReconNotes(e.target.value)}
                  placeholder="Notes on uncredited cheques or timing differences..."
                  className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setReconAccount(null)}
                  className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Submit Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
