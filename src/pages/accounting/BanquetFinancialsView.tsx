import React, { useState, useMemo } from 'react';
import {
  Building2,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  Search,
  ArrowRight,
  Eye,
  CheckCircle2,
  X,
  FileText,
  Users,
  PieChart,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { accountingEngine, BanquetFinancialProfile } from '../../services/accountingEngine';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const BanquetFinancialsView: React.FC = () => {
  const { banquets, events, incomeRecords, expenseRecords } = useData();

  const [selectedBanquetId, setSelectedBanquetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const banquetProfiles = useMemo(() => {
    return accountingEngine.getBanquetFinancialProfiles();
  }, [banquets, events, expenseRecords]);

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return banquetProfiles;
    const q = searchQuery.toLowerCase().trim();
    return banquetProfiles.filter((b) => b.banquetName.toLowerCase().includes(q));
  }, [banquetProfiles, searchQuery]);

  // Selected Banquet Details
  const selectedProfile = useMemo(() => {
    if (!selectedBanquetId) return null;
    return banquetProfiles.find((b) => b.banquetId === selectedBanquetId) || null;
  }, [banquetProfiles, selectedBanquetId]);

  // Activity for Selected Banquet
  const banquetTransactions = useMemo(() => {
    if (!selectedBanquetId) return [];
    const list: Array<{
      id: string;
      date: string;
      type: 'Income' | 'Expense' | 'Booking';
      category: string;
      reference: string;
      amount: number;
      status: string;
      description: string;
    }> = [];

    // Events / Bookings
    events
      .filter((e) => e.banquetId === selectedBanquetId && e.status !== 'cancelled')
      .forEach((e) => {
        list.push({
          id: e.id,
          date: e.date,
          type: 'Booking',
          category: e.eventType || 'Event',
          reference: e.id,
          amount: e.finalAmount || e.quotedAmount || 0,
          status: e.status,
          description: `Booking for ${e.clientName} (${e.guestCount} guests)`,
        });
      });

    // Income
    incomeRecords
      .filter((inc) => inc.banquetId === selectedBanquetId && inc.status !== 'Reversed')
      .forEach((inc) => {
        list.push({
          id: inc.id,
          date: inc.date,
          type: 'Income',
          category: inc.category,
          reference: inc.referenceNumber || inc.transactionId,
          amount: inc.amount,
          status: inc.status,
          description: inc.description || `${inc.category} via ${inc.paymentMode}`,
        });
      });

    // Expenses
    expenseRecords
      .filter((exp) => exp.banquetId === selectedBanquetId && exp.status !== 'Reversed')
      .forEach((exp) => {
        list.push({
          id: exp.id,
          date: exp.date,
          type: 'Expense',
          category: exp.category,
          reference: exp.referenceNumber || exp.expenseId,
          amount: exp.totalAmount,
          status: exp.paymentStatus,
          description: exp.description || `Expense to ${exp.vendorName || 'Vendor'}`,
        });
      });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedBanquetId, events, incomeRecords, expenseRecords]);

  const filteredTransactions = useMemo(() => {
    return banquetTransactions.filter((tx) => {
      if (transactionTypeFilter !== 'all' && tx.type.toLowerCase() !== transactionTypeFilter.toLowerCase()) {
        return false;
      }
      if (categoryFilter !== 'all' && tx.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [banquetTransactions, transactionTypeFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Banquet-Wise Financial Profiles & P&L</span>
          </h2>
          <p className="text-xs text-stone-500">
            Dedicated financial overview, revenue, direct expenses, operating margins, and partner allocations per venue.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search venue by name..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Banquet Profiles Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Banquet Venue</th>
                <th className="py-3 px-3 text-right">Bookings</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-right">Total Received</th>
                <th className="py-3 px-4 text-right">Receivables</th>
                <th className="py-3 px-4 text-right">Total Expenses</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
                <th className="py-3 px-3 text-center">Margin</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-stone-500">
                    No banquet records found.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((b) => {
                  const isProfitable = b.netProfit >= 0;
                  return (
                    <tr
                      key={b.banquetId}
                      className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {b.banquetName.slice(0, 1)}
                          </div>
                          <span className="truncate">{b.banquetName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-stone-700 dark:text-stone-300">
                        {b.totalBookings}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                        {formatCurrency(b.totalRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        {formatCurrency(b.totalReceived)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                        {formatCurrency(b.outstandingReceivables)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-red-600 dark:text-red-400">
                        {formatCurrency(b.totalExpenses)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={isProfitable ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}>
                          {formatCurrency(b.netProfit)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.profitMarginPercentage >= 20
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : b.profitMarginPercentage > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {b.profitMarginPercentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedBanquetId(b.banquetId)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Banquet Drilldown Modal / Drawer */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold">
                  {selectedProfile.banquetName.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {selectedProfile.banquetName} – Financial Ledger & Activity
                  </h3>
                  <p className="text-xs text-stone-500">
                    Net Profit: {formatCurrency(selectedProfile.netProfit)} • Margin: {selectedProfile.profitMarginPercentage}%
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBanquetId(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Partner Allocations for this Banquet */}
              <div>
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Partner Profit Distribution Agreement</span>
                </h4>
                {selectedProfile.partnerAllocations.length === 0 ? (
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs text-stone-500">
                    No partner mappings configured for this banquet yet. Configure in the Partner Management tab.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedProfile.partnerAllocations.map((p) => (
                      <div
                        key={p.partnerId}
                        className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 text-xs space-y-1 font-mono"
                      >
                        <div className="flex justify-between font-bold text-stone-900 dark:text-stone-100">
                          <span>{p.partnerName}</span>
                          <span className="text-purple-700 dark:text-purple-300">
                            {p.profitSharingPercentage}% Share (Own: {p.ownershipPercentage}%)
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-600 dark:text-stone-400 text-[11px]">
                          <span>Entitled Net Share:</span>
                          <span className="font-semibold text-stone-900 dark:text-stone-100">{formatCurrency(p.entitledProfitShare)}</span>
                        </div>
                        <div className="flex justify-between text-stone-600 dark:text-stone-400 text-[11px]">
                          <span>Amount Paid / Settled:</span>
                          <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(p.amountPaid)}</span>
                        </div>
                        <div className="flex justify-between text-stone-900 dark:text-stone-100 font-bold pt-1 border-t border-purple-200 dark:border-purple-900">
                          <span>Outstanding Payable:</span>
                          <span className="text-purple-700 dark:text-purple-300">{formatCurrency(p.outstandingPayable)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transaction Filters */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">Filter Transactions:</span>
                <select
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value)}
                  className="px-2.5 py-1 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-xs"
                >
                  <option value="all">All Types</option>
                  <option value="booking">Bookings</option>
                  <option value="income">Recorded Income</option>
                  <option value="expense">Expenses</option>
                </select>
              </div>

              {/* Transactions List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 dark:bg-stone-950 rounded-xl">
                    No transactions match the selected filters.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.type === 'Income'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : tx.type === 'Expense'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="font-semibold text-stone-900 dark:text-stone-100">{tx.category}</span>
                          <span className="text-[10px] text-stone-400 font-mono">({tx.reference})</span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{tx.description}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-mono font-bold text-sm ${
                          tx.type === 'Income' || tx.type === 'Booking'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-600'
                        }`}>
                          {tx.type === 'Expense' ? '-' : '+'} {formatCurrency(tx.amount)}
                        </div>
                        <div className="text-[10px] text-stone-400">{formatDate(tx.date)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-end bg-stone-50 dark:bg-stone-950">
              <button
                onClick={() => setSelectedBanquetId(null)}
                className="px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold"
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
