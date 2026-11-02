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
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

interface SalesModuleProps {
  onOpenDirectSale: () => void;
  onOpenCreateInvoice: () => void;
  onSelectEvent: (eventId: string) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  onOpenDirectSale,
  onOpenCreateInvoice,
  onSelectEvent,
}) => {
  const { sales, banquets } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [banquetFilter, setBanquetFilter] = useState('all');

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBanquet = banquetFilter === 'all' || s.banquetId === banquetFilter;
    return matchesSearch && matchesBanquet;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <BadgeDollarSign className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Structured Sales Ledger</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Dedicated sales records tracking contracted sale values, advance deposits, and outstanding balances.
          </p>
        </div>

        <button
          onClick={onOpenDirectSale}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Direct Sale</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client or event name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          />
        </div>

        <div>
          <select
            value={banquetFilter}
            onChange={(e) => setBanquetFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          >
            <option value="all">All Banquets</option>
            {banquets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="divide-y divide-stone-200 dark:divide-stone-800 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
        <div className="hidden sm:grid grid-cols-12 gap-3 p-4 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40">
          <div className="col-span-4">Event & Client</div>
          <div className="col-span-3">Banquet Hall</div>
          <div className="col-span-2 text-right">Sale Total</div>
          <div className="col-span-2 text-right">Payments Received</div>
          <div className="col-span-1 text-right">Balance</div>
        </div>

        {filteredSales.map((sale) => (
          <div
            key={sale.id}
            onClick={() => onSelectEvent(sale.eventId)}
            className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer transition-colors text-xs"
          >
            <div className="sm:col-span-4">
              <div className="font-bold text-stone-900 dark:text-stone-100">{sale.eventName}</div>
              <div className="text-[11px] text-stone-500">
                Client: {sale.clientName} · Sales: {sale.salespersonName}
              </div>
            </div>

            <div className="sm:col-span-3 text-stone-600 dark:text-stone-300">
              <div>{sale.banquetName}</div>
              <div className="text-[11px] text-stone-400">Date: {formatDate(sale.saleDate)}</div>
            </div>

            <div className="sm:col-span-2 sm:text-right font-bold text-stone-900 dark:text-stone-100 tabular-nums">
              <span className="sm:hidden text-stone-500 font-normal">Sale Total: </span>
              {formatCurrency(sale.finalSaleAmount)}
            </div>

            <div className="sm:col-span-2 sm:text-right font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
              <span className="sm:hidden text-stone-500 font-normal">Received: </span>
              {formatCurrency(sale.paymentsReceived)}
            </div>

            <div className="sm:col-span-1 sm:text-right font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              <span className="sm:hidden text-stone-500 font-normal">Balance: </span>
              {formatCurrency(sale.outstandingBalance)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
