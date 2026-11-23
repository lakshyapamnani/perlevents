import React, { useState, useMemo } from 'react';
import {
  Scale,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  Trash2,
  X,
  Layers,
  ArrowRightLeft,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  ChartOfAccount,
  JournalEntry,
  JournalLineItem,
  VoucherType,
} from '../../types/accounting';
import { accountingEngine } from '../../services/accountingEngine';
import { formatCurrency, formatDate } from '../../utils/formatters';

const VOUCHER_TYPES: VoucherType[] = [
  'Journal Voucher',
  'Cash Voucher',
  'Bank Voucher',
  'Payment Voucher',
  'Receipt Voucher',
  'Contra Entry',
  'Adjustment Entry',
];

export const DoubleEntryView: React.FC = () => {
  const { chartOfAccounts, journalEntries, recordJournalEntry, banquets } = useData();

  const [activeTab, setActiveTab] = useState<'chart' | 'journals' | 'trial_balance' | 'balance_sheet'>('chart');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedVoucherType, setSelectedVoucherType] = useState<string>('all');

  // New Journal Entry Modal
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [jvDate, setJvDate] = useState(new Date().toISOString().split('T')[0]);
  const [jvVoucherType, setJvVoucherType] = useState<VoucherType>('Journal Voucher');
  const [jvBanquetId, setJvBanquetId] = useState('');
  const [jvNarration, setJvNarration] = useState('');
  const [jvLines, setJvLines] = useState<Array<{ accountId: string; debit: string; credit: string }>>([
    { accountId: '', debit: '', credit: '' },
    { accountId: '', debit: '', credit: '' },
  ]);
  const [jvError, setJvError] = useState('');
  const [jvSuccess, setJvSuccess] = useState('');

  // Selected Journal for viewing
  const [viewingJournal, setViewingJournal] = useState<JournalEntry | null>(null);

  // Filtered Chart of Accounts
  const filteredAccounts = useMemo(() => {
    return chartOfAccounts.filter((acc) => {
      const matchesSearch =
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.code.includes(searchQuery);
      const matchesGroup = selectedGroup === 'all' || acc.group === selectedGroup;
      return matchesSearch && matchesGroup;
    });
  }, [chartOfAccounts, searchQuery, selectedGroup]);

  // Filtered Journal Entries
  const filteredJournals = useMemo(() => {
    return journalEntries.filter((jv) => {
      const matchesSearch =
        jv.entryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        jv.narration.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVoucher = selectedVoucherType === 'all' || jv.voucherType === selectedVoucherType;
      return matchesSearch && matchesVoucher;
    });
  }, [journalEntries, searchQuery, selectedVoucherType]);

  // Dynamic Trial Balance
  const trialBalance = useMemo(() => {
    return accountingEngine.generateTrialBalance();
  }, [chartOfAccounts, journalEntries]);

  // Balance Sheet Totals
  const balanceSheet = useMemo(() => {
    const assets = chartOfAccounts.filter((a) => a.group === 'Assets');
    const liabilities = chartOfAccounts.filter((a) => a.group === 'Liabilities');
    const equity = chartOfAccounts.filter((a) => a.group === 'Equity');

    const totalAssets = assets.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalEquity = equity.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    return {
      assets,
      liabilities,
      equity,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      totalLiabAndEquity: Math.round((totalLiabilities + totalEquity) * 100) / 100,
    };
  }, [chartOfAccounts]);

  // Calculations for new Journal Entry modal
  const jvTotals = useMemo(() => {
    let debits = 0;
    let credits = 0;
    jvLines.forEach((l) => {
      debits += parseFloat(l.debit) || 0;
      credits += parseFloat(l.credit) || 0;
    });
    const diff = Math.abs(Math.round((debits - credits) * 100) / 100);
    return {
      totalDebit: debits,
      totalCredit: credits,
      difference: diff,
      isBalanced: debits > 0 && diff === 0,
    };
  }, [jvLines]);

  const handleAddLine = () => {
    setJvLines([...jvLines, { accountId: '', debit: '', credit: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (jvLines.length <= 2) return;
    setJvLines(jvLines.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: 'accountId' | 'debit' | 'credit', value: string) => {
    const next = [...jvLines];
    next[index][field] = value;
    if (field === 'debit' && value && parseFloat(value) > 0) {
      next[index].credit = '';
    } else if (field === 'credit' && value && parseFloat(value) > 0) {
      next[index].debit = '';
    }
    setJvLines(next);
  };

  const handlePostJournal = (e: React.FormEvent) => {
    e.preventDefault();
    setJvError('');
    setJvSuccess('');

    if (!jvNarration.trim()) {
      setJvError('Please enter a narration for this journal voucher.');
      return;
    }

    if (!jvTotals.isBalanced) {
      setJvError(`Voucher is unbalanced! Debits must equal credits. Difference is ₹${jvTotals.difference}`);
      return;
    }

    const lines: JournalLineItem[] = [];
    for (let i = 0; i < jvLines.length; i++) {
      const line = jvLines[i];
      if (!line.accountId) {
        setJvError(`Line #${i + 1} does not have an account selected.`);
        return;
      }
      const acc = chartOfAccounts.find((a) => a.id === line.accountId);
      const debitNum = parseFloat(line.debit) || 0;
      const creditNum = parseFloat(line.credit) || 0;

      if (debitNum === 0 && creditNum === 0) {
        setJvError(`Line #${i + 1} has zero debit and zero credit.`);
        return;
      }

      lines.push({
        accountId: line.accountId,
        accountCode: acc?.code || '',
        accountName: acc?.name || 'Account',
        debit: debitNum,
        credit: creditNum,
      });
    }

    const bq = banquets.find((b) => b.id === jvBanquetId);

    const res = recordJournalEntry({
      date: jvDate,
      voucherType: jvVoucherType,
      banquetId: jvBanquetId || undefined,
      banquetName: bq?.name || undefined,
      narration: jvNarration.trim(),
      lines,
      status: 'Posted',
    });

    if (res.success) {
      setJvSuccess('Balanced journal entry posted successfully.');
      setTimeout(() => {
        setIsJournalModalOpen(false);
        setJvSuccess('');
        setJvNarration('');
        setJvLines([
          { accountId: '', debit: '', credit: '' },
          { accountId: '', debit: '', credit: '' },
        ]);
      }, 1000);
    } else {
      setJvError(res.error || 'Failed to post journal entry.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Scale className="h-5 w-5 text-emerald-600" />
            Double-Entry Accounting & General Ledger
          </h2>
          <p className="text-sm text-stone-600">
            Chart of accounts, balanced journal vouchers, real-time trial balance, and balance sheet.
          </p>
        </div>
        <button
          onClick={() => {
            setJvError('');
            setJvSuccess('');
            setIsJournalModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          Create Journal Voucher
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'chart'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Chart of Accounts ({chartOfAccounts.length})
            </button>
            <button
              onClick={() => setActiveTab('journals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'journals'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Journal Vouchers ({journalEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('trial_balance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'trial_balance'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Trial Balance
            </button>
            <button
              onClick={() => setActiveTab('balance_sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'balance_sheet'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Balance Sheet
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search className="h-4 w-4 text-stone-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {activeTab === 'chart' && (
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="text-xs bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Groups</option>
                <option value="Assets">Assets (1000s)</option>
                <option value="Liabilities">Liabilities (2000s)</option>
                <option value="Equity">Equity (3000s)</option>
                <option value="Income">Income (4000s)</option>
                <option value="Expenses">Expenses (5000s)</option>
              </select>
            )}

            {activeTab === 'journals' && (
              <select
                value={selectedVoucherType}
                onChange={(e) => setSelectedVoucherType(e.target.value)}
                className="text-xs bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Vouchers</option>
                {VOUCHER_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Chart of Accounts Table */}
        {activeTab === 'chart' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Account Name</th>
                  <th className="px-5 py-3">Group</th>
                  <th className="px-5 py-3">Subgroup</th>
                  <th className="px-5 py-3 text-center">Normal Balance</th>
                  <th className="px-5 py-3 text-right">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-stone-800 text-xs">
                      {acc.code}
                    </td>
                    <td className="px-5 py-3 font-semibold text-stone-900">{acc.name}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          acc.group === 'Assets'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : acc.group === 'Liabilities'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : acc.group === 'Income'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : acc.group === 'Expenses'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {acc.group}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-stone-600">{acc.subGroup}</td>
                    <td className="px-5 py-3 text-center text-xs font-semibold text-stone-600">
                      {acc.normalBalance}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-stone-900">
                      {formatCurrency(acc.currentBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Journal Entries Table */}
        {activeTab === 'journals' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3">Voucher # / Date</th>
                  <th className="px-5 py-3">Voucher Type</th>
                  <th className="px-5 py-3">Banquet</th>
                  <th className="px-5 py-3">Narration</th>
                  <th className="px-5 py-3 text-right">Debit / Credit</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredJournals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-stone-600">
                      No journal entries found.
                    </td>
                  </tr>
                ) : (
                  filteredJournals.map((jv) => (
                    <tr key={jv.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-900">{jv.entryNumber}</div>
                        <div className="text-xs text-stone-600">{formatDate(jv.date)}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-800">
                          {jv.voucherType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-stone-600">
                        {jv.banquetName || 'General / HQ'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-stone-800 max-w-sm truncate">
                        {jv.narration}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-stone-900">
                        {formatCurrency(jv.totalDebit)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {jv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => setViewingJournal(jv)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Trial Balance */}
        {activeTab === 'trial_balance' && (
          <div>
            <div className="p-4 bg-stone-50/80 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Verified Trial Balance</h3>
                <p className="text-xs text-stone-600">
                  Computed directly from all posted general ledger accounts.
                </p>
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  trialBalance.isBalanced
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {trialBalance.isBalanced ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Trial Balance Perfectly Balanced
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Unbalanced: Diff ₹{Math.abs(trialBalance.totalDebit - trialBalance.totalCredit)}
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-stone-700">
                <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Account Title</th>
                    <th className="px-5 py-3">Account Group</th>
                    <th className="px-5 py-3 text-right">Debit (₹)</th>
                    <th className="px-5 py-3 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {trialBalance.accounts.map((row) => (
                    <tr key={row.code} className="hover:bg-stone-50/70">
                      <td className="px-5 py-2.5 font-mono text-xs font-semibold text-stone-700">
                        {row.code}
                      </td>
                      <td className="px-5 py-2.5 font-medium text-stone-900">{row.name}</td>
                      <td className="px-5 py-2.5 text-xs text-stone-600">{row.group}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-medium text-stone-800">
                        {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono font-medium text-stone-800">
                        {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-stone-100/80 font-bold border-t-2 border-stone-300">
                    <td colSpan={3} className="px-5 py-3 text-right text-stone-900 uppercase">
                      Total Trial Balance:
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-800 text-base">
                      {formatCurrency(trialBalance.totalDebit)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-800 text-base">
                      {formatCurrency(trialBalance.totalCredit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Balance Sheet */}
        {activeTab === 'balance_sheet' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h3 className="text-base font-bold text-stone-900">Statement of Financial Position</h3>
                <p className="text-xs text-stone-600">Assets = Liabilities + Owner Equity</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-600 block">Total Asset Base</span>
                <span className="text-lg font-bold text-emerald-700">
                  {formatCurrency(balanceSheet.totalAssets)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ASSETS */}
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <h4 className="font-bold text-emerald-900 text-sm">ASSETS</h4>
                  <span className="font-bold text-emerald-800">
                    {formatCurrency(balanceSheet.totalAssets)}
                  </span>
                </div>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 bg-white">
                  {balanceSheet.assets.map((a) => (
                    <div key={a.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-stone-800">{a.name}</span>
                        <span className="text-stone-600 block text-[10px]">{a.subGroup}</span>
                      </div>
                      <span className="font-bold font-mono text-stone-900">
                        {formatCurrency(a.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* LIABILITIES & EQUITY */}
              <div className="space-y-4">
                <div className="p-3 bg-stone-100 border border-stone-300 rounded-lg flex items-center justify-between">
                  <h4 className="font-bold text-stone-900 text-sm">LIABILITIES & EQUITY</h4>
                  <span className="font-bold text-stone-900">
                    {formatCurrency(balanceSheet.totalLiabAndEquity)}
                  </span>
                </div>

                {/* Liabilities */}
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 bg-white">
                  <div className="p-2.5 bg-stone-50 font-bold text-xs text-stone-700">Liabilities</div>
                  {balanceSheet.liabilities.map((l) => (
                    <div key={l.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-stone-800">{l.name}</span>
                        <span className="text-stone-600 block text-[10px]">{l.subGroup}</span>
                      </div>
                      <span className="font-bold font-mono text-stone-900">
                        {formatCurrency(l.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Equity */}
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 bg-white">
                  <div className="p-2.5 bg-stone-50 font-bold text-xs text-stone-700">Equity</div>
                  {balanceSheet.equity.map((e) => (
                    <div key={e.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-stone-800">{e.name}</span>
                        <span className="text-stone-600 block text-[10px]">{e.subGroup}</span>
                      </div>
                      <span className="font-bold font-mono text-stone-900">
                        {formatCurrency(e.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Create Balanced Journal Entry */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-emerald-600" />
                Create Balanced Journal Voucher
              </h3>
              <button
                onClick={() => setIsJournalModalOpen(false)}
                className="p-1 rounded-lg text-stone-600 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePostJournal} className="mt-4 space-y-4">
              {jvError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {jvError}
                </div>
              )}
              {jvSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {jvSuccess}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    value={jvDate}
                    onChange={(e) => setJvDate(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Voucher Type
                  </label>
                  <select
                    value={jvVoucherType}
                    onChange={(e) => setJvVoucherType(e.target.value as VoucherType)}
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                  >
                    {VOUCHER_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Banquet Venue
                  </label>
                  <select
                    value={jvBanquetId}
                    onChange={(e) => setJvBanquetId(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
                  >
                    <option value="">Headquarters / General</option>
                    {banquets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-700">Voucher Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add Row
                  </button>
                </div>

                <div className="border border-stone-200 rounded-lg divide-y divide-stone-200 overflow-hidden">
                  <div className="grid grid-cols-12 bg-stone-50 px-3 py-2 text-[11px] font-semibold text-stone-600 uppercase">
                    <div className="col-span-6">Account</div>
                    <div className="col-span-3 text-right">Debit (₹)</div>
                    <div className="col-span-3 text-right">Credit (₹)</div>
                  </div>

                  {jvLines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 items-center gap-2 p-2 bg-white">
                      <div className="col-span-6">
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                          className="w-full text-xs bg-stone-50 border border-stone-300 rounded px-2 py-1.5 text-stone-800"
                          required
                        >
                          <option value="">Select Account</option>
                          {chartOfAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name} ({acc.group})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.debit}
                          onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                          className="w-full text-xs text-right bg-stone-50 border border-stone-300 rounded px-2 py-1.5 text-stone-800"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.credit}
                          onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                          className="w-full text-xs text-right bg-stone-50 border border-stone-300 rounded px-2 py-1.5 text-stone-800"
                        />
                        {jvLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-stone-600 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Summary Bar */}
                  <div className="grid grid-cols-12 items-center px-3 py-2 bg-stone-100 font-bold text-xs">
                    <div className="col-span-6 text-stone-700">Total Voucher Sum:</div>
                    <div className="col-span-3 text-right font-mono text-stone-900">
                      {formatCurrency(jvTotals.totalDebit)}
                    </div>
                    <div className="col-span-3 text-right font-mono text-stone-900">
                      {formatCurrency(jvTotals.totalCredit)}
                    </div>
                  </div>
                </div>

                {/* Balance validation indicator */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div
                    className={`font-semibold flex items-center gap-1 ${
                      jvTotals.isBalanced ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {jvTotals.isBalanced ? (
                      <>
                        <Check className="h-4 w-4" /> Balanced: Debits equal Credits
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" /> Out of Balance by{' '}
                        {formatCurrency(jvTotals.difference)}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Narration / Audit Explanation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={jvNarration}
                  onChange={(e) => setJvNarration(e.target.value)}
                  placeholder="Detailed business explanation for this double-entry posting..."
                  className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!jvTotals.isBalanced}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    jvTotals.isBalanced
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  Post Balanced Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Journal Details */}
      {viewingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {viewingJournal.entryNumber}
                </h3>
                <p className="text-xs text-stone-600">
                  {viewingJournal.voucherType} · {formatDate(viewingJournal.date)}
                </p>
              </div>
              <button
                onClick={() => setViewingJournal(null)}
                className="p-1 rounded-lg text-stone-600 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-700">
                <span className="font-bold block text-stone-900 mb-0.5">Narration:</span>
                {viewingJournal.narration}
              </div>

              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-[11px] font-semibold uppercase text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {viewingJournal.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-stone-800">{l.accountName}</span>
                          <span className="font-mono text-stone-600 block text-[10px]">
                            {l.accountCode}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          {l.debit > 0 ? formatCurrency(l.debit) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          {l.credit > 0 ? formatCurrency(l.credit) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-stone-100 font-bold border-t border-stone-300">
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatCurrency(viewingJournal.totalDebit)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatCurrency(viewingJournal.totalCredit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-stone-600 flex items-center justify-between">
                <span>Created By: {viewingJournal.createdByName}</span>
                <span>Status: {viewingJournal.status}</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setViewingJournal(null)}
                className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
