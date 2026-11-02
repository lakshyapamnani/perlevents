import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  BarChart3,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export const SalesReportsDashboard: React.FC = () => {
  const { sales, invoices, payments, banquets, events } = useData();

  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [banquetFilter, setBanquetFilter] = useState('all');

  // Aggregations
  const filteredSales = sales.filter((s) => {
    const matchBanquet = banquetFilter === 'all' || s.banquetId === banquetFilter;
    return matchBanquet && s.status !== 'cancelled';
  });

  const totalSalesValue = filteredSales.reduce((sum, s) => sum + s.finalSaleAmount, 0);
  const totalInvoicedValue = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.finalTotal, 0);
  const totalPaymentsReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = filteredSales.reduce((sum, s) => sum + s.outstandingBalance, 0);
  const averageSaleValue =
    filteredSales.length > 0 ? Math.round(totalSalesValue / filteredSales.length) : 0;
  const confirmedBookingsCount = events.filter((e) => e.status === 'confirmed').length;

  // Breakdown by Banquet
  const banquetBreakdown = banquets.map((b) => {
    const bSales = filteredSales.filter((s) => s.banquetId === b.id);
    const total = bSales.reduce((sum, s) => sum + s.finalSaleAmount, 0);
    const count = bSales.length;
    return {
      banquetName: b.name,
      total,
      count,
    };
  });

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['Sale ID', 'Event Name', 'Client Name', 'Banquet', 'Sale Date', 'Gross Amount', 'Discount', 'Final Sale Amount', 'Payments Received', 'Outstanding Balance'];
    const rows = filteredSales.map((s) => [
      s.id,
      `"${s.eventName.replace(/"/g, '""')}"`,
      `"${s.clientName.replace(/"/g, '""')}"`,
      `"${s.banquetName.replace(/"/g, '""')}"`,
      s.saleDate,
      s.grossAmount,
      s.discount,
      s.finalSaleAmount,
      s.paymentsReceived,
      s.outstandingBalance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PerlEvents_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Executive Sales Dashboard & Financial Reports</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Live financial analytics distinguishing contracted sale values, invoiced amounts, and verified payments.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs">
        <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Banquet:</span>
        </span>
        <select
          value={banquetFilter}
          onChange={(e) => setBanquetFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
        >
          <option value="all">All Banquet Halls</option>
          {banquets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Key Financial Metric Cards (Strict Separation as per Section 19) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Total Sales Value
          </div>
          <div className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums truncate">
            {formatCurrency(totalSalesValue)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">{filteredSales.length} closed sales</div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Invoiced Total
          </div>
          <div className="text-lg font-bold text-sky-800 dark:text-sky-300 mt-1 tabular-nums truncate">
            {formatCurrency(totalInvoicedValue)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">{invoices.length} issued invoices</div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Payments Received
          </div>
          <div className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mt-1 tabular-nums truncate">
            {formatCurrency(totalPaymentsReceived)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">{payments.length} ledger payments</div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Total Outstanding
          </div>
          <div className="text-lg font-bold text-amber-800 dark:text-amber-400 mt-1 tabular-nums truncate">
            {formatCurrency(totalOutstanding)}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">Active receivables</div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Avg Sale Value
          </div>
          <div className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums truncate">
            {formatCurrency(averageSaleValue)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Per contracted event</div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Bookings
          </div>
          <div className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
            {confirmedBookingsCount}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Confirmed slots</div>
        </div>
      </div>

      {/* Banquet Revenue Breakdown */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
          <span>Sales Distribution by Banquet Hall</span>
        </h2>

        <div className="space-y-3">
          {banquetBreakdown.map((b, i) => {
            const pct = totalSalesValue > 0 ? Math.round((b.total / totalSalesValue) * 100) : 0;
            return (
              <div key={i} className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {b.banquetName} ({b.count} sales)
                  </span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatCurrency(b.total)} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-700 dark:bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
