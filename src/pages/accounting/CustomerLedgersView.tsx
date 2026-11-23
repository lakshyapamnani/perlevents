import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Calendar,
  Building2,
  Download,
  Printer,
  ChevronRight,
  X,
  CreditCard,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { accountingEngine, CustomerFinancialProfile } from '../../services/accountingEngine';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface CustomerLedgersViewProps {
  onOpenIncomeModal?: () => void;
}

export const CustomerLedgersView: React.FC<CustomerLedgersViewProps> = ({ onOpenIncomeModal }) => {
  const { clients, events, invoices, payments } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'outstanding' | 'settled'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerFinancialProfile | null>(null);

  // Compute Customer Profiles using accounting engine
  const customerProfiles: CustomerFinancialProfile[] = useMemo(() => {
    return accountingEngine.getCustomerFinancialProfiles();
  }, [clients, events, invoices, payments]);

  // Aggregate summaries
  const totalBookingValue = useMemo(
    () => customerProfiles.reduce((sum, c) => sum + c.totalBookingValue, 0),
    [customerProfiles]
  );
  const totalInvoiced = useMemo(
    () => customerProfiles.reduce((sum, c) => sum + c.totalInvoiced, 0),
    [customerProfiles]
  );
  const totalReceived = useMemo(
    () => customerProfiles.reduce((sum, c) => sum + c.totalAmountReceived, 0),
    [customerProfiles]
  );
  const totalOutstanding = useMemo(
    () => customerProfiles.reduce((sum, c) => sum + c.outstandingBalance, 0),
    [customerProfiles]
  );

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customerProfiles.filter((c) => {
      const matchesSearch = c.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'outstanding'
          ? c.outstandingBalance > 0
          : c.outstandingBalance === 0;
      return matchesSearch && matchesStatus;
    });
  }, [customerProfiles, searchQuery, statusFilter]);

  // Export ledger to CSV
  const handleExportCSV = (profile: CustomerFinancialProfile) => {
    const headers = ['Date', 'Type', 'Reference #', 'Banquet', 'Description', 'Debit (₹)', 'Credit (₹)', 'Running Balance (₹)'];
    const rows = profile.ledger.map((l) => [
      l.date,
      l.type,
      l.referenceNumber,
      l.banquetName || '',
      `"${l.description.replace(/"/g, '""')}"`,
      l.debit || 0,
      l.credit || 0,
      l.runningBalance || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`Customer: ${profile.customerName}`, `Total Outstanding: ₹${profile.outstandingBalance}`, '']
        .concat([headers.join(',')])
        .concat(rows.map((r) => r.join(',')))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Customer_Ledger_${profile.customerName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print customer statement
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Customer Ledgers & Accounts Receivable
          </h2>
          <p className="text-sm text-stone-600">
            Chronological debtor statements of account with debit/credit breakdown, invoices, and running balances.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Booking Value
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">
            {formatCurrency(totalBookingValue)}
          </p>
          <span className="text-xs text-stone-600 mt-1 block">Contracted event commitments</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Invoiced
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">
            {formatCurrency(totalInvoiced)}
          </p>
          <span className="text-xs text-stone-600 mt-1 block">Billed via formal tax invoices</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Amount Received
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {formatCurrency(totalReceived)}
          </p>
          <span className="text-xs text-stone-600 mt-1 block">Realized customer payments</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200/80 shadow-sm bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Outstanding Receivables
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">
            {formatCurrency(totalOutstanding)}
          </p>
          <span className="text-xs text-amber-700 mt-1 block">Pending client settlements</span>
        </div>
      </div>

      {/* Main Customers List */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Clients ({customerProfiles.length})
            </button>
            <button
              onClick={() => setStatusFilter('outstanding')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'outstanding'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Outstanding Balance ({customerProfiles.filter((c) => c.outstandingBalance > 0).length})
            </button>
            <button
              onClick={() => setStatusFilter('settled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'settled'
                  ? 'bg-stone-100 text-stone-800 border border-stone-300'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Fully Settled ({customerProfiles.filter((c) => c.outstandingBalance === 0).length})
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="h-4 w-4 text-stone-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-700">
            <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-600 border-b border-stone-200">
              <tr>
                <th className="px-5 py-3">Customer Name</th>
                <th className="px-5 py-3 text-center">Events</th>
                <th className="px-5 py-3 text-right">Booking Value</th>
                <th className="px-5 py-3 text-right">Total Invoiced</th>
                <th className="px-5 py-3 text-right">Total Received</th>
                <th className="px-5 py-3 text-right">Outstanding Balance</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-stone-600">
                    No customer accounts found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cp) => (
                  <tr
                    key={cp.customerId}
                    onClick={() => setSelectedCustomer(cp)}
                    className="hover:bg-stone-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-stone-900">{cp.customerName}</div>
                      <div className="text-xs text-stone-600">ID: {cp.customerId}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center font-medium">
                      {cp.associatedEventsCount}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-stone-700">
                      {formatCurrency(cp.totalBookingValue)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-stone-800">
                      {formatCurrency(cp.totalInvoiced)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
                      {formatCurrency(cp.totalAmountReceived)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`font-bold ${
                          cp.outstandingBalance > 0 ? 'text-amber-700' : 'text-stone-500'
                        }`}
                      >
                        {formatCurrency(cp.outstandingBalance)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          cp.outstandingBalance > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {cp.outstandingBalance > 0 ? 'Pending' : 'Settled'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(cp);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                      >
                        View Ledger
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAWER / MODAL: Detailed Customer Chronological Ledger */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">
                    {selectedCustomer.customerName}
                  </h3>
                  <p className="text-xs text-stone-600">
                    Statement of Account & Chronological Ledger · ID: {selectedCustomer.customerId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportCSV(selectedCustomer)}
                    className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
                    title="Export CSV"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
                    title="Print Statement"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-600 uppercase font-semibold block">
                    Bookings
                  </span>
                  <span className="text-base font-bold text-stone-900">
                    {formatCurrency(selectedCustomer.totalBookingValue)}
                  </span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-600 uppercase font-semibold block">
                    Invoiced
                  </span>
                  <span className="text-base font-bold text-stone-900">
                    {formatCurrency(selectedCustomer.totalInvoiced)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-[11px] text-emerald-800 uppercase font-semibold block">
                    Received
                  </span>
                  <span className="text-base font-bold text-emerald-700">
                    {formatCurrency(selectedCustomer.totalAmountReceived)}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-[11px] text-amber-800 uppercase font-semibold block">
                    Outstanding
                  </span>
                  <span className="text-base font-bold text-amber-700">
                    {formatCurrency(selectedCustomer.outstandingBalance)}
                  </span>
                </div>
              </div>

              {/* Chronological Table */}
              <div>
                <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Chronological Transaction Ledger ({selectedCustomer.ledger.length} entries)
                </h4>

                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-50 text-[11px] uppercase font-semibold text-stone-600 border-b border-stone-200">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Type & Ref</th>
                        <th className="px-3 py-2.5">Details</th>
                        <th className="px-3 py-2.5 text-right">Debit (+)</th>
                        <th className="px-3 py-2.5 text-right">Credit (-)</th>
                        <th className="px-3 py-2.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {selectedCustomer.ledger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-stone-600 italic">
                            No ledger entries found for this customer.
                          </td>
                        </tr>
                      ) : (
                        selectedCustomer.ledger.map((row) => (
                          <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="px-3 py-2.5 font-medium text-stone-800 whitespace-nowrap">
                              {formatDate(row.date)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  row.type === 'Booking Invoice'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : row.type === 'Payment Received'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {row.type}
                              </span>
                              <div className="text-[11px] text-stone-600 mt-0.5 font-mono">
                                {row.referenceNumber}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 max-w-xs">
                              <div className="text-stone-800 font-medium">{row.description}</div>
                              {row.banquetName && (
                                <div className="text-[10px] text-stone-600">{row.banquetName}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-stone-900">
                              {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                              {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-stone-900">
                              {formatCurrency(row.runningBalance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <span className="text-xs text-stone-600">
                Running balance accounts for all verified debit and credit items.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
                >
                  Close
                </button>
                {onOpenIncomeModal && (
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      onOpenIncomeModal();
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    Record Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
