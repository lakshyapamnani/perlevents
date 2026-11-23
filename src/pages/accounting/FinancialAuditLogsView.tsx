import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  User,
  Clock,
  RotateCcw,
  CheckCircle2,
  Shield,
  Layers,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const FinancialAuditLogsView: React.FC = () => {
  const { financialAuditLogs, banquets } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedBanquet, setSelectedBanquet] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return financialAuditLogs.filter((log) => {
      const matchesSearch =
        log.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.reason && log.reason.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesModule = selectedModule === 'all' || log.module === selectedModule;
      const matchesBanquet = selectedBanquet === 'all' || log.banquetId === selectedBanquet;

      return matchesSearch && matchesModule && matchesBanquet;
    });
  }, [financialAuditLogs, searchQuery, selectedModule, selectedBanquet]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Actor Name', 'Role', 'Action', 'Module', 'Txn ID', 'Banquet', 'Reason / Details'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      `"${l.userName}"`,
      l.userRole,
      `"${l.action}"`,
      l.module,
      l.transactionId,
      l.banquetName || '',
      `"${(l.reason || l.approvalDetails || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(',')].concat(rows.map((r) => r.join(','))).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Financial_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <Shield className="h-5 w-5 text-emerald-600" />
            Financial Audit Trail & Compliance Log
          </h2>
          <p className="text-sm text-stone-600">
            Immutable audit record of every financial transaction creation, adjustment, authorization, and reversal.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 shadow-sm"
        >
          <Download className="h-4 w-4 text-stone-500" />
          Export Audit Trail
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="h-4 w-4 text-stone-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search txn ID, user, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Modules</option>
            <option value="income">Income Records</option>
            <option value="expenses">Expenses</option>
            <option value="vendor_bills">Vendor Bills</option>
            <option value="vendor_payments">Vendor Payments</option>
            <option value="partner_settlements">Partner Settlements</option>
            <option value="journal_entries">Journal Entries</option>
            <option value="spreadsheets">Spreadsheets</option>
            <option value="accountants">Accountants Auth</option>
          </select>

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

        <span className="text-xs font-semibold text-stone-500">
          Showing {filteredLogs.length} logged events
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 uppercase font-semibold text-stone-600 border-b border-stone-200 text-[11px]">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Actor / User</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Module</th>
                <th className="px-5 py-3 font-mono">Txn / Record ID</th>
                <th className="px-5 py-3">Banquet</th>
                <th className="px-5 py-3">Audit Details / Reversal Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-stone-600 italic">
                    No financial audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap font-mono text-stone-600">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 font-medium text-stone-900">
                      <div>{log.userName}</div>
                      <span className="text-[10px] text-stone-600 uppercase font-semibold">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-stone-800">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          log.action.includes('Reversed')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : log.action.includes('Posted') || log.action.includes('Approved')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 uppercase text-[10px] font-semibold text-stone-600">
                      {log.module}
                    </td>
                    <td className="px-5 py-3 font-mono text-stone-900 font-semibold">
                      {log.transactionId}
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      {log.banquetName || 'Headquarters / All'}
                    </td>
                    <td className="px-5 py-3 text-stone-700 max-w-xs">
                      {log.reason && (
                        <div className="text-rose-600 font-semibold">Reason: {log.reason}</div>
                      )}
                      {log.approvalDetails && <div>{log.approvalDetails}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
