/**
 * Pearl Experiences - Enterprise Accounting Engine
 * Implements double-entry bookkeeping, ledger generation, financial KPIs,
 * decimal-safe calculations (integer paise), audit logs, and transaction workflows.
 */

import {
  IncomeRecord,
  ExpenseRecord,
  VendorBill,
  VendorPaymentRecord,
  CustomerLedgerEntry,
  VendorLedgerEntry,
  AccountingPartner,
  BanquetPartnerMapping,
  PartnerSettlement,
  ChartOfAccount,
  JournalEntry,
  JournalLineItem,
  BankAccount,
  BankReconciliationRecord,
  FinancialAuditLog,
  ApprovalThresholdConfig,
  ApprovalStatus,
  VoucherType,
  PaymentMode,
  SpreadsheetWorkbook,
} from '../types/accounting';
import { UserProfile, EventRecord, Banquet, Invoice, Payment, Sale } from '../types';
import { realtimeEngine } from './realtimeEngine';
import { writeRealtimeNode, isFirebaseConfigured } from './firebase';

export interface AccountingKPIs {
  totalRevenue: number;
  totalReceived: number;
  totalReceivables: number;
  totalExpenses: number;
  totalVendorPayables: number;
  totalPartnerPayables: number;
  grossProfit: number;
  netOperatingProfit: number;
  netProfit: number;
  availableCash: number;
  bankBalance: number;
  totalCashAndBank: number;
}

export interface BanquetFinancialProfile {
  banquetId: string;
  banquetName: string;
  totalBookings: number;
  totalSalesValue: number;
  totalRevenue: number;
  totalReceived: number;
  outstandingReceivables: number;
  totalExpenses: number;
  vendorExpenses: number;
  operatingExpenses: number;
  netProfit: number;
  profitMarginPercentage: number;
  partnerAllocations: Array<{
    partnerId: string;
    partnerName: string;
    ownershipPercentage: number;
    profitSharingPercentage: number;
    entitledProfitShare: number;
    amountPaid: number;
    outstandingPayable: number;
  }>;
}

export interface PartnerFinancialProfile {
  partnerId: string;
  partnerName: string;
  phone: string;
  email: string;
  associatedBanquets: Array<{
    banquetId: string;
    banquetName: string;
    ownershipPercentage: number;
    profitSharingPercentage: number;
  }>;
  totalAttributableRevenue: number;
  totalAttributableExpenses: number;
  totalProfitShare: number;
  totalAmountPaid: number;
  totalOutstandingAmount: number;
  settlementHistory: PartnerSettlement[];
}

export interface VendorFinancialProfile {
  vendorId: string;
  vendorName: string;
  serviceCategory: string;
  associatedEventsCount: number;
  totalAgreedAmount: number;
  totalBilledAmount: number;
  totalPaidAmount: number;
  pendingBalance: number;
  paymentHistory: VendorPaymentRecord[];
}

export interface CustomerFinancialProfile {
  customerId: string;
  customerName: string;
  associatedEventsCount: number;
  totalBookingValue: number;
  totalInvoiced: number;
  totalAmountReceived: number;
  outstandingBalance: number;
  ledger: CustomerLedgerEntry[];
}

export interface DateFilterRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

class AccountingEngineService {
  /**
   * Safe decimal money conversion to integer paise
   */
  public toPaise(amount: number): number {
    return Math.round((Number(amount) || 0) * 100);
  }

  /**
   * Safe conversion from integer paise back to Rupee decimal
   */
  public fromPaise(paise: number): number {
    return Math.round(Number(paise) || 0) / 100;
  }

  /**
   * Formats numbers to Indian Currency string
   */
  public formatINR(amount: number): string {
    const val = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  }

  /**
   * Generates unique transaction and voucher IDs
   */
  public generateId(prefix: string): string {
    const dateStr = new Date().toISOString().replace(/\D/g, '').slice(2, 10);
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${dateStr}-${rand}`;
  }

  /**
   * Creates an audit log entry and notifies listeners
   */
  public logAudit(
    user: UserProfile,
    action: string,
    module: FinancialAuditLog['module'],
    transactionId: string,
    details?: {
      banquetId?: string;
      banquetName?: string;
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
      reason?: string;
      approvalDetails?: string;
    }
  ): FinancialAuditLog {
    const log: FinancialAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.uid,
      userName: user.fullName,
      userRole: user.role,
      action,
      module,
      transactionId,
      banquetId: details?.banquetId,
      banquetName: details?.banquetName,
      previousValues: details?.previousValues,
      newValues: details?.newValues,
      timestamp: new Date().toISOString(),
      reason: details?.reason,
      approvalDetails: details?.approvalDetails,
    };

    const state = realtimeEngine.getState();
    if (!state.financialAuditLogs) state.financialAuditLogs = [];
    state.financialAuditLogs.unshift(log);

    // Also mirror to global activity logs for Admin visibility
    realtimeEngine.logActivity({
      actorId: user.uid,
      actorName: user.fullName,
      actorRole: user.role,
      action,
      module: 'payments',
      recordId: transactionId,
      details: `${user.role === 'accountant' ? 'Accountant ' : ''}${user.fullName} ${action.toLowerCase()} (${transactionId})${
        details?.banquetName ? ` for ${details.banquetName}` : ''
      }.`,
    });

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/auditLogs/${log.id}`, log).catch(() => {});
    }

    return log;
  }

  /**
   * Record Incoming Payment / Income Record
   */
  public recordIncome(
    user: UserProfile,
    data: {
      date: string;
      amount: number;
      category: IncomeRecord['category'];
      banquetId: string;
      banquetName: string;
      eventId?: string;
      eventName?: string;
      customerId?: string;
      customerName?: string;
      invoiceNumber?: string;
      paymentMode: PaymentMode;
      bankAccountId?: string;
      bankAccountName?: string;
      referenceNumber?: string;
      description: string;
      attachmentUrl?: string;
      status?: ApprovalStatus;
    }
  ): { success: boolean; income?: IncomeRecord; error?: string } {
    if (data.amount <= 0) {
      return { success: false, error: 'Income amount must be greater than zero.' };
    }

    const state = realtimeEngine.getState();
    const safeAmount = this.fromPaise(this.toPaise(data.amount));

    // Duplicate prevention check: same banquet, date, category, amount, reference
    if (data.referenceNumber && data.referenceNumber.trim()) {
      const existing = Object.values(state.incomeRecords || {}).find(
        (inc) =>
          inc.status !== 'Reversed' &&
          inc.referenceNumber?.toLowerCase() === data.referenceNumber?.toLowerCase() &&
          inc.banquetId === data.banquetId &&
          inc.amount === safeAmount
      );
      if (existing) {
        return {
          success: false,
          error: `Duplicate income detected: Transaction ${existing.transactionId} already has reference "${data.referenceNumber}".`,
        };
      }
    }

    const transactionId = this.generateId('PX-INC');
    const incomeId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newIncome: IncomeRecord = {
      id: incomeId,
      transactionId,
      date: data.date,
      amount: safeAmount,
      amountPaise: this.toPaise(safeAmount),
      category: data.category,
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      eventId: data.eventId,
      eventName: data.eventName,
      customerId: data.customerId,
      customerName: data.customerName,
      invoiceNumber: data.invoiceNumber,
      paymentMode: data.paymentMode,
      bankAccountId: data.bankAccountId,
      bankAccountName: data.bankAccountName,
      referenceNumber: data.referenceNumber,
      description: data.description,
      attachmentUrl: data.attachmentUrl,
      status: data.status || 'Posted',
      createdBy: user.uid,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.incomeRecords) state.incomeRecords = {};
    state.incomeRecords[incomeId] = newIncome;

    // Update Bank Account balance if linked
    if (data.bankAccountId && state.bankAccounts?.[data.bankAccountId]) {
      const bank = state.bankAccounts[data.bankAccountId];
      bank.totalCredits = this.fromPaise(this.toPaise(bank.totalCredits) + this.toPaise(safeAmount));
      bank.currentBalance = this.fromPaise(this.toPaise(bank.openingBalance) + this.toPaise(bank.totalCredits) - this.toPaise(bank.totalDebits));
    }

    // Update Customer Ledger
    if (data.customerId) {
      this.appendCustomerLedgerEntry(state, {
        customerId: data.customerId,
        customerName: data.customerName || 'Customer',
        date: data.date,
        type: 'Payment Received',
        referenceNumber: transactionId,
        eventId: data.eventId,
        eventName: data.eventName,
        banquetName: data.banquetName,
        description: data.description || `${data.category} received via ${data.paymentMode}`,
        debit: 0,
        credit: safeAmount,
        paymentMode: data.paymentMode,
      });
    }

    // Auto-create balanced Double-Entry Journal Entry
    this.createJournalForIncome(state, user, newIncome);

    // Audit log
    this.logAudit(user, 'Recorded Income', 'income', transactionId, {
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      newValues: { ...newIncome },
    });

    realtimeEngine.saveState(state);
    realtimeEngine.notify();

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/income/${incomeId}`, newIncome).catch(() => {});
    }

    return { success: true, income: newIncome };
  }

  /**
   * Record Expense Entry
   */
  public recordExpense(
    user: UserProfile,
    data: {
      date: string;
      banquetId: string;
      banquetName: string;
      eventId?: string;
      eventName?: string;
      category: ExpenseRecord['category'];
      vendorId?: string;
      vendorName?: string;
      description: string;
      amount: number;
      taxAmount?: number;
      paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
      paymentMode: PaymentMode;
      bankAccountId?: string;
      bankAccountName?: string;
      referenceNumber?: string;
      invoiceNumber?: string;
      attachmentUrl?: string;
      notes?: string;
      status?: ApprovalStatus;
    }
  ): { success: boolean; expense?: ExpenseRecord; error?: string } {
    if (data.amount <= 0) {
      return { success: false, error: 'Expense amount must be greater than zero.' };
    }

    const state = realtimeEngine.getState();
    const safeAmount = this.fromPaise(this.toPaise(data.amount));
    const safeTax = this.fromPaise(this.toPaise(data.taxAmount || 0));
    const totalAmount = this.fromPaise(this.toPaise(safeAmount) + this.toPaise(safeTax));

    // Determine approval threshold
    const threshold = state.approvalThresholds?.autoApproveExpenseBelow || 25000;
    let computedStatus: ApprovalStatus = data.status || 'Posted';
    if (totalAmount > threshold && user.role !== 'admin' && computedStatus === 'Posted') {
      computedStatus = 'Pending Approval';
    }

    const expenseId = this.generateId('PX-EXP');
    const recordId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newExpense: ExpenseRecord = {
      id: recordId,
      expenseId,
      date: data.date,
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      eventId: data.eventId,
      eventName: data.eventName,
      category: data.category,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      description: data.description,
      amount: safeAmount,
      taxAmount: safeTax,
      totalAmount,
      amountPaise: this.toPaise(totalAmount),
      paymentStatus: data.paymentStatus,
      paymentMode: data.paymentMode,
      bankAccountId: data.bankAccountId,
      bankAccountName: data.bankAccountName,
      referenceNumber: data.referenceNumber,
      invoiceNumber: data.invoiceNumber,
      attachmentUrl: data.attachmentUrl,
      status: computedStatus,
      notes: data.notes,
      createdBy: user.uid,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.expenseRecords) state.expenseRecords = {};
    state.expenseRecords[recordId] = newExpense;

    // If paid and approved/posted, update Bank Account
    if (computedStatus === 'Posted' && data.paymentStatus === 'Paid' && data.bankAccountId && state.bankAccounts?.[data.bankAccountId]) {
      const bank = state.bankAccounts[data.bankAccountId];
      bank.totalDebits = this.fromPaise(this.toPaise(bank.totalDebits) + this.toPaise(totalAmount));
      bank.currentBalance = this.fromPaise(this.toPaise(bank.openingBalance) + this.toPaise(bank.totalCredits) - this.toPaise(bank.totalDebits));
    }

    // Auto-create balanced journal entry
    if (computedStatus === 'Posted') {
      this.createJournalForExpense(state, user, newExpense);
    }

    // Audit log
    this.logAudit(user, 'Recorded Expense', 'expenses', expenseId, {
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      newValues: { ...newExpense },
    });

    realtimeEngine.saveState(state);
    realtimeEngine.notify();

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/expenses/${recordId}`, newExpense).catch(() => {});
    }

    return { success: true, expense: newExpense };
  }

  /**
   * Record Vendor Bill
   */
  public recordVendorBill(
    user: UserProfile,
    data: {
      billNumber: string;
      billDate: string;
      dueDate: string;
      vendorId: string;
      vendorName: string;
      banquetId?: string;
      banquetName?: string;
      eventId?: string;
      eventName?: string;
      category: string;
      totalAmount: number;
      notes?: string;
      attachmentUrl?: string;
    }
  ): { success: boolean; bill?: VendorBill; error?: string } {
    if (data.totalAmount <= 0) {
      return { success: false, error: 'Vendor bill amount must be greater than zero.' };
    }

    const state = realtimeEngine.getState();
    const safeAmount = this.fromPaise(this.toPaise(data.totalAmount));
    const billId = `vbill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newBill: VendorBill = {
      id: billId,
      billNumber: data.billNumber.trim() || this.generateId('PX-VBILL'),
      billDate: data.billDate,
      dueDate: data.dueDate,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      eventId: data.eventId,
      eventName: data.eventName,
      category: data.category,
      totalAmount: safeAmount,
      paidAmount: 0,
      pendingAmount: safeAmount,
      status: 'Unpaid',
      notes: data.notes,
      attachmentUrl: data.attachmentUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.vendorBills) state.vendorBills = {};
    state.vendorBills[billId] = newBill;

    // Update Vendor Ledger: credit increases payable
    this.appendVendorLedgerEntry(state, {
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      date: data.billDate,
      type: 'Vendor Bill',
      referenceNumber: newBill.billNumber,
      eventId: data.eventId,
      eventName: data.eventName,
      banquetName: data.banquetName,
      description: `Bill received for ${data.category}`,
      debit: 0,
      credit: safeAmount,
    });

    this.logAudit(user, 'Recorded Vendor Bill', 'vendor_bills', newBill.billNumber, {
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      newValues: { ...newBill },
    });

    realtimeEngine.saveState(state);
    realtimeEngine.notify();

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/vendorBills/${billId}`, newBill).catch(() => {});
    }

    return { success: true, bill: newBill };
  }

  /**
   * Record Vendor Payment (Advance, Partial, or Final Settlement)
   */
  public recordVendorPayment(
    user: UserProfile,
    data: {
      paymentDate: string;
      vendorId: string;
      vendorName: string;
      billId?: string;
      banquetId?: string;
      banquetName?: string;
      eventId?: string;
      eventName?: string;
      paymentType: 'Advance' | 'Partial' | 'Final Settlement';
      amount: number;
      paymentMode: PaymentMode;
      bankAccountId?: string;
      bankAccountName?: string;
      referenceNumber?: string;
      receiptUrl?: string;
      notes?: string;
    }
  ): { success: boolean; payment?: VendorPaymentRecord; error?: string } {
    if (data.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    const state = realtimeEngine.getState();
    const safeAmount = this.fromPaise(this.toPaise(data.amount));
    const transactionId = this.generateId('PX-VPAY');
    const paymentId = `vpay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Update linked bill if provided
    let linkedBillNumber: string | undefined;
    if (data.billId && state.vendorBills?.[data.billId]) {
      const bill = state.vendorBills[data.billId];
      linkedBillNumber = bill.billNumber;
      const newPaid = this.fromPaise(this.toPaise(bill.paidAmount) + this.toPaise(safeAmount));
      bill.paidAmount = newPaid;
      bill.pendingAmount = Math.max(0, this.fromPaise(this.toPaise(bill.totalAmount) - this.toPaise(newPaid)));
      bill.status = bill.pendingAmount === 0 ? 'Paid' : 'Partially Paid';
      bill.updatedAt = new Date().toISOString();
    }

    const newPayment: VendorPaymentRecord = {
      id: paymentId,
      transactionId,
      paymentDate: data.paymentDate,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      billId: data.billId,
      billNumber: linkedBillNumber,
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      eventId: data.eventId,
      eventName: data.eventName,
      paymentType: data.paymentType,
      amount: safeAmount,
      amountPaise: this.toPaise(safeAmount),
      paymentMode: data.paymentMode,
      bankAccountId: data.bankAccountId,
      bankAccountName: data.bankAccountName,
      referenceNumber: data.referenceNumber,
      receiptUrl: data.receiptUrl,
      notes: data.notes,
      status: 'Posted',
      createdBy: user.uid,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.vendorPaymentRecords) state.vendorPaymentRecords = {};
    state.vendorPaymentRecords[paymentId] = newPayment;

    // Deduct from bank account
    if (data.bankAccountId && state.bankAccounts?.[data.bankAccountId]) {
      const bank = state.bankAccounts[data.bankAccountId];
      bank.totalDebits = this.fromPaise(this.toPaise(bank.totalDebits) + this.toPaise(safeAmount));
      bank.currentBalance = this.fromPaise(this.toPaise(bank.openingBalance) + this.toPaise(bank.totalCredits) - this.toPaise(bank.totalDebits));
    }

    // Update Vendor Ledger: debit decreases payable
    this.appendVendorLedgerEntry(state, {
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      date: data.paymentDate,
      type: data.paymentType === 'Advance' ? 'Advance Paid' : 'Payment Made',
      referenceNumber: transactionId,
      eventId: data.eventId,
      eventName: data.eventName,
      banquetName: data.banquetName,
      description: `${data.paymentType} payment via ${data.paymentMode}`,
      debit: safeAmount,
      credit: 0,
      paymentMode: data.paymentMode,
    });

    // Create journal entry: Debit Vendor Payable, Credit Bank/Cash
    this.createJournalForVendorPayment(state, user, newPayment);

    this.logAudit(user, `Recorded Vendor Payment (${data.paymentType})`, 'vendor_payments', transactionId, {
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      newValues: { ...newPayment },
    });

    realtimeEngine.saveState(state);
    realtimeEngine.notify();

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/payments/${paymentId}`, newPayment).catch(() => {});
    }

    return { success: true, payment: newPayment };
  }

  /**
   * Save / Configure Accounting Partner
   */
  public savePartner(
    user: UserProfile,
    partnerData: Omit<AccountingPartner, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): { success: boolean; partner?: AccountingPartner; error?: string } {
    if (!partnerData.partnerName?.trim()) {
      return { success: false, error: 'Partner name is required.' };
    }

    const state = realtimeEngine.getState();
    const id = partnerData.id || `partner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newPartner: AccountingPartner = {
      ...partnerData,
      id,
      ownershipPercentage: Number(partnerData.ownershipPercentage) || 0,
      profitSharingPercentage: Number(partnerData.profitSharingPercentage) || 0,
      fixedMonthlyShare: Number(partnerData.fixedMonthlyShare) || 0,
      associatedBanquetIds: partnerData.associatedBanquetIds || [],
      createdAt: state.accountingPartners?.[id]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.accountingPartners) state.accountingPartners = {};
    state.accountingPartners[id] = newPartner;

    this.logAudit(user, partnerData.id ? 'Updated Partner Agreement' : 'Added Partner', 'approvals', id, {
      newValues: { ...newPartner },
    });

    realtimeEngine.saveState(state);
    realtimeEngine.notify();

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/partners/${id}`, newPartner).catch(() => {});
    }

    return { success: true, partner: newPartner };
  }

  /**
   * Save Banquet-Partner Mapping with Validation (Total Profit Sharing should equal 100%)
   */
  public saveBanquetPartnerMapping(
    user: UserProfile,
    mappingData: Omit<BanquetPartnerMapping, 'id'> & { id?: string }
  ): { success: boolean; mapping?: BanquetPartnerMapping; warning?: string; error?: string } {
    const state = realtimeEngine.getState();
    const id = mappingData.id || `bpm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newMapping: BanquetPartnerMapping = {
      ...mappingData,
      id,
      ownershipPercentage: Number(mappingData.ownershipPercentage) || 0,
      profitSharingPercentage: Number(mappingData.profitSharingPercentage) || 0,
    };

    if (!state.banquetPartnerMappings) state.banquetPartnerMappings = {};
    state.banquetPartnerMappings[id] = newMapping;

    // Check sum of profit sharing percentages for this banquet
    const otherMappings = Object.values(state.banquetPartnerMappings).filter(
      (m) => m.banquetId === newMapping.banquetId && m.id !== id
    );
    const totalProfitShare = otherMappings.reduce((sum, m) => sum + m.profitSharingPercentage, newMapping.profitSharingPercentage);

    let warning: string | undefined;
    if (Math.abs(totalProfitShare - 100) > 0.01) {
      warning = `Notice: Configured profit sharing percentages for banquet "${newMapping.banquetName}" currently total ${totalProfitShare}%, which differs from 100%.`;
    }

    this.logAudit(user, 'Updated Banquet Partner Mapping', 'approvals', id, {
      banquetId: newMapping.banquetId,
      banquetName: newMapping.banquetName,
      newValues: { ...newMapping },
    });

    realtimeEngine.saveState(state);
    realtimeEngine.notify();

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/banquetPartnerMappings/${newMapping.banquetId}/${newMapping.partnerId}`, newMapping).catch(() => {});
    }

    return { success: true, mapping: newMapping, warning };
  }

  /**
   * Record Partner Settlement (Does NOT create an operating expense!)
   */
  public recordPartnerSettlement(
    user: UserProfile,
    data: {
      date: string;
      partnerId: string;
      partnerName: string;
      banquetId: string;
      banquetName: string;
      periodStart: string;
      periodEnd: string;
      attributableRevenue: number;
      attributableExpenses: number;
      calculatedProfitShare: number;
      amountPaid: number;
      paymentMode: PaymentMode;
      bankAccountId?: string;
      bankAccountName?: string;
      referenceNumber?: string;
      notes?: string;
    }
  ): { success: boolean; settlement?: PartnerSettlement; error?: string } {
    if (data.amountPaid <= 0) {
      return { success: false, error: 'Settlement amount must be greater than zero.' };
    }

    const state = realtimeEngine.getState();
    const safePaid = this.fromPaise(this.toPaise(data.amountPaid));
    const settlementNumber = this.generateId('PX-SETTLE');
    const id = `settle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newSettlement: PartnerSettlement = {
      id,
      settlementNumber,
      date: data.date,
      partnerId: data.partnerId,
      partnerName: data.partnerName,
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      attributableRevenue: this.fromPaise(this.toPaise(data.attributableRevenue)),
      attributableExpenses: this.fromPaise(this.toPaise(data.attributableExpenses)),
      calculatedProfitShare: this.fromPaise(this.toPaise(data.calculatedProfitShare)),
      amountPaid: safePaid,
      amountPaise: this.toPaise(safePaid),
      paymentMode: data.paymentMode,
      bankAccountId: data.bankAccountId,
      bankAccountName: data.bankAccountName,
      referenceNumber: data.referenceNumber,
      status: 'Posted',
      notes: data.notes,
      createdBy: user.uid,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
    };

    if (!state.partnerSettlements) state.partnerSettlements = {};
    state.partnerSettlements[id] = newSettlement;

    // Deduct from bank account
    if (data.bankAccountId && state.bankAccounts?.[data.bankAccountId]) {
      const bank = state.bankAccounts[data.bankAccountId];
      bank.totalDebits = this.fromPaise(this.toPaise(bank.totalDebits) + this.toPaise(safePaid));
      bank.currentBalance = this.fromPaise(this.toPaise(bank.openingBalance) + this.toPaise(bank.totalCredits) - this.toPaise(bank.totalDebits));
    }

    // Double-entry: Debit Partner Payables / Equity Drawing, Credit Bank Account
    this.createJournalForPartnerSettlement(state, user, newSettlement);

    this.logAudit(user, 'Recorded Partner Settlement', 'partner_settlements', settlementNumber, {
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      newValues: { ...newSettlement },
    });

    realtimeEngine.saveState(state);
    realtimeEngine.notify();

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/partnerSettlements/${id}`, newSettlement).catch(() => {});
    }

    return { success: true, settlement: newSettlement };
  }

  /**
   * Double-Entry Journal Entry Recording (Strict Total Debits == Total Credits)
   */
  public recordJournalEntry(
    user: UserProfile,
    data: {
      date: string;
      voucherType: VoucherType;
      narration: string;
      banquetId?: string;
      banquetName?: string;
      lines: JournalLineItem[];
      status?: ApprovalStatus;
    }
  ): { success: boolean; entry?: JournalEntry; error?: string } {
    if (!data.lines || data.lines.length < 2) {
      return { success: false, error: 'A journal entry must contain at least 2 line items.' };
    }

    let totalDebitPaise = 0;
    let totalCreditPaise = 0;

    data.lines.forEach((l) => {
      totalDebitPaise += this.toPaise(l.debit || 0);
      totalCreditPaise += this.toPaise(l.credit || 0);
    });

    if (totalDebitPaise !== totalCreditPaise) {
      const diff = Math.abs(this.fromPaise(totalDebitPaise - totalCreditPaise));
      return {
        success: false,
        error: `Unbalanced Journal Entry: Total Debits (${this.formatINR(this.fromPaise(totalDebitPaise))}) do not equal Total Credits (${this.formatINR(this.fromPaise(totalCreditPaise))}). Difference: ${this.formatINR(diff)}.`,
      };
    }

    const state = realtimeEngine.getState();
    const entryNumber = this.generateId('PX-JV');
    const id = `jv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const entry: JournalEntry = {
      id,
      entryNumber,
      date: data.date,
      voucherType: data.voucherType,
      referenceType: 'manual',
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      narration: data.narration,
      lines: data.lines.map((l) => ({
        ...l,
        debit: this.fromPaise(this.toPaise(l.debit)),
        credit: this.fromPaise(this.toPaise(l.credit)),
      })),
      totalDebit: this.fromPaise(totalDebitPaise),
      totalCredit: this.fromPaise(totalCreditPaise),
      status: data.status || 'Posted',
      isBalanced: true,
      createdBy: user.uid,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.journalEntries) state.journalEntries = {};
    state.journalEntries[id] = entry;

    // Update Chart of Accounts balances if posted
    if (entry.status === 'Posted') {
      entry.lines.forEach((line) => {
        const acc = state.chartOfAccounts?.[line.accountId];
        if (acc) {
          const debitPaise = this.toPaise(line.debit);
          const creditPaise = this.toPaise(line.credit);
          let curPaise = this.toPaise(acc.currentBalance);
          if (acc.normalBalance === 'Debit') {
            curPaise += debitPaise - creditPaise;
          } else {
            curPaise += creditPaise - debitPaise;
          }
          acc.currentBalance = this.fromPaise(curPaise);
        }
      });
    }

    this.logAudit(user, `Posted ${data.voucherType}`, 'journal_entries', entryNumber, {
      banquetId: data.banquetId,
      banquetName: data.banquetName,
      newValues: { ...entry },
    });

    realtimeEngine.saveState(state);
    realtimeEngine.notify();

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/journalEntries/${id}`, entry).catch(() => {});
    }

    return { success: true, entry };
  }

  /**
   * Reverse an existing posted transaction with full audit trail
   */
  public reverseTransaction(
    user: UserProfile,
    type: 'income' | 'expense' | 'vendor_payment' | 'journal_entry',
    id: string,
    reason: string
  ): { success: boolean; error?: string } {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'A reason for reversal must be provided.' };
    }

    const state = realtimeEngine.getState();
    const cleanReason = reason.trim();

    if (type === 'income') {
      const inc = state.incomeRecords?.[id];
      if (!inc) return { success: false, error: 'Income record not found.' };
      if (inc.status === 'Reversed') return { success: false, error: 'Transaction is already reversed.' };

      inc.status = 'Reversed';
      inc.reversalReason = cleanReason;
      inc.updatedAt = new Date().toISOString();

      // Reverse bank balance
      if (inc.bankAccountId && state.bankAccounts?.[inc.bankAccountId]) {
        const bank = state.bankAccounts[inc.bankAccountId];
        bank.totalCredits = Math.max(0, this.fromPaise(this.toPaise(bank.totalCredits) - this.toPaise(inc.amount)));
        bank.currentBalance = this.fromPaise(this.toPaise(bank.openingBalance) + this.toPaise(bank.totalCredits) - this.toPaise(bank.totalDebits));
      }

      this.logAudit(user, 'Reversed Income Transaction', 'income', inc.transactionId, {
        banquetId: inc.banquetId,
        banquetName: inc.banquetName,
        reason: cleanReason,
      });
    } else if (type === 'expense') {
      const exp = state.expenseRecords?.[id];
      if (!exp) return { success: false, error: 'Expense record not found.' };
      if (exp.status === 'Reversed') return { success: false, error: 'Expense is already reversed.' };

      exp.status = 'Reversed';
      exp.reversalReason = cleanReason;
      exp.updatedAt = new Date().toISOString();

      // Reverse bank balance if was paid
      if (exp.paymentStatus === 'Paid' && exp.bankAccountId && state.bankAccounts?.[exp.bankAccountId]) {
        const bank = state.bankAccounts[exp.bankAccountId];
        bank.totalDebits = Math.max(0, this.fromPaise(this.toPaise(bank.totalDebits) - this.toPaise(exp.totalAmount)));
        bank.currentBalance = this.fromPaise(this.toPaise(bank.openingBalance) + this.toPaise(bank.totalCredits) - this.toPaise(bank.totalDebits));
      }

      this.logAudit(user, 'Reversed Expense Entry', 'expenses', exp.expenseId, {
        banquetId: exp.banquetId,
        banquetName: exp.banquetName,
        reason: cleanReason,
      });
    } else if (type === 'vendor_payment') {
      const pay = state.vendorPaymentRecords?.[id];
      if (!pay) return { success: false, error: 'Vendor payment record not found.' };
      if (pay.status === 'Reversed') return { success: false, error: 'Payment is already reversed.' };

      pay.status = 'Reversed';
      pay.reversalReason = cleanReason;
      pay.updatedAt = new Date().toISOString();

      // Restore bill balance if linked
      if (pay.billId && state.vendorBills?.[pay.billId]) {
        const bill = state.vendorBills[pay.billId];
        bill.paidAmount = Math.max(0, this.fromPaise(this.toPaise(bill.paidAmount) - this.toPaise(pay.amount)));
        bill.pendingAmount = this.fromPaise(this.toPaise(bill.totalAmount) - this.toPaise(bill.paidAmount));
        bill.status = bill.paidAmount === 0 ? 'Unpaid' : 'Partially Paid';
      }

      this.logAudit(user, 'Reversed Vendor Payment', 'vendor_payments', pay.transactionId, {
        banquetId: pay.banquetId,
        banquetName: pay.banquetName,
        reason: cleanReason,
      });
    }

    realtimeEngine.saveState(state);
    realtimeEngine.notify();
    return { success: true };
  }

  /**
   * Helper: Appends an entry to customer ledger with running balance
   */
  private appendCustomerLedgerEntry(
    state: any,
    entry: Omit<CustomerLedgerEntry, 'id' | 'runningBalance' | 'createdAt'>
  ): void {
    if (!state.customerLedgerEntries) state.customerLedgerEntries = {};

    const existingEntries = Object.values(state.customerLedgerEntries as Record<string, CustomerLedgerEntry>).filter(
      (e) => e.customerId === entry.customerId
    );

    const prevBalance = existingEntries.length > 0 ? existingEntries[existingEntries.length - 1].runningBalance : 0;
    const newBalance = this.fromPaise(this.toPaise(prevBalance) + this.toPaise(entry.debit) - this.toPaise(entry.credit));

    const id = `cleg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLedger: CustomerLedgerEntry = {
      ...entry,
      id,
      runningBalance: newBalance,
      createdAt: new Date().toISOString(),
    };

    state.customerLedgerEntries[id] = newLedger;
    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/customerLedgers/${entry.customerId}/${id}`, newLedger).catch(() => {});
    }
  }

  /**
   * Helper: Appends an entry to vendor ledger with running balance
   */
  private appendVendorLedgerEntry(
    state: any,
    entry: Omit<VendorLedgerEntry, 'id' | 'runningBalance' | 'createdAt'>
  ): void {
    if (!state.vendorLedgerEntries) state.vendorLedgerEntries = {};

    const existingEntries = Object.values(state.vendorLedgerEntries as Record<string, VendorLedgerEntry>).filter(
      (e) => e.vendorId === entry.vendorId
    );

    const prevBalance = existingEntries.length > 0 ? existingEntries[existingEntries.length - 1].runningBalance : 0;
    // For vendor: credit increases payable, debit decreases payable
    const newBalance = this.fromPaise(this.toPaise(prevBalance) + this.toPaise(entry.credit) - this.toPaise(entry.debit));

    const id = `vleg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLedger: VendorLedgerEntry = {
      ...entry,
      id,
      runningBalance: newBalance,
      createdAt: new Date().toISOString(),
    };

    state.vendorLedgerEntries[id] = newLedger;
    if (isFirebaseConfigured()) {
      writeRealtimeNode(`accounting/vendorLedgers/${entry.vendorId}/${id}`, newLedger).catch(() => {});
    }
  }

  /**
   * Helper: Creates standard balanced journal entry for recorded income
   */
  private createJournalForIncome(state: any, user: UserProfile, inc: IncomeRecord): void {
    const isCash = inc.paymentMode === 'Cash';
    const debitAccountId = isCash ? 'acc_1010' : inc.bankAccountId || 'acc_1020';
    const debitAccountName = isCash ? 'Cash in Hand' : inc.bankAccountName || 'Bank Current Account';
    const creditAccountId = 'acc_4010'; // Event Booking Revenue
    const creditAccountName = 'Event Booking Revenue';

    const entryNumber = this.generateId('PX-JV');
    const id = `jv_inc_${inc.id}`;

    const journal: JournalEntry = {
      id,
      entryNumber,
      date: inc.date,
      voucherType: isCash ? 'Cash Voucher' : 'Receipt Voucher',
      referenceType: 'income',
      referenceId: inc.id,
      banquetId: inc.banquetId,
      banquetName: inc.banquetName,
      narration: `Received ₹${inc.amount} via ${inc.paymentMode} for ${inc.category}. Ref: ${inc.referenceNumber || inc.transactionId}`,
      lines: [
        {
          accountId: debitAccountId,
          accountCode: '1020',
          accountName: debitAccountName,
          debit: inc.amount,
          credit: 0,
        },
        {
          accountId: creditAccountId,
          accountCode: '4010',
          accountName: creditAccountName,
          debit: 0,
          credit: inc.amount,
        },
      ],
      totalDebit: inc.amount,
      totalCredit: inc.amount,
      status: 'Posted',
      isBalanced: true,
      createdBy: user.uid,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.journalEntries) state.journalEntries = {};
    state.journalEntries[id] = journal;
    inc.journalEntryId = id;
  }

  /**
   * Helper: Creates standard balanced journal entry for recorded expense
   */
  private createJournalForExpense(state: any, user: UserProfile, exp: ExpenseRecord): void {
    const isCash = exp.paymentMode === 'Cash';
    const creditAccountId = isCash ? 'acc_1010' : exp.bankAccountId || 'acc_1020';
    const creditAccountName = isCash ? 'Cash in Hand' : exp.bankAccountName || 'Bank Current Account';
    const debitAccountId = 'acc_5010'; // Vendor Direct Expenses
    const debitAccountName = `Expense - ${exp.category}`;

    const entryNumber = this.generateId('PX-JV');
    const id = `jv_exp_${exp.id}`;

    const journal: JournalEntry = {
      id,
      entryNumber,
      date: exp.date,
      voucherType: isCash ? 'Cash Voucher' : 'Payment Voucher',
      referenceType: 'expense',
      referenceId: exp.id,
      banquetId: exp.banquetId,
      banquetName: exp.banquetName,
      narration: `Paid ₹${exp.totalAmount} for ${exp.category} to ${exp.vendorName || 'Vendor'}. Ref: ${exp.referenceNumber || exp.expenseId}`,
      lines: [
        {
          accountId: debitAccountId,
          accountCode: '5010',
          accountName: debitAccountName,
          debit: exp.totalAmount,
          credit: 0,
        },
        {
          accountId: creditAccountId,
          accountCode: '1020',
          accountName: creditAccountName,
          debit: 0,
          credit: exp.totalAmount,
        },
      ],
      totalDebit: exp.totalAmount,
      totalCredit: exp.totalAmount,
      status: 'Posted',
      isBalanced: true,
      createdBy: user.uid,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.journalEntries) state.journalEntries = {};
    state.journalEntries[id] = journal;
    exp.journalEntryId = id;
  }

  /**
   * Helper: Creates journal for vendor payment
   */
  private createJournalForVendorPayment(state: any, user: UserProfile, pay: VendorPaymentRecord): void {
    const isCash = pay.paymentMode === 'Cash';
    const creditAccountId = isCash ? 'acc_1010' : pay.bankAccountId || 'acc_1020';
    const creditAccountName = isCash ? 'Cash in Hand' : pay.bankAccountName || 'Bank Current Account';
    const debitAccountId = 'acc_2010'; // Accounts Payable
    const debitAccountName = 'Accounts Payable (Vendors)';

    const entryNumber = this.generateId('PX-JV');
    const id = `jv_vpay_${pay.id}`;

    const journal: JournalEntry = {
      id,
      entryNumber,
      date: pay.paymentDate,
      voucherType: 'Payment Voucher',
      referenceType: 'vendor_payment',
      referenceId: pay.id,
      banquetId: pay.banquetId,
      banquetName: pay.banquetName,
      narration: `Vendor payment of ₹${pay.amount} to ${pay.vendorName} via ${pay.paymentMode}.`,
      lines: [
        {
          accountId: debitAccountId,
          accountCode: '2010',
          accountName: debitAccountName,
          debit: pay.amount,
          credit: 0,
        },
        {
          accountId: creditAccountId,
          accountCode: '1020',
          accountName: creditAccountName,
          debit: 0,
          credit: pay.amount,
        },
      ],
      totalDebit: pay.amount,
      totalCredit: pay.amount,
      status: 'Posted',
      isBalanced: true,
      createdBy: user.uid,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.journalEntries) state.journalEntries = {};
    state.journalEntries[id] = journal;
    pay.journalEntryId = id;
  }

  /**
   * Helper: Creates journal for partner settlement (Debit Partner Payables, Credit Bank)
   */
  private createJournalForPartnerSettlement(state: any, user: UserProfile, settle: PartnerSettlement): void {
    const isCash = settle.paymentMode === 'Cash';
    const creditAccountId = isCash ? 'acc_1010' : settle.bankAccountId || 'acc_1020';
    const creditAccountName = isCash ? 'Cash in Hand' : settle.bankAccountName || 'Bank Current Account';
    const debitAccountId = 'acc_2030'; // Partner Payables
    const debitAccountName = 'Partner Payables & Capital Drawings';

    const entryNumber = this.generateId('PX-JV');
    const id = `jv_settle_${settle.id}`;

    const journal: JournalEntry = {
      id,
      entryNumber,
      date: settle.date,
      voucherType: 'Payment Voucher',
      referenceType: 'partner_settlement',
      referenceId: settle.id,
      banquetId: settle.banquetId,
      banquetName: settle.banquetName,
      narration: `Partner profit distribution of ₹${settle.amountPaid} disbursed to ${settle.partnerName} for banquet ${settle.banquetName}.`,
      lines: [
        {
          accountId: debitAccountId,
          accountCode: '2030',
          accountName: debitAccountName,
          debit: settle.amountPaid,
          credit: 0,
        },
        {
          accountId: creditAccountId,
          accountCode: '1020',
          accountName: creditAccountName,
          debit: 0,
          credit: settle.amountPaid,
        },
      ],
      totalDebit: settle.amountPaid,
      totalCredit: settle.amountPaid,
      status: 'Posted',
      isBalanced: true,
      createdBy: user.uid,
      createdByName: user.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!state.journalEntries) state.journalEntries = {};
    state.journalEntries[id] = journal;
    settle.journalEntryId = id;
  }

  /**
   * Calculate Realtime Organization Financial KPIs from Actual Database Records
   */
  public calculateFinancialKPIs(filter?: DateFilterRange): AccountingKPIs {
    const state = realtimeEngine.getState();
    const events = Object.values(state.events || {}).filter((e) => e && e.status !== 'cancelled');
    const payments = Object.values(state.payments || {}).filter((p) => p && p.type !== 'refund');
    const incomeRecords = Object.values(state.incomeRecords || {}).filter((i) => i && i.status !== 'Reversed');
    const expenses = Object.values(state.expenseRecords || {}).filter((e) => e && e.status !== 'Reversed');
    const vendorBills = Object.values(state.vendorBills || {});
    const bankAccounts = Object.values(state.bankAccounts || {}).filter((b) => b.isActive);

    // Apply date range filter if provided
    const isWithinDate = (dateStr: string) => {
      if (!filter || !dateStr) return true;
      const d = dateStr.slice(0, 10);
      return d >= filter.startDate && d <= filter.endDate;
    };

    // 1. Total Business Revenue: Non-cancelled confirmed & completed event values + other non-event income
    const eventSalesTotal = events.filter((e) => isWithinDate(e.date)).reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);
    const nonEventIncome = incomeRecords.filter((i) => !i.eventId && isWithinDate(i.date)).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalRevenue = this.fromPaise(this.toPaise(eventSalesTotal) + this.toPaise(nonEventIncome));

    // 2. Total Money Received: Actual payments recorded + direct income receipts
    const totalPaymentsReceived = payments.filter((p) => isWithinDate(p.paymentDate)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalMoneyReceived = this.fromPaise(this.toPaise(totalPaymentsReceived));

    // 3. Outstanding Receivables: Sum of remaining balance on active events
    const totalReceivables = this.fromPaise(
      events.reduce((sum, e) => sum + this.toPaise(Number(e.remainingBalance) || 0), 0)
    );

    // 4. Total Business Expenses: All direct + operating expenses
    const totalExpenses = this.fromPaise(
      expenses.filter((e) => isWithinDate(e.date)).reduce((sum, e) => sum + this.toPaise(Number(e.totalAmount) || 0), 0)
    );

    // 5. Total Vendor Payables: Pending amounts on vendor bills
    const totalVendorPayables = this.fromPaise(
      vendorBills.reduce((sum, b) => sum + this.toPaise(Number(b.pendingAmount) || 0), 0)
    );

    // 6. Direct vs Operating Expenses
    const directExpenses = this.fromPaise(
      expenses.filter((e) => ['Decoration', 'Catering', 'Photography', 'Videography', 'Lighting', 'Sound and DJ', 'Floral', 'Furniture'].includes(e.category) && isWithinDate(e.date))
        .reduce((sum, e) => sum + this.toPaise(Number(e.totalAmount) || 0), 0)
    );

    const grossProfit = this.fromPaise(this.toPaise(totalRevenue) - this.toPaise(directExpenses));
    const netOperatingProfit = this.fromPaise(this.toPaise(totalRevenue) - this.toPaise(totalExpenses));
    const netProfit = netOperatingProfit;

    // 7. Cash and Bank Balances (Computed directly from actual Firebase receipts and disbursements)
    let actualCashInflows =
      payments
        .filter((p) => (p.paymentMethod || '').toLowerCase() === 'cash' && isWithinDate(p.paymentDate))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) +
      incomeRecords
        .filter((i) => i.paymentMode === 'Cash' && isWithinDate(i.date))
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    let actualCashOutflows = expenses
      .filter((e) => e.paymentStatus === 'Paid' && e.paymentMode === 'Cash' && isWithinDate(e.date))
      .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);

    let calculatedAvailableCash = Math.max(0, actualCashInflows - actualCashOutflows);

    let actualBankInflows =
      payments
        .filter((p) => (p.paymentMethod || '').toLowerCase() !== 'cash' && isWithinDate(p.paymentDate))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) +
      incomeRecords
        .filter((i) => i.paymentMode !== 'Cash' && isWithinDate(i.date))
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    let actualBankOutflows =
      expenses
        .filter((e) => e.paymentStatus === 'Paid' && e.paymentMode !== 'Cash' && isWithinDate(e.date))
        .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0) +
      vendorBills.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);

    let calculatedBankBalance = Math.max(0, actualBankInflows - actualBankOutflows);

    let customAccountCash = 0;
    let customAccountBank = 0;
    bankAccounts.forEach((b) => {
      if (b.accountType === 'Cash in Hand' || b.accountType === 'Petty Cash') {
        customAccountCash += b.currentBalance;
      } else {
        customAccountBank += b.currentBalance;
      }
    });

    const availableCash = customAccountCash > 0 ? customAccountCash : calculatedAvailableCash;
    const bankBalance = customAccountBank > 0 ? customAccountBank : calculatedBankBalance;

    // 8. Total Partner Payables: Estimated calculated profit share minus settlements
    const partnerSettlements = Object.values(state.partnerSettlements || {});
    const totalSettled = partnerSettlements.reduce((sum, s) => sum + this.toPaise(s.amountPaid), 0);
    const estimatedPartnerShare = Math.max(0, this.toPaise(netProfit) * 0.5); // Baseline 50% distributed to partners
    const totalPartnerPayables = Math.max(0, this.fromPaise(estimatedPartnerShare - totalSettled));

    return {
      totalRevenue,
      totalReceived: totalMoneyReceived,
      totalReceivables,
      totalExpenses,
      totalVendorPayables,
      totalPartnerPayables,
      grossProfit,
      netOperatingProfit,
      netProfit,
      availableCash: this.fromPaise(this.toPaise(availableCash)),
      bankBalance: this.fromPaise(this.toPaise(bankBalance)),
      totalCashAndBank: this.fromPaise(this.toPaise(availableCash) + this.toPaise(bankBalance)),
    };
  }

  /**
   * Banquet-Wise Financial Profiles
   */
  public getBanquetFinancialProfiles(filter?: DateFilterRange): BanquetFinancialProfile[] {
    const state = realtimeEngine.getState();
    const banquets = Object.values(state.banquets || {});
    const events = Object.values(state.events || {}).filter((e) => e && e.status !== 'cancelled');
    const expenses = Object.values(state.expenseRecords || {}).filter((e) => e && e.status !== 'Reversed');
    const mappings = Object.values(state.banquetPartnerMappings || {});
    const partners = Object.values(state.accountingPartners || {});
    const settlements = Object.values(state.partnerSettlements || {});

    const isWithinDate = (dateStr: string) => {
      if (!filter || !dateStr) return true;
      const d = dateStr.slice(0, 10);
      return d >= filter.startDate && d <= filter.endDate;
    };

    return banquets.map((b) => {
      const bEvents = events.filter((e) => e.banquetId === b.id && isWithinDate(e.date));
      const bExpenses = expenses.filter((e) => e.banquetId === b.id && isWithinDate(e.date));

      const totalBookings = bEvents.length;
      const totalSalesValue = bEvents.reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);
      const totalRevenue = totalSalesValue;
      const totalReceived = bEvents.reduce((sum, e) => sum + (Number(e.advanceReceived) || 0), 0);
      const outstandingReceivables = bEvents.reduce((sum, e) => sum + (Number(e.remainingBalance) || 0), 0);

      const vendorExpenses = bExpenses
        .filter((e) => ['Decoration', 'Catering', 'Photography', 'Videography', 'Lighting', 'Sound and DJ', 'Floral', 'Furniture'].includes(e.category))
        .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);

      const operatingExpenses = bExpenses
        .filter((e) => !['Decoration', 'Catering', 'Photography', 'Videography', 'Lighting', 'Sound and DJ', 'Floral', 'Furniture'].includes(e.category))
        .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);

      const totalExp = vendorExpenses + operatingExpenses;
      const netProfit = totalRevenue - totalExp;
      const profitMarginPercentage = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;

      // Partner distributions for this banquet
      const bMappings = mappings.filter((m) => m.banquetId === b.id);
      const partnerAllocations = bMappings.map((m) => {
        const partner = partners.find((p) => p.id === m.partnerId);
        const entitledProfitShare = netProfit > 0 ? (netProfit * m.profitSharingPercentage) / 100 : 0;
        const bSettlements = settlements.filter((s) => s.banquetId === b.id && s.partnerId === m.partnerId);
        const amountPaid = bSettlements.reduce((sum, s) => sum + s.amountPaid, 0);
        const outstandingPayable = Math.max(0, entitledProfitShare - amountPaid);

        return {
          partnerId: m.partnerId,
          partnerName: m.partnerName || partner?.partnerName || 'Partner',
          ownershipPercentage: m.ownershipPercentage,
          profitSharingPercentage: m.profitSharingPercentage,
          entitledProfitShare: Math.round(entitledProfitShare * 100) / 100,
          amountPaid: Math.round(amountPaid * 100) / 100,
          outstandingPayable: Math.round(outstandingPayable * 100) / 100,
        };
      });

      return {
        banquetId: b.id,
        banquetName: b.name,
        totalBookings,
        totalSalesValue: Math.round(totalSalesValue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalReceived: Math.round(totalReceived * 100) / 100,
        outstandingReceivables: Math.round(outstandingReceivables * 100) / 100,
        totalExpenses: Math.round(totalExp * 100) / 100,
        vendorExpenses: Math.round(vendorExpenses * 100) / 100,
        operatingExpenses: Math.round(operatingExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMarginPercentage,
        partnerAllocations,
      };
    });
  }

  /**
   * Partner-Wise Financial Profiles
   */
  public getPartnerFinancialProfiles(filterBanquetId?: string): PartnerFinancialProfile[] {
    const state = realtimeEngine.getState();
    const explicitPartners = Object.values(state.accountingPartners || {});
    const existingIds = new Set(explicitPartners.map((p) => p.id));
    const existingEmails = new Set(explicitPartners.map((p) => (p.email || '').toLowerCase()));

    const partners = [...explicitPartners];
    Object.values(state.users || {}).forEach((u: any) => {
      if (
        u &&
        u.role === 'partner' &&
        !existingIds.has(u.uid) &&
        !existingEmails.has((u.email || '').toLowerCase())
      ) {
        partners.push({
          id: u.uid,
          partnerName: u.fullName || 'Partner',
          phone: u.phone || '',
          email: u.email || '',
          partnerType: 'Managing Partner',
          associatedBanquetIds: u.assignedBanquetIds || [],
          ownershipPercentage: 50,
          profitSharingPercentage: 50,
          paymentTerms: 'Standard profit distribution agreement',
          status: u.isActive ? 'Active' : 'Inactive',
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        });
      }
    });

    const mappings = Object.values(state.banquetPartnerMappings || {});
    const settlements = Object.values(state.partnerSettlements || {});
    const banquetProfiles = this.getBanquetFinancialProfiles();

    return partners.map((p) => {
      let pMappings = mappings.filter((m) => m.partnerId === p.id);
      if (filterBanquetId && filterBanquetId !== 'all') {
        pMappings = pMappings.filter((m) => m.banquetId === filterBanquetId);
      }

      // If no explicit mapping exists, fallback to virtual mappings from partner's assigned banquets
      if (pMappings.length === 0 && p.associatedBanquetIds?.length) {
        let bIds = p.associatedBanquetIds;
        if (filterBanquetId && filterBanquetId !== 'all') {
          bIds = bIds.filter((id) => id === filterBanquetId);
        }
        pMappings = bIds.map((bId) => {
          const b = Object.values(state.banquets || {}).find((item: any) => item.id === bId);
          return {
            id: `map_${p.id}_${bId}`,
            banquetId: bId,
            banquetName: (b as any)?.name || 'Banquet Hall',
            partnerId: p.id,
            partnerName: p.partnerName,
            ownershipPercentage: p.ownershipPercentage || 50,
            profitSharingPercentage: p.profitSharingPercentage || 50,
            effectiveFrom: p.createdAt ? p.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          };
        });
      }

      let totalAttributableRevenue = 0;
      let totalAttributableExpenses = 0;
      let totalProfitShare = 0;

      pMappings.forEach((m) => {
        const bProf = banquetProfiles.find((b) => b.banquetId === m.banquetId);
        if (bProf) {
          totalAttributableRevenue += (bProf.totalRevenue * m.ownershipPercentage) / 100;
          totalAttributableExpenses += (bProf.totalExpenses * m.ownershipPercentage) / 100;
          if (bProf.netProfit > 0) {
            totalProfitShare += (bProf.netProfit * m.profitSharingPercentage) / 100;
          }
        }
      });

      const pSettlements = settlements.filter(
        (s) => s.partnerId === p.id && (!filterBanquetId || filterBanquetId === 'all' || s.banquetId === filterBanquetId)
      );
      const totalAmountPaid = pSettlements.reduce((sum, s) => sum + s.amountPaid, 0);
      const totalOutstandingAmount = Math.max(0, totalProfitShare - totalAmountPaid);

      return {
        partnerId: p.id,
        partnerName: p.partnerName,
        phone: p.phone,
        email: p.email,
        associatedBanquets: pMappings.map((m) => ({
          banquetId: m.banquetId,
          banquetName: m.banquetName,
          ownershipPercentage: m.ownershipPercentage,
          profitSharingPercentage: m.profitSharingPercentage,
        })),
        totalAttributableRevenue: Math.round(totalAttributableRevenue * 100) / 100,
        totalAttributableExpenses: Math.round(totalAttributableExpenses * 100) / 100,
        totalProfitShare: Math.round(totalProfitShare * 100) / 100,
        totalAmountPaid: Math.round(totalAmountPaid * 100) / 100,
        totalOutstandingAmount: Math.round(totalOutstandingAmount * 100) / 100,
        settlementHistory: pSettlements,
      };
    });
  }

  /**
   * Vendor Financial Profiles
   */
  public getVendorFinancialProfiles(): VendorFinancialProfile[] {
    const state = realtimeEngine.getState();
    const vendors = Object.values(state.vendors || {});
    const bills = Object.values(state.vendorBills || {});
    const payments = Object.values(state.vendorPaymentRecords || {}).filter((p) => p.status !== 'Reversed');
    const events = Object.values(state.events || {});

    return vendors.map((v) => {
      const vBills = bills.filter((b) => b.vendorId === v.id);
      const vPayments = payments.filter((p) => p.vendorId === v.id);

      // Associated events count
      const associatedEventsCount = events.filter((e) =>
        (e.vendorAssignments || []).some((va) => va.vendorId === v.id || va.vendorName?.toLowerCase() === v.businessName?.toLowerCase())
      ).length;

      const totalAgreedAmount = events.reduce((sum, e) => {
        const va = (e.vendorAssignments || []).find(
          (a) => a.vendorId === v.id || a.vendorName?.toLowerCase() === v.businessName?.toLowerCase()
        );
        return sum + (Number(va?.quotedAmount) || 0);
      }, 0);

      const totalBilledAmount = vBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
      const totalPaidAmount = vPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const pendingBalance = Math.max(0, (totalBilledAmount || totalAgreedAmount) - totalPaidAmount);

      return {
        vendorId: v.id,
        vendorName: v.businessName,
        serviceCategory: v.categories?.join(', ') || 'Vendor Services',
        associatedEventsCount,
        totalAgreedAmount: Math.round(totalAgreedAmount * 100) / 100,
        totalBilledAmount: Math.round(totalBilledAmount * 100) / 100,
        totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
        pendingBalance: Math.round(pendingBalance * 100) / 100,
        paymentHistory: vPayments,
      };
    });
  }

  /**
   * Customer Running Ledgers
   */
  public getCustomerFinancialProfiles(): CustomerFinancialProfile[] {
    const state = realtimeEngine.getState();
    const clients = Object.values(state.clients || {});
    const events = Object.values(state.events || {});
    const invoices = Object.values(state.invoices || {});
    const payments = Object.values(state.payments || {}).filter((p) => p.type !== 'refund');
    const ledgerEntries = Object.values(state.customerLedgerEntries || {});

    return clients.map((c) => {
      const cEvents = events.filter((e) => e.clientId === c.id);
      const cInvoices = invoices.filter((i) => i.clientId === c.id);
      const cPayments = payments.filter((p) => p.clientId === c.id);

      const totalBookingValue = cEvents.reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);
      const totalInvoiced = cInvoices.reduce((sum, i) => sum + (Number(i.finalTotal) || 0), 0);
      const totalAmountReceived = cPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const outstandingBalance = Math.max(0, (totalInvoiced || totalBookingValue) - totalAmountReceived);

      // Collect specific stored ledger entries or construct chronological ledger
      let cLedger = ledgerEntries
        .filter((l) => l.customerId === c.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // If no stored ledger yet, generate on-the-fly chronological ledger from invoices & payments
      if (cLedger.length === 0) {
        let runningBal = 0;
        const chronologicalItems: Array<{
          date: string;
          type: CustomerLedgerEntry['type'];
          ref: string;
          debit: number;
          credit: number;
          desc: string;
          banquet?: string;
        }> = [];

        cInvoices.forEach((inv) => {
          chronologicalItems.push({
            date: inv.invoiceDate || inv.createdAt,
            type: 'Booking Invoice',
            ref: inv.invoiceNumber,
            debit: inv.finalTotal,
            credit: 0,
            desc: `Invoice issued for event "${inv.eventName}"`,
            banquet: inv.banquetName,
          });
        });

        cPayments.forEach((p) => {
          chronologicalItems.push({
            date: p.paymentDate || p.createdAt,
            type: 'Payment Received',
            ref: p.referenceNumber || p.id,
            debit: 0,
            credit: p.amount,
            desc: `Payment received via ${p.paymentMethod.toUpperCase()}`,
          });
        });

        chronologicalItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        cLedger = chronologicalItems.map((item, idx) => {
          runningBal += item.debit - item.credit;
          return {
            id: `gen_cleg_${c.id}_${idx}`,
            customerId: c.id,
            customerName: c.fullName,
            date: item.date,
            type: item.type,
            referenceNumber: item.ref,
            banquetName: item.banquet,
            description: item.desc,
            debit: item.debit,
            credit: item.credit,
            runningBalance: Math.max(0, runningBal),
            createdAt: item.date,
          };
        });
      }

      return {
        customerId: c.id,
        customerName: c.fullName,
        associatedEventsCount: cEvents.length,
        totalBookingValue: Math.round(totalBookingValue * 100) / 100,
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalAmountReceived: Math.round(totalAmountReceived * 100) / 100,
        outstandingBalance: Math.round(outstandingBalance * 100) / 100,
        ledger: cLedger,
      };
    });
  }

  /**
   * Generates Balance Sheet, Trial Balance & P&L Statement
   */
  public generateTrialBalance(): {
    accounts: Array<{
      code: string;
      name: string;
      group: ChartOfAccount['group'];
      debit: number;
      credit: number;
    }>;
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  } {
    const state = realtimeEngine.getState();
    const chart = Object.values(state.chartOfAccounts || {});

    let totalDebitPaise = 0;
    let totalCreditPaise = 0;

    const accounts = chart.map((acc) => {
      const bal = acc.currentBalance;
      let debit = 0;
      let credit = 0;
      if (acc.normalBalance === 'Debit') {
        if (bal >= 0) debit = bal;
        else credit = Math.abs(bal);
      } else {
        if (bal >= 0) credit = bal;
        else debit = Math.abs(bal);
      }

      totalDebitPaise += this.toPaise(debit);
      totalCreditPaise += this.toPaise(credit);

      return {
        code: acc.code,
        name: acc.name,
        group: acc.group,
        debit,
        credit,
      };
    });

    const totalDebit = this.fromPaise(totalDebitPaise);
    const totalCredit = this.fromPaise(totalCreditPaise);
    const isBalanced = totalDebitPaise === totalCreditPaise;

    return { accounts, totalDebit, totalCredit, isBalanced };
  }
}

export const accountingEngine = new AccountingEngineService();
