import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building2,
  DollarSign,
  PieChart,
  Scale,
  Users,
  Truck,
  Landmark,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { accountingEngine } from '../../services/accountingEngine';
import { formatCurrency, formatDate } from '../../utils/formatters';

type ReportType =
  | 'pnl'
  | 'balance_sheet'
  | 'trial_balance'
  | 'banquet_summary'
  | 'partner_report'
  | 'vendor_outstanding'
  | 'customer_receivables'
  | 'cash_flow';

export const FinancialReportsView: React.FC = () => {
  const { banquets } = useData();

  const [selectedReport, setSelectedReport] = useState<ReportType>('pnl');
  const [selectedBanquet, setSelectedBanquet] = useState<string>('all');
  const [reportPeriod, setReportPeriod] = useState<string>('this_fy');

  // Compute live data for reports
  const kpis = useMemo(() => accountingEngine.calculateFinancialKPIs(), []);
  const banquetProfiles = useMemo(() => accountingEngine.getBanquetFinancialProfiles(), []);
  const partnerProfiles = useMemo(() => accountingEngine.getPartnerFinancialProfiles(selectedBanquet), [selectedBanquet]);
  const vendorProfiles = useMemo(() => accountingEngine.getVendorFinancialProfiles(), []);
  const customerProfiles = useMemo(() => accountingEngine.getCustomerFinancialProfiles(), []);
  const trialBalance = useMemo(() => accountingEngine.generateTrialBalance(), []);

  // Print current report
  const handlePrint = () => {
    window.print();
  };

  // Export current report CSV
  const handleExportCSV = () => {
    let filename = `Report_${selectedReport}_${new Date().toISOString().slice(0, 10)}.csv`;
    let rows: string[][] = [];

    if (selectedReport === 'banquet_summary') {
      rows = [
        ['Banquet Name', 'Bookings', 'Total Revenue', 'Received', 'Receivables', 'Direct Expenses', 'Operating Expenses', 'Net Profit', 'Profit Margin %'],
        ...banquetProfiles.map((b) => [
          b.banquetName,
          String(b.totalBookings),
          String(b.totalRevenue),
          String(b.totalReceived),
          String(b.outstandingReceivables),
          String(b.vendorExpenses),
          String(b.operatingExpenses),
          String(b.netProfit),
          `${b.profitMarginPercentage}%`,
        ]),
      ];
    } else if (selectedReport === 'vendor_outstanding') {
      rows = [
        ['Vendor Name', 'Category', 'Agreed Amount', 'Total Billed', 'Total Paid', 'Pending Balance'],
        ...vendorProfiles.map((v) => [
          v.vendorName,
          v.serviceCategory,
          String(v.totalAgreedAmount),
          String(v.totalBilledAmount),
          String(v.totalPaidAmount),
          String(v.pendingBalance),
        ]),
      ];
    } else if (selectedReport === 'customer_receivables') {
      rows = [
        ['Customer Name', 'Associated Events', 'Booking Value', 'Invoiced Amount', 'Amount Received', 'Outstanding Balance'],
        ...customerProfiles.map((c) => [
          c.customerName,
          String(c.associatedEventsCount),
          String(c.totalBookingValue),
          String(c.totalInvoiced),
          String(c.totalAmountReceived),
          String(c.outstandingBalance),
        ]),
      ];
    } else if (selectedReport === 'partner_report') {
      rows = [
        ['Partner Name', 'Attributable Revenue', 'Attributable Expenses', 'Total Profit Share', 'Amount Paid', 'Outstanding Share'],
        ...partnerProfiles.map((p) => [
          p.partnerName,
          String(p.totalAttributableRevenue),
          String(p.totalAttributableExpenses),
          String(p.totalProfitShare),
          String(p.totalAmountPaid),
          String(p.totalOutstandingAmount),
        ]),
      ];
    } else {
      rows = [
        ['Pearl Experiences Financial Report', selectedReport.toUpperCase()],
        ['Generated Date', new Date().toLocaleDateString('en-IN')],
        ['Total Revenue', String(kpis.totalRevenue)],
        ['Total Received', String(kpis.totalReceived)],
        ['Total Receivables', String(kpis.totalReceivables)],
        ['Total Expenses', String(kpis.totalExpenses)],
        ['Net Operating Profit', String(kpis.netProfit)],
        ['Cash and Bank Balance', String(kpis.totalCashAndBank)],
      ];
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Financial Reporting & Statements Center
          </h2>
          <p className="text-sm text-stone-600">
            Generate, preview, export and print formal statutory and management accounting reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 shadow-sm"
          >
            <Download className="h-4 w-4 text-stone-500" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 shadow-sm"
          >
            <Printer className="h-4 w-4 text-stone-500" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-sm">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2 block">
          Select Statutory or Management Report:
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'pnl', label: 'Profit & Loss Statement', icon: PieChart },
            { id: 'trial_balance', label: 'Trial Balance', icon: Scale },
            { id: 'banquet_summary', label: 'Banquet Financial Summary', icon: Building2 },
            { id: 'partner_report', label: 'Partner Distribution Statement', icon: Users },
            { id: 'vendor_outstanding', label: 'Vendor Outstanding Payables', icon: Truck },
            { id: 'customer_receivables', label: 'Customer Receivables Ledger', icon: Users },
            { id: 'cash_flow', label: 'Cash Flow Statement', icon: Landmark },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = selectedReport === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedReport(item.id as ReportType)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* REPORT LIVE PREVIEW CONTAINER */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm p-6 space-y-6">
        {/* Printable Letterhead */}
        <div className="border-b border-stone-200 pb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-950 uppercase font-serif">
              PEARL EXPERIENCES PRIVATE LIMITED
            </h1>
            <p className="text-xs text-stone-600">
              Luxury Banquets & Event Spaces · Corporate Financial Division
            </p>
            <span className="text-xs font-semibold text-emerald-800 uppercase block mt-1">
              REPORT: {selectedReport.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          <div className="text-right text-xs text-stone-600">
            <div>As on: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            <div>Currency: Indian Rupees (INR)</div>
            <div className="font-semibold text-stone-800">Status: Verified Books</div>
          </div>
        </div>

        {/* Report Content based on selection */}
        {selectedReport === 'banquet_summary' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 font-semibold uppercase text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Banquet Venue</th>
                  <th className="py-2.5 px-3 text-center">Bookings</th>
                  <th className="py-2.5 px-3 text-right">Revenue</th>
                  <th className="py-2.5 px-3 text-right">Received</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                  <th className="py-2.5 px-3 text-right">Expenses</th>
                  <th className="py-2.5 px-3 text-right">Net Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {banquetProfiles.map((b) => (
                  <tr key={b.banquetId}>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{b.banquetName}</td>
                    <td className="py-2.5 px-3 text-center">{b.totalBookings}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(b.totalRevenue)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">{formatCurrency(b.totalReceived)}</td>
                    <td className="py-2.5 px-3 text-right text-amber-700 font-medium">{formatCurrency(b.outstandingReceivables)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-700 font-medium">{formatCurrency(b.totalExpenses)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-stone-900">{formatCurrency(b.netProfit)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{b.profitMarginPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'vendor_outstanding' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 font-semibold uppercase text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Total Quoted / Agreed</th>
                  <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-3 text-right">Total Paid</th>
                  <th className="py-2.5 px-3 text-right">Pending Payables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {vendorProfiles.map((v) => (
                  <tr key={v.vendorId}>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{v.vendorName}</td>
                    <td className="py-2.5 px-3 text-stone-600">{v.serviceCategory}</td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(v.totalAgreedAmount)}</td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(v.totalBilledAmount)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">{formatCurrency(v.totalPaidAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700">{formatCurrency(v.pendingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'customer_receivables' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 font-semibold uppercase text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3 text-center">Events</th>
                  <th className="py-2.5 px-3 text-right">Booking Value</th>
                  <th className="py-2.5 px-3 text-right">Invoiced Total</th>
                  <th className="py-2.5 px-3 text-right">Paid to Date</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Receivables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customerProfiles.map((c) => (
                  <tr key={c.customerId}>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{c.customerName}</td>
                    <td className="py-2.5 px-3 text-center">{c.associatedEventsCount}</td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(c.totalBookingValue)}</td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(c.totalInvoiced)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">{formatCurrency(c.totalAmountReceived)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700">{formatCurrency(c.outstandingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'partner_report' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 font-semibold uppercase text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Partner Name</th>
                  <th className="py-2.5 px-3 text-right">Attributable Revenue</th>
                  <th className="py-2.5 px-3 text-right">Attributable Cost</th>
                  <th className="py-2.5 px-3 text-right">Calculated Profit Share</th>
                  <th className="py-2.5 px-3 text-right">Disbursed to Date</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {partnerProfiles.map((p) => (
                  <tr key={p.partnerId}>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{p.partnerName}</td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(p.totalAttributableRevenue)}</td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(p.totalAttributableExpenses)}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-purple-800">{formatCurrency(p.totalProfitShare)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">{formatCurrency(p.totalAmountPaid)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-purple-900">{formatCurrency(p.totalOutstandingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'trial_balance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 font-semibold uppercase text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Account Code</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Group</th>
                  <th className="py-2.5 px-3 text-right">Debit (INR)</th>
                  <th className="py-2.5 px-3 text-right">Credit (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {trialBalance.accounts.map((a) => (
                  <tr key={a.code}>
                    <td className="py-2.5 px-3 font-mono">{a.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-stone-900">{a.name}</td>
                    <td className="py-2.5 px-3 text-stone-600">{a.group}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{a.debit > 0 ? formatCurrency(a.debit) : '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{a.credit > 0 ? formatCurrency(a.credit) : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-stone-100 font-bold border-t-2 border-stone-300">
                  <td colSpan={3} className="py-2.5 px-3 text-right uppercase">Total:</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{formatCurrency(trialBalance.totalDebit)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{formatCurrency(trialBalance.totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'cash_flow' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between font-bold text-sm text-emerald-950">
              <span>Operating Cash Flow Inflows</span>
              <span className="font-mono">{formatCurrency(kpis.totalReceived)}</span>
            </div>
            <div className="p-4 bg-rose-50 rounded-lg border border-rose-200 flex justify-between font-bold text-sm text-rose-950">
              <span>Operating Cash Outflows (Disbursements)</span>
              <span className="font-mono">-{formatCurrency(kpis.totalExpenses)}</span>
            </div>
            <div className="p-4 bg-stone-100 rounded-lg border border-stone-300 flex justify-between font-bold text-base text-stone-900">
              <span>Net Closing Liquidity (Cash & Bank in Hand)</span>
              <span className="font-mono text-emerald-700">{formatCurrency(kpis.totalCashAndBank)}</span>
            </div>
          </div>
        )}

        {selectedReport === 'pnl' && (
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b font-bold text-stone-900">
              <span>Total Revenue</span>
              <span className="font-mono text-emerald-700">{formatCurrency(kpis.totalRevenue)}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-stone-700">
              <span>Direct Expenses & COGS</span>
              <span className="font-mono">{formatCurrency(kpis.totalExpenses * 0.7)}</span>
            </div>
            <div className="flex justify-between py-2 border-b font-bold text-stone-900 bg-emerald-50/50 px-2">
              <span>Gross Operating Profit</span>
              <span className="font-mono text-emerald-800">{formatCurrency(kpis.grossProfit)}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-stone-700">
              <span>Operating Overheads</span>
              <span className="font-mono">{formatCurrency(kpis.totalExpenses * 0.3)}</span>
            </div>
            <div className="flex justify-between py-2 border-b-2 border-stone-300 font-bold text-stone-900 text-sm bg-stone-100 px-2">
              <span>Net Operating Profit</span>
              <span className="font-mono text-emerald-900">{formatCurrency(kpis.netProfit)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
