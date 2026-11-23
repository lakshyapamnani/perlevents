import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  DollarSign,
  Clock,
  Building2,
  Calendar,
  FileText,
  User,
  Check,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ApprovalThresholdConfig } from '../../types/accounting';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const ApprovalWorkflowView: React.FC = () => {
  const {
    expenseRecords,
    vendorPayments,
    partnerSettlements,
    approvalThresholds,
    updateApprovalThresholds,
    recordExpense,
  } = useData();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  // Config editing state
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [expenseThreshold, setExpenseThreshold] = useState(
    String(approvalThresholds?.autoApproveExpenseBelow || 25000)
  );
  const [vendorPayThreshold, setVendorPayThreshold] = useState(
    String(approvalThresholds?.requireAdminForVendorPaymentsAbove || 50000)
  );
  const [configSuccess, setConfigSuccess] = useState('');

  // Collect pending items
  const pendingExpenses = useMemo(() => {
    return expenseRecords.filter((e) => e.status === 'Pending Approval');
  }, [expenseRecords]);

  const pendingVendorPayments = useMemo(() => {
    return vendorPayments.filter((p) => p.status === 'Pending Approval');
  }, [vendorPayments]);

  const pendingPartnerSettlements = useMemo(() => {
    return partnerSettlements.filter((s) => s.status === 'Pending Approval');
  }, [partnerSettlements]);

  const totalPendingItems =
    pendingExpenses.length + pendingVendorPayments.length + pendingPartnerSettlements.length;

  // Handle Save Threshold Configuration
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const expNum = parseFloat(expenseThreshold) || 25000;
    const vendNum = parseFloat(vendorPayThreshold) || 50000;

    const newConfig: ApprovalThresholdConfig = {
      autoApproveExpenseBelow: expNum,
      requireAdminForVendorPaymentsAbove: vendNum,
      requireAdminForPartnerSettlements: true,
      requireAdminForJournalEntries: true,
    };

    updateApprovalThresholds(newConfig);
    setConfigSuccess('Approval threshold rules updated successfully.');
    setTimeout(() => {
      setIsEditingConfig(false);
      setConfigSuccess('');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Financial Approval Workflow & Internal Controls
          </h2>
          <p className="text-sm text-stone-600">
            Enforce segregation of duties, multi-tier expenditure authorization, and approval thresholds.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsEditingConfig(!isEditingConfig)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-all border border-stone-300 shadow-sm"
          >
            <Settings className="h-4 w-4 text-stone-600" />
            {isEditingConfig ? 'Close Settings' : 'Configure Approval Rules'}
          </button>
        )}
      </div>

      {/* Threshold Config Drawer */}
      {isEditingConfig && isAdmin && (
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-700" />
              Organizational Financial Authorization Limits
            </h3>
            <span className="text-xs text-emerald-800">Admin Privileges Active</span>
          </div>

          {configSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {configSuccess}
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Auto-Approve Expenses Below (₹)
              </label>
              <input
                type="number"
                value={expenseThreshold}
                onChange={(e) => setExpenseThreshold(e.target.value)}
                className="w-full text-xs bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-stone-600 mt-1 block">
                Expenses strictly equal to or exceeding this require Admin authorization.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Require Admin For Vendor Payments Above (₹)
              </label>
              <input
                type="number"
                value={vendorPayThreshold}
                onChange={(e) => setVendorPayThreshold(e.target.value)}
                className="w-full text-xs bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-stone-600 mt-1 block">
                Supplier disbursements over this amount require Admin sign-off.
              </span>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Save Authorization Rules
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Pending Authorization
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{totalPendingItems}</p>
          <span className="text-xs text-stone-600 mt-1 block">Items awaiting sign-off</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Expense Threshold
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">
            {formatCurrency(approvalThresholds?.autoApproveExpenseBelow || 25000)}
          </p>
          <span className="text-xs text-stone-600 mt-1 block">Auto-approval ceiling</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Vendor Payment Limit
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">
            {formatCurrency(approvalThresholds?.requireAdminForVendorPaymentsAbove || 50000)}
          </p>
          <span className="text-xs text-stone-600 mt-1 block">Admin dual-control floor</span>
        </div>
      </div>

      {/* Pending Items List */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900">
            Pending Financial Approvals ({totalPendingItems})
          </h3>
          <span className="text-xs text-stone-500">
            {isAdmin ? 'Admin Authorization Required' : 'Read-only view for Accountants'}
          </span>
        </div>

        {totalPendingItems === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-stone-800">All financial items are fully authorized!</p>
            <p className="text-xs text-stone-500 mt-1">
              There are no pending expenses or supplier payouts exceeding authorization limits.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200 text-sm">
            {/* Pending Expenses */}
            {pendingExpenses.map((e) => (
              <div key={e.id} className="p-4 flex items-center justify-between hover:bg-stone-50/70">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      Expense &gt; Limit
                    </span>
                    <span className="font-bold text-stone-900">{e.expenseId}</span>
                    <span className="text-stone-500 text-xs">· {formatDate(e.date)}</span>
                  </div>
                  <div className="text-xs text-stone-700">
                    Category: <strong>{e.category}</strong> · Venue: {e.banquetName} · Submitted by:{' '}
                    {e.createdByName}
                  </div>
                  <div className="text-xs text-stone-500 italic">{e.description}</div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-base font-bold font-mono text-stone-900">
                    {formatCurrency(e.totalAmount)}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          e.status = 'Approved';
                          e.approvedBy = currentUser?.uid;
                          e.approvedByName = currentUser?.fullName;
                          // trigger update
                          recordExpense({
                            category: e.category,
                            banquetId: e.banquetId,
                            banquetName: e.banquetName,
                            amount: e.amount,
                            taxAmount: e.taxAmount,
                            paymentStatus: e.paymentStatus,
                            paymentMode: e.paymentMode,
                            description: e.description,
                            date: e.date,
                            status: 'Approved',
                          });
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
