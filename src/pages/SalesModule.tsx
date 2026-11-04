import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  BadgeDollarSign,
  Plus,
  Search,
  Filter,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  User,
  ArrowRight,
  Phone,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

interface SalesModuleProps {
  onOpenDirectSale: () => void;
  onOpenCreateInvoice: () => void;
  onSelectEvent: (eventId: string) => void;
  onOpenRecordPayment?: (eventId: string, clientId: string, balance: number) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  onOpenDirectSale,
  onOpenCreateInvoice,
  onSelectEvent,
  onOpenRecordPayment,
}) => {
  const { sales, banquets, deleteSale } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [banquetFilter, setBanquetFilter] = useState('all');
  const [saleToDelete, setSaleToDelete] = useState<any | null>(null);

  const handleDeleteConfirmed = () => {
    if (!saleToDelete) return;
    const res = deleteSale(saleToDelete.id);
    if (!res.success) {
      alert(res.error || 'Failed to delete sale.');
    }
    setSaleToDelete(null);
  };

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.salespersonName && s.salespersonName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesBanquet = banquetFilter === 'all' || s.banquetId === banquetFilter;
    return matchesSearch && matchesBanquet;
  });

  // Calculate summary metrics
  const totalContracted = filteredSales.reduce((sum, s) => sum + (s.finalSaleAmount || 0), 0);
  const totalReceived = filteredSales.reduce((sum, s) => sum + (s.paymentsReceived || 0), 0);
  const totalPending = filteredSales.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <BadgeDollarSign className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Structured Sales Cards</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Real-time direct sales records, payment receipts, and balance tracking across all luxury venues.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenCreateInvoice}
            className="flex-1 sm:flex-initial px-3.5 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>New Invoice</span>
          </button>
          <button
            onClick={onOpenDirectSale}
            className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Direct Sale</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
            Total Contracted Sales ({filteredSales.length})
          </span>
          <span className="text-lg font-extrabold text-stone-900 dark:text-stone-100 tabular-nums">
            {formatCurrency(totalContracted)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
            Total Payments Received
          </span>
          <span className="text-lg font-extrabold text-emerald-800 dark:text-emerald-400 tabular-nums">
            {formatCurrency(totalReceived)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 block">
            Total Pending Balance
          </span>
          <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
            {formatCurrency(totalPending)}
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by event, client or salesperson..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div>
          <select
            value={banquetFilter}
            onChange={(e) => setBanquetFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
          >
            <option value="all">All Banquets & Venues</option>
            {banquets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Structured Sales Cards: Exactly 3 cards per line on desktop */}
      {filteredSales.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
          <BadgeDollarSign className="w-10 h-10 text-stone-300 mx-auto" />
          <div className="text-sm font-bold text-stone-800 dark:text-stone-200">No Sales Records Found</div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Create a new direct sale booking to track revenue, deposits, and remaining client balances.
          </p>
          <button
            onClick={onOpenDirectSale}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Direct Sale</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSales.map((sale) => {
            const isFullyPaid = sale.outstandingBalance <= 0;
            const hasPartial = sale.paymentsReceived > 0 && !isFullyPaid;

            return (
              <div
                key={sale.id}
                onClick={() => onSelectEvent(sale.eventId)}
                className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:shadow-md hover:border-emerald-600/70 transition-all cursor-pointer flex flex-col justify-between group space-y-4 relative"
              >
                {/* Card Top: Badges & Event Title */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isFullyPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : hasPartial
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {isFullyPaid ? 'Fully Paid' : hasPartial ? 'Partially Paid' : 'Payment Pending'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{formatDate(sale.saleDate)}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSaleToDelete(sale);
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete Sale"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {sale.eventName}
                    </h3>
                    <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        {sale.clientName}
                      </span>
                    </div>
                  </div>

                  {/* Venue & Assigned Salesperson Specs */}
                  <div className="pt-2 space-y-1.5 text-xs text-stone-600 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium truncate">{sale.banquetName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">
                        Sales: <strong className="text-stone-800 dark:text-stone-200">{sale.salespersonName || 'Direct'}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Highlights Breakdown Box */}
                <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-800 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-stone-400 block">
                      Total
                    </span>
                    <span className="font-extrabold text-stone-900 dark:text-stone-100 tabular-nums">
                      {formatCurrency(sale.finalSaleAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                      Paid
                    </span>
                    <span className="font-extrabold text-emerald-800 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(sale.paymentsReceived)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                      Pending
                    </span>
                    <span
                      className={`font-extrabold tabular-nums ${
                        sale.outstandingBalance > 0
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-stone-400'
                      }`}
                    >
                      {formatCurrency(sale.outstandingBalance)}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                  {sale.outstandingBalance > 0 && onOpenRecordPayment ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRecordPayment(sale.eventId, sale.clientId, sale.outstandingBalance);
                      }}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 transition-colors"
                      title="Record Payment from Client"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settled</span>
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSaleToDelete(sale);
                      }}
                      className="px-2 py-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Delete Sale Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectEvent(sale.eventId)}
                      className="text-xs font-bold text-stone-700 dark:text-stone-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <span>Event Details</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/60">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Delete Sale Record?
                </h3>
                <p className="text-xs text-stone-500">
                  This action will remove the sale record.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 text-xs space-y-1.5">
              <div className="font-semibold text-stone-900 dark:text-stone-100">
                {saleToDelete.eventName}
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                Client: <span className="font-medium text-stone-800 dark:text-stone-200">{saleToDelete.clientName}</span>
              </div>
              <div className="text-stone-600 dark:text-stone-400">
                Final Amount: <span className="font-bold text-stone-900 dark:text-stone-100">{formatCurrency(saleToDelete.finalSaleAmount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Yes, Delete Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
