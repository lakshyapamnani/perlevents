import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Printer,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { downloadEventInvoicePDF } from '../utils/pdfReceiptGenerator';

interface InvoicesModuleProps {
  onOpenCreateInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onOpenRecordPayment: (eventId: string, clientId: string, balance: number) => void;
}

export const InvoicesModule: React.FC<InvoicesModuleProps> = ({
  onOpenCreateInvoice,
  onViewInvoice,
  onOpenRecordPayment,
}) => {
  const { invoices, events, clients, payments, settings } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadgeConfig: Record<InvoiceStatus, { label: string; bg: string; text: string }> = {
    draft: { label: 'Draft', bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-300' },
    issued: { label: 'Issued', bg: 'bg-sky-100 dark:bg-sky-950', text: 'text-sky-800 dark:text-sky-300' },
    partially_paid: { label: 'Partially Paid', bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-800 dark:text-amber-300' },
    paid: { label: 'Fully Paid', bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-800 dark:text-emerald-300' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' },
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Client Invoices & PDF Billing</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Generate, issue, and print client invoices with itemized charges and payment tracking.
          </p>
        </div>

        <button
          onClick={onOpenCreateInvoice}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by invoice number, client or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          >
            <option value="all">All Invoice Statuses</option>
            <option value="issued">Issued</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Fully Paid</option>
            <option value="draft">Drafts</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 bg-white dark:bg-stone-900 rounded-xl border border-stone-200">
            No invoices found.
          </div>
        ) : (
          <div className="divide-y divide-stone-200 dark:divide-stone-800 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
            {filteredInvoices.map((inv) => {
              const badge = statusBadgeConfig[inv.status] || statusBadgeConfig.issued;

              return (
                <div
                  key={inv.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-stone-300">·</span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Dated: {formatDate(inv.invoiceDate)}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {inv.clientName}
                    </div>

                    <div className="text-xs text-stone-500">
                      Event: {inv.eventName} ({inv.banquetName})
                    </div>
                  </div>

                  {/* Financial & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatCurrency(inv.finalTotal)}
                      </div>
                      <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                        Balance Due: {formatCurrency(inv.remainingBalance)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inv.remainingBalance > 0 && (
                        <button
                          onClick={() =>
                            onOpenRecordPayment(inv.eventId, inv.clientId, inv.remainingBalance)
                          }
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-semibold"
                        >
                          + Pay
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const ev = events.find((e) => e.id === inv.eventId) || {
                            id: inv.eventId,
                            name: inv.eventName,
                            eventType: inv.eventType,
                            clientId: inv.clientId,
                            clientName: inv.clientName,
                            clientPhone: inv.clientPhone,
                            clientWhatsApp: inv.clientPhone,
                            banquetId: '',
                            banquetName: inv.banquetName,
                            date: inv.eventDate,
                            startTime: inv.eventTime.split('-')[0]?.trim() || '18:00',
                            endTime: inv.eventTime.split('-')[1]?.trim() || '23:30',
                            guestCount: 200,
                            requirements: '',
                            status: 'confirmed' as const,
                            salespersonId: '',
                            salespersonName: '',
                            quotedAmount: inv.finalTotal,
                            discount: inv.discount,
                            finalAmount: inv.finalTotal,
                            advanceRequested: inv.advanceRequested,
                            advanceReceived: inv.actualAdvanceReceived,
                            remainingBalance: inv.remainingBalance,
                            paymentTerms: inv.paymentTerms,
                            referencePhotos: [],
                            vendorAssignments: [],
                            createdAt: inv.createdAt,
                            updatedAt: inv.updatedAt,
                            createdBy: inv.createdBy,
                          };
                          const cl = clients.find((c) => c.id === inv.clientId);
                          downloadEventInvoicePDF({
                            event: ev,
                            client: cl,
                            invoice: inv,
                            payments,
                            settings,
                          });
                        }}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-stone-200 dark:border-stone-700 transition-colors"
                        title="Download Tax Invoice PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Download</span>
                      </button>

                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
